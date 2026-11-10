# Questões autorais por disciplina e assunto — Praça PMDF

## Entrega do acervo inicial (2026-11-10)

O módulo Questões passou a contar com a fonte **Questões por matéria e assunto · acervo local**. Esse modo é independente do PostgreSQL: a falha `PGRST205` em `public.questoes` não impede a prática dos itens autorais armazenados no GitHub Pages. A consulta ao banco Supabase continua separada na opção **Banco Praça PMDF**.

- Matriz fonte: `assets/pmdf-catalogo-praca.js` (15 disciplinas / 163 tópicos).
- Banco autoral: `assets/pmdf-questoes-programaticas.js` (163 CE comentadas, **uma questão original por tópico**, mais **21 MC** em tópicos selecionados).
- Questões, gabaritos e comentários são **autorais** e **não são transcrições de provas oficiais**.
- Cada questão aponta uma referência pública para conferência, mas uma página geral ou diploma pode não fundamentar literalmente todas as frases: revisão editorial humana continua indispensável.
- O motor denominado neural no site usa **regras de transformação lexical e geração local**, não é LLM generativo, não pesquisa a internet em tempo real e não confere atualização normativa automaticamente.
- A seleção exata de assunto é propagada ao motor local por um guia de fatos positivos (não se usam as assertivas falsas como evidência de verdade).
- O modo Tradicional entrega itens do acervo fixo e verifica cobertura por assunto; o modo Motor neural tenta variações adicionais, identificadas na interface como derivadas automaticamente.
- O formato de múltipla escolha no acervo autoral está disponível em tópicos selecionados. Nos demais, utilize CE ou tente o motor local, sem garantia artificial de quantidade.
- O selector de banca influencia o motor local quando cabível, mas não transforma as questões autorais preexistentes em itens oficiais daquela banca.

## Como estudar

1. Entre no site, na aba **Questões**.
2. Em **Fonte do conteúdo**, escolha **Questões por matéria e assunto · acervo local**.
3. Escolha uma das 15 disciplinas e, para estudar isoladamente, selecione um assunto.
4. Selecione **Certo/Errado** para cobertura integral (ao menos uma questão por tópico). A escolha de **Múltipla escolha** encontra itens somente nos tópicos já curados em MC.
5. Modo **Tradicional**: praticar questões editoriais. Modo **Motor neural · local**: produzir variações baseadas nos trechos autorais, quando houver evidência textual suficiente.
6. Responda, confira comentário e abra **Consultar referência original** para checar texto e vigência.
7. **Próximo lote inédito** respeita o recorte e a cobertura; **Reiniciar cobertura** inicia uma revisão sem apagar estatísticas.

## Referências de pesquisa e fontes de revisão

- Constituição Federal: https://www4.planalto.gov.br/legislacao/legis-federal/constituicao
- Código Penal: https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm
- Código Penal Militar: https://planalto.gov.br/ccivil_03/decreto-lei/del1001compilado.htm
- Código de Processo Penal: https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm
- Código de Processo Penal Militar: https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm
- Manual de Redação da Presidência da República: https://www4.planalto.gov.br/centrodeestudos/pages/assuntos/manual-de-redacao-da-presidencia-da-republica.html
- Ministério da Saúde, *Noções de primeiros socorros* (2025): https://bvsms.saude.gov.br/bvs/publicacoes/nocoes_primeiros_socorros.pdf
- SUDECO, RIDE-DF: https://www.gov.br/sudeco/pt-br/assuntos/ride-df
- ONU, DUDH: https://brasil.un.org/pt-br/66717-declara%C3%A7%C3%A3o-universal-dos-direitos-humanos
- Portal da OBMEP: https://portaldaobmep.impa.br/
- British Council, gramática inglesa: https://learnenglish.britishcouncil.org/grammar
- Artigo acadêmico sobre escolas criminológicas: https://periodicos.ufsc.br/index.php/sequencia/article/view/2177-7055.2020v43n84p129/0

**Atenção à vigência:** a Portaria Interministerial nº 424/2016, mencionada na matriz fornecida, foi revogada pela Portaria Conjunta MGI/MF/CGU nº 33/2023 segundo o portal oficial Transferegov: https://www.gov.br/transferegov/pt-br/legislacao/portarias/portaria-interministerial-no-424-de-30-de-dezembro-de-2016 . O item correspondente do acervo foi construído com essa distinção.

## Governança de conteúdo e expansão

O banco inicial assegura **cobertura de tópicos**, não cobertura exaustiva de artigos, jurisprudência ou profundidade de cada assunto. Para chegar a dezenas de itens por tópico em nível avançado, o próximo trabalho editorial exige pesquisar e inserir novos enunciados com gabaritos e justificativas revisados, não apenas permutar palavras do mesmo fato.

Alterações futuras de `assets/pmdf-questoes-programaticas.js` devem:
- manter identificação única por disciplina/assunto;
- registrar resposta inequívoca e explicação consistente;
- apontar fonte pública e data de revisão;
- verificar cinco alternativas únicas e uma única correta em MC;
- validar limites de contexto e dados do modelo neural;
- executar `node tests/catalogo-praca.test.cjs`, `node tests/smoke.mjs`, `node tests/neural-questions.test.cjs` e QA browser `node tests/online-e2e.mjs`;
- não publicar automaticamente no Supabase textos gerados por usuários.

A estrutura editorial não depende de assinatura nem chave de terceiros para **executar** questões e gerar variações locais. Se for necessária uma IA generativa de verdade com novos conceitos e verificação de fontes em tempo real, isso exige um serviço de inferência separado, custo operacional e controles de privacidade/autenticidade.
