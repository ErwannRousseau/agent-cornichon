import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { EntryFunction } from "../functions/entry.ts";

const EntryWorkflow = DefineWorkflow({
  callback_id: "cornichon_entry_workflow",
  title: "Ouvrir le QG du Bocal",
  description: "Affiche le menu personnel Agent Cornichon.",
  input_parameters: {
    properties: {
      channel_id: { type: Schema.slack.types.channel_id },
      user_id: { type: Schema.slack.types.user_id },
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["channel_id", "user_id", "interactivity"],
  },
});

EntryWorkflow.addStep(EntryFunction, {
  channel_id: EntryWorkflow.inputs.channel_id,
  user_id: EntryWorkflow.inputs.user_id,
  interactivity: EntryWorkflow.inputs.interactivity,
});

export default EntryWorkflow;
