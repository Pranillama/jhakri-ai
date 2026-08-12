import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { runs, tasks } from "@trigger.dev/sdk";

/**
 * Counterpart to the cancel-on-failure regression test: a normal successful
 * `generate-spec` run must not have its Trigger.dev run cancelled out from
 * under it. See the sibling test file for why this scenario lives in its own
 * file/process rather than a second `test()` alongside it.
 */
test("POST /api/ai/spec does not cancel the run when the TaskRun persists successfully", async () => {
  mock.module("@/lib/prisma", {
    namedExports: {
      prisma: {
        taskRun: {
          create: async () => ({
            id: "taskrun_1",
            runId: "run_456",
            projectId: "project_1",
            userId: "user_1",
            createdAt: new Date(),
          }),
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

  const cancelCalls: string[] = [];
  (tasks as { trigger: unknown }).trigger = async () => ({ id: "run_456" });
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
  const body = (await response.json()) as { runId?: string };

  assert.equal(response.status, 200);
  assert.equal(body.runId, "run_456");
  assert.deepEqual(cancelCalls, []);
});
