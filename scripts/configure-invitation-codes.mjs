// node --env-file=.env.local scripts/configure-invitation-codes.mjs [--apply]
// Uses the authorized Supabase credential in memory; never prints credentials/config secrets.
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
if (project !== 'qqhyqkklvlngcbyjdwfb') throw new Error('El proyecto no es invencibles-boss.');
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  const stored = JSON.parse(execFileSync('security', ['find-generic-password', '-s', 'Codex MCP Credentials', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  if (stored.server_name !== 'supabase') throw new Error('No encontramos la conexión de Supabase.');
  token = stored.token_response.access_token;
}
const endpoint = `https://api.supabase.com/v1/projects/${project}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
async function request(method, body) {
  const response = await fetch(endpoint, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Supabase Auth config: HTTP ${response.status}. Requiere auth:read y auth:write; no se cambió la configuración.`);
  return response.json();
}
const next = {
  mailer_otp_exp: 86400,
  mailer_subjects_invite: 'Tu código de invitación · Invencibles Boss',
  mailer_templates_invite_content: await readFile(new URL('../supabase/templates/invite.html', import.meta.url), 'utf8'),
};
if (!next.mailer_templates_invite_content.includes('{{ .Token }}') || /ConfirmationURL|TokenHash|RedirectTo|href\s*=/i.test(next.mailer_templates_invite_content)) throw new Error('La plantilla debe incluir solo el código, sin enlaces.');
const current = await request('GET');
const previous = Object.fromEntries(Object.keys(next).map((key) => [key, current[key]]));
if (process.argv.includes('--apply')) {
  const backup = await mkdtemp(join(tmpdir(), 'invencibles-invite-config-'));
  await writeFile(join(backup, 'previous.json'), JSON.stringify(previous, null, 2), { mode: 0o600 });
  await request('PATCH', next);
  const actual = await request('GET');
  if (Object.entries(next).some(([key, value]) => actual[key] !== value)) throw new Error('No coincide la configuración aplicada.');
  const localPath = new URL('../.env.local', import.meta.url);
  const env = await readFile(localPath, 'utf8');
  const enabled = /^INVITATION_CODES_READY=.*$/m.test(env)
    ? env.replace(/^INVITATION_CODES_READY=.*$/m, 'INVITATION_CODES_READY=true')
    : `${env.trimEnd()}\nINVITATION_CODES_READY=true\n`;
  await writeFile(localPath, enabled, { mode: 0o600 });
  console.log(JSON.stringify({ applied: true, expiryHours: 24, templateWithoutLinks: true, backup }));
} else {
  console.log(JSON.stringify({ applied: false, expiryHours: Number(current.mailer_otp_exp) / 3600, matchesRequestedConfig: Object.entries(next).every(([key, value]) => current[key] === value) }));
}
