import { words } from "./dictionary.ts";

export type Operation = {
  id: string;
  channel: string;
  organizer: string;
  status: "recruiting" | "active" | "finished" | "cancelled";
  players: string[];
  words: Record<string, string>;
  invitationTs?: string;
};

export type Action = "join" | "leave" | "start" | "finish" | "cancel";

function fail(message: string): never {
  throw new Error(message);
}

export function transition(
  operation: Operation,
  user: string,
  action: Action,
  blocked: Set<string>,
): Operation {
  if (action === "join") {
    if (operation.status !== "recruiting") {
      fail("Les inscriptions sont fermées.");
    }
    if (blocked.has(user)) {
      fail("Tu as déjà une mission en cours dans ce canal.");
    }
    if (operation.players.includes(user)) return operation;
    if (operation.players.length >= 20) fail("L’opération est complète.");
    return { ...operation, players: [...operation.players, user] };
  }

  if (action === "leave") {
    if (operation.status !== "recruiting") {
      fail("Tu ne peux plus quitter cette opération.");
    }
    return {
      ...operation,
      players: operation.players.filter((player) => player !== user),
    };
  }

  if (action === "start") {
    if (operation.status !== "recruiting") {
      fail("Cette opération ne peut pas être lancée.");
    }
    if (operation.organizer !== user && !operation.players.includes(user)) {
      fail("Seul l’organisateur ou un agent inscrit peut lancer l’opération.");
    }
    const players = operation.players.filter((player) => !blocked.has(player));
    if (players.length === 0) {
      fail("Il faut au moins un agent disponible pour lancer l’opération.");
    }
    if (players.length > words.length) {
      fail("Le dictionnaire ne contient pas assez de mots distincts.");
    }
    const shuffled = [...words];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    return {
      ...operation,
      status: "active",
      players,
      words: Object.fromEntries(
        players.map((player, index) => [player, shuffled[index]]),
      ),
    };
  }

  if (action === "finish") {
    if (operation.status !== "active") {
      fail("Cette opération n’est pas en cours.");
    }
    if (user !== operation.organizer && !operation.players.includes(user)) {
      fail(
        "Seul l’organisateur ou un agent inscrit peut terminer l’opération.",
      );
    }
    return { ...operation, status: "finished" };
  }

  if (operation.status === "finished" || operation.status === "cancelled") {
    fail("Cette opération est déjà terminée.");
  }
  if (operation.organizer !== user) {
    fail("Seul l’organisateur peut annuler l’opération.");
  }
  return { ...operation, status: "cancelled" };
}
