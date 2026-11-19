import { Manifest } from "deno-slack-sdk/mod.ts";
import { operations, reports } from "./store.ts";
import EntryWorkflow from "./workflows/entry.ts";

export default Manifest({
  name: "Agent Cornichon",
  description: "Le jeu d’espionnage du QG du Bocal.",
  icon: "assets/icon.png",
  workflows: [EntryWorkflow],
  datastores: [operations, reports],
  botScopes: [
    "commands",
    "chat:write",
    "chat:write.public",
    "im:write",
    "emoji:read",
    "datastore:read",
    "datastore:write",
  ],
});
