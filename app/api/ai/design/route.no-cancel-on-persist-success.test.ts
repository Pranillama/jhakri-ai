import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { runs, tasks } from "@trigger.dev/sdk";

/**
 * Counterpart to the cancel-on-failure regression test: confirms the review
 * fix's cancellation path only fires when `prisma.taskRun.create` actually
 * fails — a normal successful run must not have its Trigger.dev run
 * cancelled out from under it. See the sibling test file for why the SDK is
 * patched in place instead of through `mock.module`, and why this scenario
 * lives in its own file/process rather than a second `test()` in the same
 * file.
 */
test("POST /api/ai/design does not cancel the run when the TaskRun persists successfully", async () => {
  mock.module("@/lib/prisma", {
    namedExports: {
      prisma: {
        taskRun: {
          create: async () => ({
            id: "taskrun_1",
            runId: "run_123",
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
  (tasks as { trigger: unknown }).trigger = async () => ({ id: "run_123" });
  (runs as { cancel: unknown }).cancel = async (runId: string) => {
    cancelCalls.push(runId);
  };

  const { POST } = await import("./route.ts");

  const response = await POST(
    new Request("http://localhost/api/ai/design", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: "add a database",
        roomId: "room_1",
        projectId: "project_1",
      }),
    })
  );
  const body = (await response.json()) as { runId?: string };

  assert.equal(response.status, 200);
  assert.equal(body.runId, "run_123");
  assert.deepEqual(cancelCalls, []);
});
