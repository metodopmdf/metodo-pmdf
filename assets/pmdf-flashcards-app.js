/* Método PMDF — controlador exclusivo de criação, revisão e exportação.
 * Extraído dos fluxos Anki do pmdf-app.js original. Sem rotas, contas ou serviços
 * das outras ferramentas. O agendamento mantém as caixas Leitner originais.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const IO = window.PMDFFlashcardIO;
  const ENGINE = window.PMDFNeuralFlashcards;
  if (!IO || !ENGINE) {
    $('generation-status').textContent = 'Não foi possível carregar o criador. Atualize a página ou confira os arquivos da aplicação.';
    $('generation-status').dataset.error = 'true';
    $('generate-cards').disabled = true;
    return;
  }
  const esc = IO.escapeHtml;
  const KEY = 'pmdf:flashcards:standalone:v1';
  const DRAFT_KEY = KEY + ':draft';
  const THEME_KEY = KEY + ':theme';
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

  function readStorage(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function writeStorage(key, value) {
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
    const saved = writeStorage(KEY, {version: 1, title: deckTitle, cards: bank, report, schedule, cursor,
      session: session ? {ids: session.cards.map(c => c.id), index: session.index, back: session.back, ratings: session.ratings} : null});
    if (saved && !storageFailed) {
      $('storage-status').dataset.error = 'false';
      $('storage-status').textContent = 'Baralho e progresso salvos neste navegador.';
    }
  }
  function persistDraft() {
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
    $('deck-title').textContent = deckTitle || 'Pronto para o primeiro cartão.';
    const cloze = bank.filter(c => c.cloze).length;
    $('deck-breakdown').textContent = bank.length ?
      (bank.length - cloze) + ' perguntas e respostas · ' + cloze + ' lacunas.' :
      'Crie cartões a partir do texto ou importe um backup JSON.';
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
  }
  function acceptDeck(cards, title, coverage) {
    bank = IO.validateCards(cards);
    deckTitle = title || 'Material personalizado';
    report = coverage || null;
    cursor = 0;
    session = null;
    $('review-section').hidden = true;
    $('anki-panel').replaceChildren();
    $('review-status').textContent = 'Baralho pronto. Inicie uma sessão para revisar seus cartões.';
    renderDeck();
    persistDeck();
  }
  async function generate(event) {
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
      if (cursor >= eligible.length || requested === 'all') cursor = 0;
      cards = eligible.slice(cursor, cursor + limit);
      cursor += cards.length;
    } else cards = eligible.slice(0, limit);
    session = {cards, index: 0, back: false, ratings: Object.create(null)};
    $('review-status').textContent = cards.length + ' cartões nesta sessão · ' + eligible.length + ' disponíveis nesta seleção.';
    $('review-section').hidden = false;
    drawReview();
    persistDeck();
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
    const evaluated = Object.hasOwn(s.ratings, s.index);
    const law = esc(card.law || deckTitle), article = esc(card.reference || card.article || 'Material fornecido');
    const kind = esc(card.kind || (card.cloze ? 'Lacuna contextual' : 'Pergunta de revisão'));
    const proof = s.back ? '<div class="anki-proof"><b>Fundamento do cartão</b><p class="anki-source-note">' + law + ' · ' + article + '</p>' +
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
      (s.back ? 'anki-visual-is-answer' : '') + '"><aside class="anki-visual-aside"><div class="anki-visual-illustration">' +
      '<svg viewBox="0 0 124 132" width="124" height="132" fill="none" aria-hidden="true"><rect x="33" y="12" width="65" height="90" rx="9" fill="#e5eee7" transform="rotate(10 65 57)"/><rect x="18" y="25" width="65" height="90" rx="9" fill="#fff" stroke="#244b67" stroke-width="2"/><path d="M33 53h36M33 65h25M33 77h31" stroke="#16655d" stroke-width="3" stroke-linecap="round"/><path d="m57 94 5 5 11-14" stroke="#be984b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '</div><span class="anki-visual-art-caption">' + kind + '</span><span class="anki-visual-art-subtitle">' + article + '</span></aside>' +
      '<div class="anki-visual-body-wrap"><div class="anki-study-surface"><p class="anki-kicker">' +
      (s.back ? 'VERSO · RESPOSTA' : 'FRENTE · RECUPERAÇÃO ATIVA') + '</p>' +
      '<p class="anki-question ' + (card.cloze ? 'anki-question-cloze' : '') + '">' +
      (s.back ? '<strong class="anki-short-answer">' + esc(card.back) + '</strong>' : renderStatement(card, false)) + '</p>' +
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
    if (!session || session.back || session.index >= session.cards.length) return;
    session.back = true;
    drawReview(); persistDeck(); focusReview();
  }
  function move(step) {
    if (!session) return;
    const next = session.index + step;
    if (next < 0 || next > session.cards.length) return;
    session.index = next;
    session.back = Object.hasOwn(session.ratings, next);
    drawReview(); persistDeck(); focusReview();
  }
  function grade(rating) {
    if (!session || !session.back || session.index >= session.cards.length ||
      !Object.hasOwn(RATINGS, rating) || Object.hasOwn(session.ratings, session.index)) return;
    const card = session.cards[session.index], current = getCardBox(card.id).box;
    const box = rating === 'again' ? 0 : rating === 'hard' ? current : Math.min(4, current + (rating === 'easy' ? 2 : 1));
    schedule[card.id] = {box, due: Date.now() + (rating === 'hard' ? 12 * 3600000 : DAYS[box] * 86400000)};
    session.ratings[session.index] = rating;
    move(1);
  }
  function exportCards() {
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
      const saved = JSON.parse(readStorage(KEY) || 'null');
      if (saved?.version === 1 && saved.cards?.length) {
        bank = IO.validateCards(saved.cards);
        deckTitle = typeof saved.title === 'string' ? saved.title : 'Meu baralho';
        report = saved.report && typeof saved.report === 'object' ? saved.report : null;
        if (saved.schedule && typeof saved.schedule === 'object') {
          for (const [id, item] of Object.entries(saved.schedule)) {
            if (item && Number.isFinite(item.box) && Number.isFinite(item.due)) schedule[id] = item;
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
      $('storage-status').textContent = 'Não foi possível recuperar o baralho salvo. Importe um backup JSON ou crie um novo baralho.';
    }
    renderDeck(); updateSourceCount();
  }
  function applyTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('theme-toggle').textContent = dark ? 'Tema claro' : 'Tema escuro';
    $('theme-toggle').setAttribute('aria-pressed', String(dark));
  }
  const theme = readStorage(THEME_KEY);
  applyTheme(theme ? theme === 'dark' : Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches));
  $('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme !== 'dark';
    applyTheme(dark);
    try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (_) { /* Tema da sessão. */ }
  });
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
  window.addEventListener('pagehide', persistDraft);
  restore();
})();
