/* Transferência manual de agenda entre origens. Não inclui textos, contas ou baralhos. */
(function (root) {
  'use strict';
  const format = 'PMDF-CATALOG-PROGRESS-v1';
  const maxBytes = 512 * 1024;
  const idPattern = /^cfo-gst-\d{8,20}$/;
  const maxDue = Date.UTC(2100, 0, 1);
  const valid = (id, item) => idPattern.test(id) && item && typeof item === 'object' &&
    Number.isInteger(item.box) && item.box >= 0 && item.box <= 4 &&
    Number.isSafeInteger(item.due) && item.due >= 0 && item.due <= maxDue;
  function schedules(storage, ...keys) {
    const result = Object.create(null);
    for (const key of keys) {
      try {
        const state = JSON.parse(storage.getItem(key) || 'null');
        if (state?.version !== 1) continue;
        for (const [id, item] of Object.entries(state.schedule || {}))
          if (valid(id, item)) result[id] = {box: item.box, due: item.due};
      } catch (_) { /* Não apaga registros legados inválidos. */ }
    }
    return result;
  }
  function serialize(schedule) {
    const entries = Object.entries(schedule).filter(([id, item]) => valid(id, item))
      .map(([id, {box, due}]) => ({id, box, due})).sort((a,b) => a.id.localeCompare(b.id));
    return JSON.stringify({format, entries}, null, 2) + '\n';
  }
  function parse(raw, knownIds) {
    if (typeof raw !== 'string' || raw.length > maxBytes)
      throw new Error('O backup de progresso ultrapassa 512 KB.');
    let data;
    try { data = JSON.parse(raw); } catch (_) { throw new Error('O backup de progresso não é um JSON válido.'); }
    if (data?.format !== format || Object.keys(data).length !== 2 ||
        !Array.isArray(data.entries) || data.entries.length > 30000)
      throw new Error('Selecione um backup de progresso do Método PMDF, não um baralho.');
    const keep = Object.create(null), seen = new Set();
    for (const item of data.entries) {
      if (!item || Object.keys(item).length !== 3 || typeof item.id !== 'string' ||
          !valid(item.id, item) || seen.has(item.id))
        throw new Error('O backup contém um registro de progresso inválido ou duplicado.');
      seen.add(item.id);
      if (knownIds.has(item.id)) keep[item.id] = {box: item.box, due: item.due};
    }
    return keep;
  }
  root.PMDFCatalogProgress = Object.freeze({schedules, serialize, parse, maxBytes});
})(typeof window !== 'undefined' ? window : globalThis);
