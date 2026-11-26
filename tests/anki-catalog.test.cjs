'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const assets = path.join(__dirname, '..', 'assets');
const source = fs.readFileSync(path.join(assets, 'pmdf-anki-catalog.js'), 'utf8');
const bytes = fs.readFileSync(path.join(assets, 'bancos', 'amostra-anki.json'));
const data = JSON.parse(bytes);
const ioRoot = {};
new Function('window', fs.readFileSync(path.join(assets, 'pmdf-flashcard-io.js'), 'utf8'))(ioRoot);
const io = ioRoot.PMDFFlashcardIO;
const PAGE = 'https://metodopmdf.github.io/metodo-pmdf/';
function loadModule(extra = {}) {
  const root = {location: {href: PAGE}, document: {baseURI: PAGE}, ...extra};
  new Function('window', source)(root);
  return {api: root.PMDFAnkiCatalog, root};
}
const {api} = loadModule();
const expected = {
  "Direito Penal Militar": [
    3,
    3
  ],
  "Distrito Federal e Política Para Mulheres": [
    2,
    2
  ],
  "Administração": [
    2,
    2
  ],
  "Legislação PMDF": [
    3,
    3
  ],
  "Noções de Criminologia": [
    2,
    2
  ],
  "Direitos Humanos": [
    2,
    2
  ],
  "Direito Administrativo": [
    3,
    3
  ],
  "Língua Portuguesa": [
    3,
    3
  ],
  "Direito Constitucional": [
    3,
    3
  ],
  "Direito Penal": [
    3,
    3
  ],
  "Jurisprudência Direito Administrativo": [
    2,
    1
  ],
  "Jurisprudência Direito Penal": [
    2,
    1
  ],
  "Jurisprudência Direito Penal Militar": [
    2,
    1
  ],
  "Jurisprudência Direito Constitucional": [
    2,
    1
  ],
  "Jurisprudência Legislação Penal Especial": [
    2,
    1
  ],
  "Jurisprudência Direito Processual Penal": [
    2,
    1
  ],
  "Jurisprudência Direito Processual Penal Militar": [
    2,
    1
  ],
  "Jurisprudência Direitos Humanos": [
    2,
    1
  ],
  "Direito Processual Penal": [
    2,
    2
  ],
  "Legislação Penal e Processual Penal Extravagante": [
    2,
    2
  ],
  "Direito Processual Penal Militar": [
    3,
    3
  ],
  "Raciocínio Lógico": [
    3,
    3
  ]
};

// A comparação integral impede qualquer alteração acidental no acervo publicado,
// incluindo texto, gabaritos, referências, ordem e IDs de revisão.
assert.equal(createHash('sha256').update(bytes).digest('hex'),
  'd5a20103fd67e1860a3f7cf6a5fdc8b7d4675fa5f819189449223786d69f754e');
assert.equal(api.validate(data), data);
assert.equal(data.cards.length, 52);
assert.equal(new Set(data.cards.map(card => card.id)).size, 52);
assert.equal(data.revision, '20261126-amostra-v1');
assert.equal(api.disciplines(data).length, 22);
assert.deepEqual(api.disciplines(data), Object.keys(expected).sort((a, b) => a.localeCompare(b, 'pt-BR')));
assert.equal(new Set(data.cards.map(card => card.disciplina + '|' + card.assunto)).size, 44);
assert.equal(api.topics(data).length, 37, 'Nomes repetidos entre disciplinas aparecem uma vez no seletor geral');
assert.deepEqual(api.filtered(data), data.cards);
assert.deepEqual(api.filtered(data, {discipline: 'Não existe'}), []);
assert.deepEqual(api.topics(data, 'Não existe'), []);
const covered = new Set();
for (const [discipline, [count, topicCount]] of Object.entries(expected)) {
  const rows = api.filtered(data, {discipline}), topics = api.topics(data, discipline);
  assert.equal(rows.length, count, discipline + ': quantidade de cartões mudou');
  assert.equal(topics.length, topicCount, discipline + ': quantidade de assuntos mudou');
  assert(rows.every(card => card.disciplina === discipline));
  for (const topic of topics) {
    const selected = api.filtered(data, {discipline, topic});
    assert(selected.length > 0);
    assert(selected.every(card => card.disciplina === discipline && card.assunto === topic));
    for (const card of selected) {
      assert(!covered.has(card.id), 'Um cartão apareceu em mais de uma combinação de filtros');
      covered.add(card.id);
    }
  }
}
assert.equal(covered.size, 52, 'Todos os cartões devem ser alcançáveis pelos filtros');

const original = JSON.stringify(data);
const mapped = api.toCards(data.cards), validated = io.validateCards(mapped);
assert.equal(mapped.length, 52);
assert.equal(validated.length, 52);
assert.deepEqual(api.toCards([]), []);
for (let index = 0; index < data.cards.length; index++) {
  const row = data.cards[index], card = mapped[index];
  for (const field of ['id', 'front', 'back']) {
    assert.equal(card[field], row[field], 'A adaptação não pode alterar ' + field);
    assert.equal(validated[index][field], row[field], 'A validação IO não pode alterar ' + field);
  }
  assert.equal(card.law, row.disciplina);
  assert.equal(card.article, row.assunto);
  assert.equal(card.reference, row.assunto);
  assert.equal(card.answer, row.answer);
  assert.deepEqual(card.editorialFlags, row.flags);
  assert.notEqual(card.editorialFlags, row.flags, 'O adaptador deve copiar os metadados mutáveis');
  assert.equal(card.reviewed_source, row.reviewed_source);
  assert.equal(card.origin, row.origin);
  assert.equal(validated[index].answer, row.answer);
  assert.deepEqual(validated[index].editorialFlags, row.flags);
  assert.equal(validated[index].reviewed_source, row.reviewed_source);
  assert.equal(validated[index].origin, row.origin);
  if (row.reviewed_source) {
    assert(card.warning.includes(row.reviewed_source));
    assert(card.extra.includes(row.reviewed_source));
  }
  if (row.flags.includes('verificar_vigencia_juridica')) assert.match(card.warning, /confira a norma/);
  if (row.flags.includes('imagem_do_original_nao_embutida')) assert.match(card.warning, /Imagem referenciada/);
  if (row.flags.includes('texto_incompleto_na_fonte')) assert.match(card.warning, /Trecho incompleto/);
  if (row.flags.includes('verso_extenso')) assert.match(card.warning, /comentário original.*extenso/);
}
assert.equal(JSON.stringify(data), original, 'Filtrar/adaptar não pode modificar a base');
assert.equal(data.cards.filter(card => card.answer === 'CERTO').length, 29);
assert.equal(data.cards.filter(card => card.answer === 'ERRADO').length, 23);
assert.equal(data.cards.filter(card => card.reviewed_source).length, 45);
assert.equal(data.cards.filter(card => card.flags.includes('texto_incompleto_na_fonte')).length, 0);

// O adaptador conserva o texto literal; o renderizador escapa e o Anki recebe
// #html:false, impedindo que trechos de material se tornem marcação executável.
const hostile = {...data.cards[0], id: 'cfo-gst-123456789',
  front: '<img src=x onerror="alert(1)">', back: '<script>alert(2)</script>',
  flags: ['__proto__'], reviewed_source: ''};
const escapedCard = io.validateCards(api.toCards([hostile]))[0];
assert.equal(escapedCard.front, hostile.front);
assert.equal(escapedCard.back, hostile.back);
assert.equal(io.escapeHtml(escapedCard.front), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
assert.match(io.serialize([escapedCard], 'basic').content, /#html:false/);
assert.match(escapedCard.warning, /Observação do acervo: __proto__/);

for (const wrong of [null, {}, {format: 'outro', cards: data.cards}, {format: data.format, cards: []},
  {format: data.format, cards: [data.cards[0], data.cards[0]]},
  {format: data.format, cards: [{...data.cards[0], id: 'novo-id'}]},
  {format: data.format, cards: [{...data.cards[0], disciplina: {label: 'inválida'}}]},
  {format: data.format, cards: [{...data.cards[0], flags: 'inválido'}]},
  {format: data.format, cards: [{...data.cards[0], answer: 'TALVEZ'}]}]) {
  assert.throws(() => api.validate(wrong), /inválid/);
}

(async () => {
  let count = 0, requested;
  const cached = loadModule({fetch: async (url, options) => {
    count++; requested = {url, options};
    return {ok: true, status: 200, json: async () => data};
  }}).api;
  const first = cached.load(), simultaneous = cached.load();
  assert.equal(first, simultaneous, 'Chamadas concorrentes devem compartilhar a mesma requisição');
  const [loaded, alsoLoaded] = await Promise.all([first, simultaneous]);
  assert.equal(loaded, data);
  assert.equal(alsoLoaded, data);
  assert.equal(await cached.load(), data);
  assert.equal(count, 1);
  assert.equal(requested.url, PAGE + 'assets/bancos/amostra-anki.json?v=amostra-v1');
  assert.equal(requested.options.cache, 'default');

  // Falhas de rede, HTTP, JSON ou validação não podem envenenar o cache.
  for (const failure of ['network', 'http', 'json', 'schema']) {
    let attempts = 0;
    const retry = loadModule({fetch: async () => {
      attempts++;
      if (attempts === 1) {
        if (failure === 'network') throw Error('Network failure');
        if (failure === 'http') return {ok: false, status: 503};
        return {ok: true, status: 200, json: async () => {
          if (failure === 'json') throw Error('JSON inválido');
          return {format: data.format, cards: [data.cards[0], data.cards[0]]};
        }};
      }
      return {ok: true, status: 200, json: async () => data};
    }}).api;
    await assert.rejects(retry.load());
    assert.equal(await retry.load(), data);
    assert.equal(await retry.load(), data);
    assert.equal(attempts, 2, failure + ': retry/cache incorretos');
  }
  let externalCalls = 0;
  const sameSite = loadModule({document: {baseURI: 'https://outro-site.invalid/'}, fetch: async () => {
    externalCalls++;
    return {ok: true, status: 200, json: async () => data};
  }});
  await assert.rejects(sameSite.api.load(), /próprio site/);
  assert.equal(externalCalls, 0, 'O módulo não deve buscar a base em outro domínio');
  sameSite.root.document.baseURI = PAGE;
  assert.equal(await sameSite.api.load(), data);
  assert.equal(externalCalls, 1);
  console.log('QA ANKI CATALOG PASS: base publicada íntegra, 52 cartões, 22 disciplinas, 44 assuntos, filtros, IO e retry');
})().catch(error => { console.error(error); process.exitCode = 1; });
