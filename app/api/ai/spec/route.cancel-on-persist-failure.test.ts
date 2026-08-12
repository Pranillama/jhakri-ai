import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { runs, tasks } from "@trigger.dev/sdk";

/**
 * `POST /api/ai/spec` mirrors the design route's trigger-then-persist chain
 * (see `app/api/ai/design/route.cancel-on-persist-failure.test.ts`), including
 * the orphaned-run cancellation: if `prisma.taskRun.create` fails after the
 * `generate-spec` run has already been triggered, the route must cancel it
 * rather than leave an untracked, permanently untokenizable run behind.
 */
test("POST /api/ai/spec cancels the Trigger.dev run when persisting the TaskRun fails", async () => {
  mock.module("@/lib/prisma", {
    namedExports: {
      prisma: {
        taskRun: {
          create: async () => {
            throw new Error("simulated DB failure (e.g. unique constraint)");
          },
        },
      },
    },
  });
  mock.module("@/lib/project-access", {
    namedExports: {
      getCurrentIdentity: async () => ({ userId: "user_1", emails: [] }),
      getAccessibleProject: async () => ({
        id: "project_1",
        name: "Test project",
        ownership: "owned",
      }),
    },
  });

  const triggerCalls: unknown[][] = [];
  const cancelCalls: string[] = [];
  (tasks as { trigger: unknown }).trigger = async (...args: unknown[]) => {
    triggerCalls.push(args);
    return { id: "run_456" };
  };
  (runs as { cancel: unknown }).cancel = async (runId: string) => {
    cancelCalls.push(runId);
  };

  const { POST } = await import("./route.ts");

  const response = await POST(
    new Request("http://localhost/api/ai/spec", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        roomId: "room_1",
        chatHistory: [],
        nodes: [],
        edges: [],
      }),
    })
  );

  assert.equal(response.status, 500);
  assert.equal(triggerCalls.length, 1);
  assert.deepEqual(
    cancelCalls,
    ["run_456"],
    "the triggered spec-generation run should be cancelled once its TaskRun record fails to persist"
  );
});
