# Relatório de QA — Elaborador de Questões (03/11/2026)

## Escopo
Integração do prompt mestre de examinador ao Método PMDF e evolução do gerador local de questões no arquivo `index.html`. Repositório `metodopmdf/metodo-pmdf`, branch `main`.

## Funcionalidades incluídas
- Prompt mestre acessível no modal **Prompt de Varredura de Questões**, com 14 diretrizes, fidelidade à fonte, cobertura, dois formatos, gabaritos e revisão.
- Preservação de **todas** as unidades detectadas nos textos personalizados, eliminando o corte anterior de 40 unidades. O texto completo de cada unidade é preservado em `sourceText` para a elaboração.
- Metadados `sourceKey`, `sourceQuote`, `subtopic` e `coverageId` para rastreabilidade e deduplicação das questões locais.
- Opção única de **múltipla escolha** com quatro ou cinco alternativas, dependendo da disponibilidade de distratores; comentários por alternativa em `optionAnalysis`.
- Geração em lotes de 15, 30, 50 ou todos os itens disponíveis; botão de **Próximo lote inédito**; indicador de cobertura e **Reiniciar cobertura**.
- Histórico de lotes separado por fonte, formato, nível e banca, persistido no armazenamento da conta/navegador, incluído nas chaves elegíveis para sincronização.
- Gabarito e comentário exibidos apenas após a resposta no simulador; continuação do lote ao fim da sessão.

## Testes executados
Suíte: `node tests/smoke.mjs`, executada automaticamente pelo GitHub Actions.

- Sintaxe JavaScript do `index.html` validada.
- 26 guias integrados e 3 níveis de dificuldade: casos de CE e MC.
- 468 renderizações de resumo nos seis formatos e três níveis.
- MC de 4/5 opções, gabarito com letra válida, alternativas sem duplicação.
- Fluxos de simulado, revisão/flashcards, histórico de respostas e importação de provas/gabaritos.
- Teste novo com **75 dispositivos** em fonte simulada, verificando que todos foram preservados e percorridos no gerador CE.
- Teste novo com **dois lotes de 15** questões, sem repetição de identificadores, avanço de cobertura 15→30 e consistência de pendências.
- Teste novo de persistência e reinício do histórico de cobertura sem apagar estatísticas.
- Teste novo de conteúdo do prompt mestre e fundamentação individual das alternativas de MC.
- Testes existentes de armazenamento e sincronização simulada.

**Resultado de referência:** GitHub Actions QA passou no commit `db4f23759da9c5af5268805ca783f096c2a6eccc`: https://github.com/metodopmdf/metodo-pmdf/actions/runs/41649278843

## Limites de validação e riscos conhecidos
- O elaborador do site é **determinístico e local**: usa extração de proposições, contraposições controladas e associação de dispositivos. O prompt mestre constitui especificação metodológica e texto copiável, **não um modelo de linguagem local**. Não é possível garantir exaustividade semântica nem equivalência a uma equipe humana examinadora para todo material.
- A banca citada é referência de estilo, sem endosso oficial. A vigência de leis e a correção material dependem da qualidade e atualização da fonte fornecida; recomenda-se confrontar itens jurídicos com texto oficial.
- O relatório de cobertura mede **itens disponíveis do gerador**, não todos os conhecimentos juridicamente possíveis. Blocos sem proposições completas podem não produzir questões.
- A revisão de opções MC é feita por regras, não prova formal da unicidade semântica. Associações entre dispositivos exigem cautela em materiais com regras repetidas ou sobrepostas.
- Documentos excepcionalmente grandes podem ultrapassar a cota do armazenamento local; há alerta quando não se consegue persistir o lote.
- Foi executada suíte de testes baseada em ambiente JavaScript simulado; **não** foi realizado ensaio manual com navegadores reais, leitores de tela ou dispositivos móveis neste ciclo.

## Recomendação de manutenção
Preservar a suíte atual como barreira obrigatória a mudanças futuras. Priorizar futuramente melhorias no parser de incisos/parágrafos, análise semântica local opcional quando tecnicamente viável e testes de navegador real, mantendo a operação pública gratuita e sem assinatura ou conexão obrigatória com serviços externos de IA.
