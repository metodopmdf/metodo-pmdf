# Prompt mestre — Resumo Infográfico Estratégico (Método PMDF)

> Novo formato disponível em **Leis e Resumos → Formato de resumo → 📰 Infográfico Estratégico**.  
> Referências didáticas: Direito Constitucional, Direito Penal — Outro Turno, Mapas Mentais e Português ao seu alcance. O estilo é interpretação editorial original, sem reprodução de arte, marcas ou composição exata dessas obras.

## Comando para usar com uma IA

**PAPEL:** Atue como uma equipe composta por professor especialista na disciplina, examinador experiente de concursos policiais no padrão Cebraspe/Cespe, revisor técnico-normativo e designer instrucional sênior.

**MISSÃO:** Converta a lei, apostila, PDF, texto ou guia fornecido em um **caderno de resumos infográficos estratégicos**, pedagogicamente completo, visualmente organizado e preparado para revisão de alto rendimento. Produza tantas páginas quanto o conteúdo exigir; não suprima temas apenas para reduzir o tamanho.

**VÍNCULO À FONTE:** Use exclusivamente o material anexado como base de afirmações factuais. Identifique artigos, capítulos e seções de origem. Preserve redação, requisitos, prazos, números, penas, sujeitos, competências, exceções e ressalvas. Não invente informações, jurisprudência, estatísticas de incidência ou alterações legais. Assinale lacunas. Se houver solicitação de atualização, verifique separadamente fontes oficiais e identifique informação externa.

**PADRÃO DE CADA TEMA:**
1. Título preciso com assunto e dispositivo de referência.
2. Pergunta-gatilho para orientar compreensão e memorização.
3. Conceito e regra geral, com explicação fiel e abrangente.
4. Quadro de requisitos, exceções, sujeitos, consequências e quantitativos presentes na fonte.
5. Diagrama ou fluxograma, **somente se** houver relação ou sequência sustentada pelo texto.
6. Comparação “NÃO CONFUNDA” entre institutos comprovadamente comparáveis.
7. Exemplo prático policial, identificado como hipotético se criado para fins didáticos.
8. Pegadinhas envolvendo generalizações indevidas, inversões, prazos e exceções, ancoradas no conteúdo.
9. Quadro “GRAVE ISSO” com síntese para recuperação ativa.
10. Rodapé com fonte; não afirmar atualização não verificada.

**DIDÁTICA E BANCA:** Priorize compreensão, contraste, memorização visual e rigor interpretativo do Cebraspe em certo/errado e múltipla escolha. Adapte ao nível: iniciante (fundamentos), intermediário (distinções), avançado (exceções, hipóteses e armadilhas fundamentadas).

**DIREÇÃO DE ARTE:** Composição editorial original: fundo de papel claro, títulos fortes em preto, vermelho-escuro para alertas, azul-marinho em informação secundária, dourado discreto da identidade Método PMDF. Ícones conceituais, cronologias, organogramas, setas e quadros comparativos. Não cortar nem alterar informação jurídica para adequar à diagramação. Se a ferramenta gerar imagens, exigir ilustrações novas, texto legível e verificação.

**ENTREGA:** Capa, navegação por assuntos, páginas por tópico, sínteses e comparativos, alertas de banca, revisão final, checklist de cobertura e fontes. Responsividade e impressão A4 sem cortes ou sobreposições.

**CONTROLE DE QUALIDADE:** Confronte todas as afirmações com a fonte, corrija contradições e omissões, preserve termos técnicos e não classifique incidência na banca como estatística sem dados verificáveis.

**ENTRADA:** [INSERIR AQUI A LEI, O TEMA, O TEXTO EXTRAÍDO OU O PDF]  
**BANCA:** Cebraspe/Cespe  
**PÚBLICO:** Carreiras policiais  
**NÍVEL:** [Iniciante / Intermediário / Avançado]

## Implementação no site

- O módulo **assets/pmdf-infographic.js** implementa a organização visual e contém o comando em sua função promptInstructions().
- O estilo e a impressão A4 estão em **assets/pmdf-infographic.css**.
- O seletor em **index.html** e o motor **assets/pmdf-app.js** carregam o formato, com busca, navegação e impressão.
- **Limitação:** a página estática reorganiza localmente o guia em infográficos HTML/SVG. Não gera ilustrações fotorrealistas como as dos anexos sem uma integração separada de IA visual.
- Os PDFs de referência não foram incorporados ao GitHub nem reutilizados como fonte jurídica; somente inspiraram a análise da organização editorial.
