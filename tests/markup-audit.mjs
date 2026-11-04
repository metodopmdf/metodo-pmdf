// Auditoria estrutural: arquitetura, semântica, CSP, acessibilidade e integridade.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../assets/pmdf-app.js',import.meta.url),'utf8');
const guides=readFileSync(new URL('../assets/pmdf-guides.js',import.meta.url),'utf8');
const base=readFileSync(new URL('../assets/pmdf-tailwind.css',import.meta.url),'utf8');
const css=readFileSync(new URL('../assets/pmdf-components.css',import.meta.url),'utf8');
assert.match(html,/^<!doctype html>/i);
assert.match(html,/<html lang="pt-BR"/);
assert.match(html,/<meta name="viewport"/);
assert.match(html,/<meta name="description" content="[^"]{40,}"/);
assert.match(html,/<link rel="canonical" href="https:\/\/metodopmdf\.github\.io\/metodo-pmdf\/"/);
for(const item of ['og:type','og:title','og:description','og:url'])assert(html.includes('property="'+item+'"'),'Metadado ausente '+item);
for(const file of ['pmdf-tailwind.css','pmdf-components.css','pmdf-app.js','pmdf-guides.js','pmdf-neural-questions.js','pmdf-neural-flashcards.js'])assert(html.includes(file),'Arquivo não carregado '+file);
assert(base.length>25000&&css.length>50000&&app.length>300000&&guides.length>150000,'Arquivo extraído truncado');
assert(!/<style\b/i.test(html),'CSS inline encontrado');
assert(!/<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html),'JavaScript inline encontrado');
assert(!/\s(onclick|onchange|oninput|onsubmit|onkeydown|onkeyup)\s*=/i.test(html+app),'Eventos inline remanescentes');
assert.match(html,/<meta http-equiv="Content-Security-Policy"[^>]*script-src 'self'[^"]*script-src-attr 'none'/i,'Política CSP não restringe scripts inline');
assert.match(html,/<a href="#pmdf-main-content" class="pmdf-skip-link"/,'Link de salto ausente');
assert.match(html,/<main id="pmdf-main-content" tabindex="-1"/,'Marcação principal ausente');
assert.match(css,/:focus-visible/,'Foco visível ausente');
assert.match(css,/prefers-reduced-motion:reduce/,'Preferência de movimento não respeitada');
const ids=[...html.matchAll(/<[a-z][^>]*\bid="([^"]+)"/gi)].map(x=>x[1]);
assert.equal(ids.length,new Set(ids).size,'ID estático duplicado');
for(const [id,title] of [['prompt-modal','prompt-modal-heading'],['gen-modal','gen-title']]){
  assert.match(html,new RegExp('id="'+id+'" role="dialog" aria-modal="true" aria-labelledby="'+title+'"'),'Diálogo não acessível: '+id);
  assert(ids.includes(title),'Título do modal ausente: '+title);
}
for(const id of ['account-form','account-password-toggle','tab-btn-leis','tab-btn-questoes','tab-btn-anki','tab-btn-resultados','tab-btn-redacao','q-source','q-format','anki-start','essay-theme','toast-container'])assert(ids.includes(id),'Controle principal ausente: '+id);
for(const tag of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi))assert.match(tag[0],/rel="[^"]*noopener[^"]*"/i,'Link externo inseguro');
new Function(guides+'\n'+app);
for(const name of ['pmdfOpenDialog','pmdfCloseDialog','pmdfTrapDialog','pmdfDispatchSpecial','startQuestions','startAnki','toggleTheme','toggleAccountPassword','correctEssay'])
  assert(app.includes('function '+name+'(')||app.includes('async function '+name+'('),'Função indisponível: '+name);
assert(html.length<100000,'HTML de entrada excessivo (regressão de modularização)');
console.log('QA ESTRUTURAL PASS: módulos, CSP, SEO, ARIA, navegação e recursos preservados.');
