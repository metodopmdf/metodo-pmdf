# Auditoria da interface — Método PMDF (03/11/2026)

## Objetivo
Simplificar o uso em desktop e celular e preservar as funções já presentes, inclusive o banco de 26 leis, mapeador, correção de redação, questões C/E, múltipla escolha, misto neural local, flashcards, resultados e importação/exportação.

## Diagnóstico e ajustes
| Prioridade | Achado | Melhoria aplicada |
|---|---|---|
| Alta | Rolagem lateral do menu em telas pequenas | Menu em grade de 3 + 2 abas, rótulos mais breves e área de toque ampliada |
| Alta | Parâmetros opcionais ocupam a tela antes da geração | “Personalizar análise” recolhível; fonte e botão de gerar mantidos |
| Alta | Ações de exportação, reinício e filtros competem com “Gerar questões” | Separação entre ação principal, próximo lote e ações secundárias recolhíveis |
| Média | Ferramentas de importação de provas sempre à mostra | Seção recolhível, todos os controles e funções preservados |
| Alta | Navegação via teclado e leitor de tela pouco consistente | ARIA de abas, ordem de foco, setas, Home/End e orientação contextual |
| Média | Ícones do cronômetro sem nome acessível | Labels e dicas nos controles |
| Média | Fluxo inicial pouco claro para novos candidatos | Instruções contextuais e atalho para ação principal em cada módulo |

## Escopo da validação
`tests/smoke.mjs` verifica integridade JavaScript, 26 guias e três níveis, bancos, avaliações, persistência simulada e estrutura da UI.
`tests/online-e2e.mjs` verifica a versão realmente publicada no GitHub Pages com SHA-256, navegação das cinco ferramentas, acessibilidade, foco, painéis avançados, menu móvel, temas, questões CE/MC/MIX, flashcards, gabaritos, respostas e lotes inéditos em Chromium desktop e mobile.
A aprovação dependerá dos resultados de Actions do commit final, não apenas de inspeção estática.

## Limites
Não equivale a certificação WCAG completa ou à validação em todos os browsers e dispositivos. Não testa credenciais reais do Supabase. O motor neural é local, não IA generativa; não foi alterado.
