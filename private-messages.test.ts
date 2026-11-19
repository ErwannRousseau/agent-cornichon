import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import {
  sendDirectMessage,
  sendPrivateMenu,
  sendPrivateReply,
} from "./private-messages.ts";

function fakeSlack(dm: string | null = "D-BOT") {
  const calls: unknown[] = [];
  const client = {
    conversations: {
      open({ users }: { users: string }) {
        calls.push({ openFor: users });
        return { ok: true, channel: dm ? { id: dm } : {} };
      },
    },
    chat: {
      postMessage(message: unknown) {
        calls.push({ message });
        return { ok: true };
      },
      postEphemeral(message: unknown) {
        calls.push({ ephemeral: message });
        return { ok: true };
      },
    },
  } as unknown as SlackAPIClient;
  return { client, calls };
}

function assertCalls(actual: unknown[], expected: unknown[]) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

Deno.test("Channel menus and scores are visible only to the requesting agent", async () => {
  const { client, calls } = fakeSlack();
  await sendPrivateMenu(client, "C-TEAM", "U-ALICE", { text: "menu" });
  await sendPrivateReply(client, "C-TEAM", "U-BOB", { text: "score" });
  assertCalls(calls, [
    { ephemeral: { text: "menu", channel: "C-TEAM", user: "U-ALICE" } },
    { ephemeral: { text: "score", channel: "C-TEAM", user: "U-BOB" } },
  ]);
});

Deno.test("The shortcut in a DM opens the bot DM and the score stays there", async () => {
  const { client, calls } = fakeSlack();
  for (const source of ["D-SELF", "U-ALICE", "W-ALICE"]) {
    await sendPrivateMenu(client, source, "U-ALICE", { text: "menu" });
  }
  await sendPrivateReply(client, "D-BOT", "U-ALICE", { text: "score" });
  const menuCalls = [
    { openFor: "U-ALICE" },
    { message: { text: "menu", channel: "D-BOT" } },
  ];
  assertCalls(calls, [
    ...menuCalls,
    ...menuCalls,
    ...menuCalls,
    { message: { text: "score", channel: "D-BOT" } },
  ]);
});

Deno.test("Direct delivery fails when Slack returns no DM channel", async () => {
  const { client, calls } = fakeSlack(null);
  let error: unknown;
  try {
    await sendDirectMessage(client, "U-BOB", { text: "mission" });
  } catch (caught) {
    error = caught;
  }
  if (
    !(error instanceof Error) || error.message !== "Slack DM channel missing"
  ) {
    throw new Error("Expected a missing DM channel error");
  }
  assertCalls(calls, [{ openFor: "U-BOB" }]);
});
