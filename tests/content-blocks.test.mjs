import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBlocks, safeExternalLink, safeVideoUrl } from '../src/lib/content/blocks.ts';

test('solo representa enlaces HTTPS sin credenciales', () => {
 assert.equal(safeExternalLink('https://example.com/recurso'), 'https://example.com/recurso');
 assert.equal(safeExternalLink('javascript:alert(1)'), null);
 assert.equal(safeExternalLink('http://example.com'), null);
 assert.equal(safeExternalLink('https://usuario:clave@example.com'), null);
});

test('solo admite proveedores de video permitidos por HTTPS', () => {
 assert.equal(safeVideoUrl('https://youtu.be/dQw4w9WgXcQ'),'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
 assert.equal(safeVideoUrl('javascript:alert(1)'),null);
 assert.equal(safeVideoUrl('https://evil.example/watch?v=dQw4w9WgXcQ'),null);
 assert.equal(safeVideoUrl('http://youtu.be/dQw4w9WgXcQ'),null);
});

test('valida estructura, límites y referencias de bloques', () => {
 assert.deepEqual(parseBlocks('[{"type":"rich_text","content":{"text":"Hola"}}]'),[{type:'rich_text',content:{text:'Hola'},position:0}]);
 assert.throws(()=>parseBlocks('[{"type":"image","content":{"resourceId":"javascript:alert(1)"}}]'));
 assert.throws(()=>parseBlocks('[{"type":"video","content":{"url":"https://evil.example"}}]'));
 assert.throws(()=>parseBlocks('[{"type":"unknown","content":{}}]'));
});
