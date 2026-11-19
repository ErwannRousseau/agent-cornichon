import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { checked } from "./store.ts";

type Message =
  & Pick<
    Parameters<SlackAPIClient["chat"]["postMessage"]>[0],
    "text" | "blocks"
  >
  & { text: string };

export async function sendPrivateMenu(
  client: SlackAPIClient,
  channel: string,
  user: string,
  message: Message,
) {
  if (/^[DUW]/.test(channel)) {
    return await sendDirectMessage(client, user, message);
  }
  await sendEphemeralMessage(client, channel, user, message);
}

export async function sendPrivateReply(
  client: SlackAPIClient,
  channel: string,
  user: string,
  message: Message,
) {
  if (channel.startsWith("D")) {
    checked(await client.chat.postMessage({ ...message, channel }));
    return;
  }
  await sendEphemeralMessage(client, channel, user, message);
}

export async function sendDirectMessage(
  client: SlackAPIClient,
  user: string,
  message: Message,
) {
  const { channel } = checked(await client.conversations.open({ users: user }));
  if (!channel?.id) throw new Error("Slack DM channel missing");
  return checked(
    await client.chat.postMessage({ ...message, channel: channel.id }),
  );
}

export async function sendEphemeralMessage(
  client: SlackAPIClient,
  channel: string,
  user: string,
  message: Message,
) {
  checked(await client.chat.postEphemeral({ ...message, channel, user }));
}
