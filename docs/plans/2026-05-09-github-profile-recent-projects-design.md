# GitHub Profile Recent Projects Design

## 背景

GitHub Profile 仓库 `CHENJIAMIAN/CHENJIAMIAN` 的 README 已有 `Recently 最近` 区块，但最前面的项目不是当前最近更新的公开项目。

## 已确认范围

- 使用方案 3：新增最近项目，保留旧列表。
- 根据追加要求，在已新增项目基础上追加一批近期公开仓库。
- 当前口径已由自动化方案接管：仅展示最近 3 个月有 `pushed_at` 更新的公开、非 private、非 fork、非 archived 仓库。
- 最近项目排在最前面。
- 不重做首页结构，不改作品展示、技能图标、旧项目链接等其它区块。

## 设计

在 `README.md` 的 `### 🎇 Recently 最近` 标题下方展示公开近期项目，按 GitHub 仓库更新时间从新到旧排列。每个项目保持现有格式：加粗链接作为项目名，下一行用一句中文说明用途，并在括号中标注主要技术。

主列表项目：

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

旧的近期项目列表去重后保留在 `更多近期更新` 下。

## 验证

- 查看 `git diff`，确认只影响 README 近期项目区块和本设计文档。
- 检查 Markdown 链接和中文编码正常。
