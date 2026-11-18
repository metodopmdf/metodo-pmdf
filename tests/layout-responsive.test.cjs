// Auditoria visual da camada de compatibilização sem tocar nas regras de negócio.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/pmdf-layout-20261118.css'),'utf8');
const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
const layout=styles.findIndex(x=>x.includes('pmdf-layout-20261118.css?v=20261118-ui-v1'));
const acervo=styles.findIndex(x=>x.includes('pmdf-acervo-interativo.css'));
const infographic=styles.findIndex(x=>x.includes('pmdf-infographic.css'));
const anki=styles.findIndex(x=>x.includes('pmdf-anki-cfo-gst.css'));
assert(acervo>=0&&acervo<layout&&layout<infographic&&infographic<anki,
  'A cascata visual deve manter: acervo → layout → infográfico → ANKI');
assert.equal((html.match(/pmdf-layout-20261118\.css/g)||[]).length,1,'Folha deve ser importada uma vez');
for(const id of ['tab-btn-leis','tab-btn-acervo','tab-btn-anki','tab-btn-redacao',
 'summary-format-toolbar','acervo-hits','acervo-wrong','acervo-pct','pmdf-primary-jump']){
 assert(html.includes('id="'+id+'"'),'Controle alterado ou removido: '+id);
}
for(const match of [
 /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)!important/,
 /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/,
 /#export-toolbar\.pmdf-reading-bar/,
 /#summary-format-toolbar/,
 /#acervo-shell \.acervo-upload:focus-within/,
 /body\[data-theme="light"\]/,
 /prefers-reduced-motion:reduce/,
 /@media screen/,
 /:focus-visible/
])assert.match(css,match,'Compatibilização visual ausente: '+match);
assert(!/data-pmdf-onclick|fetch\(|localStorage|innerHTML/.test(css),
 'Camada de estilo não deve conter mecanismos de negócio');
console.log('LAYOUT QA PASS: menu 4/2, cascata, seletor, contraste, foco e movimento reduzido.');
