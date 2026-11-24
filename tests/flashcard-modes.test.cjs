"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scripts = ["pmdf-flashcard-classifier.js", "pmdf-neural-flashcards.js", "pmdf-flashcards-perguntas.js"];
function load(storage) {
  const root = {localStorage: storage};
  for (const name of scripts) new Function("window", fs.readFileSync(path.join(__dirname, "..", "assets", name), "utf8"))(root);
  return root;
}
const guide = {lawName: "Regulamento fictício — QA", articlesMapping: {highIncidence: [
  {article: "Art. 1º — Serviço", sourceText: "O serviço público é atividade administrativa submetida às normas de funcionamento da instituição."},
  {article: "Art. 2º — Prazo", sourceText: "A autoridade administrativa deverá motivar a decisão em 15 dias, salvo impedimento devidamente justificado."},
  {article: "Art. 3º — Documento", sourceText: "O protocolo é registro sequencial das solicitações recebidas pela instituição."}
], mediumIncidence: [], lowIncidence: []}};

function assertReport(result) {
  assert.equal(result.report.total, result.cards.length, "O relatório deve contar os cartões entregues");
  assert.equal(Object.values(result.report.modalities).reduce((a, b) => a + b, 0), result.cards.length);
  assert.equal(Object.values(result.report.difficulties).reduce((a, b) => a + b, 0), result.cards.length);
  assert.equal(result.report.coveredTopics, new Set(result.cards.map(c => c.reference)).size);
  assert.equal(new Set(result.cards.map(c => c.id)).size, result.cards.length, "IDs não podem se repetir");
}

(async () => {
  const root = load();
  const api = root.PMDFNeuralFlashcards;
  assert.equal(root.PMDFNeuralQuestions, undefined, "Não deve existir motor de questões nesta aplicação");
  const questions = api.build(guide, {style: "questions"});
  assert(questions.cards.length >= 2, "As definições devem produzir perguntas recuperáveis");
  assert(questions.cards.every(c => c.family === "question" && !c.cloze));
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  for (const card of questions.cards) {
    assert(normalize(card.source).includes(normalize(card.back)), "A resposta deve constar do texto-fonte");
    assert(card.reference && card.warning, "O cartão deve identificar sua origem");
  }
  assertReport(questions);

  const cloze = await api.buildAsync(guide, {style: "cloze"});
  assert(cloze.cards.length >= 2, "Texto com prazo e conceitos deve produzir lacunas");
  for (const card of cloze.cards) {
    assert.equal(card.family, "cloze");
    assert.match(card.cloze, /\{\{c1::.+?\}\}/);
    assert(normalize(card.source).includes(normalize(card.back)), "A resposta à lacuna precisa existir na fonte");
  }
  assertReport(cloze);

  const mixed = api.build(guide, {style: "mixed"});
  assert(mixed.cards.some(c => c.family === "question"));
  assert(mixed.cards.some(c => c.family === "cloze"));
  assertReport(mixed);

  // Sem tópico semântico, ainda há uma lacuna verificável no prazo literal.
  const sparse = {lawName: "Exemplo fictício", articlesMapping: {highIncidence: [
    {article: "Art. 1º", sourceText: "A autoridade administrativa deverá praticar o ato em 5 dias."}
  ], mediumIncidence: [], lowIncidence: []}};
  assert.equal(api.build(sparse, {style: "questions"}).cards.length, 0);
  const fallback = await api.buildAsync(sparse, {style: "mixed"});
  assert(fallback.cards.length > 0, "Modo misto deve aproveitar lacunas verificáveis quando não houver perguntas");
  assert(fallback.cards.every(c => c.family === "cloze"));
  assertReport(fallback);

  for (const style of ["questions", "cloze", "mixed"]) {
    const stopped = await api.buildAsync(guide, {style, cancelled: () => true});
    assert.equal(stopped.cancelled, true);
    assert.equal(stopped.cards.length, 0, "Cancelamento não deve entregar um baralho parcial");
    let cancel = false;
    const lastCallback = await api.buildAsync(guide, {style,
      onProgress: () => { cancel = true; }, cancelled: () => cancel});
    assert.equal(lastCallback.cancelled, true, "Cancelamento no último progresso também deve ser respeitado");
    assert.equal(lastCallback.cards.length, 0);
  }

  const brokenStorage = {getItem() { throw Error("bloqueado"); }, setItem() { throw Error("bloqueado"); }};
  assert(load(brokenStorage).PMDFNeuralFlashcards.build(guide, {style: "questions"}).cards.length > 0,
    "Bloqueio do armazenamento não pode impedir a geração");
  console.log("QA MODOS PASS", JSON.stringify({questions: questions.cards.length, cloze: cloze.cards.length, mixed: mixed.cards.length}));
})().catch(error => { console.error(error); process.exitCode = 1; });
