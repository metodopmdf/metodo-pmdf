# Método PMDF — Relatório de QA

**Versão auditada:** branch `main` da organização `metodopmdf`  
**Atualização:** 2026-11-02  
**Estado recomendado:** **beta com testes automatizados aprovados; homologação online pendente**.

## Implementações concluídas

1. **Gerador de questões:** substituição das mutações heurísticas excessivamente genéricas por mudanças mais específicas e justificadas. Enunciados exigem trecho completo e referência ao material de origem. Múltipla escolha: opções distintas, cinco alternativas e gabarito explícito. Não se inventam alternativas quando o guia não oferece base suficiente.
2. **Níveis de dificuldade:** iniciante (literalidade), intermediário (requisitos e consequências), avançado (condições, exceções e prazos), com fallback transparente quando a fonte não suporta complexidade maior.
3. **Flashcards:** frente e verso sem Certo/Errado. Após visualizar o verso e avançar, é registrada automaticamente a próxima revisão; a visualização não implica domínio comprovado.
4. **Sincronização:** mesclagem por chave com marcações de alteração/exclusão, gravação condicional (`updated_at`/CAS) e novas tentativas após conflito. O armazenamento local é preservado quando ocorre falha de rede.
5. **GitHub Pages:** referências ao endereço `metodopmdf.github.io` atualizadas. Chamadas para rotas inexistentes `/api/provas`, `/api/prova-arquivo`, `/api/questoes-abertas` removidas. A importação de provas permanece via arquivos PDF/TXT fornecidos pelo candidato.
6. **Responsividade:** quebra de texto em questões, cartões e formulários; gráfico de rosca com composição móvel e desktop; erros em vermelho e acertos em dourado.
7. **Qualidade contínua:** `tests/smoke.mjs` e `.github/workflows/qa.yml`; testes executados no Node.js 22 a cada push e pull request para `main`.

## Testes em código e simulações

| Cenário | Resultado |
|---|---|
| Sintaxe JavaScript inline | Aprovado |
| Geração de questões em 26 normas e três níveis | Aprovado para os itens emitidos |
| Questões C/E geradas — iniciante / intermediário / avançado | 144 / 184 / 220 |
| Questões MC5 geradas — iniciante / intermediário / avançado | 107 / 112 / 134 |
| Alternativas MC5 (quantidade, duplicidade, gabarito) | Aprovado |
| Simulado (iniciar, responder, feedback e avançar) | Aprovado nos 3 níveis, com DOM simulado |
| Flashcards (frente, verso, agendamento e filtro vencidos) | Aprovado nos 3 níveis, com DOM simulado |
| Gráfico de rosca: 1 acerto, 2 erros, 33%, vermelho | Aprovado |
| Gráfico responsivo: viewBox desktop e móvel | Aprovado em simulação do viewport |
| Redação: relatório, nota e histórico locais | Aprovado nos 3 níveis |
| Cadastro, login e separação de contas | Aprovado apenas com API simulada |
| Sincronização com dois clientes, exclusão, conflito e rede fora do ar | Aprovado apenas com API simulada |
| GitHub Actions | Verificar em Actions o resultado mais recente |
| GitHub Pages acessível em navegador público | Não homologado nesta auditoria |

### Limitações identificadas

- **Sete guias** ainda não fornecem matéria suficiente para construir cinco alternativas verificáveis localmente. O aplicativo sugere Certo/Errado ou todas as leis em vez de criar respostas artificiais.
- **A qualidade jurídica dos resumos e gabaritos** necessita conferência humana com a legislação vigente. A revisão sintática não substitui auditoria jurídica.
- **O Supabase real não foi exercitado** nesta rodada: não foram criadas contas reais nem verificadas políticas RLS, operações concorrentes reais ou limites operacionais da API.
- **O cadastro sem e-mail** não possui recuperação automática de senha; é necessário processo de suporte/manual e boas práticas de proteção de contas.
- **Conflitos por chave** usam carimbos temporais dos aparelhos; grandes diferenças de relógio ainda podem afetar a preferência entre alterações simultâneas. A gravação CAS reduz a possibilidade de uma atualização substituir silenciosamente outra.
- **Testes de tela física e acessibilidade** em Android, iOS e diferentes navegadores ainda dependem de execução em dispositivos reais.
- **A busca de provas** abre referências externas; download e importação do arquivo continuam manuais, pois GitHub Pages não oferece backend.
- **Correção de redação** é uma estimativa pedagógica por regras locais, não nota oficial do Cebraspe.

## Homologação de produção pendente

Antes de divulgar o site para grande número de candidatos:

1. Conferir a execução verde do workflow de QA e a implantação verde do GitHub Pages.
2. Criar duas contas reais distintas no Supabase (com a configuração de confirmação compatível com cadastro sem e-mail).
3. Verificar o isolamento por RLS e testar leitura/gravação simultânea de progresso em dois dispositivos reais.
4. Testar login/logout, senha incorreta, persistência e exportação/importação de backup em celular e computador.
5. Auditar juridicamente amostras representativas dos 26 guias, sobretudo regras com exceções, prazos ou jurisprudência.
6. Verificar limites e proteções de cadastro do Supabase antes de ampliar o número de usuários.

**Nota:** os testes automatizados não usam conta real, credenciais secretas ou dados de terceiros.
