import assert from "node:assert/strict";
import { test } from "node:test";

import { LiveblocksError, type Liveblocks } from "@liveblocks/node";

import { ensureFeed, isLiveblocksStatus } from "./liveblocks";

/**
 * Regression test for the dev-only "409 falls through as 500" bugfix:
 * `isLiveblocksStatus` must recognize a real `LiveblocksError`'s status by
 * property, not by `instanceof`, because the cached-on-globalThis Liveblocks
 * client can outlive a Fast Refresh module reload and throw an error whose
 * class reference no longer matches a freshly re-imported `LiveblocksError`.
 * A real `instanceof` check would still pass in this same-process test (the
 * class reference here never changes), so this test only proves the
 * `status`-property behavior is correct — see `lib/liveblocks.ts` for the
 * live-reload scenario this replaces `instanceof` for.
 */
test("isLiveblocksStatus matches a real LiveblocksError by its status property", async () => {
  const conflict = await LiveblocksError.from(
    new Response(JSON.stringify({ message: "Feed already exists" }), { status: 409 })
  );

  assert.equal(isLiveblocksStatus(conflict, 409), true);
  assert.equal(isLiveblocksStatus(conflict, 500), false);
});

test("isLiveblocksStatus rejects non-error values that merely resemble one", () => {
  assert.equal(isLiveblocksStatus(null, 409), false);
  assert.equal(isLiveblocksStatus(undefined, 409), false);
  assert.equal(isLiveblocksStatus("409", 409), false);
  assert.equal(isLiveblocksStatus({ code: 409 }, 409), false);
});

test("ensureFeed swallows a 409 (feed already exists) and resolves", async () => {
  const conflict = await LiveblocksError.from(
    new Response(JSON.stringify({ message: "Feed already exists" }), { status: 409 })
  );

  const liveblocks = {
    createFeed: async () => {
      throw conflict;
    },
  } as unknown as Liveblocks;

  await assert.doesNotReject(() => ensureFeed(liveblocks, "room_1", "ai-status-feed"));
});

test("ensureFeed rethrows a non-409 error instead of swallowing it", async () => {
  const serverError = await LiveblocksError.from(
    new Response(JSON.stringify({ message: "Internal error" }), { status: 500 })
  );

  const liveblocks = {
    createFeed: async () => {
      throw serverError;
    },
  } as unknown as Liveblocks;

  await assert.rejects(
    () => ensureFeed(liveblocks, "room_1", "ai-status-feed"),
    (error: unknown) => error === serverError
  );
});
