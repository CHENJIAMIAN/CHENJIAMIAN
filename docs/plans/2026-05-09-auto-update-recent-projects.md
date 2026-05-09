# Auto Update Recent Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 GitHub Profile README 增加自动更新近期项目能力，并用 OpenAI 兼容 LLM 生成项目中文描述。

**Architecture:** 使用一个无依赖 Node.js 脚本处理 GitHub API、LLM 调用和 README marker 替换。脚本按 `pushed_at` 选择最近公开非 fork、非 archived 仓库。GitHub Actions 支持手动执行；当前 LLM 域名会拦截 GitHub-hosted runner，因此定时触发暂不启用。

**Tech Stack:** Node.js 20+、node:test、GitHub Actions、OpenAI-compatible Chat Completions API。

---

### Task 1: 添加脚本测试

**Files:**
- Create: `test/update-recent-projects.test.mjs`

**Step 1: 写失败测试**

覆盖 README marker 替换、项目 Markdown 生成、按 `pushed_at` 排序、过滤 profile/fork/archived/private 仓库等纯函数。

**Step 2: 运行测试确认失败**

Run: `node --test test/update-recent-projects.test.mjs`

Expected: FAIL，因为 `scripts/update-recent-projects.mjs` 不存在。

### Task 2: 实现更新脚本

**Files:**
- Create: `scripts/update-recent-projects.mjs`

**Step 1: 导出可测试纯函数**

实现：

- `replaceGeneratedSection(readme, content)`
- `selectRecentRepos(repos, owner, limit)`
- `formatProjectList(projects)`
- `fallbackSummary(repo)`

**Step 2: 实现运行入口**

读取 GitHub 仓库、topics、README，调用 LLM 总结，替换 README。

**Step 3: 运行测试**

Run: `node --test test/update-recent-projects.test.mjs`

Expected: PASS。

### Task 3: 添加 README 自动区块

**Files:**
- Modify: `README.md`

**Step 1: 用 marker 包住近期项目主列表**

保留 `### 🎇 Recently 最近` 标题，把主列表放进：

- `<!-- recent-projects:start -->`
- `<!-- recent-projects:end -->`

**Step 2: 本地 dry-run**

Run: `node scripts/update-recent-projects.mjs --dry-run`

Expected: 如果未设置 `LLM_API_KEY`，提示必须配置 key。

Run: `node scripts/update-recent-projects.mjs --dry-run --no-llm`

Expected: 输出会更新的 README 内容摘要，不写文件。

### Task 4: 添加 GitHub Actions

**Files:**
- Create: `.github/workflows/update-profile.yml`

**Step 1: 定义触发**

支持：

- `workflow_dispatch`

**Step 2: 设置环境变量**

使用：

- `GITHUB_TOKEN`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

**Step 3: 有变化时提交**

用 git diff 判断 README 是否变化，有变化则提交。

### Task 5: 提交和推送

**Files:**
- All changed files.

**Step 1: 验证**

Run:

- `node --test test/update-recent-projects.test.mjs`
- `node scripts/update-recent-projects.mjs --dry-run --no-llm`
- `git diff --check`

**Step 2: 提交**

Run: `git commit -m "feat: 自动更新 GitHub 首页近期项目"`

**Step 3: 推送**

Run: `git push origin main`
