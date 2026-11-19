import { createOperation, handleGameAction } from "./interaction.ts";
import { scoreFor } from "./store.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

function assertNotEquals(actual: unknown, unexpected: unknown) {
  if (actual === unexpected) {
    throw new Error(`Unexpected value ${String(actual)}`);
  }
}

async function slack(method: string, payload: Record<string, unknown>) {
  const team = Deno.env.get("CORNICHON_TEST_TEAM")!;
  const app = Deno.env.get("CORNICHON_TEST_APP")!;
  const args = [
    "datastore",
    method,
    JSON.stringify(payload),
    "--datastore",
    String(payload.datastore),
    "--team",
    team,
    "--app",
    app,
    "--no-color",
    "--skip-update",
  ];
  if (method === "get" || method === "query") args.push("--output", "json");
  const result = await new Deno.Command("slack", {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(result.stdout).trim();
  if (!result.success) {
    throw new Error(new TextDecoder().decode(result.stderr));
  }
  if (method === "get") {
    return { ok: true, item: stdout === "Not found" ? {} : JSON.parse(stdout) };
  }
  if (method === "query") return { ok: true, ...JSON.parse(stdout) };
  return { ok: true };
}

function fakeSlack(realDatastore: boolean, unavailableDM?: string) {
  const items = new Map<string, Record<string, string>>();
  const notices: Array<{ channel: string; user: string; text: string }> = [];
  const messages: Array<
    { channel: string; text: string; blocks?: unknown[]; ts: string }
  > = [];
  const client = {
    emoji: {
      list() {
        return {
          ok: true,
          emoji: { "cornichon-agent": "https://example.com/sticker.png" },
        };
      },
    },
    apps: {
      datastore: {
        async get({ datastore, id }: { datastore: string; id: string }) {
          if (realDatastore) return await slack("get", { datastore, id });
          return { ok: true, item: items.get(`${datastore}:${id}`) ?? {} };
        },
        async put(
          { datastore, item }: { datastore: string; item: { id: string } },
        ) {
          if (realDatastore) return await slack("put", { datastore, item });
          items.set(`${datastore}:${item.id}`, item);
          return { ok: true };
        },
        async query(
          { datastore, expression, expression_attributes, expression_values }: {
            datastore: string;
            expression: string;
            expression_attributes: Record<string, string>;
            expression_values: Record<string, string>;
          },
        ) {
          if (realDatastore) {
            return await slack("query", {
              datastore,
              expression,
              expression_attributes,
              expression_values,
            });
          }
          const values = [...items.entries()]
            .filter(([key, item]) =>
              key.startsWith(`${datastore}:`) &&
              Object.entries(expression_values).every(([, value]) =>
                Object.values(item).includes(value)
              )
            )
            .map(([, item]) => item);
          return { ok: true, items: values };
        },
      },
    },
    chat: {
      postMessage({ channel, text, blocks }: {
        channel: string;
        text: string;
        blocks?: unknown[];
      }) {
        if (channel === unavailableDM) {
          return { ok: false, error: "channel_not_found" };
        }
        const message = {
          channel,
          text,
          blocks,
          ts: String(messages.length + 1),
        };
        messages.push(message);
        return { ok: true, ...message };
      },
      update({ channel, text, blocks }: {
        channel: string;
        text: string;
        blocks?: unknown[];
      }) {
        return Promise.resolve({ ok: true, channel, text, blocks });
      },
      postEphemeral(notice: { channel: string; user: string; text: string }) {
        notices.push(notice);
        return { ok: true };
      },
    },
    conversations: {
      open({ users }: { users: string }) {
        return { ok: true, channel: { id: `D-${users}` } };
      },
    },
  } as never;
  return { client, items, messages, notices };
}

Deno.test("parcours complet persiste missions, rapporte une fois et calcule les scores", async () => {
  const realDatastore = (await Deno.permissions.query({
        name: "env",
        variable: "CORNICHON_TEST_TEAM",
      })).state ===
      "granted" &&
    Boolean(
      Deno.env.get("CORNICHON_TEST_TEAM") && Deno.env.get("CORNICHON_TEST_APP"),
    );
  const { client, items, messages } = fakeSlack(realDatastore);
  const channel = `C-test-${crypto.randomUUID()}`;
  const alice = `U-test-${crypto.randomUUID()}`;
  const bob = `U-test-${crypto.randomUUID()}`;

  let id: string | undefined;
  try {
    await createOperation(client, channel, alice);
    const invitation = messages[0];
    assertEquals(invitation.text.startsWith(":cornichon-agent:"), true);
    assertEquals(
      JSON.stringify(invitation.blocks).includes("Opération Cornichon"),
      true,
    );
    const actionBlock = invitation.blocks?.find((block) =>
      (block as { type?: string }).type === "actions"
    ) as {
      elements: Array<{ value: string }>;
    } | undefined;
    id = actionBlock?.elements[0].value;
    assertNotEquals(id, undefined);

    const act = async (user: string, action: string) =>
      await handleGameAction({
        client,
        action: { action_id: `cornichon_${action}`, value: id },
        body: {
          user: { id: user },
          channel: { id: channel },
          message: { ts: invitation.ts },
        },
      });

    await act(alice, "join");
    await act(bob, "join");
    await act(alice, "start");

    const saved = realDatastore
      ? await slack("get", { datastore: "operations", id })
      : { item: items.get(`operations:${id}`) };
    const operation = JSON.parse(saved.item.operation);
    assertEquals(operation.status, "active");
    assertEquals(new Set(Object.values(operation.words)).size, 2);
    const missionDMs = messages.filter((message) =>
      message.channel.startsWith("D-")
    );
    assertEquals(missionDMs.length, 2);
    assertNotEquals(missionDMs[0].text, missionDMs[1].text);

    await act(alice, "finish");
    const reportDMs = messages.filter((message) =>
      message.channel.startsWith("D-")
    );
    assertEquals(reportDMs.length, 4);
    await handleGameAction({
      client,
      action: { action_id: "cornichon_success", value: id },
      body: {
        user: { id: alice },
        channel: { id: `D-${alice}` },
        message: { ts: reportDMs[2].ts },
      },
    });
    await handleGameAction({
      client,
      action: { action_id: "cornichon_failure", value: id },
      body: {
        user: { id: alice },
        channel: { id: `D-${alice}` },
        message: { ts: reportDMs[2].ts },
      },
    });
    await handleGameAction({
      client,
      action: { action_id: "cornichon_failure", value: id },
      body: {
        user: { id: bob },
        channel: { id: `D-${bob}` },
        message: { ts: reportDMs[3].ts },
      },
    });
    const report = realDatastore
      ? await slack("get", { datastore: "reports", id: `${id}:${alice}` })
      : { item: items.get(`reports:${id}:${alice}`) };
    assertEquals(report.item.result, "success");
    assertEquals(await scoreFor(client, alice), 30);
    assertEquals(await scoreFor(client, bob), 0);
  } finally {
    if (realDatastore && id) {
      await slack("delete", { datastore: "reports", id: `${id}:${alice}` });
      await slack("delete", { datastore: "reports", id: `${id}:${bob}` });
      await slack("delete", { datastore: "operations", id });
    }
  }
});

Deno.test("un DM en échec laisse la partie en cours et prévient l’agent qui l’a lancée", async () => {
  const { client, items, messages, notices } = fakeSlack(false, "D-U2");
  const channel = "C1";
  const organizer = "U1";
  await createOperation(client, channel, organizer);
  const invitation = messages[0];
  const id = [...items.values()][0].id;
  const act = (user: string, action: string) =>
    handleGameAction({
      client,
      action: { action_id: `cornichon_${action}`, value: id },
      body: {
        user: { id: user },
        channel: { id: channel },
        message: { ts: invitation.ts },
      },
    });

  await act(organizer, "join");
  await act("U2", "join");
  await act(organizer, "start");

  const saved = items.get(`operations:${id}`)?.operation;
  if (!saved) throw new Error("L’opération doit être enregistrée.");
  const operation = JSON.parse(saved);
  assertEquals(operation.status, "active");
  assertEquals(Object.keys(operation.words), [organizer, "U2"]);
  assertEquals(
    messages.filter((message) => message.channel.startsWith("D-")).map((
      message,
    ) => message.channel),
    ["D-U1"],
  );
  assertEquals(notices, [{
    channel,
    user: organizer,
    text:
      "L’action est enregistrée. Le QG n’a pas pu transmettre tous les messages.",
  }]);

  await act(organizer, "start");
  assertEquals(items.get(`operations:${id}`)?.operation, saved);
  assertEquals(messages.length, 2);
});
