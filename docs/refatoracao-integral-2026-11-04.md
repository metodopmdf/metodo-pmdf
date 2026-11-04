# Refatoração integral de front-end — Método PMDF

**Revisão técnica:** 04/11/2026 · **Origem:** auditoria de 03/11/2026 · **Branch de validação:** `refactor/full-audit-20261103`.

## 1. Arquitetura resultante

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | HTML5, metadados SEO/Open Graph, ARIA, controles, ligação dos módulos e política CSP. Aproximadamente 77 KB (antes: 708 KB). |
| `assets/pmdf-tailwind.css` | Base utilitária Tailwind compilada localmente. |
| `assets/pmdf-components.css` | Variáveis, componentes, modos claro/escuro, responsividade, impressão, questões e flashcards (mantida ordem de cascata). |
| `assets/pmdf-guides.js` | Catálogo inicial de guias jurídicos, cacheável independentemente. |
| `assets/pmdf-app.js` | Orquestração da aplicação, navegação, conta, estudos, redação, exportação e eventos. |
| `assets/pmdf-neural-questions.js` | Elaborador local de questões (lógica preservada). |
| `assets/pmdf-neural-flashcards.js` | Flashcards Anki locais (lógica preservada). |

Os scripts são **clássicos com `defer`** para preservar a visibilidade das declarações globais entre arquivos e a execução em ordem. Isso evita uma migração arriscada de estruturas legadas para ES modules sem ampliar a cobertura de testes. O catálogo é carregado antes da aplicação. Não acrescentar `type="module"` nos scripts clássicos sem refatorar seus import/export e escopos.

## 2. Correções concluídas

- SEO: metadescrição, canonical, Open Graph e tema do navegador.
- Semântica: marcos de conteúdo, abas ARIA e modais com foco inicial, Tab cíclico e retorno ao acionador.
- UX: link para pular navegação, redução de movimento, notificações limitadas, preservação dos modos claro/escuro e proteção de textos extensos.
- UI/CSS: extração dos estilos inline em folhas externas, preservando a cascata e o suporte a impressão A4; contraste AA revisado com axe-core nos dois temas.
- JavaScript: migração dos atributos `onclick`/`oninput`/`onchange`/`onsubmit`/`onkeydown` para listeners delegados, sem `eval` de atributos em tempo de execução. Os poucos handlers dependentes de argumentos dinâmicos usam `data-pmdf-special` e despacho com funções tipadas.
- Segurança: CSP sem JavaScript inline, escape de atributos, sanitização defensiva de renderização dinâmica, URLs perigosas e ações em HTML não confiável; limite de tamanho de backups, guias JSON e anexos para impedir consumo extremo de memória.
- Estado e performance: uso de `??` em JSON local e embaralhamento linear Fisher–Yates, mantendo estrutura de storage e sincronização.
- QA: regressão dos 26 guias em 3 níveis, questões C/E e múltipla escolha, flashcards, redação, simulação da nuvem, exportações, navegação e inserção maliciosa; testes reais em Chromium desktop/mobile, ambos os temas, com axe-core.

## 3. Segurança e limites técnicos

GitHub Pages hospeda um site estático. Políticas de autorização, revogação, autenticação e validação de dados **devem continuar no Supabase/RLS ou outro backend confiável**. Não incluir tokens secretos no front-end.

A CSP via meta restringe scripts e impede handlers inline. Os estilos inline são mantidos em `style-src 'unsafe-inline'` por compatibilidade com documentos de impressão, popups e estilos calculados; é possível endurecê-la futuramente apenas migrando integralmente os estilos de documentos gerados. Cabeçalhos como `X-Content-Type-Options` não podem ser ativados por `<meta>`; exigem configuração na hospedagem. Recursos públicos externos (Google Fonts, Lucide, bibliotecas de PDF) ainda requerem revisão de cadeia de suprimentos e versionamento.

A sanitização reduz vetores XSS, mas não substitui auditoria de dados por campos nem validação de APIs no servidor. A chave `data-pmdf-onclick` é um identificador de ação, nunca texto executado por `eval`.

## 4. Plano de testes reproduzível

Com Node.js 22:

```bash
node tests/markup-audit.mjs
node tests/smoke.mjs
node tests/neural-questions.test.cjs
node tests/neural-flashcards.test.cjs
```

Os workflows `.github/workflows/qa.yml` e `.github/workflows/neural-qa.yml` rodam no GitHub. Em PRs, o teste Chromium utiliza uma prévia HTTP local da revisão; após o merge, verifica a publicação exata no GitHub Pages (hash do HTML e dos assets). O E2E comprova o bloqueio de scripts inline **antes** de desativar CSP apenas na sessão simulada para testes, sem modificar as configurações reais do site.

O QA produz artefatos `test-artifacts/`, incluindo screenshots desktop/mobile, relatório axe-core por página/tema, resultados funcionais e métricas observacionais **FCP, LCP, INP aproximado, CLS e bytes transferidos**.

Essas métricas são de laboratório, não equivalem aos percentis de dados reais de campo do Core Web Vitals. A avaliação com leitores de tela operados por pessoas e auditoria de cabeçalhos HTTP de produção dependem de verificação externa adicional.

## 5. Preservação de comportamento

Nenhum esquema de dados do Supabase nem chaves existentes no localStorage foram migrados. Os fluxos Anki, navegação anterior/próximo, visualização de senha, materiais importados, guias, exportação e simulados continuam testados. Qualquer nova mudança deve passar pela auditoria estática, pelos testes dos motores e pelo E2E antes de publicação.
