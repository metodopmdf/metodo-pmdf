/* Método PMDF — Caderno Visual 2.0. Síntese editorial local e SVGs procedurais.
   Sem chamadas externas. A prioridade é heurística (NÃO é frequência de provas). */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const fold=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const shorten=(s,max=560)=>{s=clean(s);if(s.length<=max)return s;const j=s.lastIndexOf(' ',max);return s.slice(0,j>max*.7?j:max).replace(/[,:;\s]+$/,'')+'…';};
const patternList=[
 [/compet[eê]nci|atribui[cç][aã]o|atribui[cç][oõ]es|delegar|poder de pol[ií]cia|compete[mn]?\b/i,4,'Competências e atribuições'],
 [/\b(?:salvo|exceto|somente|apenas|exclusivamente|desde que|ressalvad[oa]s?|vedad[oa]s?|proibid[oa]s?|independe|independentemente|n[aã]o poder[aã]o?)\b/i,5,'Exceções e limites da regra'],
 [/\b\d+\s*(?:dias?|meses?|anos?|horas?)\b|\b\d+\s*\/\s*\d+\b|\bprazo\b|\bprescri[cç][aã]o\b/i,4,'Prazos e quantitativos'],
 [/\b(?:pena|reclus[aã]o|deten[cç][aã]o|multa|san[cç][oõ]es?|punibilidade)\b/i,2,'Sanções e consequências'],
 [/\b(?:considera-se|entende-se|define-se|constitui|conceito|requisitos?|condi[cç][aã]o)\b/i,2,'Conceitos e requisitos'],
 [/\b(?:pol[ií]cia judici[aá]ria militar|inqu[eé]rito policial militar|crime militar|justi[cç]a militar|pris[aã]o em flagrante|pris[aã]o preventiva)\b/i,3,'Tema expresso no programa de estudos']
];
const times=s=>[...new Set((clean(s).match(/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?)\b|\b\d+\s*\/\s*\d+\b/gi)||[]))].slice(0,5);
const restrict=s=>[...new Set((clean(s).match(/\b(?:salvo|exceto|somente|apenas|exclusivamente|desde que|vedado|vedada|proibido|proibida|independe|independentemente)\b/gi)||[]).map(t=>t.toLowerCase()))].slice(0,6);
const sanction=s=>[...new Set(clean(s).match(/(?:reclus[aã]o|deten[cç][aã]o|multa|suspens[aã]o|demiss[aã]o)[^.;]{0,110}/gi)||[])].slice(0,2);
function grade(item,prior,index){
 const raw=clean([item.article||'',item.sourceText||item.plainExplanation||'',item.practicalExample||''].join(' '));
 let score=prior==='highIncidence'?3:prior==='mediumIncidence'?1:0;
 const reasons=[];
 for(const [re,points,label] of patternList)if(re.test(raw)){score+=points;reasons.push(label);}
 if(raw.length<45)score=Math.max(0,score-2);
 return {score,reasons,priority:score>=8?'alta':score>=4?'moderada':'complementar',index};
}
function allRows(guide){
 const result=[];
 for(const key of ['highIncidence','mediumIncidence','lowIncidence']){
  const list=guide?.articlesMapping?.[key];
  if(!Array.isArray(list))continue;
  for(const item of list){if(!item||typeof item!=='object')continue;
   const i=result.length,base=clean(item.sourceText||item.plainExplanation||'');
   if(!base&&!clean(item.article))continue;
   result.push({...item,...grade(item,key,i)});
  }
 }
 if(!result.length&&Array.isArray(guide?.executiveSummary?.keyConcepts))
  guide.executiveSummary.keyConcepts.forEach((x,i)=>result.push({
   article:'Tópico '+(i+1),sourceText:String(x),plainExplanation:String(x),
   ...grade({article:'Tópico '+(i+1),sourceText:x},'mediumIncidence',i)
  }));
 return result.sort((a,b)=>b.score-a.score||a.index-b.index);
}
function illustration(s,i){
 const t=fold(s),kind=/policia|deleg|militar|competencia|poder/.test(t)?'authority':
 /prazo|dias|meses|tempo|prescri/.test(t)?'clock':
 /inquerito|process|prova|document|artigo|edital/.test(t)?'file':
 /pena|crime|prisao|corrup|peculato|justica/.test(t)?'justice':
 /dinheiro|multa|patrimonio|valor|recursos/.test(t)?'money':'book';
 const drawings={
 authority:'<path d="M80 27 131 47v40c0 34-20 53-51 71-31-18-51-37-51-71V47Z" fill="#e5f4ee" stroke="#215c50" stroke-width="6"/><path d="M80 54 92 78l26 4-19 20 4 27-23-13-23 13 4-27-19-20 26-4Z" fill="#d6a94d" stroke="#215c50" stroke-width="3"/>',
 clock:'<circle cx="80" cy="88" r="54" fill="#fff0cd" stroke="#304760" stroke-width="7"/><path d="M80 54v34l22 16" stroke="#304760" stroke-width="7" stroke-linecap="round" fill="none"/><path d="M63 20h34" stroke="#304760" stroke-width="7" stroke-linecap="round"/>',
 file:'<path d="M42 23h67l20 24v101H42Z" fill="#e5edf7" stroke="#2e516f" stroke-width="6"/><path d="M109 23v26h20M57 72h54M57 88h54M57 104h37M57 120h45" fill="none" stroke="#2e516f" stroke-width="5" stroke-linecap="round"/><circle cx="112" cy="129" r="13" fill="#e2b45f"/>',
 justice:'<path d="M80 30v108M38 57h84M51 58l-21 43h43L51 58Zm58 0-21 43h43l-22-43ZM57 138h46M42 148h76" fill="none" stroke="#2e465b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 101q21 22 43 0M88 101q21 22 43 0" fill="#d6ae61"/>',
 money:'<rect x="26" y="47" width="108" height="85" rx="13" fill="#d4ede1" stroke="#2a6956" stroke-width="6"/><circle cx="80" cy="90" r="31" fill="#fbeab8" stroke="#2a6956" stroke-width="5"/><text x="80" y="105" text-anchor="middle" font-size="42" font-weight="800" fill="#2a6956">$</text>',
 book:'<path d="M21 45q29-10 59 8 30-18 59-8v92q-29-10-59 8-30-18-59-8Z" fill="#fcecc7" stroke="#425a6b" stroke-width="6"/><path d="M80 53v92M34 68h29M34 83h29M96 68h29M96 83h29" fill="none" stroke="#b38d4a" stroke-width="4"/>'
 };
 const backgrounds=['#edf4f7','#f7f0e7','#eff5ed','#f5eff5'];
 return '<svg viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><circle cx="80" cy="86" r="77" fill="'+backgrounds[i%backgrounds.length]+'"/>'+drawings[kind]+'</svg>';
}
function markText(s){
 const text=esc(s);
 return text.replace(/\b(salvo|exceto|somente|apenas|exclusivamente|desde que|vedado|vedada|independe|independentemente)\b/gi,'<mark>$1</mark>');
}
function point(item){
 const raw=clean(item.sourceText||item.plainExplanation||'');
 const restrictive=restrict(raw),numbers=times(raw);
 if(restrictive.length)return 'Confira o alcance de '+restrictive.map(t=>'“'+t+'”').join(', ')+'. Uma troca dessas expressões pode alterar a regra.';
 if(numbers.length)return 'Memorize literalmente os quantitativos '+numbers.join(', ')+'. Evite confundir prazos e hipóteses.';
 if(/compet[eê]nci|atribui[cç][aã]o|deleg/i.test(raw))return 'Verifique quem possui a atribuição, se há delegação e quais são seus limites.';
 if(/reclus[aã]o|deten[cç][aã]o|multa/i.test(raw))return 'Diferencie a conduta e a sanção exatamente como constam no dispositivo.';
 return 'Identifique o sujeito, os requisitos e as exceções no texto-base antes de julgar um item.';
}
function renderCard(row,i){
 const label=clean(row.article||row.title||('Tópico '+(i+1)));
 const source=clean(row.sourceText||row.plainExplanation||'');
 const explanation=clean(row.plainExplanation||row.sourceText||'');
 const summary=explanation; // Texto integral: sem truncamento de caracteres ou frases.
 const levels={alta:'Prioridade sugerida',moderada:'Revisão recomendada',complementar:'Aprofundamento'};
 const indicators=[...times(source),...sanction(source)];
 const hasFullSource=source&&source!==explanation;
 const detail=hasFullSource?'<div class="pmdf-visual-original"><strong>Trecho integral do material (sem cortes)</strong><p>'+esc(source)+'</p></div>':'';
 return '<section class="pmdf-visual-card" data-priority="'+esc(row.priority)+'" data-visual-focus="'+(row._focus?'1':'0')+'" data-card-index="'+i+'">'+
  '<div class="pmdf-visual-card-head"><div class="pmdf-visual-article">'+esc(label)+'</div>'+
  '<span class="pmdf-visual-priority pmdf-visual-priority-'+esc(row.priority)+'">'+esc(levels[row.priority])+'</span></div>'+
  '<div class="pmdf-visual-card-grid"><div class="pmdf-visual-art">'+illustration(label+' '+source,i)+'</div>'+
  '<div class="pmdf-visual-main"><span class="pmdf-visual-eyebrow">REGRA DE PROVA · EXPLICAÇÃO CONTEXTUALIZADA</span><p class="pmdf-visual-body">'+markText(summary)+'</p>'+detail+(clean(row.practicalExample)?'<div class="pmdf-visual-application"><strong>Aplicação e contexto</strong><p>'+esc(clean(row.practicalExample))+'</p></div>':'')+'</div></div>'+
  '<div class="pmdf-visual-bottom"><div class="pmdf-visual-tip"><b>🎯 Atenção no estilo Cebraspe</b><p>'+esc(point(row))+'</p></div>'+
   (indicators.length?'<div class="pmdf-visual-evidence"><b>📌 Elementos do texto</b><p>'+esc(indicators.slice(0,5).join(' · '))+'</p></div>':'')+'</div>'+
  '<p class="pmdf-visual-citation">Base: '+esc(label)+' · '+(source?'Trecho do guia exibido acima':'Confira o material original')+'</p></section>';
}
function render(guide,options={}){
 if(!guide||typeof guide!=='object')return '<p>Guia não disponível.</p>';
 const title=clean(guide.lawName||'Material personalizado');
 const rows=allRows(guide);
 const focusSize=Math.min(rows.length,Math.max(3,Math.min(10,Math.ceil(rows.length*.35))));
 rows.forEach((row,i)=>{row._focus=i<focusSize;});
 const board=fold(options.board||'cebraspe');
 const focused=false; // Mostrar todas as fichas por padrão, já em ordem de prioridade editorial.
 const interactive=options.interactive!==false;
 const count=rows.length;
 const header='<header class="pmdf-visual-cover"><div class="pmdf-visual-cover-content">'+
  '<div class="pmdf-visual-overline"><span class="pmdf-visual-icon">✦</span> MATERIAL DE REVISÃO · MÉTODO PMDF</div>'+
  '<h2>'+esc(title)+'</h2>'+
  '<p>Fichas de revisão contextualizada, criadas no navegador a partir do guia.</p>'+
  '<div class="pmdf-visual-hero-chips"><span>'+count+' tópicos completos</span><span>'+focusSize+' em destaque</span><span>Sem cortes de texto</span></div>'+
  '</div><div class="pmdf-visual-hero-ornament" aria-hidden="true">§</div></header>';
 const note='<p class="pmdf-visual-disclaimer"><strong>Como a prioridade é definida:</strong> afinidade com o programa, literalidade, requisitos, competências, prazos, sanções e exceções. <strong>É uma estimativa editorial, não uma estatística de frequência da banca.</strong> Confira a norma oficial atualizada e o texto original.</p>';
 const controls=interactive&&count?'<div class="pmdf-visual-toolbar no-print" role="group" aria-label="Modo de leitura das fichas">'+
  '<div class="pmdf-visual-tabs"><button type="button" data-visual-mode="focus" aria-pressed="'+focused+'">Revisão prioritária <span>'+focusSize+'</span></button>'+
  '<button type="button" data-visual-mode="all" aria-pressed="'+(!focused)+'">Todos os tópicos <span>'+count+'</span></button></div>'+
  '<label class="pmdf-visual-pagesize-label" for="pmdf-visual-pagesize">Por página <select id="pmdf-visual-pagesize" data-visual-pagesize><option value="3">3</option><option value="5" selected>5</option><option value="8">8</option></select></label></div>':'';
 const extraConcepts=Array.isArray(guide.executiveSummary?.keyConcepts)?guide.executiveSummary.keyConcepts.filter(x=>clean(x)):[];
 const traps=Array.isArray(guide.trapsAndJurisprudence?.examTraps)?guide.trapsAndJurisprudence.examTraps.filter(x=>clean(x)):[];
 const annex=extraConcepts.length||traps.length?'<section class="pmdf-visual-annex"><div class="pmdf-visual-annex-header"><span class="pmdf-visual-overline">APROFUNDAMENTO OBJETIVO</span><h3>Conceitos essenciais e armadilhas de prova</h3><p>Complemento extraído do guia existente, sem gerar teses ou jurisprudência fictícias.</p></div>'+
 (extraConcepts.length?'<div class="pmdf-visual-annex-group"><h4>Conceitos e distinções ('+extraConcepts.length+')</h4><ol>'+extraConcepts.map(x=>'<li>'+markText(clean(x))+'</li>').join('')+'</ol></div>':'')+
 (traps.length?'<div class="pmdf-visual-annex-group"><h4>Pegadinhas e pontos de atenção ('+traps.length+')</h4><ol>'+traps.map(x=>'<li>'+markText(clean(x))+'</li>').join('')+'</ol></div>':'')+'</section>':'';
 const pager=interactive&&count?'<nav class="pmdf-visual-pager no-print" aria-label="Paginação dos resumos ilustrados">'+
  '<button type="button" data-visual-action="prev" aria-label="Página anterior">← Anterior</button>'+
  '<span class="pmdf-visual-page-status" role="status" aria-live="polite">Página 1</span>'+
  '<button type="button" data-visual-action="next" aria-label="Próxima página">Próxima →</button></nav>':'';
 const cards=rows.map(renderCard).join('');
 return '<div class="pmdf-visual-report" data-visual-default="'+(focused?'focus':'all')+'">'+header+note+
 controls+(interactive?'<div class="pmdf-visual-reading-status no-print"><span data-visual-count></span><span class="pmdf-visual-track"><span data-visual-progress></span></span></div>':'')+
 '<div class="pmdf-visual-card-list">'+(cards||'<p>Não há blocos de conteúdo para ilustrar.</p>')+'</div>'+pager+annex+
 '<footer class="pmdf-visual-footer">Método PMDF · Revisão orientada por conteúdo · Não substitui o texto oficial</footer></div>';
}
const INSTANCES=new WeakMap();
function mount(container){
 const report=container?.querySelector?.('.pmdf-visual-report');
 if(!report)return null;
 if(INSTANCES.has(report))return INSTANCES.get(report);
 const cards=Array.from(report.querySelectorAll('.pmdf-visual-card'));
 const state={page:1,size:5,mode:report.dataset.visualDefault||'all',query:''};
 const modes=Array.from(report.querySelectorAll('[data-visual-mode]'));
 const prev=report.querySelector('[data-visual-action="prev"]'),next=report.querySelector('[data-visual-action="next"]');
 const status=report.querySelector('.pmdf-visual-page-status'),counter=report.querySelector('[data-visual-count]');
 const track=report.querySelector('[data-visual-progress]'),select=report.querySelector('[data-visual-pagesize]');
 const update=()=>{
  const matching=cards.filter(card=>(state.mode==='all'||card.dataset.visualFocus==='1')&&(!state.query||fold(card.textContent).includes(fold(state.query))));
  const pages=Math.max(1,Math.ceil(matching.length/state.size));state.page=Math.min(Math.max(1,state.page),pages);
  const start=(state.page-1)*state.size,visible=new Set(matching.slice(start,start+state.size));
  cards.forEach(card=>{card.hidden=!visible.has(card);});
  modes.forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.visualMode===state.mode)));
  if(prev)prev.disabled=state.page<=1;
  if(next)next.disabled=state.page>=pages;
  if(status)status.textContent=matching.length?'Página '+state.page+' de '+pages:'Nenhum tópico encontrado';
  if(counter)counter.textContent=matching.length+' tópico(s) · '+(matching.length?start+1:0)+'–'+Math.min(start+state.size,matching.length)+' visíveis';
  if(track)track.style.width=(matching.length?100*state.page/pages:0)+'%';
 };
 report.addEventListener('click',event=>{
  const button=event.target.closest('button[data-visual-mode],button[data-visual-action]');
  if(!button||!report.contains(button))return;
  if(button.dataset.visualMode){state.mode=button.dataset.visualMode;state.page=1;}
  if(button.dataset.visualAction==='prev')state.page--;
  if(button.dataset.visualAction==='next')state.page++;
  update();
  if(button.dataset.visualAction){
   const toolbar=report.querySelector('.pmdf-visual-toolbar');
   if(toolbar&&typeof toolbar.scrollIntoView==='function'){
    const reduced=typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    toolbar.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});
   }
  }
 });
 if(select)select.addEventListener('change',()=>{state.size=[3,5,8].includes(Number(select.value))?Number(select.value):5;state.page=1;update();});
 const api={filter(query){state.query=String(query||'').trim();state.page=1;update();},refresh:update,inspect:()=>({...state})};
 INSTANCES.set(report,api);update();return api;
}
root.PMDFVisualEngine=Object.freeze({version:'2.0.0-local',render,mount,allRows,grade,illustration});
})(typeof window!=='undefined'?window:globalThis);
