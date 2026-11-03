/* Método PMDF: controlador de questões WebLLM. Inferência exclusivamente local. */
(function(root){
'use strict';
const STEPS=['literalidade','requisitos','exceções','caso hipotético','competências','interpretação'];
let job=null;
const H=()=>root.PMDFQuestionHost, L=()=>root.PMDFWebLLM, E=id=>H()?.$(id);
const notify=(m,bad=false)=>H()?.toast(m,bad?'error':'ok');
function describeError(error){
  if(typeof error==='string'&&error.trim())return error.trim().slice(0,240);
  if(error&&typeof error==='object'){
    for(const value of [error.message,error.reason,error.code,error.error]){
      if(typeof value==='string'&&value.trim())return value.trim().slice(0,240);
    }
  }
  return 'o modelo não conseguiu produzir uma resposta estruturada e válida';
}
async function failOverToSafe(more,reason){
  // Libere a GPU antes de gerar questões determinísticas para não disputar memória.
  try{L()?.interrupt?.();}catch(_){}
  H()?.activateSafe?.();
  try{
    const result=await H()?.safe?.(more,String(reason||'resposta inválida').slice(0,95));
    if(result?.ok){
      notify('Modo seguro: '+result.count+' questões elaboradas com base no material, sem depender do modelo experimental.');
      return result;
    }
    const issue=result?.reason||'A fonte não forneceu questões inéditas verificáveis neste recorte.';
    if(E('q-status'))E('q-status').textContent=issue;
    notify('Não foram geradas questões nesta tentativa. '+issue,true);
    return {ok:false,reason:issue};
  }catch(e){
    const issue=describeError(e);
    if(E('q-status'))E('q-status').textContent='Falha no gerador seguro: '+issue;
    notify('Falha no gerador seguro: '+issue,true);
    return {ok:false,reason:issue};
  }
}
function progress(p,m){
  E('q-ai-progress-wrap')?.classList.remove('hidden');
  if(E('q-ai-progress-text'))E('q-ai-progress-text').textContent=String(m||'');
  if(Number.isFinite(p)){
    const n=Math.round(Math.max(0,Math.min(1,p))*100);
    if(E('q-ai-progress-fill'))E('q-ai-progress-fill').style.width=n+'%';
    E('q-ai-progress')?.setAttribute('aria-valuenow',String(n));
  }
}
async function checkCompatibility(){
  const e=E('q-ai-compat');if(!e)return;
  if(E('q-ai-backend')?.value!=='experimental'){
    e.textContent='Modo seguro ativo: sem GPU, modelo ou download.';return;
  }
  if(/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(String(root.navigator?.userAgent||''))){
    e.textContent='Neste dispositivo móvel, a IA experimental será substituída por geração segura sem GPU.';return;
  }
  if(!L()){e.textContent='Módulo WebLLM indisponível. Recarregue a página.';return;}
  const r=await L().compatibility();
  const low=r.memoryGB&&r.memoryGB<=4;
  e.textContent=r.ok?(low?'Modo leve: dispositivo com até 4 GB RAM · utilize Qwen 0,5B':r.f16?'WebGPU disponível · inferência em Web Worker':'WebGPU disponível · escolha Qwen 0,5B'):r.reason;
}
async function prepare(){
  if(E('q-ai-backend')?.value!=='experimental'){
    progress(null,'Modo seguro ativado: não é necessário carregar IA nem reservar memória de GPU.');
    return true;
  }
  if(/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(String(root.navigator?.userAgent||'')))
    return notify('IA experimental desativada em celulares. Utilize a geração segura.',true);
  if(job)return notify('A geração está em andamento.',true);
  if(!L())return notify('Módulo WebLLM não foi carregado.',true);
  const b=E('q-ai-load'),stopButton=E('q-ai-stop');if(b)b.disabled=true;
  stopButton?.classList.remove('hidden');
  try{
    await L().load(E('q-ai-model')?.value,r=>progress(r.progress,'Carregando modelo: '+r.text));
    progress(1,'Modelo pronto para geração no navegador.');notify('WebLLM pronto.');return true;
  }catch(e){
    const cause=describeError(e);
    H()?.activateSafe?.();
    try{L()?.interrupt?.();}catch(_){}
    progress(null,'Modelo experimental indisponível. Modo seguro ativado: '+cause);
    notify('Não foi possível carregar a IA experimental. O gerador seguro está pronto.');
    return false;
  }
  finally{if(b)b.disabled=false;if(!job)stopButton?.classList.add('hidden');}
}
function stop(){
  if(job)job.cancelled=true;
  const state=L()?.status?.();
  if(job||state?.loading||state?.worker||state?.loadedId){
    L()?.interrupt?.();
    progress(null,'Processamento interrompido e memória do Worker liberada. Os itens aprovados foram preservados.');
  }
}
function units(guides){
  const result=[];
  for(const row of H().sourceUnits(guides)){
    const text=String(row.text||'').replace(/\s+/g,' ').trim();
    if(text.length<30||text.includes('…'))continue;
    for(let pos=0,i=0;pos<text.length;i++){
      let end=Math.min(text.length,pos+620);
      if(end<text.length){const sep=text.lastIndexOf(' ',end);if(sep>pos+350)end=sep;}
      const quote=text.slice(pos,end).trim();
      if(quote.length>=30)result.push({id:'s-'+(H().hash(row.law+'|'+row.article+'|'+i+'|'+quote)>>>0).toString(36),
        law:row.law,article:row.article,quote});
      pos=end;
    }
  }
  return result;
}
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
function duplicate(a,b){
  const x=norm(a),y=norm(b);if(x===y)return true;
  const A=new Set(x.split(' ').filter(v=>v.length>2)),B=new Set(y.split(' ').filter(v=>v.length>2)),U=new Set([...A,...B]);
  return U.size>9&&[...A].filter(v=>B.has(v)).length/U.size>.87;
}
function parse(raw){
  const fence=String.fromCharCode(96).repeat(3);
  let text=String(raw??'').trim();
  if(!text)throw Error('O modelo devolveu uma resposta vazia.');
  if(text.startsWith(fence))text=text.slice(3).replace(/^json\s*/i,'').trim();
  if(text.endsWith(fence))text=text.slice(0,-3).trim();
  let parsed;
  try{parsed=JSON.parse(text);}
  catch(first){
    // Alguns modelos compactos acrescentam frases ao JSON solicitado.
    const start=text.indexOf('{'),finish=text.lastIndexOf('}');
    if(start<0||finish<=start)throw Error('O modelo não retornou um objeto JSON completo.');
    try{parsed=JSON.parse(text.slice(start,finish+1));}
    catch(_){throw Error('O modelo retornou JSON incompleto ou malformado.');}
  }
  if(Array.isArray(parsed))return parsed;
  if(!parsed||typeof parsed!=='object')throw Error('A resposta do modelo não contém questões.');
  const list=parsed.questions||parsed.questoes||parsed['questões']||parsed.items||parsed.resultado?.questions;
  if(Array.isArray(list))return list;
  const single=parsed.question||parsed.questao||parsed['questão'];
  if(single&&typeof single==='object'&&!Array.isArray(single))return [single];
  if(typeof (parsed.statement||parsed.enunciado)==='string'&&typeof (parsed.answer||parsed.gabarito)==='string')return [parsed];
  throw Error('O modelo não entregou uma lista de questões reconhecível.');
}
function validate(q,u,fmt,level,prior){
  if(!q||typeof q!=='object')return null;
  const st=String(q.statement||q.enunciado||q.pergunta||'').replace(/\s+/g,' ').trim(),
    exp=String(q.explanation||q.justificativa||q.comentario||q['comentário']||'').replace(/\s+/g,' ').trim(),
    evidence=String(q.evidence||q.trecho||q.trechoBase||q.sourceQuote||'').replace(/\s+/g,' ').trim();
  if(st.length<45||st.length>1100||st.includes('…')||exp.length<28)return null;
  if(evidence.length<16||evidence.length>300||!norm(u.quote).includes(norm(evidence)))return null;
  if(prior.some(p=>duplicate(st,p.statement)))return null;
  let answer=String(q.answer||q.gabarito||q.correta||'').trim().toUpperCase(),opts=[],analysis=[];
  if(fmt==='CE'){
    if(answer==='CERTO')answer='C';if(answer==='ERRADO')answer='E';
    if(answer!=='C'&&answer!=='E')return null;
  }else{
    const alternatives=q.options||q.alternativas;
    if(!Array.isArray(alternatives)||alternatives.length!==4)return null;
    opts=alternatives.map(o=>String(o||'').replace(/^\s*[A-D]\s*[).:\-]\s*/i,'').trim());
    if(opts.some(x=>x.length<12||x.includes('…'))||new Set(opts.map(norm)).size!==4)return null;
    if(!'ABCD'.includes(answer))return null;
    const reviews=q.optionAnalysis||q.analiseAlternativas||q.comentariosAlternativas;
    analysis=Array.isArray(reviews)?reviews.map(x=>String(x||'').trim()):
      'ABCD'.split('').map(k=>String(reviews?.[k]||'').trim());
    if(analysis.length!==4||analysis.some(x=>x.length<10))return null;
  }
  const item={origin:'webllm-local',type:fmt,statement:st,options:opts,answer,
    explanation:exp,optionAnalysis:analysis,sourceKey:u.id,sourceQuote:evidence,
    law:u.law,lawBasis:u.article+' — '+u.law,topic:u.article,
    subtopic:String(q.subtopic||u.article).slice(0,100),difficulty:level,
    examRef:'Questão inédita · estilo '+(E('q-board')?.value||'Cebraspe'),
    easyTip:'Elaboração local por IA; confira a interpretação do dispositivo no texto vigente.'};
  item.coverageId='ai-'+(H().hash(fmt+'|'+u.law+'|'+st)>>>0).toString(36);
  return H().validateItem(item)?item:null;
}
function messages(u,fmt,level,n,focus,old){
  // A saída precisa caber no orçamento de tokens do modelo pequeno.
  // O bloco de referência é a última linha para fins de validação e testes.
  const ce=fmt==='CE';
  const format=ce?
    '{"questions":[{"statement":"Afirmação jurídica clara, uma frase completa.","answer":"C","explanation":"Justificativa objetiva vinculada à regra citada.","evidence":"TRECHO EXATO DA FONTE"}]}':
    '{"questions":[{"statement":"Pergunta sobre a regra da fonte?","options":["Primeira opção completa","Segunda opção completa","Terceira opção completa","Quarta opção completa"],"answer":"B","explanation":"Justificativa da única correta.","optionAnalysis":["Motivo de A estar errada","Motivo de B estar correta","Motivo de C estar errada","Motivo de D estar errada"],"evidence":"TRECHO EXATO DA FONTE"}]}';
  const history=old.length?' Não repita: '+old.slice(-1)[0].statement.slice(0,80):'';
  return [
    {role:'system',content:'Você é elaborador de concurso CEBRASPE. Escreva apenas um objeto JSON válido em português. Use somente o trecho dado. Não invente artigos, consequências ou regras. É preferível devolver {"questions":[]} a inventar respostas.'},
    {role:'user',content:'Crie UMA questão '+(ce?'CERTO/ERRADO':'MÚLTIPLA ESCOLHA com 4 alternativas, apenas 1 correta')+
      '. Nível: '+level+'. Foco: '+focus+'.'+history+
      ' Use as mesmas CHAVES do exemplo JSON abaixo, substituindo os valores pelos seus. '+
      'O campo evidence deve conter uma CÓPIA LITERAL, de 16 a 150 caracteres, de uma parte do texto da fonte. '+
      'A explicação deve demonstrar o gabarito. Não copie as frases do exemplo como conteúdo.'+
      '\nEXEMPLO DE FORMATO (não é resposta): '+format+
      '\nFONTE: '+u.law+' / '+u.article+
      '\n'+u.quote}
  ];
}
function loadBank(key){
  let b=H().memory[key]||null;
  if(!b){try{b=JSON.parse(H().store.get(key)||'null');}catch(e){b=null;}}
  return b&&b.version===1&&Array.isArray(b.questions)&&Number.isInteger(b.cursor)?
    b:{version:1,questions:[],cursor:0,rejected:0};
}
function saveBank(key,b){
  H().memory[key]=b;
  if(!H().store.set(key,JSON.stringify(b))&&!b.storageWarning){
    b.storageWarning=true;notify('Armazenamento cheio: exporte os dados antes de sair para não perder questões.',true);
  }
}
function showBank(b,key,model){
  if(job?.cancelled&&H().mode?.()==='local')return false;
  if(b.questions.length){H().setQuestions(b.questions,model,key);return true;}return false;
}
async function start(more=false){
  if(job)return notify('A geração de IA já está em andamento.',true);
  if(!H()?.user())return notify('Faça login para gerar questões.',true);
  if(E('q-source')?.value==='imported')return notify('Provas importadas devem usar o gerador Tradicional.',true);
  if(E('q-ai-backend')?.value!=='experimental')
    return H()?.safe?.(more,'Geração por regras locais, sem modelo de linguagem.');
  if(/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(String(root.navigator?.userAgent||''))){
    notify('Para proteger o celular, o site selecionou o gerador seguro sem GPU.','ok');
    return H()?.safe?.(more,'IA generativa bloqueada em dispositivos móveis.');
  }
  const guides=H().guides();if(!guides.length)return notify('Selecione uma lei ou envie um arquivo.',true);
  if(!L())return failOverToSafe(more,'WebLLM indisponível neste navegador.');
  const fmt=E('q-format')?.value==='MC'?'MC':'CE',level=H().level(E('q-level')?.value),
    model=E('q-ai-model')?.value,source=units(guides);
  if(!source.length)return notify('O documento não contém trechos completos suficientes.',true);
  const key=H().bankKey(guides,fmt,level),bank=loadBank(key);
  const desired=Math.max(1,Math.min(200,Number(E('q-ai-target')?.value)||100));
  const target=Math.min(250,desired);
  if(bank.questions.length>=target){showBank(bank,key,model);return notify('A meta acumulada já foi alcançada. Escolha uma meta maior para continuar.');}
  // Em cada clique, produza apenas poucas questões, mantendo o uso de GPU controlado.
  const batchLimit=fmt==='CE'?6:3;
  const roundTarget=Math.min(target,bank.questions.length+batchLimit);
  let compatible;
  try{compatible=await L().compatibility();}
  catch(e){return failOverToSafe(more,describeError(e));}
  if(H().mode?.()==='local')return;
  if(!compatible?.ok)return failOverToSafe(more,compatible?.reason||'WebGPU indisponível');
  const run={cancelled:false};job=run;
  const buttons=['q-generate-button','q-next-button'];
  const locked=['q-source','q-format','q-level','q-board','q-ai-model','q-ai-target'];
  const priorDisabled=locked.map(id=>E(id)?.disabled||false);
  for(const id of locked)if(E(id))E(id).disabled=true;
  for(const id of buttons)if(E(id))E(id).disabled=true;
  E('q-ai-stop')?.classList.remove('hidden');
  const per=1;
  const end=Math.min(source.length*9,bank.cursor+Math.max(6,batchLimit*2));
  let empty=0,failures=0;
  try{
    progress(0,'Preparando WebLLM...');
    await L().load(model,report=>progress(report.progress,'Baixando/preparando modelo: '+report.text));
    while(!run.cancelled&&bank.questions.length<roundTarget&&bank.cursor<end){
      const i=bank.cursor++,u=source[i%source.length],
        focus=STEPS[Math.floor(i/source.length)%STEPS.length],
        requestCount=1;
      progress(bank.questions.length/target,'Elaborando '+bank.questions.length+'/'+target+' · '+u.article+' · '+focus);
      let values;
      try{
        const old=bank.questions.filter(x=>x.sourceKey===u.id);
        const reply=await L().generate(messages(u,fmt,level,requestCount,focus,old),
          {max_tokens:fmt==='CE'?480:740,temperature:0.3});
        if(run.cancelled)break;
        values=parse(reply.text);
        failures=0;
      }catch(e){
        if(run.cancelled)break;
        failures++;bank.rejected++;saveBank(key,bank);
        if(failures>=3)throw Error('O modelo retornou três respostas consecutivas sem estrutura válida: '+describeError(e));
        continue;
      }
      let added=0;
      for(const input of values.slice(0,requestCount)){
        const q=validate(input,u,fmt,level,bank.questions);
        if(q){bank.questions.push(q);added++;}else bank.rejected++;
      }
      saveBank(key,bank);empty=added?0:empty+1;
      if(empty>=3)break;
      // Deixe um intervalo entre lotes para a GPU e a interface atualizarem.
      await new Promise(resolve=>setTimeout(resolve,120));
    }
    showBank(bank,key,model);
    const reason=run.cancelled?'Interrompido pelo usuário.':
      bank.questions.length>=target?'Meta acumulada atingida.':
      bank.questions.length>=roundTarget?'Lote leve concluído; use Gerar mais para continuar.':'Lote finalizado com o conteúdo válido obtido.';
    progress(bank.questions.length/target,reason+' '+bank.questions.length+'/'+target+' aceitas; '+bank.rejected+' rejeitadas.');
    if(E('q-status'))E('q-status').textContent=reason+' Total: '+bank.questions.length+'/'+target+' questões.';
    if(E('q-coverage'))E('q-coverage').textContent='IA local: '+bank.questions.length+' itens aceitos estruturalmente; '+bank.rejected+' descartados. A exatidão jurídica exige conferência.';
    if(!bank.questions.length&&!run.cancelled)
      await failOverToSafe(more,'O modelo gerou itens sem evidências ou gabaritos verificáveis.');
  }catch(e){
    saveBank(key,bank);
    const reason=describeError(e);
    if(run.cancelled){
      if(bank.questions.length)showBank(bank,key,model);
      progress(null,'Geração interrompida; '+bank.questions.length+' questões experimentais preservadas.');
    }else if(bank.questions.length){
      showBank(bank,key,model);
      H()?.activateSafe?.();
      try{L()?.interrupt?.();}catch(_){}
      progress(null,'O modelo falhou, mas '+bank.questions.length+' questões válidas foram preservadas. O próximo lote usará o modo seguro.');
      notify('Questões experimentais válidas preservadas. Próximos lotes usarão o modo seguro.');
    }else{
      await failOverToSafe(more,reason);
    }
  }finally{
    job=null;
    for(const id of buttons)if(E(id))E(id).disabled=false;
    locked.forEach((id,i)=>{if(E(id))E(id).disabled=priorDisabled[i];});
    E('q-ai-stop')?.classList.add('hidden');
    H().saveSession();
  }
}
root.PMDFQuestionAI=Object.freeze({start,stop,prepare,checkCompatibility,status:()=>({running:!!job})});
})(window);
