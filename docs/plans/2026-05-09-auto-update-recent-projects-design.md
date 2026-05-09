# GitHub Profile 自动更新近期项目设计

## 背景

GitHub Profile README 的 `Recently 最近` 区块目前需要手工维护。用户希望改为自动更新，并用 OpenAI 兼容 LLM 接口自动总结项目描述。

## 方案

采用“仓库脚本 + GitHub Actions”的混合方案：

- `scripts/update-recent-projects.mjs` 负责拉取 GitHub 公开仓库、调用 LLM 总结、替换 README 自动区块。
- `.github/workflows/update-profile.yml` 负责每天定时运行，也支持手动触发。
- 本地和 GitHub Actions 使用同一份脚本。
- README 使用 marker 包裹自动维护内容：
  - `<!-- recent-projects:start -->`
  - `<!-- recent-projects:end -->`

## LLM 配置

脚本使用 OpenAI 兼容 Chat Completions 接口。

环境变量：

- `LLM_API_KEY`：必填，仓库 secret，不写入代码。
- `LLM_BASE_URL`：可选，默认 `https://api.cerebras.ai/v1`。
- `LLM_MODEL`：可选，默认 `qwen-3-235b-a22b-instruct-2507`。
- `LLM_HTTP_REFERER`：可选，默认 profile 仓库地址。
- `LLM_X_TITLE`：可选，默认 `GitHub Profile Updater`。
- `LLM_USER_AGENT`：可选，默认模拟 Cherry Studio 请求。
- `LLM_COMPAT_HEADERS`：可选，设为 `cherry` 时发送 Cherry Studio 兼容请求头；官方 Cerebras 端点默认不需要。

## 数据流

1. GitHub API 拉取 `CHENJIAMIAN` 的公开仓库。
2. 排除 profile 仓库 `CHENJIAMIAN`、private 仓库、fork 仓库和 archived 仓库。
3. 仅保留最近 3 个月内有 `pushed_at` 更新的仓库，并按 `pushed_at` 从新到旧排序，避免仓库元数据变动影响“近期项目”口径。
4. 对每个仓库读取基础信息、topics、README 片段。
5. LLM 输出一句中文描述；失败时退回仓库原 description。
6. 生成 Markdown 列表并替换 README 自动区块。
7. Action 检测 README 是否变化，有变化才提交。

## 约束

- 不把 API key 写入仓库。
- 不读取、不展示 private 仓库；即使 API 响应中出现 private 仓库，也会在选择阶段过滤。
- 普通运行必须配置 `LLM_API_KEY`；本地验证可显式使用 `--no-llm`。
- 单个项目的 LLM 调用失败不阻塞整体更新，会退回仓库原 description。
- 已切换到 Cerebras 官方端点；GitHub-hosted runner 已验证可正常调用。
- 自动区块之外的 README 内容不被脚本改动。
