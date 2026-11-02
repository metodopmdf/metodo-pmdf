// Testes de regressão sem dependências externas; executar: node tests/smoke.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert(scripts.length>=1,'Script principal não encontrado');
const code=scripts.at(-1)[1];
new Function(code);
assert(!html.includes("fetch('/api/"),'O site estático ainda chama uma rota /api/');
assert(html.includes("https://metodopmdf.github.io/metodo-pmdf/"),'URL nova ausente');
assert(!html.includes("caioveloso.github.io"),'URL antiga remanescente');
assert(html.includes('name="viewport"'),'Viewport móvel ausente');

function createClient(fetchImpl=async()=>({ok:true,status:200,json:async()=>[]})){
  const map=new Map(),elements=new Map();
  const localStorage={
    getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),
    removeItem:k=>map.delete(k),key:i=>[...map.keys()][i],get length(){return map.size}
  };
  const defaults={
    'q-source':'current','q-format':'CE','q-level':'intermediario','q-count':'500','q-board':'Cebraspe','q-year':'2024',
    'anki-source':'current','anki-count':'5','anki-mode':'due','results-topic':'*','essay-lines':'30'
  };
  function $(id){
    if(!elements.has(id))elements.set(id,{
      id,value:defaults[id]??'',innerHTML:'',textContent:'',className:'',disabled:false,hidden:false,style:{},
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      replaceChildren(){},scrollIntoView(){},addEventListener(){},setAttribute(){},append(){},appendChild(){},remove(){},
    });
    return elements.get(id);
  }
  const document={
    getElementById:$,addEventListener(){},querySelectorAll(){return []},
    createElement(tag){return {tagName:tag,setAttribute(){},remove(){},textContent:'',className:'',style:{},appendChild(){},append(){}};},
    body:{classList:{add(){},remove(){},contains(){return false}},dataset:{},appendChild(){}},
    documentElement:{style:{}}
  };
  const win={};
  const application=new Function(
    'document','window','localStorage','location','navigator','setInterval','setTimeout','clearTimeout','fetch',
    code+'\nreturn {BUILTIN_PMDF_GUIDES,questionPool,buildStudyCards,fullQuestionSentences,getCardBox,'+
    'store,accountData,accountFetch,mergeProgressData,applyProgressSnapshot,getSyncMeta,'+
    'startQuestions,answerQuestion,nextQuestion,startAnki,revealAnki,nextAnki,correctEssay,renderResultsChart,'+
    'choose(k){CUR={key:k,guide:BUILTIN_PMDF_GUIDES[k],_poolCache:{}}},'+
    'level(l){LEVEL=l},auth(id){AUTH_USER={username:id,displayName:id};saveSbSession({access_token:"jwt",refresh_token:"refresh",expires_in:3600})},'+
    'questionState(){return Q_STATE},ankiState(){return ANKI_STATE},essayReport(){return ESSAY_MD}};'
  )(document,win,localStorage,{hostname:'metodopmdf.github.io',href:'https://metodopmdf.github.io/metodo-pmdf/'},{},
    ()=>0,(cb,ms)=>{if(ms<100)queueMicrotask(cb);return 0},()=>{},fetchImpl);
  return {application,$,localStorage};
}

const primary=createClient(),app=primary.application;
assert.equal(Object.keys(app.BUILTIN_PMDF_GUIDES).length,26,'Quantidade de guias');
const counts={};
for(const level of ['iniciante','intermediario','avancado']){
  let ceTotal=0,mcTotal=0,cardsTotal=0;
  for(const [key,g] of Object.entries(app.BUILTIN_PMDF_GUIDES)){
    app.level(level);
    const ce=app.questionPool(g,'CE',level),mc=app.questionPool(g,'MC',level,5),mc4=app.questionPool(g,'MC',level,4),cards=app.buildStudyCards(g);
    assert(ce.length>0,'Sem questões C/E: '+key+' / '+level);
    assert(cards.length>0,'Sem flashcards: '+key+' / '+level);
    for(const q of ce){
      assert(q.statement.length>55,'Enunciado curto');
      assert(!q.statement.includes('…'),'Enunciado truncado');
      assert(['C','E'].includes(q.answer),'Gabarito C/E inválido');
      assert(!q.statement.includes('exige-independentemente'),'Mutação gramatical inválida');
    }
    for(const q of mc){
      assert([4,5].includes(q.options.length),'Múltipla escolha exige 4 ou 5 opções fundamentadas');
      assert.equal(new Set(q.options).size,q.options.length,'Alternativas duplicadas');
      assert('ABCDE'.slice(0,q.options.length).includes(q.answer),'Gabarito múltipla escolha inválido');
      assert(q.options.some((_,i)=>'ABCDE'[i]===q.answer),'Alternativa correta ausente');
    }
    for(const q of mc4){
      assert.equal(q.options.length,4,'Seleção MC4 não foi respeitada');
      assert.equal(new Set(q.options).size,4,'MC4 com opções repetidas');
      assert('ABCD'.includes(q.answer),'Gabarito MC4 inválido');
    }
    for(const q of mc)assert.equal(q.options.length,5,'Seleção MC5 não foi respeitada');
    ceTotal+=ce.length;mcTotal+=mc.length;cardsTotal+=cards.length;
  }
  assert(ceTotal>=70&&cardsTotal>=100,'Banco de questões C/E ou flashcards insuficiente');
  counts[level]={ce:ceTotal,mc:mcTotal,flashcards:cardsTotal};
}
// Simulação do usuário nos três níveis: simulado, revelação, programação e gráfico.
const walkthrough=[];
for(const level of ['iniciante','intermediario','avancado']){
  app.auth('qa-'+level);app.choose('cpm');app.level(level);
  primary.$('q-level').value=level;primary.$('q-format').value='CE';
  await app.startQuestions();
  const first=app.questionState().items[0];assert(first,'Simulado vazio');
  app.answerQuestion(first.answer);
  assert(primary.$('q-feedback').innerHTML.includes('Acertou'),'Feedback ausente');
  app.nextQuestion();
  assert.equal(app.questionState().index,1,'Avanço do simulado');
  app.startAnki();const card=app.ankiState().cards[0];assert(card,'Baralho vazio');
  app.revealAnki();assert(primary.$('anki-panel').innerHTML.includes('VERSO'),'Verso não revelado');
  app.nextAnki();const due=app.getCardBox(card.id);
  assert(due.box>=1&&due.due>Date.now(),'Revisão não agendada');
  app.store.set('pmdf:results:aggregates',JSON.stringify({'CPM • crimes':{a:3,c:1,seconds:90}}));
  primary.$('results-topic').value='*';app.renderResultsChart();
  const chart=primary.$('results-chart').innerHTML;
  assert(chart.includes('33%')&&chart.includes('#DC2626'),'Gráfico de desempenho incorreto');
  walkthrough.push(level);
}
// Redação: resultado é estimativa, não correção oficial.
primary.$('essay-theme').value='Policiamento e direitos fundamentais';
primary.$('essay-motiv').value='Direitos fundamentais, legalidade e capacitação policial';
primary.$('essay-text').value=[
'A segurança pública exige respeito aos direitos fundamentais e observância da legalidade para fortalecer o Estado democrático de direito.',
'A atuação policial deve conciliar proteção da população e garantia das liberdades, com respeito à proporcionalidade e ao devido processo.',
'A capacitação permanente contribui para operações melhores. A orientação institucional e a fiscalização dos procedimentos reduzem problemas.',
'Portanto, o Governo do Distrito Federal deve investir em treinamento e controle dos procedimentos, por meio de cursos e auditorias, a fim de garantir atuação profissional.'
].join('\n\n');
for(const level of ['iniciante','intermediario','avancado']){
  app.level(level);await app.correctEssay();
  assert(app.essayReport().includes('NPD (Nota Final)'),'Relatório de redação incompleto: '+level);
}

// Dois dispositivos simulados: merge por chave, exclusão e CAS após alteração remota.
const remote=new Map();
let forceConflict=false,offline=false;
async function supabaseMock(url,opt={}){
  if(offline){offline=false;return {ok:false,status:503,json:async()=>({message:'offline'})};}
  const u=new URL(url),method=opt.method||'GET',uid='qa-shared',row=remote.get(uid);
  let data=[];
  if(u.pathname==='/rest/v1/pmdf_progress'){
    if(method==='GET')data=row?[{data:row.data,updated_at:row.updated_at}]:[];
    if(method==='POST'){
      if(!row){const value=JSON.parse(opt.body);remote.set(uid,value);data=[{updated_at:value.updated_at}];}
    }
    if(method==='PATCH'){
      const expected=(u.searchParams.get('updated_at')||'').replace(/^eq\./,'');
      if(forceConflict){forceConflict=false;remote.set(uid,{...row,updated_at:'2026-12-25T18:00:00.123Z'});}
      else if(row&&row.updated_at===expected){const value=JSON.parse(opt.body);remote.set(uid,value);data=[{updated_at:value.updated_at}];}
    }
  }
  return {ok:true,status:200,json:async()=>data};
}
const a=createClient(supabaseMock).application,b=createClient(supabaseMock).application;
a.auth('qa-shared');b.auth('qa-shared');
a.store.set('note:A','valor do dispositivo A');
assert((await a.accountFetch('progresso',{method:'PUT'})).ok);
b.store.set('note:B','valor do dispositivo B');
assert((await b.accountFetch('progresso',{method:'PUT'})).ok);
assert.equal(remote.get('qa-shared').data['note:A'],'valor do dispositivo A');
assert.equal(remote.get('qa-shared').data['note:B'],'valor do dispositivo B');
a.store.del('note:A');
assert((await a.accountFetch('progresso',{method:'PUT'})).ok);
assert.equal(remote.get('qa-shared').data['note:A'],undefined,'Exclusão não propagada');
b.store.set('note:C','teste de conflito');forceConflict=true;
assert((await b.accountFetch('progresso',{method:'PUT'})).ok,'CAS não resolveu conflito');
a.store.set('note:offline','mantido no aparelho');offline=true;
assert(!(await a.accountFetch('progresso',{method:'PUT'})).ok,'Falha de rede não sinalizada');
assert.equal(a.store.get('note:offline'),'mantido no aparelho');
console.log('PASSOU: 26 normas, três níveis, redação, flashcards, gráfico e sincronização simulada.');
console.log(JSON.stringify({counts,walkthrough},null,2));
