import assert from "node:assert/strict";
import test from "node:test";
import { announcementOnceKey, orderParticipants, shouldNotify } from "../src/lib/messages/pair.ts";

test("orders a direct pair the same way from either side", () => {
  const first = "6b73e1d3-c900-42ad-9d4c-7fe4c4f79b7b";
  const second = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const ordered = orderParticipants(second, first);
  assert.deepEqual(ordered, orderParticipants(first, second));
  assert.equal(ordered && ordered.low < ordered.high, true);
});

test("rejects a conversation with yourself", () => {
  assert.equal(orderParticipants("abc", "ABC"), null);
});

test("does not notify the author of their own action", () => {
  assert.equal(shouldNotify("user", "user"), false);
  assert.equal(shouldNotify("author", "teammate"), true);
});

test("keeps one announcement key per recipient and post", () => {
  assert.equal(announcementOnceKey("person", "post"), announcementOnceKey("person", "post"));
  assert.notEqual(announcementOnceKey("person", "post"), announcementOnceKey("other", "post"));
});
