"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","assets","pmdf-neural-flashcards.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
new Function(source);
assert.match(html,/pmdf-neural-flashcards\.js/);
assert.match(html,/anki-generation-mode/);
assert.match(html,/startAnkiAdvanced/);
assert.match(html,/exportAnkiCards/);
const fake={PMDFNeuralQuestions:{testModel:()=>({extrairFeatures:()=>[0.6],preverVetor:()=>({saida:[0.65]})})}};
new Function("window",source)(fake);
const api=fake.PMDFNeuralFlashcards;
assert(api?.buildAsync&&api?.build,"API do motor de flashcards indisponível");
const guide={lawName:"Regulamento fictício para auditoria",articlesMapping:{
 highIncidence:[
 {article:"Art. 1º — Definição",sourceText:"O serviço público é atividade administrativa submetida às normas de funcionamento da instituição."},
 {article:"Art. 2º — Competência",sourceText:"A autoridade administrativa deverá motivar a decisão em 15 dias, salvo impedimento devidamente justificado.",practicalExample:"Diferenciar prazo para motivação e hipótese de justificativa prevista no material."},
 {article:"Art. 3º — Limites",sourceText:"É vedado exigir taxa adicional durante o procedimento quando o regulamento estabelecer gratuidade expressa."}
 ],mediumIncidence:[
 {article:"Art. 4º — Procedimento",sourceText:"O setor competente poderá solicitar documentação complementar em 5 dias, desde que a solicitação seja fundamentada."}
 ],lowIncidence:[]}};
const result=api.build(guide,{level:"avancado"});
assert(result.cards.length>=8,"Poucos cartões para texto rico em fatos");
assert.equal(result.report.coveredTopics,4,"Não percorreu todos os artigos");
assert.equal(new Set(result.cards.map(c=>c.id)).size,result.cards.length,"IDs duplicados");
assert(result.cards.some(c=>c.modality==="Básico (P&R)"),"Sem modalidade básica");
assert(result.cards.some(c=>c.modality==="Cloze (Lacuna)"),"Sem modalidade lacunas");
assert(result.cards.some(c=>c.modality==="Gatilho de Banca"),"Sem modalidade Cebraspe");
assert(result.cards.every(c=>c.tip&&c.tip.length>12),"Cartão sem dica didática");
assert(result.cards.some(c=>c.pitfall.includes("Pegadinha")||c.pitfall.includes("Fonte:")),"Faltam pegadinhas");
assert(result.cards.some(c=>c.application.includes("Diferenciar prazo")),"Exemplo prático explícito foi perdido");
assert(result.cards.every(c=>c.kind!=="Síntese expressa"),"Cartão só com título reapareceu");
assert(result.cards.some(c=>c.front.includes("[lacuna]")),"Lacunas não estão contextualizadas");
assert(result.cards.every(c=>!c.front.includes("Complete a expressão suprimida")),"Modelo antigo de pergunta genérica");
assert(result.cards.every(c=>c.front.length<=360&&c.back.length<=270),"Cartão extenso demais");
assert(result.cards.some(c=>c.back==="15 dias"),"Verso não é atômico");
assert(result.cards.every(c=>c.id.startsWith("anki-v4-")),"ID incorreto");
assert(result.cards.some(c=>/\{\{c1::15 dias(?:::|\}\})/.test(c.cloze||"")),"Sem padrão Cloze Anki");
assert(result.cards.some(c=>c.back.startsWith("ERRADO")&&c.back.includes("15 dias")),"Sem armadilha corrigida");
assert(result.cards.some(c=>c.back.startsWith("CERTO")),"Sem literalidade correta");
for(const c of result.cards){
 assert(c.reference&&c.tags&&c.source&&c.extra&&c.warning,"Cartão sem fonte ou metadados");
 assert(c.extra===c.source,"Fundamento não corresponde à origem");
 assert(["Fácil","Médio","Difícil"].includes(c.difficulty),"Nível ausente");
 assert(!c.front.includes("…")&&!c.back.includes("…"),"Cartão truncado");
}

const tricky={lawName:"Código Militar QA",articlesMapping:{highIncidence:[{
 article:"Art. 9º — Crime militar",
 sourceText:"Define quando um fato é crime militar: (I) quando só existe no CPM; (II) quando previsto na legislação penal comum após a Lei 13.491/2017, e praticado em serviço."
}],mediumIncidence:[],lowIncidence:[]}};
const edge=api.build(tricky);
assert(edge.cards.every(c=>!/\bLei 13$/.test(c.back)&&
 !/quando previsto no CPM ou na legislação penal comum \(após a Lei 13$/.test(c.back)),
 "Gerador truncou uma referência como Lei 13.491/2017");
assert(edge.cards.every(c=>!/Define quando um fato/.test(c.front)),
 "Não deve transformar frase metalinguística incompleta em cartão");
const informative=api.build({lawName:"Lei de exemplo",articlesMapping:{highIncidence:[{
 article:"Art. 1º — Gratuidade",
 sourceText:"É vedado exigir pagamento pelo serviço, salvo comprovado custo de material específico."
}],mediumIncidence:[],lowIncidence:[]}});
assert(informative.cards.some(c=>c.cloze&&c.back.includes("comprovado custo")),
 "Não identificou condição de exceção com artigo determinante");


// Regressão visual: é proibido apresentar "Título I — Tempo e Lugar do Crime"
// como frente inteira sem um fato jurídico específico.
const topicOnly=api.build({lawName:"Código Penal Militar QA",articlesMapping:{highIncidence:[{
 article:"Arts. 5º e 6º (Parte Geral - Título I) — Tempo e Lugar do Crime",
 sourceText:"O diploma descreve temas para estudo, conforme a redação normativa."
}],mediumIncidence:[],lowIncidence:[]}});
assert.equal(topicOnly.cards.length,0,"Motor criou cartão com rótulo em vez de fato verificável");

// Lei penal militar: separar tempo e lugar do crime por teorias, não pelo título.
const theoryGuide={lawName:"Código Penal Militar — QA",articlesMapping:{
 highIncidence:[{article:"Arts. 5º e 6º (Parte Geral - Título I) — Tempo e Lugar do Crime",
  sourceText:"Para o Tempo do Crime, o CPM adota a Teoria da Atividade. Para o Lugar do Crime, nos crimes comissivos adota a Teoria da Ubiquidade e nos omissivos a Teoria da Atividade."}],
 mediumIncidence:[],lowIncidence:[]}};
const theoryCards=api.build(theoryGuide).cards;
assert(theoryCards.length>=3,"O CPM deixou de gerar os cartões das teorias");
assert(theoryCards.some(c=>c.back==="Teoria da Atividade"&&c.cloze),"Não ocultou teoria do tempo do crime");
assert(theoryCards.some(c=>c.back==="Teoria da Ubiquidade"&&c.cloze),"Não ocultou teoria dos crimes comissivos");
assert(theoryCards.every(c=>c.front!=="Título I — Tempo e Lugar do Crime"),"Cartão voltou a exibir somente o título");
assert(theoryCards.every(c=>c.tip?.includes("teoria")),"Faltam dicas específicas para distinguir as teorias");
assert(theoryCards.every(c=>c.pitfall?.includes("inverter")),"Faltam alertas de troca das teorias");

const entries=Array.from({length:520},(_,i)=>({
 article:"Art. "+(i+1)+"º — Processo "+i,
 sourceText:"A autoridade responsável pelo procedimento "+i+
 " deverá publicar uma decisão fundamentada em até "+(i+5)+
 " dias, salvo autorização expressa da unidade competente."
}));
(async()=>{
 const long=await api.buildAsync({lawName:"Norma extensa de QA",articlesMapping:{highIncidence:entries,mediumIncidence:[],lowIncidence:[]}});
 assert(long.cards.length>520,"Volume indevidamente limitado");
 assert.equal(long.report.sourceRows,520,"Não processou todo o texto");
 assert.equal(long.report.coveredTopics,520,"Não mapeou todos os artigos");
 assert.equal(new Set(long.cards.map(c=>c.id)).size,long.cards.length,"Cartões repetidos no banco grande");
 const cancel=await api.buildAsync(guide,{cancelled:()=>true});
 assert(cancel.cancelled===true,"Cancelamento falhou");
 console.log("QA FLASHCARDS PASS",JSON.stringify({short:result.cards.length,long:long.cards.length,modes:result.report.modalities}));
})().catch(e=>{console.error(e);process.exitCode=1;});
