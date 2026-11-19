import type { SlackAPIClient } from "deno-slack-sdk/types.ts";
import type { Operation } from "./game.ts";
import { openOperation, updateOperation } from "./operations.ts";
import { stickers } from "./stickers.ts";
import { sendDirectMessage, sendEphemeralMessage } from "./private-messages.ts";
import { submitReport } from "./reports.ts";
import { checked } from "./store.ts";

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
  const operation = await openOperation(client, channel, user);
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
    if (intent === "success" || intent === "failure") {
      const report = await submitReport(client, action.value, user, intent);
      if ("notice" in report) {
        await notify(client, channel, user, report.notice);
        return;
      }
      const sticker = await stickers(client);
      const text = report.result === "success"
        ? `${
          sticker("reussite", "🥒")
        } Mission accomplie. Le QG te crédite de ${report.pickles} cornichons.`
        : `${
          sticker("echec", "📁")
        } Échec consigné dans les archives du vinaigre.`;
      checked(await client.chat.update({ channel, ts, text, blocks: [] }));
      return;
    }

    const updated = await updateOperation(
      client,
      action.value,
      channel,
      user,
      intent,
    );
    if (!updated) return;
    if ("notice" in updated) {
      await notify(client, channel, user, updated.notice);
      return;
    }

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
        updated.id,
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

function sendDM(
  client: SlackAPIClient,
  operation: Operation,
  user: string,
  intent: "start" | "finish",
  sticker: Sticker,
) {
  const text = intent === "start"
    ? `${sticker("mission", "🕵️")} ${operationTitle} · Ton mot secret est « ${
      operation.words[user]
    } ». Place-le naturellement pendant la réunion.`
    : `${
      sticker("rapport", "📡")
    } ${operationTitle} · Le QG attend ton rapport. As-tu placé ton mot ?`;
  return sendDirectMessage(client, user, {
    text,
    ...(intent === "finish" && {
      blocks: [
        { type: "section", text: { type: "mrkdwn", text } },
        buttons(operation.id, ["success", "failure"]),
      ],
    }),
  });
}

async function notify(
  client: SlackAPIClient,
  channel: string,
  user: string,
  text: string,
) {
  await sendEphemeralMessage(client, channel, user, { text });
}
