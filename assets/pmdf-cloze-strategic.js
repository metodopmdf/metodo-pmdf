/* Método PMDF — Lacunas Estratégicas 2.0.
   Funcionamento integralmente local. Todas as respostas são recortes literais
   do conteúdo enviado/cadastrado, nunca inferências não verificáveis. */
(function(root){
'use strict';
const clean=x=>String(x??'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
const norm=x=>clean(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hash=x=>{let n=2166136261;for(const c of String(x))n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0).toString(36);};
const bad=/^(?:estudar|consultar|conferir|verificar|identificar)\b|(?:\bsegundo o material\b|\bverificar a vigência\b)/i;
const mk=(text,index,value,type,score)=>{
 if(index<0||!value)return null;
 const part=clean(value),n=part.split(/\s+/).length;
 if((part.length<8&&!/^\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?)$/i.test(part))||part.length>135||n<2||n>25||!text.startsWith(value,index))return null;
 if(/\b(?:arts?\.?)\s*\d+[º°]?|§\s*\d+[º°]?/i.test(part))return null;
 if((part.match(/\(/g)||[]).length!==(part.match(/\)/g)||[]).length)return null;
 if(/(?:\b(?:de|do|da|dos|das|a|ao|em|por|que|se|ou)\s*|[(:;,])$/i.test(part))return null;
 return {start:index,end:index+value.length,text:value,type,score};
};
function segments(text){
 const raw=clean(text).replace(/\b(Art|Arts|Inc|nº)\.\s*(?=\d)/gi,t=>t.replace('.','\uE000'));
 return raw.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])|(?<=;)\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/u)
  .map(x=>clean(x.replace(/\uE000/g,'.'))).filter(x=>x.length>=52&&x.length<=1150&&!bad.test(x));
}
function candidates(text){
 const out=[],add=(i,v,t,w)=>{const c=mk(text,i,v,t,w);if(c)out.push(c);};
 // Duas teses numa mesma frase: exigir distinguir os efeitos de cada instituto.
 const contrast=/\b(enquanto|ao passo que|por outro lado|diferentemente)\s+/i.exec(text);
 if(contrast){
  const secondStart=contrast.index+contrast[0].length,second=text.slice(secondStart);
  const first=text.slice(0,contrast.index).replace(/[,;\s]+$/,'');
  const A=first.match(/^(.{8,87}?)\s+(distribui|transfere|atribui|ocorre|é|são|possui|tem|exige|compreende)\s+(.{11,125})$/i);
  const B=second.match(/^(.{8,85}?)\s+(distribui|transfere|atribui|ocorre|é|são|possui|tem|exige|compreende)\s+(.{11,125})[.!]?$/i);
  if(A&&B){
   const v1=A[2]+' '+A[3],v2=B[2]+' '+B[3].replace(/[.!]+$/,'');
   add(first.indexOf(v1),v1,'Distinção entre institutos',120);
   add(secondStart+second.indexOf(v2),v2,'Distinção entre institutos',120);
  }
 }
 // Prazos pareados: dois valores para hipóteses diferentes.
 const dt=[...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?)\b/gi)];
 if(dt.length>=2&&dt.length<=5){
  for(const m of dt.slice(0,3))add(m.index,m[0],'Prazos e condições',102);
 }
 // Datas normativas: recordar o conjunto de datas quando a regra as compara.
 for(const m of text.matchAll(/\b\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi))
  add(m.index,m[0],'Datas legais',104);
 // Frações de aumento ou redução de pena com marcadores jurídicos completos.
 for(const m of text.matchAll(/\b\d+\s*\/\s*\d+\s*(?:a|até)\s*\d+\s*\/\s*\d+\b/g))
  add(m.index,m[0],'Frações e majorantes',109);
 // Restrições: exigir saber a condição integral, não apenas 'salvo'.
 const exception=/\b(salvo|exceto|desde que|mediante|ressalvad[oa]s?|somente se|apenas quando|independentemente de)\s+([^,;.!?]{12,104})/gi;
 for(const m of text.matchAll(exception))add(m.index,m[0],'Exceções e requisitos',116);
 // Competência: autoridade e atribuição, se expressamente identificáveis.
 const comp=/\b(compete|incumbe|cabe)\s+(à|ao|aos|às|a)\s+([^,;.!?]{6,66}?)\s+(apurar|investigar|julgar|fiscalizar|exercer|promover|realizar|instaurar|processar|executar)\s+([^,;.!?]{11,108})/i.exec(text);
 if(comp){
  const i=comp.index+comp[0].indexOf(comp[3]);
  add(i,comp[3],'Sujeito competente',110);
  const a=comp[4]+' '+comp[5],p=comp.index+comp[0].lastIndexOf(a);
  add(p,a,'Atribuição exercida',115);
 }
 // Consequência de crime: o núcleo da sanção deve ficar oculto.
 for(const m of text.matchAll(/\b(?:reclusão|detenção|prisão|multa)\s*(?:,|de|:|-)?\s*(?:de\s+)?\d+(?:[.,]\d+)?\s*(?:a|até)\s*\d+(?:[.,]\d+)?\s*(?:meses?|anos?)/gi)){
  add(m.index,m[0],'Sanção e intervalo',103);
 }
 // Classificações e definições expressas: ocultar o núcleo conceitual completo.
 const def=/\b(?:é|são|consiste em|constitui|constituem|corresponde a|compreende|abrange|abrangem|classifica-se como|caracteriza-se por)\s+([^;.!?]{13,130})/i.exec(text);
 if(def){
  const val=clean(def[1]).replace(/[, ]+$/,'');
  const idx=def.index+def[0].indexOf(def[1]);
  // Evitar ocultar mais de metade do enunciado sem dois contextos independentes.
  if(idx>=13&&val.length<=text.length*.60)add(idx,val,'Conceito ou classificação',89);
 }
 // Hipótese fática e efeito: reconstruir ambos apenas quando demonstrados.
 const req=/\b(?:depende de|exige|pressupõe|requer|condiciona-se a)\s+([^;.!?]{13,105})/gi;
 for(const m of text.matchAll(req))add(m.index,m[0],'Requisitos da hipótese',93);
 // Consequências expressas em uma norma.
 const cause=/\b(?:é aumentado|será aumentad[ao]|extingue a punibilidade|reduz a pena|é vedada|não se admite)\s+([^;.!?]{11,104})/gi;
 for(const m of text.matchAll(cause))add(m.index,m[0],'Consequência jurídica',90);
 // Evitar alvos sobrepostos; preferir termos com sentido jurídico completo.
 const chosen=[];
 for(const c of out.sort((a,b)=>b.score-a.score||b.text.length-a.text.length)){
  if(chosen.some(x=>c.start<x.end&&x.start<c.end))continue;
  chosen.push(c);
 }
 return chosen.sort((a,b)=>a.start-b.start);
}
function make(text,ref='',level='intermediario'){
 const terms=candidates(text);
 if(!terms.length)return null;
 const preferred=level==='avancado'?3:level==='intermediario'?2:1;
 let chosen=[],masked=0;
 for(const t of terms.slice().sort((a,b)=>b.score-a.score||a.start-b.start)){
  if(chosen.length>=preferred)break;
  if(masked+t.text.length>Math.max(35,text.length*.60))continue;
  if(text.length-t.text.length<35)continue;
  chosen.push(t);masked+=t.text.length;
 }
 chosen.sort((a,b)=>a.start-b.start);
 if(!chosen.length)return null;
 // Cada cartão testa no máximo três trechos substantivos, mantendo a premissa visível.
 const maskedText=[],tokens=[];let i=0,last=0;
 for(const item of chosen){
  maskedText.push(text.slice(last,item.start));
  maskedText.push('[LACUNA '+(i+1)+']');
  tokens.push({number:++i,value:item.text,type:item.type});
  last=item.end;
 }
 maskedText.push(text.slice(last));
 const front=maskedText.join('');
 if(front.length<45)return null;
 let cloze=text;
 for(const t of chosen.slice().reverse())cloze=cloze.slice(0,t.start)+'{{c1::'+t.text+'}}'+cloze.slice(t.end);
 return {front,back:tokens.map(t=>t.number+'. '+t.value).join('  ·  '),cloze,tokens,
  source:text,topic:ref,modality:'Cloze (Lacuna)',kind:'Lacunas Estratégicas',
  family:'cloze',hint:tokens.map(t=>t.type).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')};
}
function rows(guide){
 const m=guide?.articlesMapping||{},items=[];
 for(const [key,priority] of [['highIncidence','Alta'],['mediumIncidence','Média'],['lowIncidence','Baixa']])
  for(const a of Array.isArray(m[key])?m[key]:[]){
   const text=clean(a.plainExplanation||a.sourceText);
   if(!text)continue;
   items.push({reference:clean(a.article||a.title||'Tópico de estudo'),text,priority,law:clean(guide?.lawName||'Material de estudo'),
    example:clean(a.practicalExample),literal:!!a.sourceText});
   const full=clean(a.sourceText);
   if(full&&norm(full)!==norm(text)&&full.length<5500)items.push({...items[items.length-1],text:full});
  }
 if(!items.length&&Array.isArray(guide?.executiveSummary?.keyConcepts)){
  for(const concept of guide.executiveSummary.keyConcepts){const text=clean(concept);
   if(text.length>=52)items.push({reference:'Conceito essencial',text,priority:'Média',law:clean(guide?.lawName||'Material'),example:'',literal:false});
  }
 }
 return items;
}
function build(guide,opts={}){
 const level=opts.level||'intermediario',input=rows(guide),cards=[],seen=new Set();
 let processed=0;
 for(const row of input)for(const unit of segments(row.text)){
  processed++;const draft=make(unit,row.reference,level);
  if(!draft)continue;
  const signature=norm(row.law+'|'+row.reference+'|'+draft.cloze);
  if(seen.has(signature))continue;seen.add(signature);
  cards.push({...draft,id:'anki-cloze-v2-'+hash(signature),cloze:row.reference+' · '+draft.cloze,
   article:row.reference,reference:row.reference,law:row.law,extra:unit,scope:row.literal?'Trecho do material selecionado':'Síntese didática fornecida',
   warning:'Respostas recortadas literalmente do material. Verifique alterações legais.',
   application:row.example&&row.example.length<=220?row.example:'',priority:row.priority,
   difficulty:level==='avancado'?'Difícil':'Médio',
   tip:'Recupere todas as expressões indicadas antes de revelar o verso.',
   pitfall:'Não troque requisitos, hipóteses, competências ou unidades de prazo.',
   tags:'#LacunasEstrategicas #Cebraspe #MemorizacaoAtiva'});
 }
 return {cards,report:{total:cards.length,sourceRows:input.length,sourceUnits:processed,
  coveredTopics:new Set(cards.map(c=>c.reference)).size,skipped:Math.max(0,processed-cards.length),
  engine:'Lacunas estratégicas locais (expressões jurídicas verificáveis)',
  modalities:{'Cloze (Lacuna)':cards.length},
  warning:'Lacunas baseadas apenas em trechos fornecidos; não há geração ou verificação legislativa externa.'}};
}
function render(guide,opts={}){
 const deck=build(guide,opts),cards=deck.cards,law=clean(guide?.lawName||'Material de estudo');
 let out='<div class="pmdf-cloze-report"><header class="pmdf-cloze-hero"><div class="pmdf-cloze-overline">MÉTODO PMDF · RECUPERAÇÃO ATIVA</div><h2>Lacunas Estratégicas</h2><p>'+esc(law)+'</p><span>'+cards.length+' exercícios com respostas verificáveis</span></header>'+
 '<p class="pmdf-cloze-note">Complete mentalmente todas as expressões antes de revelar o gabarito. Trechos e respostas são extraídos do conteúdo selecionado; verifique a legislação vigente.</p>';
 if(!cards.length)return out+'<p class="pmdf-cloze-empty">Não foram identificados trechos completos adequados para lacunas estratégicas. Experimente uma lei ou texto com definições, competências, requisitos, condições ou prazos explícitos.</p></div>';
 for(let i=0;i<cards.length;i++){
  const c=cards[i],parts=c.front.split(/\[LACUNA (\d+)\]/g);
  const phrase=parts.map((x,j)=>j%2===0?esc(x):
    '<button type="button" class="pmdf-cloze-gap" data-cloze-index="'+esc(x)+'" data-answer="'+esc(c.tokens[Number(x)-1]?.value||'')+'" aria-label="Revelar lacuna '+esc(x)+'">['+esc(x)+' · revelar]</button>').join('');
  out+='<section class="pmdf-cloze-card"><div class="pmdf-cloze-card-top"><strong>Exercício '+(i+1)+' de '+cards.length+'</strong><span>'+esc(c.hint)+'</span></div>'+
   '<div class="pmdf-cloze-prompt">'+phrase+'</div><details class="pmdf-cloze-proof"><summary>Conferir todas as respostas e o texto integral</summary>'+
   '<ol>'+c.tokens.map(t=>'<li><b>'+t.number+'.</b> '+esc(t.value)+'</li>').join('')+'</ol>'+
   '<p><b>Texto de origem:</b> '+esc(c.source)+'</p></details><small>'+esc(c.article)+' · '+esc(c.priority)+' prioridade editorial</small></section>';
 }
 return out+'</div>';
}
const active=new WeakSet();
function mount(container){
 const region=container?.querySelector?.('.pmdf-cloze-report');if(!region||active.has(region))return;
 active.add(region);
 region.addEventListener('click',e=>{
  const el=e.target.closest?.('button.pmdf-cloze-gap');if(!el||!region.contains(el))return;
  const revealing=el.getAttribute('aria-pressed')!=='true';
  el.setAttribute('aria-pressed',revealing?'true':'false');
  const idx=el.dataset.clozeIndex;
  el.textContent=revealing?el.dataset.answer:'['+idx+' · revelar]';
  el.setAttribute('aria-label',revealing?'Ocultar lacuna '+idx:'Revelar lacuna '+idx);
 });
}
const api=Object.freeze({make,candidates,rows,build,render,mount,version:'20261116-cloze-v2'});
root.PMDFClozeStrategic=api;
// Usar as lacunas avançadas no modo Anki, mantendo a geração de perguntas normal.
const previous=root.PMDFNeuralFlashcards;
if(previous?.build&&previous?.buildAsync){
 const questionBuild=previous.build,questionAsync=previous.buildAsync;
 root.PMDFNeuralFlashcards=Object.freeze({...previous,
  build(g,options={}){
   if(options.style==='cloze')return api.build(g,options);
   if(options.style==='mixed'){
    const questions=questionBuild(g,{...options,style:'questions'});
    const blank=api.build(g,options).cards.slice(0,Math.max(3,Math.ceil(questions.cards.length*.4)));
    const cards=questions.cards.concat(blank);
    const report={...questions.report,total:cards.length,
     modalities:{...questions.report.modalities,'Cloze (Lacuna)':blank.length}};
    return {...questions,cards,report};
   }
   return questionBuild(g,options);
  },
  async buildAsync(g,options={}){
   if(options.style==='cloze'){
    if(options.cancelled?.())return {cancelled:true,cards:[]};
    const result=api.build(g,options);
    options.onProgress?.(result.report.sourceRows,result.report.sourceRows,result.cards.length);
    return options.cancelled?.()?{cancelled:true,cards:[]}:result;
   }
   if(options.style==='mixed'){
    const r=await questionAsync(g,{...options,style:'questions'});
    if(r.cancelled||options.cancelled?.())return {cancelled:true,cards:[]};
    const extra=api.build(g,options).cards.slice(0,Math.max(3,Math.ceil(r.cards.length*.4)));
    const cards=r.cards.concat(extra);
    return {...r,cards,report:{...r.report,total:cards.length,modalities:{...r.report.modalities,'Cloze (Lacuna)':extra.length}}};
   }
   return questionAsync(g,options);
  },version:'20261116-strategic-cloze-v2'});
}
})(window);
