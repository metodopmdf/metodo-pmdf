/* Acervo ANKI publicado originalmente pelo Método PMDF.
 * O arquivo de dados mantém conteúdo, ordem e IDs; este módulo apenas carrega,
 * filtra e adapta os cartões à revisão local. Não gera conteúdo nem altera DOM.
 */
(function (root) {
  'use strict';
  const ASSET = 'assets/bancos/amostra-anki.json?v=amostra-v1';
  const FLAG_MESSAGES = Object.freeze({
    verificar_vigencia_juridica: 'Texto com dispositivo, prazo ou referência jurídica: confira a norma ou jurisprudência vigente.',
    imagem_do_original_nao_embutida: 'Imagem referenciada no Anki original não foi incluída na versão textual.',
    texto_incompleto_na_fonte: 'Trecho incompleto no Anki original: confira o enunciado ou comentário.',
    verso_extenso: 'O comentário original deste cartão é extenso.'
  });
  const text = (value, limit, required = true) => typeof value === 'string' &&
    value.length <= limit && (!required || Boolean(value.trim()));
  const unique = values => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  let memory = null, opening = null;

  function validateRows(cards, allowEmpty = false) {
    if (!Array.isArray(cards) || (!cards.length && !allowEmpty) || cards.length > 30000)
      throw new Error('Quantidade de flashcards inválida no acervo ANKI.');
    const seen = new Set();
    for (const card of cards) {
      if (!card || typeof card !== 'object' || Array.isArray(card) ||
        !text(card.id, 160) || !/^cfo-gst-\d{8,}$/.test(card.id) || seen.has(card.id) ||
        !text(card.front, 6000) || !text(card.back, 6000) ||
        !text(card.disciplina, 500) || !text(card.assunto, 500) ||
        !['CERTO', 'ERRADO'].includes(card.answer) || !text(card.tags, 20000, false) ||
        !text(card.origin, 200) || !text(card.reviewed_source, 4000, false) ||
        !Array.isArray(card.flags) || card.flags.length > 30 ||
        card.flags.some(flag => !text(flag, 200)))
        throw new Error('O banco ANKI contém cartão inválido ou duplicado.');
      seen.add(card.id);
    }
    return cards;
  }
  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) || data.format !== 'PMDF-ANKI-IMPORT-v1')
      throw new Error('Formato do acervo ANKI integrado inválido.');
    validateRows(data.cards);
    return data;
  }
  function load() {
    if (memory) return Promise.resolve(memory);
    if (opening) return opening;
    opening = Promise.resolve().then(async () => {
      const base = root.document?.baseURI || root.location?.href;
      const url = new URL(ASSET, base);
      const page = root.location?.href || base;
      if (!page || new URL(page).origin !== url.origin)
        throw new Error('O acervo ANKI deve ser carregado do próprio site.');
      const response = await root.fetch(url.toString(), {cache: 'default'});
      if (!response.ok)
        throw new Error('Não foi possível obter o acervo publicado (HTTP ' + response.status + ').');
      memory = validate(await response.json());
      return memory;
    }).finally(() => { opening = null; });
    return opening;
  }
  function disciplines(data) {
    return unique(validate(data).cards.map(card => card.disciplina));
  }
  function topics(data, discipline = '') {
    return unique(validate(data).cards.filter(card => !discipline || card.disciplina === discipline)
      .map(card => card.assunto));
  }
  function filtered(data, {discipline = '', topic = ''} = {}) {
    return validate(data).cards.filter(card => (!discipline || card.disciplina === discipline) &&
      (!topic || card.assunto === topic));
  }
  function toCards(rows) {
    return validateRows(rows, true).map(card => {
      const warning = [];
      // Mantém os avisos do fluxo original e a fonte das duas correções já
      // documentadas na base, sem reescrever a frente ou o comentário do cartão.
      for (const flag of ['verificar_vigencia_juridica', 'imagem_do_original_nao_embutida']) {
        if (card.flags.includes(flag)) warning.push(FLAG_MESSAGES[flag]);
      }
      if (card.reviewed_source) warning.push('Correção conferida com fonte: ' + card.reviewed_source);
      if (card.flags.includes('texto_incompleto_na_fonte')) warning.push(FLAG_MESSAGES.texto_incompleto_na_fonte);
      for (const flag of card.flags) {
        if (!['verificar_vigencia_juridica', 'imagem_do_original_nao_embutida', 'texto_incompleto_na_fonte'].includes(flag))
          warning.push(Object.hasOwn(FLAG_MESSAGES, flag) ? FLAG_MESSAGES[flag] : 'Observação do acervo: ' + flag);
      }
      const source = 'Banco ANKI integrado · ' + card.disciplina + ' / ' + card.assunto;
      return {
        id: card.id, front: card.front, back: card.back,
        answer: card.answer, editorialFlags: card.flags.slice(),
        reviewed_source: card.reviewed_source, origin: card.origin,
        law: card.disciplina, article: card.assunto, reference: card.assunto,
        kind: 'Certo / Errado comentado', modality: 'Acervo ANKI', family: 'question',
        tags: card.tags || 'ANKI',
        scope: 'Acervo ANKI integrado; revisão normativa individual não garantida',
        source, extra: [source, 'Gabarito do acervo: ' + card.answer,
          card.reviewed_source ? 'Fonte da correção documentada: ' + card.reviewed_source : ''].filter(Boolean).join('\n'),
        warning: warning.join(' ')
      };
    });
  }
  root.PMDFAnkiCatalog = Object.freeze({load, validate, disciplines, topics, filtered, toCards,
    version: '20261125-anki-conteudo-v4'});
})(typeof window === 'undefined' ? globalThis : window);
