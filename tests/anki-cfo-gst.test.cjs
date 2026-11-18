// Método PMDF — Acervo ANKI integrado: testes sem upload e sem rede.
'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'..');
const code=readFileSync(join(root,'assets/pmdf-anki-cfo-gst.js'),'utf8');
const app=readFileSync(join(root,'assets/pmdf-app.js'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');
const css=readFileSync(join(root,'assets/pmdf-anki-cfo-gst.css'),'utf8');
const data=JSON.parse(readFileSync(join(root,'assets/bancos/anki.json'),'utf8'));
new Function(code);new Function(app);
assert.match(html,/<option value="cfo-gst">📚 ANKI<\/option>/);
assert.match(html,/<strong>ANKI<\/strong>/);
assert(!html.includes('id="anki-cfo-import"'),'O formulário de upload não deve aparecer');
assert(!/ANKI CFO GST|Acervo ANKI CFO|Banco ANKI CFO/.test(html),'Nomes antigos não podem aparecer na interface');
assert(!/ANKI CFO GST|Acervo ANKI CFO|Banco ANKI CFO/.test(app),'Nome antigo não pode aparecer no app');
assert(html.indexOf('pmdf-anki-cfo-gst.js')<html.indexOf('pmdf-app.js'));
assert.match(code,/assets\/bancos\/anki\.json\?v=/,'O módulo deve buscar o asset publicado');
assert(!/importFile\(|readFile\(/.test(code),'Importação pelo visitante não é mais necessária');
assert.match(app,/if\(\$\('anki-source'\)\?\.value==='cfo-gst'\)return startAnkiImported\(\)/);
assert.match(app,/getCardBox\(c.id\)/);
assert.match(app,/saveStudySession\(\)/);
assert.match(css,/#anki-cfo-controls\[hidden\]\{display:none!important\}/);
assert.equal(data.format,'PMDF-ANKI-IMPORT-v1');
assert.equal(data.source,'ANKI');
assert.equal(data.cards.length,2624,'Todos os cartões devem estar publicados');

assert.equal(data.revision,'2026-11-17-anki-editorial-v3');
assert.equal(data.stats.editorial.corrected_cards,116);
assert.equal(data.stats.editorial.incomplete_source_cards,3);
assert.equal(data.stats.editorial.semantic_answers_changed,0);
const incomplete=data.cards.filter(c=>c.flags?.includes('texto_incompleto_na_fonte'));
assert.equal(incomplete.length,3,'Os trechos sem conclusão segura devem ser sinalizados');
for(const field of ['front','back']){
 const missing=data.cards.filter(c=>/[\p{L}\p{N}]$/u.test(c[field]));
 assert(missing.every(c=>incomplete.some(x=>x.id===c.id)),'Restou pontuação ausente fora dos trechos truncados');
 for(const card of data.cards){
  assert(!/\bex:(?=\s|\))/i.test(card[field]),'Abreviação inadequada: '+card.id);
  assert(!/§\d/.test(card[field]),'Espaçamento da referência jurídica inadequado: '+card.id);
 }
}
assert.match(app,/function renderAnkiImportedCard\(c,revealed\)/);
assert.match(app,/anki-imported-verdict/);
assert.match(app,/anki-imported-statement/);
assert.match(app,/anki-imported-commentary/);
assert.match(app,/anki-visual-card-imported/);
assert.match(css,/\.anki-imported-statement\{[\s\S]*?font:470 15px\/1\.72/);
assert.match(css,/\.anki-imported-commentary p\{[\s\S]*?font:450 14px\/1\.75/);
assert.match(css,/@media\(max-width:760px\)/);
const styleLinks=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
assert.match(styleLinks.at(-1),/pmdf-anki-cfo-gst\.css\?v=20261117-anki-editorial-v3/);
assert.match(code,/anki\.json\?v=20261117-anki-editorial-v3/);

assert.equal(new Set(data.cards.map(c=>c.id)).size,2624,'IDs não devem ser alterados nem duplicados');
assert.equal(new Set(data.cards.map(c=>c.disciplina)).size,22);
assert.equal(new Set(data.cards.map(c=>c.disciplina+'|'+c.assunto)).size,130);
for(const id of ['cfo-gst-1769883524183','cfo-gst-1770831722684']){
 const card=data.cards.find(c=>c.id===id);
 assert(card&&card.answer==='CERTO'&&card.reviewed_source,'Correção documentada ausente: '+id);
}
const options=(value='')=>({
 value,children:[],
 replaceChildren(...args){this.children=[...args];},
 append(x){this.children.push(x);}
});
const controls={
 'anki-source':{value:'cfo-gst'},
 'anki-cfo-controls':{hidden:true},
 'anki-start':{textContent:''},
 'anki-generation-mode':{disabled:false},
 'anki-card-style':{disabled:false},
 'anki-cfo-status':{textContent:'',dataset:{}},
 'anki-cfo-disciplina':options(),
 'anki-cfo-assunto':options()
};
const fakeDocument={
 readyState:'loading',
 baseURI:'https://metodopmdf.github.io/metodo-pmdf/',
 addEventListener(){},
 getElementById(id){return controls[id]||null;}
};
class FakeOption{constructor(label,value){this.label=label;this.value=value;}}
let fetchCount=0,lastUrl='';
const browser={
 fetch:async url=>{
  fetchCount++;lastUrl=url;
  return {ok:true,status:200,json:async()=>data};
 }
};
new Function('window','document','Option',code)(browser,fakeDocument,FakeOption);
const api=browser.PMDFAnkiCFO;
assert(api&&typeof api.load==='function');
async function run(){
 assert.equal((await api.load()).cards.length,2624);
 assert.equal((await api.load()).cards.length,2624);
 assert.equal(fetchCount,1,'O banco deve carregar somente uma vez por aba');
 assert.match(lastUrl,/\/metodo-pmdf\/assets\/bancos\/anki\.json\?v=/);
 assert.equal(controls['anki-cfo-disciplina'].children.length,23);
 assert.equal((await api.filtered()).length,2624);
 const first=data.cards[0];
 controls['anki-cfo-disciplina'].value=first.disciplina;
 const byDiscipline=await api.filtered();
 assert(byDiscipline.length>0&&byDiscipline.length<2624);
 assert(byDiscipline.every(x=>x.disciplina===first.disciplina));
 controls['anki-cfo-assunto'].value=first.assunto;
 const byTopic=await api.filtered();
 assert(byTopic.length>0&&byTopic.every(x=>x.assunto===first.assunto&&x.disciplina===first.disciplina));
 api.reset();
 assert.equal((await api.filtered()).length,2624);
 api.showFilter();
 assert.equal(controls['anki-start'].textContent,'Iniciar revisão ANKI');
 assert.equal(controls['anki-cfo-controls'].hidden,false);
 assert.equal(controls['anki-generation-mode'].disabled,true);
 assert.match(controls['anki-cfo-status'].textContent,/2\.624 cartões disponíveis/);
 console.log('ANKI EDITORIAL QA PASS: 2624 cartões, 116 correções, 3 fontes truncadas, contraste, fontes compactas, filtros e Leitner.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
