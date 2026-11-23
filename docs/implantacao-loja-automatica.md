# Loja digital independente — Método PMDF

## Situação

Implementados: catálogo JSON, interface responsiva Navy & Gold, links condicionais para checkout Kiwify, validação de catálogo no build, cabeçalhos de segurança, configuração Netlify e QA do GitHub Actions.

Pendente de contas externas: validação de produtor Kiwify, produtos digitais próprios revisados e enviados à área de membros, checkout real, habilitação de afiliados, vínculo da conta Netlify ao repositório e teste de compra.

Todos os produtos estão propositalmente como rascunho, sem checkout. Não houve recebimento de pagamentos nem ativação automática de vendas.

## Passos para ativação externa

1. Validar uma conta de produtor Kiwify de titularidade do responsável e completar cadastro financeiro exigido pela plataforma.
2. Revisar/aprovar materiais originais ou expressamente licenciados para revenda, garantindo autoria, direitos autorais, ortografia e atualização normativa. Não usar apostilas de terceiros sem direitos comerciais.
3. Em Kiwify Produtos, criar cada oferta de entrega digital com Área de Membros Kiwify e carregar os arquivos revisados. Testar entrega e a correspondência exata entre descrição, conteúdo e preço.
4. Copiar o link verdadeiro de cada checkout em Produtos > Links. Deve usar https://pay.kiwify.com.br/ seguido do código do checkout.
5. No arquivo commerce/catalogo.json, alterar checkout_url para o link, direitos_verificados para true, entrega_configurada para true e status para publicado APENAS quando tudo estiver validado. O site bloqueia vendas de qualquer item que não satisfaça essas quatro condições.
6. Habilitar programa de afiliados no painel da Kiwify, configurar percentual e regras de aprovação; testar links de afiliados. Comissões e atribuições ficam sob controle da plataforma de pagamentos, não do HTML público.
7. Conectar o repositório completo metodopmdf/metodo-pmdf à sua conta Netlify: netlify.toml publica somente a pasta commerce. Usar URL Netlify ou domínio comercial independente. Não fazer e-commerce principalmente pelo GitHub Pages.
8. Ao liberar a venda de produto testado, atualizar a meta robots no commerce/index.html de noindex,nofollow para index,follow após revisar os textos legais, atendimento, reembolsos e política de privacidade apropriados.
9. Realizar compra real controlada e testar pagamento, entrega, acesso e reembolso. Verificar tarifas, impostos e custos da comissão antes de divulgar.

## Responsabilidades e segurança

- Não hospedar produtos pagos no repositório público: o acesso seria livre e irreversível.
- O checkout, a autenticação do comprador e a entrega são externos à loja. Nenhuma credencial, chave de API ou dado pessoal de cartão deve ser colocado no JavaScript público.
- A loja não precisa de webhook de pagamentos porque a Kiwify faz o checkout e a entrega em sua própria área de membros. Se o produto pago passar a ser desbloqueado dentro da plataforma de estudos, será necessário backend autenticado, webhook seguro e controles de acesso no servidor; NÃO conceder acesso por localStorage ou lógica no navegador.
- Acompanhar atualizações jurídicas, reclamações, estornos e links de checkout regularmente. Autonomia operacional não elimina obrigações legais e suporte.
- Os preços no catálogo são hipóteses de oferta. Antes de publicar, conferir valor de cada checkout.
- A validação automática do catálogo roda com node commerce/validar-catalogo.mjs e bloqueia deploy do Netlify se houver produto publicado com condições inválidas.

## Documentação oficial

- Cadastrar produto: https://ajuda.kiwify.com.br/pt-br/article/como-cadastrar-o-seu-produto-1lxh5g7/
- Anexar arquivos: https://ajuda.kiwify.com.br/pt-br/article/como-anexar-arquivos-1ivx4yd/
- Habilitar afiliados: https://ajuda.kiwify.com.br/pt-br/article/como-habilitar-o-programa-de-afiliados-no-seu-produto-yy0yt6/
- Checkout: https://ajuda.kiwify.com.br/pt-br/article/como-pegar-o-link-de-checkout-do-meu-produto-a4ufaa/
- Limites GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
