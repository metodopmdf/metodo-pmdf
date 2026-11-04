# QA — Flashcards úteis, navegação e segurança visual (04/11/2026)

## Escopo implementado

### 1. Conteúdo Anki para concurseiros
- No gerador avançado, removido o cartão de **Síntese expressa** que usava exclusivamente o nome do tópico, como o caso de `Título I — Tempo e Lugar do Crime`. O motor não retorna silenciosamente ao modelo genérico se faltar conhecimento verificável.
- Permanecem as lacunas contextualizadas, cartões diretos com conceito realmente testável e julgamentos em estilo Cebraspe, incluindo as mutações verificáveis dos próprios termos extraídos.
- Nos versos são exibidos, quando pertinentes, **Dica para a prova**, **Pegadinha da banca** e **Aplicação prática**: orientação por classe de informação, contraste pontual com a fonte e exemplos dos próprios guias.
- Incluída captura de `Teoria da Atividade` e `Teoria da Ubiquidade` como lacunas com contexto, em vez de oferecer o título do capítulo. Dicas de exclusividade para `somente`, `apenas` e `exclusivamente`, sem classificá-los erroneamente como verbos.
- Rastreabilidade integral mantida. Orientações heurísticas **não são afirmações sobre a legislação vigente**; a conferência normativa permanece necessária.

### 2. Questões
- Botões **Anterior** e **Próxima** colocados na mesma barra, próximos a `Deixar em branco`.
- Depois da correção, armazena-se localmente o gabarito mostrado e a alternativa escolhida por posição. Retornar à questão já corrigida preserva sua resposta, comentário, destaque de alternativa e estatística — não duplica pontuação.
- O botão Próxima exige que a questão atual tenha sido respondida ou deixada em branco. Questões ainda não respondidas podem ser revisitadas pelo controle Anterior, sem avaliação indevida.

### 3. Flashcards
- Navegação **Anterior / Próximo** ao lado dos controles de revisão. O Próximo manual avança **sem nota**; não simula esquecimento nem altera caixa Leitner.
- Ao revisitar um cartão já avaliado, o verso é consultável, mas uma segunda avaliação da mesma posição é bloqueada; progresso e agendamento permanecem.
- Quatro avaliações originais de recordação preservadas, assim como o modo clássico, os lotes, a exportação Anki e o histórico.

### 4. Cadastro
- Ícone de olho com `type="button"`, `aria-label`, `aria-pressed`, foco e alvo de toque de 44px.
- Mostrar/ocultar a senha não envia cadastro. A senha volta ao estado oculto ao trocar entre login/cadastro e após autenticação, mantendo o valor enquanto o usuário alterna a visibilidade.

## Testes e limites
- `tests/smoke.mjs`: 26 disciplinas, questões, funções anteriores, navegação e não recontagem, revisão sem nota, olho.
- `tests/neural-flashcards.test.cjs`: proibição do cartão de título, dica, pegadinha e aplicação, teorias do CPM e norma fictícia extensa com 520 dispositivos.
- `tests/online-e2e.mjs`: Chrome desktop e celular na URL publicada; testes reais de estado da senha, navegação entre questões e flashcards, permanência de gabaritos, botões de recordação e exportações.
- O site não valida automaticamente a redação legal consolidada. As orientações são construídas a partir de categorias textuais e de exemplos didáticos fornecidos pela fonte; a leitura de normas oficiais continua indispensável.
