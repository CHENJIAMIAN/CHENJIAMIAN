# GitHub Profile Recent Projects Implementation Plan

> [中文](2026-05-09-github-profile-recent-projects.md)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task.

**Goal:** Update the recent-projects section of the GitHub Profile README by
manually appending a group of recently updated public projects.

**Architecture:** This document records the earlier manual update approach. The
current definition is managed by automation, which generates the list from public,
non-private, non-fork, non-archived repositories with `pushed_at` updates in the
latest three months.

**Tech Stack:** GitHub Profile README, Markdown, GitHub CLI.

---

### Task 1: Record the design

**Files:**
- Create: `docs/plans/2026-05-09-github-profile-recent-projects-design.md`

**Step 1: Write the design record**

Record the user-confirmed manual approach: add recent projects, put newer items
first, and retain the old project list.

**Step 2: Verify the document**

Run: `git diff -- docs/plans/2026-05-09-github-profile-recent-projects-design.md`

Expected: the newly added document is Chinese Markdown and renders normally.

### Task 2: Update the README

**Files:**
- Modify: `README.md`

**Step 1: Insert recent public projects**

Insert after `### 🎇 Recently 最近`:

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

**Step 2: Retain the old list**

Keep the de-duplicated old-project list under `更多近期更新`; do not delete it.

**Step 3: Verify diff**

Run: `git diff -- README.md`

Expected: the `Recently 最近` primary list contains recent public projects, while
the old project list remains under `更多近期更新`.

### Task 3: Commit and push

**Files:**
- Modify: `README.md`
- Create: `docs/plans/2026-05-09-github-profile-recent-projects-design.md`
- Create: `docs/plans/2026-05-09-github-profile-recent-projects.md`

**Step 1: Check status**

Run: `git status --short`

Expected: only the three files above appear as changed.

**Step 2: Commit**

Run: `git commit -m "docs: 更新 GitHub 首页近期项目"`

Expected: commit succeeds.

**Step 3: Push**

Run: `git push origin main`
