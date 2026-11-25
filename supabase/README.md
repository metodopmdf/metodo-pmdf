# Acesso exclusivo aos flashcards

O produto Hotmart **9071720** oferece pagamento único de **R$ 39,99** e acesso por
**seis meses de calendário contados da aprovação da compra**. O frontend utiliza
Supabase Auth e consulta `pmdf-access`. A base completa fica no banco privado;
ela não deve fazer parte dos arquivos publicados do site nem do histórico de um
repositório público.

## Estado provisionado em 25/11/2026

O backend foi provisionado no projeto `wskuhkvgipqwykbnuspk` (Método PMDF),
sem abrir o acesso ou ativar vendas. A migração remota
`20261125192133_pmdf_flashcards_access` corresponde ao arquivo local de mesmo
nome. A configuração aponta para o produto `9071720`, com `enabled=false` e
HOTTOK ainda não configurado. Nenhum usuário, compra, evento ou concessão de
teste foi criado durante o provisionamento; as três tabelas de compras,
eventos e concessões têm zero registros.

As duas Edge Functions estão `ACTIVE`, versão 1, com autenticação própria:

| Endpoint | ID da função |
| --- | --- |
| [`pmdf-access`](https://wskuhkvgipqwykbnuspk.supabase.co/functions/v1/pmdf-access) | `07504976-2ec4-40b3-8337-18645b9432c8` |
| [`pmdf-flashcards-webhook`](https://wskuhkvgipqwykbnuspk.supabase.co/functions/v1/pmdf-flashcards-webhook) | `2695ebf0-b19a-423e-972f-6437d6de5fab` |

O acervo privado contém **2.624 cartões**, importados em 20 lotes. A conferência
no PostgreSQL remoto confirmou os hashes completos:

- SHA-256 do arquivo original: `124e9f0f3b811a7b379fd0a4da2bc9fc8a55213bd1571bca61521a5803d191ae`.
- SHA-256 do payload JSONB: `d8722b05bd2701ea7b053fee944a056f6b4f2b5b8624930dc6cf5e96d0cd5771`.

Verificações realizadas no ambiente remoto:

| Requisição ou controle | Resultado |
| --- | --- |
| Acesso sem token | HTTP 401 `authentication_required` |
| Acesso com origem não permitida | HTTP 403 `origin_not_allowed` |
| Webhook sem HOTTOK | HTTP 401 `invalid_token` |
| Webhook com token fictício, sem segredo configurado | HTTP 503 `not_ready` |
| Respostas dos quatro testes | `Cache-Control: private, no-store, max-age=0` |
| `anon` e `authenticated` | Sem uso do schema privado, sem leitura das cinco tabelas e sem execução das três RPCs |
| `service_role` | Uso do schema e execução das três RPCs permitidos |
| Cinco tabelas privadas | RLS habilitada; nenhuma política de acesso ao cliente |
| Três RPCs | `SECURITY INVOKER` |

Os advisors não apontaram erro de segurança. Os avisos informativos de
[RLS sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
nas tabelas privadas correspondem ao bloqueio intencional de clientes. Os
[índices ainda sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
foram mantidos para as consultas de compras, que ainda não têm tráfego. Existe
um aviso de Auth do projeto sobre
[proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection),
configuração preexistente que não foi alterada. As funções antigas
`pmdf-checkout` e `pmdf-hotmart-webhook` permanecem na versão 2.

Antes de liberar compradores, faltam: HOTTOK por canal seguro; SMTP e URLs de
retorno do Auth validados; hospedagem definitiva compatível com uso comercial
e sua origem permitida; webhook configurado na Hotmart; teste de entrega com
conta de e-mail confirmado e autorização válida; política de acesso ao
repositório que contém o histórico do acervo. O fluxo completo de um comprador
ainda não foi testado. Só após resolver essas pendências deve-se habilitar o
acesso e concluir a publicação da oferta.

## Componentes

- `pmdf-access`: valida o token com Supabase Auth, exige e-mail confirmado e
  consulta a autorização atual antes de retornar status ou acervo.
- `pmdf-flashcards-webhook`: valida `X-HOTMART-HOTTOK`, restringe o produto e
  aplica aprovação ou revogação de forma atômica e idempotente.
- Schema `pmdf_private`: configuração, acervo, compras, eventos mínimos e
  concessões administrativas temporárias. Nenhuma tabela é acessível a `anon`
  ou `authenticated`. As RPCs públicas são `SECURITY INVOKER`, com execução
  concedida exclusivamente a `service_role`.
- Não há consulta nem alteração dos antigos `pmdf_progress` ou `pmdf_store_*`.

## Contrato do frontend

`POST /functions/v1/pmdf-access`, com `Authorization: Bearer <user JWT>`,
`apikey: <publishable key>` e JSON:

```json
{"action":"status"}
```

Resposta HTTP 200:

```json
{"active":true,"expires_at":"2027-05-25T12:00:00+00:00","server_time":"2026-11-25T12:00:00+00:00","reason":"active"}
```

`reason` pode ser `active`, `no_purchase`, `expired`, `revoked` ou `not_ready`.
`{"action":"catalog"}` retorna o JSON original no formato
`PMDF-ANKI-IMPORT-v1` somente quando o acesso está ativo. Sem autorização,
retorna HTTP 403 com `error: access_denied` e o status; autenticação inválida é
HTTP 401; e-mail não confirmado é HTTP 403 `email_not_verified`; indisponibilidade
é HTTP 503. As respostas usam `Cache-Control: private, no-store`.

O frontend deve limpar o acervo da memória ao sair ou perder acesso, não gravar
o acervo completo em armazenamento persistente, e revalidar o status ao retomar
a aba e periodicamente durante a revisão. O progresso pessoal pode continuar
armazenado localmente, separado por identidade. Uma cópia que o comprador já
exportou não pode ser apagada remotamente.

## Implantação

1. Revisar e aplicar `migrations/20261125192133_pmdf_flashcards_access.sql`.
   Ela cria a configuração com `enabled=false`; não habilita a venda nem
   contém dados de clientes ou cartões.
2. Importar o acervo a partir da cópia privada, com o script abaixo. As consultas
   produzidas são dados privados e devem ficar fora do checkout.
3. Configurar `hotmart_product_id='9071720'` na linha singleton de
   `pmdf_private.access_config`.
4. Configurar o **HOTTOK verdadeiro** por um canal administrativo seguro. Opção
   preferida: secret de Edge Function `HOTMART_HOTTOK`. Alternativa: guardar
   somente seu SHA-256 hexadecimal em `pmdf_private.access_config.hottok_sha256`.
   A variável de ambiente, quando presente, tem prioridade. Nunca colocar o
   token no frontend, nos logs, no Git ou em instruções do produto.
5. Configurar `PMDF_ALLOWED_ORIGINS` nas Edge Functions com a origem HTTPS exata
   da hospedagem definitiva; múltiplas origens são separadas por vírgula. O
   fallback atual corresponde ao endereço anterior do projeto. Uma origem
   não configurada recebe 403. O frontend é estático e pode ser publicado em
   hospedagem que permita o uso comercial pretendido.
6. Publicar `pmdf-access` e `pmdf-flashcards-webhook` com os arquivos relativos
   de `_shared`. Ambos têm `verify_jwt=false` porque fazem a autenticação
   explicitamente no corpo: Auth para o acesso e HOTTOK para o webhook. As
   chaves administrativas são lidas do ambiente da plataforma.
7. Confirmar Supabase Auth com **confirmação de e-mail ativada**, URL do site e
   URLs de retorno corretas. Configurar e testar SMTP próprio para confirmação
   de conta e recuperação de senha. O remetente padrão do Supabase tem
   restrições para produção e não deve ser presumido funcional para compradores.
8. Na Hotmart, criar webhook V2 **do produto 9071720**, para
   `/functions/v1/pmdf-flashcards-webhook`, com eventos de aprovação, compra
   completa, reembolso, chargeback, cancelamento, expiração e protesto. A
   compra principal 9062601 não concede acesso.
9. Validar o fluxo real: pagamento confirmado, e-mail confirmado, primeira
   entrada, catálogo, expiração e revogação. Um evento de teste que simula uma
   venda não equivale a uma compra real; remover suas concessões de teste antes
   de abrir vendas.
10. Somente depois de validar entrega, configurar `enabled=true` e concluir a
    publicação da oferta/Order Bump. Se faltar segredo, catálogo completo,
    confirmação de e-mail ou integração, o acesso permanece fechado.

### Importação íntegra do acervo

```sh
node supabase/scripts/prepare-catalog-import.mjs \
  --source /caminho/privado/anki.json \
  --out /caminho/privado/importacao
```

O script rejeita saída dentro do checkout, preserva os valores e a ordem dos
cartões, calcula SHA-256 do arquivo original e SHA-256 da representação JSONB
do PostgreSQL e produz consultas pequenas. Aplique os arquivos SQL em ordem,
com acesso administrativo (`execute_sql` no MCP). O primeiro desabilita o
acesso; o último confere a quantidade e o hash completo do payload. A validação
não ativa vendas automaticamente. Interrupções deixam o catálogo fechado.

### Acessos administrativos

`pmdf_private.access_grants` aceita concessão manual a um UUID real, tipo
`owner` ou `review`, motivo e vencimento obrigatório. É adequado para análise
do produto pela Hotmart sem forjar uma compra. Nenhum acesso administrativo é
criado pela migração. Não use senha compartilhada entre compradores.

## Garantias e limites

A primeira consulta autenticada associa compras não reclamadas ao UUID da
conta cujo e-mail foi confirmado. Uma troca de e-mail posterior não transfere
o direito a uma conta diferente. Eventos duplicados não duplicam compras;
`PURCHASE_COMPLETE` não renova o prazo; revogações são terminais para aquela
transação, mesmo quando chegam antes da aprovação. Uma nova compra, com nova
transação, pode conceder um novo prazo. Expiração é verificada no servidor em
cada consulta, sem depender do relógio do navegador ou de um cron.

Estas proteções controlam novas consultas à plataforma. Arquivos que antes
estavam públicos, cópias já baixadas e versões existentes no histórico de um
repositório público não ficam privados apenas pela remoção no commit atual.
O repositório que contém o histórico do acervo precisa de política de acesso
compatível com a comercialização antes de se anunciar exclusividade do
conteúdo.

## Verificação

```sh
npm run test:backend
```

Os testes exercitam parsing de eventos, validação de identidade, limites de
payload e um PostgreSQL embutido (PGlite) com a migração real, ACL/RLS,
idempotência, vínculo de compra, fim de mês, revogação e concessões temporárias.
Não alteram o projeto Supabase remoto.

Referências oficiais:

- [Hotmart: webhook de compras V2](https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/)
- [Supabase: Auth em Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase: SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
