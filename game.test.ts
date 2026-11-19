import { type Operation, transition } from "./game.ts";
import { words } from "./dictionary.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rejects(action: () => unknown, text: string) {
  try {
    action();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(text),
      `Erreur attendue: ${text}`,
    );
    return;
  }
  throw new Error(`Une erreur était attendue: ${text}`);
}

function operation(): Operation {
  return {
    id: "op-1",
    channel: "C1",
    organizer: "U1",
    status: "recruiting",
    players: ["U1", "U2", "U3"],
    words: {},
  };
}

Deno.test("Starting keeps eligible agents and assigns distinct words", () => {
  const active = transition(operation(), "U1", "start", new Set(["U3"]));
  assert(active.status === "active", "L’opération doit démarrer.");
  assert(
    active.players.join(",") === "U1,U2",
    "L’agent bloqué doit être retiré.",
  );
  assert(Object.keys(active.words).length === 2, "Chaque agent reçoit un mot.");
  assert(
    new Set(Object.values(active.words)).size === 2,
    "Les mots doivent être distincts.",
  );
  assert(
    words.length === 150 && new Set(words).size === 150,
    "Le dictionnaire doit contenir 150 mots distincts.",
  );
});

Deno.test("An active mission blocks registration in the same channel", () => {
  rejects(
    () => transition(operation(), "U2", "join", new Set(["U2"])),
    "Tu as déjà une mission en cours",
  );
});

Deno.test("A registered agent can start a solo operation in a DM", () => {
  const solo = { ...operation(), channel: "D1", players: ["U2"] };
  const active = transition(solo, "U2", "start", new Set());
  assert(active.status === "active", "L’opération solo doit démarrer.");
  assert(
    Object.keys(active.words).join(",") === "U2",
    "L’agent reçoit un mot.",
  );
});

Deno.test("Starting requires an eligible agent and rejects outsiders", () => {
  rejects(
    () => transition(operation(), "U1", "start", new Set(["U1", "U2", "U3"])),
    "au moins un agent disponible",
  );
  rejects(
    () => transition(operation(), "U4", "start", new Set()),
    "l’organisateur ou un agent inscrit",
  );
});

Deno.test("Joining twice has no effect and leaving removes only that agent", () => {
  const current = operation();
  const repeated = transition(current, "U2", "join", new Set());
  assert(repeated === current, "La deuxième inscription est idempotente.");
  const left = transition(current, "U2", "leave", new Set());
  assert(left.players.join(",") === "U1,U3", "L’agent doit être retiré.");
});

Deno.test("A registered agent can finish the operation and open reporting", () => {
  const active = transition(operation(), "U1", "start", new Set());
  const finished = transition(active, "U2", "finish", new Set());
  assert(
    finished.status === "finished",
    "L’agent inscrit peut terminer l’opération.",
  );
  assert(
    Object.keys(finished.words).length === 3,
    "Les missions restent liées aux rapports.",
  );
});

Deno.test("Only the organizer can cancel the operation", () => {
  rejects(
    () => transition(operation(), "U2", "cancel", new Set()),
    "Seul l’organisateur",
  );
  assert(
    transition(operation(), "U1", "cancel", new Set()).status === "cancelled",
    "L’organisateur doit pouvoir annuler.",
  );
});
