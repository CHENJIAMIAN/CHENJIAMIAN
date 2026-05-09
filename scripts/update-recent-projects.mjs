#!/usr/bin/env node

import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OWNER = process.env.GITHUB_OWNER || 'CHENJIAMIAN';
const PROFILE_REPO = process.env.PROFILE_REPO || OWNER;
const RECENT_MONTHS = Number.parseInt(process.env.RECENT_PROJECT_MONTHS || '3', 10);
const README_PATH = process.env.README_PATH || 'README.md';
const GITHUB_API = process.env.GITHUB_API_URL || 'https://api.github.com';
const LLM_BASE_URL = (process.env.LLM_BASE_URL || 'https://api.cerebras.ai/v1').replace(/\/$/, '');
const LLM_MODEL = process.env.LLM_MODEL || 'qwen-3-235b-a22b-instruct-2507';

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

async function summarizeWithLlm(repo, topics, readmeExcerpt) {
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

  const response = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        {
          role: 'user',
          content: buildPrompt(repo, topics, readmeExcerpt),
        },
      ],
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  return normalizeSummary(content, repo);
}

async function enrichRepo(repo, { noLlm }) {
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
  });
  const projects = [];

  for (const repo of selected) {
    projects.push(await enrichRepo(repo, { noLlm: args.noLlm }));
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
