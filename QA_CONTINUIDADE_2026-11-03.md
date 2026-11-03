# QA — Continuidade do Método PMDF (03/11/2026)

## Base verificada
- Repositório: `metodopmdf/metodo-pmdf`
- Branch: `main`
- Commit homologado: [`8253710045928f2bd9d55fdf4c7a8895b0a97a24`](https://github.com/metodopmdf/metodo-pmdf/commit/8253710045928f2bd9d55fdf4c7a8895b0a97a24)
- [GitHub Actions — QA Método PMDF: **SUCESSO**](https://github.com/metodopmdf/metodo-pmdf/actions/runs/41736133673)
- [GitHub Pages — build e implantação: **SUCESSO**](https://github.com/metodopmdf/metodo-pmdf/actions/runs/41736132886)
- Site: https://metodopmdf.github.io/metodo-pmdf/

## Alterações consolidadas
1. Recuperação do workflow principal de QA por ajuste de sintaxe YAML no nome de uma etapa.
2. Geração mista: questões C/E e múltipla escolha intercaladas no banco antes de formar lotes, evitando concentração inicial em um único formato quando ambas existem na fonte.
3. Teste de regressão dos 30 primeiros itens e dos 30 seguintes do banco misto.
4. Flashcards: escolha de 25, 50, 100, 200 ou todos por sessão; avanço sem repetição no treino livre; distribuição round-robin dos cartões das leis ao estudar todo o catálogo.
5. Flashcards: fonte extensa com explicação curta válida pode fornecer a explicação resumida daquele mesmo artigo em vez de produzir um cartão excessivamente longo ou descartar o dispositivo.
6. QA em navegador: verifica também a versão publicada do asset JavaScript neural e aguarda efetivamente um **novo** estado após cada geração, evitando aceitar o lote anterior em testes assíncronos.
7. Smoke tests ampliados para conferir distribuição entre 26 leis, tamanho do lote, ausência de repetição, recuperação do texto longo e cobertura dos dois formatos.

## Resultado dos testes
- **Smoke JavaScript (Node 22): PASSOU**. Inclui verificações existentes dos 26 guias, três níveis, geração, flashcards, redação, histórico, armazenamento e simulações de sincronização.
- **QA neural: PASSOU** no fluxo `QA Método PMDF` e no fluxo `QA Motor Neural` do commit anterior pertinente.
- **E2E remoto Chromium desktop (1366×900): PASSOU**.
- **E2E remoto Chromium mobile (390×844): PASSOU**.
- **GitHub Pages e arquivo neural publicado**: SHA-256 correspondente aos arquivos do checkout homologado.
- **Temas e fluxos avaliados**: troca claro/escuro; CE/MC/MIX; resposta e comentário; flashcards com verso e fundamento; classificação honesta na repetição espaçada; texto longo; continuidade do banco por lotes inéditos.
- **Automação de testes**: conclusão global `success` em [run 41736133673](https://github.com/metodopmdf/metodo-pmdf/actions/runs/41736133673). Capturas de tela e resultado JSON estão nos artefatos do workflow.

## Defeitos detectados durante o ciclo e correções
- Falha inicial de workflow: YAML corrigido.
- Falha real de distribuição do banco misto: intercalamento corrigido e coberto por teste.
- Falha de sintaxe introduzida em teste (nome `batchA` já usado): identificadores renomeados, smoke restabelecido.
- Falso positivo no E2E misto: teste lia um estado MC anterior; passou a esperar a substituição do estado após cada geração.

## Limitações e pontos ainda não homologados
- O motor local utiliza regras textuais e rede leve; **não é uma IA generativa conectada ao Gemini**. A disponibilidade e o nível das questões dependem do material de entrada.
- A fundamentação jurídica e a vigência das normas **não são verificadas externamente** pelo motor. É necessário cotejar com as fontes oficiais.
- A suíte testa Supabase principalmente com simulações. **Não equivale a validar gravação remota com credenciais de uma conta real**.
- A execução E2E verificou Chromium desktop/mobile e os fluxos automatizados definidos; não comprova compatibilidade universal com todos os navegadores, tecnologias assistivas e aparelhos.
- Não foi prometida exaustividade semântica ou 100 questões a partir de material insuficiente.

## Próxima prioridade técnica
Evoluir geração verificável de flashcards e questões em documentos longos com auditoria de cobertura de tópicos, métricas por fonte e validação de itens na prévia antes de inserir no banco, mantendo a aplicação pública gratuita e leve.
