import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareDraftBlocks } from '../src/lib/content/lesson-draft.ts';
import { parseBlocks } from '../src/lib/content/blocks.ts';

test('un espacio de imagen vacío no bloquea el guardado de texto', () => {
  const blocks = [{ type: 'rich_text', content: { text: 'Contenido de la lección' }, position: 0 }, { type: 'image', content: {}, position: 1 }];
  assert.throws(() => parseBlocks(JSON.stringify(blocks)), /Recurso inválido/);
  assert.equal(parseBlocks(JSON.stringify(prepareDraftBlocks(blocks))).length, 1);
  assert.equal(blocks.length, 2);
});

test('conserva medios subidos y reajusta las posiciones sin borrar texto', () => {
  const blocks = [{ type: 'image', content: {}, position: 0 }, { type: 'image', content: { resourceId: '9d85e428-b8f4-4ab9-b364-50f1a62f343b' }, position: 1 }, { type: 'rich_text', content: { text: 'Final' }, position: 2 }];
  const result = parseBlocks(JSON.stringify(prepareDraftBlocks(blocks)));
  assert.deepEqual(result.map((block) => block.position), [0, 1]);
  assert.equal(result[0].type, 'image');
  assert.equal(result[1].content.text, 'Final');
});

test('solo omite espacios vacíos; un recurso no vacío inválido sigue siendo rechazado', () => {
  const blocks = [{ type: 'document', content: { resourceId: 'inválido' }, position: 0 }];
  assert.throws(() => parseBlocks(JSON.stringify(prepareDraftBlocks(blocks))), /Recurso inválido/);
  assert.equal(prepareDraftBlocks([{ type: 'video', content: { url: '' }, position: 0 }]).length, 0);
});
