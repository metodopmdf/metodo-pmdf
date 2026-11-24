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

// Decodifica o arquivo exportado como um consumidor de CSV/TSV: aspas duplas,
// campos com delimitadores e quebras de linha precisam sobreviver à leitura.
function delimited(content, separator) {
  const raw = content.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') {
      if (quoted && raw[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === separator && !quoted) { row.push(field); field = ""; }
    else if ((c === "\r" || c === "\n") && !quoted) {
      if (c === "\r" && raw[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  assert.equal(quoted, false, "Arquivo exportado com aspas não fechadas");
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function ankiRows(content) {
  return delimited(content.replace(/^\uFEFF/, "").split("\n").filter(line => !line.startsWith("#")).join("\n"), "\t");
}

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
  const original = JSON.stringify(cards);
  for (const format of ["csv", "tsv"]) {
    const exported = io.serialize(cards, format, {title: "Material"});
    const parsed = delimited(exported.content, format === "csv" ? ";" : "\t");
    assert.deepEqual(parsed[0], ["Frente", "Verso", "Extra", "Tags"]);
    assert.equal(parsed[1][0], cards[0].front, "Aspas, delimitadores e linhas precisam ser preservados");
    assert.equal(parsed[2][0], cards[1].cloze);
    assert.equal(exported.count, 2);
  }
  for (const prefix of ["=", "+", "-", "@", " \t="]) {
    const formula = [{id: "formula", front: prefix + "1+1", back: "Texto"}];
    const exported = delimited(io.serialize(formula, "csv").content, ";");
    assert(exported[1][0].startsWith("'"), "Abertura em planilhas deve neutralizar fórmulas");
    assert.equal(formula[0].front, prefix + "1+1", "A proteção não pode modificar o baralho");
  }
  const basic = io.serialize(cards, "basic");
  const cloze = io.serialize(cards, "cloze");
  assert.match(basic.content, /#notetype:Basic/);
  assert.match(cloze.content, /#notetype:Cloze/);
  for (const output of [basic, cloze]) {
    assert.match(output.content, /#html:false/, "HTML do material não deve ser executado pelo Anki");
    assert.match(output.content, /#separator:Tab/);
    assert.equal(output.count, 1);
    assert.equal(ankiRows(output.content).length, 1);
    assert.equal(ankiRows(output.content)[0].length, 3);
  }
  assert.equal(ankiRows(basic.content)[0][0], cards[0].front.replace(/\n/g, " "));
  assert.equal(ankiRows(cloze.content)[0][0], cards[1].cloze);
  assert.equal(JSON.stringify(cards), original, "Exportar não deve modificar cartões");
  assert.throws(() => io.serialize([cards[0]], "cloze"), /Cloze/);
  assert.throws(() => io.serialize([cards[1]], "basic"), /Básico/);
  assert.throws(() => io.serialize([], "json"), /flashcards/);
  assert.throws(() => io.serialize([cards[0], cards[0]], "json"), /duplicado/);

  const backup = io.serialize(cards, "json", {title: "Meu baralho"});
  const restored = await io.readFile(file("backup.json", backup.content));
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
  console.log("QA IO PASS: texto integral, JSON, PDF/DOCX, escape e exportações Basic/Cloze/CSV/TSV");
})().catch(error => { console.error(error); process.exitCode = 1; });
