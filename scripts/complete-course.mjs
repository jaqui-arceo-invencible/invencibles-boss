// Run with node --env-file=.env.local scripts/complete-course.mjs --apply.
// Server-only one-off content operation. Never import into the application.
import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { curriculum } from './course-content.mjs';

const teamId = '40f73f74-ef6c-44f2-b83e-df1237ceef1c';
const edition = 'course-2026-11-v1';
const apply = process.argv.includes('--apply');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const checked = (result) => { if (result.error) throw new Error(result.error.message); return result.data; };
const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const heading = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] });
const modules = checked(await db.from('modules').select('*,lessons(*)').eq('team_id', teamId).order('position'));
const manifest = JSON.parse(await readFile('content/course-assets/manifest.json', 'utf8'));
const backups = [];
const report = [];
const backupDir = apply ? await mkdtemp(join(tmpdir(), 'invencibles-course-')) : null;
if (backupDir) console.log(`Respaldo privado: ${backupDir}`);

for (const [moduleIndex, material] of curriculum.entries()) {
  const course = modules.find((item) => item.slug === material.slug);
  if (!course) throw new Error(`Falta módulo ${material.slug}`);
  let coverId = course.cover_resource_id;
  if (!apply) { console.log(`${course.title}: ${material.units.length} talleres; portada ${coverId ? 'existente' : 'nueva'}`); continue; }
  const revisions = checked(await db.from('lesson_revisions').select('*,content_blocks(*)').in('lesson_id', course.lessons.map((lesson) => lesson.id)));
  backups.push({ course, revisions });
  await writeFile(join(backupDir, 'before.json'), JSON.stringify(backups, null, 2), { mode: 0o600 });
  if (!coverId) {
    const source = manifest[String(moduleIndex).padStart(2, '0')];
    if (!source) throw new Error(`Falta imagen ${moduleIndex}`);
    const bytes = await sharp(source).resize(1200, 1200, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
    await mkdir('content/course-assets/webp', { recursive: true });
    await writeFile(`content/course-assets/webp/${material.slug}.webp`, bytes);
    const storagePath = `${teamId}/${course.created_by}/course-${edition}-${material.slug}.webp`;
    let resource = checked(await db.from('resources').select('id').eq('storage_path', storagePath).maybeSingle());
    if (!resource) {
      checked(await db.storage.from('academy-private').upload(storagePath, bytes, { contentType: 'image/webp', upsert: false }));
      resource = checked(await db.from('resources').insert({ team_id: teamId, uploaded_by: course.created_by, title: `Portada: ${course.title}`, description: 'Imagen editorial generada para ilustrar el tema; no representa testimonios del equipo.', file_name: `${material.slug}.webp`, storage_path: storagePath, mime_type: 'image/webp', file_size: bytes.length }).select('id').single());
    }
    coverId = resource.id;
  }
  checked(await db.from('modules').update({ description: material.description, cover_resource_id: coverId }).eq('id', course.id).eq('team_id', teamId));
  let count = 0;
  for (const [slug, objective, explanation, example, exercise] of material.units) {
    const lesson = course.lessons.find((item) => item.slug === slug);
    if (!lesson) throw new Error(`Falta lección ${slug}`);
    const source = revisions.find((item) => item.id === lesson.working_revision_id);
    if (!source || source.lesson_format === 'video') throw new Error(`Revisión no editable como texto: ${slug}`);
    if (source.content_blocks.some((block) => block.content?.courseEdition === edition)) continue;
    const revisionNumber = Math.max(...revisions.filter((item) => item.lesson_id === lesson.id).map((item) => item.revision)) + 1;
    const revision = checked(await db.from('lesson_revisions').insert({ lesson_id: lesson.id, revision: revisionNumber, title: source.title, summary: source.summary || objective, estimated_minutes: Math.max(source.estimated_minutes, 12), lesson_format: 'text', video_url: '', cover_resource_id: source.cover_resource_id, created_by: course.created_by }).select('id').single());
    const originalBlocks = source.content_blocks.sort((a,b) => a.position-b.position).map((block) => ({ type: block.type, content: block.content }));
    const practice = [
      { type: 'callout', content: { text: `Al terminar podrás: ${objective}`, variant: 'info', courseEdition: edition } },
      { type: 'rich_text', content: { doc: JSON.stringify({ type: 'doc', content: [heading('Comprende el tema'), paragraph(material.context), heading('Llévalo a la práctica'), paragraph(explanation), heading('Ejemplo para analizar'), paragraph(example), heading('Tu actividad'), paragraph(exercise), heading('Comprueba tu aprendizaje'), paragraph(`Explica con tus palabras cómo aplicarías este objetivo: ${objective} Describe una situación en la que cambiarías tu enfoque y justifica la decisión. Revisa si tu respuesta respeta lo que la otra persona necesita y la información que puedes respaldar.`), heading('Comparte y recibe retroalimentación'), paragraph('Comparte en los comentarios una versión breve de tu actividad, sin nombres ni datos privados. Pide una mejora concreta a tus compañeras y escribe qué cambiarás después de leer sus respuestas. Antes de marcar la lección como completada, conserva tu evidencia en tu cuaderno de práctica.') ] }) } },
      { type: 'checklist', content: { title: 'Antes de avanzar', items: JSON.stringify([{ id: `${slug}-practice`, text: exercise }, { id: `${slug}-evidence`, text: `Puedo demostrar este resultado: ${objective}` }, { id: `${slug}-review`, text: 'Revisé mi evidencia y elegí una mejora para mi siguiente intento.' }]) } },
    ];
    checked(await db.from('content_blocks').insert([...originalBlocks, ...practice].map((block, position) => ({ ...block, revision_id: revision.id, position }))));
    const updated = checked(await db.from('lessons').update({ working_revision_id: revision.id }).eq('id', lesson.id).eq('working_revision_id', source.id).select('id'));
    if (updated.length !== 1) throw new Error(`La lección cambió durante la operación: ${slug}`);
    count++;
  }
  report.push({ module: course.title, draftedLessons: count, coverId });
  console.log(`${course.title}: ${count} ampliaciones en borrador; portada lista.`);
}
if (apply) {
  await writeFile('content/course-assets/completion-report.json', JSON.stringify(report, null, 2));
  await writeFile(join(backupDir, 'after.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
}
