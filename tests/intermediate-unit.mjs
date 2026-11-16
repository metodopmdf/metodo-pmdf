/** QA atual do Método PMDF — 3 módulos públicos, 5 formatos, 26 guias e temas.
 * Executa com Node, sem rede, sem Supabase e sem conta real.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),app=read('assets/pmdf-app.js');
const guidesJs=read('assets/pmdf-guides.js'),visualJs=read('assets/pmdf-visual-engine.js');
const summaryJs=read('assets/pmdf-summary-editorial.js');
const clozeJs=read('assets/pmdf-cloze-strategic.js');
const neuralJs=read('assets/pmdf-neural-questions.js');
const flashJs=read('assets/pmdf-neural-flashcards.js');
const questionsJs=read('assets/pmdf-flashcards-perguntas.js');
const styles=['assets/pmdf-components.css','assets/pmdf-summary-editorial.css',
 'assets/pmdf-cloze-strategic.css','assets/pmdf-flashcards-visual.css',
 'assets/pmdf-flashcards-questions.css','assets/pmdf-ui-intermediate-20261116.css',
 'assets/pmdf-anki-visual-failsafe.css'];
let checks=0;
const check=(value,msg)=>{assert(value,msg);checks++};
for(const [p,js]of [['app',app],['guides',guidesJs],['visual',visualJs],['resumos',summaryJs],
 ['lacunas',clozeJs],['rede',neuralJs],['flashcards',flashJs],['perguntas',questionsJs]]){
 assert.doesNotThrow(()=>new Function(js),'Erro de sintaxe em '+p);checks++;
}
check(!/<style\b/i.test(html),'CSS inline não pode impedir a auditoria de markup');
check(!/<script\b(?![^>]*\bsrc=)[^>]*>/.test(html),'Script inline viola a política CSP');
const files=[...html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="(assets\/[^"?#]+)/g)].map(x=>x[1]);
for(const f of files)check(read(f).length>0,'Recurso referenciado inexistente: '+f);
for(const f of styles){
 const css=read(f);
 check(css.length>1500,'CSS indevidamente vazio: '+f);
 check((css.match(/\{/g)||[]).length===(css.match(/\}/g)||[]).length,'Chaves CSS: '+f);
}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
check(ids.length===new Set(ids).size,'IDs estáticos repetidos');
check(html.includes('pmdf-anki-export-details')&&html.includes('pmdf-anki-method-help'),'Menu de exportação/contexto ausente');
for(const id of ['anki-export-csv','anki-export-tsv','anki-export-cloze','anki-export-basic',
 'anki-start','anki-stop','summary-format-toolbar','essay-theme','essay-text','essay-btn',
 'source-tab-url','source-tab-text','source-tab-file','generate-btn','pmdf-law-search']){
 check(ids.includes(id),'Função alterada ou controle removido: '+id);
}
const active=['leis','anki','redacao'],paused=['questoes','resultados'];
for(const k of active)check(new RegExp('id="tab-btn-'+k+'"[^>]*role="tab"').test(html)&&
 !new RegExp('id="tab-btn-'+k+'"[^>]*hidden').test(html),'Aba ativa inválida: '+k);
for(const k of paused)check(new RegExp('id="tab-btn-'+k+'"[^>]*hidden').test(html),
 'Aba pausada exposta: '+k);
const options=['full','bullets','flash','visual','cloze'];
check(options.every(x=>html.includes('<option value="'+x+'">')),'Formatos de resumo faltando');
check(!html.includes('<option value="table">')&&!html.includes('<option value="mind">'),'Formato removido voltou');
check(html.includes('pmdf-ui-intermediate-20261116.css'),'Novo layout não carregado');
check(html.indexOf('pmdf-summary-editorial.js')<html.indexOf('pmdf-app.js'),'Ordem dos scripts inválida');
check(app.includes("if(format==='table')format='bullets'"),'Preferências antigas sem migração');
check(app.includes("if(t==='questoes'||t==='resultados')t='leis'"),'Abas pausadas podem abrir');
check(app.includes("if(result?.cards?.length)return result.cards;"),'Fallback de flashcards não garantido');
check(app.includes("if(Array.isArray(built?.cards)&&built.cards.length)"),'Baralho clássico pode retornar vazio');
check(app.includes('pmdfFocusPrimary')&&app.includes("ancestor.tagName==='DETAILS'"),'Foco no botão principal falhou');
check(app.includes("for(let first=0;first<cards.length;first+=24)"),'Paginação do baralho não preservada');
const root={};
for(const script of [neuralJs,flashJs,questionsJs,clozeJs,visualJs,summaryJs])
 new Function('window',script)(root);
const builtins=new Function(guidesJs+';return BUILTIN_PMDF_GUIDES;')();
const extra=[...app.matchAll(/Object\.assign\(BUILTIN_PMDF_GUIDES,\s*(\{[^\n]*\})\);/g)];
for(const m of extra)Object.assign(builtins,JSON.parse(m[1]));
check(Object.keys(builtins).length>=22,'Cobertura do catálogo abaixo de 22 leis');
let fullCount=0,outlineCount=0,visualCount=0,clozeCount=0,flashCount=0;
const encode=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
for(const [key,guide]of Object.entries(builtins)){
 const rows=root.PMDFStrategicSummaries.rows(guide);
 const full=root.PMDFStrategicSummaries.render(guide,{format:'full'});
 const outline=root.PMDFStrategicSummaries.render(guide,{format:'bullets'});
 const original=Object.values(guide.articlesMapping||{}).filter(Array.isArray)
  .flat().filter(x=>x&&(x.plainExplanation||x.sourceText));
 check(rows.length===original.length,'Fonte com artigos omitidos: '+key);
 check(rows.every(x=>full.includes(encode(x.name))&&outline.includes(encode(x.name))),
  'Artigos não renderizados: '+key);
 check(full.includes('Edição Integral')&&outline.includes('Edição Aprofundada'),
  'Formato de resumo incorreto: '+key);
 fullCount+=rows.length;outlineCount+=rows.length;
 const visual=root.PMDFVisualEngine.render(guide,{interactive:true});
 check(visual.length>900&&visual.includes(guide.lawName),'Visual vazio: '+key);visualCount++;
 const gaps=root.PMDFClozeStrategic.build(guide,{level:'intermediario'});
 check(Array.isArray(gaps.cards),'Lacunas falharam: '+key);
 for(const card of gaps.cards)check(card.tokens.every(tok=>card.source.includes(tok.value)),
  'Resposta inventada: '+key);
 clozeCount+=gaps.cards.length;
 const generated=root.PMDFNeuralFlashcards.build(guide,{style:'questions',level:'intermediario'});
 check(Array.isArray(generated.cards),'Perguntas falharam: '+key);
 flashCount+=generated.cards.length;
}
check(fullCount>70,'Cobertura de tópicos ficou muito pequena');
check(visualCount===Object.keys(builtins).length,'Falta guia visual');
check(root.PMDFStrategicSummaries.rows({lawName:'Vazio',articlesMapping:{}}).length===0,
 'Guia sem conteúdo deve continuar válido');
const htmlUnsafe=root.PMDFStrategicSummaries.render({lawName:'<script>não</script>',
 articlesMapping:{highIncidence:[{article:'<img src=x onerror=a()>',plainExplanation:'<svg onload=a()>'}]}});
check(!htmlUnsafe.includes('<script>')&&!htmlUnsafe.includes('<img '),'Entrada insegura no resumo');
const summaryCss=read('assets/pmdf-summary-editorial.css');
check(summaryCss.includes('@media print')&&summaryCss.includes('@media(max-width:650px)'),'Impressão e mobile dos resumos ausentes');
const uiCss=read('assets/pmdf-ui-intermediate-20261116.css');
check(uiCss.includes('grid-template-columns:repeat(3,minmax(0,1fr))')&&
 uiCss.includes('@media (max-width:490px)'), 'Layout não possui breakpoints');
console.log('QA INTERMEDIÁRIO PASS — '+checks+' assertivas: '+Object.keys(builtins).length+
 ' guias, '+fullCount+' tópicos integrais, '+visualCount+' visuais, '+clozeCount+' lacunas, '+
 flashCount+' questões de revisão, 3 módulos públicos, 5 formatos e 2 temas preservados.');
