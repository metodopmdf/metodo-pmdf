# Relatório de QA — Questões inválidas na IA experimental
**Data:** 03/11/2026 · **Aplicação:** Método PMDF · **Branch:** `main`

## Erro relatado
Após acionar a geração experimental, o navegador mostrava a mensagem:
> A IA experimental não conseguiu estruturar questões válidas. O modo seguro foi ativado automaticamente.

O fallback anterior protegia contra travamento, mas exibia confirmação de sucesso antes de verificar se havia produzido questões. A inferência local com SmolLM2 360M frequentemente não satisfaz, em uma única saída, os requisitos de enunciado, gabarito, quatro alternativas, quatro justificativas e citação literal.

## Correções realizadas
- **Prompt compacto:** uma questão por solicitação, esquema de resposta exemplificado e instruções explícitas para copiar um trecho literal da fonte. Reduz o excesso de regras concorrentes nos modelos compactos sem alterar os campos finais do simulador.
- **Parser mais resiliente:** reconhece `questions`, `questoes`, `questões`, `items`, `question`, `questao`, item JSON isolado e campos em português (`enunciado`, `gabarito`, `justificativa`, `trecho`, `alternativas`, `analiseAlternativas`).
- **Recuperação conservadora de JSON truncado:** caso o envelope de um array venha incompleto mas contenha um objeto de questão integralmente fechado, recupera somente esse item. Não recupera valores internos truncados nem dispensa as verificações.
- **Verificação preservada:** a fonte deve conter literalmente o trecho indicado; continuam obrigatórios gabarito válido, opções não duplicadas e comentários técnicos. As regras não comprovam interpretação jurídica; revisão da fonte oficial continua indispensável.
- **Fallback verificável:** o modo seguro só informa sucesso se o mecanismo de regras gerar efetivamente um lote com questões. Em caso contrário, apresenta motivo acionável (fonte sem questões inéditas ou esgotamento da cobertura), sem confirmação de sucesso falsa.
- **Diagnóstico visível:** acrescentado `q-ai-diagnostic` à interface para identificar a natureza da falha sem revelar conteúdo privado do documento ou a saída bruta do modelo.
- **Cache de script:** atualizada a URL versionada do controlador para não reutilizar a versão antiga no navegador.
- **Compatibilidade mantida:** certo/errado e múltipla escolha; nível e banca de referência; gabaritos, explicações, histórico e gerador seguro sem GPU.

## Validação
Suíte automatizada do GitHub Actions:
`node tests/smoke.mjs && node tests/webllm.mjs`

Cenários adicionais:
- Questões CE e MC com chaves JSON em português são reconhecidas, validadas e incluídas no simulador sem ativar fallback.
- Saída contendo objeto de questão completo, mas envelope JSON truncado, é recuperada corretamente.
- Simulação de respostas indefinidas, JSON impossível de recuperar e evidências inexistentes: a geração experimental é interrompida de maneira controlada.
- Mensagem de sucesso do gerador seguro só aparece se um lote tiver sido criado.
- Preservação dos itens aceitos antes de falhas subsequentes.
- Regressões do catálogo de normas, três níveis de dificuldade, provas importadas, simulador e funcionalidades didáticas anteriores.

## Limitação técnica importante
Os testes de geração utilizam respostas de modelos **simuladas**; não executam o SmolLM2 real em WebGPU no computador/celular do candidato. Esta correção aumenta a taxa potencial de aproveitamento e elimina mensagens falsas, mas **não garante** que um modelo de 360 milhões de parâmetros consiga produzir questões jurídicas aprofundadas com a qualidade de modelos grandes. O modo seguro preserva formato e funcionalidades, porém é baseado em regras. Modelos de linguagem reais podem continuar retornando questões inválidas, que devem ser rejeitadas por segurança.

**Critério para próximo diagnóstico:** testar a geração no navegador atualizado; consultar o indicador `Diagnóstico` se nenhum item for criado; se o modelo continuar inadequado, preferir um modelo mais capaz em hardware compatível ou o modo seguro.
