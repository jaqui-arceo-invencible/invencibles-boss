import test from "node:test";
import assert from "node:assert/strict";
import { categorySlug, communityImageExtension, communityTextParts, plainCommunityText } from "../src/lib/community/text.ts";

test("acepta texto plano dentro del límite y rechaza vacío", () => {
  assert.equal(plainCommunityText("  Hola equipo  ", 20), "Hola equipo");
  assert.equal(plainCommunityText("   ", 20), null);
  assert.equal(plainCommunityText("a".repeat(21), 20), null);
});

test("crea un slug estable para categorías", () => {
  assert.equal(categorySlug("Preguntas y dudas"), "preguntas-y-dudas");
  assert.equal(categorySlug("Logros del equipo"), "logros-del-equipo");
  assert.equal(categorySlug("!!!"), null);
});

test("solo admite imágenes jpg, png y webp", () => {
  assert.equal(communityImageExtension("image/jpeg"), "jpg");
  assert.equal(communityImageExtension("image/png"), "png");
  assert.equal(communityImageExtension("image/webp"), "webp");
  assert.equal(communityImageExtension("image/gif"), null);
});

test("convierte solo enlaces https en partes seguras", () => {
  const parts = communityTextParts("Mira https://example.com/guia. y http://evil.test");
  assert.deepEqual(parts.map((part) => part.kind), ["text", "link", "text", "text"]);
  assert.equal(parts[1].value, "https://example.com/guia");
  assert.match(parts[3].value, /http:\/\/evil\.test/);
});
