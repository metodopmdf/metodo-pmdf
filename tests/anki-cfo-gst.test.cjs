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
 console.log('ANKI INTEGRADO QA PASS: 2624 cartões, 22 disciplinas, 130 tópicos, fonte local publicada, sem upload, filtros e Leitner.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
