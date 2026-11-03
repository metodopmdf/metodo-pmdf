# QA — Recuperação de respostas inválidas no WebLLM

**Data:** 03/11/2026  | **Repositório:** metodopmdf/metodo-pmdf

## Sintoma corrigido
Alerta vermelho observado no sistema: "Falha de geração: Quatro respostas consecutivas inválidas: undefined" ao utilizar o modelo experimental mais leve.

## Causa identificada
O controlador `assets/pmdf-question-ai.js` abortava a geração após quatro exceções consecutivas ao interpretar a saída do modelo. A interpolação direta de `e.message` deixava o erro como `undefined` quando o mecanismo WebLLM rejeitava com valor que não fosse um objeto Error. Modelos compactos também podem produzir JSON truncado, perguntas sem a chave `questions` e itens sem evidência textual aceitável.

## Implementação
- Extrator de erro seguro: trata exceções como strings, objetos sem `message`, códigos ou valores ausentes. Não exibe `undefined` como mensagem de falha.
- Parser JSON tolerante ao formato: aceita objeto `questions`, `questoes`, `questões`, `items`, chave singular `question` ou `questao`, objeto de uma única questão e listas JSON, mantendo as verificações de gabarito, alternativa, comentário e evidência textual.
- Após três respostas malformadas consecutivas, encerra a tentativa experimental, libera o Web Worker e seleciona automaticamente o modo seguro sem GPU.
- Após três questões consecutivas sem fundamentação aproveitável, ocorre a mesma recuperação automática.
- Falha de compatibilidade WebGPU, carregamento ou ausência do módulo também ativa o modo seguro, sem depender de API de inferência externa.
- Itens experimentais aceitos antes da falha continuam no banco persistido e no simulador; os próximos lotes são gerados no modo seguro.
- O modo seguro continua respeitando o formato selecionado (C/E ou múltipla escolha), com comentários, gabaritos e histórico. Ele utiliza **regras locais**, não simula ser IA generativa.
- Versão atualizada do script na página para invalidar cache do controlador anterior.

## Testes executados
`node tests/smoke.mjs && node tests/webllm.mjs` no GitHub Actions.
- Regressão de normas, resumos, questões C/E e múltipla escolha.
- Exceção `throw undefined`: recuperação após três tentativas, sem mensagem com `undefined`.
- JSON truncado: recuperação automática sem loop infinito.
- Item com trecho probatório inexistente: rejeição e fallback.
- Lote parcialmente válido: questões boas preservadas antes de desativar a IA experimental.
- Falha durante o carregamento do modelo: troca para modo seguro e mensagem compreensível.
- Garantias anteriores de modo seguro sem download de modelo, sem GPU e de compatibilidade móvel.

## Restrições
Testes de integração usam um serviço de inferência simulado em Node.js. A geração real na GPU depende do dispositivo e do comportamento do modelo. A qualidade jurídica do gerador de regras não é equivalente à de um modelo generativo de grande porte e os gabaritos precisam de conferência na norma atualizada.

Arquivos relevantes: `assets/pmdf-question-ai.js`, `index.html`, `tests/webllm.mjs`.
