// Auditoria estrutural estática: Node 22, sem dependências externas.
// Abrange SEO, acessibilidade básica, segurança de links, preservação do app e sintaxe.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const beforeMainScript = html.slice(0, html.lastIndexOf('<script>'));
assert(html.length > 500_000, 'HTML truncado ou substituído por versão parcial');
assert.match(html, /^<!doctype html>/i, 'DOCTYPE HTML5 ausente');
assert.match(html, /<html lang="pt-BR"/i, 'Idioma da página incorreto');
assert.match(beforeMainScript, /<meta name="viewport"/i, 'Viewport ausente');
assert.match(beforeMainScript, /<meta name="description" content="[^"]{40,}"/i, 'SEO: descrição ausente');
assert.match(beforeMainScript, /<link rel="canonical" href="https:\/\/metodopmdf\.github\.io\/metodo-pmdf\/"/i, 'URL canônica ausente');
for (const meta of ['og:type','og:title','og:description','og:url']) {
  assert(beforeMainScript.includes('property="'+meta+'"'), 'Open Graph ausente: '+meta);
}
assert(beforeMainScript.includes('name="theme-color" id="pmdf-theme-color"'), 'Cor do navegador não é configurável');
assert.match(beforeMainScript, /<script defer src="https:\/\/unpkg\.com\/lucide@1\.66\.0"/, 'Biblioteca de ícones deve carregar com defer');
assert.match(beforeMainScript, /<a href="#pmdf-main-content" class="pmdf-skip-link"/, 'Atalho de navegação por teclado ausente');
assert.match(beforeMainScript, /<main id="pmdf-main-content" tabindex="-1"/, 'Marco do conteúdo principal sem destino de foco');
assert.match(beforeMainScript, /:focus-visible/, 'Estilos de foco por teclado ausentes');
assert.match(beforeMainScript, /prefers-reduced-motion:reduce/, 'Preferência de movimento reduzido ignorada');

const idMatches = [...beforeMainScript.matchAll(/<[a-z][^>]*\bid="([^"]+)"/gi)];
const ids = idMatches.map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs HTML duplicados na marcação estática');
for (const [id,heading] of [['prompt-modal','prompt-modal-heading'],['gen-modal','gen-title']]) {
  assert.match(beforeMainScript, new RegExp('<div id="'+id+'" role="dialog" aria-modal="true" aria-labelledby="'+heading+'"'), 'Modal inacessível: '+id);
  assert(ids.includes(heading), 'Título do diálogo ausente: '+heading);
}
assert.match(beforeMainScript, /id="toast-container" role="region" aria-label="Notificações do sistema" aria-live="polite"/, 'Avisos não anunciados aos leitores de tela');
assert.match(beforeMainScript, /id="account-password-toggle"[^>]*aria-label="Mostrar senha"/, 'Botão de senha sem rótulo acessível');
assert.match(beforeMainScript, /id="account-form"/, 'Formulário de autenticação ausente');
for (const tag of beforeMainScript.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
  assert.match(tag[0], /rel="[^"]*noopener[^"]*"/i, 'Link externo sem proteção contra tabnabbing');
}
for (const id of ['tab-btn-leis','tab-btn-questoes','tab-btn-anki','tab-btn-resultados','tab-btn-redacao','q-source','q-format','anki-start','essay-theme']) {
  assert(ids.includes(id), 'Controle principal desapareceu: '+id);
}
for (const externalJs of ['assets/pmdf-neural-questions.js','assets/pmdf-neural-flashcards.js']) {
  assert(beforeMainScript.includes(externalJs), 'Motor de estudo ausente: '+externalJs);
}
const inlineScripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert(inlineScripts.length >= 1, 'Script de aplicação não encontrado');
new Function(inlineScripts.at(-1)[1]);
for (const name of ['pmdfOpenDialog','pmdfCloseDialog','pmdfTrapDialog','startQuestions','startAnki','toggleTheme','toggleAccountPassword','correctEssay']) {
  assert(html.includes('function '+name+'(') || html.includes('async function '+name+'('), 'Função essencial ausente: '+name);
}
console.log('QA ESTRUTURAL PASS: HTML integral, SEO, acessibilidade, IDs, links e módulos de estudo.');
