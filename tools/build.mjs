// 원본 HTML을 비밀번호로 암호화해서 index.html 로 만든다.
//   node tools/build.mjs      (비밀번호는 상위 폴더의 .guide-pass 에서 읽음)
// 저장소에는 암호문만 올라가고, 비밀번호와 원본은 올라가지 않는다.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = join(dirname(fileURLToPath(import.meta.url)), '..');
// 상위 폴더에 있는 HTML 파일 하나를 원본으로 쓴다
const htmls = readdirSync(join(SITE, '..')).filter(f => f.endsWith('.html'));
if (htmls.length !== 1) throw new Error('상위 폴더에 HTML 원본이 정확히 1개 있어야 합니다: ' + htmls.join(', '));
const SOURCE = join(SITE, '..', htmls[0]);
const ITER = 600000;

const pass = readFileSync(join(SITE, '..', '.guide-pass'), 'utf8').trim();
if (pass.length < 8) throw new Error('비밀번호는 8자 이상이어야 합니다 (.guide-pass)');
const salt = Buffer.from(readFileSync(join(SITE, 'tools', 'salt.txt'), 'utf8').trim(), 'base64');

const html = readFileSync(SOURCE, 'utf8');
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(html));

const payload = JSON.stringify({
  v: 1, iter: ITER,
  salt: salt.toString('base64'),
  iv: Buffer.from(iv).toString('base64'),
  ct: Buffer.from(ct).toString('base64'),
});

// 되풀어 보고 원본과 같은지 확인
const back = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
if (back !== html) throw new Error('암호화 검증 실패');

const lock = readFileSync(join(SITE, 'tools', 'lock.html'), 'utf8');
writeFileSync(join(SITE, 'index.html'), lock.replace('__PAYLOAD__', () => payload));
console.log(`index.html 생성 완료 (원본 ${html.length}자, 암호문 ${payload.length}자)`);
