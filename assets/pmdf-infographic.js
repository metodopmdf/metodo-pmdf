/* Método PMDF · Novo modo: Infográfico Estratégico.
   Diagramas editoriais originais a partir do guia, sem IA/imagens externas. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const fold=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const arr=a=>Array.isArray(a)?a:[];
const QUALIFIER=/\b(?:somente|apenas|exclusivamente|salvo|exceto|desde que|ressalvad[oa]s?|vedad[oa]s?|proibid[oa]s?|independe|independentemente|nunca|sempre)\b/gi;
const TIME=/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?)\b|\b\d+\s*\/\s*\d+\b/gi;
const PROMPT=[
'PROMPT MESTRE — RESUMO INFOGRÁFICO ESTRATÉGICO PARA CONCURSOS POLICIAIS',
'PAPEL: Atue como professor especialista, revisor técnico, examinador no padrão Cebraspe e designer instrucional. Transforme a fonte informada em caderno de revisão visual, original, completo e rigoroso.',
'FONTE E RIGOR: Utilize exclusivamente a lei, o documento, os artigos, o texto ou o guia fornecido como base de fatos. Não invente normas, prazos, penas, exceções, precedentes, estatísticas de banca ou citações. Sinalize lacunas de fonte. Preserve terminologia, artigos, prazos, requisitos e exceções. Se necessário, recomende verificação oficial de atualização normativa.',
'COBERTURA: Crie quantas páginas temáticas forem necessárias, sem limite arbitrário, para cobrir todos os conteúdos relevantes. Ajuste a profundidade ao nível iniciante, intermediário ou avançado, com aplicação às carreiras policiais.',
'ESTRUTURA: Capa e índice; por tema, título de impacto, dispositivo de origem, pergunta-gatilho, explicação integral, esquema com conceitos/requisitos/efeitos (somente quando suportado), distinções comprovadas, exemplo prático policial quando disponível, destaque de sujeitos, prazos, penas, competências, exceções e números, alerta de pegadinha e revisão rápida. Ao final, reúna os conceitos-chave e alertas com suas fontes.',
'DIDÁTICA: Compare institutos semelhantes em tabelas; use diagramas de fluxo apenas para sequências reais, linhas do tempo para prazos, caixas de contraste para regra/exceção e ícones ilustrativos para conceitos. Não transforme conceitos independentes em uma sequência causal falsa.',
'ESTÉTICA: Infográfico editorial de alto contraste; papel claro, títulos pretos, vermelho fechado para alertas, azul-marinho e dourado discreto da identidade Método PMDF. Produza ilustrações jurídicas originais e esquemas legíveis; jamais copie marcas, personagens, logotipos, imagens nem o projeto gráfico exato dos PDFs de referência.',
'SAÍDA: Página responsiva, impressão A4, textos sem cortes e sem sobreposição, tipografia legível, descrições acessíveis e fidelidade jurídica. Inclua referência aos artigos ou seções de onde vier cada item.',
'CONTROLE DE QUALIDADE: Valide toda afirmação contra a fonte; não atribua frequência estatística não comprovada à banca; diferencie sugestão didática de dado verificado; não afirme atualização jurídica sem conferir a norma oficial.'
].join('\n\n');
const promptInstructions=()=>PROMPT;
function rows(guide){
 if(root.PMDFVisualEngine&&typeof root.PMDFVisualEngine.allRows==='function')return root.PMDFVisualEngine.allRows(guide);
 const out=[];
 for(const k of ['highIncidence','mediumIncidence','lowIncidence'])for(const x of arr(guide?.articlesMapping?.[k])){
  if(x&&typeof x==='object'&&clean(x.article||x.plainExplanation||x.sourceText))out.push(x);
 }
 if(!out.length)arr(guide?.executiveSummary?.keyConcepts).forEach((s,i)=>out.push({article:'Conceito '+(i+1),plainExplanation:String(s)}));
 return out;
}
function sentences(s){
 let text=clean(s);
 return text?text.split(/(?<=[.!?;])\s+(?=[A-ZÀ-ÚÂÊÔÃÕÇ0-9])/).map(clean).filter(Boolean):[];
}
function unique(s,rx,n){return [...new Set(clean(s).match(rx)||[])].slice(0,n);}
function signals(s){const terms=[...unique(s,TIME,5),...unique(s,QUALIFIER,6)];
 return terms.length?'<div class="pmdf-info-facts">'+terms.map(x=>'<span>'+esc(x)+'</span>').join('')+'</div>':'';
}
function mark(s){return esc(s).replace(QUALIFIER,'<mark>$&</mark>');}
function art(s,i){return root.PMDFVisualEngine&&typeof root.PMDFVisualEngine.illustration==='function'
 ?root.PMDFVisualEngine.illustration(s,i):'<span class="pmdf-info-glyph" aria-hidden="true">§</span>';}
function cover(g,n){
 const name=clean(g.lawName||'Conteúdo personalizado'),objective=clean(g.executiveSummary?.centralObjective);
 return '<header class="pmdf-info-cover"><div class="pmdf-info-issue">MÉTODO PMDF / MATERIAL DE REVISÃO / CONCURSOS POLICIAIS</div>'+
 '<div class="pmdf-info-cover-grid"><div><span class="pmdf-info-eyebrow">REVISÃO ESTRATÉGICA · CEBRASPE</span><h2>RESUMO <em>INFOGRÁFICO</em></h2><h3>'+esc(name)+'</h3><p>'+esc(objective||'Guia visual baseado no conteúdo selecionado.')+'</p></div>'+
 '<div class="pmdf-info-cover-figure">'+art(name,0)+'</div></div>'+
 '<div class="pmdf-info-cover-ribbon"><span>'+n+' tópicos</span><span>Conceitos · Exceções · Aplicação</span><span>Impressão A4</span></div></header>';
}
function sheet(row,i,total){
 const title=clean(row.article||row.title||('Tópico '+(i+1)));
 const original=clean(row.sourceText||''),body=clean(row.plainExplanation||row.sourceText||''),example=clean(row.practicalExample||'');
 const list=sentences(body),first=list[0]||body||'Informação não identificada no guia.';
 const detail=list.length>1?list.slice(1,3).join(' '):'';
 const facts=signals(title+' '+original+' '+body);
 const steps='<div class="pmdf-info-flow-item"><span class="pmdf-info-step">01</span><b>Conceito-base</b><p>'+mark(first)+'</p></div>'+
  (detail?'<div class="pmdf-info-flow-item"><span class="pmdf-info-step">02</span><b>Detalhamento do tema</b><p>'+mark(detail)+'</p></div>':'')+
  (example?'<div class="pmdf-info-flow-item"><span class="pmdf-info-step">'+(detail?'03':'02')+'</span><b>Aplicação registrada</b><p>'+esc(example)+'</p></div>':'');
 const textNotice=facts?'Identifique o sujeito, as condições, as exceções e os números indicados antes de julgar a assertiva.':'Compare o enunciado com os sujeitos, os requisitos e os efeitos expressos na fonte.';
 return '<section class="pmdf-info-sheet" id="pmdf-info-sheet-'+i+'" data-info-sheet="'+i+'" aria-labelledby="pmdf-info-heading-'+i+'">'+
 '<div class="pmdf-info-sheet-top"><span>FICHA '+String(i+1).padStart(2,'0')+' / '+String(total).padStart(2,'0')+'</span><span>CEBRASPE · REVISÃO OBJETIVA</span></div>'+
 '<h3 id="pmdf-info-heading-'+i+'">'+esc(title)+'</h3>'+
 '<div class="pmdf-info-lead"><div class="pmdf-info-hero-illustration">'+art(title+' '+body,i+1)+'</div><div class="pmdf-info-rule"><span>01 / REGRA CENTRAL</span><p>'+mark(body||first)+'</p></div></div>'+
 '<div class="pmdf-info-flow"><h4>MAPA DE LEITURA · DO MATERIAL FORNECIDO</h4><div class="pmdf-info-flow-grid">'+steps+'</div></div>'+
 (facts?'<div class="pmdf-info-signals"><strong>TERMOS DA FONTE</strong>'+facts+'</div>':'')+
 '<div class="pmdf-info-alert"><span>!</span><div><strong>ATENÇÃO À PEGADINHA</strong><p>'+esc(textNotice)+'</p></div></div>'+
 (original&&original!==body?'<details class="pmdf-info-original" open><summary>Consultar texto-base completo</summary><p>'+esc(original)+'</p></details>':'')+
 '<footer class="pmdf-info-sheet-foot"><span>Referência: '+esc(title)+'</span><span>MÉTODO PMDF · Confirme a norma oficial vigente</span></footer></section>';
}
function annex(g){
 const concepts=arr(g.executiveSummary?.keyConcepts).map(clean).filter(Boolean);
 const traps=arr(g.trapsAndJurisprudence?.examTraps).map(clean).filter(Boolean);
 const juris=arr(g.trapsAndJurisprudence?.jurisprudence).map(clean).filter(Boolean);
 if(!concepts.length&&!traps.length&&!juris.length)return '';
 return '<section class="pmdf-info-annex"><div class="pmdf-info-sheet-top"><span>REVISÃO FINAL</span><span>SÍNTESE DO GUIA</span></div>'+
 '<h3>NÃO CONFUNDA <em>NA PROVA</em></h3>'+
 (concepts.length?'<h4>Conceitos-chave</h4><ol>'+concepts.map(x=>'<li>'+mark(x)+'</li>').join('')+'</ol>':'')+
 (traps.length?'<h4>Pegadinhas fornecidas</h4><ul>'+traps.map(x=>'<li>'+mark(x)+'</li>').join('')+'</ul>':'')+
 (juris.length?'<h4>Jurisprudência fornecida — atualidade não verificada</h4><ul>'+juris.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</section>';
}
function render(guide,opts={}){
 if(!guide||typeof guide!=='object')return '<p>Selecione um material para gerar o infográfico.</p>';
 const data=rows(guide),interactive=opts.interactive!==false;
 const nav=interactive&&data.length?'<nav class="pmdf-info-navigation no-print" aria-label="Navegação dos infográficos"><label>Buscar tópico <input type="search" data-info-search placeholder="Título ou palavra do conteúdo" autocomplete="off"></label><div><button type="button" data-info-action="prev">← Anterior</button><span data-info-status role="status" aria-live="polite">1 / '+data.length+'</span><button type="button" data-info-action="next">Próximo →</button></div></nav>':'';
 const note='<p class="pmdf-info-note">Os infográficos organizam o conteúdo já disponível no guia, com esquemas e símbolos editoriais originais, sem gerar fotografias por IA. Prioridades e alertas são pedagógicos, não estatísticas de incidência. Confira sempre a fonte oficial atualizada.</p>';
 const body=data.length?data.map((r,i)=>sheet(r,i,data.length)).join(''):'<p class="pmdf-info-empty">Material sem tópicos estruturados. Selecione uma lei ou extraia um documento para iniciar.</p>';
 return '<div class="pmdf-info-report">'+cover(guide,data.length)+note+nav+'<div class="pmdf-info-pages">'+body+'</div>'+annex(guide)+'<footer class="pmdf-info-bookfoot">MÉTODO PMDF · Revisão policial · Material de apoio</footer></div>';
}
function mount(container){
 const report=container?.querySelector?.('.pmdf-info-report');if(!report||report.dataset.infoMounted==='1')return report;
 const sheets=Array.from(report.querySelectorAll('[data-info-sheet]')),status=report.querySelector('[data-info-status]');
 if(!sheets.length||!status)return report;
 const input=report.querySelector('[data-info-search]'),prev=report.querySelector('[data-info-action="prev"]'),next=report.querySelector('[data-info-action="next"]');
 report.dataset.infoMounted='1';let index=0,matched=sheets;
 function update(){index=Math.max(0,Math.min(index,matched.length-1));sheets.forEach(s=>s.classList.toggle('pmdf-info-active',s===matched[index]));status.textContent=matched.length?(index+1)+' / '+matched.length:'Nenhum tópico encontrado';if(prev)prev.disabled=index===0||!matched.length;if(next)next.disabled=index>=matched.length-1||!matched.length;}
 if(prev)prev.addEventListener('click',()=>{index--;update();});
 if(next)next.addEventListener('click',()=>{index++;update();});
 if(input)input.addEventListener('input',()=>{let term=fold(input.value);matched=sheets.filter(x=>!term||fold(x.textContent).includes(term));index=0;update();});
 update();return report;
}
root.PMDFInfographicSummaries=Object.freeze({version:'20261117-v1',promptInstructions,rows,render,mount});
})(window);
