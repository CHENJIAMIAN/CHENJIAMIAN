# GitHub Profile Recent Projects Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 更新 GitHub Profile README 的近期项目区块，手工追加一批近期公开项目。

**Architecture:** 本文档记录早期手工更新方案；当前口径已由自动化方案接管，按最近 3 个月有 `pushed_at` 更新的公开、非 private、非 fork、非 archived 仓库生成。

**Tech Stack:** GitHub Profile README、Markdown、GitHub CLI。

---

### Task 1: 记录设计

**Files:**
- Create: `docs/plans/2026-05-09-github-profile-recent-projects-design.md`

**Step 1: 写入设计记录**

记录用户确认的手工方案：新增最近项目，最近的排前面，保留旧项目列表。

**Step 2: 验证文档**

运行：`git diff -- docs/plans/2026-05-09-github-profile-recent-projects-design.md`

预期：新增文档内容为中文说明，Markdown 正常。

### Task 2: 更新 README

**Files:**
- Modify: `README.md`

**Step 1: 插入公开近期项目**

在 `### 🎇 Recently 最近` 后插入：

- `codex-ai-replies-cli`
- `codex-autopilot-npm`
- `codex-autopilot`
- `workday-dashboard`
- `screen-timeline-recorder`
- `industrial-glb-exporter`
- `vscode-extension-multi-cursor-ai-generate`
- `threejs-dissolve-playground`
- `coze-coding-skills`
- `html_to_ppt`
- `open-templates`
- `Blog`
- `agent-cli-updater`

**Step 2: 保留旧列表**

旧项目去重后放到 `更多近期更新` 下继续保留，不删除。

**Step 3: 验证 diff**

运行：`git diff -- README.md`

预期：`Recently 最近` 主列表为公开近期项目，旧项目保留在 `更多近期更新` 下。

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
