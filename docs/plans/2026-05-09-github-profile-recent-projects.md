# GitHub Profile Recent Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 更新 GitHub Profile README 的近期项目区块，把最新公开项目放到最前面。

**Architecture:** 本次只改 Markdown 内容，不引入脚本或自动化流程。数据来源为 `gh repo list CHENJIAMIAN` 返回的公开仓库更新时间。

**Tech Stack:** GitHub Profile README、Markdown、GitHub CLI。

---

### Task 1: 记录设计

**Files:**
- Create: `docs/plans/2026-05-09-github-profile-recent-projects-design.md`

**Step 1: 写入设计记录**

记录用户确认的方案：只新增最近项目，最近的排前面，保留旧项目列表。

**Step 2: 验证文档**

运行：`git diff -- docs/plans/2026-05-09-github-profile-recent-projects-design.md`

预期：新增文档内容为中文说明，Markdown 正常。

### Task 2: 更新 README

**Files:**
- Modify: `README.md`

**Step 1: 插入最新 3 个公开项目**

在 `### 🎇 Recently 最近` 后插入：

- `codex-ai-replies-cli`
- `codex-autopilot-npm`
- `codex-autopilot`

**Step 2: 保留旧列表**

旧项目从 `vscode-extension-multi-cursor-ai-generate` 开始继续保留，不删除。

**Step 3: 验证 diff**

运行：`git diff -- README.md`

预期：只在 `Recently 最近` 标题下新增 3 个项目。

### Task 3: 提交和推送

**Files:**
- Modify: `README.md`
- Create: `docs/plans/2026-05-09-github-profile-recent-projects-design.md`
- Create: `docs/plans/2026-05-09-github-profile-recent-projects.md`

**Step 1: 检查状态**

运行：`git status --short`

预期：只出现上述 3 个文件变更。

**Step 2: 提交**

运行：`git commit -m "docs: 更新 GitHub 首页近期项目"`

预期：提交成功。

**Step 3: 推送**

运行：`git push origin main`

预期：推送到 `CHENJIAMIAN/CHENJIAMIAN` 的 `main` 分支。
