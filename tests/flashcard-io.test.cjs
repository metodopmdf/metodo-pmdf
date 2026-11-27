"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "..", "assets", "pmdf-flashcard-io.js"), "utf8");
function load(extra = {}) {
  const root = {...extra};
  new Function("window", source)(root);
  return root.PMDFFlashcardIO;
}
const io = load();
const file = (name, content) => {
  const data = Buffer.from(content);
  return {name, size: data.length, text: async () => data.toString("utf8"),
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)};
};
const fixture = "Preâmbulo do regulamento fictício, que também deve ser preservado.\n\n" +
  "Art. 1º O protocolo é registro sequencial das solicitações recebidas.\n" +
  "O cadastro contém o nome completo do solicitante e a data de recebimento.\n" +
  "§ 1º A autoridade responsável deverá decidir em 15 dias.\n" +
  "Art. 2º É vedado exigir pagamento pelo serviço, salvo custo de material específico.\n" +
  "Parágrafo único. A última frase também pertence ao material fornecido.";

(async () => {
  const guide = io.parseText(fixture, "Regulamento de teste");
  assert.equal(guide.sourceText, fixture, "O texto integral deve ser conservado");
  const rows = Object.values(guide.articlesMapping).flat();
  for (const statement of ["Preâmbulo do regulamento", "O cadastro contém", "decidir em 15 dias", "A última frase"])
    assert(rows.some(row => row.sourceText.includes(statement)), "Trecho perdido no parser: " + statement);
  assert(rows.some(row => /Art\. 1º.*§ 1º/.test(row.article)), "O parágrafo deve manter a referência ao artigo");
  assert(rows.some(row => /Art\. 2º.*Parágrafo único/.test(row.article)));
  assert.throws(() => io.parseText("   "), /texto/i);
  assert.throws(() => io.parseText("a".repeat(2 * 1024 * 1024 + 1)), /caracteres/i);

  const txt = await io.readFile(file("meu-material.txt", fixture));
  assert.equal(txt.text, fixture);
  const md = await io.readFile(file("meu-material.md", "# Título\n\n" + fixture));
  assert(md.text.endsWith("material fornecido."));
  const jsonText = await io.readFile(file("material.json", JSON.stringify({title: "Teste JSON", text: fixture})));
  assert.equal(jsonText.guide.sourceText, fixture);
  const jsonGuide = await io.readFile(file("guia.json", JSON.stringify(guide)));
  assert.equal(jsonGuide.guide.lawName, guide.lawName);
  const before = rows.map(row => row.sourceText).sort();
  assert.deepEqual(Object.values(jsonGuide.guide.articlesMapping).flat().map(row => row.sourceText).sort(), before);
  await assert.rejects(() => io.readFile(file("erro.json", "{invalid")), /JSON/i);
  await assert.rejects(() => io.readFile(file("errado.exe", fixture)), /Formato/i);

  const hostile = '<img src=x onerror="alert(1)">';
  const cards = [
    {id: "basic-1", front: 'Frente com "aspas"; tab\t e\nlinha ' + hostile, back: "Resposta & literal", source: fixture, reference: "Art. 1º", tip: "Dica original", family: "question", tags: "fonte teste"},
    {id: "cloze-1", front: "Prazo: [lacuna]", back: "15 dias", cloze: "O prazo é {{c1::15 dias::tempo}}.", source: fixture, reference: "Art. 2º", family: "cloze", literal: true}
  ];
  assert.equal(io.serialize, undefined, "A aplicação não deve expor o serializador de cartões");
  const storedBackup = JSON.stringify({format: "PMDF-FLASHCARDS-v1", version: 1, title: "Meu baralho", cards});
  const restored = await io.readFile(file("backup.json", storedBackup));
  assert.equal(restored.title, "Meu baralho");
  assert.equal(restored.cards.length, 2);
  for (let i = 0; i < cards.length; i++) {
    for (const [key, value] of Object.entries(cards[i])) assert.deepEqual(restored.cards[i][key], value, "Backup perdeu " + key);
  }
  assert.equal(io.escapeHtml(hostile), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');

  // Bibliotecas simuladas testam o contrato de leitura, sem depender da CDN.
  let destroyed = 0;
  const pdfIO = load({pdfjsLib: {GlobalWorkerOptions: {}, getDocument(options) {
    assert.equal(options.isEvalSupported, false);
    return {promise: Promise.resolve({numPages: 2,
      getPage: async number => ({getTextContent: async () => ({items: [{str: "Texto integral da página " + number, hasEOL: true}]}), cleanup() {}}),
      destroy: async () => { destroyed++; }})};
  }}});
  const pdf = await pdfIO.readFile(file("exemplo.pdf", "%PDF"));
  assert(pdf.text.includes("página 1") && pdf.text.includes("página 2"));
  assert.equal(destroyed, 1, "Leitor PDF deve liberar o documento");
  const scanned = load({pdfjsLib: {GlobalWorkerOptions: {}, getDocument: () => ({promise: Promise.resolve({numPages: 1,
    getPage: async () => ({getTextContent: async () => ({items: []})}), destroy: async () => {}})})}});
  await assert.rejects(() => scanned.readFile(file("escaneado.pdf", "%PDF")), /sem texto extraível/);
  const docx = load({mammoth: {extractRawText: async () => ({value: fixture})}});
  assert.equal((await docx.readFile(file("exemplo.docx", "PK"))).text, fixture);
  console.log("QA IO PASS: texto integral, JSON, PDF/DOCX, escape e importação legada sem exportação");
})().catch(error => { console.error(error); process.exitCode = 1; });
