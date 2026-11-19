import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { type Action, type Operation, transition } from "./game.ts";
import { blockedAgents, getOperation, saveOperation } from "./store.ts";

export async function openOperation(
  client: SlackAPIClient,
  channel: string,
  organizer: string,
): Promise<Operation> {
  const operation: Operation = {
    id: crypto.randomUUID(),
    channel,
    organizer,
    status: "recruiting",
    players: [],
    words: {},
  };
  await saveOperation(client, operation);
  return operation;
}

export async function updateOperation(
  client: SlackAPIClient,
  id: string,
  channel: string,
  agent: string,
  action: Action,
): Promise<Operation | { notice: string } | undefined> {
  const operation = await getOperation(client, id);
  if (!operation) return { notice: "Le QG ne retrouve plus cette opération." };
  if (operation.channel !== channel) return;

  const blocked = action === "join" || action === "start"
    ? await blockedAgents(client, channel)
    : new Set<string>();

  let updated: Operation;
  try {
    updated = transition(operation, agent, action, blocked);
  } catch (error) {
    return {
      notice: error instanceof Error ? error.message : "Action indisponible.",
    };
  }

  if (updated === operation) return;
  await saveOperation(client, updated);
  return updated;
}
