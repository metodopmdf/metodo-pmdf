// Regressão do resumo infográfico: cobertura, segurança textual e integração.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(base,'assets/pmdf-infographic.js'),'utf8');
const css=fs.readFileSync(path.join(base,'assets/pmdf-infographic.css'),'utf8');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const app=fs.readFileSync(path.join(base,'assets/pmdf-app.js'),'utf8');
const window={
 PMDFVisualEngine:{
  allRows:g=>['highIncidence','mediumIncidence','lowIncidence'].flatMap(k=>g.articlesMapping?.[k]||[]),
  illustration:()=>'<svg viewBox="0 0 10 10" aria-hidden="true"><circle cx="5" cy="5" r="3"/></svg>'
 }
};
new Function('window',source)(window);
const e=window.PMDFInfographicSummaries;
assert.equal(typeof e?.render,'function','Motor não exportado');
assert.equal(typeof e?.mount,'function');
assert.match(e.promptInstructions(),/PROMPT MESTRE/);
assert.match(e.promptInstructions(),/n[aã]o invente/i);
assert.match(html,/value="infographic"/);
assert(html.indexOf('pmdf-infographic.js')<html.indexOf('pmdf-app.js'),'Carregamento fora de ordem');
assert(html.includes('pmdf-infographic.css'));
assert(app.includes("SUMMARY_FORMAT==='infographic'"));
assert(app.includes('PMDFInfographicSummaries.render'));
assert(app.includes('PMDFInfographicSummaries?.mount'));
assert(app.includes('assets/pmdf-infographic.css?v='));
assert.match(css,/@media print/);
assert.match(css,/pmdf-info-sheet:not\(\.pmdf-info-active\)\{display:block!important\}/);
const g={
 lawName:'Documento de teste',
 executiveSummary:{centralObjective:'Objetivo extraído.',keyConcepts:['Diferenciar conceitos','Não inventar prazos']},
 articlesMapping:{highIncidence:[{article:'Art. 15',plainExplanation:'Somente se o requisito existir. Prazo de 10 dias.',practicalExample:'Exemplo fornecido.',sourceText:'Texto original literal e preservado.'}],
 mediumIncidence:[{article:'Art. 20',plainExplanation:'Regra diferente com 5 anos.'}],
 lowIncidence:[{article:'Tema desconhecido',plainExplanation:'Texto <img src=x onerror=alert(1)> & protegido.'}]},
 trapsAndJurisprudence:{examTraps:['Não confundir institutos diferentes.']}
};
for(const interactive of [true,false]){
 const out=e.render(g,{interactive});
 assert.equal((out.match(/data-info-sheet=/g)||[]).length,3);
 for(const value of ['Art. 15','Art. 20','Tema desconhecido','Exemplo fornecido.','Texto original literal','Prazo de 10 dias','Não confundir institutos diferentes.'])assert(out.includes(value),'Perdeu informação: '+value);
 assert(!out.includes('<img src=x onerror=alert(1)>'),'HTML do conteúdo não foi escapado');
 assert(out.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert(out.includes('10 dias'));
 assert.equal(out.includes('data-info-action="next"'),interactive);
}
const empty=e.render({lawName:'Vazio'},{interactive:true});
assert.match(empty,/sem tópicos estruturados/i);
const fallbackWindow={};
new Function('window',source)(fallbackWindow);
assert.equal((fallbackWindow.PMDFInfographicSummaries.render(g).match(/data-info-sheet=/g)||[]).length,3,'Motor depende obrigatoriamente do módulo visual');
console.log('INFOGRAPHIC QA PASS: prompt, cobertura integral, XSS, módulo, navegação estrutural e impressão.');
