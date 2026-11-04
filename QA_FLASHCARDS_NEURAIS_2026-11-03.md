# Implementação e auditoria — Flashcards de alta performance (03/11/2026)

## Especificação
Adaptou-se o prompt mestre enviado pelo usuário, com foco em máxima cobertura de unidades mínimas de conhecimento, recuperação ativa, repetição espaçada, modalidades Básico, Cloze e Gatilho de Banca, classificação Fácil/Médio/Difícil, referência rastreável e exportação Anki.

## Implementações no repositório
- Motor: `assets/pmdf-neural-flashcards.js`; usa o mesmo classificador neural local do motor de questões (`PMDFNeuralQuestions.testModel()`), com extração e regras textuais. **Não é IA generativa externa**.
- Fonte: 26 guias internos e conteúdo extraído dos documentos ou textos fornecidos pelo usuário. Para documentos personalizados, prioriza-se o texto original acessível (`sourceText`) em vez de resumos.
- Banco: percorre todos os dispositivos legíveis, sem interrupção arbitrária por total de cartões. Deduplicação por identidade estável, referência, modalidade, nível, tags, fundamento literal e aviso.
- Modalidades: pergunta e resposta curta; lacunas com notação Anki `{{c1::...}}`; julgamentos Cebraspe com veredito e indicação exata do contraste com a fonte. Não cria jurisprudência ou norma não fornecida.
- Interface: aba Flashcards com motor avançado padrão ou clássico preservado; geração assíncrona com interrupção; distribuição por lei; lotes de 25/50/100/200/todos; continuação de cobertura sem repetição no treino livre; relatório automaticamente visível e exportação CSV/TSV.
- Revisão espaçada e progresso: funções de recordação, caixas Leitner, sessão e continuidade mantidas.

## QA e resultados
- Smoke JavaScript: **aprovado**, 26 leis, três níveis, questões, flashcards clássicos, redação e persistência simulada.
- Motor neural de questões: **aprovado**.
- Teste específico do novo motor: **aprovado**; 4 artigos fictícios cobertos com três modalidades e metadados completos.
- Ensaio de volume em fonte fictícia com **520 dispositivos**: **2.600 flashcards** com IDs distintos e todos os 520 dispositivos percorridos.
- Teste online em Chromium desktop/mobile: **aprovado** no commit `07b46fe3709187e031903dcb9e0d85e32fc1dade`, [workflow 41743360378](https://github.com/metodopmdf/metodo-pmdf/actions/runs/41743360378).
- Implantação GitHub Pages: execução para o mesmo commit em [GitHub Actions](https://github.com/metodopmdf/metodo-pmdf/actions/runs/41743359237).
- A suíte online verifica SHA-256 da página e de ambos os arquivos dos motores para garantir que o teste ocorreu sobre a publicação real. Contempla navegação e usabilidade, formatos de questão, 26 leis, revisão e documentos longos. A exportação CSV/TSV será coberta no teste complementar incluído após a primeira homologação.

## Limitações
A geração de máximo volume se restringe a fatos verificáveis e legíveis; não é garantia de cobertura semântica exaustiva, de número pré-fixado ou de correção jurídica absoluta. A redação vigente das leis não é atualizada ou validada automaticamente; recomenda-se conferência oficial. O uso do tipo Cloze exige configuração apropriada na importação ao Anki. Os testes remotos não utilizam credenciais reais do Supabase.
