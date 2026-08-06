> [English](2026-05-09-auto-update-recent-projects.en.md)

# GitHub Profile 自动更新近期项目实现计划

> **面向 Claude：** 必需子技能：使用 `superpowers:executing-plans` 按任务逐项执行本计划。

**目标：** 为 GitHub Profile README 增加自动更新近期项目的能力，并使用 OpenAI 兼容 LLM 生成项目中文描述。

**架构：** 使用一个无依赖 Node.js 脚本处理 GitHub API、LLM 调用和 README marker 替换。脚本按 `pushed_at` 选择最近 3 个月更新的公开、非 private、非 fork、非 archived 仓库。GitHub Actions 定时执行脚本，也支持手动执行。

**技术栈：** Node.js 20+、node:test、GitHub Actions、OpenAI-compatible Chat Completions API。

---

### 任务 1：添加脚本测试

**文件：**
- 创建：`test/update-recent-projects.test.mjs`

**步骤 1：编写失败测试**

覆盖 README marker 替换、项目 Markdown 生成、按 `pushed_at` 的 3 个月窗口筛选和排序、过滤 profile/fork/archived/private 仓库等纯函数。

**步骤 2：运行测试确认失败**

运行：`node --test test/update-recent-projects.test.mjs`

预期：失败，因为 `scripts/update-recent-projects.mjs` 不存在。

### 任务 2：实现更新脚本

**文件：**
- 创建：`scripts/update-recent-projects.mjs`

**步骤 1：导出可测试纯函数**

实现：

- `replaceGeneratedSection(readme, content)`
- `selectRecentRepos(repos, { owner, recentMonths, now })`
- `formatProjectList(projects)`
- `fallbackSummary(repo)`

**步骤 2：实现运行入口**

读取 GitHub 仓库、topics、README，调用 LLM 生成摘要并替换 README。

**步骤 3：运行测试**

运行：`node --test test/update-recent-projects.test.mjs`

预期：通过。

### 任务 3：添加 README 自动区块

**文件：**
- 修改：`README.md`

**步骤 1：用 marker 包住近期项目主列表**

保留 `### 🎇 Recently 最近` 标题，把主列表放进：

- `<!-- recent-projects:start -->`
- `<!-- recent-projects:end -->`

**步骤 2：本地 dry-run**

运行：`node scripts/update-recent-projects.mjs --dry-run`

预期：如果未设置 `LLM_API_KEY`，提示必须配置 key。

运行：`node scripts/update-recent-projects.mjs --dry-run --no-llm`

预期：输出将更新的 README 内容摘要，不写入文件。

### 任务 4：添加 GitHub Actions

**文件：**
- 创建：`.github/workflows/update-profile.yml`

**步骤 1：定义触发**

支持：

- `schedule`
- `workflow_dispatch`

**步骤 2：设置环境变量**

使用：

- `GITHUB_TOKEN`
- `RECENT_PROJECT_MONTHS`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

**步骤 3：有变化时提交**

用 git diff 判断 README 是否变化，有变化则提交。

### 任务 5：提交和推送

**文件：**
- 所有已修改文件。

**步骤 1：验证**

运行：

- `node --test test/update-recent-projects.test.mjs`
- `node scripts/update-recent-projects.mjs --dry-run --no-llm`
- `git diff --check`

**步骤 2：提交**

运行：`git commit -m "feat: 自动更新 GitHub 首页近期项目"`

**步骤 3：推送**

运行：`git push origin main`
