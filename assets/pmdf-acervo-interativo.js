/* Método PMDF — Acervo de questões em PDF. Conteúdo importado é preservado. */
(function(){
"use strict";
const DB_NAME="pmdf-acervo-interativo-v1";
const ASSET="assets/bancos/Banco_Interativo_PMDF_8433_Questoes.json.gz";
const LABELS={C:"Certo",E:"Errado"};
let db=null,decks=[],items=[],filtered=[],answers=new Map(),position=0,chartVisible=false,importBusy=false;
const $=id=>document.getElementById(id);
const make=(tag,cls,txt)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=String(txt);return el;
};
function status(message,error=false){
 const el=$("acervo-status");if(!el)return;
 el.textContent=message;el.setAttribute("data-error",String(error));
}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error("Falha no armazenamento"));});}
function transactionDone(tx){return new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error("Falha na transação"));tx.onabort=()=>reject(tx.error||Error("Gravação interrompida"));});}
async function openDB(){
 if(!("indexedDB" in window))throw Error("Seu navegador não disponibiliza IndexedDB.");
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{
   const data=req.result;
   if(!data.objectStoreNames.contains("decks"))data.createObjectStore("decks",{keyPath:"id"});
   if(!data.objectStoreNames.contains("answers"))data.createObjectStore("answers",{keyPath:"id"});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error("Falha ao abrir o banco local"));
  req.onblocked=()=>reject(Error("Feche outras abas do Método PMDF e tente novamente."));
 });
}
async function restore(){
 const tx=db.transaction(["decks","answers"],"readonly");
 const [saved,attempts]=await Promise.all([request(tx.objectStore("decks").getAll()),request(tx.objectStore("answers").getAll())]);
 decks=saved.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
 answers=new Map(attempts.map(a=>[a.id,a]));
 items=decks.flatMap(d=>(d.questions||[]).map(q=>Object.assign({deckId:d.id,deckName:d.name},q)));
 renderDecks();applyFilters();
}
function ensureData(payload){
 if(!payload||payload.schema!=="pmdf-questoes-pdf-v1"||!Array.isArray(payload.decks))throw Error("Arquivo incompatível. Importe o pacote do acervo PMDF em .json ou .json.gz.");
 if(payload.decks.length<1||payload.decks.length>100)throw Error("Número de cadernos inválido.");
 const ids=new Set(),bids=new Set();let amount=0;
 for(const deck of payload.decks){
  if(!deck||typeof deck.id!=="string"||typeof deck.name!=="string"||!Array.isArray(deck.questions)||bids.has(deck.id))throw Error("Metadados do caderno inválidos ou repetidos.");
  bids.add(deck.id);
  for(const q of deck.questions){
   if(!q||typeof q.id!=="string"||ids.has(q.id)||!["CE","MC"].includes(q.type)||typeof q.statement!=="string"||!q.statement.trim()||typeof q.explanation!=="string"||!q.explanation.trim())throw Error("Questão inválida ou duplicada no acervo: "+String(q&&q.id||"sem ID"));
   if(q.type==="CE"&&!["C","E"].includes(q.answer))throw Error("Gabarito de julgamento inválido: "+q.id);
   if(q.type==="MC"||q.type==="ME"){
    if(!Array.isArray(q.options)||q.options.length!==5||q.options.some(t=>typeof t!=="string"||!t.trim())||!"ABCDE".includes(q.answer))throw Error("Alternativas ou gabarito inválidos: "+q.id);
   }
   ids.add(q.id);amount++;if(amount>100000)throw Error("Arquivo excede o limite de 100 mil itens.");
  }
 }
 return amount;
}
async function persist(payload){
 const tx=db.transaction(["decks"],"readwrite"),store=tx.objectStore("decks"),done=transactionDone(tx);
 store.clear();
 for(const deck of payload.decks)store.put(deck);
 await done;
}
async function decodeFile(file){
 if(file.size>35000000)throw Error("Arquivo muito grande; o limite de importação é 35 MB.");
 let text;
 if(/\.gz$/i.test(file.name)){
  if(!("DecompressionStream" in window))throw Error("Este navegador não consegue abrir GZIP. Utilize o pacote .json descompactado.");
  text=await new Response(file.stream().pipeThrough(new DecompressionStream("gzip"))).text();
 }else{text=await file.text();}
 if(text.length>45000000)throw Error("Pacote descompactado excede o limite seguro.");
 return JSON.parse(text);
}
async function importFile(event){
 const input=event.target,file=input.files&&input.files[0];
 if(!file||importBusy)return;
 importBusy=true;
 const btn=$("acervo-import-label");if(btn)btn.setAttribute("aria-busy","true");
 status("Conferindo os enunciados, alternativas e gabaritos de "+file.name+"...");
 try{
  if(!/\.json(?:\.gz)?$/i.test(file.name))throw Error("Importe o arquivo .json.gz disponibilizado com os 23 cadernos.");
  const data=await decodeFile(file),count=ensureData(data);
  await persist(data);await restore();
  status("Acervo carregado: "+count.toLocaleString("pt-BR")+" questões de "+data.decks.length+" cadernos. Seu progresso fica salvo neste navegador.");
 }catch(error){
  status("Não foi possível importar: "+error.message,true);console.error("[Método PMDF][Acervo]",error);
 }finally{importBusy=false;if(btn)btn.removeAttribute("aria-busy");input.value="";}
}
function renderDecks(){
 const select=$("acervo-deck");if(!select)return;
 const before=select.value;
 select.replaceChildren(new Option("Todas as normas ("+items.length.toLocaleString("pt-BR")+")","all"));
 for(const d of decks)select.add(new Option(d.name+" ("+d.questions.length.toLocaleString("pt-BR")+")",d.id));
 if([...select.options].some(o=>o.value===before))select.value=before;
}
function applyFilters(){
 const wanted=$("acervo-deck")?.value||"all",mode=$("acervo-format")?.value||"all",level=$("acervo-difficulty")?.value||"all";
 const selectedId=filtered[position]?.id;
 filtered=items.filter(q=>(wanted==="all"||q.deckId===wanted)&&(mode==="all"||q.type===mode)&&(level==="all"||q.difficulty===level));
 let newPos=selectedId?filtered.findIndex(q=>q.id===selectedId):-1;
 position=newPos>=0?newPos:0;
 const count=$("acervo-total");if(count)count.textContent=filtered.length.toLocaleString("pt-BR")+" itens no filtro";
 drawQuestion();drawStats();
}
function drawQuestion(){
 const q=filtered[position],container=$("acervo-question"),counter=$("acervo-counter");
 if(!container)return;container.replaceChildren();
 if(counter)counter.textContent=q?"Questão "+(position+1).toLocaleString("pt-BR")+" de "+filtered.length.toLocaleString("pt-BR"):"Nenhuma questão selecionada";
 const prev=$("acervo-prev"),next=$("acervo-next"),unseen=$("acervo-next-unseen");
 if(prev)prev.disabled=!q||position===0;
 if(next)next.disabled=!q||position>=filtered.length-1;
 if(unseen)unseen.disabled=!q||filtered.every(x=>answers.has(x.id));
 if(!q){
  container.append(make("p","acervo-empty",items.length?"Não há questões para esse filtro.":"O banco ainda não foi carregado. Importe o arquivo .json.gz dos cadernos."));
  return;
 }
 const wrap=make("div","acervo-question-card"),meta=make("p","acervo-meta",
  q.deckName+" · Nº "+q.number+" · "+(q.type==="MC"?"Múltipla escolha":"Certo/Errado")+" · "+(q.difficulty||"Dificuldade não informada"));
 wrap.append(meta);
 if(q.reference||q.topic)wrap.append(make("p","acervo-reference",[q.topic,q.reference].filter(Boolean).join(" · ")));
 wrap.append(make("h3","acervo-statement",q.statement));
 const choices=make("div","acervo-choices");const saved=answers.get(q.id);
 const opts=q.type==="CE"?[["C","Certo"],["E","Errado"]]:q.options.map((x,i)=>["ABCDE"[i],"ABCDE"[i]+") "+x]);
 for(const [key,text] of opts){
  const btn=make("button","acervo-choice",text);btn.type="button";
  btn.dataset.key=key;btn.disabled=!!saved;
  if(saved){
   if(key===q.answer)btn.classList.add("is-correct");
   if(saved.choice===key&&saved.choice!==q.answer)btn.classList.add("is-wrong");
   if(saved.choice===key)btn.setAttribute("aria-pressed","true");
  }
  btn.addEventListener("click",()=>void submit(q,key));
  choices.append(btn);
 }
 wrap.append(choices);
 if(saved){
  const feedback=make("div","acervo-feedback");
  feedback.append(make("strong",saved.correct?"acervo-good":"acervo-bad",saved.correct?"Resposta correta":"Resposta incorreta"));
  feedback.append(make("p","", "Gabarito: "+(q.type==="CE"?LABELS[q.answer]:q.answer)));
  feedback.append(make("p","",q.explanation));
  wrap.append(feedback);
 }else{
  wrap.append(make("p","acervo-hint","Selecione uma resposta para conferir o gabarito e a fundamentação original."));
 }
 container.append(wrap);
 const progress=$("acervo-progress");if(progress)progress.value=filtered.length?((position+1)/filtered.length*100):0;
}
async function submit(q,choice){
 if(answers.has(q.id))return;
 const answer={id:q.id,choice,correct:choice===q.answer,date:new Date().toISOString()};
 try{
  await request(db.transaction(["answers"],"readwrite").objectStore("answers").put(answer));
  answers.set(q.id,answer);drawQuestion();drawStats();
 }catch(error){status("Não foi possível salvar a resposta: "+error.message,true);}
}
function drawStats(){
 let correct=0,wrong=0;
 for(const q of filtered){const a=answers.get(q.id);if(a){if(a.correct)correct++;else wrong++;}}
 const done=correct+wrong,pct=done?100*correct/done:0;
 if($("acervo-hits"))$("acervo-hits").textContent=correct.toLocaleString("pt-BR");
 if($("acervo-wrong"))$("acervo-wrong").textContent=wrong.toLocaleString("pt-BR");
 if($("acervo-pct"))$("acervo-pct").textContent=pct.toFixed(1).replace(".",",")+"%";
 if($("acervo-done"))$("acervo-done").textContent=done.toLocaleString("pt-BR")+" de "+filtered.length.toLocaleString("pt-BR")+" respondidas";
 if(chartVisible)drawChart(correct,wrong,pct);
}
function drawChart(correct,wrong,pct){
 const chart=$("acervo-chart"),circle=$("acervo-pie"),caption=$("acervo-pie-summary");
 if(!chart||!circle)return;
 chart.hidden=false;
 circle.style.background=correct+wrong?
  "conic-gradient(#159f65 0% "+pct+"%, #dc3545 "+pct+"% 100%)":
  "conic-gradient(#475569 0% 100%)";
 circle.setAttribute("role","img");
 circle.setAttribute("aria-label",correct+" acertos e "+wrong+" erros");
 if(caption)caption.textContent=correct+" acertos · "+wrong+" erros · "+pct.toFixed(1).replace(".",",")+"% de aproveitamento";
}
function nextUnseen(){
 const start=position;
 for(let i=position+1;i<filtered.length;i++)if(!answers.has(filtered[i].id)){position=i;drawQuestion();return;}
 for(let i=0;i<start;i++)if(!answers.has(filtered[i].id)){position=i;drawQuestion();return;}
 status("Todas as questões deste filtro já foram respondidas.");
}
async function resetProgress(){
 if(!filtered.length)return;
 if(!window.confirm("Apagar as respostas das "+filtered.length+" questões no filtro atual? Isso não altera os enunciados nem os gabaritos."))return;
 try{
  const tx=db.transaction(["answers"],"readwrite"),store=tx.objectStore("answers"),done=transactionDone(tx);
  for(const q of filtered)store.delete(q.id);
  await done;for(const q of filtered)answers.delete(q.id);
  drawQuestion();drawStats();status("Respostas do filtro reiniciadas. O banco de questões foi preservado.");
 }catch(e){status("Erro ao reiniciar respostas: "+e.message,true);}
}
function bind(){
 $("acervo-file")?.addEventListener("change",e=>void importFile(e));
 for(const id of ["acervo-deck","acervo-format","acervo-difficulty"])$(id)?.addEventListener("change",applyFilters);
 $("acervo-prev")?.addEventListener("click",()=>{if(position>0){position--;drawQuestion();}});
 $("acervo-next")?.addEventListener("click",()=>{if(position<filtered.length-1){position++;drawQuestion();}});
 $("acervo-next-unseen")?.addEventListener("click",nextUnseen);
 $("acervo-reset")?.addEventListener("click",()=>void resetProgress());
 $("acervo-show-chart")?.addEventListener("click",()=>{
  chartVisible=!chartVisible;
  const chart=$("acervo-chart");if(chart)chart.hidden=!chartVisible;
  $("acervo-show-chart").textContent=chartVisible?"Ocultar gráfico":"Ver resultado em gráfico de pizza";
  drawStats();
 });
}
async function init(){
 if(!$("tab-acervo"))return;
 bind();status("Preparando o banco de questões...");
 try{
  db=await openDB();await restore();
  if(decks.length){
   status(decks.length+" cadernos carregados, "+items.length.toLocaleString("pt-BR")+" questões. Progresso recuperado deste navegador.");
   return;
  }
  // Quando o pacote é publicado no GitHub Pages, todos os candidatos o recebem sem importação manual.
  try{
   const response=await fetch(new URL(ASSET,document.baseURI),{cache:"no-store"});
   if(response.ok){
    const blob=await response.blob();
    const data=await decodeFile(new File([blob],"banco.json.gz",{type:"application/gzip"}));
    ensureData(data);await persist(data);await restore();
    status("Acervo público carregado: "+items.length.toLocaleString("pt-BR")+" questões em "+decks.length+" normas.");
    return;
   }
  }catch(e){console.info("[Método PMDF][Acervo] Pacote público ainda não instalado.",e);}
  status("Ferramenta pronta. Importe o arquivo Banco_Interativo_PMDF_8433_Questoes.json.gz para começar.");
 }catch(error){status("Armazenamento indisponível: "+error.message,true);}
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>void init(),{once:true});
else void init();
})();