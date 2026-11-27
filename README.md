# Método PMDF — Flashcards Anki

Aplicação do Método PMDF dedicada exclusivamente aos flashcards, com a **base
Anki carregada automaticamente**, revisão.

**Site:** https://metodopmdf.github.io/metodo-pmdf/

A ferramenta foi extraída do projeto completo, a partir do commit
`08bdb149428459583d170287feac5960519cffa9`, e passou a ser a aplicação principal
do repositório.

Esta versão reúne **criação e revisão de flashcards**. Os motores de
geração e os estilos dos cartões foram reaproveitados do projeto original, com
um controlador próprio e somente suas dependências necessárias.

O acervo contém **2.624 cartões, 22 disciplinas e 130 combinações de disciplina
e assunto**. O arquivo `assets/bancos/anki.json` mantém os identificadores, a ordem
e a estrutura do catálogo original. Cartões selecionados receberam correções
com fontes em 25/11/2026; as demais entradas foram mantidas. Para estudar essa base, basta
selecionar a disciplina e o assunto e iniciar uma revisão.

## Usar

Não é necessário compilar, cadastrar uma conta ou configurar chaves de API.

1. Clone o repositório:

   ```bash
   git clone https://github.com/metodopmdf/metodo-pmdf.git flashcards
   cd flashcards
   ```

2. Sirva a pasta com um servidor estático. Por exemplo, com Python:

   ```bash
   python -m http.server 8000
   ```

3. Abra [http://localhost:8000](http://localhost:8000).
4. Aguarde o carregamento automático da base Anki. Selecione uma disciplina e
   um assunto, ou mantenha o acervo completo.
5. Escolha **Novos e vencidos** ou **Todos (treino livre)**, o tamanho do lote e
   clique em **Iniciar revisão**.

O painel **Criar flashcards com meu material — Opcional** mantém a criação de
um baralho pessoal a partir de texto ou arquivo. Não é necessário abri-lo para
estudar a base Anki. **Usar base Anki** retorna ao acervo após um baralho pessoal;
**Retomar meu baralho salvo** recupera o material pessoal do navegador.

O fluxo textual usa apenas arquivos locais da aplicação. Para ler PDF ou DOCX,
o navegador baixa o leitor correspondente de `cdnjs.cloudflare.com` quando
necessário. Os documentos são processados no navegador.

## Funcionalidades

- Acervo Anki integrado, com carregamento automático do próprio site.
- Filtros por disciplina e assunto; enunciado, gabarito e comentário do acervo.
- Texto colado e arquivos TXT, Markdown, JSON, PDF textual e DOCX.
- Perguntas e respostas, lacunas Cloze ou formato misto.
- Referência ao trecho de origem, dicas e observações herdadas dos motores.
- Cancelamento sem substituir o baralho anterior.
- Revisão frente/verso, navegação e quatro avaliações: Errei, Difícil, Bom e Fácil.
- Caixas Leitner com os intervalos originais de 1, 3, 7 e 14 dias; avaliação
  Difícil agenda a revisão para 12 horas e Errei deixa o cartão disponível.
- Seleção de cartões novos/vencidos ou treino livre, com lotes de 25, 50, 100,
  200 ou todos. O treino livre percorre o acervo em sequência e mantém uma posição
  independente para cada seleção de disciplina e assunto.
- Recuperação do último baralho, rascunho, sessão e progresso neste navegador.
- Interface responsiva, tema claro/escuro e navegação por teclado.

### Importação

| Formato | Uso |
| --- | --- |
| TXT / MD | Texto-base para geração |
| PDF / DOCX | Extração textual local; leitor baixado sob demanda |
| JSON de guia | Estrutura original com `lawName` e `articlesMapping` |
| JSON com `text` e `title` | Texto-base com título opcional |
| JSON `PMDF-FLASHCARDS-v1` | Backup dos cartões, reaberto sem geração |
O JSON é aceito somente para importar um baralho salvo anteriormente.
O site não oferece exportação de cartões. O catálogo continua público e é carregado pelo navegador.

Limites de entrada: TXT/MD de até 2 MiB; JSON/PDF/DOCX de até 12 MiB; texto
extraído de até 2 Mi caracteres; PDF de até 80 páginas. Os limites produzem uma
mensagem explícita, sem cortar o restante do arquivo silenciosamente.
PDFs protegidos ou páginas sem texto extraível precisam de uma versão textual.
Não há OCR nesta extração.

### Base Anki

A base é publicada junto com a aplicação em `assets/bancos/anki.json`; não
depende de envio de arquivos, geração de perguntas ou conexão a banco remoto.
O teste de integridade confere o SHA-256 integral do arquivo publicado:
`124e9f0f3b811a7b379fd0a4da2bc9fc8a55213bd1571bca61521a5803d191ae`.

As observações sobre vigência jurídica, trechos incompletos, imagens ausentes e
as fontes estão nos próprios cartões. A atualização de 25/11/2026 foi dirigida e
não certifica a vigência ou a exatidão de todo o acervo.

### Como funciona a geração opcional

O código original reconhece padrões em português: definições, competências,
prazos, condições e outras relações explícitas no texto. Um pequeno
classificador local atribui escores de apoio.

**Não é um modelo generativo nem uma API de IA.** A ferramenta não cria fatos
ausentes da fonte e não garante cartões para todos os trechos. A cobertura
mostrada na interface permite conferir quantos trechos produziram cartões.
Revise o conteúdo gerado, especialmente a redação vigente de material jurídico.

## O que foi extraído

| Arquivo | Responsabilidade |
| --- | --- |
| `index.html` | Interface exclusiva de flashcards |
| `assets/bancos/anki.json` | Base Anki com IDs originais e correções documentadas |
| `assets/pmdf-anki-catalog.js` | Carregamento, filtros e adaptação dos cartões do acervo |
| `assets/pmdf-flashcards-app.js` | Criação, estado, revisão, persistência e eventos |
| `assets/pmdf-flashcard-classifier.js` | Classificador extraído do módulo compartilhado |
| `assets/pmdf-neural-flashcards.js` | Motor original de lacunas, conceitos e contrastes |
| `assets/pmdf-flashcards-perguntas.js` | Motor original de perguntas e seleção de formato |
| `assets/pmdf-flashcard-io.js` | Entrada de arquivos e normalização |
| `assets/pmdf-flashcard-migration.js` | Recuperação local da sessão anterior e dos agendamentos dos IDs do acervo |
| `assets/pmdf-flashcards-standalone.css` | Estrutura e temas da aplicação independente |
| `assets/pmdf-flashcards-visual.css` | Estilos originais dos cartões, com regras alheias removidas |
| `assets/pmdf-flashcards-questions.css` | Apresentação original das perguntas de flashcards |

Foram retirados da versão isolada os módulos de questões e simulados, mapeamento
e resumos, mapas mentais, redação, infográficos, banco de questões, loja, pagamentos,
autenticação, funções de backend, migrações e workflows correspondentes.
`pmdf-flashcards-perguntas.js` contém **perguntas de flashcards**, não a ferramenta
de questões de múltipla escolha.

A dependência do gerador no módulo de questões foi substituída pelo classificador
isolado, preservando a rede e os recursos originais. O modo Cloze foi corrigido
para retornar somente lacunas, e o modo misto aproveita lacunas válidas mesmo
quando o texto não produz perguntas estratégicas.

## Dados e segurança

Os arquivos são lidos localmente, e a aplicação não usa conta, banco remoto ou
envio do material a APIs. O armazenamento usa chaves próprias. Outro domínio,
navegador ou dispositivo tem armazenamento separado. Se o navegador bloquear
o armazenamento ou atingir sua capacidade, a interface avisa que os cartões ficam disponíveis apenas enquanto a página estiver aberta.

Na primeira abertura, quando ainda não existe um baralho desta versão, o criador
tenta recuperar os cartões e agendamentos da sessão antiga salva neste mesmo
navegador. Usa apenas a conta identificada na sessão local anterior ou, na
ausência dela, os registros de visitante de versões antigas. Não percorre outras
contas, não usa tokens nem consulta serviços remotos, e mantém os registros
originais. Um baralho desta versão que já esteja salvo tem prioridade.

A recuperação cobre somente os cartões que a versão antiga havia gravado na
sessão de revisão, limitada ao lote selecionado. Ela não recupera cartões que
nunca foram salvos, nem dados existentes apenas na nuvem ou em outro navegador.

O catálogo completo é carregado independentemente dessa sessão: um lote antigo
de 25 ou 50 cartões não limita o acesso aos 2.624 do acervo. Os agendamentos dos
demais IDs também são recuperados dos registros locais compatíveis, com prioridade
para as avaliações já gravadas pela nova versão.

O progresso da base Anki usa armazenamento separado do baralho pessoal. Guarda
filtros, posições dos lotes, agendamentos e IDs da sessão, sem duplicar os textos
do acervo no armazenamento do navegador. O baralho pessoal permanece disponível
ao alternar para a base Anki.

Texto e metadados importados são escapados na apresentação, inclusive os trechos
ao redor das lacunas. A política de conteúdo não permite handlers inline nem
avaliação dinâmica; o leitor PDF também recebe `isEvalSupported: false`.

## Verificar o código

Requer Node.js 22 ou superior. Os testes de unidade não precisam de dependências:

```bash
npm test
```

Para os testes reais de navegador:

```bash
npm ci
npx playwright install chromium
npm run test:browser
```

A suíte inicia seu próprio servidor local, testa o acervo sem entrada de texto,
os filtros, as revisões e o fluxo pessoal em desktop e celular e
salva capturas em `test-artifacts/`. `PMDF_TEST_URL` permite apontar para outro
servidor; `PMDF_CHROMIUM_PATH` permite escolher um Chromium instalado.

O workflow `.github/workflows/qa.yml` executa esses testes no GitHub Actions.
Ele não publica o site e não chama serviços de pagamento ou banco de dados.

## Publicação

A pasta pode ser publicada em qualquer hospedagem de arquivos estáticos.
O `netlify.toml` aponta para a raiz e não exige build. No GitHub Pages, a aplicação
fica na raiz do branch `main`, no endereço informado acima.

O branch `main` contém exclusivamente os flashcards e seus arquivos de apoio.
A versão completa anterior continua disponível no histórico, no commit
`08bdb149428459583d170287feac5960519cffa9`. A recuperação de progresso é local;
esta atualização não executa migrações nem altera dados em serviços remotos.
