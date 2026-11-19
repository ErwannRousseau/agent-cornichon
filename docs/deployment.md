# Deploy Agent Cornichon

Install Deno 2.9.6 and the Slack CLI, then run `slack login`. For an existing
installation, use the **App ID** and **Team ID** from the deployed app's row in
`slack app list`. For a first deploy, use `deployed` in place of `APP_ID`. On
Enterprise Grid, add `--org-workspace-grant WORKSPACE_ID` to the first deploy
and trigger creation to target one workspace.

```sh
slack deploy --app APP_ID --team TEAM_ID --manifest-source local --hide-triggers
```

After the first deploy, use the new app ID to create the **Cornichon** shortcut.
Add Agent Cornichon to the pilot channel and share the generated link there.

```sh
slack trigger create --app APP_ID --team TEAM_ID --trigger-def triggers/cornichon.ts
```

If the trigger changes, use `slack trigger update` with the same flags and
`--trigger-id TRIGGER_ID`. To roll back, redeploy the last known good commit to
the same app and restore the earlier trigger if needed. Check Datastore schema
compatibility before rolling back a schema change.

## Give everyone in the workspace access

List the triggers for the deployed app and copy the **Trigger ID** for
**Cornichon**.

```sh
slack trigger list --app APP_ID --team TEAM_ID
slack trigger access --app APP_ID --team TEAM_ID --trigger-id TRIGGER_ID --everyone
```

Ask a colleague to open Slack's `/` menu and select **Cornichon** to confirm
they can open the QG.

## Smoke test

Test in the sandbox before updating the private installation. Play one round
with two accounts. Check that the menu is private, the invitation appears in the
channel, each agent receives a different word by DM, and a success and a failure
increase scores by 30 and 0. Then verify that a solo round from your self-DM
opens in the app DM.

If the workflow fails, check channel membership and run
`slack activity --app APP_ID --team TEAM_ID --limit 30`. A failed mission DM
leaves the round active and the agent who started it receives a private notice.

## Game data and deletion

The pilot lead confirms the agent's Slack ID and closes affected recruiting or
active rounds. In the `operations` Datastore, remove their ID from `players`,
`words`, and `organizer` in the `operation` JSON, preserving other players' data
and the outer fields. Delete their `reports` records and verify the deletion.
Existing messages and DMs follow Slack's retention settings.
