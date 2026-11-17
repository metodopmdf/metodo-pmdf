// Método PMDF — testes do importador de cartões CFO/GST, sem rede.
'use strict';
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {gzipSync}=require('node:zlib');
const base=join(__dirname,'..');
const code=readFileSync(join(base,'assets/pmdf-anki-cfo-gst.js'),'utf8');
const app=readFileSync(join(base,'assets/pmdf-app.js'),'utf8');
const html=readFileSync(join(base,'index.html'),'utf8');
const css=readFileSync(join(base,'assets/pmdf-anki-cfo-gst.css'),'utf8');
new Function(code);new Function(app);
assert.match(html,/value="cfo-gst"/);
assert.match(html,/id="anki-cfo-import"/);
assert.match(html,/id="anki-cfo-disciplina"/);
assert.match(html,/id="anki-cfo-assunto"/);
assert(html.indexOf('pmdf-anki-cfo-gst.js')<html.indexOf('pmdf-app.js'));
assert.match(app,/if\(\$\('anki-source'\)\?\.value==='cfo-gst'\)return startAnkiImported\(\)/);
assert.match(app,/function startAnkiImported\(\)/);
assert.match(app,/getCardBox\(c.id\)/);
assert.match(app,/saveStudySession\(\)/);
assert.match(css,/\.anki-short-answer\{display:block;white-space:pre-line/);
assert.match(css,/#anki-cfo-controls\[hidden\]\{display:none!important\}/);
const doc={readyState:'loading',addEventListener() {},getElementById(){return null;}};
const win={};
new Function('window','document',code)(win,doc);
const engine=win.PMDFAnkiCFO;
assert(engine&&typeof engine.validate==='function');
const source={
 format:'PMDF-ANKI-IMPORT-v1',source:'ANKI CFO GST.zip',
 cards:[
  {id:'cfo-gst-1234567890123',disciplina:'Direito Penal',assunto:'Crime',front:'Julgue: crime X?',back:'✅ CERTO — teste.'},
  {id:'cfo-gst-1234567890124',disciplina:'Direito Administrativo',assunto:'Atos',front:'Julgue: ato Y?',back:'❌ ERRADO — teste.'}
 ]
};
assert.equal(engine.validate(source).cards.length,2);
assert.throws(()=>engine.validate({...source,cards:[source.cards[0],source.cards[0]]}),/inválido ou duplicado/i);
assert.throws(()=>engine.validate({...source,format:'other'}),/diferente/);
async function run(){
 const json=new File([JSON.stringify(source)],'anki-cfo.json',{type:'application/json'});
 const gz=new File([gzipSync(Buffer.from(JSON.stringify(source)))],'anki-cfo.json.gz',{type:'application/gzip'});
 assert.equal((await engine.readFile(json)).cards.length,2);
 assert.equal((await engine.readFile(gz)).cards.length,2);
 assert.equal(await engine.importFile(json),2);
 assert.equal((await engine.load()).cards.length,2);
 assert.equal((await engine.filtered()).length,2);
 console.log('ANKI CFO/GST QA PASS: integridade, JSON.GZ, filtros, interface, sintaxe e integração com Leitner.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
