> [English](2026-05-09-github-profile-recent-projects.en.md)

# GitHub Profile 最近项目实现计划

> **面向 Claude：** 必需子技能：使用 `superpowers:executing-plans` 按任务逐项执行本计划。

**目标：** 更新 GitHub Profile README 的近期项目区块，手工追加一批近期公开项目。

**架构：** 本文档记录早期手工更新方案；当前口径已由自动化方案接管，按最近 3 个月有 `pushed_at` 更新的公开、非 private、非 fork、非 archived 仓库生成。

**技术栈：** GitHub Profile README、Markdown、GitHub CLI。

---

### 任务 1：记录设计

**文件：**
- 创建：`docs/plans/2026-05-09-github-profile-recent-projects-design.md`

**步骤 1：写入设计记录**

记录用户确认的手工方案：新增最近项目，最近的排前面，保留旧项目列表。

**步骤 2：验证文档**

运行：`git diff -- docs/plans/2026-05-09-github-profile-recent-projects-design.md`

预期：新增文档内容为中文说明，Markdown 正常。

### 任务 2：更新 README

**文件：**
- 修改：`README.md`

**步骤 1：插入公开近期项目**

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

**步骤 2：保留旧列表**

旧项目去重后放到 `更多近期更新` 下继续保留，不删除。

**步骤 3：验证 diff**

运行：`git diff -- README.md`

预期：`Recently 最近` 主列表为公开近期项目，旧项目保留在 `更多近期更新` 下。

### 任务 3：提交和推送

**文件：**
- 修改：`README.md`
- 创建：`docs/plans/2026-05-09-github-profile-recent-projects-design.md`
- 创建：`docs/plans/2026-05-09-github-profile-recent-projects.md`

**步骤 1：检查状态**

运行：`git status --short`

预期：只出现上述 3 个文件变更。

**步骤 2：提交**

运行：`git commit -m "docs: 更新 GitHub 首页近期项目"`

预期：提交成功。

**步骤 3：推送**

运行：`git push origin main`
