import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { invitationExpiresAt, invitationIsUsable, parseInvitationAccount } from '../src/lib/auth/invitation.ts';

test('invitation remains valid until exactly 24 hours, then expires', () => {
  const now = Date.parse('2026-11-13T18:00:00Z');
  const invitation = { email: 'Invite@Example.com', status: 'pending', expires_at: invitationExpiresAt(now) };
  assert.equal(invitation.expires_at, '2026-11-14T18:00:00.000Z');
  assert.equal(invitationIsUsable(invitation, 'invite@example.com', now + 86400000 - 1), true);
  assert.equal(invitationIsUsable(invitation, 'invite@example.com', now + 86400000), false);
});

test('wrong email, revoked, used and malformed expiry never grant membership', () => {
  const invitation = { email: 'invite@example.com', status: 'pending', expires_at: invitationExpiresAt() };
  assert.equal(invitationIsUsable(invitation, 'other@example.com'), false);
  for (const status of ['accepted', 'revoked', 'expired']) assert.equal(invitationIsUsable({ ...invitation, status }, invitation.email), false);
  assert.equal(invitationIsUsable({ ...invitation, expires_at: 'invalid' }, invitation.email), false);
});

function account(overrides = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ email: ' INVITE@example.com ', full_name: ' María  López ', password: 'test-password-123', code: '1234 5678', ...overrides })) form.set(key, value);
  return form;
}

test('account input normalizes email, name and pasted code without trimming password', () => {
  const result = parseInvitationAccount(account({ password: ' test-password-123 ' }));
  assert.deepEqual(result, { email: 'invite@example.com', fullName: 'María López', password: ' test-password-123 ', code: '12345678' });
});

test('invalid account details and code are rejected before calling Auth', () => {
  for (const override of [{ email: 'bad' }, { full_name: 'A' }, { password: 'short' }, { password: 'a'.repeat(129) }, { code: '' }, { code: 'bad-token' }, { code: '12345' }]) {
    assert.ok('error' in parseInvitationAccount(account(override)));
  }
});

test('invitation email contains a code and no sign-in links', async () => {
  const template = await readFile(new URL('../supabase/templates/invite.html', import.meta.url), 'utf8');
  assert.ok(template.includes('{{ .Token }}'));
  assert.ok(template.includes('24 horas'));
  assert.doesNotMatch(template, /ConfirmationURL|TokenHash|RedirectTo|href\s*=/i);
});
