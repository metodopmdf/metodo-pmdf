# Método PMDF — Anki avançado para concursos (03/11/2026)

## Pesquisa de referências
- [Manual Anki — Cloze deletion e campo Extra](https://docs.ankiweb.net/editing.html): lacunas curtas no contexto, fundamento separado da frente.
- [Manual Anki — Texto para importação](https://docs.ankiweb.net/importing/text-files.html): importação por tipos de nota, cabeçalhos `#notetype`, `#separator`, tags.
- [Manual Anki — Opções do baralho e FSRS](https://docs.ankiweb.net/deck-options.html): quatro graus de recordação e intervalos adaptativos. **Não** foi implementado FSRS: Método PMDF continua com agenda Leitner adaptada.
- [SuperMemo — vinte regras de formulação do conhecimento](https://www.supermemo.com/en/blog/twenty-rules-of-formulating-knowledge): informação mínima, evitar listas e perguntas vagas.

## Alterações técnicas implementadas
1. Reescrita de `assets/pmdf-neural-flashcards.js`: identificação de fatos explícitos no material (quantidades, prazos, sujeitos, modalizadores, ressalvas e conceitos). 
2. Formato padrão de cartão: **frase contextualizada com um único alvo oculto** (Cloze), resposta com somente o núcleo testado; conceitos diretos e contrastes de prova quando verificáveis.
3. Descarte de trechos ambíguos: nenhum cartão deve ocultar frases enormes, palavras sem critério contextual, leis incompletas ou fragmentos cortados em `Lei 13.491/2017`.
4. O verso exibe a resposta em destaque e a frase restaurada; o fundamento original e o alerta de banca ficam atrás de um painel expansível.
5. Grade de quatro botões: Errei, Difícil (12h), Bom, Fácil (avanço duas caixas). O scheduler local permanece Leitner, sem atribuir recursos do FSRS à plataforma.
6. Exportação para Anki: arquivos específicos `Anki · Lacunas (.txt)` e `Anki · Conceitos/Contrastes (.txt)` com cabeçalhos `#notetype:Cloze` e `#notetype:Basic`, além das exportações CSV/TSV antigas. O usuário pode precisar ajustar o nome do tipo de nota na versão/localização do Anki.
7. Preservação das ferramentas existentes: questões, redações, resumos, revisão clássica, histórico de cartões e seleção de disciplinas. Cartões elaborados pela nova versão recebem novos IDs para evitar cruzar falsamente o progresso de conteúdos estruturalmente diferentes.

## Limites e auditoria
- Geração **extrativa e determinística**, com apoio do classificador neural local já utilizado nas questões. Sem Gemini, assinatura, API externa ou validação jurídica automática.
- Fontes dos guias internos são **sínteses didáticas**, não texto legislativo integral; o usuário deve conferir a norma consolidada. Fonte primária é o documento fornecido.
- Volume acompanha o número de fatos examináveis. A qualidade e a fidelidade têm prioridade; não se força uma cota por dispositivo.
- `tests/neural-flashcards.test.cjs` cobre três modalidades, resposta atômica, referência, interrupção, 520 dispositivos, referências legais numeradas e exceções.
- `tests/online-e2e.mjs` verifica no GitHub Pages real todos os formatos, 26 matérias, prova de 90 artigos, quatro graus e agendamento, importação Cloze/Basic e exportações CSV/TSV em Chromium desktop/mobile.
