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
