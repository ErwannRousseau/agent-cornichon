import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import { type Action, type Operation, transition } from "./game.ts";
import { stickers } from "./stickers.ts";
import {
  blockedAgents,
  checked,
  getOperation,
  getReport,
  saveOperation,
  saveReport,
} from "./store.ts";

const operationTitle = "Opération Cornichon";

const labels = {
  join: "Rejoindre",
  leave: "Quitter",
  start: "Démarrer la partie",
  finish: "Terminer l’opération",
  cancel: "Annuler",
  success: "Mission accomplie",
  failure: "J’ai échoué",
};

type GameAction = keyof typeof labels;

export const gameActionIds = Object.keys(labels).map((action) =>
  `cornichon_${action}`
);

export async function createOperation(
  client: SlackAPIClient,
  channel: string,
  user: string,
) {
  const operation: Operation = {
    id: crypto.randomUUID(),
    channel,
    organizer: user,
    status: "recruiting",
    players: [],
    words: {},
  };
  await saveOperation(client, operation);
  checked(
    await client.chat.postMessage({
      channel,
      ...invitation(operation, await stickers(client)),
      unfurl_links: false,
      unfurl_media: false,
    }),
  );
}

type ActionContext = {
  client: SlackAPIClient;
  action: { action_id: string; value?: string };
  body: {
    user: { id: string };
    channel?: { id: string };
    message?: { ts: string };
  };
};

export async function handleGameAction(
  { client, action, body }: ActionContext,
) {
  const user = body.user.id;
  const channel = body.channel?.id;
  const ts = body.message?.ts;
  const intent = action.action_id.slice("cornichon_".length) as GameAction;
  if (!action.value || !channel || !ts) return;

  try {
    const operation = await getOperation(client, action.value);
    if (!operation) {
      await notify(
        client,
        channel,
        user,
        "Le QG ne retrouve plus cette opération.",
      );
      return;
    }

    if (intent === "success" || intent === "failure") {
      if (
        operation.status !== "finished" || !operation.players.includes(user)
      ) {
        await notify(
          client,
          channel,
          user,
          "Ce rapport n’est pas disponible pour toi.",
        );
        return;
      }
      const id = `${operation.id}:${user}`;
      const existing = await getReport(client, id);
      const result = existing ?? intent;
      if (!existing) await saveReport(client, id, user, result);
      const sticker = await stickers(client);
      const text = result === "success"
        ? `${
          sticker("reussite", "🥒")
        } Mission accomplie. Le QG te crédite de 30 cornichons.`
        : `${
          sticker("echec", "📁")
        } Échec consigné dans les archives du vinaigre.`;
      checked(await client.chat.update({ channel, ts, text, blocks: [] }));
      return;
    }

    if (channel !== operation.channel) return;
    const blocked = intent === "join" || intent === "start"
      ? await blockedAgents(client, channel)
      : new Set<string>();

    let updated: Operation;
    try {
      updated = transition(operation, user, intent as Action, blocked);
    } catch (error) {
      await notify(
        client,
        channel,
        user,
        error instanceof Error ? error.message : "Action indisponible.",
      );
      return;
    }

    if (updated === operation) return;
    await saveOperation(client, updated);

    const sticker = await stickers(client);
    const effects = [
      client.chat.update({ channel, ts, ...invitation(updated, sticker) }).then(
        checked,
      ),
    ];
    if (intent === "start" || intent === "finish") {
      for (const player of updated.players) {
        effects.push(sendDM(client, updated, player, intent, sticker));
      }
    }
    const results = await Promise.allSettled(effects);
    if (results.some((result) => result.status === "rejected")) {
      console.error(
        "Slack delivery incomplete",
        operation.id,
        results.filter((result) => result.status === "rejected").length,
      );
      await notify(
        client,
        channel,
        user,
        "L’action est enregistrée. Le QG n’a pas pu transmettre tous les messages.",
      );
    }
  } catch (error) {
    console.error(
      "Cornichon action failed",
      intent,
      error instanceof Error ? error.message : "unknown",
    );
    await notify(
      client,
      channel,
      user,
      "Incident au QG. Vérifie l’état de l’opération avant de réessayer.",
    );
  }
}

function buttons(id: string, actions: GameAction[]) {
  return {
    type: "actions" as const,
    elements: actions.map((action) => ({
      type: "button" as const,
      action_id: `cornichon_${action}`,
      text: { type: "plain_text" as const, text: labels[action] },
      value: id,
    })),
  };
}

type Sticker = Awaited<ReturnType<typeof stickers>>;

function invitation(operation: Operation, sticker: Sticker) {
  const statuses = {
    recruiting: `${operation.players.length}/20 agents inscrits`,
    active: `Opération en cours · ${operation.players.length} agents`,
    finished: "Opération terminée · rapports en privé",
    cancelled: "Opération annulée",
  };
  const icon = operation.status === "active"
    ? sticker("lancement", "🥒")
    : sticker("agent", "🥒");
  const text = `${icon} ${statuses[operation.status]}`;
  const blocks = [
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `${icon} ${operationTitle} — ${statuses[operation.status]}`,
      },
    },
  ];
  if (operation.status === "recruiting") {
    return {
      text,
      blocks: [
        ...blocks,
        buttons(operation.id, ["join", "leave", "start", "cancel"]),
      ],
    };
  }
  if (operation.status === "active") {
    return {
      text,
      blocks: [...blocks, buttons(operation.id, ["finish", "cancel"])],
    };
  }
  return { text, blocks };
}

async function sendDM(
  client: SlackAPIClient,
  operation: Operation,
  user: string,
  intent: "start" | "finish",
  sticker: Sticker,
) {
  const { channel } = checked(await client.conversations.open({ users: user }));
  if (!channel?.id) throw new Error("Slack DM channel missing");
  const text = intent === "start"
    ? `${sticker("mission", "🕵️")} ${operationTitle} · Ton mot secret est « ${
      operation.words[user]
    } ». Place-le naturellement pendant la réunion.`
    : `${
      sticker("rapport", "📡")
    } ${operationTitle} · Le QG attend ton rapport. As-tu placé ton mot ?`;
  return checked(
    await client.chat.postMessage({
      channel: channel.id,
      text,
      ...(intent === "finish" && {
        blocks: [
          { type: "section", text: { type: "mrkdwn", text } },
          buttons(operation.id, ["success", "failure"]),
        ],
      }),
    }),
  );
}

async function notify(
  client: SlackAPIClient,
  channel: string,
  user: string,
  text: string,
) {
  checked(await client.chat.postEphemeral({ channel, user, text }));
}
