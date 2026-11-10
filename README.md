# Método PMDF — Plataforma gratuita de estudos policiais

Aplicação pública de preparação para concursos policiais com mapeamento de normas, questões comentadas, flashcards Anki, mapas mentais, redação e acompanhamento de resultados.

**Site:** https://metodopmdf.github.io/metodo-pmdf/

## Arquitetura

- `index.html`: estrutura HTML, SEO, acessibilidade e CSP.
- `assets/pmdf-tailwind.css` e `assets/pmdf-components.css`: CSS de produção, layout responsivo e temas.
- `assets/pmdf-guides.js`: catálogo jurídico cacheável.
- `assets/pmdf-app.js`: recursos, navegação, armazenamento, autenticação, exportação e UI.
- `assets/pmdf-neural-questions.js` e `assets/pmdf-neural-flashcards.js`: motores locais de exercícios e revisão.

**Importante:** os motores locais não são LLMs generativos e não garantem atualização normativa automática. Confira a redação legal vigente antes de usar o conteúdo como referência jurídica.

## Testes

Requer Node.js 22:

```bash
node tests/markup-audit.mjs
node tests/smoke.mjs
node tests/neural-questions.test.cjs
node tests/neural-flashcards.test.cjs
```

O GitHub Actions executa também Playwright/Chromium e axe-core em desktop/mobile, temas claro/escuro, com teste de CSP e relatórios de desempenho. Consulte `.github/workflows/qa.yml`.

## Segurança e manutenção

Autenticação e dados são protegidos pelas regras do serviço de backend (Supabase); nenhuma credencial privada deve ser disponibilizada no JavaScript público. A versão estática usa uma CSP que bloqueia scripts inline e eventos delegados, preservando a possibilidade de impressão A4. Consulte [o relatório técnico da refatoração](docs/refatoracao-integral-2026-11-04.md) para decisões, limitações e estratégia de testes.

## Catálogo Praça PMDF (2026-11-09)

O módulo **Questões** dispõe de 15 disciplinas e 163 assuntos definidos em `assets/pmdf-catalogo-praca.js`; não contém **Administração Geral** no catálogo ativo e inclui **Noções de Primeiros Socorros** (8 tópicos).

**Para habilitar o banco no Supabase:** execute `supabase/migrations/20261109_catalogo_praca_pmdf.sql` no SQL Editor do seu projeto, após validar um backup. O catálogo funciona sem exigir questões pré-cadastradas, mas a consulta a questões classificadas requer a migração. Ela preserva o histórico antigo e as políticas RLS já existentes de `questoes`.

Teste: `node tests/catalogo-praca.test.cjs`. Diagnóstico e testes: [QA Praça PMDF](docs/qa-praca-2026-11-09.md).

## Banco público de questões (corrige PGRST205)

Quando aparecer `Could not find the table 'public.questoes' in the schema cache`, a estrutura da API precisa ser instalada/atualizada no projeto Supabase, pois publicar o GitHub Pages não cria tabelas PostgreSQL.

1. Faça backup e execute [`supabase/INSTALAR_BANCO_QUESTOES_COMPLETO.sql`](supabase/INSTALAR_BANCO_QUESTOES_COMPLETO.sql) no **SQL Editor** do projeto configurado no site. O script cria `public.questoes`, ativa RLS, instala o catálogo e recarrega o cache do PostgREST.
2. Opcionalmente, execute [`supabase/seeds/EXEMPLOS_QUESTOES_PUBLICAS.sql`](supabase/seeds/EXEMPLOS_QUESTOES_PUBLICAS.sql) para testar quatro questões autorais publicadas (revisar antes).
3. Em **Questões > Banco Praça PMDF**, selecione disciplina, assunto, formato e nível; só registros `publicada=true` aparecem aos candidatos.

Passo a passo para criar, importar e revisar questões: [Banco público de questões](docs/banco-de-questoes-publico.md). A publicação deve ser administrativa; rascunhos gerados por candidatos não são publicados automaticamente.

## Questões do edital, por matéria e assunto — sem Supabase

O seletor de **Fonte do conteúdo → Questões por matéria e assunto · acervo local** habilita 163 questões autorais de Certo/Errado (uma por tópico, nas 15 disciplinas), mais 21 de múltipla escolha. Questões comentadas podem ser praticadas no navegador sem tabela `public.questoes`; o motor local também pode elaborar variações a partir das afirmações fundamentadas, com limitações explícitas e sem garantir atualização normativa. O banco público Supabase continua em modo independente.

Veja [matriz de cobertura, instruções e fontes](docs/acervo-questoes-edital-praca-pmdf.md).
