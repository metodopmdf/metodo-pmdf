# QA — Modo adaptativo e correção de congelamento (03/11/2026)

## Diagnóstico
O WebLLM anterior mantinha um modelo Qwen 0,5B de aproximadamente 1 GB de memória de GPU como seleção inicial. Mesmo em Web Worker, a alocação de VRAM e o carregamento de pesos podem causar congelamento ou fechamento do navegador em dispositivos limitados, especialmente smartphones. O Web Worker impede bloqueio JavaScript da thread visual, mas não elimina a demanda de memória e GPU.

## Correção aplicada
- A opção da interface passou a se chamar **Geração adaptativa**, com dois mecanismos expressamente diferenciados.
- **Automático seguro (padrão):** reutiliza o gerador de regras locais já existente, produzindo certo/errado e múltipla escolha com gabaritos, justificativas, deduplicação e cobertura progressiva; não inicializa WebGPU, não baixa modelos e não consulta uma API externa. Não é IA generativa e sua profundidade pode ser menor.
- O modo seguro limita cada lote a **até 15 questões** e, na opção Todas as leis, processa **uma norma por lote**, com cursor salvo para reduzir picos de CPU/memória.
- **IA generativa local experimental:** exige seleção explícita. O menor modelo ofertado é SmolLM2-360M-Instruct-q4f16_1-MLC (~376 MB de VRAM declarados pelo projeto WebLLM), seguido de Qwen 0,5B (~1,1 GB). A qualidade do modelo menor em português jurídico é limitada; nenhuma quantidade ou correção jurídica é garantida.
- O módulo WebLLM bloqueia execução de modelo em navegadores móveis **antes** de chamar requestAdapter ou carregar modelo; dispositivos com menos de 8 GB detectáveis também são bloqueados no modo experimental. Quando a capacidade for insuficiente, o controlador redireciona para o gerador seguro.
- O modo automático não verifica WebGPU, não baixa modelo nem tenta iniciar Worker. O botão de carregar modelo fica oculto nesse modo.
- Ao alternar para modo seguro, o controlador encerra o Worker experimental que eventualmente permaneceu carregado em GPU, mesmo quando estava ocioso.
- Os scripts de inferência receberam versão no endereço de carregamento para reduzir reutilização de JavaScript antigo em cache.

## Compatibilidade e regressão automatizada
- A suíte CI utiliza `node tests/smoke.mjs && node tests/webllm.mjs`.
- Regressão do código principal: 26 normas, três níveis, 468 resumos, simulados, flashcards, importação de provas e sincronização simulada.
- O teste de integração real da interface confirma que o modo adaptativo retorna questões **CE e MC** com gabaritos, sem chamar compatibility/load/generate de WebLLM.
- O catálogo inteiro avança a norma por norma, sem executar o gerador das 26 leis numa única chamada.
- Controlador e serviço testados com IA simulada: seleção experimental, proteção de Android antes de WebGPU, proteção de memória, fallback sem modelo, limites de tokens, descarte de evidência falsa, deduplicação, carregamento e término de Worker.
- A troca para modo seguro com modelo ocioso carregado exige liberar o Worker.

## Limitações e critérios de aceitação
1. **Preservada a entrega estrutural**, não a equivalência semântica: certo/errado, múltipla escolha, gabaritos, fundamentação e acompanhamento permanecem. Geração por regras não reproduz automaticamente casos jurídicos originais e interpretações de uma IA generativa ampla.
2. A auditoria local não substitui revisão jurídica. Confira normas e gabaritos com o texto legal atualizado.
3. Testes em GitHub Actions utilizam simulação do navegador/IA; ainda falta teste manual em smartphone Android e computador reais.
4. Textos extremamente longos podem exigir otimizações adicionais de extração/parse, independentemente do modelo de IA. Não há garantia absoluta de ausência de travamentos em todo aparelho.
5. A opção experimental continua consumindo GPU mesmo com modelo 360M. Ela é desaconselhada em dispositivos de baixo desempenho.

## Referências
- Código: `index.html`, `assets/pmdf-question-ai.js`, `assets/pmdf-webllm.js`.
- Suíte: `tests/smoke.mjs`, `tests/webllm.mjs`.
- Catálogo de modelos: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
