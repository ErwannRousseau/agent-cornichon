import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  createOperation,
  gameActionIds,
  handleGameAction,
} from "../interaction.ts";
import { sendPrivateMenu, sendPrivateReply } from "../private-messages.ts";
import { scoreFor } from "../reports.ts";
import { stickers } from "../stickers.ts";

export const EntryFunction = DefineFunction({
  callback_id: "cornichon_entry",
  title: "Ouvrir le QG du Bocal",
  description: "Affiche le menu du jeu Agent Cornichon.",
  source_file: "functions/entry.ts",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["channel_id", "user_id", "interactivity"],
  },
  output_parameters: { properties: {}, required: [] },
});

const gameAndMenuActionIds = [
  ...gameActionIds,
  "cornichon_open",
  "cornichon_score",
];

export default SlackFunction(EntryFunction, async ({ inputs, client }) => {
  const sticker = await stickers(client);
  const message = {
    text: "Bienvenue au QG du Bocal.",
    blocks: [{
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `*${
          sticker("agent", "🥒")
        } BIENVENUE AU QG DU BOCAL*\nAgent, ta présence a été signalée.`,
      },
    }, {
      type: "actions" as const,
      elements: [{
        type: "button" as const,
        action_id: "cornichon_open",
        text: {
          type: "plain_text" as const,
          text: `${sticker("lancement", "🚀")} Ouvrir les inscriptions`,
        },
        style: "primary" as const,
      }, {
        type: "button" as const,
        action_id: "cornichon_score",
        text: {
          type: "plain_text" as const,
          text: `${sticker("score", "🥒")} Mon score`,
        },
      }],
    }],
  };
  await sendPrivateMenu(client, inputs.channel_id, inputs.user_id, message);
  return { completed: false };
})
  .addBlockActionsHandler(gameAndMenuActionIds, async (ctx) => {
    if (ctx.action.action_id === "cornichon_open") {
      const channel = ctx.body.channel?.id;
      if (!channel) {
        throw new Error("Canal Slack manquant pour ouvrir les inscriptions.");
      }
      await createOperation(ctx.client, channel, ctx.body.user.id);
      return;
    }
    if (ctx.action.action_id === "cornichon_score") {
      const channel = ctx.body.channel?.id;
      const user = ctx.body.user?.id;
      if (!channel || !user) return;
      const score = await scoreFor(ctx.client, user);
      const sticker = await stickers(ctx.client);
      const text = `Ton score est de ${score} cornichons ${
        sticker("score", "🥒")
      }.`;
      await sendPrivateReply(ctx.client, channel, user, { text });
      return;
    }
    await handleGameAction(ctx);
  });
