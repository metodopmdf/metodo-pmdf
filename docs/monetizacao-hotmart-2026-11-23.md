# Método PMDF — ativação comercial com Hotmart e Supabase

**Situação deste pacote:** código pronto para revisão e integração; NÃO implica conta de pagamentos criada, checkout aprovado, migração executada nem webhook implantado. Os três produtos são inseridos com `status='draft'` e não podem receber compras até habilitação explícita. Preserve a plataforma gratuita e os arquivos existentes.

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
4. Criar um site comercial na **Netlify** (plano gratuito sujeito a limites): conectar GitHub > este repositório, branch de lançamento aprovada, comando de build vazio, diretório de publicação `.`. Mantenha GitHub Pages para versão gratuita ou retire o deploy antigo ao transferir tudo: GitHub Pages não é hospedagem apropriada para SaaS/e-commerce.

## Configuração no Supabase

1. No projeto já utilizado pela aplicação (mesma URL em `assets/pmdf-app.js`), faça backup e rode `supabase/migrations/20261123_comercio_hotmart.sql` no SQL Editor. NÃO rode no Supabase de outro aplicativo.
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
