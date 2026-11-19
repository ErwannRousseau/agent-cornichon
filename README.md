<p align="center">
  <img src="assets/icon.png" alt="Agent Cornichon wearing spy sunglasses" width="128">
</p>

<h1 align="center">Agent Cornichon</h1>

<p align="center">
  Your secret word is <strong><em>brouette</em></strong> (wheelbarrow).<br>
  Slip it into your next meeting to earn <strong>pickles</strong>.
</p>

<p align="center">
  <a href="#play-a-round">Play a round</a> ·
  <a href="docs/deployment.md">Deploy and operate</a>
</p>

## Play a round

1. Open the **Cornichon** shortcut from Slack’s `/` menu and click **Ouvrir les
   inscriptions**. You can also open the pinned Cornichon workflow link if your
   channel has one.
2. Click **Rejoindre**, then **Démarrer la partie**. To play solo, start from
   your self-DM. Pickle HQ opens the DM with Agent Cornichon.
3. Read your secret word in your DM and work it into the conversation. Each
   agent gets a different word from the [150-word list](dictionary.ts).
4. After the meeting, click **Terminer l’opération** and report your result in
   your DM. A success earns **30 pickles**. Check your private total under **Mon
   score**.

- Add the app to the channel before playing. Invitations appear in the channel
  even when you open the shortcut from a thread. From a one-on-one DM, the
  invitation goes to your DM with Agent Cornichon.
- Play with 1 to 20 agents. The organizer or any registered agent can start or
  finish the round. You can leave before the round starts. The organizer can
  cancel it.
- You can have one active mission per channel. Once the round ends, you can play
  again and submit your previous report later. The first saved result stands in
  normal play. See the [Datastore decision](docs/adr/0002-slack-hosting.md) for
  simultaneous clicks.

## Deploy to the sandbox

Run `slack app list` and copy the **App ID** and **Team ID** from the
`agent-cornichon-dev` entry. Install the Slack CLI and Deno 2.9.6, with both
commands available on your `PATH`. Replace the placeholders and run this from
the repository root.

```sh
slack deploy --app APP_ID --team TEAM_ID --manifest-source local --hide-triggers
```

See the [deployment guide](docs/deployment.md) for private installations,
shortcut setup, and rollback.

## Customize Pickle HQ

In Slack’s emoji picker, click **Add Emoji**. Upload the seven PNGs listed below
from the [Agent Cornichon sticker pack](assets/emoji/) using the filenames
without `.png`.

The bot uses these seven custom emoji when available and standard Slack emoji
otherwise.

- `cornichon-agent` and `cornichon-lancement`
- `cornichon-mission` and `cornichon-rapport`
- `cornichon-reussite` and `cornichon-echec`
- `cornichon-score`

## Test and maintain the pilot

Run the same checks as GitHub Actions from the repository root with Deno 2.9.6.

```sh
deno fmt --check
deno lint
deno check --frozen manifest.ts triggers/cornichon.ts
deno test --frozen
```

Use the [Slack smoke test](docs/deployment.md#smoke-test) to verify delivery
with real accounts after deploying.

<details>
<summary>Test with the sandbox Datastore</summary>

The test uses the real Datastore and simulates Slack messages. It deletes its
test records when it finishes. Supply the test sandbox and app IDs.

```sh
CORNICHON_TEST_TEAM="<id-sandbox>" CORNICHON_TEST_APP="<id-app>" \
  deno test --allow-run=slack --allow-env=CORNICHON_TEST_TEAM,CORNICHON_TEST_APP integration.test.ts
```

</details>

The app stores game data in Slack. See
[game data and deletion](docs/deployment.md#game-data-and-deletion) for the
maintainer procedure.
