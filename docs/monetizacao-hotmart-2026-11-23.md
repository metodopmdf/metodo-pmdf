# Método PMDF — ativação comercial com Hotmart e Supabase

**Situação deste pacote (atualizada em 23/11/2026):** a migração comercial foi executada no projeto Supabase `wskuhkvgipqwykbnuspk`, e as Edge Functions `pmdf-checkout` e `pmdf-hotmart-webhook` estão ativas e correspondem ao código da branch `main`. Isso ainda NÃO implica conta de pagamentos criada, checkout aprovado ou oferta aberta. Os três produtos permanecem com `status='draft'`, sem gateway cadastrado e sem pedidos, e não podem receber compras até habilitação explícita. Preserve a plataforma gratuita e os arquivos existentes.

### Verificação da implantação

- RLS está ativa em todas as seis tabelas comerciais; `anon` e `authenticated` não executam a função de reconciliação.
- O checkout responde `403` quando a origem não está autorizada.
- O webhook responde `503 not_configured` enquanto `HOTMART_HOTTOK` não estiver configurado.
- Ainda faltam `HOTMART_HOTTOK`, `PMDF_COMMERCE_ALLOWED_ORIGINS`, produto e checkout reais, hospedagem comercial e homologação de compra/reembolso.
- O painel de segurança do Supabase ainda recomenda habilitar proteção contra senhas vazadas em Auth.

## Registro de implantação em 23/11/2026

- **Projeto Supabase confirmado:** `wskuhkvgipqwykbnuspk` (Metodo PMDF).
- **Migração aplicada no banco de produção:** `comercio_hotmart_20261123`. As seis tabelas comerciais existem e estão com RLS habilitada. Nenhum produto foi ativado, nenhum gateway foi cadastrado e nenhum pedido foi gerado.
- **Funções implantadas:** `pmdf-checkout` (v1) e `pmdf-hotmart-webhook` (v1), ambas `ACTIVE`. Elas realizam autenticação própria por usuário ou token Hottok e devem permanecer fechadas enquanto as variáveis de configuração estiverem ausentes.
- **Verificações de autorização:** `anon` e `authenticated` sem execução da reconciliação privilegiada; `anon` sem permissão de inserir pedidos; `authenticated` sem permissão de atualizar entitlements; a função `rls_auto_enable` deixou de ser executável por visitantes.
- **Pendências externas obrigatórias:** cadastro e validação do produtor, checkout/ID real da oferta, envio de arquivo licenciado, `HOTMART_HOTTOK`, `PMDF_COMMERCE_ALLOWED_ORIGINS`, URL da hospedagem comercial e teste real de compra/aprovação/reembolso.
- **Aviso do Security Advisor:** proteção contra senhas vazadas desativada no Auth; avaliar a opção na configuração do projeto. Duas tabelas de servidor (`pmdf_store_gateways` e `pmdf_store_webhook_events`) aparecem como RLS sem políticas por desenho, pois não devem ser acessíveis por clientes externos.
- **Status:** infraestrutura implantada, comercialização ainda desativada. Não declarar o sistema 100% operacional sem os passos pendentes e homologação ponta a ponta.

## Arquitetura e arquivos

- `comercial.html`: vitrine independente Navy & Gold; integra somente vendas confirmadas.
- `assets/pmdf-comercial.js`, `assets/pmdf-comercial.css`: catálogo público, sessão, chamada ao checkout, consulta de direitos.
- `supabase/migrations/20261123_comercio_hotmart.sql`: produtos, gateways, checkout intents, pedidos, entitlements, eventos e RLS.
- `supabase/functions/pmdf-checkout/index.ts`: valida autenticação, produto, host do checkout, cria referência aleatória SCK de 24 dígitos hexadecimais para vincular venda à conta.
- `supabase/functions/pmdf-hotmart-webhook/index.ts`: valida Hottok, aplica eventos reais por função SQL transacional, protege contra eventos duplicados e revogação.
- `netlify.toml`: políticas de cabeçalho e deploy de site estático para fins comerciais.

## Pré-condições não automatizáveis por esta branch

1. Criar/validar uma conta de produtor na **Hotmart**, com seus dados de identificação, aceite contratual e recebimento (não enviar senhas ou tokens pelo chat). A plataforma pode exigir verificação e aprovação de produto.
2. Possuir direitos de comercialização sobre todos os materiais; aprovar o conteúdo (questões autorais/revisadas e legislação atual). Para PDF avulso, cadastrar o arquivo **na Hotmart**, em armazenamento/área de membros privada, jamais no repositório público.
3. Informar no checkout e no site comercial a **identificação completa do fornecedor (nome empresarial/nome civil, CPF ou CNPJ conforme aplicável, endereço físico e eletrônico, suporte)**, preço, conteúdo, termos de compra, tratamento de dados e reembolso/arrependimento. Preencher esses dados verdadeiros em `termos-venda.html` antes de ativar os produtos, conforme a legislação de comércio eletrônico. O material deve informar que NÃO é material oficial da PMDF.
4. Criar um site comercial na **Netlify** (plano gratuito sujeito a limites), mantendo GitHub Pages exclusivamente para a versão gratuita. **A configuração `netlify.toml` atual publica a pasta `commerce/`**, que é uma loja independente com checkout **Kiwify**, preservada de outra implementação no repositório principal. Ela permite vender PDF com entrega nativa e dispensa as funções de pagamento do Supabase. A vitrine Hotmart descrita neste documento (`comercial.html`) faz parte do **segundo fluxo**, de integração às contas; para publicá-la será necessário um deploy separado com raiz do repositório como diretório de publicação ou uma unificação de vitrines aprovada. Não tente abrir dois gateways para o mesmo produto sem definir a entrega e o atendimento. GitHub Pages não é hospedagem apropriada para e-commerce/SaaS.

**Escolha operacional recomendada:** começar com os produtos avulsos pela loja `commerce/` + Kiwify, e só depois habilitar Hotmart para planos associados à conta. Se optar por usar exclusivamente Hotmart, configure o deploy e os produtos correspondentes e mantenha a loja Kiwify em rascunho.

## Configuração no Supabase

1. A migração `supabase/migrations/20261123_comercio_hotmart.sql` já foi aplicada ao projeto utilizado pela aplicação, seguida da migração de índices `20261123_comercio_hotmart_indexes.sql`. Em outro ambiente, faça backup e aplique essas migrações na ordem; NÃO rode no Supabase de outro aplicativo.
2. Verifique RLS: usuário anônimo vê apenas produtos ativos; usuário A não acessa intents, pedidos ou entitlements do usuário B; `anon` e `authenticated` não inserem nem alteram nenhuma dessas tabelas; tabela `pmdf_store_gateways` e eventos privados não são legíveis pelo cliente.
3. Na Hotmart, cadastre o produto real, configure preço e entrega, copie o **ID real do produto** e o **link oficial de checkout** (`https://pay.hotmart.com/...`). Não substitua por URL fictícia.
4. No SQL Editor, registre o gateway como `postgres`/admin e ative SOMENTE o produto publicado:

```sql
insert into public.pmdf_store_gateways(product_slug,hotmart_product_id,checkout_url)
values('questoes-comentadas', 'ID_REAL_HOTMART', 'https://pay.hotmart.com/LINK_REAL')
on conflict(product_slug) do update set
hotmart_product_id=excluded.hotmart_product_id,checkout_url=excluded.checkout_url;
update public.pmdf_store_products
set status='active',updated_at=now() where slug='questoes-comentadas';
```

5. Configure os **Secrets** de Edge Functions do projeto: `HOTMART_HOTTOK` (obtido na Hotmart) e `PMDF_COMMERCE_ALLOWED_ORIGINS` (URL exata do site comercial, sem barra final; múltiplas origens separadas por vírgulas). Exemplo: `https://SEU-SITE.netlify.app`. **Não use localhost, `*`, nem a origem de GitHub Pages em produção.** O Supabase fornece `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` para o runtime; verifique a disponibilidade no projeto.
6. Implante as funções com o Supabase CLI, após login local autorizado:

```bash
supabase login
supabase link --project-ref wskuhkvgipqwykbnuspk
supabase functions deploy pmdf-checkout --no-verify-jwt
supabase functions deploy pmdf-hotmart-webhook --no-verify-jwt
```

O checkout desativa validação JWT automática somente porque valida o **token de usuário no Auth API**; o webhook não usa JWT de candidato, pois utiliza o cabeçalho secreto `X-HOTMART-HOTTOK`. Não há endpoint público para alterar acesso premium.

## Webhook na Hotmart (versão 2.0.0)

- URL: `https://wskuhkvgipqwykbnuspk.supabase.co/functions/v1/pmdf-hotmart-webhook`
- Selecionar eventos de **compra aprovada, estorno/reembolso, chargeback e cancelamento**.
- O checkout autenticado adiciona `sck=<token-de-24-caracteres>`. A versão 2.0.0 do webhook deve devolver esse valor em `data.tracking.source_sck` (confirme no teste de ponta a ponta).
- `data.purchase.transaction` e `data.product.id` também são validados. Compra sem referência SCK correspondente **não concede automaticamente acesso no site**, embora a Hotmart continue entregando materiais dentro do seu ambiente.
- Eventos repetidos retornam `duplicate`; transações estornadas não voltam a ser aprovadas por repetição antiga da mesma transação. Eventos com referência não vinculada retornam `unmatched_intent`.
- Retorno `missing_billing_expiry` significa que **não foi possível determinar uma validade segura para assinatura**, portanto o acesso não será concedido automaticamente. Não lance `premium-mensal` até validar a data de cobrança/renovação e o comportamento de cancelamento da oferta real.
- Apenas metadados mínimos de transação e reconciliação são persistidos; não grave CPF, senha ou payload integral da Hotmart.

## Testes obrigatórios antes de ativar uma oferta

1. Teste o site no Netlify em mobile e desktop. Faça login real na conta do Método PMDF; entre em `comercial.html`; antes de ativar os produtos, nenhum botão de compra deve existir.
2. Crie um produto real de baixo valor; com o ID/link real, ative-o. Clique em Comprar; o endereço deverá ser `pay.hotmart.com`, com parâmetro `sck` e `utm_source=metodopmdf`.
3. Realize **uma compra aprovada de teste que seja processada pela Hotmart**, conforme as ferramentas disponíveis em sua conta. Verifique uma linha em `pmdf_store_orders` e o direito em `pmdf_store_entitlements`; confirme que a Hotmart liberou o PDF/área de membros.
4. Confirme o webhook para uma compra **com estorno/cancelamento** em ambiente controlado e verifique revogação do acesso da mesma transação; teste entrega, direitos do consumidor e atendimento. Não reembolse/transacione apenas para simular faturamento.
5. Faça tentativas com checkout de ID desconhecido, usuário sem login, evento Hottok errado, SCK aleatório, ID de produto distinto, webhook repetido, compra de outra conta e chamadas REST anônimas de escrita. Todas devem falhar sem liberar benefícios.
6. Antes de liberar assinaturas, teste renovação, atraso, cancelamento ao fim do período pago e possíveis múltiplas transações/ordens fora de sequência. O código atual é conservador: **não vende a assinatura por padrão**.

## Limitações importantes

- Não inclui ou cria produtos reais, contas na Hotmart, dados bancários, tributos, nota fiscal ou obrigações de SAC. Estes passos dependem do titular.
- Não inclui automaticamente PDF comercial; publicar arquivos premium em `assets` tornaria o material baixável por qualquer visitante. O PDF deve estar configurado na Hotmart.
- O usuário continua utilizando **nome de usuário e senha**, mas a conta existente depende das configurações de Supabase Auth. Sem recuperação por e-mail, o procedimento de suporte deve ser definido antes do lançamento.
- Transação externa sem a referência de checkout autenticado não será vinculada automaticamente à plataforma. Entrega nativa da Hotmart não depende dessa vinculação.
- **SEO:** `comercial.html` e Netlify começam com `noindex` para não indexar ofertas inativas. Antes de lançar a loja oficial, remova `noindex` do HTML e da regra de headers `netlify.toml`; atualize também o canonical da página principal para a URL definitiva do site comercial.
- O SQL é uma nova migração: confirmar no banco remoto se foi executada, e se há conflito com outras alterações, antes de efetivar a abertura comercial.
- Nenhuma promessa de venda, rendimento ou gratuidade ilimitada; há tarifas de transação e cotas de serviços gratuitos.

## Links oficiais

- Checkout e rastreamento SCK: https://suportehotmart.zendesk.com/hc/pt-br/articles/216441797-Como-identificar-a-origem-das-minhas-vendas-na-Hotmart
- Eventos do webhook V2: https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/
- Functions deployment: https://supabase.com/docs/guides/functions/deploy
- GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
