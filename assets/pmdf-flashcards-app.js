/* Método PMDF — controlador exclusivo de criação, revisão e exportação.
 * A inicialização depende de acesso confirmado; o progresso é isolado por conta.
 * O agendamento mantém as caixas Leitner originais.
 */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const ACCESS = window.PMDFAccess;
  if (!ACCESS) return;
  await ACCESS.ready();
  if (!ACCESS.isActive()) return;
  let accessLocked = false;
  const permitted = () => !accessLocked && ACCESS.isActive();
  const IO = window.PMDFFlashcardIO;
  const ENGINE = window.PMDFNeuralFlashcards;
  const CATALOG = window.PMDFAnkiCatalog;
  if (!IO || !ENGINE) {
    $('generation-status').textContent = 'Não foi possível carregar o criador. Atualize a página ou confira os arquivos da aplicação.';
    $('generation-status').dataset.error = 'true';
    $('generate-cards').disabled = true;
    return;
  }
  const esc = IO.escapeHtml;
  const KEY = ACCESS.storageKey('flashcards:standalone:v1');
  const DRAFT_KEY = KEY + ':draft';
  const SOURCE_KEY = KEY + ':source';
  const CATALOG_KEY = ACCESS.storageKey('flashcards:anki:v1');
  const RATINGS = {again: 'Errei', hard: 'Difícil', good: 'Bom', easy: 'Fácil'};
  const DAYS = [0, 1, 3, 7, 14];
  const intervalLabel = days => days + (days === 1 ? ' dia' : ' dias');
  const EXAMPLE = 'Art. 1º A comissão de estudos é uma equipe responsável pela organização das atividades de aprendizagem.\n\n' +
    'Art. 2º O coordenador deverá publicar o calendário em 15 dias, salvo impedimento devidamente justificado.\n\n' +
    'Art. 3º A revisão ativa consiste em recuperar uma informação antes de consultar a resposta.\n\n' +
    'Art. 4º É vedado alterar os registros durante o procedimento quando o regulamento estabelecer preservação expressa.';
  let bank = [], deckTitle = '', report = null, session = null;
  let schedule = Object.create(null), cursor = 0, importedGuide = null;
  let operation = 0, busy = false, storageFailed = false, draftTimer, toastTimer;
  let catalogData = null, catalogOpening = false, activeCatalog = false, deckRevision = 0;
  let catalogFilters = {discipline: '', topic: ''}, catalogCursors = Object.create(null);

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function writeStorage(key, value) {
    if (!permitted()) return false;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) {
      storageFailed = true;
      $('storage-status').dataset.error = 'true';
      $('storage-status').textContent = 'O navegador não conseguiu salvar estes dados. Baixe um backup JSON dos cartões antes de fechar a página.';
      return false;
    }
  }
  function persistDeck() {
    if (!bank.length) return;
    const review = session ? {ids: session.cards.map(c => c.id), index: session.index, back: session.back, ratings: session.ratings} : null;
    // O catálogo privado é carregado do servidor; somente progresso e seleção ficam
    // no navegador. O baralho pessoal continua na sua chave própria.
    const saved = activeCatalog ? writeStorage(CATALOG_KEY, {version: 1, revision: catalogData?.revision,
      filters: catalogFilters, schedule, cursors: catalogCursors, session: review,
      mode: $('anki-mode').value, batchSize: $('anki-batch-size').value}) :
      writeStorage(KEY, {version: 1, title: deckTitle, cards: bank, report, schedule, cursor, session: review});
    if (saved && !storageFailed) {
      $('storage-status').dataset.error = 'false';
      $('storage-status').textContent = activeCatalog ? 'Seleção e progresso da base Anki salvos neste navegador.' :
        'Baralho e progresso salvos neste navegador.';
    }
    return saved;
  }
  function persistDraft() {
    if (!permitted()) return;
    clearTimeout(draftTimer);
    writeStorage(DRAFT_KEY, {title: $('source-title').value, text: $('source-text').value,
      style: $('anki-card-style').value, guide: importedGuide});
  }
  function updateSourceCount() {
    $('source-count').textContent = $('source-text').value.length.toLocaleString('pt-BR') + ' caracteres';
  }
  function status(message, error = false) {
    $('generation-status').textContent = message;
    $('generation-status').dataset.error = String(error);
  }
  function toast(message, error = false) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    $('toast').dataset.error = String(error);
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 6500);
  }
  function setBusy(value) {
    busy = value;
    for (const id of ['generate-cards', 'source-file', 'source-title', 'source-text', 'anki-card-style', 'load-example']) $(id).disabled = value;
    $('stop-generation').hidden = !value;
    $('create-form').setAttribute('aria-busy', String(value));
    updateCatalogControls();
  }
  function cancelOperation() {
    if (!busy) return;
    operation++;
    setBusy(false);
    status('Operação cancelada. O baralho anterior foi preservado.');
    $('generate-cards').focus();
  }
  function renderDeck() {
    $('deck-count').textContent = String(bank.length);
    $('deck-title').textContent = deckTitle || 'Preparando a base Anki.';
    const cloze = bank.filter(c => c.cloze).length;
    $('deck-breakdown').textContent = bank.length ?
      (bank.length - cloze) + ' perguntas e respostas · ' + cloze + ' lacunas.' :
      'Escolha uma disciplina e um assunto na base Anki.';
    if (activeCatalog && bank.length) $('deck-breakdown').textContent = bank.length.toLocaleString('pt-BR') + ' cartões originais na seleção atual.';
    $('start-review').disabled = !bank.length;
    $('export-cards').disabled = !bank.length;
    $('coverage-details').hidden = !report;
    if (report) {
      $('coverage-report').textContent = Number(report.coveredTopics || 0) + ' de ' +
        Number(report.sourceRows || 0) + ' trechos com cartões · ' + Number(report.sourceUnits || 0) +
        ' unidades analisadas. Trechos sem padrões reconhecidos podem ficar sem cartões.';
    }
    if (bank.length && !bank.some(c => !c.cloze)) $('export-format').value = 'cloze';
    else if (bank.length && $('export-format').value === 'cloze' && !cloze) $('export-format').value = 'basic';
    if ($('restore-custom')) $('restore-custom').disabled = busy || readStorage(KEY) == null;
    updateCatalogControls();
  }
  function acceptDeck(cards, title, coverage) {
    bank = IO.validateCards(cards);
    activeCatalog = false;
    deckRevision++;
    chooseSource('custom');
    deckTitle = title || 'Material personalizado';
    report = coverage || null;
    cursor = 0;
    session = null;
    $('review-section').hidden = true;
    $('anki-panel').replaceChildren();
    $('review-status').textContent = 'Baralho pronto. Inicie uma sessão para revisar seus cartões.';
    renderDeck();
    persistDeck();
    if ($('restore-custom')) $('restore-custom').disabled = false;
  }

  function chooseSource(source) {
    try { localStorage.setItem(SOURCE_KEY, source); } catch (_) { /* Escolha válida nesta sessão. */ }
  }
  function catalogStatus(message, error = false) {
    const element = $('anki-catalog-status');
    if (element) { element.textContent = message; element.dataset.error = String(error); }
  }
  function updateCatalogControls() {
    if (!CATALOG) return;
    for (const id of ['anki-cfo-disciplina', 'anki-cfo-assunto', 'reset-anki-filters']) {
      if ($(id)) $(id).disabled = busy || !catalogData;
    }
    const button = $('use-anki-catalog');
    if (button) {
      button.hidden = activeCatalog && Boolean(catalogData);
      button.disabled = busy || catalogOpening;
      button.textContent = catalogData ? 'Usar base Anki' : catalogOpening ? 'Carregando…' : 'Tentar novamente';
    }
  }
  function fillCatalogSelect(element, values, label, selected = '') {
    element.replaceChildren(new Option(label, ''));
    for (const value of values) element.append(new Option(value, value));
    element.value = values.includes(selected) ? selected : '';
  }
  function refreshCatalogTopics(selected = '') {
    fillCatalogSelect($('anki-cfo-assunto'), CATALOG.topics(catalogData, $('anki-cfo-disciplina').value), 'Todos os assuntos', selected);
  }
  function currentCatalogFilters() {
    return {discipline: $('anki-cfo-disciplina').value, topic: $('anki-cfo-assunto').value};
  }
  function catalogCursorKey() { return JSON.stringify([catalogFilters.discipline, catalogFilters.topic]); }
  function reviewFromIds(saved, cards) {
    if (!Array.isArray(saved?.ids) || saved.ids.length > cards.length) return null;
    const byId = new Map(cards.map(card => [card.id, card]));
    if (new Set(saved.ids).size !== saved.ids.length || saved.ids.some(id => !byId.has(id))) return null;
    const ratings = Object.create(null);
    for (const [index, value] of Object.entries(saved.ratings || {})) {
      if (/^(0|[1-9]\d*)$/.test(index) && Number(index) < saved.ids.length && Object.hasOwn(RATINGS, value)) ratings[index] = value;
    }
    return {cards: saved.ids.map(id => byId.get(id)),
      index: Math.max(0, Math.min(saved.ids.length, Math.trunc(Number(saved.index) || 0))),
      back: saved.back === true, ratings};
  }
  function activateCatalog(savedReview = null, persist = true) {
    if (!catalogData || busy) return;
    catalogFilters = currentCatalogFilters();
    const rows = CATALOG.filtered(catalogData, catalogFilters);
    bank = rows.length ? IO.validateCards(CATALOG.toCards(rows)) : [];
    activeCatalog = true;
    deckRevision++;
    deckTitle = [catalogFilters.discipline, catalogFilters.topic].filter(Boolean).join(' · ') || 'Base Anki completa';
    report = null;
    session = reviewFromIds(savedReview, bank);
    $('review-section').hidden = !session;
    if (session) drawReview(); else $('anki-panel').replaceChildren();
    $('catalog-selection').textContent = bank.length.toLocaleString('pt-BR') + ' cartões nesta seleção.';
    $('review-status').textContent = session ? 'Sua sessão da base Anki foi recuperada.' : 'Escolha o tipo e o tamanho da sessão e clique em Iniciar revisão.';
    renderDeck();
    catalogStatus('Base Anki pronta para estudar. Escolha uma disciplina e um assunto ou revise o acervo completo.');
    if (persist) { chooseSource('catalog'); persistDeck(); }
  }
  async function initializeCatalog(force = false) {
    if (!CATALOG || catalogOpening || !permitted()) return;
    const initialRevision = deckRevision;
    catalogOpening = true;
    catalogStatus('Carregando a base de flashcards…');
    updateCatalogControls();
    try {
      const loadedCatalog = await CATALOG.load();
      if (!permitted()) return;
      catalogData = loadedCatalog;
      const ids = new Set(catalogData.cards.map(card => card.id));
      let saved = null;
      try {
        const value = JSON.parse(readStorage(CATALOG_KEY) || 'null');
        if (value?.version === 1) saved = value;
      } catch (_) { /* Um novo estudo continua possível; dados antigos não são apagados. */ }
      if (saved?.schedule && typeof saved.schedule === 'object') {
        const preserveCurrent = readStorage(SOURCE_KEY) === 'custom' || deckRevision !== initialRevision;
        for (const [id, item] of Object.entries(saved.schedule)) {
          if (preserveCurrent && Object.hasOwn(schedule, id)) continue;
          if (ids.has(id) && item && Number.isFinite(item.box) && Number.isFinite(item.due))
            schedule[id] = {box: Math.max(0, Math.min(4, Math.trunc(item.box))), due: Math.max(0, item.due)};
        }
      }
      if (saved?.cursors && typeof saved.cursors === 'object') {
        for (const [key, value] of Object.entries(saved.cursors)) {
          if (key.length <= 1000 && Number.isSafeInteger(value) && value >= 0 && value <= ids.size) catalogCursors[key] = value;
        }
      }
      fillCatalogSelect($('anki-cfo-disciplina'), CATALOG.disciplines(catalogData), 'Todas as disciplinas', saved?.filters?.discipline);
      refreshCatalogTopics(saved?.filters?.topic);
      $('catalog-total').textContent = catalogData.cards.length.toLocaleString('pt-BR');
      $('catalog-disciplines').textContent = String(CATALOG.disciplines(catalogData).length);
      $('catalog-topics').textContent = String(new Set(catalogData.cards.map(card => JSON.stringify([card.disciplina, card.assunto]))).size);
      $('catalog-review-note').textContent = catalogData.review_status || '';
      $('catalog-selection').textContent = CATALOG.filtered(catalogData, currentCatalogFilters()).length.toLocaleString('pt-BR') + ' cartões nesta seleção.';
      if (deckRevision === initialRevision && !busy && (force || readStorage(SOURCE_KEY) !== 'custom')) {
        const prior = session && session.cards.every(card => ids.has(card.id)) ?
          {ids: session.cards.map(card => card.id), index: session.index, back: session.back, ratings: session.ratings} : null;
        if (['due', 'all'].includes(saved?.mode)) $('anki-mode').value = saved.mode;
        if (['25', '50', '100', '200', 'all'].includes(saved?.batchSize)) $('anki-batch-size').value = saved.batchSize;
        activateCatalog(saved?.session || prior, force);
      } else catalogStatus('Base Anki disponível. Use os filtros para voltar aos cartões do acervo.');
    } catch (error) {
      catalogData = null;
      catalogStatus('Não foi possível carregar a base Anki. Confira a conexão e tente novamente. ' + (error.message || ''), true);
    } finally { catalogOpening = false; updateCatalogControls(); }
  }
  function restorePersonalDeck() {
    if (!permitted()) return;
    if (busy) return;
    try {
      const saved = JSON.parse(readStorage(KEY) || 'null');
      if (saved?.version !== 1) throw new Error('Não há baralho pessoal salvo neste navegador.');
      IO.validateCards(saved.cards);
      activeCatalog = false; bank = []; session = null; report = null; cursor = 0;
      $('review-section').hidden = true;
      $('anki-panel').replaceChildren();
      deckRevision++;
      restore();
      chooseSource('custom');
      persistDeck();
      renderDeck();
    } catch (error) { toast(error.message || 'Não foi possível recuperar o baralho pessoal.', true); }
  }
  async function generate(event) {
    if (!permitted()) { event?.preventDefault(); return; }
    event?.preventDefault();
    if (busy) return;
    const token = ++operation;
    setBusy(true);
    status('Analisando o material e preparando os flashcards…');
    try {
      persistDraft();
      // Permite que o estado visual seja apresentado antes do trabalho local.
      await new Promise(resolve => setTimeout(resolve, 0));
      if (token !== operation) return;
      const title = $('source-title').value.trim() || importedGuide?.lawName || 'Material personalizado';
      const guide = importedGuide ? {...importedGuide, lawName: title} : IO.parseText($('source-text').value, title);
      const result = await ENGINE.buildAsync(guide, {style: $('anki-card-style').value, level: 'intermediario',
        cancelled: () => token !== operation,
        onProgress: (done, total, count) => {
          if (token === operation) status(done + '/' + total + ' trechos analisados · ' + count + ' cartões elaborados.');
        }});
      if (token !== operation || result.cancelled) return;
      if (!result.cards?.length) throw new Error('Nenhum cartão verificável foi encontrado neste formato. Use frases completas com definições, prazos ou regras, ou tente o formato Misto. O baralho anterior foi preservado.');
      acceptDeck(result.cards, title, result.report);
      status(bank.length + ' flashcards criados. Seu baralho está pronto para revisão e exportação.');
      toast(bank.length + ' flashcards criados.');
    } catch (error) {
      if (token === operation) status(error.message || 'Não foi possível criar os cartões. Confira o material.', true);
    } finally {
      if (token === operation) setBusy(false);
    }
  }
  async function importFile() {
    if (!permitted()) return;
    const file = $('source-file').files?.[0];
    if (!file || busy) return;
    // Mantém o File em memória e permite escolher o mesmo arquivo após cancelar.
    $('source-file').value = '';
    const token = ++operation;
    setBusy(true);
    status('Lendo ' + file.name + '…');
    try {
      const result = await IO.readFile(file, {onProgress: message => { if (token === operation) status(message); }});
      if (token !== operation) return;
      if (result.cards) {
        acceptDeck(result.cards, result.title || file.name, null);
        status(bank.length + ' cartões importados. Você pode revisar ou exportar o baralho.');
      } else {
        importedGuide = result.guide || null;
        $('source-title').value = result.title || result.guide?.lawName || file.name;
        $('source-text').value = result.text || result.guide?.sourceText || '';
        if (!$('source-text').value && importedGuide) {
          $('source-text').value = Object.values(importedGuide.articlesMapping).flat()
            .map(row => (row.article || row.title || '') + '\n' + (row.sourceText || row.plainExplanation || '')).join('\n\n');
        }
        updateSourceCount();
        persistDraft();
        status('Material importado. Confira o texto e clique em Criar flashcards.');
      }
    } catch (error) {
      if (token === operation) status(error.message || 'Não foi possível importar o arquivo.', true);
    } finally {
      if (token === operation) { setBusy(false); $('source-file').value = ''; }
    }
  }
  function getCardBox(id) {
    let saved = Object.hasOwn(schedule, id) ? schedule[id] : null;
    if (!saved) {
      // Lê somente os registros compatíveis do aplicativo original, se presentes.
      const legacy = Math.max(Number(readStorage('fc:' + id)) || 0, Number(readStorage('leitner:' + id)) || 0);
      saved = {box: legacy, due: Number(readStorage('leitnerDue:' + id)) || 0};
    }
    return {box: Math.max(0, Math.min(4, Math.trunc(Number(saved.box) || 0))),
      due: Number.isFinite(Number(saved.due)) ? Math.max(0, Number(saved.due)) : 0};
  }
  function startReview() {
    if (!permitted()) return;
    if (!bank.length) return;
    const mode = $('anki-mode').value;
    let eligible = bank.slice();
    if (mode === 'due') {
      eligible = eligible.filter(c => !getCardBox(c.id).due || getCardBox(c.id).due <= Date.now());
      eligible.sort((a, b) => getCardBox(a.id).due - getCardBox(b.id).due);
    }
    const requested = $('anki-batch-size').value;
    const limit = requested === 'all' ? eligible.length : Number(requested) || 50;
    let cards;
    if (mode === 'all') {
      let position = activeCatalog ? catalogCursors[catalogCursorKey()] || 0 : cursor;
      if (position >= eligible.length || requested === 'all') position = 0;
      cards = eligible.slice(position, position + limit);
      if (activeCatalog) catalogCursors[catalogCursorKey()] = position + cards.length;
      else cursor = position + cards.length;
    } else cards = eligible.slice(0, limit);
    session = {cards, index: 0, back: false, ratings: Object.create(null)};
    $('review-status').textContent = cards.length + ' cartões nesta sessão · ' + eligible.length + ' disponíveis nesta seleção.';
    $('review-section').hidden = false;
    drawReview();
    persistDeck();
    chooseSource(activeCatalog ? 'catalog' : 'custom');
    $('review-heading').focus({preventScroll: true});
    $('review-section').scrollIntoView({behavior: 'auto', block: 'start'});
  }
  function renderStatement(card, revealed) {
    if (!card.cloze) return esc(revealed ? card.back : card.front);
    const raw = String(card.cloze), pivot = raw.indexOf(' · ');
    const source = pivot >= 0 ? raw.slice(pivot + 3) : raw;
    const expression = /\{\{c\d+::([\s\S]*?)(?:::[^}]*)?\}\}/g;
    let output = '', previous = 0, count = 0, match;
    while ((match = expression.exec(source))) {
      output += esc(source.slice(previous, match.index));
      output += revealed ? '<mark class="anki-blank-revealed">' + esc(match[1]) + '</mark>' :
        '<mark class="anki-blank-masked" aria-label="Lacuna ' + (++count) + '">[recordar]</mark>';
      previous = match.index + match[0].length;
    }
    return output ? output + esc(source.slice(previous)) : esc(revealed ? card.back : card.front);
  }
  function renderCatalogCard(card, revealed) {
    const lines = card.front.split(/\r?\n/);
    const marker = lines.findIndex(line => /^JULGUE\s+CERTO\s+OU\s+ERRADO\s*$/i.test(line.trim()));
    const title = marker > 0 ? lines.slice(0, marker).join(' ').trim() : 'Revisão do assunto';
    const statement = marker >= 0 ? lines.slice(marker + 1).join('\n').trim() : card.front;
    const warning = card.editorialFlags?.includes('texto_incompleto_na_fonte') ?
      '<p class="anki-imported-warning" role="note">Trecho incompleto no material original. Confira a fonte antes de estudar.</p>' : '';
    if (!revealed) return '<section class="anki-imported-editorial"><h3 class="anki-imported-title">' + esc(title) +
      '</h3><span class="anki-imported-command">JULGUE CERTO OU ERRADO</span><p class="anki-imported-statement">' +
      esc(statement) + '</p>' + warning + '</section>';
    const prefix = /^(?:✅\s*CERTO|❌\s*ERRADO|CERTO|ERRADO)\s*(?:[—–:\-]\s*)?/u.exec(card.back);
    const verdict = card.answer || (prefix ? (/ERRADO/.test(prefix[0]) ? 'ERRADO' : 'CERTO') : 'GABARITO');
    const tone = verdict === 'CERTO' ? 'right' : verdict === 'ERRADO' ? 'wrong' : 'neutral';
    return '<section class="anki-imported-editorial"><h3 class="anki-imported-title">' + esc(title) + '</h3>' +
      '<div class="anki-imported-verdict" data-verdict="' + tone + '"><strong>' + esc(verdict) +
      '</strong><span>Gabarito do acervo</span></div><div class="anki-imported-commentary"><h4>Comentário e fundamentação</h4><p>' +
      esc(prefix ? card.back.slice(prefix[0].length).trim() : card.back) + '</p></div>' +
      '<details class="anki-imported-recap"><summary>Rever a assertiva</summary><p>' + esc(statement) + '</p></details>' + warning + '</section>';
  }
  function drawReview() {
    if (!session) return;
    const panel = $('anki-panel'), s = session;
    if (!s.cards.length) {
      panel.innerHTML = '<div class="anki-finish"><h3>Você está em dia</h3><p>Nenhum cartão está vencido nesta seleção. Escolha Todos (treino livre) para continuar revisando.</p></div>';
      return;
    }
    if (s.index >= s.cards.length) {
      const ratings = Object.values(s.ratings);
      const wrong = ratings.filter(value => value === 'again').length;
      panel.innerHTML = '<div class="anki-finish"><h3>Sessão percorrida</h3><p>Você avaliou ' + ratings.length +
        ' cartões: ' + (ratings.length - wrong) + ' lembrados e ' + wrong + ' para reforçar.</p><p>' +
        (s.cards.length - ratings.length) + ' cartões pulados, sem alteração de avaliação.</p>' +
        '<button type="button" id="anki-nav-prev" data-action="previous" class="button">← Rever último cartão</button> ' +
        '<button type="button" data-action="restart" class="button primary">Nova revisão</button></div>';
      return;
    }
    const card = s.cards[s.index], state = getCardBox(card.id);
    const isImported = card.id.startsWith('cfo-gst-');
    const evaluated = Object.hasOwn(s.ratings, s.index);
    const law = esc(card.law || deckTitle), article = esc(card.reference || card.article || 'Material fornecido');
    const kind = esc(card.kind || (card.cloze ? 'Lacuna contextual' : 'Pergunta de revisão'));
    const proof = s.back ? '<div class="anki-proof"><b>' + (isImported ? 'Origem e observações' : 'Fundamento do cartão') + '</b><p class="anki-source-note">' + law + ' · ' + article + '</p>' +
      (card.tip ? '<div class="anki-learn-aid"><strong>Dica de estudo</strong><p>' + esc(card.tip) + '</p></div>' : '') +
      (card.pitfall ? '<div class="anki-learn-aid anki-exam-trap"><strong>Ponto de atenção</strong><p>' + esc(card.pitfall) + '</p></div>' : '') +
      (card.application ? '<div class="anki-learn-aid"><strong>Aplicação</strong><p>' + esc(card.application) + '</p></div>' : '') +
      '<details class="anki-evidence-details"><summary>Consultar texto-base e referência</summary><p class="anki-evidence-text">' +
      esc(card.extra || card.source || card.back) + '</p>' +
      (card.warning ? '<p class="anki-source-note">' + esc(card.warning) + '</p>' : '') + '</details></div>' :
      '<p class="anki-hint">Tente responder antes de revelar o verso do cartão.</p>';
    const controls = !s.back ? '<button type="button" id="reveal-answer" data-action="reveal" class="qstudio-primary">Revelar resposta</button>' :
      evaluated ? '<span class="anki-reviewed-hint">Já avaliado como ' + esc(RATINGS[s.ratings[s.index]]) + '. Voltar não altera a nota.</span>' :
      '<button type="button" class="qstudio-secondary" data-rating="again">Errei<small>Rever agora</small></button>' +
      '<button type="button" class="qstudio-secondary" data-rating="hard">Difícil<small>12 horas</small></button>' +
      '<button type="button" class="qstudio-primary" data-rating="good">Bom<small>' + intervalLabel(DAYS[Math.min(4, state.box + 1)]) + '</small></button>' +
      '<button type="button" class="qstudio-primary" data-rating="easy">Fácil<small>' + intervalLabel(DAYS[Math.min(4, state.box + 2)]) + '</small></button>';
    panel.innerHTML = '<progress class="study-progress-meter" aria-label="Progresso da revisão" value="' + s.index +
      '" max="' + s.cards.length + '"></progress>' +
      '<div class="anki-visual-banner"><div class="anki-visual-banner-head"><span>✦ MÉTODO PMDF · FLASHCARDS</span><strong>' +
      (s.back ? 'RESPOSTA REVELADA' : 'RECUPERAÇÃO ATIVA') + '</strong></div>' +
      '<div class="anki-meta"><span>Cartão ' + (s.index + 1) + ' de ' + s.cards.length + '</span><span>Caixa Leitner ' +
      state.box + '</span></div><div class="anki-tags"><span>' + kind + '</span><span>' + article + '</span>' +
      (card.difficulty ? '<span>' + esc(card.difficulty) + '</span>' : '') + '</div><p class="anki-law">' + law + '</p></div>' +
      '<div class="anki-visual-card ' + (card.family === 'question' ? 'anki-visual-card-qa ' : '') +
      (isImported ? 'anki-visual-card-imported ' : '') +
      (s.back ? 'anki-visual-is-answer' : '') + '"><aside class="anki-visual-aside"><div class="anki-visual-illustration">' +
      '<svg viewBox="0 0 124 132" width="124" height="132" fill="none" aria-hidden="true"><rect x="33" y="12" width="65" height="90" rx="9" fill="#e5eee7" transform="rotate(10 65 57)"/><rect x="18" y="25" width="65" height="90" rx="9" fill="#fff" stroke="#244b67" stroke-width="2"/><path d="M33 53h36M33 65h25M33 77h31" stroke="#16655d" stroke-width="3" stroke-linecap="round"/><path d="m57 94 5 5 11-14" stroke="#be984b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div><span class="anki-visual-art-caption">' + kind + '</span><span class="anki-visual-art-subtitle">' + article + '</span></aside>' +
      '<div class="anki-visual-body-wrap"><div class="anki-study-surface"><p class="anki-kicker">' +
      (s.back ? 'VERSO · RESPOSTA' : 'FRENTE · RECUPERAÇÃO ATIVA') + '</p>' +
      '<div class="anki-question ' + (card.cloze ? 'anki-question-cloze' : '') + '">' +
      (isImported ? renderCatalogCard(card, s.back) : s.back ? '<strong class="anki-short-answer">' + esc(card.back) + '</strong>' : renderStatement(card, false)) + '</div>' +
      (s.back && card.cloze ? '<p class="anki-restored">' + renderStatement(card, true) + '</p>' : '') +
      (!s.back && card.hint ? '<p class="anki-card-hint">Pista: ' + esc(card.hint) + '</p>' : '') + '</div>' + proof + '</div></div>' +
      '<div class="anki-study-controls"><div class="anki-actions ' + (s.back && !evaluated ? 'anki-grade-choices' : '') + '">' +
      controls + '</div><div class="anki-nav-pair"><button type="button" id="anki-nav-prev" data-action="previous" class="qstudio-secondary" ' +
      (s.index === 0 ? 'disabled' : '') + '>← Anterior</button><button type="button" id="anki-nav-next" data-action="next" class="qstudio-secondary">Próximo →</button></div></div>';
  }
  function focusReview() {
    const target = $('reveal-answer') || $('anki-panel').querySelector('[data-rating="good"]') || $('anki-nav-next') || $('anki-nav-prev');
    target?.focus({preventScroll: true});
  }
  function reveal() {
    if (!permitted()) return;
    if (!session || session.back || session.index >= session.cards.length) return;
    session.back = true;
    drawReview(); persistDeck(); focusReview();
  }
  function move(step) {
    if (!permitted()) return;
    if (!session) return;
    const next = session.index + step;
    if (next < 0 || next > session.cards.length) return;
    session.index = next;
    session.back = Object.hasOwn(session.ratings, next);
    drawReview(); persistDeck(); focusReview();
  }
  function grade(rating) {
    if (!permitted()) return;
    if (!session || !session.back || session.index >= session.cards.length ||
      !Object.hasOwn(RATINGS, rating) || Object.hasOwn(session.ratings, session.index)) return;
    const card = session.cards[session.index], current = getCardBox(card.id).box;
    const box = rating === 'again' ? 0 : rating === 'hard' ? current : Math.min(4, current + (rating === 'easy' ? 2 : 1));
    schedule[card.id] = {box, due: Date.now() + (rating === 'hard' ? 12 * 3600000 : DAYS[box] * 86400000)};
    session.ratings[session.index] = rating;
    move(1);
  }
  function exportCards() {
    if (!permitted()) return;
    try {
      const result = IO.serialize(bank, $('export-format').value, {title: deckTitle});
      const url = URL.createObjectURL(new Blob([result.content], {type: result.mime}));
      const link = document.createElement('a');
      link.href = url; link.download = result.filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast(result.count + ' cartões exportados.');
    } catch (error) { toast(error.message || 'Não foi possível exportar o baralho.', true); }
  }
  function restore() {
    try {
      const draft = JSON.parse(readStorage(DRAFT_KEY) || 'null');
      if (draft) {
        $('source-title').value = typeof draft.title === 'string' ? draft.title : '';
        $('source-text').value = typeof draft.text === 'string' ? draft.text : '';
        if (['questions', 'cloze', 'mixed'].includes(draft.style)) $('anki-card-style').value = draft.style;
        importedGuide = draft.guide?.articlesMapping ? draft.guide : null;
      }
    } catch (_) {
      status('Não foi possível recuperar o texto em edição. Cole ou importe novamente o material.');
    }
    try {
      // Restaura somente o baralho da conta; registros inválidos são preservados.
      const raw = localStorage.getItem(KEY);
      let saved = null;
      if (raw !== null) {
        saved = JSON.parse(raw);
        if (saved?.version !== 1 || !Array.isArray(saved.cards) || !saved.cards.length)
          throw new Error('Baralho salvo inválido.');
      }
      if (saved) {
        bank = IO.validateCards(saved.cards);
        deckTitle = typeof saved.title === 'string' ? saved.title : 'Meu baralho';
        report = saved.report && typeof saved.report === 'object' ? saved.report : null;
        if (saved.schedule && typeof saved.schedule === 'object') {
          for (const [id, item] of Object.entries(saved.schedule)) {
            if (!Object.hasOwn(schedule, id) && item && Number.isFinite(item.box) && Number.isFinite(item.due)) schedule[id] = item;
          }
        }
        cursor = Math.max(0, Math.min(bank.length, Math.trunc(Number(saved.cursor) || 0)));
        if (Array.isArray(saved.session?.ids)) {
          const byId = new Map(bank.map(card => [card.id, card]));
          const cards = saved.session.ids.map(id => byId.get(id)).filter(Boolean);
          const ratings = Object.create(null);
          for (const [index, value] of Object.entries(saved.session.ratings || {})) {
            if (/^\d+$/.test(index) && Number(index) < cards.length && Object.hasOwn(RATINGS, value)) ratings[index] = value;
          }
          session = {cards, index: Math.max(0, Math.min(cards.length, Math.trunc(Number(saved.session.index) || 0))),
            back: Boolean(saved.session.back), ratings};
          $('review-section').hidden = false;
          drawReview();
        }
        $('storage-status').textContent = 'Último baralho e progresso recuperados deste navegador.';
        $('review-status').textContent = session ? 'Sua última sessão foi recuperada.' : 'Baralho recuperado. Inicie uma revisão quando quiser.';
      }
    } catch (_) {
      $('storage-status').dataset.error = 'true';
      $('storage-status').textContent = 'Não foi possível recuperar o baralho salvo. Nenhum registro foi substituído. Importe um backup JSON ou crie um novo baralho.';
    }
    renderDeck(); updateSourceCount();
  }
  $('create-form').addEventListener('submit', generate);
  $('stop-generation').addEventListener('click', cancelOperation);
  $('source-file').addEventListener('change', importFile);
  $('source-text').addEventListener('input', () => {
    importedGuide = null; updateSourceCount(); clearTimeout(draftTimer); draftTimer = setTimeout(persistDraft, 500);
  });
  $('source-title').addEventListener('input', () => { clearTimeout(draftTimer); draftTimer = setTimeout(persistDraft, 500); });
  $('anki-card-style').addEventListener('change', persistDraft);
  $('load-example').addEventListener('click', () => {
    if ($('source-text').value.trim() && !window.confirm('Substituir o texto-base pelo exemplo? Seu baralho atual será mantido.')) return;
    importedGuide = null;
    $('source-title').value = 'Regulamento de exemplo (fictício)';
    $('source-text').value = EXAMPLE;
    updateSourceCount(); persistDraft();
    status('Exemplo fictício carregado. Escolha um formato e crie os flashcards.');
  });
  $('start-review').addEventListener('click', startReview);
  $('export-cards').addEventListener('click', exportCards);
  if (CATALOG) {
    $('anki-cfo-disciplina').addEventListener('change', () => {
      if (!catalogData || busy) return;
      refreshCatalogTopics();
      activateCatalog();
    });
    $('anki-cfo-assunto').addEventListener('change', () => activateCatalog());
    $('reset-anki-filters').addEventListener('click', () => {
      if (!catalogData || busy) return;
      $('anki-cfo-disciplina').value = '';
      refreshCatalogTopics();
      $('anki-mode').value = 'due';
      $('anki-batch-size').value = '50';
      activateCatalog();
    });
    $('use-anki-catalog').addEventListener('click', () => {
      if (busy) return;
      if (catalogData) activateCatalog(); else initializeCatalog(true);
    });
    $('restore-custom').addEventListener('click', restorePersonalDeck);
    for (const id of ['anki-mode', 'anki-batch-size']) $(id).addEventListener('change', () => {
      if (activeCatalog) persistDeck();
    });
  }
  $('anki-panel').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.rating) return grade(button.dataset.rating);
    const action = button.dataset.action;
    if (action === 'reveal') reveal();
    else if (action === 'previous') move(-1);
    else if (action === 'next') move(1);
    else if (action === 'restart') startReview();
  });
  document.addEventListener('keydown', event => {
    if (busy || !session || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key === ' ' && !session.back && session.index < session.cards.length &&
      !event.target.closest('button,summary,a')) { event.preventDefault(); reveal(); }
    else if (['1', '2', '3', '4'].includes(event.key) && session.back) {
      event.preventDefault(); grade(['again', 'hard', 'good', 'easy'][Number(event.key) - 1]);
    } else if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
  });
  document.addEventListener('pmdf:access-lost', () => {
    accessLocked = true;
    operation++;
    busy = false;
    clearTimeout(draftTimer);
    bank = []; session = null; catalogData = null; importedGuide = null;
    schedule = Object.create(null); catalogCursors = Object.create(null);
    activeCatalog = false; report = null; deckTitle = '';
    CATALOG?.clear();
    $('anki-panel').replaceChildren();
    $('review-section').hidden = true;
    $('deck-count').textContent = '0';
    $('deck-title').textContent = 'Entre para acessar seu acervo.';
    $('source-title').value = ''; $('source-text').value = '';
    $('source-file').value = '';
    $('start-review').disabled = true; $('export-cards').disabled = true;
    $('generate-cards').disabled = true;
  });
  window.addEventListener('pagehide', persistDraft);
  restore();
  if (CATALOG) initializeCatalog();
})();
