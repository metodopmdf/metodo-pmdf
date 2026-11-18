/* Método PMDF — Acervo ANKI integrado à plataforma.
   Os cartões são publicados no GitHub Pages como dados estáticos JSON e carregados
   automaticamente; não há upload de arquivo ou dependência de IndexedDB.
   IDs originais preservados para manter o histórico de revisão Leitner. */
(function(root){
'use strict';
const ASSET='assets/bancos/anki.json?v=20261117-anki-editorial-v3';
let memory=null,opening=null;
const $=id=>document.getElementById(id);
const norm=s=>String(s??'').trim();
const uniq=arr=>[...new Set(arr)].sort((a,b)=>a.localeCompare(b,'pt-BR'));
function valid(data){
 if(!data||data.format!=='PMDF-ANKI-IMPORT-v1'||!Array.isArray(data.cards))
  throw Error('Formato do acervo ANKI integrado inválido.');
 if(!data.cards.length||data.cards.length>30000)
  throw Error('Quantidade de flashcards inválida.');
 const seen=new Set();
 for(const c of data.cards){
  if(!c||typeof c.id!=='string'||!/^cfo-gst-\d{8,}$/.test(c.id)||seen.has(c.id)
     ||typeof c.front!=='string'||typeof c.back!=='string'
     ||!norm(c.front)||!norm(c.back)||!norm(c.disciplina)||!norm(c.assunto)
     ||c.front.length>6000||c.back.length>6000)
   throw Error('O banco ANKI contém cartão inválido ou duplicado.');
  seen.add(c.id);
 }
 return data;
}
function status(message,error=false){
 const el=$('anki-cfo-status');
 if(el){el.textContent=String(message);el.dataset.error=String(Boolean(error));}
}
function fill(select,values,label){
 if(!select)return;
 const previous=select.value;
 select.replaceChildren(new Option(label,''));
 for(const value of values)select.append(new Option(value,value));
 select.value=values.includes(previous)?previous:'';
}
function refreshTopic(){
 const cards=memory?.cards||[],discipline=$('anki-cfo-disciplina')?.value||'';
 fill($('anki-cfo-assunto'),uniq(cards.filter(c=>!discipline||c.disciplina===discipline).map(c=>c.assunto)),'Todos os assuntos');
}
function showCatalog(data){
 fill($('anki-cfo-disciplina'),uniq(data.cards.map(c=>c.disciplina)),'Todas as disciplinas');
 refreshTopic();
 const reviewed=data.cards.filter(c=>Boolean(c.reviewed_source)).length;
 status('ANKI integrado · '+data.cards.length.toLocaleString('pt-BR')+' cartões disponíveis · '+
  uniq(data.cards.map(c=>c.disciplina)).length+' disciplinas · '+reviewed+
  ' gabaritos com correção documentada. Revisão normativa individual dos demais pendente.');
}
async function load(){
 if(memory)return memory;
 if(opening)return opening;
 status('Carregando acervo ANKI integrado...');
 opening=(async()=>{
  const url=new URL(ASSET,document.baseURI);
  const response=await root.fetch(url.toString(),{cache:'default'});
  if(!response.ok)throw Error('Não foi possível obter o acervo publicado (HTTP '+response.status+').');
  const data=valid(await response.json());
  memory=data;
  showCatalog(data);
  return data;
 })();
 try{return await opening;}
 catch(e){
  opening=null;
  status('Falha ao carregar o acervo ANKI. Verifique a conexão e atualize a página. '+String(e.message||e),true);
  throw e;
 }
}
function showFilter(){
 const active=$('anki-source')?.value==='cfo-gst';
 if($('anki-cfo-controls'))$('anki-cfo-controls').hidden=!active;
 if($('anki-generation-mode'))$('anki-generation-mode').disabled=active;
 if($('anki-card-style'))$('anki-card-style').disabled=active;
 if($('anki-start'))$('anki-start').textContent=active?'Iniciar revisão ANKI':'Gerar e iniciar revisão';
 if(active)load().catch(()=>{});
}
async function filtered(){
 const data=await load();
 const discipline=$('anki-cfo-disciplina')?.value||'',topic=$('anki-cfo-assunto')?.value||'';
 return data.cards.filter(c=>(!discipline||c.disciplina===discipline)&&(!topic||c.assunto===topic));
}
function reset(){
 if($('anki-cfo-disciplina'))$('anki-cfo-disciplina').value='';
 refreshTopic();
 if($('anki-cfo-assunto'))$('anki-cfo-assunto').value='';
 showFilter();
}
function init(){
 const source=$('anki-source'),discipline=$('anki-cfo-disciplina');
 if(source)source.addEventListener('change',showFilter);
 if(discipline)discipline.addEventListener('change',refreshTopic);
 showFilter();
 // Pré-carregamento automático: nenhum envio é solicitado ao usuário.
 load().catch(()=>{});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
root.PMDFAnkiCFO=Object.freeze({version:'20261117-anki-embedded-v1',validate:valid,load,filtered,reset,showFilter});
})(window);
