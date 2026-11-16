import { redirect, fail } from '@sveltejs/kit';
import { ADMIN_EMAILS, ADMIN_API_KEY } from '$env/static/private';
import { PIANOLIFE_BACKEND_URL } from '$env/static/public';

const API = `${PIANOLIFE_BACKEND_URL || 'http://localhost:8000'}/api/results/admin/recruitments`;
const headers = { 'X-Admin-Key': ADMIN_API_KEY, 'Content-Type': 'application/json' };

async function guard(locals) {
  const session = await locals.auth();
  if (!session?.user) throw redirect(303, '/admin/login');
  const allowedEmails = (ADMIN_EMAILS || '').split(',').map(e => e.trim());
  if (!allowedEmails.includes(session.user.email || '')) throw redirect(303, '/admin/unauthorized');
  return session;
}

const errText = (status) =>
  status === 403 ? '관리자 키가 올바르지 않습니다 (ADMIN_API_KEY).'
  : status === 422 ? '입력값이 올바르지 않습니다. 이름(100자 이하)·생년월일(8자리)·결과(50자 이하)를 확인해 주세요.'
  : status === 404 ? '대상을 찾을 수 없습니다.'
  : `요청 실패 (${status})`;

/** @type {import('./$types').PageServerLoad} */
export async function load({ locals, fetch }) {
  const session = await guard(locals);

  let recruitments = [];
  let error = '';
  try {
    const res = await fetch(API, { headers });
    if (res.ok) recruitments = await res.json();
    else error = errText(res.status);
  } catch {
    error = '백엔드에 연결할 수 없습니다.';
  }

  return { user: session.user, recruitments, error };
}

async function call(fetch, path, method, body) {
  try {
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) return { error: errText(res.status) };
    return { data: await res.json() };
  } catch {
    return { error: '백엔드에 연결할 수 없습니다.' };
  }
}

function recruitmentBody(f) {
  return {
    title: String(f.get('title') || '').trim(),
    pass_message: String(f.get('pass_message') || ''),
    fail_message: String(f.get('fail_message') || ''),
    is_published: f.get('is_published') === 'on'
  };
}

// 모달에서 함께 보낸 CSV 행(선택). 없으면 null, 형식 오류면 undefined.
function parseRows(f) {
  const raw = String(f.get('rows') || '');
  if (!raw) return null;
  try {
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? rows : undefined;
  } catch {
    return undefined;
  }
}

// 공고 저장 후 (선택) CSV 가져오기. 공고가 저장된 뒤 가져오기만 실패하면 그 사실을 명시한다.
async function importAfterSave(fetch, id, rows) {
  if (!rows) return { saved: true };
  const r = await call(fetch, `/${id}/import`, 'POST', { rows });
  if (r.error) return fail(502, { error: `공고는 저장됐지만 CSV 가져오기에 실패했습니다 (${r.error}). 결과 관리에서 다시 가져와 주세요.` });
  return { saved: true, imported: r.data.imported, skipped: r.data.skipped };
}

/** @type {import('./$types').Actions} */
export const actions = {
  create: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const body = recruitmentBody(f);
    if (!body.title) return fail(400, { error: '제목을 입력해 주세요.' });
    const rows = parseRows(f);
    if (rows === undefined) return fail(400, { error: '잘못된 CSV 데이터입니다.' });
    const r = await call(fetch, '', 'POST', body);
    if (r.error) return fail(502, { error: r.error });
    return importAfterSave(fetch, r.data.id, rows);
  },
  update: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const body = recruitmentBody(f);
    if (!body.title) return fail(400, { error: '제목을 입력해 주세요.' });
    const rows = parseRows(f);
    if (rows === undefined) return fail(400, { error: '잘못된 CSV 데이터입니다.' });
    const id = Number(f.get('id'));
    const r = await call(fetch, `/${id}`, 'PUT', body);
    if (r.error) return fail(502, { error: r.error });
    return importAfterSave(fetch, id, rows);
  },
  delete: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const r = await call(fetch, `/${Number(f.get('id'))}`, 'DELETE');
    if (r.error) return fail(502, { error: r.error });
    return { deleted: true };
  },
  // 모달 안 결과 행 관리: 클라이언트가 fetch로 호출하고 로컬 상태를 갱신한다
  rows: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const r = await call(fetch, `/${Number(f.get('id'))}`, 'GET');
    if (r.error) return fail(502, { error: r.error });
    return { rows: r.data.rows };
  },
  rowAdd: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const r = await call(fetch, `/${Number(f.get('id'))}/rows`, 'POST', {
      name: String(f.get('name') || ''),
      birth: String(f.get('birth') || ''),
      result: String(f.get('result') || '')
    });
    if (r.error) return fail(502, { error: r.error });
    return { row: r.data };
  },
  rowUpdate: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const body = {};
    for (const k of ['name', 'birth', 'result']) if (f.has(k)) body[k] = String(f.get(k));
    const r = await call(fetch, `/${Number(f.get('id'))}/rows/${Number(f.get('rowId'))}`, 'PUT', body);
    if (r.error) return fail(502, { error: r.error });
    return { row: r.data };
  },
  rowDelete: async ({ locals, request, fetch }) => {
    await guard(locals);
    const f = await request.formData();
    const r = await call(fetch, `/${Number(f.get('id'))}/rows/${Number(f.get('rowId'))}`, 'DELETE');
    if (r.error) return fail(502, { error: r.error });
    return { row: r.data };
  }
};
