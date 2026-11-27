'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const assets = path.join(__dirname, '..', 'assets');
const source = name => fs.readFileSync(path.join(assets, name), 'utf8');
const modules = {};
for (const name of ['pmdf-flashcard-io.js', 'pmdf-flashcard-migration.js', 'pmdf-anki-catalog.js'])
  new Function('window', source(name))(modules);
const catalog = modules.PMDFAnkiCatalog;
const complete = JSON.parse(fs.readFileSync(path.join(assets, 'bancos', 'anki.json'), 'utf8'));
const data = {...complete, cards: complete.cards.slice(0, 3)};
const card = catalog.toCards([data.cards[0]])[0];
const KEY = 'pmdf:flashcards:standalone:v1', CATALOG_KEY = 'pmdf:flashcards:anki:v1';
const SOURCE_KEY = KEY + ':source';
const personal = (schedule, session = null) => ({version: 1, title: 'Baralho pessoal salvo',
  cards: [card], schedule: {[card.id]: schedule}, cursor: 0, session});
const savedCatalog = schedule => ({version: 1, filters: {discipline: '', topic: ''},
  schedule: {[card.id]: schedule}, cursors: {}, session: null, mode: 'due', batchSize: '50'});
const settle = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

// Executa o controlador real e aciona seus eventos públicos. O DOM mínimo não
// simula layout: estes casos verificam persistência e ordem de operações assíncronas.
function app(initial = {}, load = async () => data) {
  const store = new Map(Object.entries(initial)), elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {value: '', textContent: '', innerHTML: '', dataset: {},
      hidden: false, disabled: false, children: [], handlers: new Map(),
      setAttribute() {}, addEventListener(type, fn) { this.handlers.set(type, fn); },
      replaceChildren(...children) { this.children = children; }, append(...children) { this.children.push(...children); },
      querySelector() { return null; }, focus() {}, scrollIntoView() {}});
    return elements.get(id);
  };
  get('anki-mode').value = 'due'; get('anki-batch-size').value = '50';
  get('anki-card-style').value = 'questions';
  const document = {getElementById: get, documentElement: {dataset: {}}, addEventListener() {}};
  const custom = {id: 'personal-generated', front: 'Qual é o prazo?', back: 'Quinze dias.'};
  const window = {...modules, PMDFAnkiCatalog: {...catalog, load},
    PMDFNeuralFlashcards: {buildAsync: async () => ({cards: [custom]})},
    matchMedia: () => ({matches: false}), addEventListener() {}};
  const storage = {getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value))};
  class Option { constructor(label, value) { this.label = label; this.value = value; } }
  const timer = (fn, delay) => { const handle = setTimeout(fn, delay); if (delay > 0) handle.unref(); return handle; };
  new Function('window', 'document', 'localStorage', 'Option', 'setTimeout', 'clearTimeout',
    source('pmdf-flashcards-app.js'))(window, document, storage, Option, timer, clearTimeout);
  return {store, get, state: key => JSON.parse(store.get(key)),
    async emit(id, type = 'click', event = {}) {
      const handler = get(id).handlers.get(type);
      assert(handler, 'Evento ausente: ' + id + ' / ' + type);
      await handler(event);
      await settle();
    }};
}

async function run() {
  // Retomar uma cópia pessoal antiga do acervo não pode rebobinar as avaliações
  // recentes da base, nem na memória nem nos registros salvos para a próxima visita.
  {
    const old = {box: 0, due: 0}, recent = {box: 3, due: 1893456000000};
    const originalPersonal = JSON.stringify(personal(old));
    const h = app({[KEY]: originalPersonal, [CATALOG_KEY]: JSON.stringify(savedCatalog(recent))});
    await settle();
    assert.equal(h.get('deck-count').textContent, '3', 'A base deve abrir mesmo com baralho pessoal salvo');
    assert.equal(h.store.get(KEY), originalPersonal, 'Carregar o catálogo não substitui o baralho pessoal');
    await h.emit('restore-custom');
    assert.equal(h.store.get(SOURCE_KEY), 'custom');
    assert.equal(h.get('deck-count').textContent, '1');
    assert.deepEqual(h.state(KEY).schedule[card.id], recent);
    assert.deepEqual(h.state(KEY).cards.map(item => item.id), [card.id]);
    await h.emit('use-anki-catalog');
    assert.equal(h.store.get(SOURCE_KEY), 'catalog');
    assert.equal(h.get('deck-count').textContent, '3');
    assert.deepEqual(h.state(CATALOG_KEY).schedule[card.id], recent);
  }

  // Quando o usuário deixou seu baralho pessoal ativo, sua agenda mais recente
  // continua prioritária no recarregamento e ao retornar à base completa.
  {
    const recent = {box: 4, due: 1893456123456};
    const h = app({[KEY]: JSON.stringify(personal(recent)), [SOURCE_KEY]: 'custom',
      [CATALOG_KEY]: JSON.stringify(savedCatalog({box: 1, due: 12345}))});
    await settle();
    assert.equal(h.get('deck-title').textContent, 'Baralho pessoal salvo');
    assert.equal(h.get('deck-count').textContent, '1');
    await h.emit('use-anki-catalog');
    assert.equal(h.get('deck-count').textContent, '3');
    assert.deepEqual(h.state(CATALOG_KEY).schedule[card.id], recent);
  }

  // Uma resposta tardia do botão Tentar novamente não pode tomar o lugar do
  // baralho que o usuário terminou de gerar durante aquela requisição.
  {
    const retry = deferred();
    let attempts = 0;
    const h = app({}, () => ++attempts === 1 ? Promise.reject(Error('Offline')) : retry.promise);
    await settle();
    assert.equal(h.get('anki-catalog-status').dataset.error, 'true');
    await h.emit('use-anki-catalog');
    h.get('source-title').value = 'Baralho recém-criado';
    h.get('source-text').value = 'O prazo de revisão é de quinze dias. A comissão é responsável pela organização dos registros.';
    await h.emit('create-form', 'submit', {preventDefault() {}});
    assert.equal(h.get('deck-title').textContent, 'Baralho recém-criado');
    retry.resolve(data);
    await settle();
    assert.equal(h.get('catalog-total').textContent, '3', 'O catálogo ainda deve ficar disponível');
    assert.equal(h.get('deck-title').textContent, 'Baralho recém-criado');
    assert.equal(h.store.get(SOURCE_KEY), 'custom');
    assert.deepEqual(h.state(KEY).cards.map(item => item.id), ['personal-generated']);
    assert.equal(h.get('use-anki-catalog').hidden, false);
  }
  console.log('QA CATALOG CONTROLLER PASS: agenda recente, alternância de fontes, preferência pessoal e carregamento assíncrono');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
