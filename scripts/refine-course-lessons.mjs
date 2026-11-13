// Protected one-off operation: node --env-file=.env.local scripts/refine-course-lessons.mjs
import { createClient } from '@supabase/supabase-js';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const check = (r) => { if (r.error) throw Error(r.error.message); return r.data; };
const video = 'https://www.youtube.com/watch?v=ezmexT_j75U';
const videoLessons = {
  'acompanar-sin-hacer-el-trabajo-por-ella': ['Video: acompañar con límites profesionales', 'Observa el episodio sobre relaciones en el trabajo y analiza cómo diferenciar cercanía, apoyo y responsabilidad. Actividad: redacta dos acuerdos de acompañamiento y una frase para poner un límite con respeto. Explica qué tareas corresponden a cada persona y qué harías si un acuerdo no se cumple.'],
  'tus-horas-de-negocio': ['Video: límites entre trabajo y vida personal', 'En este episodio sobre el entorno laboral, identifica ideas que quieras contrastar con tu propia organización. Actividad: define tu horario de atención, una pausa y un límite de disponibilidad. Escribe cómo comunicarías ese límite sin desatender un compromiso. Distingue las opiniones del episodio de las decisiones que eliges para tu contexto.'],
  'experiencias-del-equipo-con-cuidado': ['Video: relaciones y confianza en el trabajo', 'Analiza el mismo episodio desde la perspectiva del equipo. Actividad: escribe tres acuerdos para construir confianza sin confundir una relación profesional con una obligación personal. Explica una idea con la que estás de acuerdo y otra que matizarías. Comparte tu reflexión sin nombres ni historias privadas de otras personas.'],
};
const initial = JSON.parse(await readFile('/var/folders/kz/90cp6fbs2b7bfswct4m1nz2w0000gn/T/invencibles-course-Ci9lQX/before.json', 'utf8'));
const second = JSON.parse(await readFile('/var/folders/kz/90cp6fbs2b7bfswct4m1nz2w0000gn/T/invencibles-course-7RT6eu/before.json', 'utf8'));
const originals = [...initial, ...second.filter((b) => !initial.some((a) => a.course.id === b.course.id))];
const modules = check(await db.from('modules').select('id,slug,cover_resource_id,created_by,lessons(*)').eq('team_id', '40f73f74-ef6c-44f2-b83e-df1237ceef1c').lt('position', 10));
const dir = await mkdtemp(join(tmpdir(), 'invencibles-lessons-'));
const backup = [];
const report = { imagesRemoved: 0, textLessonsCompleted: 0, videos: [], backup: dir };
for (const course of modules) for (const lesson of course.lessons) {
  const source = check(await db.from('lesson_revisions').select('*,content_blocks(*)').eq('id', lesson.working_revision_id).single());
  backup.push({ lesson, source });
  await writeFile(join(dir, 'before.json'), JSON.stringify(backup), { mode: 0o600 });
  const baseline = originals.find((item) => item.course.id === course.id);
  const originalLesson = baseline?.course.lessons.find((item) => item.id === lesson.id);
  const originalRevision = baseline?.revisions.find((item) => item.id === originalLesson?.working_revision_id);
  const hasEdition = source.content_blocks.some((b) => b.content?.courseEdition === 'course-2026-11-v1');
  const removeCover = hasEdition && !originalRevision?.cover_resource_id && source.cover_resource_id === course.cover_resource_id;
  const nextVideo = videoLessons[lesson.slug];
  const pendingText = lesson.slug === 'proxima-etapa' && !source.content_blocks.some((b) => b.content?.courseEdition === 'next-stage-2026-11');
  if (nextVideo && (source.lesson_format !== 'video' || source.video_url !== video || removeCover) || pendingText) {
    const newest = check(await db.from('lesson_revisions').select('revision').eq('lesson_id', lesson.id).order('revision', { ascending: false }).limit(1));
    const revision = check(await db.from('lesson_revisions').insert({ lesson_id: lesson.id, revision: newest[0].revision + 1, title: nextVideo ? nextVideo[0] : 'Próxima etapa: tu plan de aprendizaje', summary: nextVideo ? nextVideo[1] : 'Convierte el recorrido de la academia en un plan personal de práctica, con una prioridad, una evidencia y una fecha de revisión.', estimated_minutes: nextVideo ? source.estimated_minutes : 15, created_by: course.created_by, lesson_format: nextVideo ? 'video' : 'text', video_url: nextVideo ? video : '', cover_resource_id: null }).select('id').single());
    if (pendingText && !nextVideo) {
      const text = 'Tu siguiente etapa empieza por elegir una habilidad que puedas practicar esta semana. Repasa los módulos y señala dónde necesitas claridad: conocer una opción, iniciar una conversación, preparar contenido, organizar seguimiento o acompañar a otra integrante. Escoge solo una prioridad para este ciclo.\n\nDefine una evidencia concreta. En vez de «quiero mejorar», escribe «tendré una presentación de dos frases, la ensayaré con una compañera y registraré qué entendió». La evidencia debe depender de una acción propia, no de una venta o una respuesta ajena.\n\nReserva un bloque realista en tu agenda y añade una alternativa mínima para los días complicados. Puedes dedicar veinte minutos a estudiar y otros veinte a practicar, o dividir la actividad en sesiones más cortas. Lo importante es saber qué harás y cuándo revisarás el intento.\n\nCaso ficticio: Ana quiere ordenar sus conversaciones. Esta semana diseña una tabla con contexto, permiso y siguiente paso. Practica con tres situaciones ficticias y pide a una compañera que revise si las notas son claras. Su evidencia es la tabla revisada; no necesita contactar a nadie para demostrar ese aprendizaje.\n\nActividad: completa estas cinco frases en tu cuaderno: mi prioridad es…; practicaré…; guardaré como evidencia…; pediré apoyo para…; revisaré mi avance el… Comparte en los comentarios solo tu compromiso, sin datos de clientas o compañeras.\n\nAl revisar, compara lo que planeaste y lo que pudiste hacer. Conserva una práctica que funcionó, simplifica una dificultad y elige el siguiente paso. Si no completaste la actividad, ajusta la carga antes de añadir más tareas. Avanzar también significa reconocer qué ritmo puedes sostener.';
      check(await db.from('content_blocks').insert({ revision_id: revision.id, type: 'rich_text', position: 0, content: { text, courseEdition: 'next-stage-2026-11' } }));
      report.textLessonsCompleted++;
    }
    const changed = check(await db.from('lessons').update({ working_revision_id: revision.id }).eq('id', lesson.id).eq('working_revision_id', source.id).select('id'));
    if (changed.length !== 1) throw Error('La lección cambió durante la edición');
    if (nextVideo) report.videos.push({ id: lesson.id, title: nextVideo[0], url: video });
    if (removeCover) report.imagesRemoved++;
  } else if (removeCover) {
    if (source.published_at || source.id === lesson.published_revision_id) throw Error('La portada automática ya está publicada; requiere revisión');
    check(await db.from('lesson_revisions').update({ cover_resource_id: null }).eq('id', source.id));
    report.imagesRemoved++;
  }
}
await writeFile('content/course-assets/lesson-refinement.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
