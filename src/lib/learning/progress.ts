export const WELCOME_MODULE_SLUG = "primeros-pasos-primeras-72-horas";
export const WELCOME_WINDOW_MS = 72 * 60 * 60 * 1000;
export const checklistItemIdPattern = /^[a-zA-Z0-9_-]{8,80}$/;
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredProgressStatus = "in_progress" | "completed";
export type LessonStatus = StoredProgressStatus | "not_started";
export type ModuleState = "empty" | "not_started" | "in_progress" | "completed";
export type ChecklistItem = { id: string; text: string };
export type ProgressRow = { lessonId: string; status: StoredProgressStatus };
export type ModuleProgress = { total: number; completed: number; pending: number; percent: number; state: ModuleState };

export type ContinueCandidate = {
  id: string;
  slug: string;
  title: string;
  position: number;
  status: LessonStatus;
  lastOpenedAt: string | null;
};

export type ContinueModule = {
  slug: string;
  title: string;
  position: number;
  lessons: ContinueCandidate[];
};

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function isWithinWelcomeWindow(joinedAt: string | null, now: number) {
  if (!joinedAt) return false;
  const start = Date.parse(joinedAt);
  if (Number.isNaN(start)) return false;
  const elapsed = now - start;
  return elapsed >= 0 && elapsed < WELCOME_WINDOW_MS;
}

export function moduleProgress(lessonIds: string[], rows: ProgressRow[]): ModuleProgress {
  const allowed = new Set(lessonIds);
  const relevant = rows.filter((row) => allowed.has(row.lessonId));
  const completed = relevant.filter((row) => row.status === "completed").length;
  const total = lessonIds.length;
  if (total === 0) return { total: 0, completed: 0, pending: 0, percent: 0, state: "empty" };
  const percent = Math.round((completed / total) * 100);
  const state: ModuleState = completed === total ? "completed" : relevant.length > 0 ? "in_progress" : "not_started";
  return { total, completed, pending: total - completed, percent, state };
}

export function moduleStateLabel(state: ModuleState) {
  if (state === "completed") return "Completado";
  if (state === "in_progress") return "En progreso";
  if (state === "empty") return "Sin lecciones publicadas";
  return "Sin comenzar";
}

export function lessonStatusLabel(status: LessonStatus) {
  if (status === "completed") return "Completada";
  if (status === "in_progress") return "En progreso";
  return "Pendiente";
}

export function newChecklistItemId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function legacyChecklistId(text: string, occurrence: number) {
  let hash = 2166136261;
  const value = text.trim().toLowerCase();
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `c${(hash >>> 0).toString(16).padStart(8, "0")}${occurrence.toString(16).padStart(2, "0")}`;
}

export function checklistItems(raw: string, keepEmpty = false): ChecklistItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const items: ChecklistItem[] = [];
        for (const row of parsed) {
          if (!row || typeof row !== "object") continue;
          const record = row as { id?: unknown; text?: unknown };
          const id = typeof record.id === "string" ? record.id : "";
          const text = typeof record.text === "string" ? record.text : "";
          if (!checklistItemIdPattern.test(id) || seen.has(id)) continue;
          if (!keepEmpty && !text.trim()) continue;
          seen.add(id);
          items.push({ id, text });
        }
        return items;
      }
    } catch {
      // Older checklists were stored as one activity per line.
    }
  }
  const counts = new Map<string, number>();
  return trimmed.split("\n").flatMap((line) => {
    const text = line.trim();
    if (!text) return [];
    const key = text.toLowerCase();
    const occurrence = counts.get(key) ?? 0;
    counts.set(key, occurrence + 1);
    return [{ id: legacyChecklistId(text, occurrence), text }];
  });
}

export function serializeChecklist(items: ChecklistItem[]) {
  return JSON.stringify(items.map((item) => ({ id: item.id, text: item.text })));
}

export function chooseContinueLesson(modules: ContinueModule[], withinWelcome: boolean, welcomeSlug = WELCOME_MODULE_SLUG) {
  const ordered = [...modules].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title, "es"));
  const welcome = ordered.find((module) => module.slug === welcomeSlug);
  const welcomeOpen = welcome?.lessons.some((lesson) => lesson.status !== "completed") ?? false;
  if (withinWelcome && welcome && welcomeOpen) return firstOpenLesson(welcome);

  const inProgress = ordered.flatMap((module) => module.lessons.filter((lesson) => lesson.status === "in_progress").map((lesson) => ({ lesson, module })));
  inProgress.sort((a, b) => (b.lesson.lastOpenedAt ?? "").localeCompare(a.lesson.lastOpenedAt ?? ""));
  if (inProgress[0]) return { lesson: inProgress[0].lesson, module: inProgress[0].module };

  for (const course of ordered) {
    const next = firstOpenLesson(course);
    if (next) return next;
  }
  return null;
}

function firstOpenLesson(course: ContinueModule) {
  const lessons = [...course.lessons].sort((a, b) => a.position - b.position);
  const inProgress = lessons.filter((lesson) => lesson.status === "in_progress").sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""));
  const current = inProgress[0] ?? lessons.find((lesson) => lesson.status !== "completed");
  return current ? { lesson: current, module: course } : null;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const safeSize = pageSize > 0 ? pageSize : 1;
  const pageCount = Math.max(1, Math.ceil(items.length / safeSize));
  const current = Number.isFinite(page) && page > 0 ? Math.min(Math.floor(page), pageCount) : 1;
  const start = (current - 1) * safeSize;
  return { items: items.slice(start, start + safeSize), page: current, pageCount, total: items.length };
}

export function formatLearningDate(value: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "America/Mexico_City" }).format(date);
}

export function formatLearningDateTime(value: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(date);
}
