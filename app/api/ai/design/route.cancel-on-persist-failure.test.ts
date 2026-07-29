import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { runs, tasks } from "@trigger.dev/sdk";

/**
 * Regression test for the "orphaned Trigger.dev runs" review fix: if
 * `prisma.taskRun.create` fails after a run has already been triggered, the
 * route must cancel the now-untracked run instead of leaving it running with
 * no ownership record (which also makes it permanently untokenizable, since
 * the token route looks the run up by TaskRun).
 *
 * `@trigger.dev/sdk`'s `tasks`/`runs` exports are patched in place (rather
 * than through `mock.module`) because this package's nested resolution from
 * a dynamically-imported route module does not reliably land on the same
 * module `mock.module()` registers from a top-level test file, at least
 * under this Node/tsx combination — both approaches converge on the exact
 * same shared object instance, so patching `tasks.trigger`/`runs.cancel`
 * directly is what actually reaches the route under test. This file runs as
 * its own process (one file per `node --test` worker), so it does not share
 * `@/lib/prisma`'s mocked module instance with the sibling success-path test.
 */
test("POST /api/ai/design cancels the Trigger.dev run when persisting the TaskRun fails", async () => {
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
    return { id: "run_123" };
  };
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

  assert.equal(response.status, 500);
  assert.equal(triggerCalls.length, 1);
  assert.deepEqual(
    cancelCalls,
    ["run_123"],
    "the triggered run should be cancelled once its TaskRun record fails to persist"
  );
});
