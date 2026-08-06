# GitHub Profile Recent Projects Design

> [中文](2026-05-09-github-profile-recent-projects-design.md)

## Background

The GitHub Profile repository `CHENJIAMIAN/CHENJIAMIAN` already has a
`Recently 最近` section in its README, but the first projects listed are not the
currently most recently updated public projects.

## Confirmed scope

- Use option 3: add recent projects and retain the old list.
- Following the additional request, append another group of recent public
  repositories after the newly added projects.
- The definition is now managed by automation: display only public, non-private,
  non-fork, non-archived repositories with `pushed_at` updates in the latest
  three months.
- Recent projects appear first.
- Do not rebuild the home-page structure or modify other sections such as project
  showcases, skill icons, and old project links.

## Design

Under the `### 🎇 Recently 最近` heading in `README.md`, display recently updated
public projects in descending GitHub repository update order. Each project keeps
the existing format: a bold project-name link, followed by a one-sentence Chinese
description and main technologies in parentheses.

Primary-list projects:

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

Retain the de-duplicated old recent-project list under `更多近期更新`.

## Verification

- Inspect `git diff` and confirm it affects only the README recent-project
  section and this design document.
- Check that Markdown links and Chinese encoding work correctly.
