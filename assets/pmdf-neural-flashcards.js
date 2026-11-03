/* Método PMDF — Flashcards de alta cobertura, extração local.
   Especificação: atomicidade, literalidade, cloze, julgamento e rastreabilidade.
   Reutiliza a rede neural do motor de questões para pontuação. Não é IA generativa.
   Sem chamadas externas, sem limite arbitrário de cartões; a fonte limita a cobertura.
*/
(function(root){
"use strict";
const TAGS={prazo:"#Prazo",modal:"#Obrigacao",excecao:"#Excecao",competencia:"#Competencia",definicao:"#Conceito"};
const clean=v=>String(v??"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g," ").trim();
const norm=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").replace(/[.!?;:,]+$/,"");
function hash(value){let a=2166136261,b=2246822519;for(const ch of value){const code=ch.charCodeAt(0);a=Math.imul(a^code,16777619);b=Math.imul(b+code,3266489917);}return (a>>>0).toString(36)+(b>>>0).toString(36);}
function sourceRows(guide){
 const law=clean(guide?.lawName)||"Material de estudo",rows=[],mapping=guide?.articlesMapping||{};
 for(const [group,priority] of [["highIncidence","Alta"],["mediumIncidence","Média"],["lowIncidence","Baixa"]]){
  for(const item of Array.isArray(mapping[group])?mapping[group]:[]){
   const text=clean(item.sourceText)||clean(item.plainExplanation);
   if(text)rows.push({law,article:clean(item.article||item.title)||"Trecho do material",text,priority,literal:!!clean(item.sourceText)});
  }
 }
 return rows;
}
function splitUnits(raw){
 const lines=String(raw||"").replace(/\r/g,"").replace(/\u00a0/g," ").split(/\n+/).map(clean).filter(Boolean),units=[];
 for(const line of lines){
  // A abreviação Art. seguida de número nunca é separada em dois trechos.
  const chunks=line.split(/(?<=[;!?])\s+(?=[\p{L}\d])|(?<=\.)\s+(?=[A-ZÀ-Ý])/u);
  for(const chunk of chunks){
   const text=clean(chunk);if(text.length<22)continue;
   const sentenceChunks=text.length>650?text.split(/;\s+(?=[\p{L}\d])/u):[text];
   for(const part of sentenceChunks){
    const phrase=clean(part);
    if(phrase.length>=22)units.push(phrase);
   }
  }
 }
 return units;
}
function atomicParts(text){
 const found=[text],modal=/\b(?:deverá|deverão|deve|devem|poderá|poderão|pode|podem|compete|cabem|cabe|incumbe|será|serão|é\s+vedado|é\s+proibido)\b/gi;
 const matches=[...text.matchAll(modal)];
 if(matches.length>1&&matches.length<=16){
  let subject=clean(text.slice(0,matches[0].index));
  if(subject.length>110)subject="";
  for(let i=0;i<matches.length;i++){
   const begin=matches[i].index,end=i+1<matches.length?matches[i+1].index:text.length;
   let part=clean(text.slice(begin,end)).replace(/^[,;]\s*|\s*[,;]\s*$/g,"");
   part=part.replace(/(?:,\s*)?(?:e|ou)\s*$/i,"").trim();
   if(part.length<20||part.length>460)continue;
   const joined=subject?subject+" "+part:part;
   if(joined.length>=28&&joined.length<=560)found.push(joined);
  }
 }
 return [...new Map(found.map(x=>[norm(x),x])).values()];
}
const keyPatterns=[
 {label:"prazo",kind:"Prazo e quantidade",re:/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?|minutos?|segundos?|%|por\s+cento|pessoas?|membros?|sal[áa]rios?\s+m[íi]nimos?)\b/gi},
 {label:"modal",kind:"Proibição e requisito",re:/\b(?:deverá|deverão|devem|deve|poderá|poderão|podem|pode|vedad[oa]s?|proibid[oa]s?|obrigat[óo]ri[oa]s?|somente|apenas|exclusivamente|nunca|jamais)\b/gi},
 {label:"excecao",kind:"Exceção e condição",re:/\b(?:desde\s+que|salvo|exceto|ressalvad[oa]s?|mediante|independentemente\s+de|condicionad[oa]\s+a|se\s+e\s+somente\s+se)\b/gi}
];
const predicate=/^(.{5,112}?)\s+(é|são|será|serão|consiste\s+em|corresponde\s+a|compreende|inclui|abrange|deverá|deverão|deve|devem|poderá|poderão|pode|podem|não\s+pode|não\s+deve|tem\s+direito\s+a)\s+(.{9,480})$/i;
function nuclearQuote(text,match){
 const size=text.length;
 if(size<=490)return text;
 // Um recorte não constitui transcrição integral: use apenas uma oração completa.
 let start=Math.max(0,text.lastIndexOf(";",match.index)+1);
 let end=text.indexOf(";",match.index+match[0].length);
 if(end===-1)end=size;
 const clause=clean(text.slice(start,end));
 return clause.length<=490&&clause.length>=45?clause:null;
}
function mutation(text){
 const trials=[
  {re:/\b(\d+(?:[.,]\d+)?)\s+(dias?|meses?|anos?|horas?|minutos?)\b/i,replace:m=>{
    const number=Number(m[1].replace(",","."));if(!Number.isInteger(number)||number<1)return null;
    return {wrong:m[0].replace(m[1],String(number+1)),truth:m[0],trap:"Alteração numérica"};}},
  {re:/\b(vedado|vedada|proibido|proibida)\b/i,replace:m=>({wrong:"permitido",truth:m[0],trap:"Inversão de proibição"})},
  {re:/\b(exclusivamente|somente|apenas)\b/i,replace:m=>({wrong:"sem restrição",truth:m[0],trap:"Supressão de exclusividade"})},
  {re:/\b(deverá|deverão|devem|deve)\b/i,replace:m=>({wrong:"poderá facultativamente",truth:m[0],trap:"Dever versus faculdade"})},
  {re:/\b(poderá|poderão|podem|pode)\b/i,replace:m=>({wrong:"deverá obrigatoriamente",truth:m[0],trap:"Faculdade versus dever"})}
 ];
 for(const r of trials){
  const m=r.re.exec(text);if(!m)continue;
  const x=r.replace(m);if(!x||x.wrong.toLowerCase()===x.truth.toLowerCase())continue;
  return {statement:text.slice(0,m.index)+x.wrong+text.slice(m.index+m[0].length),
   original:x.truth,modified:x.wrong,trap:x.trap};
 }
 return null;
}
function modelClass(text,category){
 const motor=root.PMDFNeuralQuestions?.testModel?.();
 let score=0.45;
 try{if(motor?.extrairFeatures&&motor?.preverVetor)score=motor.preverVetor(motor.extrairFeatures(text)).saida[0]??score;}catch(_){}
 let difficulty=category==="cloze"?"Fácil":category==="trap"?"Difícil":/salvo|exceto|desde que|mediante|ressalva|concorrent|cumulativ/i.test(text)?"Médio":score>0.7?"Médio":"Fácil";
 return {difficulty,score:Number(Math.max(0,Math.min(1,score)).toFixed(3))};
}
function buildContext(guide,level){
 return {law:clean(guide?.lawName)||"Material de estudo",level:level||"intermediario",
  seen:new Set(),cards:[],unitsSeen:new Set(),covered:new Set(),
  skipped:0,modalities:{"Básico (P&R)":0,"Cloze (Lacuna)":0,"Gatilho de Banca":0},
  difficulties:{"Fácil":0,"Médio":0,"Difícil":0}};
}
function createCard(ctx,row,unit,data){
 const front=clean(data.front),back=clean(data.back),source=clean(row.text),reference=row.article;
 if(front.length<24||front.length>650||back.length<3||back.length>450||source.length<22||
    /…|\b(?:undefined|null)\b/i.test(front+" "+back)||norm(front)===norm(back))return false;
 // Evita perguntas sem resposta verificável ou construção que mude o sujeito jurídico.
 if(data.evidence&&!norm(source).includes(norm(data.evidence)))return false;
 const signature=norm(ctx.law+"|"+reference+"|"+front+"|"+back);
 if(ctx.seen.has(signature))return false;
 ctx.seen.add(signature);
 const m=modelClass(unit,data.family),id="anki-v3-"+hash(signature);
 const tags=[row.literal?"#LeiSeca":"#Resumo","#"+data.family,"#"+clean(reference).replace(/\W+/g,"").slice(0,28)];
 if(data.key)tags.push(TAGS[data.key]||"#Regra");
 const card={id,law:ctx.law,article:reference,front,back,kind:data.kind,
  modality:data.modality,difficulty:m.difficulty,neuralScore:m.score,
  source,extra:source,warning:data.warning||"Compare o enunciado com a fonte: não há validação jurídica externa.",
  priority:row.priority,reference,tags:tags.join(" "),cloze:data.cloze||null,
  difficultyLevel:ctx.level};
 ctx.cards.push(card);ctx.modalities[data.modality]++;ctx.difficulties[card.difficulty]++;ctx.covered.add(reference);
 return true;
}
function generateUnit(ctx,row,unit){
 const ref=row.article;
 const phrase=clean(unit).replace(/\s*[.;]\s*$/,"");
 const match=predicate.exec(phrase);
 if(match){
  const subject=clean(match[1]).replace(/^(?:Art\.?\s*\d+[º°]?\s*[-—:]?\s*)/i,"").trim();
  const verb=clean(match[2]),object=clean(match[3]);
  if(subject.length>=5&&subject.length<=112&&object.length<=320){
   const definition=/^(?:é|são|será|serão|consiste em|corresponde a|compreende|inclui|abrange)$/i.test(verb);
   const question=definition?"Conforme "+ref+", o que caracteriza "+subject+"?":
      "Segundo "+ref+", qual conduta ou condição é atribuída a "+subject+"?";
   createCard(ctx,row,unit,{family:"basic",kind:"Regra principal",modality:"Básico (P&R)",
    front:question,back:verb+" "+object,evidence:object});
  }
 }
 // Clozes atômicos: cada ocorrência substantiva produz um ângulo, sem teto por artigo.
 const positions=new Set();
 for(const rule of keyPatterns){
  const re=new RegExp(rule.re.source,rule.re.flags);let m;
  while((m=re.exec(unit))){
   if(positions.has(m.index))continue;positions.add(m.index);
   const target=m[0];if(target.length<3)continue;
   const excerpt=nuclearQuote(unit,m);if(!excerpt||!excerpt.includes(target))continue;
   const index=excerpt.indexOf(target);
   const front="Complete a lacuna segundo "+ref+": "+excerpt.slice(0,index)+"_____"+excerpt.slice(index+target.length)+"?";
   const cloze=excerpt.slice(0,index)+"{{c1::"+target+"}}"+excerpt.slice(index+target.length);
   createCard(ctx,row,unit,{family:"cloze",kind:rule.kind,modality:"Cloze (Lacuna)",
    front,back:"Expressão correta: "+target+".",evidence:target,cloze,key:rule.label});
  }
 }
 // Enunciado exatamente apoiado na fonte, sem criar lei, competência ou hipótese fictícia.
 if(phrase.length>=55&&phrase.length<=360&&/\b(?:deve|pode|será|é|são|compete|vedado|proibido|desde que|salvo)\b/i.test(phrase)){
  createCard(ctx,row,unit,{family:"trap",kind:"Gatilho de Banca",modality:"Gatilho de Banca",
   front:"[Julgue / Pegadinha] Conforme "+ref+": "+phrase+" — CERTO ou ERRADO?",
   back:"CERTO — a afirmação reproduz a regra presente no material.",evidence:phrase,
   warning:"Literalidade da fonte. Não confunda a reprodução textual com confirmação de vigência."});
  const mut=mutation(phrase);
  if(mut&&mut.statement.length<=360)
   createCard(ctx,row,unit,{family:"trap",kind:"Gatilho de Banca",modality:"Gatilho de Banca",
    front:"[Julgue / Pegadinha] Segundo o trecho de "+ref+": "+mut.statement+" — CERTO ou ERRADO?",
    back:"ERRADO — o texto contém “"+mut.original+"”, e não “"+mut.modified+"”.",
    evidence:mut.original,key:"modal",warning:mut.trap+". O julgamento compara a afirmação somente ao trecho fornecido."});
 }
}
function processRow(ctx,row){
 if(!row.text||row.text.length<22){ctx.skipped++;return;}
 const units=splitUnits(row.text);
 for(const unit of units){
  for(const atom of atomicParts(unit)){
   const sig=norm(row.law+"|"+row.article+"|"+atom);
   if(ctx.unitsSeen.has(sig))continue;
   ctx.unitsSeen.add(sig);generateUnit(ctx,row,atom);
  }
 }
}
function summary(ctx,rows){
 return {cards:ctx.cards,report:{total:ctx.cards.length,sourceUnits:ctx.unitsSeen.size,
  sourceRows:rows.length,coveredTopics:ctx.covered.size,pendingTopics:Math.max(0,rows.length-ctx.covered.size),
  skipped:ctx.skipped,modalities:ctx.modalities,difficulties:ctx.difficulties,
  engine:"Motor neural compartilhado + elaboração extrativa local",
  warning:"Cobertura válida dos trechos legíveis; material insuficiente ou ambíguo não gera afirmações inventadas."}};
}
function build(guide,options={}){
 const rows=sourceRows(guide),ctx=buildContext(guide,options.level);
 for(const row of rows)processRow(ctx,row);
 return summary(ctx,rows);
}
async function buildAsync(guide,options={}){
 const rows=sourceRows(guide),ctx=buildContext(guide,options.level);
 for(let i=0;i<rows.length;i++){
  if(options.cancelled?.())return {cards:[],cancelled:true,report:summary(ctx,rows).report};
  processRow(ctx,rows[i]);
  if(i%16===15){options.onProgress?.(i+1,rows.length,ctx.cards.length);
   await new Promise(resolve=>setTimeout(resolve,0));}
 }
 options.onProgress?.(rows.length,rows.length,ctx.cards.length);
 return summary(ctx,rows);
}
root.PMDFNeuralFlashcards=Object.freeze({build,buildAsync,sourceRows,version:"20261103-v1"});
})(window);
