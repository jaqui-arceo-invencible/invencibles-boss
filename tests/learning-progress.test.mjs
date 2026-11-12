import test from "node:test";
import assert from "node:assert/strict";
import { checklistItems, chooseContinueLesson, isWithinWelcomeWindow, legacyChecklistId, moduleProgress, paginate, serializeChecklist } from "../src/lib/learning/progress.ts";

const hour = 60 * 60 * 1000;

test("el porcentaje usa solo lecciones publicadas y no completa un módulo vacío", () => {
  assert.deepEqual(moduleProgress([], [{ lessonId: "a", status: "completed" }]), { total: 0, completed: 0, pending: 0, percent: 0, state: "empty" });
  assert.equal(moduleProgress(["a", "b", "c", "d"], [{ lessonId: "a", status: "completed" }, { lessonId: "b", status: "completed" }]).percent, 50);
  assert.equal(moduleProgress(["a", "b"], [{ lessonId: "a", status: "completed" }, { lessonId: "b", status: "completed" }]).state, "completed");
  const afterNewLesson = moduleProgress(["a", "b", "c"], [{ lessonId: "a", status: "completed" }, { lessonId: "b", status: "completed" }]);
  assert.equal(afterNewLesson.percent, 67);
  assert.equal(afterNewLesson.state, "in_progress");
  assert.equal(afterNewLesson.completed, 2);
});

test("abrir una lección no cuenta como completada y una lección retirada no infla el porcentaje", () => {
  const progress = moduleProgress(["published"], [{ lessonId: "published", status: "in_progress" }, { lessonId: "unpublished", status: "completed" }]);
  assert.equal(progress.completed, 0);
  assert.equal(progress.percent, 0);
  assert.equal(progress.state, "in_progress");
});

test("las primeras 72 horas se miden desde la incorporación", () => {
  const joined = "2026-11-11T18:00:00.000Z";
  const start = Date.parse(joined);
  assert.equal(isWithinWelcomeWindow(joined, start + 71 * hour), true);
  assert.equal(isWithinWelcomeWindow(joined, start + 73 * hour), false);
  assert.equal(isWithinWelcomeWindow(null, start), false);
});

test("continuar prioriza el módulo de bienvenida dentro de las 72 horas", () => {
  const modules = [
    { slug: "otro", title: "Otro", position: 2, lessons: [{ id: "b", slug: "b", title: "B", position: 0, status: "in_progress", lastOpenedAt: "2026-11-12T00:00:00.000Z" }] },
    { slug: "primeros-pasos-primeras-72-horas", title: "Primeros pasos", position: 0, lessons: [{ id: "a", slug: "a", title: "A", position: 0, status: "not_started", lastOpenedAt: null }] },
  ];
  const chosen = chooseContinueLesson(modules, true);
  assert.equal(chosen?.lesson.id, "a");
  assert.equal(chooseContinueLesson(modules, false)?.lesson.id, "b");
  assert.equal(chooseContinueLesson([{ slug: "otro", title: "Otro", position: 0, lessons: [{ id: "b", slug: "b", title: "B", position: 0, status: "completed", lastOpenedAt: null }] }], false), null);
});

test("el identificador de una actividad sobrevive al reordenar", () => {
  const original = checklistItems("Revisar los recursos\nConocer los productos");
  const reordered = checklistItems("Conocer los productos\nRevisar los recursos");
  assert.deepEqual(original.map((item) => item.id).sort(), reordered.map((item) => item.id).sort());
  assert.equal(original[0]?.id, legacyChecklistId("Revisar los recursos", 0));
  const stored = serializeChecklist([{ id: "abc12345", text: "Uno" }, { id: "def67890", text: "Dos" }]);
  const flipped = serializeChecklist([{ id: "def67890", text: "Dos" }, { id: "abc12345", text: "Uno" }]);
  assert.deepEqual(checklistItems(flipped).map((item) => item.id), ["def67890", "abc12345"]);
  assert.equal(checklistItems(stored)[0]?.text, "Uno");
});

test("la paginación no se sale del total", () => {
  const page = paginate(["a", "b", "c"], 9, 2);
  assert.equal(page.page, 2);
  assert.deepEqual(page.items, ["c"]);
});
