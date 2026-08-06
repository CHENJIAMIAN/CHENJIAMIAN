# GitHub Profile Recent-Project Auto-update Design

> [中文](2026-05-09-auto-update-recent-projects-design.md)

## Background

The GitHub Profile README's `Recently 最近` section currently requires manual
maintenance. The desired change is automatic updates with project descriptions
summarized through an OpenAI-compatible LLM API.

## Approach

Use a combined "repository script + GitHub Actions" approach:

- `scripts/update-recent-projects.mjs` fetches public GitHub repositories, calls
  the LLM for summaries, and replaces the automatic section in the README.
- `.github/workflows/update-profile.yml` runs weekly on a schedule and supports
  manual dispatch.
- Local execution and GitHub Actions use the same script.
- The README encloses automatically maintained content with markers:
  - `<!-- recent-projects:start -->`
  - `<!-- recent-projects:end -->`

## LLM configuration

The script uses an OpenAI-compatible Chat Completions API.

Environment variables:

- `LLM_API_KEY`: required repository secret; never committed to code.
- `LLM_BASE_URL`: optional; defaults to `https://api.cerebras.ai/v1`.
- `LLM_MODEL`: optional; defaults to `qwen-3-235b-a22b-instruct-2507`.
- `LLM_HTTP_REFERER`: optional; defaults to the profile repository URL.
- `LLM_X_TITLE`: optional; defaults to `GitHub Profile Updater`.
- `LLM_USER_AGENT`: optional; defaults to emulating a Cherry Studio request.
- `LLM_COMPAT_HEADERS`: optional; when set to `cherry`, sends Cherry Studio
  compatibility headers. The official Cerebras endpoint does not need them by
  default.

## Data flow

1. The GitHub API fetches public repositories for `CHENJIAMIAN`.
2. Exclude the `CHENJIAMIAN` profile repository, private repositories, forks, and
   archived repositories.
3. Retain only public repositories with `pushed_at` updates in the latest three
   months and sort by `pushed_at` descending, so metadata changes do not distort
   the definition of "recent projects".
4. Read basic information, topics, and README excerpts for each repository.
5. The LLM produces a one-sentence Chinese description; on failure, fall back to
   the repository's original description.
6. Generate a Markdown list and replace the automatic README section.
7. The Action checks whether the README changed and commits only when it did.

## Constraints

- Never write API keys to the repository.
- Do not read or show private repositories; filter them during selection even if
  they appear in an API response.
- Normal execution requires `LLM_API_KEY`; local verification can explicitly use
  `--no-llm`.
- A failed LLM call for one project does not block the whole update; use the
  repository's original description as fallback.
- The implementation has switched to the official Cerebras endpoint, verified to
  work on GitHub-hosted runners.
- The script does not alter README content outside the automatic section.
