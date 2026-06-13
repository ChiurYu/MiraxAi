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
