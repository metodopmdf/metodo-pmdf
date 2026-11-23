import {copyFile, mkdir, rm, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');

await rm(output, {recursive:true, force:true});
await mkdir(resolve(output, 'assets'), {recursive:true});

await Promise.all([
  copyFile(resolve(root, 'comercial.html'), resolve(output, 'index.html')),
  copyFile(resolve(root, 'comercial.html'), resolve(output, 'comercial.html')),
  copyFile(resolve(root, 'termos-venda.html'), resolve(output, 'termos-venda.html')),
  copyFile(resolve(root, 'privacidade.html'), resolve(output, 'privacidade.html')),
  copyFile(resolve(root, 'assets', 'pmdf-comercial.css'), resolve(output, 'assets', 'pmdf-comercial.css')),
  copyFile(resolve(root, 'assets', 'pmdf-comercial.js'), resolve(output, 'assets', 'pmdf-comercial.js'))
]);

await writeFile(resolve(output, '_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
`, 'utf8');

await writeFile(resolve(output, '_redirects'), `/estudar  https://metodopmdf.github.io/metodo-pmdf/  302
/comercial.html  /  301
`, 'utf8');

console.log('Loja Hotmart preparada em dist/.');
