/* Método PMDF · Resumos completos 2026-11-16
 * Sem geração de fatos externos: preserva conteúdos e origens fornecidos.
 * Prioridade pedagógica é heurística, não frequência estatística de provas. */
(function(root){
'use strict';
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const t=v=>String(v??'').replace(/\u00a0/g,' ').trim();
const flat=v=>t(v).replace(/\s+/g,' ');
const norm=v=>flat(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const A=x=>Array.isArray(x)?x:[];
const types=[
 ['Competência / sujeito',/\b(?:compete|compet[eê]ncia|incumbe|atribui[cç][aã]o|autoridade|delegar|funcion[aá]rio p[uú]blico)\b/i,'Identifique o sujeito competente, a atribuição legal e seus limites.'],
 ['Conceito / classificação',/\b(?:constitui|conceito|considera-se|define-se|modalidade|classifica[cç][aã]o)\b/i,'Diferencie conceitos e modalidades pelos requisitos expressos na fonte.'],
 ['Requisito / condição',/\b(?:requisito|condi[cç][aã]o|exige|necess[aá]rio|mediante|desde que|depende)\b/i,'Confira a hipótese de incidência e se os requisitos são cumulativos ou alternativos.'],
 ['Exceção / limite',/\b(?:salvo|exceto|somente|apenas|exclusivamente|vedad[oa]|proibid[oa]|independentemente)\b/i,'Leia cada expressão restritiva; alterar uma exceção pode alterar o resultado.'],
 ['Prazo / quantitativo',/\b(?:prazo|prescri[cç][aã]o|\d+\s*(?:dias?|meses?|anos?|horas?))\b/i,'Associe o prazo à situação correspondente, sem trocar valores ou hipóteses.'],
 ['Pena / consequência',/\b(?:san[cç][aã]o|reclus[aã]o|deten[cç][aã]o|multa|pena|punibilidade|condena[cç][aã]o)\b/i,'Diferencie a conduta da sanção e das condições que modificam seus efeitos.']
];
const sections=[
 ['highIncidence','Alta (estimativa editorial)','alta'],
 ['mediumIncidence','Média (estimativa editorial)','media'],
 ['lowIncidence','Complementar','complementar']
];
function signals(s){return types.filter(x=>x[1].test(flat(s)));}
function rows(g){
 const out=[],seen=new Set(),m=g?.articlesMapping||{};
 for(const [key,label,priority] of sections)for(const x of A(m[key])){
  if(!x||typeof x!=='object')continue;
  const name=flat(x.article||x.title||x.topic||'Tópico do material'),body=t(x.plainExplanation||x.sourceText),source=t(x.sourceText),example=t(x.practicalExample);
  if(!body&&!source)continue;
  const sig=norm(name+'|'+(source||body));if(seen.has(sig))continue;seen.add(sig);
  const tags=signals(name+' '+body+' '+source);
  const score=(priority==='alta'?4:priority==='media'?2:0)+tags.length+
     tags.filter(v=>/Competência|Exceção|Prazo/.test(v[0])).length;
  out.push({name,body:body||source,source,example,sourceHeading:flat(x.sourceHeading),label,priority,tags,score,order:out.length});
 }
 return out.sort((x,y)=>y.score-x.score||x.order-y.order);
}
function emphasize(s){return e(t(s)).replace(/\b(salvo|exceto|somente|apenas|exclusivamente|desde que|vedado|vedada|independentemente)\b/gi,'<mark>$1</mark>');}
function prose(s){
 return (t(s).split(/\n{2,}/).map(t).filter(Boolean).length?t(s).split(/\n{2,}/).map(t).filter(Boolean):[t(s)])
 .filter(Boolean).map(x=>'<p class="pmdf-editorial-paragraph">'+emphasize(x)+'</p>').join('');
}
function outlined(s){
 const chunks=t(s).split(/\n{2,}/).map(t).filter(Boolean);
 const units=(chunks.length>1?chunks:flat(s).split(/(?<=[.;!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ§])/u))
 .map(t).filter(Boolean);
 return '<ul class="pmdf-editorial-bullets">'+units.map(x=>'<li>'+emphasize(x)+'</li>').join('')+'</ul>';
}
function rec(g){
 const S=g?.executiveSummary||{},concepts=A(S.keyConcepts).filter(x=>t(x));
 return '<section class="pmdf-editorial-box"><h3>Objetivo, conceitos e fundamentos</h3>'+
 (S.centralObjective?'<h4>Contextualização do material</h4>'+prose(S.centralObjective):'')+
 (concepts.length?'<h4>Conceitos-chave ('+concepts.length+')</h4><ol class="pmdf-editorial-numbered">'+concepts.map(x=>'<li>'+emphasize(x)+'</li>').join('')+'</ol>':'')+
 (!S.centralObjective&&!concepts.length?'<p>Não há resumo executivo estruturado; todos os tópicos identificados no material serão apresentados abaixo.</p>':'')+'</section>';
}
function topic(x,i,total,format){
 const summary=format==='full'?prose(x.body):outlined(x.body);
 const original=x.source&&norm(x.source)!==norm(x.body);
 const head='<header class="pmdf-editorial-topic-head"><div><span class="pmdf-editorial-kicker">TÓPICO '+(i+1)+' / '+total+'</span><h3>'+e(x.name)+'</h3></div>'+
  '<span class="pmdf-editorial-priority" data-grade="'+x.priority+'">'+e(x.label)+'</span></header>';
 const practical=x.example?'<div class="pmdf-editorial-practice"><h4>Aplicação do guia</h4>'+prose(x.example)+'</div>':'';
 const notes=x.tags.length?'<div class="pmdf-editorial-notes"><h4>Riscos de inversão ou confusão em itens Cebraspe</h4><ul>'+
 x.tags.map(x=>'<li><b>'+e(x[0])+':</b> '+e(x[2])+'</li>').join('')+'</ul></div>':'';
 const source=original?'<details class="pmdf-editorial-source"'+(format==='full'?' open':'')+'><summary>Texto integral original ('+x.source.length.toLocaleString('pt-BR')+' caracteres)</summary><div>'+prose(x.source)+'</div></details>':'';
 return '<section class="pmdf-editorial-topic" id="pmdf-editorial-topic-'+i+'">'+head+
 (x.sourceHeading?'<p class="pmdf-editorial-section-label">Seção de origem: '+e(x.sourceHeading)+'</p>':'')+
 '<div class="pmdf-editorial-tagline">'+x.tags.map(z=>'<span>'+e(z[0])+'</span>').join('')+'</div>'+
 '<div class="pmdf-editorial-body"><h4>'+(format==='full'?'Explicação integral disponível':'Esquema completo do assunto')+'</h4>'+summary+'</div>'+
 source+practical+notes+
 '<p class="pmdf-editorial-footnote">Classificação do guia: '+e(x.label)+'. Ordem definida por indicadores pedagógicos; não é estatística de cobrança.</p></section>';
}
function supplements(g){
 const T=g?.trapsAndJurisprudence||{},E=A(g?.essayRepertoire);
 let html='';
 if(A(T.examTraps).length)html+='<section class="pmdf-editorial-box"><h3>Pegadinhas existentes no guia</h3><ol class="pmdf-editorial-numbered">'+T.examTraps.filter(t).map(x=>'<li>'+emphasize(x)+'</li>').join('')+'</ol></section>';
 if(A(T.jurisprudence).length)html+='<section class="pmdf-editorial-box"><h3>Jurisprudência e observações registradas</h3>'+
 '<p class="pmdf-editorial-caution">Conteúdos transcritos do material. Não há validação automática da atualidade de decisões, súmulas ou precedentes.</p>'+
 '<ul class="pmdf-editorial-bullets">'+T.jurisprudence.filter(t).map(x=>'<li>'+emphasize(x)+'</li>').join('')+'</ul></section>';
 if(E.length)html+='<section class="pmdf-editorial-box"><h3>Conexões para redação e repertório</h3>'+E.map(x=>'<div class="pmdf-editorial-repertoire"><h4>'+e(x.legalDevice||'Dispositivo')+'</h4>'+
 (x.themes?prose('Temas: '+x.themes):'')+(x.modelSentence?prose(x.modelSentence):'')+'</div>').join('')+'</section>';
 return html;
}
function render(g,options={}){
 const guide=g&&typeof g==='object'?g:{},format=options.format==='bullets'?'bullets':'full';
 const r=rows(guide),label=format==='full'?'Por Extenso · Edição Integral':'Esquematizado · Edição Aprofundada';
 const hero='<header class="pmdf-editorial-hero"><span class="pmdf-editorial-kicker">MÉTODO PMDF · ESTUDO ESTRATÉGICO POLICIAL</span><h2>'+label+'</h2><p>'+e(guide.lawName||'Material personalizado')+'</p>'+
 '<div class="pmdf-editorial-chips"><span>'+r.length+' assuntos completos</span><span>Conceitos · Exceções · Competências</span><span>Foco Cebraspe</span></div></header>';
 const caution='<p class="pmdf-editorial-caution"><strong>Critério de revisão:</strong> os tópicos são ordenados por agrupamento do guia e presença de conceitos, condições, competências, exceções, sanções e quantitativos. '+
 '<strong>Esta prioridade é estimativa, não contagem de frequência das provas.</strong> O conteúdo é limitado ao material fornecido e não substitui a legislação vigente nem o edital específico de cada cargo policial.</p>';
 const index='<details class="pmdf-editorial-index"><summary>Índice completo — '+r.length+' assuntos</summary><ol>'+
 r.map((x,i)=>'<li><a href="#pmdf-editorial-topic-'+i+'">'+e(x.name)+'</a></li>').join('')+'</ol></details>';
 const content=r.length?r.map((x,i)=>topic(x,i,r.length,format)).join(''):'<p class="pmdf-editorial-empty">Não há blocos suficientes neste guia. Envie o texto da lei ou documento completo.</p>';
 return '<div class="pmdf-editorial-report pmdf-editorial-'+format+'">'+hero+caution+rec(guide)+index+
 '<h2 class="pmdf-editorial-section-title">Dispositivos e assuntos — cobertura integral</h2><div class="pmdf-editorial-items">'+content+'</div>'+
 supplements(guide)+'<footer class="pmdf-editorial-end">Método PMDF · Texto integral disponível · Confirme a redação oficial atual</footer></div>';
}
root.PMDFStrategicSummaries=Object.freeze({version:'20261116-editorial-v1',render,rows,signals});
})(window);