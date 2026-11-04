/* Método PMDF — Cartões Anki de precisão para concursos.
   Cloze contextual + conceitos + contraste, fundamentados exclusivamente na fonte.
   Usa a classificação neural compartilhada das questões apenas para apoio de prioridade;
   NÃO é IA generativa, não valida vigência nem infere jurisprudência.
*/
(function(root){
"use strict";
const clean=v=>String(v??"").replace(/[\u200B-\u200D\uFEFF]/g,"").replace(/\s+/g," ").trim();
const norm=v=>clean(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[.!?;:,]+$/,"");
const hash=value=>{let a=2166136261,b=2246822519;for(const ch of String(value)){const c=ch.charCodeAt(0);a=Math.imul(a^c,16777619);b=Math.imul(b+c,3266489917);}return (a>>>0).toString(36)+(b>>>0).toString(36);};
const label=(ref)=>clean(ref).split(/\s+[—–-]\s+/).slice(1).join(" — ")||clean(ref);
const weak=/(?:\b(?:estudar|conferir|verificar|aprofundar|consultar)\b|banca pode exigir|de acordo com a redação normativa|conforme dispositivos próprios|nos termos da norma\b|a norma (?:prevê|disciplina) regras gerais)/i;
function sourceRows(g){
 const out=[],law=clean(g?.lawName)||"Material",map=g?.articlesMapping||{};
 for(const [key,priority] of [["highIncidence","Alta"],["mediumIncidence","Média"],["lowIncidence","Baixa"]])
  for(const row of Array.isArray(map[key])?map[key]:[]){
   const raw=clean(row.sourceText),text=raw||clean(row.plainExplanation);
   if(text)out.push({law,reference:clean(row.article||row.title)||"Trecho",text,priority,
    literal:!!raw,scope:clean(g?.contentScope)});
  }
 return out;
}
function splitUnits(text){
 // A divisão ocorre somente em pontuação que encerra enunciados. Não separa 'Art. 3º'.
 const paragraphs=String(text||"").replace(/\r/g,"").split(/\n+/).map(clean).filter(Boolean),out=[];
 for(const paragraph of paragraphs){
  const pieces=paragraph.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|(?<=;)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u);
  for(const piece of pieces){
   const clause=clean(piece);
   if(clause.length>=27)out.push(clause);
  }
 }
 return out;
}
function contextFor(text,offset,length){
 if(text.length<=330)return {text,offset};
 const semis=[...text.matchAll(/;/g)].map(x=>x.index);
 const start=Math.max(0,...semis.filter(i=>i<offset).map(i=>i+1));
 const end=semis.find(i=>i>=offset+length)??text.length;
 const slice=clean(text.slice(start,end));
 const leftTrim=text.slice(start,end).indexOf(slice);
 const pos=offset-start-leftTrim;
 if(slice.length>=36&&slice.length<=330&&pos>=0&&pos+length<=slice.length)return {text:slice,offset:pos};
 return null; // Não elimina premissas para fabricar contexto curto.
}
const numberRx=/\b(?:\d+(?:[.,]\d+)?|(?:um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez))\s*(?:dias?|meses?|anos?|horas?|minutos?|%|por cento|pessoas?|membros?|integrantes?|penas?|salários?\s+mínimos?)\b/gi;
const authorityRx=/\b(?:Ministério Público|autoridade policial|autoridade judiciária|juiz(?: competente)?|Governador(?: do (?:DF|Distrito Federal))?|Polícia Militar(?: do Distrito Federal)?|PMDF|Supremo Tribunal Federal|Tribunal do Júri|Poder Executivo|tribunal competente)\b/gi;
const modalRx=/\b(?:não se admite|é vedad[oa]|é proibid[oa]|vedad[oa]s?|proibid[oa]s?|não pode|não deve|deverá|deverão|devem|deve|poderá|poderão|podem|pode|somente|apenas|exclusivamente|independe|prescinde)(?=$|[^\p{L}])/giu;
const exceptionRx=/\b(?:salvo|exceto|ressalvad[oa]s?|desde que|mediante|condicionad[oa]\s+a|se indispensável|quando)\s+([^,;.!?]{8,86})/gi;
const definitionRx=/^(.{5,95}?)\s+(?:é|são|consiste em|corresponde a|compreende|abrange|envolve|depende de|exige)\s+([^,;.!?]{8,98})/i;
const leadingRx=/^(?:estabelece|institui|define|regula|prevê|disciplina|elenca|explicita|determina|exige|afasta|concede|permite)\s+([^,;.!?]{12,102})/i;
const modifiers=/#Prazo|#Competencia|#Excecao|#Modalidade|#Conceito/;
function candidates(text){
 const found=[];
 const add=(index,value,type,hint,rank)=>{
  const x=clean(value);
  if(index<0||x.length<2||x.length>98||x.split(" ").length>13||!text.startsWith(value,index))return;
  if(/^(?:a|o|as|os|para|por|a lei|as normas|a norma)$/i.test(x))return;
  found.push({index,value,type,hint,rank});
 };
 for(const [rx,type,hint,rank] of [
  [numberRx,"prazo","Prazo ou quantidade",100],
  [exceptionRx,"excecao","Hipótese ou ressalva",95],
  [authorityRx,"competencia","Órgão ou autoridade",90],
  [modalRx,"modalidade","Dever, faculdade ou proibição",75]]){
  const re=new RegExp(rx.source,rx.flags);let m;
  while((m=re.exec(text))){
   const target=type==="excecao"?m[1]:m[0];
   let start=m.index+(type==="excecao"?m[0].lastIndexOf(target):0);
   if(type==="excecao"){
    // O marcador 'salvo / desde que' permanece visível, e a ressalva é ocultada.
    if(target.length>70||target.length<12)continue;
   }
   if(type==="modalidade"&&/^(?:deve|pode)$/i.test(target)&&text.length>240)continue;
   add(start,target,type,hint,rank);
  }
 }
 const define=definitionRx.exec(text);
 if(define){
  const target=define[2];
  if(target.length>=12&&target.length<=76)add(define[0].lastIndexOf(target),target,"conceito","Definição ou critério",84);
 }
 const beginning=leadingRx.exec(text);
 if(beginning&&beginning[1].length<=74)add(beginning[0].lastIndexOf(beginning[1]),beginning[1],"conceito","Objeto ou comando legal",81);
 // Remove coincidências de alcance sobreposto; mantém o elemento mais informativo.
 const selected=[];
 for(const item of found.sort((a,b)=>b.rank-a.rank||b.value.length-a.value.length||a.index-b.index)){
  if(selected.some(y=>item.index<y.index+y.value.length&&y.index<item.index+item.value.length))continue;
  selected.push(item);
 }
 return selected.sort((a,b)=>a.index-b.index);
}
function mutate(text){
 const num=/(?:prazo\s+(?:máximo|mínimo|de)|em\s+até|em|no\s+máximo|não\s+superior\s+a|igual\s+ou\s+inferior\s+a)\s*(\d+)\s*(dias?|meses?|anos?|horas?)/i.exec(text);
 if(num){
  const value=Number(num[1]);
  if(value>0&&Number.isSafeInteger(value)){
   const bad=String(value+1),piece=num[1]+" "+num[2];
   const begin=num.index+num[0].lastIndexOf(num[1]);
   return {statement:text.slice(0,begin)+bad+text.slice(begin+num[1].length),
    from:piece,to:bad+" "+num[2],type:"Prazo ou limite"};
  }
 }
 const swaps=[
  {re:/\bdeverá(?=$|[^\p{L}])/iu,to:"poderá",type:"Obrigação × faculdade"},
  {re:/\bpoderá(?=$|[^\p{L}])/iu,to:"deverá",type:"Faculdade × obrigação"},
  {re:/\b(?:vedado|vedada|proibido|proibida)\b/i,to:"permitido",type:"Proibição × permissão"},
  {re:/\bsomente\b/i,to:"indistintamente",type:"Exclusividade"},
  {re:/\bapenas\b/i,to:"indistintamente",type:"Exclusividade"}
 ];
 for(const s of swaps){const m=s.re.exec(text);if(m){
  return {statement:text.slice(0,m.index)+s.to+text.slice(m.index+m[0].length),
   from:m[0],to:s.to,type:s.type};
 }}
 return null;
}
function neural(ctx,text){
 try{
  if(ctx.motor?.extrairFeatures&&ctx.motor?.preverVetor){
   const score=ctx.motor.preverVetor(ctx.motor.extrairFeatures(text)).saida[0];
   return Number(Math.max(0,Math.min(1,score)).toFixed(3));
  }
 }catch(_){}
 return .5;
}
function create(ctx,row,spec){
 const front=clean(spec.front),back=clean(spec.back);
 if(front.length<16||front.length>360||back.length<2||back.length>270||
    /…|\b(?:undefined|null)\b/i.test(front+" "+back)||norm(front)===norm(back))return;
 if(spec.anchor&&!norm(row.text).includes(norm(spec.anchor)))return;
 const identity=norm(row.law+"|"+row.reference+"|"+spec.modality+"|"+front+"|"+back);
 if(ctx.seen.has(identity))return;
 ctx.seen.add(identity);
 const difficulty=spec.difficulty||"Médio",score=neural(ctx,spec.unit||row.text);
 const tagName=spec.family==="cloze"?"#Cloze":spec.family==="trap"?"#Contraste":"#Conceito";
 const area=spec.type?("#"+spec.type.charAt(0).toUpperCase()+spec.type.slice(1)):"";
 const card={id:"anki-v4-"+hash(identity),front,back,kind:spec.kind,modality:spec.modality,
  law:row.law,article:row.reference,reference:row.reference,source:row.text,extra:row.text,
  scope:row.literal?"Trecho fornecido":"Síntese didática fornecida",warning:spec.warning||
  "Fundamento extraído apenas do material selecionado; conferir a norma vigente.",
  literal:row.literal,priority:row.priority,neuralScore:score,difficulty,difficultyLevel:ctx.level,
  family:spec.family,hint:spec.hint||"",cloze:spec.cloze||null,
  tags:[row.literal?"#FonteOriginal":"#ResumoDidatico",tagName,area,
   "#"+row.reference.replace(/[^\p{L}\d]+/gu,"").slice(0,28)].filter(Boolean).join(" ")};
 ctx.cards.push(card);ctx.modalities[card.modality]=(ctx.modalities[card.modality]||0)+1;
 ctx.difficulties[difficulty]=(ctx.difficulties[difficulty]||0)+1;ctx.covered.add(row.reference);
}
function generate(ctx,row,text){
 if(weak.test(text)||/[.…]$/.test(text.slice(0,-1))){ctx.skipped++;return;}
 const relevant=candidates(text).filter(c=>!(c.type==="conceito"&&definitionRx.test(text))),ref=row.reference,origin=label(ref),topic=origin===ref?row.law:origin;
 let created=0;
 for(const c of relevant){
  const context=contextFor(text,c.index,c.value.length);
  if(!context)continue;
  const off=context.offset;
  const token=context.text.slice(0,off)+"{{c1::"+c.value+"::"+c.hint+"}}"+context.text.slice(off+c.value.length);
  const front=context.text.slice(0,off)+"[lacuna]"+context.text.slice(off+c.value.length);
  if(front.length>330||front.length<25)continue;
  const lvl=c.type==="prazo"?"Fácil":c.type==="excecao"?"Difícil":c.type==="competencia"?"Médio":"Médio";
  create(ctx,row,{front,back:c.value,modality:"Cloze (Lacuna)",kind:c.hint,
   family:"cloze",type:c.type,cloze:ref+" · "+token,anchor:c.value,hint:c.hint,
   difficulty:lvl,unit:text});
  created++;
 }
 const def=definitionRx.exec(text);
 if(def){
  const subject=clean(def[1]).replace(/^(?:Art\.?\s*\d+[º°]?\s*[-—:]?\s*)/i,"");
  const pred=clean(text.slice(def[1].length,def[0].length));
  if(subject.length>=5&&subject.length<=90&&pred.length>=18&&pred.length<=135){
   create(ctx,row,{front:subject+" · "+topic,back:pred,modality:"Básico (P&R)",
    family:"basic",kind:"Conceito em uma frase",unit:text,anchor:pred,difficulty:"Médio"});
  }
 }
 // Trecho curto sem lacuna identificável: cartão de reconhecimento direto,
 // usando o título do dispositivo como gatilho; não inventa um enunciado novo.
 if(created===0&&text.length<=175&&text.length>=36&&/^(?:[A-ZÀ-Ý])/u.test(text)){
  const suffix=topic.length<=76?topic:ref;
  create(ctx,row,{front:suffix+" · "+ref,back:text,modality:"Básico (P&R)",
   family:"basic",kind:"Síntese expressa",unit:text,anchor:text,difficulty:"Médio"});
 }
 // O contraste só aparece quando há uma mudança inequívoca na palavra/limite.
 // Não se produzem "pegadinhas" por extrapolação de conteúdo não fornecido.
 if(text.length>=55&&text.length<=260&&/\b(?:deverá|poderá|somente|apenas|vedado|proibido|prazo)(?=$|[^\p{L}])/iu.test(text)){
  const m=mutate(text);
  if(m&&m.statement!==text){
   create(ctx,row,{front:m.statement,back:"ERRADO · "+m.from+" (não "+m.to+").",
    modality:"Gatilho de Banca",family:"trap",kind:"Contraste Cebraspe",
    unit:text,anchor:m.from,difficulty:"Difícil",
    warning:m.type+": contraste pontual com a fonte; não é validação jurisprudencial."});
  }
  // Uma assertiva literal correta serve como controle da polaridade.
  if(/(?:salvo|desde que|vedado|proibido|somente|apenas)\b/i.test(text)){
   create(ctx,row,{front:text,back:"CERTO · conforme o trecho-fonte.",
    modality:"Gatilho de Banca",family:"trap",kind:"Literalidade Cebraspe",
    unit:text,anchor:text,difficulty:"Médio"});
  }
 }
}
function buildContext(guide,level){
 let motor=null;try{motor=root.PMDFNeuralQuestions?.testModel?.()||null;}catch(_){}
 return {motor,law:clean(guide?.lawName)||"Material",level:level||"intermediario",
  cards:[],seen:new Set(),unitsSeen:new Set(),covered:new Set(),skipped:0,
  modalities:{"Básico (P&R)":0,"Cloze (Lacuna)":0,"Gatilho de Banca":0},
  difficulties:{"Fácil":0,"Médio":0,"Difícil":0}};
}
function process(ctx,row){
 for(const unit of splitUnits(row.text)){
  const identity=norm(row.law+"|"+row.reference+"|"+unit);
  if(ctx.unitsSeen.has(identity))continue;
  ctx.unitsSeen.add(identity);
  generate(ctx,row,unit);
 }
}
function finish(ctx,rows){
 return {cards:ctx.cards,report:{total:ctx.cards.length,
  sourceRows:rows.length,sourceUnits:ctx.unitsSeen.size,coveredTopics:ctx.covered.size,
  pendingTopics:rows.length-ctx.covered.size,skipped:ctx.skipped,
  modalities:ctx.modalities,difficulties:ctx.difficulties,
  engine:"Anki contextual: Cloze + conceitos + contraste (motor neural compartilhado)",
  warning:"Cartões extraídos somente de fatos verificáveis do material selecionado. Não é interpretação jurídica automática."}};
}
function build(guide,options={}){
 const rows=sourceRows(guide),ctx=buildContext(guide,options.level);
 for(const row of rows)process(ctx,row);
 return finish(ctx,rows);
}
async function buildAsync(guide,options={}){
 const rows=sourceRows(guide),ctx=buildContext(guide,options.level);
 for(let i=0;i<rows.length;i++){
  if(options.cancelled?.())return {...finish(ctx,rows),cards:[],cancelled:true};
  process(ctx,rows[i]);
  if(i%12===11){options.onProgress?.(i+1,rows.length,ctx.cards.length);
   await new Promise(resolve=>setTimeout(resolve,0));}
 }
 options.onProgress?.(rows.length,rows.length,ctx.cards.length);
 return finish(ctx,rows);
}
root.PMDFNeuralFlashcards=Object.freeze({build,buildAsync,sourceRows,version:"20261103-anki-v2"});
})(window);