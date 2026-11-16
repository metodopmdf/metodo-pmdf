# Acervo de questões importadas (PDF)

O módulo `Banco de questões` fica em `assets/pmdf-acervo-interativo.js` e usa este diretório como fonte estática opcional. A partir do acervo entregue pelo proprietário, foram normalizados **8.433 itens de 23 cadernos**, preservando texto e gabaritos.

## Publicação para todos os candidatos

Envie para esta pasta o arquivo **`Banco_Interativo_PMDF_8433_Questoes.json.gz`**, sem renomeá-lo, através do GitHub (Add file → Upload files). O site detecta esse caminho ao abrir a nova aba e o carrega automaticamente. Sem o pacote, a aba continua funcional e permite importar o mesmo arquivo localmente, por navegador/dispositivo.

O pacote contém 23 conjuntos de questões e é um artefato de estudo. **Não houve revisão jurídica individual** dos gabaritos; confira leis alteradas e notas de vigência.

## Esquema do pacote

`{schema:'pmdf-questoes-pdf-v1', version:string, decks:[{id,name,source,questions:[{id,number,type,difficulty,reference,statement,options,answer,explanation}]}]}`

`type`: `CE` ou `MC`; respostas de CE `C` ou `E`; de MC `A` a `E`. O conteúdo é exibido como texto puro, sem HTML não confiável. As respostas são armazenadas em IndexedDB com índice por questão, sem modificar os enunciados.
