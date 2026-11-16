/* Método PMDF · Perguntas de revisão estratégica, executadas no navegador.
   Integra o classificador neural local existente para escore pedagógico. A escrita
   é determinística e baseada em padrões semânticos; NÃO é LLM nem gera fatos novos.
   Toda resposta precisa estar presente na unidade de origem. */
(function(root){
'use strict';
const original=root.PMDFNeuralFlashcards;
if(!original || typeof original.build!=='function')return;
const clean=s=>String(s??'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
const fold=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[.!?;:,]+$/,'');
const hash=s=>{let a=2166136261;for(const c of String(s))a=Math.imul(a^c.charCodeAt(0),16777619);return (a>>>0).toString(36);};
const cap=s=>s?s[0].toUpperCase()+s.slice(1):'';
const strip=s=>clean(s).replace(/[;,.\s]+$/,'');
const bad=/\b(?:conferir|estudar|verificar|aprofundar|consultar)\b.{0,38}\b(?:lei|dispositivo|fonte|norma)|banca pode exigir|conforme dispositivos próprios|a norma prevê regras gerais/i;
const modal=/\b(?:salvo|exceto|somente|apenas|exclusivamente|vedad[oa]|proibid[oa]|desde que|independe)\b/i;
const days=/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?)\b/gi;
const lexVerb='(?:é|são|consiste em|corresponde a|compreende|abrange|abrangem|envolve|envolvem|caracteriza-se por|caracterizam-se por|considera-se|consideram-se|classifica-se como|configura|configuram|constitui|constituem)';
function topic(ref){
 const x=clean(ref),m=x.match(/[—–:]\s*(.+)$/);
 return m?strip(m[1]).slice(0,85):(/^(?:Art(?:s)?\.?\s*[\dº°, a-z]+|Tópico \d+)$/i.test(x)?'':strip(x).slice(0,85));
}
function segment(text){
 // Não separam-se abreviações legais como "Art." ou "nº." como se fossem frases.
 const fixed=String(text||'').replace(/\b(Art|arts|inc|nº|n\.)\.\s*(?=\d)/gi,(m)=>m.replace(/\./g,'\uE000'));
 return fixed.replace(/\r/g,' ').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|(?<=;)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u)
  .map(x=>clean(x.replace(/\uE000/g,'.'))).filter(x=>x.length>=24&&x.length<=1300);
}
function peel(text){
 return clean(text).replace(/^(?:Art(?:s)?\.?\s*\d+[º°]?\s*(?:,\s*\d+[º°]?)?(?:\s*[-–—:]\s*|\s+))+/i,'');
}
function rowsFor(guide){
 const out=[],map=guide?.articlesMapping||{};
 for(const [key,priority] of [['highIncidence','Alta'],['mediumIncidence','Média'],['lowIncidence','Baixa']]){
  for(const entry of (Array.isArray(map[key])?map[key]:[])){
   const ref=clean(entry?.article||entry?.title||''),law=clean(guide?.lawName)||'Material de estudo';
   const short=clean(entry?.plainExplanation),full=clean(entry?.sourceText),example=clean(entry?.practicalExample);
   if(!short&&!full)continue;
   const primary=short||full;
   const row={law,reference:ref||'Tópico do material',text:primary,full:full||primary,
    priority,example,literal:!!full,scope:clean(guide?.contentScope),topic:topic(ref)};
   out.push(row);
   // Quando o original fornece informações adicionais, processa separadamente
   // os períodos integrais, sem fabricar complemento não presente no material.
   if(full&&short&&fold(full)!==fold(short))out.push({...row,text:full,originalPart:true});
  }
 }
 if(!out.length){
  const concepts=guide?.executiveSummary?.keyConcepts;
  if(Array.isArray(concepts))for(let i=0;i<concepts.length;i++){
   const c=clean(concepts[i]);if(c.length<25)continue;
   const pos=c.indexOf(':');const title=pos>4&&pos<105?clean(c.slice(0,pos)):'Conceito '+(i+1);
   out.push({law:clean(guide?.lawName)||'Material',reference:title,text:c,full:c,example:'',
    priority:'Média',literal:false,scope:'Síntese didática fornecida',topic:topic(title)});
  }
 }
 return out;
}
function extractScore(ctx,text){
 try{const m=ctx.motor;if(m?.extrairFeatures&&m?.preverVetor){
  const v=m.preverVetor(m.extrairFeatures(text));return Math.max(0,Math.min(1,Number(v.saida?.[0])||0));
 }}catch(_){}
 return .5;
}
function push(ctx,row,unit,front,back,kind,anchor,detail=''){
 front=clean(front);back=strip(back);anchor=clean(anchor);
 if(!front.endsWith('?'))front=front.replace(/[.:;, ]+$/,'')+'?';
 if(front.length<24||front.length>205||back.length<8||back.length>280)return false;
 if(/…|\.{3}|\b(?:undefined|null)\b/i.test(front+' '+back)||fold(front)===fold(back))return false;
 if(bad.test(front)||bad.test(back))return false;
 const evidence=clean(unit);
 if(!anchor || !fold(evidence).includes(fold(anchor)))return false;
 // A resposta deve constar da mesma unidade. Não se cria resposta por analogia.
 if(!fold(evidence).includes(fold(back))){
  // Em comparações, cada cláusula deve existir na fonte, embora o verso
  // substitua 'enquanto' por ';' para facilitar memorização.
  if(kind!=='Distinção'||!back.includes('; ')||
     !back.split('; ').every(part=>fold(evidence).includes(fold(part))))return false;
 }
 const signature=fold(row.law+'|'+row.reference+'|'+front);
 if(ctx.seen.has(signature))return false;
 ctx.seen.add(signature);
 const score=extractScore(ctx,unit);
 const priority=row.priority==='Alta'?3:row.priority==='Média'?1:0;
 const typeScore={Distinção:3,Competência:3,Exceção:3,Prazo:3,Requisito:3,Conceito:2,Classificação:2,Aplicação:1}[kind]||1;
 const weight=priority+typeScore+score;
 const id='anki-qa-v1-'+hash(signature+'|'+fold(back));
 const item={id,front,back:cap(back),kind:kind+' · pergunta de revisão',modality:'Pergunta estratégica (P&R)',
  law:row.law,article:row.reference,reference:row.reference,source:evidence,extra:evidence,
  sourceQuote:evidence,scope:row.literal?'Trecho do material':'Síntese didática do material',
  warning:'Pergunta construída localmente a partir do texto; consulte a fonte oficial vigente.',
  tip:detail||'Recupere a ideia principal antes de revelar a resposta.',
  pitfall:'',application:row.example&&row.example.length<=220?row.example:'',
  literal:row.literal,priority:row.priority,neuralScore:Number(score.toFixed(3)),
  difficulty:weight>=6?'Difícil':weight>=3?'Médio':'Fácil',
  family:'question',hint:kind,cloze:null,weight,
  tags:'#PerguntaEstratégica #'+kind.normalize('NFD').replace(/[\u0300-\u036f]/g,'')+' #FonteVerificável'};
 ctx.cards.push(item);ctx.covered.add(row.reference);
 ctx.modalities['Pergunta estratégica (P&R)']=(ctx.modalities['Pergunta estratégica (P&R)']||0)+1;
 return true;
}
function processUnit(ctx,row,unit){
 const sentence=peel(unit);if(sentence.length<24||bad.test(sentence))return;
 const t=row.topic;
 let added=0;
 const add=(q,a,k,anchor,detail)=>{if(added>=3)return false;
  const ok=push(ctx,row,sentence,q,a,k,anchor,detail);if(ok)added++;return ok;
 };
 // Dois institutos apresentados em contraste explícito, sem deduzir um segundo conceito.
 const compared=sentence.match(/^(.{8,145}?)\s+(?:enquanto|ao passo que)\s+(.{8,180})[.!]?$/i);
 if(compared){
  const a=strip(compared[1]),b=strip(compared[2]);
  const nameA=a.match(/^((?:a|o|as|os)\s+[\p{L}\s-]{4,66}?)\s+(?:é|são|ocorre|tem|possui|envolve|atribui|distribui|transfere|implica|pressupõe|assume)\b/iu);
  const nameB=b.match(/^((?:a|o|as|os)\s+[\p{L}\s-]{4,66}?)\s+(?:é|são|ocorre|tem|possui|envolve|atribui|distribui|transfere|implica|pressupõe|assume)\b/iu);
  if(nameA&&nameB&&a.length+b.length<=255)
   add('Qual é a diferença entre '+strip(nameA[1]).replace(/^(A|O|As|Os) /,x=>x.toLowerCase())+' e '+strip(nameB[1]).replace(/^(A|O|As|Os) /,x=>x.toLowerCase())+'?',
       a+'; '+b,'Distinção',a,'Compare as duas proposições sem inverter seus efeitos.');
 }
 // Definições: deslocar o foco do enunciado para o instituto, sem copiar um caput.
 const definition=new RegExp('^(.{5,125}?)\\s+('+lexVerb+')\\s+(.{8,275})[.!]?$', 'iu').exec(sentence);
 if(definition){
  const subject=strip(definition[1]),verb=fold(definition[2]),predicate=strip(definition[3]);
  const goodSubject=subject.length<=115&&!/^(?:a lei|o dispositivo|o presente artigo)$/i.test(subject);
  if(goodSubject){
   let q;
   if(/^os membros\b|^os integrantes\b|^as integrantes\b|^as pessoas\b/i.test(subject))
     q='Como são classificados '+subject.toLowerCase()+'?';
   else if(/consiste em/.test(verb))q='Em que consiste '+subject.toLowerCase()+'?';
   else if(/abrange|abrangem|compreende|envolve|envolvem/.test(verb))q='O que está abrangido pelo conceito de '+subject.toLowerCase()+'?';
   else if(/constitui|constituem|configura|configuram|caracteriza/.test(verb))q='O que caracteriza '+subject.toLowerCase()+'?';
   else if(/sao|classifica-se/.test(verb))q='Como se definem '+subject.toLowerCase()+'?';
   else q='O que significa '+subject.toLowerCase()+'?';
   add(q,predicate,'Conceito',predicate,'Identifique o núcleo da definição e os qualificadores.');
  }
 }
 // Construções colonadas do próprio material (títulos de temas e sínteses).
 const colon=sentence.match(/^([^:]{8,94}):\s+(.{15,270})$/);
 if(colon&&!/^https?:\/\//.test(sentence)){
  let subject=strip(colon[1]).replace(/^Art(?:s)?\.?\s*\d+[º°]?\s*[—–-]\s*/i,'');
  const answer=strip(colon[2]);
  if(subject.length>=6&&subject.length<=85&&!/^art\.?\s*\d+/i.test(subject)){
   add('Qual é o conceito ou a característica central de '+subject+'?',answer,'Conceito',answer,
     'Associe o instituto ao elemento que o distingue.');
  }
 }
 // Atributos e características. Evita pergunta-vazia para sequências isoladas.
 const characteristic=sentence.match(/^(.{8,105}?)\s+(não possuem|possuem|não têm|têm|tem|apresentam|caracterizam-se por)\s+(.{9,205})[.!]?$/i);
 if(characteristic){
  const subject=strip(characteristic[1]),rest=strip(characteristic[2]+' '+characteristic[3]);
  add('Quais características são atribuídas a '+subject.toLowerCase()+'?',rest,
      'Classificação',rest,'Memorize atributos afirmados e negados.');
 }
 // Finalidade e alcance de princípios, direitos e regras.
 const provides=sentence.match(/^(.{8,105}?)\s+(permite|assegura|garante|estabelece|prevê|determina|autoriza|veda|proíbe|impõe|disciplina)\s+(.{12,255})[.!]?$/i);
 if(provides){
  const subject=strip(provides[1]),fact=strip(provides[2]+' '+provides[3]);
  const q=/\bprinc[ií]pio\b/i.test(subject)
    ?'O que representa '+subject.toLowerCase()+'?'
    :'Qual é o alcance de '+subject.toLowerCase()+'?';
  add(q,fact,'Conceito',fact,'Retenha o efeito da regra e o limite de sua aplicação.');
 }
 // Listas declaradas no texto: não criar requisitos ausentes.
 const reqList=sentence.match(/^(?:são|constituem|consideram-se)\s+(?:os\s+|as\s+)?(?:requisitos|condi[cç][oõ]es|elementos)\s+(?:essenciais|necess[aá]rios|fundamentais)?\s*(?:para|de|do|da)\s+(.{6,85}?):\s*(.{14,230})$/i);
 if(reqList){
  const purpose=strip(reqList[1]),facts=strip(reqList[2]);
  add('Quais são os requisitos essenciais para '+purpose+'?',facts,'Requisito',facts,
      'Recorde os requisitos cumulativos exatamente como apresentados.');
 }
 // Competência explicitamente atribuída a um sujeito, sem presumir outros órgãos.
 const competence=sentence.match(/^(?:compete|incumbe|cabe)\s+(à|ao|aos|às|a)\s+(.{5,83}?)\s+(apurar|julgar|fiscalizar|exercer|instaurar|promover|realizar|lavrar|autorizar|investigar|processar|executar|decidir|conduzir)\s+(.{7,210})[.!]?$/i);
 if(competence){
  const actor=strip(competence[2]),action=strip(competence[3]+' '+competence[4]);
  add('Qual atribuição compete '+competence[1]+' '+actor+'?',action,
      'Competência',action,'Não troque o sujeito competente em itens de prova.');
 }
 // Condições necessárias, hipóteses e requisitos expressos.
 const required=sentence.match(/^(.{7,110}?)\s+(depende de|exige|requer|pressupõe|condiciona-se a|necessita de)\s+(.{9,215})[.!]?$/i);
 if(required){
  const subject=strip(required[1]),condition=strip(required[2]+' '+required[3]);
  add('Quais requisitos condicionam '+subject.toLowerCase()+'?',condition,
      'Requisito',condition,'A ausência do requisito pode modificar a conclusão.');
 }
 const happens=sentence.match(/^(.{7,110}?)\s+(ocorre|se dá|acontece)\s+(com|quando|mediante)\s+(.{10,210})[.!]?$/i);
 if(happens){
  const subj=strip(happens[1]),condition=strip(happens[3]+' '+happens[4]);
  add('Em que situação ocorre '+subj.toLowerCase()+'?',condition,
      'Aplicação',condition,'Identifique o fato que faz incidir o conceito.');
 }
 // Proibições expressas e limites. A resposta é o trecho literal e não uma dedução.
 const forbidden=sentence.match(/^(?:é\s+)?(vedad[oa]|proibid[oa])\s+(.{10,240})[.!]?$/i);
 if(forbidden&&t){
  const answer=strip(forbidden[1]+' '+forbidden[2]);
  add('Qual é a vedação prevista sobre '+t+'?',answer,'Exceção',answer,
      'Uma troca entre permissão e proibição muda a regra.');
 }
 const except=sentence.match(/\b(salvo|exceto|desde que|ressalvado|ressalvada|somente se)\b\s+(.{11,200})$/i);
 if(except&&t){
  const answer=strip(except[1]+' '+except[2]);
  add('Qual condição ou ressalva deve ser observada em '+t+'?',answer,'Exceção',answer,
      'O termo restritivo delimita a regra e não pode ser ignorado.');
 }
 // Prazos isolados: exige assunto específico, e um único prazo identificável.
 const periods=[...sentence.matchAll(days)];
 if(periods.length===1&&t&&t.length>=7){
  const val=periods[0][0];
  add('Qual é o prazo ou limite temporal previsto para '+t+'?',val,'Prazo',val,
      'Memorize o valor e sua unidade, sem confundir hipóteses.');
 }
 // Enunciados normativos específicos com tema contextualizado.
 const action=sentence.match(/^(estabelece|prevê|determina|assegura|permite|autoriza|disciplina|regula)\s+(.{15,255})[.!]?$/i);
 if(action&&t){
  const answer=strip(action[1]+' '+action[2]);
  add('O que '+t+' estabelece ou disciplina?',answer,'Conceito',answer,
      'Identifique a previsão normativa e as condições de aplicação.');
 }
 // Último recurso limitado a títulos claros e texto curto. Não gera perguntas
 // sobre artigos numerados sem contexto temático específico.
 if(!added&&t.length>=10&&sentence.length>=40&&sentence.length<=230&&
    /(?:\b(?:compete|deverá|poderá|constitui|caracteriza|assegura|abrange|proíbe|permite|estabelece)\b|\b(?:são|é|consiste em)\b)/i.test(sentence)){
   const answer=strip(sentence);
   add('Qual regra central deve ser lembrada sobre '+t+'?',answer,'Conceito',answer,
       'Relembre a regra completa e procure seus elementos condicionantes.');
 }
 if(!added)ctx.skipped++;
}
function setup(guide,opts={}){
 let motor=null;try{motor=root.PMDFNeuralQuestions?.testModel?.()||null;}catch(_){}
 return {motor,law:clean(guide?.lawName)||'Material',level:opts.level||'intermediario',
  cards:[],seen:new Set(),unitsSeen:new Set(),covered:new Set(),skipped:0,
  modalities:{'Pergunta estratégica (P&R)':0},style:opts.style||'questions'};
}
function runRow(ctx,row){
 let count=0;
 for(const unit of segment(row.text)){
  const id=fold(row.law+'|'+row.reference+'|'+unit);
  if(ctx.unitsSeen.has(id))continue;
  ctx.unitsSeen.add(id);processUnit(ctx,row,unit);
  if(++count>=500)break;
 }
}
function finish(ctx,rows,opts,guide){
 let cards=ctx.cards;
 if(opts.style==='mixed' && cards.length){
  const existing=original.build(guide,{level:opts.level}).cards
   .filter(c=>c.family==='cloze'&&c.cloze&&c.back&&c.front);
  const quota=Math.ceil(cards.length*.25),extra=existing.slice(0,quota);
  cards=cards.concat(extra);
 }
 const kindCounts={...ctx.modalities};
 for(const c of cards)if(c.family==='cloze')kindCounts['Cloze (Lacuna)']=(kindCounts['Cloze (Lacuna)']||0)+1;
 const difficulties={Fácil:0,Médio:0,Difícil:0};
 for(const c of cards)difficulties[c.difficulty]=(difficulties[c.difficulty]||0)+1;
 return {cards,report:{total:cards.length,sourceRows:rows.length,sourceUnits:ctx.unitsSeen.size,
  coveredTopics:ctx.covered.size,pendingTopics:Math.max(0,rows.length-ctx.covered.size),
  skipped:ctx.skipped,modalities:kindCounts,difficulties,
  engine:'Motor local híbrido: classificação neural + elaboração semântica verificável',
  warning:'O classificador neural não é um modelo generativo. Perguntas e respostas são construídas por regras a partir do material, com fonte rastreável; não há verificação automática da vigência normativa.'}};
}
function build(guide,options={}){
 if(options.style==='cloze')return original.build(guide,options);
 const rows=rowsFor(guide),ctx=setup(guide,options);
 for(const row of rows)runRow(ctx,row);
 return finish(ctx,rows,options,guide);
}
async function buildAsync(guide,options={}){
 if(options.style==='cloze')return original.buildAsync(guide,options);
 const rows=rowsFor(guide),ctx=setup(guide,options);
 for(let i=0;i<rows.length;i++){
  if(options.cancelled?.())return {...finish(ctx,rows,{...options,style:'questions'},guide),cards:[],cancelled:true};
  runRow(ctx,rows[i]);
  if(i%8===7){options.onProgress?.(i+1,rows.length,ctx.cards.length);
   await new Promise(r=>setTimeout(r,0));}
 }
 options.onProgress?.(rows.length,rows.length,ctx.cards.length);
 if(options.cancelled?.())return {cards:[],cancelled:true,report:null};
 return finish(ctx,rows,options,guide);
}
root.PMDFNeuralFlashcards=Object.freeze({...original,build,buildAsync,version:'20261116-qa-v1',questionBuilder:'heuristic-neural-local'});
root.PMDFAnkiQuestions=Object.freeze({rowsFor,segment,version:'20261116-qa-v1'});
})(window);
