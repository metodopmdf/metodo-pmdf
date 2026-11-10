# Banco público de questões — Método PMDF

## Corrigir PGRST205 ("Could not find the table public.questoes")

A criação de arquivos no GitHub NÃO executa alterações no PostgreSQL do Supabase. A migração de disciplinas de 09/11/2026 só modificava `questoes` se a tabela já existisse. O instalador abaixo faz a criação do zero e a compatibilização:

**Instalador único:** [`supabase/INSTALAR_BANCO_QUESTOES_COMPLETO.sql`](../supabase/INSTALAR_BANCO_QUESTOES_COMPLETO.sql)

1. Acesse o projeto Supabase ligado ao site (a URL do frontend está em `assets/pmdf-app.js`) e faça backup dos dados.
2. Abra o **SQL Editor** e execute o instalador completo no mesmo banco.
3. A consulta final deve exibir `disciplinas_ativas=15`, `assuntos_ativos=163`, `administracao_geral_ativa=0`, `tabela_questoes=questoes`. A coluna `questoes_publicadas` começa em zero se ninguém cadastrou itens.
4. O script inclui `NOTIFY pgrst, 'reload schema';`. Se a API ainda não enxergar a tabela depois da execução, confirme se `public` está exposto em **Project Settings > Data API > Exposed schemas** e execute `NOTIFY pgrst, 'reload schema';` novamente.
5. Atualize o site. Em **Questões > Fonte do conteúdo > Banco Praça PMDF**, selecione disciplina, assunto, tipo e nível. O site consulta **somente linhas `publicada=true`**.

Diagnóstico sem mutação:

```sql
SELECT to_regclass('public.questoes') AS questoes,
       to_regclass('public.pmdf_disciplinas') AS disciplinas,
       to_regclass('public.pmdf_assuntos') AS assuntos;
SELECT count(*) FILTER (WHERE publicada) AS publicadas,
       count(*) FILTER (WHERE NOT publicada) AS privadas
FROM public.questoes;
```

Se `questoes` for `NULL`, não adianta apenas recarregar o cache: instale a tabela.

## Como disponibilizar questões aos candidatos

O catálogo da matriz (15 disciplinas e 163 assuntos) é separado do banco de questões. Filtrar uma disciplina não fabrica questões. Para disponibilizá-las:

1. **Autorizar e revisar o conteúdo**: criar questões próprias ou utilizar material com licença adequada. Conferir gabarito, comentário, texto-fonte e vigência de leis/protocolos.
2. **Classificar corretamente**: preencher `disciplina_slug` e `assunto_slug` conforme `assets/pmdf-catalogo-praca.js`; usar `formato = CERTO_ERRADO` com `gabarito = CERTO|ERRADO`, ou `formato = MULTIPLA_ESCOLHA` com `gabarito = A|B|C|D|E` e `alternativas` como array JSON `[{"letra":"A","texto":"..."},...]`.
3. **Inserir em SQL Editor**: registros novos podem ser carregados via `INSERT INTO public.questoes (...)` ou importação CSV pelo **Table Editor**. `hash_unico` deve ser estável e único; `score_dificuldade` deve estar entre 0 e 1; `dificuldade` deve ser `Fácil`, `Médio` ou `Difícil`. Use `publicada=false` para rascunhos.
4. **Revisar antes de publicar**: por SQL Editor, marque `publicada=true` apenas para questões cuja correção e licença foram verificadas. O navegador **não** deve conter senha de banco, `service_role` ou funções de publicação privilegiadas.
5. **Validar com conta comum**: escolher `Banco Praça PMDF`, disciplina, assunto, tipo e nível. Os filtros mostram apenas questões públicas, e o progresso do candidato segue isolado na conta/dispositivo.

**Exemplos autorais prontos para validação:** [`supabase/seeds/EXEMPLOS_QUESTOES_PUBLICAS.sql`](../supabase/seeds/EXEMPLOS_QUESTOES_PUBLICAS.sql). Rode somente após instalar e revisar; adiciona quatro itens demonstrativos em Português, RLM e Primeiros Socorros. Não são questões oficiais de concursos.

### Publicar questões revisadas

No SQL Editor (permissão de administrador):

```sql
-- Inspecione antes de autorizar a publicação.
SELECT id,disciplina,assunto,enunciado,gabarito,publicada
FROM public.questoes
WHERE hash_unico LIKE 'minha-curadoria-%';

-- Publique SOMENTE os hashes que você verificou.
UPDATE public.questoes
SET publicada=true
WHERE hash_unico IN ('minha-curadoria-0001','minha-curadoria-0002')
  AND publicada=false;
```

Para produção, prefira um pipeline de aprovação com `criado_por` identificado, metadados de licença/proveniência, revisão humana e auditoria de modificações. Uma área administrativa de importação/aprovação exige autenticação de administrador com backend seguro (por exemplo, Supabase Edge Function); não publicar chave `service_role` no GitHub Pages.

### Privacidade e autorização

- Questões pessoais geradas pelos candidatos são gravadas com `publicada=false` e `criado_por=auth.uid()`.
- O público vê apenas as linhas `publicada=true`. O usuário autenticado também pode ler seus próprios rascunhos, mas a busca do banco compartilhado filtra explicitamente `publicada=true`.
- Políticas RLS restritivas impedem um candidato de usar a API pública para mudar `publicada` de falso para verdadeiro.
- A administração publica por SQL Editor/servidor privilegiado; não por JavaScript público.
- Em navegadores, os gabaritos são enviados junto com as questões (necessários para correção local), portanto **não são segredo contra inspeção técnica**; se futuramente quiser prova antifraude, use correção no servidor com controles apropriados.

### Limitação atual

Sem integração administrativa com o Supabase, a instalação e a publicação precisam ser executadas por quem administra o projeto. O frontend já oferece consulta a questões publicadas e geração privada local, mas não implementa um painel administrativo de aprovação em lote.
