# First Real Chain Dogfood Acceptance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the first user-facing real-capability chain from settings readiness into Workbench stage modes, and produce a blocker list before adding more provider or publish work.

**Architecture:** This is an acceptance-only pass. It uses the existing desktop web dev surface, Playwright/browser checks, mocked Tauri/provider boundaries where needed, and writes evidence under `/tmp`; it must not modify application source or persist fake media results.

**Tech Stack:** Vue 3 desktop web build, Tauri invoke mocks in browser context, Playwright/browser automation, existing Vitest/TypeScript/Cargo verification commands.

---

## Scope

Run the product as a user would: open settings, inspect provider/local dependency readiness, move through Workbench stages, and confirm the UI honestly shows mock / real / not-connected / failed without silently falling back or fabricating outputs.

Do not test real network providers, do not require real FFmpeg, and do not implement fixes in this task.

## Task 1: First Real Chain Dogfood Acceptance

**Files:**
- Create only under `/tmp/mirax-first-real-chain-dogfood/`
- Do not modify repository source, tests, docs, or config.

- [ ] **Step 1: Inspect current readiness evidence**

  Read the existing compose acceptance reports:

  ```bash
  test -f /tmp/mirax-compose-readiness-playwright/report.json
  test -f /tmp/mirax-compose-final-acceptance/report.txt
  ```

  Expected: both files exist.

- [ ] **Step 2: Run browser dogfood flow**

  Use Playwright/browser automation against the desktop web app. Start a dev server only if no suitable server is already running.

  Check, with screenshots:

  - Settings provider readiness is honest for missing credentials/base URLs.
  - Local Dependencies FFmpeg states are honest for empty, invalid/unverified, and verified mocked paths.
  - Workbench stages `transcribe`, `rewrite`, `voice-clone`, `speech`, `avatar`, and `compose` expose user-visible mock / real / not-connected / failed state correctly.
  - No stage claims real readiness from provider `enabled` alone.
  - No stage writes fake final media artifacts during failed/not-connected paths.

- [ ] **Step 3: Write evidence report**

  Create:

  ```text
  /tmp/mirax-first-real-chain-dogfood/report.json
  /tmp/mirax-first-real-chain-dogfood/summary.md
  ```

  The report must list:

  - `status`: `passed`, `blocked`, or `failed`
  - screenshots
  - checked flows
  - blockers ranked P0/P1/P2
  - whether any source files changed

- [ ] **Step 4: Run minimal verification**

  Run:

  ```bash
  ./node_modules/.bin/vitest run apps/desktop/src/App.provider-runtime.test.ts apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/composables/useComposeRenderer.test.ts
  ./apps/desktop/node_modules/.bin/vue-tsc --noEmit -p apps/desktop/tsconfig.json
  git diff --check
  git diff -- docs/reverse-engineering/legacy-ui-gap-list.md docs/人工提示词.md docs/superpowers/PROJECT-STATE.md .codex/dispatch-state.json
  ```

  Expected: commands pass, and no protected source/doc files changed except controller-owned `.codex/dispatch-state.json`.

- [ ] **Step 5: Report**

  Return:

  ```text
  STATUS: DONE | BLOCKED
  CHANGED FILES:
  SUMMARY:
  BROWSER VERIFICATION:
  VERIFICATION:
  BLOCKERS:
  NOTES:
  - 未 commit / push
  ```
