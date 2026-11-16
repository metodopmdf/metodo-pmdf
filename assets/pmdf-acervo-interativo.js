/* Método PMDF — Acervo de questões em PDF. Conteúdo importado é preservado. */
(function(){
"use strict";
const DB_NAME="pmdf-acervo-interativo-v1";
const ASSET="assets/bancos/Banco_Interativo_PMDF_8433_Questoes.json.gz";
const LABELS={C:"Certo",E:"Errado"};
let db=null,decks=[],items=[],scope=[],filtered=[],answers=new Map(),position=0,chartVisible=false,importBusy=false;
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
 renderFilterMenus();applyFilters();
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
/* Os rótulos de disciplina e tópico são metadados derivados; o conteúdo jurídico não é modificado. */
const SUBJECTS={
  "Direito Constitucional":["Constitucional"],
  "Direito Penal":["DEL2848"],
  "Direito Processual Penal":["Del3689"],
  "Direito Penal Militar":["CPM"],
  "Direito Processual Penal Militar":["CPPM"],
  "Legislação Institucional Militar":["D10443","D88777","L7289","L12086","L14751"],
  "Direito Administrativo":["L8429","L12527"],
  "Juizados Especiais":["L9099"],
  "Legislação Penal e Processual Especial":["L7716","L7960","L8072","L9455","L10826","L11340","L11343","L12850","L13869"],
  "Estatuto da Criança e do Adolescente":["L8069"]
};
const SUBJECT_BY_ID=new Map(Object.entries(SUBJECTS).flatMap(([title,ids])=>ids.map(id=>[id,title])));
const ORDER_KEY="pmdf:acervo:shuffle-seed:v2";
function newSeed(){
  try{if(window.crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]||1;}}catch(e){}
  return (Math.floor(Math.random()*4294967295)>>>0)||1;
}
function getSeed(){
  try{const n=Number(localStorage.getItem(ORDER_KEY));if(Number.isInteger(n)&&n>0&&n<=4294967295)return n;}catch(e){}
  const n=newSeed();try{localStorage.setItem(ORDER_KEY,String(n));}catch(e){}
  return n;
}
let orderSeed=getSeed();
function hash32(s){
  let h=2166136261;for(const c of String(s)){h=Math.imul(h^c.charCodeAt(0),16777619);}
  return h>>>0;
}
function rand32(seed){
  let n=seed>>>0;
  return function(){
    n=(n+0x6D2B79F5)>>>0;let x=n;
    x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
    return ((x^(x>>>14))>>>0)/4294967296;
  };
}
function shuffleArray(data,rand){
  for(let i=data.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[data[i],data[j]]=[data[j],data[i]];}
}
function matterOf(id){
  const d=decks.find(x=>x.id===id);
  return String(d?.discipline||d?.materia||SUBJECT_BY_ID.get(id)||d?.name||"Outra matéria");
}
function topicOf(q){
  const t=String(q.topic||"").trim();
  if(t&&t!=="Geral")return t;
  const m=String(q.reference||"").match(/\bart(?:igo)?\.?\s*[º°]?\s*(\d+[A-Za-z]?)(?:\s*[-–]\s*([A-Za-z]))?/i);
  if(m)return "Art. "+m[1]+(m[2]?"-"+m[2].toUpperCase():"");
  return "Tópico não identificado";
}
function normText(s){
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function selectionOf(id){return $(id)?.value||"all";}
function renderMatters(){
  const sel=$("acervo-materia");if(!sel)return;
  const before=sel.value;
  const matters=[...new Set(decks.map(d=>matterOf(d.id)))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  sel.replaceChildren(new Option("Todas as matérias","all"));
  for(const m of matters)sel.add(new Option(m,m));
  if([...sel.options].some(o=>o.value===before))sel.value=before;
}
function renderDecks(){
  const sel=$("acervo-deck");if(!sel)return;
  const matter=selectionOf("acervo-materia"),before=sel.value;
  const visible=decks.filter(d=>matter==="all"||matterOf(d.id)===matter);
  const count=visible.reduce((n,d)=>n+d.questions.length,0);
  sel.replaceChildren(new Option("Todas as normas ("+count.toLocaleString("pt-BR")+")","all"));
  for(const d of visible)sel.add(new Option(d.name+" ("+d.questions.length.toLocaleString("pt-BR")+")",d.id));
  if([...sel.options].some(o=>o.value===before))sel.value=before;
}
function topicKey(q){return q.deckId+"||"+topicOf(q);}
function renderTopics(){
  const sel=$("acervo-topic");if(!sel)return;
  const before=sel.value,matter=selectionOf("acervo-materia"),deck=selectionOf("acervo-deck");
  if(matter==="all"&&deck==="all"){
    sel.replaceChildren(new Option("Escolha uma matéria ou lei primeiro","all"));
    sel.disabled=true;return;
  }
  sel.disabled=false;
  const allowed=decks.filter(d=>(matter==="all"||matterOf(d.id)===matter)&&(deck==="all"||d.id===deck));
  const multi=allowed.length>1,topics=new Map();
  for(const q of items){
    if(matter!=="all"&&matterOf(q.deckId)!==matter)continue;
    if(deck!=="all"&&q.deckId!==deck)continue;
    const key=topicKey(q),label=(multi?q.deckName+" · ":"")+topicOf(q);
    const entry=topics.get(key)||{label,count:0};entry.count++;topics.set(key,entry);
  }
  sel.replaceChildren(new Option("Todos os tópicos / artigos ("+
    [...topics.values()].reduce((n,x)=>n+x.count,0).toLocaleString("pt-BR")+")","all"));
  for(const [key,entry] of [...topics.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,"pt-BR",{numeric:true})))
    sel.add(new Option(entry.label+" ("+entry.count+")",key));
  if([...sel.options].some(o=>o.value===before))sel.value=before;
}
function renderFilterMenus(){renderMatters();renderDecks();renderTopics();}
function mixedOrder(all,signature){
  if(all.length<2)return [...all];
  const rng=rand32((orderSeed^hash32(signature))>>>0);
  const buckets=new Map();
  for(const q of all){
    const key=q.type+"|"+(q.difficulty||"?");
    if(!buckets.has(key))buckets.set(key,[]);
    buckets.get(key).push(q);
  }
  for(const arr of buckets.values())shuffleArray(arr,rng);
  const keys=[...buckets.keys()],out=[];let lastType="",lastLevel="";
  while(out.length<all.length){
    const active=keys.filter(k=>buckets.get(k).length);
    const hasOtherType=active.some(k=>k.split("|")[0]!==lastType);
    const hasOtherLevel=active.some(k=>k.split("|")[1]!==lastLevel);
    const weights=active.map(k=>{
      const [type,level]=k.split("|");
      return buckets.get(k).length*
        (hasOtherType&&type===lastType?0.28:1)*
        (hasOtherLevel&&level===lastLevel?0.52:1);
    });
    const total=weights.reduce((a,b)=>a+b,0);
    let ticket=rng()*total,selected=active[active.length-1];
    for(let i=0;i<active.length;i++){ticket-=weights[i];if(ticket<0){selected=active[i];break;}}
    out.push(buckets.get(selected).pop());
    [lastType,lastLevel]=selected.split("|");
  }
  return out;
}
function applyFilters(resetPosition=false){
  const matter=selectionOf("acervo-materia"),wanted=selectionOf("acervo-deck"),
    topic=selectionOf("acervo-topic"),mode=selectionOf("acervo-format"),
    level=selectionOf("acervo-difficulty"),state=selectionOf("acervo-state");
  const needle=normText($("acervo-search")?.value||"").trim();
  const selectedId=resetPosition?null:filtered[position]?.id;
  scope=items.filter(q=>(matter==="all"||matterOf(q.deckId)===matter)&&
    (wanted==="all"||q.deckId===wanted)&&
    (topic==="all"||topicKey(q)===topic)&&
    (mode==="all"||q.type===mode)&&
    (level==="all"||q.difficulty===level)&&
    (!needle||normText([q.statement,q.topic,q.reference,q.deckName].join(" ")).includes(needle)));
  const signature=[matter,wanted,topic,mode,level,needle].join("|");
  const randomized=mixedOrder(scope,signature);
  filtered=randomized.filter(q=>{
    if(state==="all")return true;
    const saved=answers.get(q.id);
    if(state==="pending")return !saved;
    if(state==="correct")return !!saved&&saved.correct;
    if(state==="wrong")return !!saved&&!saved.correct;
    return true;
  });
  const newPos=selectedId?filtered.findIndex(q=>q.id===selectedId):-1;
  position=newPos>=0?newPos:0;
  const count=$("acervo-total");
  if(count)count.textContent=filtered.length.toLocaleString("pt-BR")+" itens na seleção · "+
    scope.length.toLocaleString("pt-BR")+" no recorte da matéria/tópico";
  const hint=$("acervo-order-hint");
  if(hint)hint.textContent="Ordem aleatória · "+new Set(filtered.map(q=>q.type)).size+
    " modalidade(s) · "+new Set(filtered.map(q=>q.difficulty)).size+
    " nível(is) disponíveis neste recorte. As respostas continuam salvas.";
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
 const wrap=make("div","acervo-question-card"),meta=make("div","acervo-meta");
 meta.append(make("span","acervo-number","Questão "+String(q.number||"").padStart(3,"0")));
 meta.append(make("span","acervo-chip",q.type==="MC"?"Múltipla escolha":"Certo ou errado"));
 meta.append(make("span","acervo-chip acervo-level",q.difficulty||"Dificuldade não informada"));
 meta.append(make("span","acervo-deck-label",q.deckName));
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
 for(const q of scope){const a=answers.get(q.id);if(a){if(a.correct)correct++;else wrong++;}}
 const done=correct+wrong,pct=done?100*correct/done:0;
 if($("acervo-hits"))$("acervo-hits").textContent=correct.toLocaleString("pt-BR");
 if($("acervo-wrong"))$("acervo-wrong").textContent=wrong.toLocaleString("pt-BR");
 if($("acervo-pct"))$("acervo-pct").textContent=pct.toFixed(1).replace(".",",")+"%";
 if($("acervo-done"))$("acervo-done").textContent=done.toLocaleString("pt-BR")+" de "+scope.length.toLocaleString("pt-BR")+" respondidas";
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
 const target=filtered.filter(q=>answers.has(q.id));
 if(!target.length){status("Nenhuma resposta registrada nas questões visíveis deste filtro.");return;}
 if(!window.confirm("Apagar as respostas das "+target.length+" questões selecionadas? Os demais resultados, enunciados e gabaritos serão preservados."))return;
 try{
  const tx=db.transaction(["answers"],"readwrite"),store=tx.objectStore("answers"),done=transactionDone(tx);
  for(const q of target)store.delete(q.id);
  await done;for(const q of target)answers.delete(q.id);
  applyFilters(true);status("Foram reiniciadas "+target.length+" respostas do filtro. As demais foram preservadas.");
 }catch(e){status("Erro ao reiniciar respostas: "+e.message,true);}
}
function bind(){
 $("acervo-file")?.addEventListener("change",e=>void importFile(e));
 $("acervo-materia")?.addEventListener("change",()=>{renderDecks();renderTopics();applyFilters(true);});
 $("acervo-deck")?.addEventListener("change",()=>{renderTopics();applyFilters(true);});
 for(const id of ["acervo-topic","acervo-format","acervo-difficulty","acervo-state"])
   $(id)?.addEventListener("change",()=>applyFilters(true));
 let searchTimer=0;
 $("acervo-search")?.addEventListener("input",()=>{
   window.clearTimeout(searchTimer);
   searchTimer=window.setTimeout(()=>applyFilters(true),150);
 });
 $("acervo-shuffle")?.addEventListener("click",()=>{
   orderSeed=newSeed();try{localStorage.setItem(ORDER_KEY,String(orderSeed));}catch(e){}
   applyFilters(true);status("Questões reordenadas aleatoriamente. O desempenho anterior foi mantido.");
 });
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