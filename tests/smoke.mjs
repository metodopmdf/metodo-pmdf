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
    'q-source':'current','q-format':'CE','q-level':'intermediario','q-board':'Cebraspe',
    'anki-source':'current','anki-mode':'due','results-topic':'*','essay-lines':'30'
  };
  function $(id){
    if(!elements.has(id))elements.set(id,{
      id,value:defaults[id]??'',innerHTML:'',textContent:'',className:'',disabled:false,hidden:false,style:{},
      classList:{add(){},remove(){},toggle(){},contains(){return false}},
      replaceChildren(){},prepend(){},dispatchEvent(){},scrollIntoView(){},addEventListener(){},setAttribute(){},append(){},appendChild(){},remove(){},
    });
    return elements.get(id);
  }
  const document={
    getElementById:$,addEventListener(){},querySelectorAll(){return []},querySelector(){return null},
    createElement(tag){return {tagName:tag,setAttribute(){},remove(){},textContent:'',className:'',style:{},appendChild(){},append(){}};},
    body:{classList:{add(){},remove(){},contains(){return false}},dataset:{},appendChild(){}},
    documentElement:{style:{}}
  };
  const win={scrollTo(){},_lastPrintHtml:'',open(){return {document:{readyState:'complete',open(){},write(value){win._lastPrintHtml=value},close(){}},focus(){},print(){},addEventListener(){}}}};
  const application=new Function(
    'document','window','localStorage','location','navigator','setInterval','setTimeout','clearTimeout','fetch',
    code+'\nreturn {BUILTIN_PMDF_GUIDES,questionPool,buildStudyCards,fullQuestionSentences,getCardBox,'+
    'store,accountData,accountFetch,mergeProgressData,applyProgressSnapshot,getSyncMeta,'+
    'startQuestions,resetQuestionCycle,scanPrompt,setQuestionEngine,questionUseSource,answerQuestion,nextQuestion,startAnki,revealAnki,nextAnki,correctEssay,renderResultsChart,'+
    'setSummaryFormat,renderGuide,guideHtml,exportEssayPdfA4,addOfficialQuestions,importOfficialAnswerFile,refreshImportedExamSources,analyzeLawText,beginStudies,saveStudySession,readStudySession,'+
    'choose(k){CUR={key:k,guide:BUILTIN_PMDF_GUIDES[k],_poolCache:{}}},'+
    'level(l){LEVEL=l},auth(id){AUTH_USER={username:id,displayName:id};saveSbSession({access_token:"jwt",refresh_token:"refresh",expires_in:3600})},'+
    'questionState(){return Q_STATE},ankiState(){return ANKI_STATE},essayReport(){return ESSAY_MD}};'
  )(document,win,localStorage,{hostname:'metodopmdf.github.io',href:'https://metodopmdf.github.io/metodo-pmdf/'},{},
    ()=>0,(cb,ms)=>{if(ms<100)queueMicrotask(cb);return 0},()=>{},fetchImpl);
  return {application,$,localStorage,win};
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
// Validação estrutural dos controles que o usuário realmente utiliza.
const staticMarkup=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const staticIds=[...staticMarkup.matchAll(/\bid=(["'])([^"']+)\1/g)].map(m=>m[2]);
assert.equal(new Set(staticIds).size,staticIds.length,'IDs duplicados no HTML');
assert(!staticMarkup.includes('value="MC5"'),'Seletor de MC5 antigo reapareceu');
assert(!staticMarkup.includes('id="q-count"'),'Controle antigo de quantidade voltou');
assert(!staticMarkup.includes('id="anki-count"'),'Limite manual antigo de flashcards voltou');
assert(!staticMarkup.includes('id="q-year"'),'Filtro de ano removido reapareceu');

// Resumos: todas as 26 leis devem renderizar nos seis formatos, em três níveis.
const summaryFormats=['full','bullets','table','mind','flash','traps'];
let renderedSummaries=0;
for(const level of ['iniciante','intermediario','avancado']){
  for(const [key,g] of Object.entries(app.BUILTIN_PMDF_GUIDES)){
    app.choose(key);app.level(level);
    for(const format of summaryFormats){
      primary.$('summary-format-toolbar').value=format;
      // A função de renderização usa o formato global escolhido.
      app.setSummaryFormat(format);
      const markup=app.guideHtml(g,false);
      assert(markup.includes(g.lawName),'Resumo sem identificação: '+key+' / '+level+' / '+format);
      renderedSummaries++;
    }
  }
}
assert.equal(renderedSummaries,468,'Cobertura de resumos incompleta');

// Regressão real da aba Questões: cada lei e nível deve iniciar MC
// sem ser descartada pelo validador de enunciados.
app.auth('qa-multipla');
for(const level of ['iniciante','intermediario','avancado']){
  for(const key of Object.keys(app.BUILTIN_PMDF_GUIDES)){
    app.choose(key);
    app.level(level);
    primary.$('q-source').value='current';
    primary.$('q-level').value=level;
    primary.$('q-format').value='MC';
    await app.startQuestions();
    const items=app.questionState()?.items||[];
    assert(items.length>0,'Múltipla escolha vazia: '+key+' / '+level);
    for(const item of items){
      assert.equal(item.type,'MC','Tipo divergente: '+key);
      assert([4,5].includes(item.options.length),'Número de alternativas inválido: '+key);
      assert.equal(new Set(item.options).size,item.options.length,'Alternativas repetidas: '+key);
      assert('ABCDE'.slice(0,item.options.length).includes(item.answer),'Gabarito incorreto: '+key);
      assert(!/[:;,–—]\s*$/.test(item.statement),'Enunciado MC incompleto: '+key);
    }
  }
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
// Fluxos reais: o candidato pode trocar os seis formatos sem perder questões ou cartões.
const review=createClient(),student=review.application;
student.auth('qa-revisao');student.choose('cpm');student.level('avancado');
student.beginStudies(false);
review.$('q-format').value='MC';review.$('q-level').value='avancado';
await student.startQuestions();
const liveQuestions=student.questionState();
assert(liveQuestions?.items.length>0,'Simulado não iniciado na revisão de sessão');
for(const format of ['full','bullets','table','mind','flash','traps']){
  student.setSummaryFormat(format);
  assert.equal(student.questionState(),liveQuestions,'Formato '+format+' apagou questões');
}
student.startAnki();
const liveCards=student.ankiState();
assert(liveCards?.cards.length>0,'Cartões indisponíveis');
student.setSummaryFormat('full');
assert.equal(student.ankiState(),liveCards,'Troca de resumo apagou a revisão');
student.level('intermediario');
assert.equal(student.questionState(),liveQuestions,'Troca de nível apagou o simulado');
assert.equal(student.ankiState(),liveCards,'Troca de nível apagou cartões');
assert.equal(student.readStudySession().question.items.length,liveQuestions.items.length,'Sessão incompleta no salvamento');
assert.equal(student.readStudySession().anki.cards.length,liveCards.cards.length,'Cartões incompletos no salvamento');

// Sessões extensas não podem ser cortadas silenciosamente ao salvar.
const originalQuestions=liveQuestions.items,originalCards=liveCards.cards;
liveQuestions.items=Array.from({length:505},(_,i)=>({...originalQuestions[i%originalQuestions.length],topic:'Auditoria '+i}));
liveCards.cards=Array.from({length:350},(_,i)=>({...originalCards[i%originalCards.length],id:'audit-card-'+i}));
student.saveStudySession();
assert.equal(student.readStudySession().question.items.length,505,'Simulado longo foi truncado');
assert.equal(student.readStudySession().anki.cards.length,350,'Flashcards extensos foram truncados');
liveQuestions.items=originalQuestions;liveCards.cards=originalCards;student.saveStudySession();

// Texto próprio: a extração local não depende de IA paga e deve gerar ambos os formatos.
const customText=[
 'Art. 1º O órgão competente deve garantir os requisitos de legalidade e a motivação de cada decisão administrativa.',
 'Art. 2º É vedado praticar condutas contrárias à norma vigente, salvo quando houver autorização legal expressa.',
 'Art. 3º O agente público poderá responder pelas consequências jurídicas da ação quando estiverem presentes os pressupostos legais.',
 'Art. 4º A aplicação da medida depende de análise das condições de fato e da competência da autoridade responsável.',
 'Art. 5º A lei exige registro documental das operações de fiscalização administrativa e resguarda os direitos fundamentais.'
].join('\n');
const customGuide=student.analyzeLawText(customText,'Material fictício de QA');
assert(student.questionPool(customGuide,'CE','intermediario').length>0,'Texto próprio sem C/E');
assert(student.questionPool(customGuide,'MC','intermediario',4).length>0,'Texto próprio sem múltipla escolha');

// Importação sem gabarito: permitir estudo, mas nunca declarar acerto inexistente.
student.addOfficialQuestions([{
  law:'Prova simulada importada',sourceNumber:1,type:'MC',origin:'official-import',
  topic:'Noções de atuação policial',lawBasis:'Prova importada — sem gabarito',
  statement:'Ao analisar uma operação de segurança pública e suas condições jurídicas, identifique a alternativa conforme a prova apresentada.',
  options:['Hipótese jurídica A','Hipótese jurídica B','Hipótese jurídica C','Hipótese jurídica D'],answer:null
}]);
assert.equal(review.$('q-format').value,'MC','Importação restaurou valor antigo do seletor');
await student.startQuestions();
assert.equal(student.questionState().items.length,1,'Questão importada sem resposta descartada');
student.answerQuestion('A');
assert.equal(student.questionState().pending,1,'Questão sem gabarito não ficou pendente');
student.beginStudies(true);
assert.equal(review.$('q-format').value,'MC','Retomada de sessão usou opção removida');

// Gabaritos importados são vinculados exclusivamente à prova selecionada.
const scoped=createClient(),exam=scoped.application;
exam.auth('qa-gabaritos');
function imported(name,statement){
    return {law:name,sourceNumber:1,type:'MC',origin:'official-import',
        topic:'Questão 1',lawBasis:name,statement,
        options:['Alternativa A','Alternativa B','Alternativa C','Alternativa D'],answer:null};
}
exam.addOfficialQuestions([
    imported('Prova Alfa','Qual é o procedimento cabível diante da situação jurídica examinada e dos elementos expressos no enunciado da prova Alfa?'),
    imported('Prova Beta','Qual é o procedimento cabível diante da situação jurídica examinada e dos elementos expressos no enunciado da prova Beta?')
]);
const select=scoped.$('exam-answer-source');
exam.refreshImportedExamSources();
assert.equal(select.value,'','Duas provas exigem seleção explícita');
select.value='Prova Alfa';
await exam.importOfficialAnswerFile({files:[{name:'gabarito.txt',size:4,text:async()=> '1 B'}],value:'x'});
const importedData=JSON.parse(exam.store.get('exam:imports'));
assert.equal(importedData.find(q=>q.law==='Prova Alfa').answer,'B','Prova selecionada sem resposta');
assert.equal(importedData.find(q=>q.law==='Prova Beta').answer,null,'Resposta de outra prova foi contaminada');

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

// A impressão da redação não deve imprimir o guia jurídico que estiver aberto.
app.exportEssayPdfA4();
assert(primary.win._lastPrintHtml.includes('MÉTODO PMDF · CORRETOR DE REDAÇÃO'),'PDF da redação incorreto');
assert(primary.win._lastPrintHtml.includes('NPD (Nota Final)'),'PDF não contém a correção');
assert(primary.win._lastPrintHtml.includes('size:A4 portrait'),'PDF não está configurado em A4');

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

// Cobertura ampliada: nenhum artigo de textos extensos pode ser descartado pelo limite anterior de 40.
const examiner=createClient();
const examApp=examiner.application;
const largeSource=Array.from({length:75},(_,i)=>
  'Art. '+(i+1)+'º A autoridade responsável deverá observar os requisitos de legalidade, registrar os fatos e garantir o direito à informação no procedimento administrativo número '+(i+1)+'.'
).join('\n');
const largeGuide=examApp.analyzeLawText(largeSource,'Norma fictícia extensa');
const sections=['highIncidence','mediumIncidence','lowIncidence'].flatMap(k=>largeGuide.articlesMapping[k]);
assert.equal(sections.length,75,'Análise perdeu dispositivos após o antigo limite de 40');
assert(sections.every(x=>x.sourceText?.includes('A autoridade responsável deverá observar')),'Conteúdo integral de referência não preservado');
const expanded=examApp.questionPool(largeGuide,'CE','intermediario');
assert(expanded.length>=75,'Gerador não percorreu todas as 75 unidades');

examApp.auth('qa-examinador');
examApp.choose('cpm');
examiner.$('q-source').value='all';
examiner.$('q-format').value='CE';
examiner.$('q-level').value='intermediario';
examiner.$('q-batch').value='15';
const master=examApp.scanPrompt();
assert(master.includes('matriz de cobertura'),'Prompt mestre sem matriz de cobertura');
assert(master.includes('CEBRASPE/CESPE'),'Prompt mestre sem metodologia da banca');
assert(master.includes('CONTINUAR'),'Prompt mestre sem continuidade');
await examApp.startQuestions();
const batchA=examApp.questionState();
assert.equal(batchA.items.length,15,'Lote solicitado de 15 questões não foi respeitado');
const firstIds=new Set(batchA.items.map(q=>q.coverageId));
assert.equal(firstIds.size,15,'Lote inicial com questões duplicadas');
await examApp.startQuestions(true);
const batchB=examApp.questionState();
assert.equal(batchB.items.length,15,'Próximo lote deveria ter 15 questões');
assert(batchB.items.every(q=>!firstIds.has(q.coverageId)),'O próximo lote repetiu questões');
assert.equal(batchB.coverage.shown,30,'Matriz de cobertura não atualizou progresso');
assert.equal(batchB.coverage.remaining,batchB.coverage.total-30,'Total pendente inconsistente');
assert(examApp.store.get(batchB.coverage.cycleKey),'Histórico de cobertura não foi persistido');
examApp.resetQuestionCycle();
assert.equal(examApp.store.get(batchB.coverage.cycleKey),null,'Reiniciar cobertura não limpou o ciclo');
await examApp.startQuestions();
assert.equal(examApp.questionState().coverage.shown,15,'Reinício não começou nova cobertura');

for(const g of Object.values(examApp.BUILTIN_PMDF_GUIDES)){
  const qs=examApp.questionPool(g,'MC','intermediario',4);
  for(const q of qs){
    assert.equal(q.optionAnalysis.length,q.options.length,'Comentário individual de alternativa ausente');
    assert(q.optionAnalysis.filter(t=>/\) CORRETA\./.test(t)).length===1,'Auditoria identificou gabarito MC inconsistente');
  }
}

// Teste do roteador real da interface: o modo WebLLM deve chamar o controlador
// externo, sem modificar o motor determinístico em modo Tradicional.
const aiBridge=createClient(),aiApp=aiBridge.application;
aiApp.auth('qa-bridge');aiApp.choose('cpm');
let aiCalls=0;
aiBridge.win.PMDFQuestionAI={
  start:async more=>{aiCalls++;return more?'continuacao':'novo';},
  stop(){},checkCompatibility:async()=>{}
};
aiApp.setQuestionEngine('webllm');
await aiApp.startQuestions();
assert.equal(aiCalls,1,'Botão principal não foi roteado para WebLLM');
await aiApp.startQuestions(true);
assert.equal(aiCalls,2,'Próximo lote não encaminhou para WebLLM');
aiApp.setQuestionEngine('local');
aiBridge.$('q-format').value='CE';
await aiApp.startQuestions();
assert(aiApp.questionState()?.items.length>0,'Retorno ao motor tradicional falhou');

console.log('PASSOU: integração do elaborador, 75 dispositivos, lotes inéditos, 26 normas, 3 níveis, 468 resumos, questões MC/CE, importação, redação A4, flashcards e sincronização simulada.');
console.log(JSON.stringify({counts,walkthrough},null,2));
