/* QA estático do catálogo do concurso de Praça PMDF. */
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const script=fs.readFileSync(new URL('../assets/pmdf-catalogo-praca.js','file://'+__filename),'utf8');
const ctx={window:{}};vm.runInNewContext(script,ctx);
const cat=ctx.window.PMDF_PRACA_CATALOG,ds=cat.disciplinas;
assert.equal(ds.length,15);
assert.equal(ds.reduce((sum,d)=>sum+d.assuntos.length,0),163);
assert.ok(!ds.some(d=>/administra.ao geral/i.test(d.nome)));
const pa=ds.find(d=>d.nome==='Noções de Primeiros Socorros');
assert.equal(pa.assuntos.length,8);
assert.equal(ds.at(-1).nome,'Direito Processual Penal Militar');
for(const d of ds){
 assert.equal(d.assuntos.length,new Set(d.assuntos.map(a=>a.slug)).size);
 assert.ok(d.assuntos.every(a=>!!a.slug && !!a.nome));
}
assert.equal(cat.assunto(pa.slug,pa.assuntos[0].slug).nome,pa.assuntos[0].nome);
console.log('Catálogo Praça PMDF OK: 15 disciplinas e 163 tópicos.');
