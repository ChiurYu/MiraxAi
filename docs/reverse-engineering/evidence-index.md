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
