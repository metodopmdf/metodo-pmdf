'use strict';
// Dados fictícios de teste. Nenhum cartão comercial é distribuído com a aplicação.
const groups = Array.from({length: 22}, (_, d) =>
  Array.from({length: d < 20 ? 6 : 5}, (_, t) => ({
    disciplina: 'Disciplina de teste ' + String(d + 1).padStart(2, '0'),
    assunto: 'Assunto fictício ' + (d + 1) + '.' + (t + 1)
  }))).flat();
module.exports = {
  format: 'PMDF-ANKI-IMPORT-v1', revision: 'qa-synthetic-v1',
  review_status: 'Acervo fictício usado exclusivamente nos testes.',
  cards: Array.from({length: 2624}, (_, i) => ({
    id: 'cfo-gst-' + (9000000000000 + i), ...groups[i % groups.length],
    front: 'CARTÃO DE TESTE ' + (i + 1) + '\nJULGUE CERTO OU ERRADO\nA definição fictícia ' + (i + 1) + ' é usada para validar a apresentação.',
    back: (i % 2 ? 'ERRADO' : 'CERTO') + ' — Comentário fictício número ' + (i + 1) + ', sem conteúdo de prova.',
    answer: i % 2 ? 'ERRADO' : 'CERTO', tags: 'QA SINTETICO', origin: 'fixture', reviewed_source: '',
    flags: i === 0 ? ['imagem_do_original_nao_embutida'] : []
  }))
};
