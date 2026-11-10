/*
 * Método PMDF · acervo autoral por tópico (2026-11).
 * Não reproduz questões de bancas; não substitui leitura da legislação vigente.
 * CE editorial (uma assertiva fundamentada por tópico) e MC selecionadas.
 * Geração adicional: o motor local usa explicações autorais como fonte.
 */
(function(root){
 "use strict";
 const catalog=root.PMDF_PRACA_CATALOG;
 const packs=new Map(), used=new Set();
 const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const checkedUrl=url=>/^https:\/\/(?:www\d*\.)?(?:planalto\.gov\.br|gov\.br|www\.gov\.br|sinj\.df\.gov\.br|ibge\.gov\.br|bvsms\.saude\.gov\.br|portaldaobmep\.impa\.br|learnenglish\.britishcouncil\.org)(?:\/|$)/i.test(String(url||'')) ? url : '';
 function add(index, rows, source, multipleChoice=[]){
   if(!catalog)throw Error("Carregue o catálogo PMDF antes do banco autoral");
   const d=catalog.disciplinas[index-1];
   if(!d||packs.has(d.slug))throw Error("Disciplina inválida ou duplicada: "+index);
   if(!Array.isArray(rows)||rows.length!==d.assuntos.length)throw Error("Cobertura incompleta: "+d.nome);
   if(!checkedUrl(source?.url))throw Error("URL de referência inválida: "+d.nome);
   const questions=[];
   rows.forEach((r,i)=>{
     const [statement,answer,explanation]=r;
     if(!["C","E"].includes(answer)||String(statement).trim().length<75||String(explanation).trim().length<48)
       throw Error("Revisar item "+d.nome+" #"+(i+1));
     const a=d.assuntos[i],id=d.slug+"|"+a.slug+"|CE|1";
     if(used.has(id))throw Error("Duplicata "+id);
     used.add(id);
     questions.push(Object.freeze({
       id,coverageId:"programa-v1:"+id,type:"CE",
       statement:String(statement).trim(),answer,
       explanation:String(explanation).trim(),
       law:d.nome,topic:a.nome,disciplineSlug:d.slug,topicSlug:a.slug,
       lawBasis:source.label,sourceUrl:source.url,
       evidence:(answer==="C"?statement:explanation),
       origin:"curriculo-autoral",board:"Estilo Cebraspe · questão autoral",
       difficulty:"Médio"
     }));
   });
   for(const [topicIndex,statement,alternatives,answer,explanation] of multipleChoice){
     const a=d.assuntos[topicIndex-1];
     if(!a||!Array.isArray(alternatives)||alternatives.length!==5||
        new Set(alternatives.map(norm)).size!==5||!["A","B","C","D","E"].includes(answer)||
        String(statement).trim().length<55||String(explanation).trim().length<48)
       throw Error("Questão MC inválida: "+d.nome+" #"+topicIndex);
     const id=d.slug+"|"+a.slug+"|MC|1";
     if(used.has(id))throw Error("Duplicata "+id);used.add(id);
     questions.push(Object.freeze({
       id,coverageId:"programa-v1:"+id,type:"MC",
       statement,options:Object.freeze(alternatives),answer,explanation,
       law:d.nome,topic:a.nome,disciplineSlug:d.slug,topicSlug:a.slug,
       lawBasis:source.label,sourceUrl:source.url,origin:"curriculo-autoral",
       board:"Questão autoral · múltipla escolha",difficulty:"Médio"
     }));
   }
   packs.set(d.slug,Object.freeze({source:Object.freeze({...source}),questions:Object.freeze(questions)}));
 }
 function choose(dslug,aslug,format){
   const ds=dslug?[catalog.disciplina(dslug)].filter(Boolean):catalog.disciplinas;
   return ds.flatMap(d=>(packs.get(d.slug)?.questions||[]).filter(q=>
     (!aslug||q.topicSlug===aslug) &&
     (format==="MIX"||format===(q.type==="MC"?"MC":"CE"))
   ));
 }
 function guide(dslug,aslug){
   return (dslug?[catalog.disciplina(dslug)].filter(Boolean):catalog.disciplinas).map(d=>{
     const pack=packs.get(d.slug);
     const rows=(pack?.questions||[]).filter(q=>q.type==="CE"&&(!aslug||q.topicSlug===aslug))
       .map(q=>({article:q.topic,sourceText:String(q.evidence||"").trim(),
         plainExplanation:q.explanation,practicalExample:q.statement}));
     return {lawName:d.nome,articlesMapping:{highIncidence:rows,mediumIncidence:[],lowIncidence:[]},
       curriculum:true};
   }).filter(g=>g.articlesMapping.highIncidence.length);
 }
 root.PMDF_TOPIC_BANK=Object.freeze({
   add,choose,guide,
   count:()=>[...packs.values()].reduce((n,p)=>n+p.questions.length,0),
   coverage:()=>Object.freeze(catalog.disciplinas.map(d=>Object.freeze({
     disciplina:d.nome,slug:d.slug,esperados:d.assuntos.length,
     registrados:(packs.get(d.slug)?.questions||[]).filter(q=>q.type==="CE").length,
     multiplaEscolha:(packs.get(d.slug)?.questions||[]).filter(q=>q.type==="MC").length
   })))
 });
})(window);
