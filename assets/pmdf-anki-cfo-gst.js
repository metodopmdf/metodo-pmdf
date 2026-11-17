/* Método PMDF — Banco CFO/GST de cartões Anki.
   Importa JSON ou JSON.GZ previamente convertido do Anki; persiste por IndexedDB.
   Todo conteúdo textual é tratado como dados, nunca executado como HTML. */
(function(root){
'use strict';
const KEY='cfo-gst-v1',DB='pmdf-anki-cfo-gst',STORE='banks',MAX_BYTES=12*1024*1024;
let memory=null,opening=null;
const $=id=>document.getElementById(id);
const norm=s=>String(s??'').trim();
const fold=s=>norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const uniq=arr=>[...new Set(arr)].sort((a,b)=>a.localeCompare(b,'pt-BR'));
function valid(data){
 if(!data||data.format!=='PMDF-ANKI-IMPORT-v1'||!Array.isArray(data.cards))throw Error('Arquivo diferente do banco ANKI CFO GST.');
 if(!data.cards.length||data.cards.length>30000)throw Error('Quantidade de flashcards inválida.');
 const seen=new Set();
 for(const c of data.cards){
  if(!c||typeof c.id!=='string'||!/^cfo-gst-\d{8,}$/.test(c.id)||seen.has(c.id)
     ||!norm(c.front)||!norm(c.back)||!norm(c.disciplina)||!norm(c.assunto)
     ||typeof c.front!=='string'||typeof c.back!=='string'||c.front.length>6000||c.back.length>6000)
    throw Error('Cartão inválido ou duplicado no banco.');
  seen.add(c.id);
 }
 return data;
}
function openDb(){
 if(!('indexedDB' in root))return Promise.resolve(null);
 if(!opening)opening=new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('Armazenamento indisponível'));
 }).catch(()=>null);
 return opening;
}
async function persist(data){
 memory=data;
 const db=await openDb();if(!db)return false;
 return new Promise(resolve=>{
  try{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put(data,KEY);
   tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);
  }catch(_){resolve(false);}
 });
}
async function load(){
 if(memory)return memory;
 const db=await openDb();if(db){
  const data=await new Promise(resolve=>{
   try{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get(KEY);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>resolve(null);
   }catch(_){resolve(null);}
  });
  if(data){try{return memory=valid(data);}catch(_){return null;}}
 }
 return null;
}
async function readFile(file){
 if(!file||file.size>MAX_BYTES)throw Error('Arquivo acima do limite de 12 MB.');
 let raw;
 if(/\.gz$/i.test(file.name)){
  if(typeof DecompressionStream!=='function')throw Error('Este navegador não suporta JSON.GZ. Envie a versão .json.');
  raw=await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
 }else raw=await file.text();
 if(raw.length>20*1024*1024)throw Error('Banco descompactado acima do limite permitido.');
 return valid(JSON.parse(raw));
}
function status(message,error=false){
 const node=$('anki-cfo-status');
 if(node){node.textContent=String(message);node.dataset.error=String(Boolean(error));}
}
function fill(select,values,all){
 if(!select)return;
 const prev=select.value;
 select.textContent='';
 const first=new Option(all,'');select.append(first);
 for(const value of values)select.append(new Option(value,value));
 select.value=values.includes(prev)?prev:'';
}
function refreshTopic(){
 const data=memory,c=$('anki-cfo-disciplina')?.value||'';
 const subjects=data?.cards||[];
 fill($('anki-cfo-assunto'),uniq(subjects.filter(x=>!c||x.disciplina===c).map(x=>x.assunto)),'Todos os assuntos');
}
function showFilter(){
 const active=$('anki-source')?.value==='cfo-gst';
 if($('anki-cfo-controls'))$('anki-cfo-controls').hidden=!active;
 if($('anki-generation-mode'))$('anki-generation-mode').disabled=active;
 if($('anki-card-style'))$('anki-card-style').disabled=active;
 if($('anki-start'))$('anki-start').textContent=active?'Iniciar revisão do acervo CFO':'Gerar e iniciar revisão';
 if(active)load().then(data=>{if(data)showCatalog(data);else status('Importe o banco ANKI CFO GST convertido (.json.gz) para disponibilizar os cartões neste navegador.',true);});
}
function showCatalog(data){
 fill($('anki-cfo-disciplina'),uniq(data.cards.map(x=>x.disciplina)),'Todas as disciplinas');
 refreshTopic();
 const verified=data.cards.filter(x=>x.reviewed_source).length;
 status('Acervo carregado: '+data.cards.length.toLocaleString('pt-BR')+' cartões · '+
       uniq(data.cards.map(x=>x.disciplina)).length+' disciplinas · '+verified+
       ' gabaritos revisados com fonte. Os demais não possuem validação jurídica individual.');
}
async function importFile(file){
 const data=await readFile(file);
 const saved=await persist(data);
 showCatalog(data);
 if(!saved)status('Acervo pronto nesta aba, mas o armazenamento permanente não está disponível. Faça novo envio em outra sessão.',true);
 if($('anki-source')){$('anki-source').value='cfo-gst';showFilter();}
 return data.cards.length;
}
async function tryDefault(){
 if(memory)return memory;
 const saved=await load();if(saved)return saved;
 try{
  const url=new URL('assets/bancos/anki-cfo-gst.json.gz',document.baseURI);
  const response=await fetch(url.toString(),{cache:'no-store'});
  if(!response.ok)return null;
  const blob=await response.blob();
  const file=new File([blob],'anki-cfo-gst.json.gz',{type:'application/gzip'});
  const data=await readFile(file);await persist(data);return data;
 }catch(_){return null;}
}
async function filtered(){
 const data=await tryDefault();if(!data)return [];
 const subject=$('anki-cfo-disciplina')?.value||'',topic=$('anki-cfo-assunto')?.value||'';
 return data.cards.filter(c=>(!subject||c.disciplina===subject)&&(!topic||c.assunto===topic));
}
function reset(){
 if($('anki-cfo-disciplina'))$('anki-cfo-disciplina').value='';
 refreshTopic();
 if($('anki-cfo-assunto'))$('anki-cfo-assunto').value='';
 showFilter();
}
function init(){
 const source=$('anki-source'),input=$('anki-cfo-import');
 if(source)source.addEventListener('change',showFilter);
 if(input)input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file)return;
  status('Lendo e validando o banco ANKI...');
  try{await importFile(file);}catch(error){status('Falha ao importar: '+String(error.message||error),true);}
  finally{input.value='';}
 });
 const disc=$('anki-cfo-disciplina');if(disc)disc.addEventListener('change',refreshTopic);
 tryDefault().then(data=>{if(data)showCatalog(data);else status('Banco não importado. Envie o arquivo convertido para iniciar.');showFilter();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.PMDFAnkiCFO=Object.freeze({version:'20261117-cfo-v1',validate:valid,readFile,importFile,load,filtered,reset});
})(window);
