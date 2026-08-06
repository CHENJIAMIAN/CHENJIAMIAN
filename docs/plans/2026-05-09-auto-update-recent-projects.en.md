# Auto-update Recent Projects Implementation Plan

> [中文](2026-05-09-auto-update-recent-projects.md)

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task.

**Goal:** Add automatic recent-project updates to the GitHub Profile README and
generate Chinese project descriptions through an OpenAI-compatible LLM.

**Architecture:** Use a dependency-free Node.js script for GitHub API access, LLM
calls, and README marker replacement. The script selects public, non-private,
non-fork, non-archived repositories with `pushed_at` updates in the latest three
months. GitHub Actions runs it on a schedule and also supports manual execution.

**Tech Stack:** Node.js 20+, node:test, GitHub Actions, OpenAI-compatible Chat
Completions API.

---

### Task 1: Add script tests

**Files:**
- Create: `test/update-recent-projects.test.mjs`

**Step 1: Write failing tests**

Cover pure functions for README-marker replacement, project Markdown generation,
three-month filtering and sorting by `pushed_at`, and filtering profile, fork,
archived, and private repositories.

**Step 2: Run test to verify it fails**

Run: `node --test test/update-recent-projects.test.mjs`

Expected: FAIL because `scripts/update-recent-projects.mjs` does not exist.

### Task 2: Implement the update script

**Files:**
- Create: `scripts/update-recent-projects.mjs`

**Step 1: Export testable pure functions**

Implement:

- `replaceGeneratedSection(readme, content)`
- `selectRecentRepos(repos, { owner, recentMonths, now })`
- `formatProjectList(projects)`
- `fallbackSummary(repo)`

**Step 2: Implement the runtime entry point**

Read GitHub repositories, topics, and README content; call the LLM for summaries;
then replace the README section.

**Step 3: Run tests**

Run: `node --test test/update-recent-projects.test.mjs`

Expected: PASS.

### Task 3: Add the automatic README section

**Files:**
- Modify: `README.md`

**Step 1: Enclose the main recent-project list in markers**

Keep the `### 🎇 Recently 最近` heading and put the main list inside:

- `<!-- recent-projects:start -->`
- `<!-- recent-projects:end -->`

**Step 2: Local dry run**

Run: `node scripts/update-recent-projects.mjs --dry-run`

Expected: prompt that a key must be configured when `LLM_API_KEY` is unset.

Run: `node scripts/update-recent-projects.mjs --dry-run --no-llm`

Expected: print a summary of the README changes without writing a file.

### Task 4: Add GitHub Actions

**Files:**
- Create: `.github/workflows/update-profile.yml`

**Step 1: Define triggers**

Support:

- `schedule`
- `workflow_dispatch`

**Step 2: Set environment variables**

Use:

- `GITHUB_TOKEN`
- `RECENT_PROJECT_MONTHS`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`

**Step 3: Commit only when changed**

Use git diff to determine whether the README changed, and commit only if it did.

### Task 5: Commit and push

**Files:**
- All changed files.

**Step 1: Verify**

Run:

- `node --test test/update-recent-projects.test.mjs`
- `node scripts/update-recent-projects.mjs --dry-run --no-llm`
- `git diff --check`

**Step 2: Commit**

Run: `git commit -m "feat: 自动更新 GitHub 首页近期项目"`

**Step 3: Push**

Run: `git push origin main`
