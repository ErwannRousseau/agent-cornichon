# Host the pilot on Slack infrastructure

The pilot runs on Slack infrastructure using the Deno SDK. Players access the
game from the pinned button or the **Cornichon** shortcut in Slack’s `/` menu.

All pilot game data stays in Slack Datastore. The public API documentation
describes no conditional write. The pilot accepts the residual risk.

When starting an operation, the app reads its current state and checks agent
eligibility before assigning missions. When an agent submits a report, the app
checks for an existing result, stores the result under the mission key, and
replaces the DM buttons with a confirmation. The score comes from stored
reports, at 30 pickles per successful mission.

These checks catch repeat clicks after the write completes. Two actions that
read the same state before writing can still assign different words to the same
agent or overwrite the first result. Revisit the storage decision if the pilot
sees a collision.

## Concurrency test results

On November 18, 2026, a probe in `agent-cornichon-dev` simulated two
simultaneous Slack actions by having both attempts read the same empty key
before writing.

| Scenario                                          | Writes accepted | Final value   |
| ------------------------------------------------- | --------------- | ------------- |
| Two mission starts for the same agent and channel | 2 of 2          | `operation-b` |
| Two conflicting reports for the same mission      | 2 of 2          | `failure`     |

In both scenarios, the later write replaced the earlier one. The probe deleted
both test keys after the run.
