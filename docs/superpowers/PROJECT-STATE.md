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

Finish Stage 0 validation in `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`, then create the Stage 1 runtime inspection plan with `superpowers:writing-plans`.

Do not inspect the old app until the Stage 1 plan exists. Do not update `docs/reverse-engineering/legacy-ui-gap-list.md` status during Stage 0.

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

Run the Stage 0 validation commands from `docs/superpowers/plans/2026-06-13-stage-0-inventory-tools.md`.

After Stage 0 is committed and reviewed, invoke `superpowers:writing-plans` again to create Stage 1: 旧版运行态全量巡检 implementation plan.
