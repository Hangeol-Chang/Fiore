import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { render } from 'svelte/server';
import { prefersReducedMotion } from '../src/lib/utils/motion.js';

let server;
const load = async (path) => (await server.ssrLoadModule(path)).default;
const html = (C, props) => render(C, { props }).body;

before(async () => {
	server = await createServer({
		configFile: false,
		mode: 'production',
		plugins: [svelte({ compilerOptions: { dev: false }, hot: false })],
		server: { middlewareMode: true },
		appType: 'custom',
		logLevel: 'silent'
	});
});
after(async () => server?.close());

test('모션 줄이기: SSR(window 없음)에서는 false', () => {
	assert.equal(prefersReducedMotion(), false);
});

test('모션 줄이기: matchMedia가 reduce면 true', () => {
	globalThis.window = { matchMedia: () => ({ matches: true }) };
	try {
		assert.equal(prefersReducedMotion(), true);
	} finally {
		delete globalThis.window;
	}
});

test('모션 줄이기: tokens.css가 reduce에서 --dur-*를 0s로 만든다', () => {
	const css = readFileSync(new URL('../src/lib/styles/tokens.css', import.meta.url), 'utf8');
	const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\}\s*\}/)?.[0] ?? '';
	assert.match(block, /--dur-fast:\s*0s/);
	assert.match(block, /--dur-slow:\s*0s/);
});

test('토큰: 붉은색 변수와 그라데이션·그림자가 없다', () => {
	const css = readFileSync(new URL('../src/lib/styles/tokens.css', import.meta.url), 'utf8');
	assert.doesNotMatch(css, /gradient|box-shadow|drop-shadow|\bred\b|crimson|#f00\b/i);
	for (const f of ['Button', 'TextField', 'StatusMessage']) {
		const src = readFileSync(new URL(`../src/lib/components/ui/${f}.svelte`, import.meta.url), 'utf8');
		assert.doesNotMatch(src, /gradient|box-shadow|drop-shadow|\bred\b/i, f);
	}
});

test('버튼: href가 있으면 <a>, 없으면 <button>', async () => {
	const Button = await load('/src/lib/components/ui/Button.svelte');
	const children = () => {};
	assert.match(html(Button, { href: '/x', children }), /<a /);
	assert.match(html(Button, { children }), /<button /);
	assert.match(html(Button, { children }), /type="button"/);
});

test('버튼: 알 수 없는 variant는 primary로 처리한다', async () => {
	const Button = await load('/src/lib/components/ui/Button.svelte');
	assert.match(html(Button, { variant: 'nope', children: () => {} }), /class="btn primary/);
	assert.match(html(Button, { variant: 'secondary', children: () => {} }), /class="btn secondary/);
});

test('입력: error가 있으면 에러 상태가 보이고, 없으면 보이지 않는다', async () => {
	const TextField = await load('/src/lib/components/ui/TextField.svelte');
	const withError = html(TextField, { label: '이름', error: '다시 입력해 주세요' });
	assert.match(withError, /다시 입력해 주세요/);
	assert.match(withError, /role="alert"/);
	assert.doesNotMatch(html(TextField, { label: '이름', error: '' }), /role="alert"/);
	assert.match(withError, /aria-invalid="true"/);
	const id = withError.match(/<input[^>]* id="([^"]+)"/)?.[1];
	assert.ok(id);
	assert.match(withError, new RegExp(`aria-describedby="${id}-err"`));
	assert.match(withError, new RegExp(`id="${id}-err"`));
	assert.match(withError, new RegExp(`<label for="${id}"`));
});

test('입력: multiline이면 textarea, 아니면 input', async () => {
	const TextField = await load('/src/lib/components/ui/TextField.svelte');
	assert.match(html(TextField, { label: 'a', multiline: true }), /<textarea/);
	assert.doesNotMatch(html(TextField, { label: 'a', multiline: true }), /<input/);
	assert.match(html(TextField, { label: 'a' }), /<input/);
});

test('입력: 호출자가 id를 넘겨도 라벨 연결이 깨지지 않는다', async () => {
	const TextField = await load('/src/lib/components/ui/TextField.svelte');
	const out = html(TextField, { label: 'a', id: 'hijack' });
	const id = out.match(/<input[^>]* id="([^"]+)"/)?.[1];
	assert.notEqual(id, 'hijack');
	assert.match(out, new RegExp(`<label for="${id}"`));
});

test('입력: 라벨이 항상 렌더링된다', async () => {
	const TextField = await load('/src/lib/components/ui/TextField.svelte');
	assert.match(html(TextField, { label: '이메일', value: '입력됨' }), /이메일/);
});

test('상태: 네 종류가 서로 다르게 렌더링되고 알 수 없는 kind는 empty', async () => {
	const StatusMessage = await load('/src/lib/components/ui/StatusMessage.svelte');
	const out = Object.fromEntries(
		['success', 'warning', 'error', 'empty', 'nope'].map((kind) => [kind, html(StatusMessage, { kind, message: 'm' })])
	);
	assert.match(out.success, /class="status success/);
	assert.match(out.warning, /class="status warning/);
	assert.match(out.error, /class="status error/);
	assert.match(out.empty, /class="status empty/);
	assert.match(out.nope, /class="status empty/);
	assert.doesNotMatch(out.empty, /<svg/);
	for (const k of ['success', 'warning', 'error']) assert.match(out[k], /<svg/);
});
