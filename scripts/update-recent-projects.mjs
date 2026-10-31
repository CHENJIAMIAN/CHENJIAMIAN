#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OWNER = process.env.GITHUB_OWNER || 'CHENJIAMIAN';
const PROFILE_REPO = process.env.PROFILE_REPO || OWNER;
const RECENT_MONTHS = Number.parseInt(process.env.RECENT_PROJECT_MONTHS || '3', 10);
// 首页只放最近的一批；近三个月推送的仓库有 100+ 个，全量列出来既淹没有效信息，
// 也让每次运行要调 100+ 次 LLM
const MAX_PROJECTS = Number.parseInt(process.env.MAX_PROJECTS || '24', 10);
// 默认复用 README 里已有的描述，只给新项目调 LLM；设为 1 强制全量重生成
const REFRESH_ALL = process.env.LLM_REFRESH_ALL === '1';
const README_PATH = process.env.README_PATH || 'README.md';
const GITHUB_API = process.env.GITHUB_API_URL || 'https://api.github.com';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1').replace(/\/$/, '');
// 支持逗号分隔的模型列表：免费模型随时可能下线，前一个不可用就换下一个
const LLM_MODELS = (process.env.LLM_MODEL || 'gpt-oss-120b')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

// 已经确认不可用的模型，后续项目直接跳过，省得每个都撞一次 404
const unavailableModels = new Set();
const modelFailures = new Map();
// 免费模型按分钟限流（OpenRouter 免费档是 20 次/分钟）。这里留一点余量，
// 用滑动窗口主动节流，而不是等撞到 429 再退避。
const LLM_RPM_LIMIT = Number.parseInt(process.env.LLM_RPM_LIMIT || '18', 10);
const LLM_MAX_RETRIES = Number.parseInt(process.env.LLM_MAX_RETRIES || '4', 10);
// 单次请求上限：免费模型偶尔会长时间不响应，没有超时整个 job 会一直挂着
const LLM_TIMEOUT_MS = Number.parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10);
// 总时间预算：免费模型慢起来没底，超过预算后剩余项目直接用 description 兜底，
// 保证 job 一定能在合理时间内结束
const LLM_DEADLINE_MS = Number.parseInt(process.env.LLM_DEADLINE_MS || '1500000', 10);
const llmDeadline = Date.now() + LLM_DEADLINE_MS;

const START_MARKER = '<!-- recent-projects:start -->';
const END_MARKER = '<!-- recent-projects:end -->';

export function replaceGeneratedSection(readme, content) {
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`README must contain ${START_MARKER} and ${END_MARKER}`);
  }

  const before = readme.slice(0, start + START_MARKER.length);
  const after = readme.slice(end);
  return `${before}\n${content.trim()}\n${after}`;
}

function monthsAgo(now, months) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() - months;
  const day = now.getUTCDate();
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    year,
    month,
    Math.min(day, lastDayOfTargetMonth),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds(),
  ));
}

export function selectRecentRepos(repos, {
  owner = OWNER,
  recentMonths = RECENT_MONTHS,
  now = new Date(),
} = {}) {
  const cutoff = monthsAgo(now, recentMonths).getTime();

  return repos
    .filter((repo) => !repo.private)
    .filter((repo) => !repo.fork)
    .filter((repo) => !repo.archived)
    .filter((repo) => repo.name.toLowerCase() !== owner.toLowerCase())
    .filter((repo) => new Date(repo.pushed_at || repo.updated_at).getTime() >= cutoff)
    .sort((a, b) => {
      const bTime = new Date(b.pushed_at || b.updated_at).getTime();
      const aTime = new Date(a.pushed_at || a.updated_at).getTime();
      return bTime - aTime;
    });
}

export function formatProjectList(projects) {
  return projects
    .map((project) => {
      const language = project.language ? `（${project.language}）` : '';
      return [
        `- **[${project.name}](${project.html_url})**<br>`,
        `  ${project.summary}${language}`,
      ].join('\n');
    })
    .join('\n');
}

/** 从 README 的生成区块里读出「仓库名 → 已有描述」，避免每次全量重生成。 */
export function parseExistingSummaries(readme) {
  const start = readme.indexOf(START_MARKER);
  const end = readme.indexOf(END_MARKER);
  const summaries = new Map();
  if (start === -1 || end === -1 || end < start) return summaries;

  const block = readme.slice(start + START_MARKER.length, end);
  const pattern = /- \*\*\[([^\]]+)\]\([^)]*\)\*\*<br>\s*\n\s*(.+)/g;
  let match = pattern.exec(block);
  while (match !== null) {
    summaries.set(match[1], match[2].trim());
    match = pattern.exec(block);
  }
  return summaries;
}

export function fallbackSummary(repo) {
  const description = String(repo.description || '').trim();
  return description || `${repo.name} 项目。`;
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    noLlm: argv.includes('--no-llm'),
  };
}

function githubHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'CHENJIAMIAN-profile-updater',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...githubHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${body.slice(0, 300)}`);
  }

  return response.json();
}

async function fetchRepos(owner) {
  const repos = [];
  let page = 1;

  while (page <= 5) {
    const url = `${GITHUB_API}/users/${encodeURIComponent(owner)}/repos?per_page=100&page=${page}&sort=pushed&type=owner`;
    const batch = await fetchJson(url);
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}

async function fetchTopics(owner, repoName) {
  try {
    const data = await fetchJson(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/topics`, {
      headers: { Accept: 'application/vnd.github.mercy-preview+json' },
    });
    return Array.isArray(data.names) ? data.names : [];
  } catch {
    return [];
  }
}

async function fetchReadmeExcerpt(owner, repoName) {
  try {
    const data = await fetchJson(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/readme`);
    if (!data.content) return '';
    const readme = Buffer.from(data.content, 'base64').toString('utf8');
    return readme
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2800);
  } catch {
    return '';
  }
}

function buildPrompt(repo, topics, readmeExcerpt) {
  return [
    '你是 GitHub Profile README 的项目简介编辑。',
    '请根据仓库信息生成一句中文项目描述，要求：',
    '- 28 到 46 个中文字左右',
    '- 说明它是什么、解决什么问题或适合什么场景',
    '- 不要营销腔，不要 emoji，不要 Markdown，不要结尾括号技术栈',
    '- 如果信息不足，根据仓库名和 description 合理概括',
    '',
    `仓库名：${repo.name}`,
    `GitHub description：${repo.description || ''}`,
    `主要语言：${repo.language || ''}`,
    `topics：${topics.join(', ')}`,
    `README 摘要：${readmeExcerpt}`,
  ].join('\n');
}

function normalizeSummary(text, repo) {
  const firstLine = String(text || '')
    .replace(/^["'“”]+|["'“”]+$/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) return fallbackSummary(repo);

  return firstLine
    .replace(/^[-*]\s*/, '')
    .replace(/[。；;,.，]+$/u, '。')
    .slice(0, 120);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 滑动窗口：保证任意 60 秒内的调用数不超过上限
const llmCallTimestamps = [];

async function throttleLlmCall() {
  const windowMs = 60_000;

  for (;;) {
    const now = Date.now();
    while (llmCallTimestamps.length > 0 && now - llmCallTimestamps[0] >= windowMs) {
      llmCallTimestamps.shift();
    }

    if (llmCallTimestamps.length < LLM_RPM_LIMIT) {
      llmCallTimestamps.push(now);
      return;
    }

    const waitMs = windowMs - (now - llmCallTimestamps[0]) + 100;
    console.log(`LLM 每分钟上限 ${LLM_RPM_LIMIT} 次，等待 ${Math.ceil(waitMs / 1000)}s 后再调用`);
    await sleep(waitMs);
  }
}

/** 429 / 5xx 之后该等多久：优先听服务端的 Retry-After 和 X-RateLimit-Reset。 */
function retryDelayMs(response, attempt) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.max(1000, seconds * 1000);
  }

  const reset = response.headers.get('x-ratelimit-reset');
  if (reset) {
    const raw = Number.parseFloat(reset);
    if (Number.isFinite(raw)) {
      // 有的是秒级时间戳，有的是毫秒
      const resetAt = raw > 1e12 ? raw : raw * 1000;
      return Math.min(120_000, Math.max(1000, resetAt - Date.now() + 1000));
    }
  }

  return Math.min(60_000, 2000 * 2 ** attempt);
}

async function requestSummaryWithModel(model, repo, topics, readmeExcerpt) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('LLM_API_KEY is not configured');
  }

  const headers = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (process.env.LLM_COMPAT_HEADERS === 'cherry') {
    Object.assign(headers, {
      Accept: '*/*',
      'Accept-Language': process.env.LLM_ACCEPT_LANGUAGE || 'zh-CN',
      'HTTP-Referer': process.env.LLM_HTTP_REFERER || `https://github.com/${OWNER}/${PROFILE_REPO}`,
      Priority: 'u=1, i',
      'Sec-CH-UA': '"Not(A:Brand";v="8", "Chromium";v="144"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'cross-site',
      'User-Agent': process.env.LLM_USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) CherryStudio/1.9.1 Chrome/144.0.7559.236 Electron/40.8.0 Safari/537.36',
      'X-Title': process.env.LLM_X_TITLE || 'GitHub Profile Updater',
    });
  }

  const requestBody = JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: buildPrompt(repo, topics, readmeExcerpt),
      },
    ],
    temperature: 0.2,
    stream: false,
  });

  let lastError = null;

  for (let attempt = 0; attempt <= LLM_MAX_RETRIES; attempt += 1) {
    await throttleLlmCall();

    let response;
    try {
      response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers,
        body: requestBody,
        signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (attempt === LLM_MAX_RETRIES) break;
      const waitMs = Math.min(60_000, 2000 * 2 ** attempt);
      console.warn(`LLM 请求异常（${error.message}），${Math.ceil(waitMs / 1000)}s 后重试（第 ${attempt + 1}/${LLM_MAX_RETRIES} 次）`);
      await sleep(waitMs);
      continue;
    }

    if (response.ok) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      return normalizeSummary(content, repo);
    }

    const responseBody = await response.text();
    lastError = new Error(`LLM request failed ${response.status}: ${responseBody.slice(0, 300)}`);

    // 只有限流和服务端错误值得重试，其余 4xx 重试也没用
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === LLM_MAX_RETRIES) break;

    const waitMs = retryDelayMs(response, attempt);
    console.warn(
      `LLM 请求被限流（${response.status}），${Math.ceil(waitMs / 1000)}s 后重试（第 ${attempt + 1}/${LLM_MAX_RETRIES} 次）`,
    );
    await sleep(waitMs);
  }

  throw lastError ?? new Error('LLM request failed');
}

/** 按 LLM_MODELS 的顺序尝试，遇到「模型已下线/不再免费」就换下一个。 */
async function summarizeWithLlm(repo, topics, readmeExcerpt) {
  if (!process.env.LLM_API_KEY) {
    throw new Error('LLM_API_KEY is not configured');
  }

  if (Date.now() > llmDeadline) {
    throw new Error('LLM 时间预算已用尽，改用 description 兜底');
  }

  let lastError = null;

  for (const model of LLM_MODELS) {
    if (unavailableModels.has(model)) continue;

    try {
      return await requestSummaryWithModel(model, repo, topics, readmeExcerpt);
    } catch (error) {
      lastError = error;
      if (/unavailable for free|not a valid model|No endpoints found|does not exist/i.test(error.message)) {
        unavailableModels.add(model);
        console.warn(`模型 ${model} 已不可用，后续项目跳过它`);
        continue;
      }

      // 免费模型常常被上游限流，重试几次仍然 429 就换下一个模型，别在一个身上耗
      if (error.message.includes('429')) {
        const failures = (modelFailures.get(model) || 0) + 1;
        modelFailures.set(model, failures);
        if (failures >= 2) {
          unavailableModels.add(model);
          console.warn(`模型 ${model} 连续限流，后续项目跳过它`);
        }
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error('没有可用的 LLM 模型');
}

async function enrichRepo(repo, { noLlm, existingSummary }) {
  // 已有描述直接复用：项目简介很少变，没必要每周重新生成一遍
  if (existingSummary && !REFRESH_ALL) {
    return {
      name: repo.name,
      html_url: repo.html_url,
      language: repo.language,
      summary: existingSummary,
      usedFallback: false,
    };
  }

  const [topics, readmeExcerpt] = await Promise.all([
    fetchTopics(OWNER, repo.name),
    fetchReadmeExcerpt(OWNER, repo.name),
  ]);

  let summary = fallbackSummary(repo);
  let usedFallback = noLlm;

  if (!noLlm) {
    try {
      summary = await summarizeWithLlm(repo, topics, readmeExcerpt);
      usedFallback = false;
    } catch (error) {
      console.warn(`LLM summary failed for ${repo.name}: ${error.message}`);
      usedFallback = true;
    }
  }

  return {
    name: repo.name,
    html_url: repo.html_url,
    language: repo.language,
    summary,
    usedFallback,
  };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.noLlm && !process.env.LLM_API_KEY) {
    throw new Error('LLM_API_KEY is required unless --no-llm is used');
  }

  const readme = await readFile(README_PATH, 'utf8');
  const repos = await fetchRepos(OWNER);
  const selected = selectRecentRepos(repos, {
    owner: PROFILE_REPO,
    recentMonths: RECENT_MONTHS,
  }).slice(0, MAX_PROJECTS);
  const existingSummaries = parseExistingSummaries(readme);
  const projects = [];

  for (const repo of selected) {
    projects.push(await enrichRepo(repo, {
      noLlm: args.noLlm,
      existingSummary: existingSummaries.get(repo.name),
    }));
  }

  if (!args.noLlm && projects.every((project) => project.usedFallback)) {
    throw new Error('LLM summarization failed for every project; refusing to overwrite README with fallback descriptions.');
  }

  const generated = formatProjectList(projects);
  const updated = replaceGeneratedSection(readme, generated);

  if (args.dryRun) {
    console.log(`Generated ${projects.length} recent projects.`);
    console.log(projects.map((project) => `- ${project.name}: ${project.summary}`).join('\n'));
    return;
  }

  if (updated !== readme) {
    await writeFile(README_PATH, updated, 'utf8');
    console.log(`Updated ${README_PATH} with ${projects.length} recent projects.`);
  } else {
    console.log(`${README_PATH} is already up to date.`);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] === currentFile) {
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
