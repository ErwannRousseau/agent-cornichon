<img src="assets/icon.png" alt="Agent Cornichon wearing spy sunglasses" width="112" align="right">

# Agent Cornichon 🥒

**Your secret word is _brouette_ (wheelbarrow). Slip it into your next
meeting.**

Agent Cornichon turns a team meeting into an undercover mission. Pickle HQ sends
you a secret word in Slack. Work it into the conversation to earn **30
pickles**.

[Play a round](#play-a-round) · [Deploy to the sandbox](#deploy-to-the-sandbox)
· [Pilot rules](docs/pilot-rules.md)

## Play a round

1. Open the **Cornichon** shortcut from Slack’s `/` menu and click **Ouvrir les
   inscriptions**. You can also use the pinned button if your channel has one.
2. Click **Rejoindre**, then **Démarrer la partie**. To play solo, start from
   your self-DM. Pickle HQ opens the DM with Agent Cornichon.
3. Read your secret word in your DM and work it into the conversation. Each
   agent gets a different word from the [150-word list](dictionary.ts).
4. After the meeting, click **Terminer l’opération** and report your result in
   your DM. Your first answer is final. Check your total under **Mon score**.

## Deploy to the sandbox

This command updates the app already installed in **`agent-cornichon-dev`**. You
need Node.js with `npx` and the Slack CLI. Use `slack login` to sign in and
`slack auth list` to check your account.

Run this from the repository root. `npx` makes Deno available to the Slack CLI
during deployment.

```sh
npx --yes --package deno -c 'slack deploy --app A0CJV0SU46A --team E0CJWHE6D1Q --manifest-source local --hide-triggers'
```

When the CLI prints `Agent Cornichon deployed`, open the **Cornichon** shortcut
and start a new solo round to check that your word arrives in your DM.

<details>
<summary>First installation in another sandbox</summary>

With Deno and the Slack CLI available in your terminal, replace the placeholders
with your target IDs. The deployment output shows the app ID.

```sh
slack deploy --team "<id-sandbox>" --org-workspace-grant "<id-workspace>" --app deployed --hide-triggers
slack trigger create --team "<id-sandbox>" --org-workspace-grant "<id-workspace>" --app "<id-app>" --trigger-def triggers/cornichon.ts
```

Post the trigger link in the pilot channel and pin the message containing the
workflow button.

</details>

## Customize Pickle HQ

In Slack’s emoji picker, click **Add Emoji**. Upload the PNGs from the
[Agent Cornichon sticker pack](assets/emoji/) using the filenames without
`.png`.

The bot uses these seven custom emoji when available and standard Slack emoji
otherwise.

- `cornichon-agent` and `cornichon-lancement`
- `cornichon-mission` and `cornichon-rapport`
- `cornichon-reussite` and `cornichon-echec`
- `cornichon-score`

## Test and maintain the pilot

**Local tests.** Run the game and integration tests from the repository root.

```sh
deno test
```

**Two-player Slack test.** Join a round from two accounts and verify that each
account receives a different word, visible only in its DM. After the round,
report success on one account and failure on the other. For accounts with no
previous rounds, **Mon score** should show 30 and 0 respectively.

<details>
<summary>Test with the sandbox Datastore</summary>

The test uses the real Datastore and simulates Slack messages. It deletes its
test records when it finishes. Supply the test sandbox and app IDs.

```sh
CORNICHON_TEST_TEAM="<id-sandbox>" CORNICHON_TEST_APP="<id-app>" \
  deno test --allow-run=slack --allow-env=CORNICHON_TEST_TEAM,CORNICHON_TEST_APP integration.test.ts
```

</details>

<details>
<summary>Delete an agent’s game data</summary>

The pilot lead finds the agent’s Slack ID and first cancels any open operation
the agent organized. In the Datastore, delete their entries from `reports`,
remove their ID from `players`, and remove their entry from `words` in the
affected operations. Clear their ID wherever it appears as `organizer`. DMs and
channel messages follow the Slack workspace’s retention settings.

</details>

The pilot runs on Slack infrastructure. The app’s Datastore holds operations and
reports. [Pilot rules](docs/pilot-rules.md)
