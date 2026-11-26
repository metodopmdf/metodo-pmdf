# Método PMDF — Flashcards Estratégicos

Plataforma de revisão com acervo Anki, filtros, repetição espaçada e exportação, com acesso individual vinculado à compra Hotmart.

## Oferta

- Produto Hotmart: `9071720`.
- Valor: **R$ 39,99**, pagamento único.
- Prazo: **6 meses**, contados da aprovação da compra pelo servidor.
- Produto principal complementar: Método PMDF — Preparação Estratégica para Soldado (`9062601`).
- A compra das apostilas, isoladamente, não libera o produto de flashcards.

## Acesso do aluno

1. Criar a conta com o mesmo e-mail usado na compra.
2. Confirmar o e-mail pelo link recebido.
3. Entrar com e-mail e senha.
4. A plataforma consulta o servidor e carrega o catálogo somente se existir uma compra ativa.

A interface oferece recuperação de senha. Os links de confirmação e recuperação devem ser abertos no navegador que iniciou o processo, pois a autenticação usa PKCE. A disponibilidade dos e-mails depende da configuração SMTP do projeto Supabase.

A aplicação usa o SDK oficial `@supabase/supabase-js`, fixado na versão **2.119.2** e distribuído localmente. A configuração pública fica em `assets/pmdf-access-config.js`; ela contém apenas a URL do projeto, uma chave publicável, o identificador do produto e o checkout. Nenhum segredo Hotmart ou chave de serviço pertence ao frontend.

O checkout verificado é `https://pay.hotmart.com/X108664161M`. O botão Comprar acesso permanece desativado enquanto `salesEnabled` não for `true`, mesmo com o link configurado. O produto está em rascunho; habilite as vendas somente depois de validar a entrega e concluir a configuração Hotmart.

## Estado da implantação em 25/11/2026

O backend foi provisionado no Supabase com o acervo privado completo e as duas funções de acesso/webhook publicadas. A autorização permanece desativada (`enabled=false`), o HOTTOK não foi configurado e nenhuma compra ou concessão de teste foi criada. As verificações remotas confirmaram o bloqueio de requisições sem autorização e os hashes do acervo. Os detalhes estão em `supabase/README.md`.

A confirmação obrigatória de e-mail está ativada no painel Auth. O SMTP próprio permanece desativado. A migração `20261125201746_pmdf_legacy_email_guard.sql` foi aplicada e `pmdf-access` está na versão 2. O corte de verificação é `2026-11-25T19:39:17Z`: as oito contas legadas retornam `email_reverification_required`, sem reivindicar compras ou contornar a barreira com concessões. Não foram criadas exceções, alteradas contas ou enviadas mensagens. O acesso comercial continua desativado (`enabled=false`).

O frontend está preparado para uma nova hospedagem. O login no Netlify não foi concluído: a tentativa expirou sem uma sessão autenticada, e nenhum deploy do frontend foi concluído nesta etapa. A oferta permanece em rascunho. Ainda faltam SMTP e URLs de retorno do Auth, HOTTOK, hospedagem definitiva, configuração do webhook e da entrega Hotmart, tratamento da exposição no histórico público e validação completa de um comprador antes do lançamento.

## Proteção do acervo

O catálogo comercial **não faz parte da publicação estática**. O endpoint `pmdf-access` valida a sessão, a confirmação do e-mail e o direito de acesso no servidor antes de devolver cartões.

- `POST {"action":"status"}` informa se a compra está ativa e quando expira.
- `POST {"action":"catalog"}` entrega o catálogo apenas quando o acesso está ativo.
- As requisições enviam o JWT do aluno e a chave publicável; as respostas privadas usam `Cache-Control: no-store`.
- O cliente revalida o acesso a cada 30 segundos enquanto visível, ao retomar a aba e ao recuperar a conexão. Sem nova validação, a autorização local vence em até 60 segundos. A expiração do prazo é calculada a partir do horário fornecido pelo servidor.
- Logout, revogação, falha de validação e expiração removem os cartões da interface e da memória do catálogo. As APIs continuam sendo a autoridade mesmo que alguém modifique o JavaScript local.
- Reembolso e chargeback são tratados no backend. A lógica detalhada está em `supabase/`.

Arquivos exportados pelo aluno não podem ser revogados depois do download. A proteção impede novos acessos ao serviço; ela não é DRM sobre cópias já obtidas.

O repositório antigo publicou o acervo completo no histórico. Remover o JSON da versão atual não remove os commits anteriores. A visibilidade do repositório e a hospedagem precisam ser adequadas antes do lançamento comercial.

## Acervo preservado

A migração foi preparada a partir de **2.624 cartões**, **22 disciplinas** e **130 combinações de disciplina e assunto**. Os IDs, a ordem e os textos são preservados.

SHA-256 esperado do arquivo original:

```text
124e9f0f3b811a7b379fd0a4da2bc9fc8a55213bd1571bca61521a5803d191ae
```

A revisão jurídica anterior foi dirigida e não certifica a exatidão ou vigência de todo o acervo. Os avisos e referências existentes nos cartões continuam sendo apresentados.

## Recursos de estudo

- Base pronta, sem necessidade de colar lei ou enviar arquivos.
- Filtros por disciplina e assunto.
- Revisão frente/verso, treino livre e lotes de 25, 50, 100, 200 ou todos os cartões.
- Caixas Leitner, com avaliações Errei, Difícil, Bom e Fácil.
- Exportação Anki Basic/Cloze, CSV/TSV e backup JSON dos cartões.
- Criação opcional de baralhos pessoais a partir de texto, TXT, Markdown, JSON, PDF textual ou DOCX.
- Interface responsiva e temas claro/escuro.

Os documentos pessoais são processados no navegador; leitores de PDF/DOCX são carregados da própria aplicação, sob demanda, e nenhum documento pessoal é enviado para processamento externo. PDFs sem texto extraível não recebem OCR.

## Progresso e privacidade local

O progresso e os baralhos pessoais são separados por ID do usuário autenticado. Uma conta não herda a sessão de estudo de outra conta no mesmo navegador. Os registros globais de versões antigas não são importados automaticamente, pois não permitem identificar seu proprietário com segurança.

O progresso continua local ao navegador, sem sincronização entre dispositivos. O backup JSON guarda cartões e metadados; ele não inclui os agendamentos de revisão. O logout limpa os cartões em memória e preserva o progresso da conta para uma próxima entrada no mesmo navegador.

## Desenvolvimento

A validação desta preparação passou em **25 testes backend/SQL** e no QA de acesso em Chromium, incluindo o bloqueio das contas legadas. A renomeação da migração preserva o mesmo conteúdo SQL já testado.

Requer Node.js 22.13 ou superior.

```sh
npm ci
npm run vendor:auth
npm test
npm run test:backend
npx playwright install chromium
npm run test:browser
npm run build
```

`npm run build` publica `index.html`, os arquivos permitidos de `assets/` e os leitores PDF/DOCX fixados no lock em `dist/`. Backend, testes e acervo privado não entram no resultado. A configuração `netlify.toml` está preparada para utilizar esse diretório; outras hospedagens estáticas devem fazer o mesmo.

Os testes normais usam exclusivamente um catálogo sintético, sem conteúdo comercial. Os testes de navegador interceptam a API em seu próprio contexto de teste e usam o SDK real; não existe atalho de acesso no código de produção.

Para verificar novamente a integridade de uma cópia privada do catálogo, informe o caminho do arquivo somente ao processo de teste:

```sh
PMDF_PRIVATE_CATALOG=/caminho/privado/anki.json node tests/anki-catalog.test.cjs
```

Não copie esse arquivo para `assets/`, fixtures, commits ou artefatos públicos. `PMDF_CHROMIUM_PATH` permite usar um executável de Chromium instalado para QA.

## Itens necessários para o lançamento

- Configurar a URL definitiva do site nas URLs permitidas de autenticação.
- Manter a confirmação de e-mail ativada e configurar/testar SMTP apropriado para compradores externos.
- Conferir a implantação das funções e da estrutura já provisionadas, conforme `supabase/`.
- Manter o acervo privado e confirmar os hashes após qualquer nova importação.
- Vincular o webhook ao produto **9071720**, com segredo mantido exclusivamente no servidor.
- Configurar a área de membros externa e concluir a verificação Hotmart.
- Publicar o Order Bump no checkout das apostilas depois da validação de acesso, entrega e reembolso.

O status desses itens deve ser conferido na implantação. A existência do código local não comprova que uma integração esteja ativa em produção.
