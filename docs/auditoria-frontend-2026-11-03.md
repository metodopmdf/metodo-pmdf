# Auditoria técnica de Front-End — Método PMDF

**Revisão:** 03/11/2026 (BRT) · **Repositório:** `metodopmdf/metodo-pmdf` · **Branch:** `main`

## Escopo e método

Análise do `index.html` original com aproximadamente **701.654 caracteres e 6.999 linhas**, incluindo HTML5, estilos e JavaScript inline, acrescida da inspeção dos motores externos `assets/pmdf-neural-questions.js`, `assets/pmdf-neural-flashcards.js` e dos testes existentes. A revisão preserva o aplicativo original em sua totalidade, sem substituir a lógica dos 26 guias, redação, autenticação, questões ou cartões.

## Diagnóstico por pilar

| Pilar | Achado | Gravidade | Tratamento |
|---|---|---|---|
| SEO | Não havia descrição, URL canônica ou metadados Open Graph | Média | Metadados inseridos no `head` |
| Performance | Lucide carregava como script síncrono e a ligação de fontes não tinha `preconnect` | Média | Lucide com `defer`; `preconnect` para fontes |
| Arquitetura | HTML único grande, muitos blocos CSS e ~167 atributos de eventos inline | Alta para manutenção | Conservados por compatibilidade; migração modular recomendada abaixo |
| Segurança | ~28 atribuições a `innerHTML` e duas operações `document.write` (documentos de impressão) | Alta para revisão de origens | Escape de aspas/apóstrofos fortalecido; revisão de todos os pontos dinâmicos e CSP restritiva permanecem pendentes |
| Acessibilidade | Modais sem `role="dialog"`, sem ciclo de Tab ou restauração do foco | Alta | Semântica ARIA, foco inicial, Tab circular, Escape e retorno do foco |
| Acessibilidade | Faltavam link para o conteúdo principal e padrão mais explícito de `:focus-visible` | Média | Link de salto, marco do conteúdo, destaque visual e ocultação durante login |
| Responsividade | Painéis extensos, avisos e modais exigem comportamento claro em telas estreitas | Média | Limites móveis em modais e avisos; textos longos com quebra |
| UX | Notificações podiam se empilhar sem limite | Média | Limite de quatro alertas visíveis e texto limitado |
| Estado | `jget` descartava `false` e `0` válidos por usar `||` | Média | Substituído por `??` |
| Desempenho | Embaralhamento usava ordenação aleatória O(n log n) | Média | Fisher–Yates O(n), sem mutar lista de origem |
| Tema | A barra cromática do navegador não acompanhava tema claro/escuro | Baixa | `meta theme-color` sincronizada com o tema |

### Semântica e organização

A estrutura contém marco `<main>`, formulário de conta, navegação por abas com `role="tab"` e painéis `role="tabpanel"`. Estes recursos já existiam e foram preservados. Há HTML dinâmico produzido para impressão/exportação; por isso, uma contagem literal de `id` no JavaScript pode sinalizar repetições que não coexistem no DOM. O novo teste verifica somente IDs da marcação estática.

### Segurança

O código público **não é uma fronteira de segurança**. A proteção dos dados depende das políticas de acesso do banco e da validação no servidor. Atributos `onclick` / `onchange` e grandes scripts inline impedem, no estado atual, aplicar uma CSP rígida sem uma migração coordenada para `addEventListener` e arquivos externos. Uma tag `meta` de `X-Content-Type-Options` não substitui o cabeçalho HTTP de segurança. Qualquer integração com IA ou API que utilize segredo requer backend; nunca expor credenciais privadas no HTML.

### Limites da revisão

A revisão é **compatível e conservadora**, não uma separação integral do monólito em módulos. Ainda é recomendado, em uma etapa de engenharia dedicada e com testes de regressão abrangentes:

1. Extrair CSS para estilos por componente e consolidar a cascata, depois comparar visualmente tela a tela.
2. Migrar eventos inline para listeners com delegação por módulo, possibilitando CSP restritiva e melhor testabilidade.
3. Fazer auditoria de fluxo de dados das chamadas a `innerHTML`, com sanitização formal quando houver HTML de terceiros.
4. Reduzir CSS/JS críticos, medir LCP/INP/CLS e tamanho transferido em rede lenta.
5. Revisar acessibilidade com axe-core e leitores de tela reais; validar contrastes em ambos os temas.
6. Adotar processos de teste/revisão antes de grandes alterações em autenticação ou banco.

## Controle de qualidade

Arquivos relacionados:
- `tests/markup-audit.mjs` — nova auditoria estática sem dependências externas.
- `tests/smoke.mjs` — questões, flashcards, guias, redação e sincronização simulada.
- `tests/neural-questions.test.cjs` e `tests/neural-flashcards.test.cjs` — bancos e motores locais.
- `tests/online-e2e.mjs` — Chromium desktop e mobile, publicação do GitHub Pages, geração, revisão e agora acessibilidade dos modais.
- `.github/workflows/qa.yml` — executa auditoria estática e smoke antes de iniciar E2E online.

**Verificações realizadas durante a edição:** sintaxe do script principal aprovada com compilação JavaScript; nova auditoria estrutural aprovada; suíte `smoke.mjs` executada em isolamento JavaScript com simulações de API e navegador, concluindo sem falhas (26 normas, três níveis, questões, flashcards, redações, sincronização simulada).

**Verificação que exige confirmação externa:** o GitHub Actions configura testes reais do site após a publicação no GitHub Pages; o status final e os artefatos de Chromium precisam ser consultados na execução específica de QA. Não confundir testes simulados com aprovação de navegação online.

## Critério para revisões futuras

Preservar integralmente as funções existentes, executar auditoria estática + testes dos motores + smoke e exigir aprovação do E2E de desktop e mobile antes de declarar que a publicação foi validada.
