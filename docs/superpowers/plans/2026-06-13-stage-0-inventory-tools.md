# Stage 0 Inventory Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Create the stage 0 project-state entry point, evidence indexes, documentation templates, and recovery rules needed before old-app runtime inspection begins.

**Architecture:** This is a documentation and process scaffold. It does not implement product features; it creates small, separately owned Markdown files so Codex and Claude Code workers can resume context, record evidence, and write page/function records without colliding in one large document.

**Tech Stack:** Markdown, Git, ripgrep, existing Mirax AI docs under `docs/superpowers/` and `docs/reverse-engineering/`.

---

## Resume Here

Current automatic dispatch entry: `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`.

Current stage: Stage 0, `整理现状与盘点工具`.

Execute this plan before any old-app runtime inspection. Stage 0 is complete only after `docs/superpowers/PROJECT-STATE.md` points to a future Stage 1 runtime inspection plan and all validation commands in Task 7 pass.

Do not update `docs/reverse-engineering/legacy-ui-gap-list.md` during this plan. Stage 0 creates inventory tools only; it does not mark old UI gaps as implemented.

## Scope

This plan implements only Stage 0 from `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`.

It creates:

- A durable project-state entry point for new Codex/Claude sessions.
- Evidence and asset indexes with structured IDs.
- Directories for function cards, page inspection records, static analysis records, and screenshots.
- Four reusable templates with the minimum fields required by the roadmap spec.
- Seed index entries for the reverse-engineering docs already present in the repo.
- A handoff note saying the next plan must be Stage 1 runtime inspection.

It does not:

- Inspect the old app.
- Analyze DMG, ASAR, preload APIs, or local databases.
- Create real function cards for undiscovered features.
- Update gap-list implementation status.
- Modify desktop application code.

## Target File Structure

```text
docs/
  superpowers/
    PROJECT-STATE.md                  Create. Human and agent recovery entry point.
    plans/
      2026-06-13-stage-0-inventory-tools.md
  reverse-engineering/
    evidence-index.md                 Create. Canonical evidence ID registry.
    assets-index.md                   Create. Evidence asset registry and Git policy.
    runtime-blockers.md               Create. Login, activation, cloud, model, platform, and local dependency blockers.
    templates/
      function-card-template.md       Create. Copyable template for function cards.
      page-inspection-template.md     Create. Copyable template for old-app page inspections.
      runtime-blocker-template.md     Create. Copyable template for blocker records.
      static-analysis-template.md     Create. Copyable template for static analysis records.
    function-cards/
      .gitkeep                        Create. Keeps directory in Git before cards exist.
    pages/
      .gitkeep                        Create. Keeps directory in Git before page records exist.
    static-analysis/
      .gitkeep                        Create. Keeps directory in Git before analysis records exist.
    assets/
      screenshots/
        .gitkeep                      Create. Allows small reviewed screenshots to be tracked when needed.
```

## Validation Commands

Run these after each task where relevant:

```bash
rg -n "(TO""DO)|(TB""D)|待""定" docs/superpowers/PROJECT-STATE.md docs/reverse-engineering docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md
```

Expected: no output.

Run these before the final commit:

```bash
test -f docs/superpowers/PROJECT-STATE.md
test -f docs/reverse-engineering/evidence-index.md
test -f docs/reverse-engineering/assets-index.md
test -f docs/reverse-engineering/runtime-blockers.md
test -f docs/reverse-engineering/templates/function-card-template.md
test -f docs/reverse-engineering/templates/page-inspection-template.md
test -f docs/reverse-engineering/templates/runtime-blocker-template.md
test -f docs/reverse-engineering/templates/static-analysis-template.md
test -f docs/reverse-engineering/function-cards/.gitkeep
test -f docs/reverse-engineering/pages/.gitkeep
test -f docs/reverse-engineering/static-analysis/.gitkeep
test -f docs/reverse-engineering/assets/screenshots/.gitkeep
rg -n "EV-DOC-001|EV-DOC-002|EV-DOC-003|EV-DOC-004" docs/reverse-engineering/evidence-index.md
rg -n "当前自动调度入口|阶段 0|阶段 1" docs/superpowers/PROJECT-STATE.md docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md
```

Expected: every `test -f` exits 0; `rg` finds all listed IDs and stage handoff text.

---

### Task 1: Create Project State Entry

**Files:**
- Create: `docs/superpowers/PROJECT-STATE.md`

- [x] **Step 1: Verify the state entry does not already exist**

Run:

```bash
test ! -f docs/superpowers/PROJECT-STATE.md
```

Expected: PASS. If the file already exists, read it and merge the content below without deleting existing decisions.

- [x] **Step 2: Create the project state document**

Create `docs/superpowers/PROJECT-STATE.md` with:

```md
# Mirax AI Project State

## Current Goal

Build Mirax AI by evidence-driven complete functional reconstruction of the old 轻语 IP 智能体 product. The old UI is a product behavior reference, not a visual target. Mirax AI will use a redesigned professional UI while preserving old-product capabilities, flows, states, and output chains.

## Current Stage

Stage 0: 整理现状与盘点工具.

Stage 0 is active until the project has a stable recovery entry point, evidence index, asset index, runtime blocker record, templates, and directory structure for Stage 1 runtime inspection.

## Current Automatic Dispatch Entry

`docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`

When automatic dispatch is requested, use the newest plan in `docs/superpowers/plans/`. As of this state file, the current intended entry is the Stage 0 inventory tools plan above.

## Latest Executable Task

Execute `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md` from Task 1 through Task 7.

Do not inspect the old app yet. Do not update `docs/reverse-engineering/legacy-ui-gap-list.md` status during Stage 0.

## Progress Links

- Roadmap spec: `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md`
- Current plan: `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`
- Existing desktop rebuild spec: `docs/superpowers/specs/2026-06-11-mirax-desktop-rebuild-design.md`
- Existing first usable release plan: `docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`
- Existing demo video timeline: `docs/reverse-engineering/demo-video-timeline.md`
- Existing demo coverage matrix: `docs/reverse-engineering/demo-video-coverage.md`
- Existing legacy UI gap list: `docs/reverse-engineering/legacy-ui-gap-list.md`
- Evidence index: `docs/reverse-engineering/evidence-index.md`
- Asset index: `docs/reverse-engineering/assets-index.md`
- Runtime blockers: `docs/reverse-engineering/runtime-blockers.md`
- Function cards: `docs/reverse-engineering/function-cards/`
- Page inspections: `docs/reverse-engineering/pages/`
- Static analysis records: `docs/reverse-engineering/static-analysis/`

## Key Decisions

1. Use evidence-driven reconstruction as the main roadmap approach.
2. Prioritize full old-product function discovery before broad new implementation.
3. Treat runtime observation as the highest-priority evidence source.
4. Use static analysis to fill gaps from blocked or incomplete runtime observation.
5. Record login, activation, cloud, model, platform, and local dependency limits as blockers, not bypass tasks.
6. Rebuild Mirax AI with a redesigned UI; do not copy the old visual style.
7. Keep `PROJECT-STATE.md` as the recovery entry point for new Codex and Claude Code sessions.

## Workspace Notes

- Large reverse-engineering inputs must not enter Git: DMG files, full screen recordings, unpacked ASAR directories, model files, large resource directories, and bulk frame exports.
- Small screenshots may enter Git only when useful for documentation. Store them under `docs/reverse-engineering/assets/screenshots/` and register them in both `assets-index.md` and `evidence-index.md`.
- The CodeGraph MCP tools may not be available in every session. If unavailable, use local files and `rg`.
- cmux dispatch must follow `AGENTS.md`: latest plan under `docs/superpowers/plans/`, runtime state in `.codex/dispatch-state.json`, and heartbeat id `mirax-dispatch`.
- Existing uncommitted workspace changes outside Stage 0 docs must not be reverted or included in Stage 0 commits.

## New Session Recovery Steps

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Read this file: `docs/superpowers/PROJECT-STATE.md`.
4. Read the current plan listed in `Current Automatic Dispatch Entry`.
5. Read the roadmap spec if the task touches evidence rules, templates, or phase boundaries.
6. Run `git status --short` and avoid touching unrelated user changes.
7. Continue from the first unchecked step in the current plan.

## Stage 0 Completion Standard

Stage 0 is complete only when:

- `PROJECT-STATE.md` exists and points to the current plan.
- `evidence-index.md`, `assets-index.md`, and `runtime-blockers.md` exist.
- Template files exist for function cards, page inspections, runtime blockers, and static analysis.
- Directories exist for function cards, page inspections, static analysis records, and screenshots.
- Existing reverse-engineering docs are seeded as evidence records.
- The next action clearly says to create the Stage 1 runtime inspection plan.

## Next Action

Finish Stage 0 by executing `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`.

After Stage 0 is committed and reviewed, invoke `superpowers:writing-plans` again to create Stage 1: 旧版运行态全量巡检 implementation plan.
```

- [x] **Step 3: Verify project state content**

Run:

```bash
rg -n "Current Goal|Current Stage|Current Automatic Dispatch Entry|New Session Recovery Steps|Stage 0 Completion Standard" docs/superpowers/PROJECT-STATE.md
```

Expected: all five section names are found.

- [x] **Step 4: Commit project state entry**

```bash
git add docs/superpowers/PROJECT-STATE.md
git commit -m "docs: add project state entry"
```

---

### Task 2: Create Evidence And Asset Indexes

**Files:**
- Create: `docs/reverse-engineering/evidence-index.md`
- Create: `docs/reverse-engineering/assets-index.md`

- [x] **Step 1: Verify indexes do not already exist**

Run:

```bash
test ! -f docs/reverse-engineering/evidence-index.md
test ! -f docs/reverse-engineering/assets-index.md
```

Expected: PASS. If either file exists, merge the content below without deleting existing evidence rows.

- [x] **Step 2: Create evidence index**

Create `docs/reverse-engineering/evidence-index.md` with:

```md
# Evidence Index

This is the canonical evidence registry for the Mirax AI old-product reconstruction.

Function cards, page inspection records, runtime blocker records, and static analysis records should reference evidence IDs from this file instead of copying long paths or repeated descriptions.

## Evidence Levels

| Level | Name | Meaning |
| --- | --- | --- |
| E1 | 运行态已验证 | Old app page, control, interaction, or state change was directly observed. |
| E2 | 运行态可见但受限 | Old app page, control, or field is visible, but execution is blocked by login, activation, cloud, model, platform, or local dependency constraints. |
| E3 | 静态分析确认 | Static package, preload API, resource, database, config, or code analysis confirms the module, API, field, or resource. |
| E4 | 旧仓库或文档线索 | Old README, early source, demo video, comments, or historical documents provide the evidence. |
| E5 | 合理推断 | Inference based on naming, module boundaries, page structure, or comparable product behavior. |

## Confidence

| Confidence | Meaning |
| --- | --- |
| high | Direct, reviewable evidence with no conflicting source. |
| medium | Credible but incomplete evidence, or evidence needing another source to confirm inputs, outputs, states, or dependencies. |
| low | Inference, stale documentation, blocked runtime observation, or an observation that cannot be reviewed. |

## Conflict Rule

Prefer sources closer to real runtime behavior: E1 over E2, E2 over E3, E3 over E4, and E4 over E5. For conflicts within the same level, prefer the newer, more reviewable, and more complete source. Preserve the conflict note in the related function card.

## ID Ranges

| Prefix | Source Type |
| --- | --- |
| EV-RUNTIME | Runtime observation, screenshots, recordings, and page operation notes. |
| EV-STATIC | Old package, unpacked resources, preload API, local config, database, or code analysis. |
| EV-DOC | Old repository docs, current project docs, historical notes, and demo-video timelines. |
| EV-INFER | Explicitly marked inference. |

## Records

| Evidence ID | Level | Confidence | Source Type | Summary | Asset Path Or External Location | Related Page | Related Function Card | Recorder | Date |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EV-DOC-001 | E4 | medium | Current repo doc | Demo video timeline records visible old-product workflow segments and priorities. | `docs/reverse-engineering/demo-video-timeline.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-002 | E4 | medium | Current repo doc | Demo coverage matrix maps demo-visible features to current Mirax AI implementation and mock boundaries. | `docs/reverse-engineering/demo-video-coverage.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-003 | E4 | medium | Current repo doc | Legacy UI gap list records known UI and workflow gaps from the first usable release effort. | `docs/reverse-engineering/legacy-ui-gap-list.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-004 | E4 | high | Current repo spec | Evidence-driven roadmap defines evidence levels, confidence rules, templates, phase order, and recovery requirements. | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | N/A | N/A | Codex | 2026-06-13 |
```

- [x] **Step 3: Create asset index**

Create `docs/reverse-engineering/assets-index.md` with:

```md
# Assets Index

This file records where evidence assets live and whether they are allowed in Git.

Large reverse-engineering assets must not enter Git. This includes DMG files, full screen recordings, unpacked ASAR directories, model files, large resource directories, and bulk frame exports.

Small reviewed screenshots may enter Git only when useful for documentation. Store them under `docs/reverse-engineering/assets/screenshots/` and register them here plus in `evidence-index.md`.

## Asset Rules

| Asset Type | Git Policy | Storage Rule |
| --- | --- | --- |
| DMG or installer | Do not commit | Record local path or external storage location only. |
| Full screen recording | Do not commit | Record local path, external storage location, duration, and related evidence ID. |
| Unpacked ASAR or app bundle | Do not commit | Record local path and summary only. |
| Model file or large binary resource | Do not commit | Record local path and summary only. |
| Bulk frame export | Do not commit | Record local path and frame range summary only. |
| Small screenshot | May commit when useful | Store under `docs/reverse-engineering/assets/screenshots/` with `YYYY-MM-DD-page-or-feature-brief.png`. |
| Small text excerpt or generated summary | May commit | Store in the relevant Markdown record. |

## Records

| Asset ID | Evidence ID | Asset Type | Git Policy | Path Or External Location | Summary | Related Record | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ASSET-DOC-001 | EV-DOC-001 | Markdown doc | Tracked | `docs/reverse-engineering/demo-video-timeline.md` | Existing demo-video timeline. | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-002 | EV-DOC-002 | Markdown doc | Tracked | `docs/reverse-engineering/demo-video-coverage.md` | Existing demo coverage matrix. | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-003 | EV-DOC-003 | Markdown doc | Tracked | `docs/reverse-engineering/legacy-ui-gap-list.md` | Existing legacy UI gap list. | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-004 | EV-DOC-004 | Markdown spec | Tracked | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | Current evidence-driven roadmap spec. | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
```

- [x] **Step 4: Verify seeded evidence and assets**

Run:

```bash
rg -n "EV-DOC-001|EV-DOC-002|EV-DOC-003|EV-DOC-004" docs/reverse-engineering/evidence-index.md
rg -n "ASSET-DOC-001|ASSET-DOC-002|ASSET-DOC-003|ASSET-DOC-004" docs/reverse-engineering/assets-index.md
```

Expected: all seeded IDs are found.

- [x] **Step 5: Commit indexes**

```bash
git add docs/reverse-engineering/evidence-index.md docs/reverse-engineering/assets-index.md
git commit -m "docs: add evidence and asset indexes"
```

---

### Task 3: Create Inventory Directories

**Files:**
- Create: `docs/reverse-engineering/function-cards/.gitkeep`
- Create: `docs/reverse-engineering/pages/.gitkeep`
- Create: `docs/reverse-engineering/static-analysis/.gitkeep`
- Create: `docs/reverse-engineering/assets/screenshots/.gitkeep`

- [x] **Step 1: Create directory keep files**

Create the four `.gitkeep` files as empty files:

```text
docs/reverse-engineering/function-cards/.gitkeep
docs/reverse-engineering/pages/.gitkeep
docs/reverse-engineering/static-analysis/.gitkeep
docs/reverse-engineering/assets/screenshots/.gitkeep
```

- [x] **Step 2: Verify directory keep files**

Run:

```bash
test -f docs/reverse-engineering/function-cards/.gitkeep
test -f docs/reverse-engineering/pages/.gitkeep
test -f docs/reverse-engineering/static-analysis/.gitkeep
test -f docs/reverse-engineering/assets/screenshots/.gitkeep
```

Expected: every command exits 0.

- [x] **Step 3: Commit inventory directories**

```bash
git add docs/reverse-engineering/function-cards/.gitkeep docs/reverse-engineering/pages/.gitkeep docs/reverse-engineering/static-analysis/.gitkeep docs/reverse-engineering/assets/screenshots/.gitkeep
git commit -m "docs: add reverse engineering inventory directories"
```

---

### Task 4: Create Function And Page Templates

**Files:**
- Create: `docs/reverse-engineering/templates/function-card-template.md`
- Create: `docs/reverse-engineering/templates/page-inspection-template.md`

- [x] **Step 1: Create function card template**

Create `docs/reverse-engineering/templates/function-card-template.md` with:

```md
# Function Card Template

Copy this file into `docs/reverse-engineering/function-cards/` and rename it using a stable feature ID, for example `FC-HOME-WORKBENCH.md`.

## Identity

| Field | Value |
| --- | --- |
| Function ID |  |
| Function Name |  |
| Old App Entry |  |
| Mirax AI Module |  |
| Priority | P0 |
| Related Gap List Row | N/A |

## Evidence

| Field | Value |
| --- | --- |
| Evidence IDs |  |
| Highest Evidence Level | E5 |
| Confidence | low |
| Conflict Notes | N/A |

## User Goal

Describe the user outcome this function supports in one or two sentences.

## Page Structure

Record information organization and interaction behavior only. Do not copy old visual style, colors, typography, spacing, or decorative treatment.

| Area | Controls Or Fields | Behavior |
| --- | --- | --- |
|  |  |  |

## Inputs And Outputs

| Type | Details |
| --- | --- |
| User Inputs |  |
| System Outputs |  |
| Downstream Dependencies |  |

## Execution Chain

| Layer | Evidence Or Expected Role |
| --- | --- |
| Frontend |  |
| Provider |  |
| Sidecar |  |
| Local Storage |  |
| External Service |  |

## Limits And Risks

| Risk | Impact | Handling |
| --- | --- | --- |
|  |  |  |

## Mirax AI Implementation Recommendation

Choose one: keep, redesign, merge, defer, replace.

Decision:

Reason:

## Dispatch Notes

| Field | Value |
| --- | --- |
| Suggested Files |  |
| Verification Commands |  |
| Acceptance Criteria |  |
| Owner Scope |  |
```

- [x] **Step 2: Create page inspection template**

Create `docs/reverse-engineering/templates/page-inspection-template.md` with:

```md
# Page Inspection Template

Copy this file into `docs/reverse-engineering/pages/` and rename it using a stable page ID, for example `PAGE-HOME.md`.

## Identity

| Field | Value |
| --- | --- |
| Page ID |  |
| Page Name |  |
| Old App Entry Path |  |
| Inspection Priority | P0 |

## Evidence

| Field | Value |
| --- | --- |
| Evidence IDs |  |
| Highest Evidence Level | E5 |
| Confidence | low |
| Related Assets |  |

## Page Areas

| Area | Visible Content | Notes |
| --- | --- | --- |
|  |  |  |

## Visible Controls

| Control | Type | Enabled State | Observed Behavior |
| --- | --- | --- | --- |
|  |  |  |  |

## Form Fields

| Field | Input Type | Default Or Example Value | Validation Or Help Text |
| --- | --- | --- | --- |
|  |  |  |  |

## Dialogs And Prompts

| Trigger | Dialog Or Prompt | Action Buttons | Result |
| --- | --- | --- | --- |
|  |  |  |  |

## State Changes

| Action | Before | After | Evidence ID |
| --- | --- | --- | --- |
|  |  |  |  |

## Executable Actions

| Action | Result | Related Function Card |
| --- | --- | --- |
|  |  |  |

## Restricted Actions

| Action | Blocker | Runtime Blocker ID |
| --- | --- | --- |
|  |  |  |

## Related Function Cards

- N/A

## Open Questions

- N/A
```

- [x] **Step 3: Verify templates have required fields**

Run:

```bash
rg -n "Function ID|Evidence IDs|Highest Evidence Level|Confidence|Dispatch Notes" docs/reverse-engineering/templates/function-card-template.md
rg -n "Page ID|Visible Controls|Form Fields|Restricted Actions|Related Function Cards" docs/reverse-engineering/templates/page-inspection-template.md
```

Expected: all field names are found.

- [x] **Step 4: Commit function and page templates**

```bash
git add docs/reverse-engineering/templates/function-card-template.md docs/reverse-engineering/templates/page-inspection-template.md
git commit -m "docs: add function and page inventory templates"
```

---

### Task 5: Create Blocker And Static Analysis Templates

**Files:**
- Create: `docs/reverse-engineering/runtime-blockers.md`
- Create: `docs/reverse-engineering/templates/runtime-blocker-template.md`
- Create: `docs/reverse-engineering/templates/static-analysis-template.md`

- [x] **Step 1: Create runtime blocker index**

Create `docs/reverse-engineering/runtime-blockers.md` with:

```md
# Runtime Blockers

This file records access and execution limits observed while inspecting the old app.

Blockers are not bypass tasks. They record what is blocked, what remains visible, which evidence IDs support the observation, and how Mirax AI should replace or redesign the blocked capability.

## Blocker Types

| Type | Meaning |
| --- | --- |
| login | Login or account session is required. |
| activation | Activation, license, membership, or entitlement prevents execution. |
| cloud-service | Old cloud API, hosted asset, or backend service is unavailable or restricted. |
| model | AI, voice, avatar, ASR, or rendering model is unavailable or not configured. |
| platform-rule | Social platform login, policy, browser automation, or publishing rule prevents completion. |
| local-dependency | Local FFmpeg, Python service, browser, model file, or app runtime dependency is missing. |
| unknown | The app shows a blocker but the category is not yet clear. |

## Records

| Blocker ID | Type | Related Page Or Function | Evidence IDs | Trigger | Visible Information | Static Follow-Up | Mirax AI Replacement | Blocks Current Stage |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-000 | unknown | N/A | N/A | No runtime blocker recorded yet. | N/A | N/A | N/A | no |
```

- [x] **Step 2: Create runtime blocker template**

Create `docs/reverse-engineering/templates/runtime-blocker-template.md` with:

```md
# Runtime Blocker Template

Copy this section into `docs/reverse-engineering/runtime-blockers.md` or a dedicated blocker file if the blocker needs a long analysis.

## Identity

| Field | Value |
| --- | --- |
| Blocker ID |  |
| Type | unknown |
| Related Page Or Function |  |
| Blocks Current Stage | no |

## Evidence

| Field | Value |
| --- | --- |
| Evidence IDs |  |
| Highest Evidence Level | E2 |
| Confidence | low |

## Observation

| Field | Value |
| --- | --- |
| Appears At |  |
| Trigger Steps |  |
| Visible Message Or Error Code |  |
| Request Or Network Symptom | N/A |
| Page Information Still Visible |  |

## Follow-Up

| Field | Value |
| --- | --- |
| Static Evidence Direction |  |
| Mirax AI Replacement Recommendation |  |
| Related Function Card |  |
```

- [x] **Step 3: Create static analysis template**

Create `docs/reverse-engineering/templates/static-analysis-template.md` with:

```md
# Static Analysis Template

Copy this file into `docs/reverse-engineering/static-analysis/` and rename it using a stable analysis ID, for example `SA-PRELOAD-API.md`.

## Identity

| Field | Value |
| --- | --- |
| Analysis ID |  |
| Analysis Object |  |
| Source Path Or Location |  |
| Analysis Method |  |

## Evidence

| Field | Value |
| --- | --- |
| Evidence IDs |  |
| Highest Evidence Level | E3 |
| Confidence | medium |

## Findings

| Finding Type | Name Or Path | Details |
| --- | --- | --- |
| Module |  |  |
| API |  |  |
| Field |  |  |
| Resource |  |  |
| Config |  |  |

## Related Records

| Record Type | Path Or ID |
| --- | --- |
| Page Inspection |  |
| Function Card |  |
| Runtime Blocker |  |

## Evidence Impact

| Field | Value |
| --- | --- |
| Can Strengthen Evidence Level |  |
| Remaining Uncertainty |  |
| Mirax AI Design Impact |  |
```

- [x] **Step 4: Verify blocker and static templates**

Run:

```bash
rg -n "RB-000|Blocker Types|Blockers are not bypass tasks" docs/reverse-engineering/runtime-blockers.md
rg -n "Blocker ID|Visible Message Or Error Code|Mirax AI Replacement Recommendation" docs/reverse-engineering/templates/runtime-blocker-template.md
rg -n "Analysis ID|Findings|Evidence Impact|Mirax AI Design Impact" docs/reverse-engineering/templates/static-analysis-template.md
```

Expected: all field names are found.

- [x] **Step 5: Commit blocker and static templates**

```bash
git add docs/reverse-engineering/runtime-blockers.md docs/reverse-engineering/templates/runtime-blocker-template.md docs/reverse-engineering/templates/static-analysis-template.md
git commit -m "docs: add blocker and static analysis templates"
```

---

### Task 6: Update Project State For Stage 1 Handoff

**Files:**
- Modify: `docs/superpowers/PROJECT-STATE.md`

- [x] **Step 1: Update current task and next action**

Modify the `Latest Executable Task` section in `docs/superpowers/PROJECT-STATE.md` to:

```md
## Latest Executable Task

Finish Stage 0 validation in `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`, then create the Stage 1 runtime inspection plan with `superpowers:writing-plans`.

Do not inspect the old app until the Stage 1 plan exists. Do not update `docs/reverse-engineering/legacy-ui-gap-list.md` status during Stage 0.
```

Modify the `Next Action` section to:

```md
## Next Action

Run the Stage 0 validation commands from `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`.

After Stage 0 is committed and reviewed, invoke `superpowers:writing-plans` again to create Stage 1: 旧版运行态全量巡检 implementation plan.
```

- [x] **Step 2: Verify handoff wording**

Run:

```bash
rg -n "Stage 1 runtime inspection plan|Do not inspect the old app until the Stage 1 plan exists|旧版运行态全量巡检" docs/superpowers/PROJECT-STATE.md
```

Expected: all handoff phrases are found.

- [x] **Step 3: Commit stage handoff update**

```bash
git add docs/superpowers/PROJECT-STATE.md
git commit -m "docs: point project state to stage 1 planning"
```

---

### Task 7: Final Validation And Stage 0 Completion

**Files:**
- Verify only.

- [x] **Step 1: Run file existence checks**

Run:

```bash
test -f docs/superpowers/PROJECT-STATE.md
test -f docs/reverse-engineering/evidence-index.md
test -f docs/reverse-engineering/assets-index.md
test -f docs/reverse-engineering/runtime-blockers.md
test -f docs/reverse-engineering/templates/function-card-template.md
test -f docs/reverse-engineering/templates/page-inspection-template.md
test -f docs/reverse-engineering/templates/runtime-blocker-template.md
test -f docs/reverse-engineering/templates/static-analysis-template.md
test -f docs/reverse-engineering/function-cards/.gitkeep
test -f docs/reverse-engineering/pages/.gitkeep
test -f docs/reverse-engineering/static-analysis/.gitkeep
test -f docs/reverse-engineering/assets/screenshots/.gitkeep
```

Expected: every command exits 0.

- [x] **Step 2: Run evidence and handoff checks**

Run:

```bash
rg -n "EV-DOC-001|EV-DOC-002|EV-DOC-003|EV-DOC-004" docs/reverse-engineering/evidence-index.md
rg -n "ASSET-DOC-001|ASSET-DOC-002|ASSET-DOC-003|ASSET-DOC-004" docs/reverse-engineering/assets-index.md
rg -n "Current Automatic Dispatch Entry|Stage 0|Stage 1 runtime inspection plan|旧版运行态全量巡检" docs/superpowers/PROJECT-STATE.md
```

Expected: all IDs and handoff phrases are found.

- [x] **Step 3: Run unfinished-marker scan**

Run:

```bash
rg -n "(TO""DO)|(TB""D)|待""定" docs/superpowers/PROJECT-STATE.md docs/reverse-engineering docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md
```

Expected: no output.

- [x] **Step 4: Confirm gap list was not updated**

Run:

```bash
git diff -- docs/reverse-engineering/legacy-ui-gap-list.md
```

Expected: no output.

- [x] **Step 5: Inspect working tree**

Run:

```bash
git status --short
```

Expected: no uncommitted Stage 0 docs remain. Existing unrelated user changes may still appear; do not revert or stage them.

- [x] **Step 6: Report Stage 0 completion**

In the final report, include:

```text
Stage 0 inventory tools are complete.
Next required planning step: create Stage 1 old-app runtime inspection plan with superpowers:writing-plans.
```

Do not claim old-app runtime inspection has started.
