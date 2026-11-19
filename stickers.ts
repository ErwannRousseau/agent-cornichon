import type { SlackAPIClient } from "deno-slack-sdk/types.ts";

export async function stickers(client: SlackAPIClient) {
  const { emoji } = await client.emoji.list();
  return (name: string, standard: string) => {
    const shortcut = `cornichon-${name}`;
    return emoji?.[shortcut] ? `:${shortcut}:` : standard;
  };
}
