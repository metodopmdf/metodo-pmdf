# Método PMDF — Criador de Flashcards

Versão independente da ferramenta de criação de flashcards extraída de
[metodopmdf/metodo-pmdf](https://github.com/metodopmdf/metodo-pmdf), a partir do
commit `08bdb149428459583d170287feac5960519cffa9`.

Esta versão reúne **criação, revisão e exportação de flashcards**. Os motores de
geração e os estilos dos cartões foram reaproveitados do projeto original, com
um controlador próprio e somente suas dependências necessárias.

## Usar

Não é necessário compilar, cadastrar uma conta ou configurar chaves de API.

1. Baixe este branch ou clone o repositório:

   ```bash
   git clone --branch flashcards-standalone-20261124 --single-branch https://github.com/metodopmdf/metodo-pmdf.git flashcards
   cd flashcards
   ```

2. Sirva a pasta com um servidor estático. Por exemplo, com Python:

   ```bash
   python -m http.server 8000
   ```

3. Abra [http://localhost:8000](http://localhost:8000).
4. Cole um texto ou importe um arquivo, escolha o formato e clique em **Criar
   flashcards**. O botão **Usar exemplo** carrega um regulamento fictício.
5. Inicie uma revisão ou baixe o baralho.

O fluxo textual usa apenas arquivos locais da aplicação. Para ler PDF ou DOCX,
o navegador baixa o leitor correspondente de `cdnjs.cloudflare.com` quando
necessário. Os documentos são processados no navegador.

## Funcionalidades

- Texto colado e arquivos TXT, Markdown, JSON, PDF textual e DOCX.
- Perguntas e respostas, lacunas Cloze ou formato misto.
- Referência ao trecho de origem, dicas e observações herdadas dos motores.
- Cancelamento sem substituir o baralho anterior.
- Revisão frente/verso, navegação e quatro avaliações: Errei, Difícil, Bom e Fácil.
- Caixas Leitner com os intervalos originais de 1, 3, 7 e 14 dias; avaliação
  Difícil agenda a revisão para 12 horas e Errei deixa o cartão disponível.
- Seleção de cartões novos/vencidos ou treino livre, com lotes de 25, 50, 100 ou
  todos. Lotes de treino livre percorrem o baralho em sequência.
- Recuperação do último baralho, rascunho, sessão e progresso neste navegador.
- Exportação para Anki Basic/Cloze, planilhas CSV/TSV e backup JSON dos cartões.
- Interface responsiva, tema claro/escuro e navegação por teclado.

### Importação e exportação

| Formato | Uso |
| --- | --- |
| TXT / MD | Texto-base para geração |
| PDF / DOCX | Extração textual local; leitor baixado sob demanda |
| JSON de guia | Estrutura original com `lawName` e `articlesMapping` |
| JSON com `text` e `title` | Texto-base com título opcional |
| JSON `PMDF-FLASHCARDS-v1` | Backup dos cartões, reaberto sem geração |
| Anki Basic `.txt` | Somente cartões sem lacunas |
| Anki Cloze `.txt` | Somente cartões com marcação `{{c1::...}}` |
| CSV / TSV | Todos os cartões, incluindo fonte e tags |

No Anki, importe os arquivos Basic e Cloze separadamente. Os arquivos incluem
cabeçalhos com separador de tabulação, tipo de nota, colunas, baralho e
`#html:false`; confirme o tipo correspondente na sua instalação do Anki.
CSV/TSV usam escape de aspas e proteção contra fórmulas de planilha.

O backup JSON guarda os cartões e seus metadados. **O agendamento e o progresso
da revisão permanecem no navegador e não fazem parte desse backup.**

Limites de entrada: TXT/MD de até 2 MiB; JSON/PDF/DOCX de até 12 MiB; texto
extraído de até 2 Mi caracteres; PDF de até 80 páginas. Os limites produzem uma
mensagem explícita, sem cortar o restante do arquivo silenciosamente.
PDFs protegidos ou páginas sem texto extraível precisam de uma versão textual.
Não há OCR nesta extração.

### Como funciona a geração

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
| `assets/pmdf-flashcards-app.js` | Criação, estado, revisão, persistência e eventos |
| `assets/pmdf-flashcard-classifier.js` | Classificador extraído do módulo compartilhado |
| `assets/pmdf-neural-flashcards.js` | Motor original de lacunas, conceitos e contrastes |
| `assets/pmdf-flashcards-perguntas.js` | Motor original de perguntas e seleção de formato |
| `assets/pmdf-flashcard-io.js` | Entrada de arquivos, normalização e exportação |
| `assets/pmdf-flashcards-standalone.css` | Estrutura e temas da aplicação independente |
| `assets/pmdf-flashcards-visual.css` | Estilos originais dos cartões, com regras alheias removidas |
| `assets/pmdf-flashcards-questions.css` | Apresentação original das perguntas de flashcards |

Foram retirados da versão isolada os módulos de questões e simulados, mapeamento
e resumos, mapas mentais, redação, infográficos, acervos prontos, loja, pagamentos,
autenticação, funções de backend, migrações e workflows correspondentes.
`pmdf-flashcards-perguntas.js` contém **perguntas de flashcards**, não a ferramenta
de questões de múltipla escolha.

A dependência do gerador no módulo de questões foi substituída pelo classificador
isolado, preservando a rede e os recursos originais. O modo Cloze foi corrigido
para retornar somente lacunas, e o modo misto aproveita lacunas válidas mesmo
quando o texto não produz perguntas estratégicas.

## Dados e segurança

Os arquivos são lidos localmente, e a aplicação não usa conta, banco remoto ou
envio do material a APIs. O armazenamento usa chaves próprias; pode ler
agendamentos antigos compatíveis no mesmo endereço, sem alterar as chaves do
aplicativo original. Outro domínio, navegador ou dispositivo tem armazenamento
separado. Se o navegador bloquear o armazenamento ou atingir sua capacidade,
a interface avisa para exportar os cartões antes de fechar.

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

A suíte inicia seu próprio servidor local, testa o fluxo em desktop e celular e
salva capturas em `test-artifacts/`. `PMDF_TEST_URL` permite apontar para outro
servidor; `PMDF_CHROMIUM_PATH` permite escolher um Chromium instalado.

O workflow `.github/workflows/qa.yml` executa esses testes no GitHub Actions.
Ele não publica o site e não chama serviços de pagamento ou banco de dados.

## Implantação independente

A pasta pode ser publicada em qualquer hospedagem de arquivos estáticos.
O `netlify.toml` aponta para a raiz e não exige build. Para GitHub Pages, use a
raiz de um repositório/branch destinado a esta versão.

O branch `flashcards-standalone-20261124` contém a extração. A versão original
permanece no branch `main`; nenhuma migração, alteração de dados remotos ou
publicação em produção é necessária para usar esta cópia.
