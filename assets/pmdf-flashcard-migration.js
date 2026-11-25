/* Recupera flashcards e agendamentos locais anteriores, sem autenticação ou rede.
 * Os registros antigos permanecem intactos; gravar o novo estado cabe ao app.
 */
(function (root) {
  'use strict';
  const KEY = 'pmdf:flashcards:standalone:v1';
  const LEGACY_SESSION = 'pmdf:session:v4';
  const ACCOUNT_SESSION = 'pmdf:supabase:session:v1';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const RATINGS = new Set(['again', 'hard', 'good', 'easy']);
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const number = value => {
    if (typeof value !== 'string' && typeof value !== 'number') return 0;
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  };
  const box = value => Math.max(0, Math.min(4, Math.trunc(number(value))));
  const invalid = () => ({status: 'invalid', message:
    'Não foi possível recuperar os flashcards da sessão anterior. Os registros antigos foram preservados.'});

  function legacyPrefixes(storage) {
    let accountId = null;
    const accountRaw = storage.getItem(ACCOUNT_SESSION);
    if (accountRaw != null) {
      try {
        const candidate = JSON.parse(accountRaw)?.user?.id;
        if (typeof candidate === 'string' && UUID.test(candidate)) accountId = candidate;
      } catch (_) { /* Sem identificação válida, apenas dados públicos locais. */ }
    }
    return accountId ? ['pmdf:account:' + accountId + ':'] : ['pmdf:visitor:', ''];
  }

  // O catálogo fornece os IDs explicitamente. Não percorre contas, não depende
  // da última sessão e deixa a prioridade das avaliações novas para o chamador.
  function readSchedules(storage, ids) {
    const schedule = Object.create(null);
    if (!Array.isArray(ids) || !ids.length) return {status: 'none', schedule};
    try {
      const prefixes = legacyPrefixes(storage);
      for (const id of new Set(ids)) {
        if (typeof id !== 'string' || !/^[A-Za-z0-9:_-]{1,160}$/u.test(id)) continue;
        for (const prefix of prefixes) {
          const fc = storage.getItem(prefix + 'fc:' + id);
          const leitner = storage.getItem(prefix + 'leitner:' + id);
          const due = storage.getItem(prefix + 'leitnerDue:' + id);
          if (fc == null && leitner == null && due == null) continue;
          schedule[id] = {box: Math.max(box(fc), box(leitner)), due: Math.max(0, number(due))};
          // Um registro visitor, mesmo inválido, não incorpora dados sem prefixo.
          break;
        }
      }
      return {status: Object.keys(schedule).length ? 'recovered' : 'none', schedule};
    } catch (_) {
      return {status: 'unavailable', schedule, message:
        'Não foi possível ler todos os agendamentos anteriores neste navegador. Os registros antigos foram preservados.'};
    }
  }

  function recover(storage, validateCards) {
    try {
      // Até um registro vazio ou inválido pertence à versão nova. A migração
      // nunca o substitui nem tenta recuperar outra conta como alternativa.
      if (storage.getItem(KEY) != null) return {status: 'existing'};

      const prefixes = legacyPrefixes(storage);
      let prefix, raw = null;
      for (const candidate of prefixes) {
        raw = storage.getItem(candidate + LEGACY_SESSION);
        if (raw != null) { prefix = candidate; break; }
      }
      if (raw == null) return {status: 'none'};

      let old, cards;
      try {
        const saved = JSON.parse(raw);
        if (!record(saved) || saved.version !== 4) return invalid();
        if (saved.anki == null) return {status: 'none'};
        old = saved.anki;
        if (!record(old) || !Array.isArray(old.cards)) return invalid();
        if (!old.cards.length) return {status: 'none'};
        cards = validateCards(old.cards);
      } catch (_) { return invalid(); }

      const schedule = Object.create(null), ratings = Object.create(null);
      for (const card of cards) {
        // O namespace escolhido vale também para as notas e os vencimentos.
        schedule[card.id] = {
          box: Math.max(box(storage.getItem(prefix + 'fc:' + card.id)),
            box(storage.getItem(prefix + 'leitner:' + card.id))),
          due: Math.max(0, number(storage.getItem(prefix + 'leitnerDue:' + card.id)))
        };
      }
      if (record(old.ratings)) {
        for (const [index, value] of Object.entries(old.ratings)) {
          if (/^(0|[1-9]\d*)$/.test(index) && Number.isSafeInteger(Number(index)) &&
            Number(index) < cards.length && RATINGS.has(value)) ratings[index] = value;
        }
      }
      const laws = [...new Set(cards.map(card => card.law?.trim()).filter(Boolean))];
      const title = laws.length === 1 ? laws[0].slice(0, 180) : 'Flashcards da sessão anterior';
      return {
        status: 'recovered',
        message: cards.length + ' cartões da sessão anterior recuperados. O sistema antigo salvava apenas os cartões daquela sessão.',
        state: {version: 1, title, cards, report: null, schedule, cursor: 0,
          session: {ids: cards.map(card => card.id),
            index: Math.max(0, Math.min(cards.length, Math.trunc(number(old.index)))),
            back: old.back === true, ratings}}
      };
    } catch (_) {
      return {status: 'unavailable', message:
        'Não foi possível acessar os dados da sessão anterior neste navegador. Os registros antigos não foram alterados.'};
    }
  }

  root.PMDFFlashcardMigration = Object.freeze({recover, readSchedules, version: '20261125-catalog-schedules'});
})(typeof window === 'undefined' ? globalThis : window);
