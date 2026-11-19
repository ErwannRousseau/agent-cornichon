import { Trigger } from "deno-slack-sdk/types.ts";
import { TriggerContextData, TriggerTypes } from "deno-slack-api/mod.ts";
import EntryWorkflow from "../workflows/entry.ts";

const CornichonTrigger: Trigger<typeof EntryWorkflow.definition> = {
  type: TriggerTypes.Shortcut,
  name: "Cornichon",
  description: "Ouvrir le QG du Bocal",
  workflow: "#/workflows/cornichon_entry_workflow",
  inputs: {
    channel_id: { value: TriggerContextData.Shortcut.channel_id },
    user_id: { value: TriggerContextData.Shortcut.user_id },
    interactivity: { value: TriggerContextData.Shortcut.interactivity },
  },
};

export default CornichonTrigger;
