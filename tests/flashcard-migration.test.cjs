'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = name => fs.readFileSync(path.join(__dirname, '..', 'assets', name), 'utf8');
const root = {};
new Function('window', source('pmdf-flashcard-io.js'))(root);
new Function('window', source('pmdf-flashcard-migration.js'))(root);
const io = root.PMDFFlashcardIO, migration = root.PMDFFlashcardMigration;
const KEY = 'pmdf:flashcards:standalone:v1';
const AUTH = 'pmdf:supabase:session:v1', SESSION = 'pmdf:session:v4';
const UID = '11111111-2222-4333-8444-555555555555';
const OTHER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const PREFIX = 'pmdf:account:' + UID + ':';
const cards = [
  {id: 'old-basic', front: 'Qual é o prazo?', back: '15 dias', law: 'Material anterior', source: 'O prazo é de 15 dias.'},
  {id: 'old-cloze', front: 'O prazo é [lacuna].', back: '5 dias', cloze: 'O prazo é {{c1::5 dias}}.', law: 'Material anterior'}
];
const old = (extra = {}) => ({version: 4, updated: '2026-11-24T20:00:00Z', tab: 'anki',
  question: {items: [{statement: 'Não deve migrar'}]},
  anki: {cards, index: 1, back: true, ratings: {'0': 'good'}, ...extra}});
const account = (session = old()) => ({
  [AUTH]: JSON.stringify({user: {id: UID}, access_token: 'never-copy-access', refresh_token: 'never-copy-refresh'}),
  [PREFIX + SESSION]: JSON.stringify(session),
  [PREFIX + 'fc:old-basic']: '2',
  [PREFIX + 'leitner:old-basic']: '3',
  [PREFIX + 'leitnerDue:old-basic']: '1893456000000',
  [PREFIX + 'fc:old-cloze']: '-10',
  [PREFIX + 'leitner:old-cloze']: '9',
  [PREFIX + 'leitnerDue:old-cloze']: 'NaN'
});
function storage(initial = {}, options = {}) {
  const data = new Map(Object.entries(initial)), reads = [], writes = [];
  return {data, reads, writes,
    getItem(key) {
      reads.push(key);
      if (options.blockReads) throw Error('Armazenamento bloqueado');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      writes.push(key);
      if (options.blockWrites) throw Error('QuotaExceededError');
      data.set(key, String(value));
    },
    key() { throw Error('Não enumerar chaves'); },
    get length() { throw Error('Não enumerar contas'); }
  };
}
const recover = store => migration.recover(store, io.validateCards);

// A conversão não deve consultar outras contas nem copiar autenticação ou questões.
{
  const input = account();
  input['pmdf:account:' + OTHER + ':' + SESSION] = JSON.stringify(old({cards: [{id: 'other', front: 'Outra conta', back: 'Outra resposta'}]}));
  input['leitner:old-basic'] = '4';
  input['pmdf:visitor:leitner:old-basic'] = '4';
  const store = storage(input), result = recover(store);
  assert.equal(result.status, 'recovered');
  assert.equal(result.state.cards.length, 2);
  assert.equal(result.state.title, 'Material anterior');
  assert.deepEqual(result.state.session.ids, ['old-basic', 'old-cloze']);
  assert.equal(result.state.session.index, 1);
  assert.equal(result.state.session.back, true);
  assert.deepEqual({...result.state.session.ratings}, {'0': 'good'});
  assert.deepEqual(result.state.schedule['old-basic'], {box: 3, due: 1893456000000});
  assert.deepEqual(result.state.schedule['old-cloze'], {box: 4, due: 0});
  assert(!JSON.stringify(result.state).includes('never-copy'));
  assert(!JSON.stringify(result.state).includes('Não deve migrar'));
  assert(store.reads.every(key => key === KEY || key === AUTH || key.startsWith(PREFIX)));
  assert.deepEqual(Object.fromEntries(store.data), input, 'Recuperar não pode alterar registros antigos');
  assert.deepEqual(store.writes, []);
}

// Qualquer registro standalone existente impede a migração automática.
for (const existing of ['', '{corrompido', 'null', '{}', JSON.stringify({version: 1, cards})]) {
  const store = storage({...account(), [KEY]: existing});
  assert.equal(recover(store).status, 'existing');
  assert.deepEqual(store.reads, [KEY], 'Um baralho novo impede até a leitura de dados antigos');
  assert.equal(store.data.get(KEY), existing);
}

// Conta ativa sem sessão não pode recair nos dados de visitantes ou de outra conta.
{
  const store = storage({[AUTH]: account()[AUTH],
    ['pmdf:visitor:' + SESSION]: JSON.stringify(old()),
    ['pmdf:account:' + OTHER + ':' + SESSION]: JSON.stringify(old())});
  assert.equal(recover(store).status, 'none');
  assert.deepEqual(store.reads, [KEY, AUTH, PREFIX + SESSION]);
}
// Sem conta ativa, somente os namespaces visitor e sem prefixo são aceitos.
for (const prefix of ['pmdf:visitor:', '']) {
  const store = storage({[prefix + SESSION]: JSON.stringify(old()),
    [prefix + 'fc:old-basic']: '1', [prefix + 'leitner:old-basic']: '2',
    [prefix + 'leitnerDue:old-basic']: '1234567890',
    ['pmdf:account:' + OTHER + ':' + SESSION]: JSON.stringify(old())});
  const result = recover(store);
  assert.equal(result.status, 'recovered');
  assert.deepEqual(result.state.schedule['old-basic'], {box: 2, due: 1234567890});
  assert(!store.reads.some(key => key.startsWith('pmdf:account:')));
}
for (const auth of ['{quebrado', 'null', JSON.stringify({user: {id: '../outra-conta'}})]) {
  const store = storage({[AUTH]: auth, ['pmdf:visitor:' + SESSION]: JSON.stringify(old())});
  assert.equal(recover(store).status, 'recovered');
  assert(!store.reads.some(key => key.startsWith('pmdf:account:')));
}

// Metadados não devem produzir coerções perigosas, índices inválidos ou notas herdadas.
{
  const result = recover(storage(account(old({index: {toString: null}, back: {yes: true},
    ratings: {'0': 'easy', '1': 'unknown', '2': 'good', '-1': 'hard', '01': 'again', constructor: 'good'}}))));
  assert.equal(result.status, 'recovered');
  assert.equal(result.state.session.index, 0);
  assert.equal(result.state.session.back, false);
  assert.deepEqual({...result.state.session.ratings}, {'0': 'easy'});
  assert.equal(recover(storage(account(old({index: 999})))).state.session.index, cards.length);
  assert.equal(recover(storage(account(old({index: -7})))).state.session.index, 0);
  assert.deepEqual({...recover(storage(account(old({ratings: ['good']})))).state.session.ratings}, {});
}
for (const malformed of ['{inválido', 'null', JSON.stringify({version: 3, anki: {cards}}),
  JSON.stringify(old({cards: [cards[0], cards[0]]})),
  JSON.stringify(old({cards: [{...cards[0], source: {unexpected: true}}]}))]) {
  const store = storage({...account(), [PREFIX + SESSION]: malformed});
  const result = recover(store);
  assert.equal(result.status, 'invalid');
  assert.match(result.message, /preservados/);
  assert.equal(store.data.has(KEY), false);
}
assert.equal(recover(storage(account({...old(), anki: null}))).status, 'none');
assert.equal(recover(storage({}, {blockReads: true})).status, 'unavailable');

// O acervo completo recupera a agenda de IDs conhecidos fora da última sessão,
// inclusive quando a versão nova já salvou um baralho ou não há sessão antiga.
{
  const outside = 'cfo-gst-1770888888888';
  const input = {...account(), [KEY]: JSON.stringify({version: 1, cards}),
    [PREFIX + 'fc:' + outside]: '1', [PREFIX + 'leitner:' + outside]: '3',
    [PREFIX + 'leitnerDue:' + outside]: '1893456123456'};
  const store = storage(input), result = migration.readSchedules(store, [outside, 'missing']);
  assert.equal(result.status, 'recovered');
  assert.equal(Object.getPrototypeOf(result.schedule), null);
  assert.deepEqual({...result.schedule}, {[outside]: {box: 3, due: 1893456123456}});
  assert(!store.reads.includes(KEY) && !store.reads.includes(PREFIX + SESSION),
    'Ler a agenda do catálogo não deve depender de um baralho ou de uma sessão');
  assert(store.reads.every(key => key === AUTH || key.startsWith(PREFIX)));
  assert.deepEqual(Object.fromEntries(store.data), input);
  assert.deepEqual(store.writes, []);
}
{
  const input = {[AUTH]: account()[AUTH], [PREFIX + 'leitnerDue:outside-session']: '1893456000000'};
  const store = storage(input), result = migration.readSchedules(store, ['outside-session']);
  assert.equal(result.status, 'recovered');
  assert.deepEqual(result.schedule['outside-session'], {box: 0, due: 1893456000000});
  assert.equal(store.data.has(PREFIX + SESSION), false);
}

// Uma conta identificada nunca recebe agenda de outra conta ou de visitantes.
{
  const input = {[AUTH]: account()[AUTH],
    ['pmdf:account:' + OTHER + ':leitner:only-other']: '4',
    'pmdf:visitor:leitner:only-other': '3', 'leitner:only-other': '2'};
  const store = storage(input), result = migration.readSchedules(store, ['only-other']);
  assert.equal(result.status, 'none');
  assert.deepEqual({...result.schedule}, {});
  assert(store.reads.every(key => key === AUTH || key.startsWith(PREFIX)));
  assert.deepEqual(store.writes, []);
}

// Sem conta válida, os dois formatos históricos públicos são aceitos. Um mesmo
// cartão usa um único namespace, com preferência por visitor, sem mesclar campos.
for (const auth of [undefined, '{inválido', JSON.stringify({user: {id: '../other'}})]) {
  const input = {
    'pmdf:visitor:fc:visitor-card': '2',
    'leitner:visitor-card': '4', 'leitnerDue:visitor-card': '1893456000000',
    'leitner:unprefixed-card': '3', 'leitnerDue:unprefixed-card': '1893456123456',
    ['pmdf:account:' + OTHER + ':leitner:private-card']: '4'
  };
  if (auth !== undefined) input[AUTH] = auth;
  const store = storage(input), result = migration.readSchedules(store, ['visitor-card', 'unprefixed-card', 'private-card']);
  assert.equal(result.status, 'recovered');
  assert.deepEqual({...result.schedule}, {
    'visitor-card': {box: 2, due: 0}, 'unprefixed-card': {box: 3, due: 1893456123456}
  });
  assert(!store.reads.some(key => key.startsWith('pmdf:account:')));
  assert(!store.reads.includes('leitner:visitor-card'));
  assert.deepEqual(store.writes, []);
}

// Entradas inválidas são normalizadas individualmente, sem perder a agenda dos
// demais cartões e sem fabricar registros para IDs que não tenham dados.
{
  const store = storage({[AUTH]: account()[AUTH],
    [PREFIX + 'fc:bad']: 'NaN', [PREFIX + 'leitner:bad']: 'Infinity',
    [PREFIX + 'leitnerDue:bad']: '-20',
    [PREFIX + 'fc:bounded']: '-9', [PREFIX + 'leitner:bounded']: '8.4',
    [PREFIX + 'leitnerDue:bounded']: '1893456123456',
    [PREFIX + 'fc:empty']: ''});
  const result = migration.readSchedules(store, ['bad', 'bounded', 'empty', 'absent', 'bounded', null, '../bad']);
  assert.equal(result.status, 'recovered');
  assert.deepEqual({...result.schedule}, {
    bad: {box: 0, due: 0}, bounded: {box: 4, due: 1893456123456}, empty: {box: 0, due: 0}
  });
  assert.equal(store.reads.filter(key => key === PREFIX + 'fc:bounded').length, 1);
  assert(!store.reads.some(key => key.includes('../bad') || key.endsWith(':null')));
}
{
  const store = storage(), result = migration.readSchedules(store, ['unknown']);
  assert.equal(result.status, 'none');
  assert.deepEqual({...result.schedule}, {});
  assert.deepEqual(store.writes, []);
}
{
  const store = storage({}, {blockReads: true}), result = migration.readSchedules(store, ['old-basic']);
  assert.equal(result.status, 'unavailable');
  assert.deepEqual({...result.schedule}, {});
  assert.match(result.message, /preservados/);
  assert.deepEqual(store.writes, []);
  assert.equal(migration.readSchedules(store, []).status, 'none');
}

// Executa o controlador real com elementos mínimos para conferir recuperação e
// falha de gravação sem depender de Chromium. A suíte browser cobre a interface.
function restoreApp(store) {
  const elements = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, {value: '', textContent: '', innerHTML: '', dataset: {}, hidden: false,
      setAttribute() {}, addEventListener() {}, replaceChildren() {}, focus() {}, scrollIntoView() {}});
    return elements.get(id);
  };
  get('anki-card-style').value = 'questions';
  const document = {getElementById: get, documentElement: {dataset: {}}, addEventListener() {}};
  const window = {PMDFFlashcardIO: io, PMDFFlashcardMigration: migration, PMDFNeuralFlashcards: {},
    matchMedia: () => ({matches: false}), addEventListener() {}};
  new Function('window', 'document', 'localStorage', source('pmdf-flashcards-app.js'))(window, document, store);
  return get;
}
{
  const initial = account(), store = storage(initial), get = restoreApp(store);
  assert.equal(get('deck-count').textContent, '2');
  assert.equal(get('start-review').disabled, false);
  const saved = JSON.parse(store.data.get(KEY));
  assert.equal(saved.session.index, 1);
  assert.equal(saved.session.back, true);
  assert.deepEqual(saved.session.ratings, {'0': 'good'});
  assert.deepEqual(saved.schedule['old-basic'], {box: 3, due: 1893456000000});
  assert.match(get('storage-status').textContent, /sessão anterior recuperados/);
  for (const [key, value] of Object.entries(initial)) assert.equal(store.data.get(key), value);
  assert.deepEqual(store.writes, [KEY]);
}
{
  const initial = account(), store = storage(initial, {blockWrites: true}), get = restoreApp(store);
  assert.equal(get('deck-count').textContent, '2', 'Falhar ao salvar não pode descartar os cartões em memória');
  assert.equal(get('start-review').disabled, false);
  assert.equal(get('storage-status').dataset.error, 'true');
  assert.match(get('storage-status').textContent, /podem ser perdidos/);
  assert.deepEqual(Object.fromEntries(store.data), initial);
}
for (const existing of ['', '{corrompido', '{}']) {
  const store = storage({...account(), [KEY]: existing}), get = restoreApp(store);
  assert.equal(store.data.get(KEY), existing);
  assert.equal(get('deck-count').textContent, '0');
  assert.match(get('storage-status').textContent, /Nenhum registro foi substituído/);
  assert.deepEqual(store.writes, []);
}
{
  const own = JSON.stringify({version: 1, title: 'Baralho novo', cards: [cards[1]], schedule: {}, cursor: 0});
  const store = storage({...account(), [KEY]: own}), get = restoreApp(store);
  assert.equal(get('deck-count').textContent, '1');
  assert.equal(get('deck-title').textContent, 'Baralho novo');
  assert.equal(store.data.get(KEY), own);
  assert(!store.reads.includes(AUTH));
}
assert.equal(restoreApp(storage({}, {blockReads: true}))('deck-count').textContent, '0');
console.log('QA MIGRATION PASS: sessão v4, agenda do catálogo completo, isolamento entre contas, dados inválidos e falha de armazenamento');
