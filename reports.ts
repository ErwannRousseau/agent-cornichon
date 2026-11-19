import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import {
  countSuccessfulReports,
  getOperation,
  getReport,
  saveReport,
} from "./store.ts";

const picklesPerSuccess = 30;

export async function submitReport(
  client: SlackAPIClient,
  operationId: string,
  agent: string,
  intent: "success" | "failure",
): Promise<{ notice: string } | { result: string; pickles: number }> {
  const operation = await getOperation(client, operationId);
  if (!operation) {
    return { notice: "Le QG ne retrouve plus cette opération." } as const;
  }
  if (operation.status !== "finished" || !operation.players.includes(agent)) {
    return { notice: "Ce rapport n’est pas disponible pour toi." } as const;
  }

  const id = `${operation.id}:${agent}`;
  // shortcut: concurrent writes can overwrite the result, revisit if the pilot observes a collision (ADR 0002).
  const existing = await getReport(client, id);
  const result = existing ?? intent;
  if (!existing) await saveReport(client, id, agent, result);
  return { result, pickles: result === "success" ? picklesPerSuccess : 0 };
}

export async function scoreFor(client: SlackAPIClient, agent: string) {
  return (await countSuccessfulReports(client, agent)) * picklesPerSuccess;
}
