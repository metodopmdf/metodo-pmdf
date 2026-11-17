# Banco ANKI CFO GST — integração dos flashcards

## Inventário do arquivo recebido

- Fonte: `ANKI CFO GST.zip` (pacote Anki com `collection.anki21b`).
- Cartões e notas: **2.624**, no modelo Básico (frente e verso).
- Organização: **22 disciplinas**, **130 assuntos contendo cartões**, agrupados em **149 registros de baralhos/pastas**.
- Organização visual: as assertivas e justificativas foram convertidas de HTML do Anki para texto legível com quebras de linha.
- Imagens: dois cartões referenciam imagens externas ao texto; a versão convertida preserva a descrição da ilustração, não copia o arquivo de mídia.
- Auditoria automatizada: 1.299 cartões foram **marcados para conferência de vigência** por conter referências a normas, precedentes ou quantitativos. A marcação não significa que estejam errados.

## Correções editoriais verificadas

1. **cfo-gst-1769883524183 — Unidade de Direção (Fayol)**: gabarito alterado de ERRADO para CERTO. A unidade de direção corresponde a um plano e uma chefia para atividades com o mesmo objetivo. Fonte: https://ebooks.inflibnet.ac.in/mgmtp05/chapter/40/
2. **cfo-gst-1770831722684 — Art. 40 da Lei nº 9.605/1998**: gabarito alterado de ERRADO para CERTO. A pena do caput é reclusão de um a cinco anos, e a assertiva apresentada acompanha o texto do dispositivo. Fonte: https://www.planalto.gov.br/ccivil_03/leis/l9605.htm

As demais respostas permanecem como no arquivo recebido. **Não foi realizada conferência individual de todas as 2.624 respostas ou atualização integral de jurisprudência.**

## Utilização da plataforma

Acesse **Flashcards → Material / lei → Acervo ANKI CFO GST (importado)**. Use **Importar acervo convertido** para selecionar o arquivo `.json.gz` ou `.json` gerado a partir do pacote. Escolha disciplina e assunto, tipo de revisão (vencidos ou todos) e cartões por sessão; clique em **Iniciar revisão do acervo CFO**.

O banco é guardado no **IndexedDB do navegador**, enquanto o planejamento Leitner utiliza os registros já existentes. O material continua local ao usuário, preservando a independência do banco de questões e dos flashcards produzidos pelo gerador.

## Arquitetura

- `assets/pmdf-anki-cfo-gst.js`: importa, valida, filtra e armazena o banco.
- `assets/pmdf-anki-cfo-gst.css`: interface responsiva e legível.
- `assets/pmdf-app.js`: abre o banco no fluxo já existente de revisão e registra avaliações.
- `tests/anki-cfo-gst.test.cjs`: valida JSON e JSON.GZ, controles, duplicações e integração.

### Publicação opcional para todos os visitantes

A interface também tenta carregar `assets/bancos/anki-cfo-gst.json.gz`. **Esse arquivo não foi publicado no repositório**: a importação atual ocorre pelo arquivo fornecido ao usuário e vale para o dispositivo/navegador utilizado. Para disponibilizar publicamente o acervo, o titular dos direitos deve autorizar a distribuição do conteúdo e, então, colocar o arquivo convertido nesse caminho do repositório. Não publique materiais de terceiros sem a licença necessária.
