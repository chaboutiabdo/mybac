/**
 * Security checks against the LOCAL Supabase stack.
 *
 *   npx supabase start
 *   node --test scripts/check-security.mjs
 *
 * These assert RLS behaviour, which no amount of React testing can reach.
 * Every one of them failed before the Stage 1 migrations.
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?([^"]*)"?$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);

const URL_ = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PASSWORD = 'Test1234!';

const anon = () => createClient(URL_, KEY);

async function signIn(email) {
  const c = anon();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  assert.equal(error, null, `sign-in failed for ${email}: ${error?.message}`);
  return c;
}

let student, studentId, adminId;

before(async () => {
  student = await signIn('student@mybac.test');
  studentId = (await student.auth.getUser()).data.user.id;
  const admin = await signIn('admin@mybac.test');
  adminId = (await admin.auth.getUser()).data.user.id;
});

test('a student cannot promote themselves to admin', async () => {
  await student.from('profiles').update({ role: 'admin' }).eq('user_id', studentId);
  const { data } = await student.from('profiles').select('role').eq('user_id', studentId).single();
  assert.equal(data?.role, 'student', 'student escalated to admin');
});

test('a student cannot award points to another user', async () => {
  const { error } = await student.rpc('record_points_transaction', {
    p_student_id: adminId,
    p_points: 9999,
    p_source_type: 'quiz',
  });
  assert.notEqual(error, null, 'points RPC accepted a foreign student_id');
});

test('a student cannot inflate their own total_score directly', async () => {
  const before_ = (
    await student.from('profiles').select('total_score').eq('user_id', studentId).single()
  ).data?.total_score;
  await student.from('profiles').update({ total_score: 999999 }).eq('user_id', studentId);
  const after = (
    await student.from('profiles').select('total_score').eq('user_id', studentId).single()
  ).data?.total_score;
  assert.equal(after, before_, 'total_score was client-writable');
});

test('anonymous visitors cannot read the student roster', async () => {
  const { data } = await anon().from('profiles').select('email');
  assert.equal(data?.length ?? 0, 0, 'anon read student emails from profiles');
});

test('the leaderboard exposes no email address', async () => {
  const { data, error } = await student.from('leaderboard').select('*').limit(1);
  assert.equal(error, null, `leaderboard unreadable: ${error?.message}`);
  if (data?.length) {
    assert.ok(!('email' in data[0]), 'leaderboard leaks email');
    assert.ok(!('user_id' in data[0]), 'leaderboard leaks user_id');
  }
});
