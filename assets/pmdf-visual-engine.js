/* Método PMDF — motor visual 100% local, sem APIs, sem downloads de modelos.
   Síntese extrativa e ilustrações SVG procedurais (não é modelo generativo de imagens). */
(function(root){
'use strict';
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').replace(/\s+/g,' ').trim();
const words=s=>norm(s).split(/\s+/).filter(Boolean);
const shorten=(s,max=420)=>{s=norm(s);if(s.length<=max)return s;const cut=s.lastIndexOf(' ',max);return s.slice(0,cut>max*.6?cut:max).replace(/[,:;\s]+$/,'')+'…';};
const groups=g=>['highIncidence','mediumIncidence','lowIncidence'].flatMap(k=>Array.isArray(g?.articlesMapping?.[k])?g.articlesMapping[k]:[]);
const palette=['#765a32','#265c50','#a85c37','#355f90','#7c4c55'];
function illustration(text,i){
 const t=norm(text).toLowerCase();
 const type=/pris[aã]o|pena|crime|penal|corrup|peculato|deten[cç][aã]o/.test(t)?'justice':/dinheiro|valor|multa|pagamento|recurso|patrim[oô]nio/.test(t)?'money':/prazo|dia|m[eê]s|ano|tempo|prescri/.test(t)?'clock':/sa[uú]de|vida|prote[cç][aã]o|seguran[cç]a/.test(t)?'shield':'book';
 const shape={
 justice:'<path d="M84 50v84M45 64h78M59 64l-22 42h44L59 64Zm52 0-22 42h44l-22-42ZM62 137h44M47 148h74" fill="none" stroke="#24384a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 106q22 26 44 0M89 106q22 26 44 0" fill="#d8aa58"/>',
 money:'<rect x="29" y="52" width="113" height="80" rx="12" fill="#bddcc8" stroke="#285c48" stroke-width="6"/><circle cx="85" cy="92" r="29" fill="#f7e3a4" stroke="#285c48" stroke-width="5"/><text x="85" y="106" text-anchor="middle" font-size="40" font-weight="800" fill="#285c48">$</text>',
 clock:'<circle cx="85" cy="94" r="55" fill="#fff3cf" stroke="#33475d" stroke-width="7"/><path d="M85 55v39l26 15" fill="none" stroke="#33475d" stroke-width="8" stroke-linecap="round"/>',
 shield:'<path d="M85 28 135 47v44c0 36-21 55-50 72-29-17-50-36-50-72V47Z" fill="#cbe5dc" stroke="#2d6658" stroke-width="7"/><path d="m57 91 18 18 38-42" fill="none" stroke="#2d6658" stroke-width="9" stroke-linecap="round"/>',
 book:'<path d="M19 46q35-12 66 8 31-20 66-8v92q-35-12-66 8-31-20-66-8Z" fill="#fff0c7" stroke="#45526a" stroke-width="6"/><path d="M85 54v92M34 68h33M34 84h33M102 68h33M102 84h33" stroke="#a78a53" stroke-width="4"/>'
 }[type];
 return '<svg viewBox="0 0 170 180" role="img" aria-label="Ilustração vetorial temática: '+escapeHTML(type)+'" xmlns="http://www.w3.org/2000/svg"><circle cx="85" cy="92" r="80" fill="'+palette[i%palette.length]+'" opacity=".10"/>'+shape+'</svg>';
}
function keywords(s){
 const found=[...norm(s).matchAll(/\b(?:salvo|exceto|somente|apenas|vedado|obrigat[oó]rio|facultativo|independente|desde que|se|quando|antes|depois|at[eé]|prazo|multa|reclus[aã]o|deten[cç][aã]o)\b/gi)].map(x=>x[0].toLowerCase());
 return [...new Set(found)].slice(0,5);
}
function penalties(s){
 const x=norm(s).match(/(?:reclus[aã]o|deten[cç][aã]o|multa|advert[eê]ncia|suspens[aã]o|demiss[aã]o)[^.;]{0,115}/gi)||[];
 return [...new Set(x)].slice(0,2);
}
function render(g){
 if(!g||typeof g!=='object')return '<p>Material indisponível.</p>';
 const arr=groups(g);
 const title=norm(g.lawName||'Material de estudo');
 const items=arr.length?arr:[...(g.executiveSummary?.keyConcepts||[])].map((x,i)=>({article:'Tópico '+(i+1),plainExplanation:x,sourceText:x}));
 const top='<header class="pmdf-visual-cover"><div><span class="pmdf-visual-kicker">MÉTODO PMDF · CADERNO VISUAL</span><h2>'+escapeHTML(title)+'</h2><p>Resumo extrativo ilustrado · gráficos gerados no dispositivo</p></div><div class="pmdf-visual-cover-icon" aria-hidden="true">⚖</div></header>';
 const cards=items.map((a,i)=>{
  const original=norm(a.sourceText||a.plainExplanation||'');
  const text=norm(a.plainExplanation||a.sourceText||'');
  const label=norm(a.article||a.title||'Tópico '+(i+1));
  const terms=keywords(original||text),pen=penalties(original||text);
  const m=original.match(/\b(?:\d+[º°]?\s*(?:dias?|meses?|anos?|horas?)|\d+\/\d+|§\s*\d+[º°]?)\b/gi)||[];
  return '<section class="pmdf-visual-card"><div class="pmdf-visual-article">'+escapeHTML(label)+'</div><div class="pmdf-visual-card-grid"><div class="pmdf-visual-art">'+illustration(label+' '+original,i)+'</div><div class="pmdf-visual-main"><h3>REGRA CENTRAL</h3><p>'+escapeHTML(shorten(text,650))+'</p>'+(original&&original!==text?'<details><summary>Conferir trecho de origem</summary><p>'+escapeHTML(shorten(original,2800))+'</p></details>':'')+'</div></div><div class="pmdf-visual-facts">'+(pen.length?'<div><b>⚖ Sanções citadas</b><p>'+escapeHTML(pen.join(' · '))+'</p></div>':'')+(m.length?'<div><b>⏱ Prazos e quantitativos</b><p>'+escapeHTML([...new Set(m)].slice(0,7).join(' · '))+'</p></div>':'')+'<div><b>💡 BIZU — atenção à literalidade</b><p>'+(terms.length?'Termos encontrados: '+escapeHTML(terms.join(' · '))+'.':'Identifique o sujeito, a conduta e os requisitos no texto-fonte.')+'</p></div></div><small class="pmdf-visual-source">Fonte: '+escapeHTML(label)+' · Conteúdo baseado no guia carregado. Confira a norma atualizada.</small></section>';
 }).join('');
 return '<div class="pmdf-visual-report">'+top+'<p class="pmdf-visual-disclaimer">Ilustrações vetoriais locais. Este modo não consulta serviços de IA nem cria fatos novos; os blocos são extraídos do material disponível no guia. Conteúdos extensos podem estar abreviados, com acesso ao trecho original quando disponível.</p>'+cards+'<footer class="pmdf-visual-footer">MÉTODO PMDF · Material didático · Verifique a legislação vigente</footer></div>';
}
root.PMDFVisualEngine=Object.freeze({render,illustration,keywords,penalties,version:'1.0.0-local'});
})(typeof window!=='undefined'?window:globalThis);
