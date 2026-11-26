# Método PMDF · Amostra pública

Amostra gratuita independente, com 52 flashcards Anki em 22 disciplinas, filtros, revisão espaçada, exportação Anki e criação opcional de baralho pessoal. A amostra conserva enunciados, gabaritos e IDs do acervo. Não contém checkout; acrescente um link comercial somente após teste completo da oferta.

## Testes e build

Use Node.js 22.13 ou posterior: `npm ci`, `npm test`, `npx playwright install chromium`, `npm run test:browser` e `npm run build`. Hospede apenas `dist/`. A construção rejeita outros JSON na árvore de assets e valida o total da amostra. Nunca publique o arquivo do acervo completo.

## Progresso legado

O armazenamento da amostra usa chave separada. No mesmo endereço, ela preserva agendamentos dos IDs selecionados e permite baixar os agendamentos da versão anterior e da amostra. O JSON de transferência leva somente identificador, caixa e prazo. Não transfere cartões, respostas, baralhos pessoais, sessão em andamento ou informação de conta. Se hospedada em outra origem, este navegador não poderá ler os dados que pertencem ao endereço anterior.

## Corte

Esta é uma proposta de preview, sem alterar produção. O histórico, cópias baixadas, clones e forks anteriores não são restritos por este build. Mantenha o endereço original ativo até a homologação do acesso pago e o plano de arquivo privado/corte já aprovados. Qualquer publicação exige verificação do endereço estável, da migração e da ausência do acervo completo.
