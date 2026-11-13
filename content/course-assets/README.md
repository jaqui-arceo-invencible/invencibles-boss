# Material del curso — noviembre 2026

## Ajuste posterior solicitado

Se retiraron 39 asociaciones automáticas de portada en revisiones de trabajo;
las portadas elegidas previamente por el usuario se conservaron. Ya no se asigna
la portada del módulo como imagen predeterminada de nuevas lecciones.
Se completó «Próxima etapa» con texto y actividad. Tres lecciones de acompañamiento,
horarios y confianza se convirtieron en video con el enlace proporcionado por el
usuario: `https://www.youtube.com/watch?v=ezmexT_j75U`. Es el mismo episodio con
tres enfoques de reflexión, no tres videos diferentes. El material textual anterior
se conserva en sus revisiones previas. Los cambios siguen en revisiones de trabajo.
Ver `lesson-refinement.json` para el registro de esta operación.

## Entrega

- Diez descripciones de módulo ampliadas.
- Cuarenta talleres agregados a las revisiones de trabajo existentes: objetivo,
  contexto, explicación, ejemplo, actividad, autoevaluación, conversación y checklist.
- Nueve portadas editoriales nuevas, generadas con la herramienta integrada
  `image_gen` siguiendo la habilidad imagegen. Se conservó la portada de bienvenida
  elegida previamente por el usuario.
- PNG originales en `png/`, WebP de uso en `webp/`. Las portadas están cargadas en
  Storage privado y asociadas a los módulos; las revisiones nuevas reutilizan la
  portada de su módulo cuando la lección no tenía portada propia.
- Fuente editorial en `scripts/course-content.mjs`. Carga reproducible mediante
  `scripts/complete-course.mjs`, con modo de consulta predeterminado y `--apply`
  explícito. Usa las credenciales locales, nunca las incluye en el código.

## Estado de publicación

Las descripciones y portadas de módulos ya están actualizadas. Las ampliaciones
de las lecciones son borradores: no se reemplazaron las revisiones publicadas ni
los videos elegidos por el usuario. El módulo técnico archivado y las lecciones
adicionales de bienvenida no se tocaron. Revisar en Administración → Módulos →
Lección → Vista previa, y publicar desde el editor cuando corresponda.

Se mantuvieron todos los bloques anteriores al agregar material. Los casos
didácticos no son testimonios reales del equipo. No se incluyen promesas de
ingresos ni afirmaciones sobre productos específicos sin fuente.

## Prompts de imagen

Herramienta integrada; no se usó el CLI ni una API de pago adicional configurada.
Cada escena se generó por separado. Prompt base de las portadas 02–09:

> Use case: photorealistic-natural. Asset type: square course cover for a women's
> entrepreneurship learning platform. Scene: [escena]. Editorial lifestyle
> photography, warm daylight, cream and soft lavender accents, genuine textures,
> tasteful contemporary Latin American setting, central composition safe for
> square and 16:9 crops. No legible text, logos, brand names, watermarks, financial
> promises or before-after claims. Return a local saved file path if supported.

Escenas utilizadas, en el orden de `manifest.json`:

01. Latina entrepreneur at a sunlit contemporary desk mapping her first three days
in a paper planner, laptop, coffee, small lavender stationery accents. Editorial
lifestyle photograph, warm natural light, genuine textures, confident approachable
mood, uncluttered composition suitable for square and 16:9 center crops. No text,
logos, brands, watermarks or claims.
02. Product knowledge: woman entrepreneur comparing unbranded skincare bottles
and taking notes at a bright desk, neutral packaging, no medical setting.
03. First clients: two Latina women having a friendly consultation at a cafe
table, listening and sharing a notebook, respectful natural interaction.
04. Social content: Latina entrepreneur filming an unbranded product
demonstration with a smartphone on a tripod, bright home studio.
05. Follow up: woman at her laptop thoughtfully organizing customer conversation
notes, colorful paper tabs and an unbranded phone.
06. Mentoring: two Latina women planning together at a shared desk, supportive
professional coaching, collaborative body language.
07. Organization: top down editorial view of hands planning a realistic work
week in an unlabelled paper agenda, laptop edge, warm desk.
08. Experiences: small diverse group of adult women in a relaxed workshop
sharing stories and listening, candid community gathering.
09. Practice and progress: woman entrepreneur reviewing a completed handwritten
checklist and arranging task cards at a sunny workspace.

## Recuperación y validación

Se guardaron respaldos privados previos en directorios `invencibles-course-*` del
directorio temporal del sistema. La publicación vigente se preservó y volver a
una revisión anterior requiere reasignar su `working_revision_id`, previa revisión
de ediciones posteriores. No eliminar recursos mientras tengan referencias.

Un error transitorio de permisos interrumpió la primera ejecución. Se reanudó
con detección por edición, sin volver a agregar bloques a las lecciones ya
completadas. Puede quedar una revisión intermedia sin usar; no se eliminó.

`verification.json` registra los totales comprobados en Supabase. `completion-report.json`
refleja las operaciones de la última ejecución, no el total acumulado.

Typecheck, lint y build del proyecto completados correctamente. Imágenes revisadas
en la salida de generación; no se hizo navegación autenticada por preferencia del usuario.
