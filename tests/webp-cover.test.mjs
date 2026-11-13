import assert from "node:assert/strict";
import test from "node:test";
import { isWebp } from "../src/lib/content/webp.ts";

test("reconoce un archivo WebP por sus primeros bytes", () => {
  const bytes = new Uint8Array(12);
  bytes.set([82, 73, 70, 70], 0);
  bytes.set([87, 69, 66, 80], 8);
  assert.equal(isWebp(bytes), true);
  assert.equal(isWebp(new Uint8Array([255, 216, 255])), false);
});
