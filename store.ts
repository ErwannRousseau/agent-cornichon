import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";
import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import type { Operation } from "./game.ts";

const string = { type: Schema.types.string } as const;

export const operations = DefineDatastore({
  name: "operations",
  primary_key: "id",
  attributes: {
    id: string,
    channel: string,
    status: string,
    operation: string,
  },
});

export const reports = DefineDatastore({
  name: "reports",
  primary_key: "id",
  attributes: { id: string, user: string, result: string },
});

export function checked<T extends { ok: boolean; error?: string }>(
  result: T,
): T {
  if (!result.ok) throw new Error(result.error ?? "Slack API error");
  return result;
}

export async function getOperation(client: SlackAPIClient, id: string) {
  const { item } = checked(
    await client.apps.datastore.get<typeof operations.definition>({
      datastore: operations.name,
      id,
    }),
  );
  return item?.operation ? JSON.parse(item.operation) as Operation : undefined;
}

export async function saveOperation(
  client: SlackAPIClient,
  operation: Operation,
) {
  checked(
    await client.apps.datastore.put<typeof operations.definition>({
      datastore: operations.name,
      item: {
        id: operation.id,
        channel: operation.channel,
        status: operation.status,
        operation: JSON.stringify(operation),
      },
    }),
  );
}

export async function blockedAgents(client: SlackAPIClient, channel: string) {
  const blocked = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = checked(
      await client.apps.datastore.query<typeof operations.definition>({
        datastore: operations.name,
        expression: "#channel = :channel AND #status = :status",
        expression_attributes: { "#channel": "channel", "#status": "status" },
        expression_values: { ":channel": channel, ":status": "active" },
        cursor,
      }),
    );
    for (const item of page.items ?? []) {
      if (item.operation) {
        const operation = JSON.parse(item.operation) as Operation;
        for (const agent of operation.players) blocked.add(agent);
      }
    }
    cursor = page.next_cursor;
  } while (cursor);
  return blocked;
}

export async function getReport(client: SlackAPIClient, id: string) {
  const { item } = checked(
    await client.apps.datastore.get<typeof reports.definition>({
      datastore: reports.name,
      id,
    }),
  );
  return item?.result;
}

export async function saveReport(
  client: SlackAPIClient,
  id: string,
  user: string,
  result: string,
) {
  checked(
    await client.apps.datastore.put<typeof reports.definition>({
      datastore: reports.name,
      item: { id, user, result },
    }),
  );
}

export async function scoreFor(client: SlackAPIClient, user: string) {
  let successes = 0;
  let cursor: string | undefined;
  do {
    const page = checked(
      await client.apps.datastore.query<typeof reports.definition>({
        datastore: reports.name,
        expression: "#user = :user AND #result = :result",
        expression_attributes: { "#user": "user", "#result": "result" },
        expression_values: { ":user": user, ":result": "success" },
        cursor,
      }),
    );
    successes += page.items?.length ?? 0;
    cursor = page.next_cursor;
  } while (cursor);
  return successes * 30;
}
