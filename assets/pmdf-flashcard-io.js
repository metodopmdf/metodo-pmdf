/* Método PMDF — entrada e exportação da ferramenta independente de flashcards.
 * Extraído de parseArticles/readFileText/exportAnkiCards/exportAnkiDeck do projeto
 * original. O texto-fonte nunca é resumido nem cortado para criar um guia.
 *
 * API pública, sem dependência de elementos da interface:
 *   parseArticles(text) -> [{label, head, text}]
 *   parseText(text, title?) -> guide
 *   readFile(file, {onProgress(message)}?) -> Promise<{text,title,guide?,cards?}>
 *   readFileText(file, options?) -> Promise<string>
 *   serialize(cards, 'csv'|'tsv'|'basic'|'cloze'|'json', {title,deck}?)
 *     -> {content, mime, filename, count}
 *
 * TXT, Markdown e JSON são lidos localmente sem bibliotecas externas. PDF/DOCX
 * carregam somente leitores, sob demanda, de https://cdnjs.cloudflare.com.
 * CSP: script-src inclui esse domínio; worker-src inclui esse domínio e blob:;
 * connect-src inclui esse domínio. Nenhum arquivo é enviado a um servidor.
 */
(function (root) {
  'use strict';

  const FORMAT = 'PMDF-FLASHCARDS-v1';
  const MAX_TEXT = 2 * 1024 * 1024;
  const MAX_FILE = 12 * 1024 * 1024;
  const MAX_CARDS = 30000;
  const READERS = Object.freeze({
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    docx: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
  });
  const loading = new Map();
  const text = value => String(value == null ? '' : value);
  const clean = value => text(value).replace(/\s+/g, ' ').trim();
  const escapeHtml = value => text(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
  const filename = value => text(value || 'flashcards').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').slice(0, 100) || 'flashcards';

  function hash(value) {
    let a = 2166136261;
    for (const ch of text(value)) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
    return (a >>> 0).toString(36);
  }

  // Mantém a estratégia do parser original, mas também conserva o preâmbulo,
  // associa parágrafos ao artigo e exige identificador nos marcadores legais.
  // Assim, "O princípio da legalidade é..." não perde palavras por engano.
  const LEGAL_MARKER = /^((?:Art(?:igo)?\.?|Cl[aá]usula|S[uú]mula(?:\s+Vinculante)?|Enunciado|Inciso|Par[aá]grafo|§|Item|T[oó]pico|Al[ií]nea|Diretriz|Norma)\s*(?:n[º°o.]?\s*)?(?:\d+(?:\.\d+)*(?:[º°ª])?(?:-[A-Za-z])?|[IVXLCDM]+|[a-z]))(?=\s|[.):;–—-]|$)[.)\s]*(?:[-–—:]\s*)?/iu;
  const SINGLE_PARAGRAPH = /^(Par[aá]grafo\s+[uú]nico)(?=\s|[.:–—-]|$)[.\s]*(?:[-–—:]\s*)?/iu;
  const LIST_MARKER = /^((?:\d+(?:\.\d+)*[.)]|[IVXLCDM]+\s*[-–—)]|[a-z]\)))\s+/u;
  const SECTION = /^(?:T[ií]tulo|Livro|Cap[ií]tulo|Se[cç][aã]o)\s+(?:[IVXLCDM]+|\d+)(?=\s|[.:–—-]|$)/iu;

  function parseArticles(raw) {
    let source = text(raw).replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[\t ]+/g, ' ');
    source = source.replace(/(?<=[.;:])\s+(?=(?:Art(?:igo)?\.?\s*\d|Cl[aá]usula\s+\d|S[uú]mula\s+\d|Enunciado\s+\d|§\s*\d))/giu, '\n');
    const result = [];
    let current = null, heading = '', article = '';
    const flush = () => {
      if (current && current.text.trim()) result.push({...current, text: current.text.trim()});
      current = null;
    };
    for (const originalLine of source.split('\n')) {
      const line = originalLine.trim();
      if (!line) {
        if (current?.explicit) current.text += '\n';
        else flush();
        continue;
      }
      const markdownHeading = /^(#{1,6})\s+(.+)$/.exec(line);
      if (markdownHeading || (SECTION.test(line) && line.length < 180)) {
        flush();
        heading = markdownHeading ? markdownHeading[2].trim() : line;
        article = '';
        continue;
      }
      const marker = line.match(SINGLE_PARAGRAPH) || line.match(LEGAL_MARKER) || line.match(LIST_MARKER);
      if (marker) {
        flush();
        let label = marker[1].trim().replace(/[.:–—-]+$/u, '');
        if (/^Art(?:igo)?\.?\s*\d/iu.test(label)) article = label;
        else if (article && /^(?:§|(?:Par[aá]grafo|Inciso|Al[ií]nea)\b)/iu.test(label)) label = article + ', ' + label;
        current = {label, head: heading, text: line.slice(marker[0].length).trim(), explicit: true};
      } else {
        if (!current) current = {label: 'Tópico ' + (result.length + 1), head: heading || 'Texto corrido', text: '', explicit: false};
        current.text += (current.text ? '\n' : '') + line;
      }
    }
    flush();
    return result.map(({label, head, text: body}) => ({label, head, text: body}));
  }

  function scoreArticle(unit) {
    const s = unit.text;
    const deadlines = (s.match(/\b\d+(?:\.\d+)?\s*(?:\([^)]*\)\s*)?(?:dias?|meses|mês|anos?|horas?)\b/giu) || []).length;
    const penalties = (s.match(/\b(?:reclusão|detenção|prisão|multa)\b/giu) || []).length;
    const restrictions = (s.match(/\b(?:somente|apenas|exclusivamente|exceto|salvo|vedad[oa]s?|proibid[oa]s?|nunca|sempre|independe|compete)\b/giu) || []).length;
    return deadlines * 3 + penalties * 1.5 + restrictions * 2 + (/(?:considera-se|entende-se|define-se|constitui|é vedado|é obrigat)/iu.test(s) ? 2 : 0);
  }

  function parseText(raw, title = '') {
    const source = text(raw).replace(/^\uFEFF/u, '').trim();
    if (!source) throw new Error('Cole ou importe o texto que servirá de base para os flashcards.');
    if (source.length > MAX_TEXT) throw new Error('O texto ultrapassa 2 milhões de caracteres. Divida o material em partes menores; nenhum trecho foi descartado.');
    const units = parseArticles(source);
    if (!units.length) throw new Error('Não há conteúdo textual para analisar. Inclua uma frase ou um parágrafo além dos títulos.');
    const ranked = units.map((unit, index) => ({...unit, index, score: scoreArticle(unit)}))
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const highCount = Math.max(1, Math.ceil(ranked.length * .45));
    const mediumCount = Math.min(ranked.length - highCount, Math.ceil(ranked.length * .3));
    const item = unit => ({
      article: unit.label + (unit.head && unit.head !== 'Texto corrido' ? ' — ' + unit.head : ''),
      sourceHeading: unit.head,
      sourceText: unit.text,
      plainExplanation: unit.text,
      practicalExample: ''
    });
    return {
      lawName: clean(title) || 'Material personalizado',
      contentScope: 'Texto fornecido pelo usuário',
      sourceText: source,
      articlesMapping: {
        highIncidence: ranked.slice(0, highCount).map(item),
        mediumIncidence: ranked.slice(highCount, highCount + mediumCount).map(item),
        lowIncidence: ranked.slice(highCount + mediumCount).map(item)
      }
    };
  }

  const STRING_FIELDS = ['kind', 'modality', 'law', 'article', 'reference', 'source', 'sourceQuote', 'extra',
    'scope', 'warning', 'tip', 'pitfall', 'application', 'priority', 'difficulty', 'difficultyLevel', 'family', 'hint', 'tags'];

  function validateCards(cards) {
    if (!Array.isArray(cards) || !cards.length) throw new Error('Não existem flashcards para importar ou exportar.');
    if (cards.length > MAX_CARDS) throw new Error('O arquivo contém mais de 30.000 flashcards. Divida o baralho em partes.');
    const seen = new Set();
    return cards.map((original, index) => {
      const label = 'Cartão ' + (index + 1);
      if (!original || typeof original !== 'object' || Array.isArray(original)) throw new Error(label + ': formato inválido.');
      for (const field of ['front', 'back']) {
        if (typeof original[field] !== 'string' || !original[field].trim()) throw new Error(label + ': frente e verso devem conter texto.');
        if (original[field].length > 20000) throw new Error(label + ': frente ou verso excede 20.000 caracteres.');
      }
      const id = original.id == null ? 'import-' + hash(original.front + '|' + original.back) + '-' + index : original.id;
      if (typeof id !== 'string' || !/^[A-Za-z0-9:_-]{1,160}$/u.test(id) || seen.has(id)) throw new Error(label + ': identificador inválido ou duplicado.');
      seen.add(id);
      const card = {id, front: original.front, back: original.back};
      for (const field of STRING_FIELDS) {
        if (original[field] == null) continue;
        if (typeof original[field] !== 'string' || original[field].length > MAX_TEXT) throw new Error(label + ': metadado ' + field + ' inválido.');
        card[field] = original[field];
      }
      if (original.cloze != null) {
        if (typeof original.cloze !== 'string' || original.cloze.length > 20000 ||
          (original.cloze && !/\{\{c[1-9]\d*::[\s\S]+?\}\}/u.test(original.cloze))) throw new Error(label + ': lacuna Anki inválida.');
        card.cloze = original.cloze || null;
      } else card.cloze = null;
      if (original.literal != null) {
        if (typeof original.literal !== 'boolean') throw new Error(label + ': campo literal inválido.');
        card.literal = original.literal;
      }
      for (const field of ['neuralScore', 'weight']) {
        if (original[field] == null) continue;
        if (typeof original[field] !== 'number' || !Number.isFinite(original[field]) ||
          (field === 'neuralScore' && (original[field] < 0 || original[field] > 1))) throw new Error(label + ': campo ' + field + ' inválido.');
        card[field] = original[field];
      }
      return card;
    });
  }

  function guideFromJson(value, defaultTitle) {
    const mapping = value?.articlesMapping;
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) throw new Error('JSON sem articlesMapping válido.');
    const guide = {lawName: clean(value.lawName || defaultTitle) || 'Material importado', contentScope: 'Material importado de JSON', articlesMapping: {}};
    const paragraphs = [];
    for (const key of ['highIncidence', 'mediumIncidence', 'lowIncidence']) {
      const rows = mapping[key] || [];
      if (!Array.isArray(rows)) throw new Error('JSON: ' + key + ' deve ser uma lista.');
      guide.articlesMapping[key] = rows.map((row, index) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('JSON: tópico inválido.');
        const body = row.sourceText || row.plainExplanation;
        if (typeof body !== 'string' || !body.trim()) throw new Error('JSON: tópico sem texto-fonte.');
        const article = clean(row.article || row.title) || 'Tópico ' + (paragraphs.length + index + 1);
        const entry = {article, sourceText: typeof row.sourceText === 'string' ? row.sourceText : '', plainExplanation: typeof row.plainExplanation === 'string' ? row.plainExplanation : body, practicalExample: typeof row.practicalExample === 'string' ? row.practicalExample : ''};
        paragraphs.push(article + '\n' + body);
        return entry;
      });
    }
    if (!paragraphs.length) throw new Error('JSON sem tópicos para gerar flashcards.');
    const source = paragraphs.join('\n\n');
    if (source.length > MAX_TEXT) throw new Error('O JSON contém mais de 2 milhões de caracteres de material. Divida o arquivo em partes menores.');
    return {text: source, title: guide.lawName, guide};
  }

  function parseJson(raw, defaultTitle) {
    let value;
    try { value = JSON.parse(text(raw).replace(/^\uFEFF/u, '')); }
    catch (_) { throw new Error('O arquivo JSON não é válido. Verifique sua sintaxe ou importe um backup exportado pela ferramenta.'); }
    if (value?.format === FORMAT && value.version === 1) {
      return {text: '', title: clean(value.title) || defaultTitle, cards: validateCards(value.cards)};
    }
    if (value?.format === FORMAT) throw new Error('A versão deste backup não é suportada.');
    if (value?.articlesMapping) return guideFromJson(value, defaultTitle);
    if (value && typeof value.text === 'string') {
      const title = clean(value.title || value.lawName) || defaultTitle;
      return {text: value.text, title, guide: parseText(value.text, title)};
    }
    throw new Error('JSON não reconhecido. Use um backup de flashcards, um guia com articlesMapping ou um objeto com text e title.');
  }

  function loadScript(url) {
    if (loading.has(url)) return loading.get(url);
    const request = new Promise((resolve, reject) => {
      if (!root.document) { reject(new Error('A leitura de PDF e DOCX requer um navegador.')); return; }
      const script = root.document.createElement('script');
      const fail = () => {
        clearTimeout(timeout);
        loading.delete(url);
        script.remove();
        reject(new Error('Não foi possível carregar o leitor. Verifique a conexão com a internet ou cole o texto do arquivo.'));
      };
      const timeout = setTimeout(fail, 30000);
      script.src = url;
      script.async = true;
      script.onload = () => { clearTimeout(timeout); resolve(); };
      script.onerror = fail;
      root.document.head.appendChild(script);
    });
    loading.set(url, request);
    return request;
  }

  async function readFile(file, options = {}) {
    if (!file || typeof file.name !== 'string') throw new Error('Selecione um arquivo para importar.');
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'md', 'json', 'pdf', 'docx'].includes(extension)) throw new Error('Formato não suportado. Selecione TXT, MD, JSON, PDF ou DOCX.');
    const maxSize = ['txt', 'md'].includes(extension) ? MAX_TEXT : MAX_FILE;
    if (!Number.isFinite(file.size) || !file.size) throw new Error('O arquivo está vazio ou não pode ser lido.');
    if (file.size > maxSize) throw new Error('Arquivo excede o limite de ' + (maxSize / 1048576) + ' MB. Divida-o em partes menores.');
    const title = file.name.replace(/\.[^.]+$/u, '');
    options.onProgress?.('Lendo ' + file.name + '…');
    if (extension === 'json') return parseJson(await file.text(), title);
    let source = '';
    if (['txt', 'md'].includes(extension)) source = await file.text();
    else if (extension === 'docx') {
      options.onProgress?.('Carregando leitor DOCX…');
      if (!root.mammoth?.extractRawText) await loadScript(READERS.docx);
      if (!root.mammoth?.extractRawText) throw new Error('O leitor DOCX não ficou disponível. Cole o texto do documento.');
      try { source = (await root.mammoth.extractRawText({arrayBuffer: await file.arrayBuffer()})).value; }
      catch (_) { throw new Error('Não foi possível ler este DOCX. Verifique se o arquivo é válido ou cole seu conteúdo.'); }
    } else {
      options.onProgress?.('Carregando leitor PDF…');
      if (!root.pdfjsLib?.getDocument) await loadScript(READERS.pdf);
      if (!root.pdfjsLib?.getDocument) throw new Error('O leitor PDF não ficou disponível. Cole o texto do documento.');
      root.pdfjsLib.GlobalWorkerOptions.workerSrc = READERS.pdfWorker;
      let pdf;
      try {
        // Desativa avaliação dinâmica também em PDFs fornecidos por terceiros.
        pdf = await root.pdfjsLib.getDocument({data: await file.arrayBuffer(), isEvalSupported: false}).promise;
        if (pdf.numPages > 80) throw new Error('PDF com mais de 80 páginas. Divida o documento em partes menores.');
        const pages = [], unreadable = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          options.onProgress?.('Lendo página ' + pageNumber + ' de ' + pdf.numPages + '…');
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const extracted = content.items.map(item => text(item.str) + (item.hasEOL ? '\n' : ' ')).join('').trim();
          if (!extracted) unreadable.push(pageNumber);
          pages.push(extracted);
          page.cleanup?.();
        }
        if (unreadable.length) throw new Error('O PDF contém páginas sem texto extraível (' + unreadable.join(', ') + '). Ele pode ser escaneado ou conter páginas em branco. Cole o texto ou envie uma versão textual para evitar uma importação incompleta.');
        source = pages.join('\n\n');
      } catch (error) {
        if (error?.name === 'PasswordException') throw new Error('O PDF está protegido por senha. Envie uma cópia desbloqueada ou cole o texto.');
        throw error;
      } finally { if (pdf) await pdf.destroy(); }
    }
    source = text(source).replace(/^\uFEFF/u, '').trim();
    if (!source) throw new Error('Nenhum texto extraível foi encontrado. Cole o conteúdo do documento para gerar os flashcards.');
    if (source.length > MAX_TEXT) throw new Error('O material extraído excede 2 milhões de caracteres. Divida o arquivo; nenhum trecho foi descartado.');
    return {text: source, title};
  }

  async function readFileText(file, options) {
    const result = await readFile(file, options);
    if (result.cards) throw new Error('Este JSON é um backup de flashcards. Importe-o como baralho.');
    return result.text;
  }

  function serialize(input, format = 'csv', options = {}) {
    const all = validateCards(input);
    const title = clean(options.title) || 'Flashcards';
    const base = 'pmdf-' + filename(title);
    if (format === 'json') {
      const content = JSON.stringify({format: FORMAT, version: 1, title, cards: all}, null, 2) + '\n';
      let bytes = 0;
      for (const character of content) {
        const codepoint = character.codePointAt(0);
        bytes += codepoint > 0xffff ? 4 : codepoint > 0x7ff ? 3 : codepoint > 0x7f ? 2 : 1;
        if (bytes > MAX_FILE) throw new Error('O backup excede 12 MB. Divida o baralho em conjuntos menores para que os arquivos possam ser importados novamente.');
      }
      return {content, mime: 'application/json;charset=utf-8', filename: base + '.json', count: all.length};
    }
    const extra = card => [card.extra || card.source || '',
      'Referência: ' + (card.reference || card.article || 'Material fornecido'),
      'Alerta: ' + (card.warning || 'Confira o trecho-fonte.')].join('\n');
    const tags = card => clean(card.tags) || '#MetodoPMDF';
    const quoted = value => '"' + text(value).replace(/\r\n?/g, '\n').replace(/"/g, '""') + '"';
    if (format === 'csv' || format === 'tsv') {
      // Protege a abertura em planilhas inclusive para prefixos precedidos por
      // espaços, quebras de linha ou tabulações; o cartão original fica intacto.
      const spreadsheet = value => {
        let valueText = text(value);
        if (/^[\s\uFEFF]*[=+@-]/u.test(valueText)) valueText = "'" + valueText;
        return quoted(valueText);
      };
      const separator = format === 'tsv' ? '\t' : ';';
      const rows = [['Frente', 'Verso', 'Extra', 'Tags'], ...all.map(card => [card.cloze || card.front, card.back, extra(card), tags(card)])];
      return {content: '\uFEFF' + rows.map(row => row.map(spreadsheet).join(separator)).join('\r\n') + '\r\n',
        mime: (format === 'tsv' ? 'text/tab-separated-values' : 'text/csv') + ';charset=utf-8',
        filename: base + '-' + all.length + '.' + format, count: all.length};
    }
    if (format !== 'basic' && format !== 'cloze') throw new Error('Formato de exportação desconhecido.');
    const isCloze = format === 'cloze';
    const cards = all.filter(card => isCloze ? Boolean(card.cloze) : !card.cloze);
    if (!cards.length) throw new Error('Não existem cartões do tipo ' + (isCloze ? 'Cloze' : 'Básico') + ' neste baralho.');
    const deck = clean(options.deck) || 'Método PMDF::Flashcards';
    const header = ['#separator:Tab', '#html:false', '#notetype:' + (isCloze ? 'Cloze' : 'Basic'),
      '#deck:' + deck, '#tags column:3', '#columns:' + (isCloze ? 'Text\tExtra\tTags' : 'Front\tBack\tTags')];
    // #html:false torna HTML do material literal. Quoting conserva aspas e tabs;
    // linhas internas viram espaços para manter uma nota por linha na importação.
    const field = value => quoted(text(value).replace(/\r\n?|\n/g, ' '));
    const rows = cards.map(card => (isCloze ? [card.cloze, extra(card), tags(card)] :
      [card.front, card.back + '\n\n' + extra(card), tags(card)]).map(field).join('\t'));
    return {content: '\uFEFF' + header.concat(rows).join('\n') + '\n', mime: 'text/plain;charset=utf-8',
      filename: base + '-anki-' + format + '-' + cards.length + '.txt', count: cards.length};
  }

  root.PMDFFlashcardIO = Object.freeze({version: '20261124-standalone-v1', format: FORMAT, readers: READERS,
    parseArticles, parseText, validateCards, readFile, readFileText, serialize, escapeHtml});
})(typeof window === 'undefined' ? globalThis : window);
