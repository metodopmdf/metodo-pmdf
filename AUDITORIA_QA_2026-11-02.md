# Auditoria técnica e QA — Método PMDF
**Data:** 2026-11-02  
**Escopo:** branch `main`, `index.html`, `tests/smoke.mjs` e `.github/workflows/qa.yml`.

## Inventário auditado
- HTML principal: **6.088 linhas**, aproximadamente **624 KB**; **198 funções JavaScript declaradas**.
- Estrutura: **140 IDs estáticos**, sem duplicações identificadas.
- Suíte de regressão: **273 linhas**; workflow configurado para Node.js 22.
- Auditoria de rotas de interface, geração, progresso, resumos, autenticação, sincronização simulada, importação e exportação de redação.

## Defeitos encontrados e correções
| Área | Defeito identificado | Correção |
|---|---|---|
| Troca de formatos | `renderGuide` apagava a sessão de questões/flashcards ao trocar resumo, nível ou modo lacunas | Preservar sessão por padrão; limpar deliberadamente ao carregar outro material |
| Sessão retomada | Código restaurava o valor obsoleto `MC5` | Restaurar `MC` no seletor unificado |
| Provas importadas | Importação de questões de múltipla escolha selecionava `MC5` | Selecionar `MC` |
| Provas sem gabarito | Filtro descartava toda múltipla escolha com `answer:null`, embora a plataforma ofereça respostas pendentes | Permitir tentativa com pendência, sem atribuir acerto ou nota fictícia |
| Sessões extensas | Salvamento limitava silenciosamente as questões a 500 e flashcards a 300 | Preservar todos os itens, com aviso existente quando o armazenamento estiver cheio |
| Comunicação com candidato | Rótulos prometiam busca automática de provas, mas a implementação apenas apresenta referências para importação | Esclarecer geração local e importação manual |
| PDF da redação | Botão na aba Redação imprimia o guia de leis | Exportação específica do relatório da redação, com folha A4 e cabeçalho próprio |
| Acessibilidade | Estado das abas não informava a função `tab` e seleção de forma explícita | Adicionar `role=tab`, `aria-selected` e reforçar foco de teclado |
| Ergonomia | Título longo do material podia comprimir os comandos | Ajustar flexibilidade, quebra de linha e foco responsivo |
| Dependência externa | Lucide usado com `@latest` | Fixar `lucide@1.66.0` para evitar mudanças automáticas da biblioteca |

## Testes executados em simulação JavaScript
| Cenário | Abrangência | Resultado |
|---|---:|---|
| Sintaxe JS principal e estrutura HTML básica | Arquivo inteiro e 140 IDs | **Aprovado** |
| Gerador C/E e MC + cartões | 26 normas × 3 níveis = 78 combinações de cada fluxo | **Aprovado** |
| Renderização textual dos seis tipos de resumo | 26 × 3 × 6 = **468 combinações** | **Aprovado** |
| Preservação do simulado ao trocar formatos e níveis | Seis formatos, níveis distintos | **Aprovado** |
| Preservação dos cartões ao trocar formatos e níveis | Revisão em andamento | **Aprovado** |
| Persistência de sessão extensa | 505 questões e 350 flashcards de teste | **Aprovado** |
| Texto jurídico fictício fornecido pelo candidato | Extração + geração C/E e MC | **Aprovado** |
| Prova MC importada sem gabarito | Tentativa, resultado pendente, retomada | **Aprovado** |
| Correção local de redação | Três níveis | **Aprovado** |
| Conteúdo da janela de impressão da redação | A4, relatório e NPD | **Aprovado** |
| Histórico, gráfico e revisão espaçada | Fluxo simulado | **Aprovado** |
| Supabase: merge, exclusões, CAS, falha offline | Dois clientes simulados | **Aprovado** |

A execução foi feita em um ambiente JavaScript simulado que reproduz o teste Node. O arquivo `tests/smoke.mjs` contém os testes reproduzíveis no GitHub Actions.

## Limites da homologação
- **GitHub Actions remoto:** o sucesso do último workflow não pôde ser confirmado nesta sessão. Aprovação da simulação local **não equivale** à confirmação de CI verde.
- **Interface visual:** não foi executado teste gráfico real no Chrome em desktop e celular; os testes de renderização inspecionam HTML gerado, não medidas de layout nem screenshots.
- **PDF real:** verificado o HTML A4 e o conteúdo correto do relatório; não foi inspecionado PDF resultante de uma impressão real.
- **Integrações externas:** não houve teste ao vivo de OCR, download de PDFs, proxies ou serviços do Supabase; foram usados fluxos simulados para sincronização. A configuração RLS do Supabase não foi auditada no servidor.
- **Qualidade jurídica:** enunciados, alternativas e rubricas passam por validação estrutural, mas **não houve revisão humana de correção jurídica de cada item**. O banco pode conter sínteses desatualizadas; conferência com texto oficial é necessária.
- **Incidência histórica:** não existe coleta automática de provas antigas nem estatística comprovada para toda norma; priorizações baseadas em heurísticas continuam estimativas.
- **Hospedagem pública:** nenhum HTML/JavaScript servido pelo navegador pode ser mantido secreto. Minificação não é controle de acesso.

## Recomendações para próximas etapas
1. Executar e confirmar o workflow **QA Método PMDF** após cada push e exigir CI verde para publicação.
2. Adicionar testes E2E em navegador real, incluindo responsividade, navegação por teclado, impressão e carregamento de arquivos.
3. Modularizar progressivamente o HTML único e documentar interfaces entre motor de questões, editor, UI e sincronização, sem alterar regras de negócio.
4. Validar configuração de RLS e autenticação no Supabase em ambiente controlado.
5. Criar banco versionado de provas/gabaritos com fontes rastreáveis; separar frequência comprovada de afinidade temática estimada.
6. Submeter questões jurídicas críticas à revisão técnica antes de apresentar alegações de equivalência ao padrão de bancas oficiais.

**Conclusão:** os defeitos reproduzidos acima foram corrigidos e as regressões automatizadas passaram na simulação. A liberação final ainda requer CI e homologação no navegador real.
