/* Dados estáticos: catálogo inicial Método PMDF. Carregar antes do módulo principal. */
        const BUILTIN_PMDF_GUIDES = {
            cpm: {
                lawName: "Decreto-Lei nº 1.001/1969 (Código Penal Militar - CPM)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "O Código Penal Militar (Decreto-Lei nº 1.001/1969) constitui o diploma penal substantivo de maior relevância para a carreira policial militar, tipificando os crimes militares em tempo de paz e em tempo de guerra e estabelecendo regras próprias de aplicação da lei penal castrense, imputabilidade, concurso de agentes, penas principais e acessórias, ação penal e extinção da punibilidade. Seu objetivo central é tutelar de forma especial e rigorosa os pilares constitucionais das instituições militares — a hierarquia e a disciplina (Art. 42 e Art. 142 da CF/88) —, além da regularidade do serviço policial militar, da autoridade militar, do patrimônio sob administração castrense e da própria Administração Militar.\n\nPara o candidato ao Curso de Formação de Praças (CFP/Soldado) e ao Curso de Formação de Oficiais (CFO) da Polícia Militar do Distrito Federal (PMDF), o domínio do CPM é decisivo não apenas pelo elevado peso nas provas objetivas e discursivas do Cebraspe, mas porque este código regula juridicamente cada ato da rotina operacional do policial militar. Desde o momento em que o militar assume o quarto de hora, a sentinela, o plantão ou a viatura de radiopatrulhamento ostensivo nas regiões administrativas do DF, sua conduta passa a ser regida pelos tipos penais militares, que exigem prontidão, obediência hierárquica dentro da legalidade, sobriedade, permanência no posto e contenção no uso da força.\n\nAdemais, com o advento da Lei nº 13.491/2017, o Código Penal Militar sofreu uma profunda transformação estrutural em seu Art. 9º, inciso II: os crimes militares em tempo de paz deixaram de se restringir aos tipos descritos exclusivamente no próprio CPM e passaram a abranger qualquer delito previsto na legislação penal comum e extravagante (como Abuso de Autoridade, Tortura, Crimes de Trânsito, Estatuto do Desarmamento, Lei de Drogas e Crimes Cibernéticos), sempre que praticados por policial militar em serviço, em razão da função ou entre militares da ativa.",
                    keyConcepts: [
                        "Crimes Propriamente Militares vs. Impropriamente Militares: Os crimes propriamente (ou puramente) militares são aqueles cuja definição típica consta exclusivamente do CPM e que ferem diretamente a vida militar, a hierarquia, a disciplina ou o dever militar, só podendo ser praticados por militares (com a única exceção da Insubmissão - Art. 183, praticada por civil convocado). Exemplos clássicos: Motim (Art. 149), Deserção (Art. 187), Abandono de Posto (Art. 195) e Dormir em Serviço (Art. 203). Já os crimes impropriamente (ou acidentalmente) militares possuem definição idêntica ou correlata na legislação penal comum (ex: homicídio, lesão corporal, furto, peculato, corrupção, tortura), tornando-se crimes militares por força das circunstâncias fáticas e funcionais do Art. 9º, inciso II, do CPM.",
                        "Critério Ratione Legis e a Revolução da Lei nº 13.491/2017 (Art. 9º do CPM): O direito brasileiro adota o critério ratione legis (em razão da lei), segundo o qual crime militar é aquele que o Art. 9º (tempo de paz) ou o Art. 10 (tempo de guerra) define taxativamente como tal. Após a Lei nº 13.491/2017, o inciso II do Art. 9º igualou os crimes previstos no CPM e os previstos na legislação penal comum, de modo que qualquer crime comum praticado por militar da ativa contra militar da ativa (alínea 'a'), em lugar sujeito à administração militar (alínea 'b'), ou por militar em serviço ou atuando em razão da função (alínea 'c'), mesmo contra civil, configura crime militar.",
                        "Incompetência Absoluta da Justiça Militar Estadual/DF para Julgar Civis (Art. 125, § 4º da CF/88): Embora o Art. 9º, incisos I e III, do CPM preveja hipóteses de crimes militares praticados por civis ou militares da reserva/reformados, tais dispositivos aplicam-se exclusivamente à Justiça Militar da União (Forças Armadas). Na Justiça Militar Estadual e do Distrito Federal (PMDF e CBMDF), por mandamento expresso do Art. 125, § 4º da Constituição Federal, somente os militares dos Estados e do DF podem ser processados e julgados. Um civil jamais responde por crime militar na Auditoria Militar do DF.",
                        "Deslocamento de Competência nos Crimes Dolosos contra a Vida de Civil (Art. 9º, §§ 1º e 2º do CPM): Quando um Policial Militar da PMDF pratica crime doloso contra a vida (homicídio doloso consumado ou tentado) contra vítima CIVIL, mesmo estando em serviço ou no exercício da função policial, a competência para julgamento é deslocada constitucionalmente para o Tribunal do Júri da Justiça Comum (Art. 125, § 4º da CF/88 e Art. 9º, § 1º do CPM). Se a vítima for outro militar da ativa, ou se o homicídio contra civil for culposo, a competência permanece na Justiça Militar do DF.",
                        "Especialidades da Parte Geral do CPM frente ao Código Penal Comum: O CPM possui institutos próprios que divergem radicalmente do CP comum e são alvo constante de questões do Cebraspe: (a) adoção da Teoria da Atividade para o lugar do crime nos delitos omissivos (Art. 6º); (b) adoção da Teoria Diferenciadora do Estado de Necessidade, dividindo-o em excludente de culpabilidade (Art. 39) e excludente de ilicitude (Art. 43); (c) previsão de excludente especial do comandante em perigo ou manutenção da ordem (Art. 42, parágrafo único); e (d) rol próprio de 7 penas principais sem previsão de pena de multa (Art. 55)."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Parte Geral - Título I (Da Aplicação da Lei Penal Militar - Arts. 1º ao 28)",
                            reason: "Concentra o Art. 9º (Crimes Militares em Tempo de Paz), que é o artigo mais cobrado de todo o código em provas policiais, além das regras de Tempo e Lugar do crime (Arts. 5º e 6º) e equiparação de comandante (Art. 23)."
                        },
                        {
                            title: "Parte Geral - Título II (Do Crime - Arts. 29 ao 47) e Título V (Das Penas - Arts. 55 ao 109)",
                            reason: "Foco absoluto nas excludentes de ilicitude e culpabilidade específicas do CPM (Arts. 38 a 44), uso de força pelo comandante (Art. 42, parágrafo único) e rol de penas principais (Art. 55)."
                        },
                        {
                            title: "Parte Especial (Livro I) - Título II (Crimes contra a Autoridade ou Disciplina Militar - Arts. 149 ao 182)",
                            reason: "Despenca em provas da PMDF: Motim, Revolta, Violência contra superior ou militar de serviço, Desrespeito a superior e Recusa de obediência."
                        },
                        {
                            title: "Parte Especial (Livro I) - Título III (Crimes contra o Serviço Militar e o Dever Militar - Arts. 183 ao 204)",
                            reason: "Cobra a rotina direta da caserna e do policiamento: Deserção (Art. 187), Abandono de posto (Art. 195), Embriaguez em serviço (Art. 202) e Dormir em serviço (Art. 203)."
                        },
                        {
                            title: "Parte Especial (Livro I) - Título VII (Crimes contra a Administração Militar - Arts. 298 ao 339)",
                            reason: "Alta incidência de Peculato (Art. 303), Concussão (Art. 305), Corrupção (Arts. 308/309), Prevaricação (Art. 319) e Condescendência criminosa (Art. 322)."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Parte Geral - Títulos VI e VII (Ação Penal e Extinção da Punibilidade - Arts. 110 ao 135)",
                            reason: "Leitura focada nas causas de extinção da punibilidade (Art. 123) e na regra da ação penal pública incondicionada (Art. 121)."
                        },
                        {
                            title: "Parte Especial - Título IV (Crimes contra a Pessoa) e Título V (Crimes contra o Patrimônio)",
                            reason: "Cobrados de forma comparativa com o Código Penal comum (destaque especial para o Furto de Uso no Art. 241)."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Livro II da Parte Especial (Dos Crimes Militares em Tempo de Guerra - Arts. 355 ao 408)",
                            reason: "Incidência baixíssima; só caem conceitos gerais se o edital mencionar expressamente o Livro II."
                        },
                        {
                            title: "Parte Especial - Título I (Crimes contra a Segurança Externa do País - Arts. 136 ao 148)",
                            reason: "Voltado às Forças Armadas em conflitos externos; raramente cobrado em concursos de Polícias Militares."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Art. 9º (Parte Geral - Título I) — Crimes Militares em Tempo de Paz",
                            plainExplanation: "É o coração do CPM. Define quando um fato é crime militar: (I) quando só existe no CPM; (II) quando previsto no CPM ou na legislação penal comum (após a Lei 13.491/2017, incluindo tortura, abuso de autoridade, etc.) e praticado por militar da ativa contra outro militar da ativa, em quartel/viatura, ou por militar em serviço/em razão da função (mesmo contra civil!). Atenção: crimes dolosos contra a vida de civil praticados por PM vão para o Tribunal do Júri.",
                            practicalExample: "Um Soldado da PMDF, durante abordagem em serviço em Ceilândia, comete crime de abuso de autoridade ou tortura contra um civil. Como estava em serviço (Art. 9º, II, 'c') e a Lei 13.491/2017 abrange toda a legislação penal, ele responderá por crime militar na Auditoria Militar do DF."
                        },
                        {
                            article: "Arts. 5º e 6º (Parte Geral - Título I) — Tempo e Lugar do Crime",
                            plainExplanation: "Para o Tempo do Crime (Art. 5º), o CPM adota a Teoria da Atividade (momento da ação ou omissão). Já para o Lugar do Crime (Art. 6º), o CPM divide: nos crimes comissivos (ação), adota a Teoria da Ubiquidade (lugar da ação OU do resultado); porém, nos crimes omissivos, adota apenas a Teoria da Atividade (apenas o lugar onde deveria realizar-se a ação omitida).",
                            practicalExample: "Se um PM atira em alguém no DF e a vítima morre no hospital em Águas Lindas/GO (crime comissivo), o lugar do crime é tanto o DF quanto o GO (Ubiquidade). Mas se o crime for omissivo, considera-se apenas o local onde o PM omitiu o dever."
                        },
                        {
                            article: "Arts. 38 e 42 (Parte Geral - Título II) — Excludentes de Culpabilidade e de Ilicitude",
                            plainExplanation: "O Art. 38 afasta a culpabilidade na Coação Irresistível e na Obediência Hierárquica a ordem não manifestamente ilegal de superior (responde só o superior). O Art. 42 traz as excludentes de ilicitude e, em seu Parágrafo Único, prevê que não há crime quando o comandante usa meios violentos para compelir o subordinado a cumprir seu dever em caso de perigo, calamidade ou manutenção da ordem.",
                            practicalExample: "Durante um tumulto grave, um soldado entra em pânico e se recusa a avançar para conter a turba; o comandante da guarnição usa força física moderada para que ele retome a formação. A conduta do comandante é amparada pelo Art. 42, parágrafo único."
                        },
                        {
                            article: "Art. 55 (Parte Geral - Título V) — Penas Principais",
                            plainExplanation: "O CPM possui 7 penas principais: Morte (por fuzilamento, no tempo de guerra), Reclusão, Detenção, Prisão, Impedimento, Suspensão do exercício do posto/graduação/cargo/função e Reforma (Mnemônico: Mo-Re-De Pr-I-Su-Re). O CPM NÃO prevê pena de multa!",
                            practicalExample: "Questão do Cebraspe afirma que um soldado da PMDF foi condenado à pena de reclusão cumulada com multa pelo CPM. O item está ERRADO, pois multa não existe no Art. 55 do CPM."
                        },
                        {
                            article: "Art. 149 (Parte Especial - Título II) — Motim e Revolta",
                            plainExplanation: "Motim (caput) é a reunião de militares (mínimo de 2) agindo contra ordem de superior, negando-se a cumpri-la, praticando violência em conjunto ou ocupando quartel/viatura. Revolta (Parágrafo único) é o mesmo crime de motim, porém com os agentes ARMADOS (qualificadora que eleva a pena para reclusão de 8 a 20 anos).",
                            practicalExample: "Cinco policiais militares aquartelados trancam o portão do Batalhão e se recusam conjuntamente a sair para o policiamento ordenado pelo Comandante. Desarmados = Motim; armados = Revolta."
                        },
                        {
                            article: "Art. 187 (Parte Especial - Título III) — Deserção",
                            plainExplanation: "Ausentar-se o militar, sem licença, da unidade em que serve ou do lugar em que deve permanecer, por MAIS DE 8 (OITO) DIAS. A contagem inicia-se à zero hora do dia seguinte ao da verificação da falta e consuma-se após o oitavo dia (no 9º dia).",
                            practicalExample: "O Soldado falta na segunda-feira (dia 1). A contagem começa à 00h00 de terça-feira (dia 2). Se ele voltar até as 23h59 do dia 9 (8º dia de ausência), cometeu apenas transgressão disciplinar. Se virar para a 00h00 do dia 10 (mais de 8 dias), consumou-se a Deserção."
                        },
                        {
                            article: "Arts. 195, 202 e 203 (Parte Especial - Título III) — Abandono de Posto, Embriaguez em Serviço e Dormir em Serviço",
                            plainExplanation: "Abandono de Posto (Art. 195): sair do local de serviço designado antes de terminá-lo sem ordem superior. Embriaguez em Serviço (Art. 202): embriagar-se quando em serviço ou apresentar-se embriagado para prestá-lo. Dormir em Serviço (Art. 203): dormir em serviço de sentinela, vigia, plantão ou ronda (exige dolo; não há modalidade culposa!).",
                            practicalExample: "Uma guarnição da PMDF estaciona a viatura em local escondido na madrugada de ronda, reclina os bancos e dorme. Há dolo, configurando o crime do Art. 203."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Arts. 39 e 43 (Parte Geral - Título II) — Teoria Diferenciadora do Estado de Necessidade",
                            plainExplanation: "Diferente do CP comum (Teoria Unitária), o CPM adota a Teoria Diferenciadora: o estado de necessidade exclui a ilicitude (Art. 43 - quando o bem sacrificado é de valor menor que o bem salvo) ou exclui a culpabilidade (Art. 39 - quando o bem sacrificado é de valor igual ou superior ao bem protegido).",
                            practicalExample: "Para salvar a própria vida em um naufrágio, um militar sacrifica a vida de outro colega (bens de mesmo valor = vida vs. vida). Não exclui a ilicitude, mas afasta a culpabilidade pelo Art. 39."
                        },
                        {
                            article: "Art. 163 (Parte Especial - Título II) — Recusa de Obediência",
                            plainExplanation: "Recusar obedecer a ordem do superior sobre assunto ou matéria de serviço, ou relativamente a dever imposto em lei, regulamento ou instrução. Ordem particular não entra!",
                            practicalExample: "Se um Oficial ordena que o Soldado lave o seu veículo particular e o Soldado recusa, NÃO há crime do Art. 163, pois não é matéria de serviço."
                        },
                        {
                            article: "Art. 241 (Parte Especial - Título V) — Furto de Uso",
                            plainExplanation: "No CP comum, furto de uso é fato atípico. No CPM (Art. 241), tirar coisa alheia móvel para uso momentâneo e restituí-la imediatamente intacta É CRIME MILITAR!",
                            practicalExample: "Um Soldado pega a motocicleta de um colega no estacionamento do Batalhão sem permissão apenas para ir almoçar rápido e a devolve no mesmo lugar intacta. Cometeu crime militar de furto de uso."
                        },
                        {
                            article: "Art. 290 (Parte Especial - Título VI) — Tráfico, Posse ou Uso de Entorpecente em Local Militar",
                            plainExplanation: "Portar ou guardar droga dentro do quartel ou viatura, ainda que para uso próprio e em quantidade mínima, configura crime militar punido com reclusão (1 a 5 anos).",
                            practicalExample: "Soldado é flagrado no alojamento do Batalhão com 1 grama de maconha para consumo próprio. Responde pelo crime militar do Art. 290 (não se aplica o Art. 28 da Lei de Drogas na caserna)."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 50 (Parte Geral - Título III) — Menores de 18 anos no texto do CPM vs. CF/88",
                            plainExplanation: "O texto literal do Art. 50 do CPM diz que o maior de 16 e menor de 18 anos pode ser imputável se tiver desenvolvimento psíquico suficiente; contudo, o Art. 228 da CF/88 NÃO recepcionou essa regra, fixando a inimputabilidade absoluta para menores de 18 anos.",
                            practicalExample: "Se a prova perguntar 'conforme a Constituição e a jurisprudência', o menor de 18 anos é sempre inimputável."
                        },
                        {
                            article: "Art. 322 (Parte Especial - Título VII) — Condescendência Criminosa (Dolosa e Culposa)",
                            plainExplanation: "Deixar o superior de responsabilizar subordinado que comete infração. No CPM, pune-se tanto a forma dolosa (por indulgência) quanto a culposa (por negligência!). No CP comum só existe a forma dolosa.",
                            practicalExample: "Um Sargento deixa de comunicar uma infração de um Soldado da sua guarnição por puro esquecimento/desleixo (negligência). Comete condescendência criminosa na modalidade culposa."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Lugar do Crime Omissivo (Art. 6º): O Cebraspe adora afirmar que o CPM adota a Teoria da Ubiquidade para todos os crimes. Errado: nos crimes omissivos, aplica-se apenas a Teoria da Atividade.",
                        "Estado de Necessidade (Arts. 39 e 43): Afirmar que todo estado de necessidade no CPM exclui a ilicitude (crime). Errado: o CPM adota a Teoria Diferenciadora (exclui a ilicitude no Art. 43 ou a culpabilidade no Art. 39).",
                        "Recusa de Obediência em Ordem Particular (Art. 163): Dizer que o soldado que se recusa a cumprir ordem pessoal/particular do superior comete crime de recusa de obediência. Errado: o tipo exige assunto ou matéria de serviço.",
                        "Furto de Uso (Art. 241) e Condescendência Culposa (Art. 322): Afirmar que são fatos atípicos no Direito Penal Militar assim como no Direito Penal Comum. Errado: ambos são expressamente tipificados no CPM.",
                        "Prazo da Deserção (Art. 187): Dizer que completar 8 dias de ausência consuma a deserção. Errado: exige MAIS DE 8 DIAS (só se consuma no 9º dia de ausência injustificada)."
                    ],
                    jurisprudence: [
                        "STF — Inaplicabilidade do Princípio da Insignificância no Art. 290 (Drogas no Quartel): É pacífico no STF que não cabe princípio da insignificância na posse de drogas para uso próprio dentro de organização militar, em face da proteção à hierarquia e à disciplina.",
                        "STF/STJ — Ampliação da Lei nº 13.491/2017 (Art. 9º, II): Qualquer crime previsto na legislação penal comum (como Abuso de Autoridade, Tortura, Estatuto do Desarmamento, Crimes de Trânsito) praticado por Policial Militar em serviço ou em razão da função contra civil é crime militar de competência da Justiça Militar Estadual/DF.",
                        "CF/88 (Art. 125, § 4º) e Art. 9º, § 1º do CPM: Crimes dolosos contra a vida praticados por Policial Militar contra civil são de competência do Tribunal do Júri (Justiça Comum)."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Art. 9º do Código Penal Militar (com redação da Lei nº 13.491/2017)",
                        themes: "Controle da atividade policial, ética no policiamento ostensivo, prevenção de desvios de conduta e Estado Democrático de Direito.",
                        modelSentence: "Sob a égide do Estado Democrático de Direito, a atuação das corporações policiais militares submete-se a um rigoroso regime de responsabilidade jurídica. Nesse sentido, o Código Penal Militar (Decreto-Lei nº 1.001/1969), notadamente após a ampliação de competência promovida pela Lei nº 13.491/2017 em seu artigo 9º, consolida a tutela intransigente da hierarquia, da disciplina e da moralidade administrativa, assegurando que o uso legítimo da força estatal no policiamento ostensivo caminhe de forma indissociável do respeito aos direitos fundamentais do cidadão."
                    },
                    {
                        legalDevice: "Arts. 195 a 203 do Código Penal Militar (Dos Crimes contra o Dever Militar)",
                        themes: "Policiamento ostensivo, preservação da ordem pública, prontidão operacional da PMDF e eficiência no serviço público.",
                        modelSentence: "A preservação da ordem pública e da incolumidade das pessoas demanda da Polícia Militar uma prontidão operacional ininterrupta. Por essa razão, o Código Penal Militar tutela com rigor o dever funcional nos artigos 195 a 203 — vedando condutas como o abandono de posto e a negligência no serviço —, pois a presença vigilante do policial militar nas ruas representa a materialização da segurança pública e da confiança comunitária no Estado."
                    },
                    {
                        legalDevice: "Art. 38, alínea 'b', do Código Penal Militar (Limites da Obediência Hierárquica)",
                        themes: "Direitos Humanos na abordagem policial, limites do poder hierárquico, obediência legal vs. arbítrio.",
                        modelSentence: "Embora a hierarquia e a disciplina constituam os pilares constitucionais das instituições militares, a subordinação funcional não se confunde com a obediência cega à ilegalidade. Conforme preceitua o artigo 38, alínea 'b', do Código Penal Militar, a obediência hierárquica somente afasta a culpabilidade quando a ordem não for manifestamente ilegal, demonstrando que o ordenamento jurídico brasileiro harmoniza o rigor castrense com a proteção inegociável da dignidade da pessoa humana."
                    }
                ]
            },

            cppm: {
                lawName: "Decreto-Lei nº 1.002/1969 (Código de Processo Penal Militar - CPPM)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "O Código de Processo Penal Militar (Decreto-Lei nº 1.002/1969 - CPPM) regula de forma autônoma e especializada o exercício da Polícia Judiciária Militar, o Inquérito Policial Militar (IPM), a Ação Penal Militar e todo o trâmite processual perante a Justiça Militar em tempo de paz e em tempo de guerra. Diferentemente do processo penal comum, o CPPM estrutura seus procedimentos sob a ótica da preservação da hierarquia e da disciplina, determinando regras estritas de precedência hierárquica na condução de investigações, buscas, prisões provisórias e lavratura de autos de prisão em flagrante delito.\n\nNo âmbito operacional e administrativo da Polícia Militar do Distrito Federal (PMDF), o CPPM é a ferramenta jurídica diária tanto dos Oficiais (que exercem originariamente a autoridade de Polícia Judiciária Militar, presidem IPMs e Autos de Prisão em Flagrante - APFD) quanto das Praças (Subtenentes, Sargentos, Cabos e Soldados), que atuam diretamente como condutores em prisões em flagrante de crimes militares, executores de mandados de busca e apreensão, escrivães de IPM (Sargentos e Subtenentes nos casos de indiciado Praça) e garantidores da cadeia de custódia do local de crime militar.\n\nPara as provas do Cebraspe (CFP e CFO da PMDF), o estudo do CPPM deve concentrar-se cirurgicamente nos Títulos iniciais do Livro I: Aplicação da Lei Processual Penal Militar (Arts. 1º a 6º), Polícia Judiciária Militar (Arts. 7º e 8º), Inquérito Policial Militar - IPM (Arts. 9º a 28), Ação Penal Militar (Arts. 29 a 33), Medidas Preventivas e Assecuratórias como Busca, Apreensão e Menagem (Arts. 170 a 269) e Prisão em Flagrante e Preventiva (Arts. 243 a 261), além dos processos especiais de Deserção e Insubmissão.",
                    keyConcepts: [
                        "Polícia Judiciária Militar vs. Polícia Judiciária Comum (Arts. 7º e 8º do CPPM): A apuração dos crimes militares cabe exclusivamente às autoridades militares elencadas no Art. 7º (Comandantes, Chefes e Diretores de OM), que podem delegar o exercício a Oficiais da ativa (Art. 7º, § 1º). A Polícia Civil e a Polícia Federal NÃO têm atribuição para instaurar inquérito sobre crime militar, salvo na hipótese de crime doloso contra a vida de civil (Art. 82, § 2º do CPPM).",
                        "Natureza, Prazos e Arquivamento do Inquérito Policial Militar - IPM (Arts. 9º a 28 do CPPM): O IPM é a apuração sumária de fato que configure crime militar e de sua autoria, tendo o caráter de instrução provisória destinada a fornecer elementos ao Ministério Público. Seus prazos são próprios e inconfundíveis com o CPP comum: 20 dias se o indiciado estiver preso (inprorrogáveis) e 40 dias se o indiciado estiver solto (prorrogáveis por mais 20 dias pela autoridade militar superior). A autoridade militar JAMAIS pode mandar arquivar autos de IPM (Art. 24), embora possa deixar de instaurá-lo se o fato não for crime militar.",
                        "Respeito Estrito à Hierarquia e Antiguidade na Investigação (Art. 7º, §§ 2º e 3º, Art. 11 e Art. 249): No CPPM, um militar de posto ou graduação inferior nunca investiga militar superior ou mais antigo. Se no curso do IPM o Encarregado (Oficial) verificar indícios contra Oficial de posto superior ao seu ou mais antigo, deverá sobrestar o inquérito e comunicar imediatamente à autoridade instauradora para substituição (Art. 10, § 5º). Já o Escrivão do IPM é um 2º ou 1º Tenente (se o indiciado for Oficial) ou um Sargento/Subtenente (se o indiciado for Praça ou civil).",
                        "Detenção do Indiciado pelo Encarregado do IPM vs. Recepção Constitucional (Art. 18 do CPPM vs. Art. 5º, LXI da CF/88): O texto literal do Art. 18 do CPPM prevê que o encarregado do inquérito pode deter o indiciado por até 30 dias (+ 20 dias de prorrogação) para averiguações sem ordem judicial, exceto se for crime propriamente militar (conforme interpretação do Art. 5º, LXI da CF/88). As bancas cobram tanto a literalidade do Art. 18 quanto o entendimento constitucional!",
                        "Instituto da Menagem (Arts. 263 a 269 do CPPM): Instituto exclusivo do processo penal militar, concedido pelo juiz nos crimes cujo máximo da pena privativa de liberdade não exceda a 4 (quatro) anos, permitindo que o militar cumpra a cautelar em quartel, navio, acampamento ou lugar sujeito à administração militar (ou em sua própria residência/cidade), sem rigor carcerário, sendo que o tempo de menagem em quartel conta como tempo de pena (exceto para o reincidente)."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Livro I - Título II e III (Da Polícia Judiciária Militar e do Inquérito Policial Militar - Arts. 7º ao 28)",
                            reason: "Mais de 50% das questões de CPPM em provas da PMDF saem destes 22 artigos: titulares da PJM, delegação, escrivão, prazos (20 preso / 40+20 solto), incomunicabilidade e arquivamento."
                        },
                        {
                            title: "Livro I - Título XIII (Medidas Preventivas e Assecuratórias: Busca, Prisão em Flagrante, Preventiva e Menagem - Arts. 170 ao 269)",
                            reason: "Aborda a prisão em flagrante (Art. 243 e seguintes), regras de captura de superior hierárquico (Art. 223/249), prisão preventiva (Art. 254) e Menagem (Art. 263)."
                        },
                        {
                            title: "Livro I - Título I e IV (Aplicação da Lei Processual Militar e Ação Penal Militar - Arts. 1º ao 6º e 29 ao 33)",
                            reason: "Princípio do tempus regit actum, interpretação literal nos casos de restrição da liberdade e obrigatoriedade da ação penal pública incondicionada."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Livro II - Título II (Dos Processos Especiais: Deserção de Oficial e de Praça - Arts. 451 ao 465)",
                            reason: "Rito do Termo de Deserção, lavratura após o 8º dia de ausência e condição de procedibilidade (captura ou apresentação voluntária do desertor)."
                        },
                        {
                            title: "Livro I - Título XII (Das Provas no Processo Penal Militar - Arts. 143 ao 169)",
                            reason: "Interrogatório, confissão, perícia e exames de corpo de delito."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Livro IV (Dos Processos em Tempo de Guerra - Arts. 675 ao 710)",
                            reason: "Incidência praticamente nula em concursos de Polícias Militares estaduais e do DF."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 7º e 8º — Exercício e Competência da Polícia Judiciária Militar (PJM)",
                            plainExplanation: "São autoridades de PJM os Comandantes de forças, unidades ou navios e Diretores de órgãos militares. Eles podem delegar suas atribuições a Oficiais da ativa para fins especificados e por tempo limitado. A PJM compete apurar os crimes militares, cumprir mandados de prisão da Justiça Militar e solicitar informações à polícia civil.",
                            practicalExample: "O Comandante de um Batalhão da PMDF toma conhecimento de um furto de armamento no quartel. Ele pode presidir pessoalmente o IPM ou baixar portaria delegando a presidência a um Capitão ou Tenente da ativa da unidade."
                        },
                        {
                            article: "Art. 10, § 5º e Art. 11 — Encarregado e Escrivão do IPM (Hierarquia Estrita)",
                            plainExplanation: "O Encarregado do IPM será, sempre que possível, Oficial de posto não inferior ao de Capitão; se no curso do IPM surgir indício contra Oficial mais graduado ou mais antigo que o encarregado, este paralisa os autos e devolve à autoridade delegante. O Escrivão será 2º ou 1º Tenente (se o indiciado for Oficial) ou Subtenente/Sargento (nos demais casos, como indiciado Soldado ou Cabo).",
                            practicalExample: "Um 1º Tenente preside um IPM apurando conduta de um Cabo. Durante as oitivas, descobre-se que o mandante do crime foi um Major. O Tenente NÃO pode indiciar nem interrogar o Major; deve remeter imediatamente os autos ao Comandante para designação de Oficial superior ao Major."
                        },
                        {
                            article: "Arts. 17 e 20 — Incomunicabilidade e Prazos de Conclusão do IPM",
                            plainExplanation: "Prazos do IPM (Art. 20): 20 dias se o indiciado estiver preso (contados da execução da prisão, improrrogáveis) ou 40 dias se estiver solto (contados da instauração, prorrogáveis por mais 20 dias pela autoridade militar superior). O Art. 17 prevê incomunicabilidade do indiciado preso por até 3 dias no texto literal do CPPM, mas o STF considera que a incomunicabilidade não foi recepcionada pela CF/88 (Art. 136, § 3º, IV).",
                            practicalExample: "Questão de prova pergunta o prazo literal do CPPM para conclusão do IPM com indiciado solto: 40 dias, prorrogáveis por mais 20 dias (diferente do CPP comum, que é de 30 dias)."
                        },
                        {
                            article: "Arts. 24 e 28 — Vedação de Arquivamento pela Autoridade Militar e Dispensa de IPM",
                            plainExplanation: "A autoridade militar NÃO pode mandar arquivar autos de inquérito, embora possa deixar de instaurá-lo se o fato não configurar crime militar (Art. 24). O IPM pode ser dispensado se o fato e a autoria já estiverem esclarecidos por Auto de Prisão em Flagrante ou sindicância (Art. 28).",
                            practicalExample: "Após 40 dias de IPM, o Oficial Encarregado conclui que o Soldado agiu em legítima defesa. Mesmo assim, nem o Encarregado nem o Comandante do Batalhão podem arquivar o IPM; devem remetê-lo ao Juízo Militar para vista do Ministério Público."
                        },
                        {
                            article: "Arts. 243, 244 e 249 — Prisão em Flagrante Delito Militar e Captura de Superior",
                            plainExplanation: "Qualquer pessoa pode e os militares DEVEM prender quem for insubmisso ou desertor, ou seja encontrado em flagrante delito militar (Art. 243). Pela regra da hierarquia, somente em caso de FLAGRANTE DELITO o militar poderá prender outro militar de posto ou graduação superior ao seu, devendo entregá-lo imediatamente a autoridade de maior precedência (Art. 223/249).",
                            practicalExample: "Um Soldado da PMDF presencia um Sargento ou Tenente praticando crime militar em flagrante. O Soldado tem o dever legal de dar voz de prisão em flagrante ao superior, apresentando-o imediatamente a um Oficial de posto superior ao do preso."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Arts. 29 a 31 — Ação Penal Militar",
                            plainExplanation: "No Processo Penal Militar, a ação penal é SEMPRE PÚBLICA e somente pode ser promovida por denúncia do Ministério Público Militar/Distrital. Não existe ação penal privada (nem mesmo subsidiária da pública, salvo entendimento jurisprudencial do STF) nem ação pública condicionada à representação da vítima no texto do CPPM (exceto nos crimes contra a requisição de Ministro nos arts. 136 a 141 do CPM).",
                            practicalExample: "Se um militar comete crime de lesão corporal leve ou ameaça em contexto militar contra outro militar da ativa, a ação penal no CPPM é pública incondicionada."
                        },
                        {
                            article: "Arts. 263 a 269 — Menagem",
                            plainExplanation: "Concedida nos crimes cuja pena privativa de liberdade máxima não exceda a 4 anos. Não será concedida ao reincidente, nem se houver receio de fuga. Cessa com a sentença condenatória, ainda que recorrível (Art. 267).",
                            practicalExample: "Militar primário responde por crime cuja pena máxima é de 3 anos de detenção. O juiz pode conceder menagem para que ele permaneça livre dentro do perímetro do Batalhão."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Arts. 451 a 457 — Processo Especial de Deserção",
                            plainExplanation: "Consumada a deserção (mais de 8 dias de ausência), lavra-se o Termo de Deserção com 2 testemunhas (tem caráter de instrução provisória e dispensa IPM). O desertor sem estabilidade é excluído do serviço ativo (ou agregado, se Oficial ou Praça estável), e o processo judicial só se inicia quando ele for capturado ou se apresentar voluntariamente (condição de procedibilidade).",
                            practicalExample: "Um Soldado com 2 anos de PMDF (sem estabilidade) deserta. Após o Termo de Deserção, ele é excluído e só será denunciado e processado quando for capturado ou se apresentar."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Prazos do IPM vs. IP Comum (Art. 20): Trocar os prazos do CPPM (20 dias preso / 40+20 solto) pelos prazos do CPP comum (10 dias preso / 30 solto).",
                        "Escrivão do IPM (Art. 11): Afirmar que um Cabo ou Soldado pode ser designado Escrivão de um IPM. Errado: o CPPM exige que o escrivão seja Oficial subalterno (1º ou 2º Tenente, quando o indiciado for Oficial) ou Subtenente/Sargento (nos demais casos).",
                        "Arquivamento do IPM (Art. 24): Dizer que o Comandante do Batalhão pode determinar o arquivamento do IPM quando ficar provada a inexistência do fato. Errado: a autoridade militar nunca arquiva IPM já instaurado.",
                        "Cômputo da Prorrogação do IPM Solto (Art. 20, § 1º): Afirmar que quem concede a prorrogação de 20 dias do IPM com indiciado solto é o Juiz de Direito. Errado: no CPPM, a prorrogação de 20 dias é concedida pela autoridade militar superior!",
                        "Cessação da Menagem (Art. 267): Dizer que a menagem só cessa com o trânsito em julgado da sentença condenatória. Errado: pela literalidade do Art. 267 do CPPM, a menagem cessa com a prolação da sentença condenatória, ainda que não tenha transitado em julgado."
                    ],
                    jurisprudence: [
                        "STF — Direito ao Advogado e Súmula Vinculante 14 no IPM: Embora o Art. 16 do CPPM afirme que o IPM é sigiloso, aplica-se integralmente a Súmula Vinculante 14 do STF, garantindo ao defensor constituído pelo investigado amplo acesso aos elementos de prova já documentados nos autos.",
                        "STF — Incomunicabilidade do Preso (Art. 17 do CPPM): A incomunicabilidade do indiciado preso por até 3 dias prevista no Art. 17 do CPPM não foi recepcionada pela Constituição Federal de 1988, uma vez que é vedada até mesmo durante o Estado de Defesa (Art. 136, § 3º, IV da CF/88).",
                        "STF (ADPF 289) — Interrogatório ao Final da Instrução: Embora o Art. 302 do CPPM preveja o interrogatório do réu como primeiro ato do processo, o STF fixou que, em respeito à ampla defesa, aplica-se o Art. 400 do CPP comum, realizando-se o interrogatório ao final da instrução criminal."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Arts. 7º ao 9º do Código de Processo Penal Militar (Polícia Judiciária Militar e Finalidade do IPM)",
                        themes: "Apuração de desvios de conduta policial, corregedoria, controle interno das instituições militares e transparência.",
                        modelSentence: "O fortalecimento da legitimidade social das Polícias Militares passa necessariamente pela eficiência de seus mecanismos de controle interno. Por meio do Inquérito Policial Militar, disciplinado nos artigos 9º e seguintes do Código de Processo Penal Militar (Decreto-Lei nº 1.002/1969), a Polícia Judiciária Militar assegura a apuração rigorosa e técnica de eventuais ilícitos funcionais, preservando tanto a disciplina da caserna quanto a confiança da sociedade na corporação."
                    },
                    {
                        legalDevice: "Art. 243 do Código de Processo Penal Militar (Dever Funcional de Prisão em Flagrante)",
                        themes: "Prontidão policial, dever de agir, combate à impunidade e preservação da ordem pública.",
                        modelSentence: "Diferentemente do cidadão comum, a quem a lei confere mera faculdade de agir diante do ilícito, ao agente da segurança pública impõe-se o dever jurídico inescusável de intervenção. Conforme preceitua o artigo 243 do Código de Processo Penal Militar, os militares têm a obrigação funcional de efetuar a prisão daquele que se encontre em flagrante delito, materializando a resposta imediata do Estado na defesa da ordem pública."
                    }
                ]
            },

            estatuto: {
                lawName: "Lei Federal nº 7.289/1984 (Estatuto dos Policiais Militares da PMDF)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "A Lei Federal nº 7.289/1984 institui o Estatuto dos Policiais Militares da Polícia Militar do Distrito Federal (PMDF), regulando a situação, as obrigações, os deveres, os direitos e as prerrogativas de todos os integrantes da corporação, sejam da ativa ou da inatividade (reserva remunerada e reformados). Por ser a PMDF organizada e mantida pela União (Art. 21, XIV da CF/88), este Estatuto tem natureza de lei federal e é presença obrigatória em 100% dos editais de Soldado (CFP) e Oficial (CFO), sendo cobrado tanto em Legislação Específica quanto como base para estudos de caso.\n\nO Estatuto estrutura a vida funcional do policial militar sob os pilares da Hierarquia (ordenação da autoridade em níveis diferentes dentro da estrutura da corporação, por postos e graduações) e da Disciplina (rigorosa observância e acatamento integral das leis, regulamentos, normas e disposições que fundamentam o organismo policial-militar). Ele estabelece a escala hierárquica completa dos Círculos de Oficiais (Superiores, Intermediários e Subalternos) e dos Círculos de Praças (Praças Especiais: Aspirante-a-Oficial e Cadetes; e Praças graduados: Subtenente, Sargentos, Cabos e Soldados), bem como os critérios de precedência funcional e antiguidade.\n\nAlém da parte de ética, valor e deveres policiais-militares (Arts. 27 a 35), o Estatuto detalha minuciosamente os institutos de movimentação na carreira que mais caem nas provas do Cebraspe: Agregação (afastamento temporário do serviço ativo em que o PM fica 'sem número' na escala), Reversão (retorno ao respectivo quadro), Excedente, Ausente (mais de 24 horas) vs. Desertor (mais de 8 dias), Transferência para a Reserva Remunerada (a pedido ou ex officio), Reforma (inatividade definitiva por incapacidade ou idade-limite), Demissão (aplicável a Oficiais), Licenciamento e Exclusão a bem da disciplina (aplicável a Praças).",
                    keyConcepts: [
                        "Condição Jurídica dos Policiais Militares e Situações de Atividade vs. Inatividade (Arts. 2º a 5º): Os integrantes da PMDF constituem uma categoria especial de servidores públicos do Distrito Federal denominados policiais-militares, encontrando-se na ATIVA (policiais de carreira, incluídos, alunos de órgãos de formação e convocados/designados) ou na INATIVIDADE (Reserva Remunerada, quando percebem remuneração do DF mas permanecem sujeitos à prestação de serviço mediante convocação ou designação; e Reformados, quando estão dispensados definitivamente da prestação de serviço na ativa).",
                        "Hierarquia, Disciplina, Posto e Graduação (Arts. 12 a 19): Posto é o grau hierárquico do Oficial, conferido por ato do Governador do Distrito Federal e confirmado em Carta Patente; Graduação é o grau hierárquico da Praça, conferido pelo Comandante-Geral da PMDF. Os Aspirantes-a-Oficial e os Alunos-Oficiais (Cadetes do CFO) são denominados Praças Especiais. A precedência entre policiais-militares da ativa do mesmo grau hierárquico é assegurada pela antiguidade no posto ou graduação, salvo nos casos de precedência funcional.",
                        "Estabilidade da Praça e Requisitos de Ingresso (Arts. 10, 11 e 50): O ingresso na PMDF exige nacionalidade brasileira, quitação eleitoral e militar, idoneidade moral, aptidão física/mental/psicológica e nível superior de escolaridade (conforme alteração dada pela Lei nº 11.134/2005 e Lei nº 12.086/2009). A Praça adquire ESTABILIDADE ao completar 10 (dez) anos ou mais de tempo de efetivo serviço policial-militar (Art. 50, IV, 'a').",
                        "Agregação, Reversão e Excedente (Arts. 77 a 83): A Agregação é a situação na qual o policial-militar da ativa deixa de ocupar vaga na escala hierárquica de seu Quadro, nela permanecendo sem número (ex: aguardar transferência para a reserva, afastamento temporário por incapacidade após 1 ano contínuo, deserção/extravio, posse em cargo civil temporário não eletivo). A Reversão (Art. 80) é o ato pelo qual o agregado retorna ao respectivo Quadro tão logo cesse o motivo da agregação. Excedente (Art. 81) é a situação transitória especial daquele que reverte ou é promovido sem haver vaga no quadro.",
                        "Formas de Desligamento e Exclusão do Serviço Ativo (Arts. 88 a 118): O Estatuto diferencia rigorosamente as formas de saída para Oficiais e Praças: a DEMISSÃO (Arts. 101 a 103) aplica-se exclusivamente aos OFICIAIS (a pedido ou ex officio, podendo ser sem indenização se contar mais de 5 anos de oficialato, ou com indenização das despesas de preparação se tiver menos de 5 anos); o LICENCIAMENTO (Art. 109) aplica-se às Praças sem estabilidade (a pedido ou ex officio); e a EXCLUSÃO A BEM DA DISCIPLINA (Art. 112) aplica-se aos Aspirantes-a-Oficial e às Praças com estabilidade assegurada (após Conselho de Disciplina ou condenação judicial)."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Título I - Generalidades (Capítulo I a III: Da Hierarquia, Disciplina, Círculos Hierárquicos e Precedência - Arts. 1º ao 26)",
                            reason: "Conceitos de ativa vs. inatividade (reserva e reforma), definição de Posto (Governador) vs. Graduação (Comandante-Geral), Praças Especiais e regras de antiguidade e precedência."
                        },
                        {
                            title: "Título IV - Das Disposições Diversas: Capítulo I (Da Agregação, Reversão, Excedente, Ausente e Desertor - Arts. 77 ao 87)",
                            reason: "É o bloco campeão absoluto de questões do Cebraspe sobre a Lei 7.289/84: hipóteses de agregação, prazo de ausente (> 24h) e desligamento."
                        },
                        {
                            title: "Título IV - Capítulo II (Do Desligamento ou Exclusão do Serviço Ativo: Reserva, Reforma, Demissão, Licenciamento e Exclusão - Arts. 88 ao 122)",
                            reason: "Diferença cirúrgica entre Reserva Remunerada e Reforma, e entre Demissão (só Oficial!), Licenciamento (Praça sem estabilidade) e Exclusão a bem da disciplina."
                        },
                        {
                            title: "Título II - Das Obrigações e dos Deveres Policiais-Militares (Valor, Ética e Violação dos Deveres - Arts. 27 ao 49)",
                            reason: "Atributos do valor e da ética policial-militar, vedações de manifestação coletiva, proibição de comércio/gerência de empresa e competência do Conselho de Justificação (Oficiais) e Conselho de Disciplina (Aspirante e Praças estáveis)."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Título III - Dos Direitos e das Prerrogativas dos Policiais-Militares (Férias, Licenças e Prerrogativas - Arts. 50 ao 76)",
                            reason: "Estabilidade com 10 anos de efetivo serviço, tipos de licenças (LTSP, LTIP, LTSPF), porte de arma e prerrogativas de prisão especial."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Título V - Disposições Gerais, Transitórias e Finais (Arts. 129 ao 145)",
                            reason: "Regras de transição de 1984 com pouquíssima incidência em provas atuais."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 13, 15 e 16 — Hierarquia, Disciplina, Posto, Graduação e Praças Especiais",
                            plainExplanation: "A hierarquia policial-militar é a ordenação da autoridade em níveis diferentes; a disciplina é a rigorosa observância e o acatamento integral das leis e regulamentos. POSTO é o grau do Oficial (conferido pelo Governador do DF); GRADUAÇÃO é o grau da Praça (conferido pelo Comandante-Geral da PMDF). Aspirantes-a-Oficial e Alunos-Oficiais (Cadetes) são Praças Especiais.",
                            practicalExample: "Em questão do Cebraspe: 'O grau hierárquico de Subtenente é um posto conferido pelo Comandante-Geral'. ERRADO! Subtenente é Praça, portanto possui graduação (e não posto)."
                        },
                        {
                            article: "Art. 18 — Precedência entre Policiais Militares de Quadros Diferentes e da Reserva",
                            plainExplanation: "Em igualdade de posto ou graduação: (1º) os policiais da ativa têm precedência sobre os da inatividade; (2º) entre os da ativa, prevalece a antiguidade no posto ou graduação, salvo precedência funcional. Os Alunos-Oficiais (Cadetes) têm precedência sobre os Subtenentes; e os Cabos têm precedência sobre os alunos do Curso de Formação de Sargentos (que são equiparados a Cabos para efeito de precedência).",
                            practicalExample: "Um 1º Sargento da ativa mais moderno encontra um 1º Sargento da reserva remunerada que foi para a inatividade há 10 anos. Na precedência hierárquica (Art. 18, § 2º), o 1º Sargento da ativa tem precedência sobre o da inatividade!"
                        },
                        {
                            article: "Arts. 48 e 49 — Conselho de Justificação (Oficiais) vs. Conselho de Disciplina (Aspirante e Praças Estáveis)",
                            plainExplanation: "O Oficial presumivelmente incapaz de permanecer na ativa é submetido a CONSELHO DE JUSTIFICAÇÃO (pode ser submetido até mesmo Oficial da reserva remunerada ou reformado!). Já o Aspirante-a-Oficial e as Praças com estabilidade assegurada (10+ anos) são submetidos a CONSELHO DE DISCIPLINA.",
                            practicalExample: "Um Cabo com 12 anos de PMDF (portanto, estável) comete falta grave que pode gerar exclusão a bem da disciplina. Ele será submetido a Conselho de Disciplina (e nunca a Conselho de Justificação)."
                        },
                        {
                            article: "Art. 50, IV, 'a' e Art. 67 — Estabilidade da Praça (10 anos) e Licenças (LTIP, LTSPF e LTSP)",
                            plainExplanation: "São direitos do policial-militar: a estabilidade, quando Praça com 10 (dez) ou mais anos de tempo de efetivo serviço. A Licença para Tratar de Interesse Particular (LTIP) é concedida ao PM com mais de 10 anos de efetivo serviço e com prejuízo da remuneração e da contagem de tempo de serviço.",
                            practicalExample: "Um Soldado com 4 anos de PMDF ainda não goza de estabilidade estatutária pelo Art. 50, IV, 'a', pois a lei exige 10 anos de efetivo serviço."
                        },
                        {
                            article: "Arts. 77 a 80 — Agregação e Reversão",
                            plainExplanation: "A Agregação deixa o militar da ativa 'sem número' na escala hierárquica do seu Quadro. Ocorre quando: (I) é nomeado para cargo policial-militar ou considerado de natureza policial-militar fora do âmbito da PMDF; (II) aguarda transferência ex officio para a reserva; (III) permanece afastado temporariamente do serviço ativo por motivo de ter sido julgado incapaz temporariamente, após 1 ano contínuo de tratamento; ou por ter passado à disposição de órgão civil para exercer função de natureza civil; ou por ter sido considerado oficialmente extraviado/desertor.",
                            practicalExample: "Um Capitão da PMDF fica em licença para tratamento de saúde própria (incapaz temporariamente) por mais de 1 ano contínuo. Ao completar 1 ano contínuo, ele é AGREGADO ao seu quadro."
                        },
                        {
                            article: "Arts. 84 e 85 — Ausente vs. Desertor",
                            plainExplanation: "É considerado AUSENTE o policial-militar que, por mais de 24 (vinte e quatro) horas consecutivas, deixar de comparecer à sua Organização Policial-Militar sem comunicar qualquer motivo de impedimento, ou ausentar-se sem licença do local onde deve permanecer. Já o DESERTOR é regido pela legislação penal militar (mais de 8 dias de ausência).",
                            practicalExample: "O Soldado faltou ao serviço de segunda-feira às 07h e na terça-feira às 08h ainda não compareceu nem justificou. Passadas 24 horas consecutivas, ele é declarado administrativamente AUSENTE (mas ainda não é desertor)."
                        },
                        {
                            article: "Arts. 90 a 112 — Reserva Remunerada, Reforma, Demissão, Licenciamento e Exclusão",
                            plainExplanation: "Reserva Remunerada (Art. 90): a pedido (30 anos de serviço) ou ex officio (idade-limite, atingir 6 anos como Coronel, ultrapassar 2 anos contínuos em LTIP ou em cargo civil não eletivo, ou ser diplomado em cargo eletivo se tiver 10+ anos). Reforma (Art. 94): inatividade definitiva por atingir idade-limite de permanência na reserva (68 anos para Oficial Superior; 64 anos para Capitão e Oficial Subalterno; 60 anos para Praças) ou incapacidade definitiva. Demissão (Art. 101): aplica-se SÓ a Oficiais. Licenciamento (Art. 109): aplica-se SÓ a Praças sem estabilidade.",
                            practicalExample: "Se um Oficial pede para sair da PMDF antes de completar 5 anos de oficialato, sofrerá DEMISSÃO a pedido, mas terá de indenizar o Estado pelas despesas de sua formação (Art. 102, II)."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 28, § 1º e Art. 29 — Proibição de Manifestações Coletivas e de Comércio pelo Policial da Ativa",
                            plainExplanation: "São proibidas quaisquer manifestações coletivas, tanto sobre atos de superiores quanto as de caráter reivindicatório ou político (Art. 28, § 1º). Ao policial-militar da ativa é VEDADO comerciar ou tomar parte na administração ou gerência de sociedade ou dela ser sócio ou participar, exceto como acionista ou quotista em sociedade anônima ou por quotas de responsabilidade limitada (Art. 29).",
                            practicalExample: "Um Sargento da ativa da PMDF pode comprar ações na Bolsa de Valores ou ser sócio quotista minoritário de uma empresa Ltda., mas NÃO pode ser o sócio-gerente ou administrador da empresa."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Arts. 86 e 87 — Desaparecido e Extraviado",
                            plainExplanation: "É considerado DESAPARECIDO o policial-militar da ativa que, no desempenho de qualquer serviço, em viagem, em operações policiais-militares ou em caso de calamidade pública, tiver paradeiro ignorado por mais de 8 (oito) dias (só se não houver indício de deserção!). Se permanecer desaparecido por mais de 30 (trinta) dias, será considerado oficialmente EXTRAVIADO.",
                            practicalExample: "Mnemônico infalível de prazos do Estatuto PMDF: Ausente = +24 horas; Desaparecido = +8 dias (em serviço/calamidade sem indício de deserção); Desertor = +8 dias (ausência injustificada); Extraviado = +30 dias desaparecido."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Demissão vs. Licenciamento (Arts. 101 e 109): O Cebraspe frequentemente afirma que 'o Soldado foi demitido a pedido'. Errado no Estatuto da PMDF: Demissão é exclusiva de Oficial; Praça sofre Licenciamento ou Exclusão a bem da disciplina!",
                        "Prazo de Estabilidade da Praça (Art. 50, IV, 'a'): Dizer que a Praça da PMDF adquire estabilidade após 3 anos de estágio probatório (como no servidor civil da Lei 8.112). Errado: no Estatuto da PMDF (Lei 7.289/84), a estabilidade da Praça exige 10 (dez) ou mais anos de efetivo serviço!",
                        "Prazos de Ausente, Desaparecido e Extraviado (Arts. 84, 86 e 87): Trocar os prazos de Desaparecido (+8 dias) e Extraviado (+30 dias).",
                        "Conselho de Justificação vs. Conselho de Disciplina (Arts. 48 e 49): Afirmar que o Aspirante-a-Oficial responde a Conselho de Justificação. Errado: o Aspirante-a-Oficial é Praça Especial, portanto responde a Conselho de Disciplina (junto com as Praças estáveis). Conselho de Justificação é exclusivo de Oficiais.",
                        "Conferência de Posto vs. Graduação (Art. 15): Afirmar que o Comandante-Geral confere o posto aos Oficiais subalternos. Errado: todo Posto de Oficial é conferido pelo Governador do DF; o Comandante-Geral confere as Graduações das Praças."
                    ],
                    jurisprudence: [
                        "STF (Súmula Vinculante 39 e RE): Somente lei federal pode alterar o Estatuto dos Policiais Militares do Distrito Federal (Lei nº 7.289/1984), sendo inconstitucional lei distrital que disponha sobre direitos, deveres, ingresso ou remuneração da PMDF.",
                        "STJ (Súmula 673): O art. 125, § 4º, da CF/88 não impede a perda da graduação de militar mediante procedimento administrativo disciplinar (Conselho de Disciplina / Processo Administrativo), assegurados o contraditório e a ampla defesa.",
                        "STF/STJ — Limite de Idade e Exigência de Altura: São legítimos os limites de idade e altura para ingresso na PMDF apenas quando previstos em LEI em sentido formal (como a Lei Federal nº 7.289/1984 alterada pela Lei nº 12.086/2009), não podendo ser criados apenas por edital."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Arts. 27 e 28 da Lei nº 7.289/1984 (Valor e Ética Policial-Militar no Estatuto da PMDF)",
                        themes: "Ética no serviço público, direitos humanos, confiança da população na PMDF e profissionalismo policial.",
                        modelSentence: "Conforme preconizam os artigos 27 e 28 do Estatuto dos Policiais Militares do Distrito Federal (Lei nº 7.289/1984), o sentimento do dever, o pundonor policial-militar e o decoro da classe impõem a cada integrante da corporação uma conduta moral e profissional irrepreensíveis, tendo como preceito ético fundamental o respeito à dignidade da pessoa humana e o zelo incondicional pela integridade física e moral das pessoas submetidas à custódia estatal."
                    },
                    {
                        legalDevice: "Art. 13 da Lei nº 7.289/1984 (A Hierarquia e a Disciplina como Base Institucional da PMDF)",
                        themes: "Organização das forças de segurança, comando e controle operacional, legalidade e eficiência administrativa.",
                        modelSentence: "Nos termos do artigo 13 da Lei Federal nº 7.289/1984, a hierarquia e a disciplina constituem a base institucional da Polícia Militar do Distrito Federal. Longe de representarem um fim em si mesmas, essas diretrizes organizacionais garantem a unidade de comando, a pronta resposta operacional e a estrita observância da legalidade no cumprimento da missão constitucional de preservar a ordem pública."
                    }
                ]
            },

            l12086: {
                lawName: "Lei Federal nº 12.086/2009 (Critérios e Condições de Promoções e Efetivo da PMDF e CBMDF)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "A Lei Federal nº 12.086/2009 é um dos diplomas legais mais cobrados nos concursos da Polícia Militar do Distrito Federal (PMDF), pois regulamenta integralmente os critérios, os interstícios, os requisitos e as modalidades de promoção na carreira de Oficiais e de Praças da PMDF (Arts. 1º a 63), além de ter promovido profundas atualizações no Estatuto (Lei nº 7.289/1984) e na Lei de Organização Básica (Lei nº 6.450/1977).\n\nPara o candidato ao CFP (Soldado) e ao CFO (Oficial), a Lei nº 12.086/2009 traça toda a trajetória de ascensão funcional dentro da corporação: o acesso gradual, sucessivo, regular e equilibrado aos postos e graduações superiores. Ela define as 6 modalidades de promoção existentes na PMDF — Antiguidade, Merecimento, Bravura, Post Mortem, Ressarcimento de Preterição e Ato de Excepcional Relevância (ou Requerimento/Conclusão de Curso conforme o caso) — e estabelece as datas fixas anuais em que ocorrem as promoções na PMDF: 22 de abril, 21 de agosto e 26 de dezembro.\n\nO Cebraspe explora intensamente as regras de ingresso no Quadro de Acesso por Antiguidade (QAA) e no Quadro de Acesso por Merecimento (QAM), as causas que impedem a inclusão ou geram exclusão dos Quadros de Acesso (como estar sub judice, preso preventivamente, desertor ou em licença para tratar de interesse particular), as peculiaridades da Promoção por Ato de Bravura e Post Mortem, e os prazos mínimos de interstício e de serviço arregimentado para cada posto e graduação.",
                    keyConcepts: [
                        "Princípios e Finalidade das Promoções na PMDF (Arts. 2º a 5º): A promoção é um ato administrativo que tem como finalidade básica o preenchimento seletivo das vagas pertinentes ao grau hierárquico superior, com base nos efetivos fixados em lei para os diferentes Quadros, mediante um fluxo de carreira regular e equilibrado.",
                        "Modalidades de Promoção na PMDF (Art. 6º): As promoções na PMDF são efetuadas pelos critérios de: (I) Antiguidade (baseada na precedência hierárquica de um policial sobre os demais de igual posto ou graduação dentro do mesmo Quadro); (II) Merecimento (baseada no conjunto de qualidades e atributos que distinguem e realçam o valor do policial entre seus pares); (III) Ato de Bravura (resultante de ato ou atos não comuns de coragem e audácia que, ultrapassando os limites normais do cumprimento do dever, representem feitos indispensáveis ou úteis às operações policiais); (IV) Post Mortem (quando o militar falecer em ação, em consequência de ferimento ou acidente em serviço); e (V) em Ressarcimento de Preterição (quando reconhecido o direito à promoção que cabia anteriormente).",
                        "Datas Anuais de Promoção na PMDF (Art. 37): As promoções por antiguidade e por merecimento na PMDF são efetuadas anualmente em três datas históricas fixas: nos dias 22 de abril, 21 de agosto e 26 de dezembro, para as vagas abertas e publicadas oficialmente até os dias 1º de abril, 1º de agosto e 5 de dezembro, respectivamente.",
                        "Promoção por Ato de Bravura e Promoção Post Mortem (Arts. 23, 24 e 57): A promoção por Ato de Bravura é decretada pelo Governador do DF (para Oficiais) ou pelo Comandante-Geral (para Praças) após apuração em sindicância especial, INDEPENDENDO da existência de vaga, de interstício ou de curso de habilitação! Entretanto, o promovido por bravura sem o curso exigido deverá realizá-lo posteriormente. A promoção Post Mortem também independe de vaga ou interstício quando o falecimento decorrer de ação no cumprimento do dever.",
                        "Condições Básicas para Ingresso em Quadro de Acesso - QAA e QAM (Arts. 11 a 17): Para ingressar nos Quadros de Acesso (Antiguidade ou Merecimento), o policial militar precisa satisfazer requisitos essenciais até a data de encerramento das alterações: interstício mínimo no posto ou graduação, aptidão física (TAF), inspeção de saúde, curso de formação/aperfeiçoamento/altos estudos exigido, serviço arregimentado mínimo e conceito moral e profissional."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Capítulo I - DaPolícia Militar do Distrito Federal: Seções I a IV (Dos Critérios, Condições Básicas, Processamento e Datas das Promoções - Arts. 1º ao 38)",
                            reason: "Mais de 70% das questões sobre a Lei 12.086/2009 cobram os critérios de promoção (Art. 6º), as condições de ingresso e impedimento no QAA e QAM (Arts. 11 a 34), a Bravura e Post Mortem (Arts. 23 e 24) e as datas de promoção (Art. 37)."
                        },
                        {
                            title: "Seções V e VI (Dos Recursos, do Ressarcimento de Preterição e das Comissões de Promoções - Arts. 39 ao 63)",
                            reason: "Prazos de recurso contra preterição ou composição de Quadro de Acesso (15 dias), hipóteses de Ressarcimento de Preterição (absolvição, impronúncia, prescrição ou cumprimento de requisitos) e composição da CPO e CPP."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Dispositivos que alteram a Lei nº 7.289/1984 e a Lei nº 6.450/1977 (Arts. 64 a 70) e Anexos I, II e III",
                            reason: "Tabelas de interstícios, proporções de promoção por antiguidade vs. merecimento e efetivo fixado da PMDF."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Capítulo II - Do Corpo de Bombeiros Militar do Distrito Federal (Arts. 71 ao 119)",
                            reason: "Aplica-se exclusivamente ao CBMDF; candidatos da PMDF devem estudar apenas o Capítulo I (Arts. 1º ao 70)."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 6º a 10 — Critérios de Promoção (Antiguidade, Merecimento, Bravura, Post Mortem e Ressarcimento de Preterição)",
                            plainExplanation: "São 5 critérios gerais de promoção. A promoção por Ressarcimento de Preterição não é um critério autônomo de avaliação de mérito, mas sim a reparação retroativa de uma promoção por antiguidade ou merecimento a que o militar fazia jus na época, contando-se sua antiguidade desde a data em que deveria ter sido promovido.",
                            practicalExample: "Um Sargento deixou de ser promovido em 21 de agosto porque respondia a processo criminal; um ano depois, ele é absolvido por sentença transitada em julgado. Ele será promovido em Ressarcimento de Preterição, retroagindo sua antiguidade a 21 de agosto do ano anterior."
                        },
                        {
                            article: "Arts. 23 e 24 — Promoção por Ato de Bravura e Promoção Post Mortem",
                            plainExplanation: "Bravura (Art. 23): ato incomum de coragem e audácia além do dever normal, apurado em sindicância específica pelo Conselho Especial. Independe de vaga, interstício ou curso; se não houver vaga, o promovido fica na condição de excedente ou ocupa a primeira vaga que surgir. Post Mortem (Art. 24): ocorre quando o militar falece no cumprimento do dever, em consequência de ferimento/doença contraída em serviço, ou quando falece já tendo direito garantido à promoção que não se efetivou a tempo.",
                            practicalExample: "Um Soldado da PMDF, mesmo ferido gravemente em confronto com assaltantes de banco, consegue salvar a vida de reféns e neutralizar a ameaça. Após sindicância especial, pode ser promovido a Cabo por Ato de Bravura, mesmo que não possua o interstício mínimo nem haja vaga aberta."
                        },
                        {
                            article: "Arts. 31 a 34 — Causas de Impedimento e Exclusão do Quadro de Acesso (QAA e QAM)",
                            plainExplanation: "NÃO será incluído em Quadro de Acesso (ou dele será excluído) o policial militar que: (I) estiver sub judice / denunciado em processo-crime (com denúncia recebida!); (II) estiver submetido a Conselho de Justificação ou Conselho de Disciplina; (III) estiver preso preventivamente ou em flagrante; (IV) estiver cumprindo pena privativa de liberdade (mesmo com sursis!); (V) estiver em LTIP (Licença para Tratar de Interesse Particular); (VI) for considerado desertor, desaparecido ou extraviado.",
                            practicalExample: "Atenção à pegadinha: responder apenas a Inquérito Policial Militar (IPM) ou Sindicância NÃO impede a inclusão em Quadro de Acesso; o impedimento penal exige que a denúncia já tenha sido recebida pelo juiz ou que o militar esteja preso!"
                        },
                        {
                            article: "Art. 37 — Datas Anuais de Promoção na PMDF",
                            plainExplanation: "As promoções na PMDF ocorrem exclusivamente em três datas anuais: 22 de abril, 21 de agosto e 26 de dezembro (salvo as promoções por bravura, post mortem ou em ressarcimento de preterição).",
                            practicalExample: "Memorize as datas de promoção da PMDF: 22/04 (Abril), 21/08 (Agosto) e 26/12 (Dezembro)."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 25 — Promoção em Ressarcimento de Preterição",
                            plainExplanation: "Ocorre quando o militar: (I) obtiver decisão favorável em recurso interposto; (II) cessar sua situação de desaparecido ou extraviado; (III) for absolvido ou impronunciado no processo a que respondia; (IV) for declarada a prescrição da pretensão punitiva; ou (V) tiver sido prejudicado por comprovado erro administrativo.",
                            practicalExample: "Se o processo criminal contra o militar for extinto pela prescrição da pretensão punitiva ou resultar em impronúncia, ele faz jus à promoção em ressarcimento de preterição conforme o Art. 25."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 39 — Prazos para Interposição de Recurso contra Preterição",
                            plainExplanation: "O policial militar que se julgar prejudicado em seu direito à composição de Quadro de Acesso ou em sua promoção poderá interpor recurso no prazo de 15 (quinze) dias corridos, contados da publicação oficial do ato.",
                            practicalExample: "Publicado o Quadro de Acesso no Boletim do Comando-Geral sem o nome do militar, ele tem 15 dias para recorrer administrativamente."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Inquérito Policial vs. Denúncia Recebida no Quadro de Acesso (Art. 31): Afirmar que a mera instauração de IPM contra o policial militar impede sua inclusão no Quadro de Acesso. Errado: exige-se denúncia recebida em processo criminal ou prisão cautelar.",
                        "Exigência de Vaga e Interstício na Bravura (Art. 23): Dizer que a promoção por ato de bravura depende da existência de vaga no grau superior. Errado: a promoção por bravura independe de vaga, interstício ou curso prévio.",
                        "Sursis (Suspensão Condicional da Pena) e Quadro de Acesso (Art. 31): Afirmar que o militar condenado a pena privativa de liberdade beneficiado pelo sursis pode figurar em Quadro de Acesso. Errado: o Art. 31 veda expressamente a inclusão mesmo que haja suspensão condicional da pena.",
                        "Promoção de Oficial vs. Praça (Competência do Ato): O Governador do DF promove os Oficiais; o Comandante-Geral da PMDF promove as Praças."
                    ],
                    jurisprudence: [
                        "STF (Tema 754) e STJ — Exclusão de Quadro de Acesso por Denúncia Recebida vs. Presunção de Inocência: O STF reconheceu que a exclusão temporária de militar denunciado do Quadro de Acesso por Merecimento não viola a presunção de inocência, pois a própria Lei nº 12.086/2009 assegura a promoção retroativa em Ressarcimento de Preterição caso venha a ser absolvido.",
                        "TJDFT / STJ — Promoção Post Mortem: O reconhecimento da promoção post mortem gera reflexos financeiros diretos na pensão militar devida aos dependentes, equivalentes ao posto ou graduação imediatamente superior."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Arts. 2º e 6º da Lei Federal nº 12.086/2009 (Valorização Profissional e Critérios de Ascensão na PMDF)",
                        themes: "Valorização dos profissionais de segurança pública, meritocracia no serviço público e eficiência policial.",
                        modelSentence: "A prestação de um serviço de segurança pública de excelência está diretamente atrelada à valorização institucional de seus operadores. Nesse contexto, a Lei Federal nº 12.086/2009 estruturou o regime de promoções da Polícia Militar do Distrito Federal combinando critérios objetivos de antiguidade, merecimento acadêmico-operacional e bravura, fomentando a capacitação contínua e o comprometimento ético da tropa."
                    }
                ]
            },

            abuso: {
                lawName: "Lei Federal nº 13.869/2019 (Nova Lei de Abuso de Autoridade)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "A Lei Federal nº 13.869/2019 define os crimes de abuso de autoridade cometidos por agente público, servidor ou não, que, no exercício de suas funções ou a pretexto de exercê-las, abuse do poder que lhe tenha sido atribuído. Esta legislação revogou integralmente a antiga Lei nº 4.898/1965 e passou a incidir diretamente sobre a atividade policial ostensiva e investigativa (abordagens, buscas pessoais e domiciliares, uso de algemas, prisões em flagrante, exibição de presos à imprensa, interrogatórios e preservação de local de crime).\n\nPara o Policial Militar da PMDF (Praça ou Oficial), a Lei nº 13.869/2019 possui uma conexão umbilical com o Código Penal Militar: por força da ampliação trazida pela Lei nº 13.491/2017 ao Art. 9º, inciso II, do CPM, quando um policial militar da ativa pratica qualquer crime previsto na Lei de Abuso de Autoridade enquanto está em serviço ou atuando em razão da função policial, tal delito caracteriza CRIME MILITAR (impropriamente militar), sendo processado e julgado perante a Justiça Militar do Distrito Federal!\n\nA arquitetura da lei apoia-se no princípio do elemento subjetivo específico (dolo específico) previsto no Art. 1º, § 1º: todas as condutas descritas na lei somente configuram crime de abuso de autoridade quando praticadas com a finalidade específica de prejudicar outrem ou beneficiar a si mesmo ou a terceiro, ou, ainda, por mero capricho ou satisfação pessoal. Além disso, a lei consagra a vedação expressa ao chamado 'crime de hermenêutica' (Art. 1º, § 2º), protegendo a divergência na interpretação de lei ou na avaliação de fatos e provas.",
                    keyConcepts: [
                        "Dolo Específico Obrigatório e Vedação do Crime de Hermenêutica (Art. 1º, §§ 1º e 2º): Não existe crime de abuso de autoridade na modalidade culposa, nem basta o dolo genérico. O Art. 1º, § 1º exige que a conduta seja praticada com a finalidade específica de: (1) prejudicar outrem, (2) beneficiar a si mesmo ou a terceiro, ou (3) por mero capricho ou satisfação pessoal. E o § 2º garante que a divergência na interpretação de lei ou na avaliação de fatos e provas NÃO configura abuso de autoridade.",
                        "Conceito Amplo de Sujeito Ativo e Crimes Próprios (Art. 2º): É sujeito ativo qualquer agente público, servidor ou não, da administração direta, indireta ou fundacional de qualquer dos Poderes da União, dos Estados, do DF, dos Municípios e de Território, compreendendo militares, servidores públicos e membros de Poder. Reputa-se agente público quem exerce, ainda que transitoriamente ou sem remuneração, por eleição, nomeação, designação, contratação ou qualquer outra forma de investidura ou vínculo, mandato, cargo, emprego ou função. Particular só responde em concurso de pessoas se conhecer a condição de agente público do autor (Art. 30 do CP).",
                        "Ação Penal Pública Incondicionada e Ação Privada Subsidiária (Art. 3º): Todos os crimes da Lei nº 13.869/2019 são de ação penal PÚBLICA INCONDICIONADA. Admitir-se-á ação privada subsidiária da pública se o Ministério Público não oferecer a denúncia, não requerer o arquivamento nem requisitar diligências no prazo legal, tendo o ofendido o prazo decadencial de 6 (seis) meses para exercê-la.",
                        "Efeitos da Condenação e REINCIDÊNCIA Específica na Perda do Cargo (Arts. 4º e 5º): Diferente da Lei de Tortura (onde a perda do cargo é efeito automático da primeira condenação), na Lei de Abuso de Autoridade a perda do cargo, do mandato ou da função pública e a inabilitação para o exercício de outro cargo por 1 a 5 anos: (a) NÃO são efeitos automáticos, devendo ser declarados motivadamente na sentença; e (b) são condicionados à ocorrência de REINCIDÊNCIA em crime de abuso de autoridade (Art. 4º, parágrafo único)!",
                        "Penas Restritivas de Direitos Autônomas (Art. 5º): As penas restritivas de direitos substitutivas das privativas de liberdade previstas na lei são apenas duas: (I) prestação de serviços à comunidade ou a entidades públicas; e (II) suspensão do exercício do cargo, da função ou do mandato, pelo prazo de 1 (um) a 6 (seis) meses, com a perda dos vencimentos e das vantagens."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Capítulos I, II, III e IV (Disposições Gerais, Sujeitos do Crime, Ação Penal e Efeitos da Condenação / Penas - Arts. 1º ao 8º)",
                            reason: "Mais da metade das questões de prova estão nestes 8 artigos iniciais: dolo específico, sujeito ativo, ação penal incondicionada, exigência de reincidência específica para perda do cargo e independência das instâncias."
                        },
                        {
                            title: "Capítulo VI - Dos Crimes e das Penas (Arts. 9º ao 38 — especialmente os tipos policiais: Arts. 12, 13, 15, 16, 18, 21, 22, 23, 24, 25 e 33)",
                            reason: "Tipifica as condutas que ocorrem no policiamento e na delegacia: constrangimento a preso, exposição do corpo à imprensa, deixar de se identificar na prisão, interrogatório noturno, invasão de domicílio e fraude processual."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Capítulo V - Das Sanções de Natureza Civil e Administrativa (Arts. 6º ao 8º)",
                            reason: "Regra da independência das instâncias e as hipóteses em que a sentença penal faz coisa julgada no cível e no administrativo."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Capítulo VII e VIII - Do Procedimento e Disposições Finais (Arts. 39 ao 45 - alterações em outras leis)",
                            reason: "Dispositivos que alteraram leis esparsas já incorporados aos respectivos diplomas."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Art. 1º, §§ 1º e 2º — Elemento Subjetivo Especial (Dolo Específico) e Vedação ao Crime de Hermenêutica",
                            plainExplanation: "As condutas descritas na lei constituem crime de abuso de autoridade APENAS quando praticadas com a finalidade específica de prejudicar outrem ou beneficiar a si mesmo ou a terceiro, ou, ainda, por mero capricho ou satisfação pessoal. A divergência na interpretação de lei ou na avaliação de fatos e provas não configura abuso.",
                            practicalExample: "Um Policial Militar efetua uma prisão em flagrante acreditando de boa-fé estar diante de um crime, mas o juiz posteriormente relaxa a prisão por entender que o fato era atípico. Como não houve finalidade de prejudicar nem capricho pessoal, NÃO há crime de abuso de autoridade."
                        },
                        {
                            article: "Arts. 4º e 5º — Efeitos da Condenação (Exigência de Reincidência Específica) e Penas Restritivas",
                            plainExplanation: "São efeitos da condenação: (I) tornar certa a obrigação de indenizar o dano; (II) a inabilitação para o exercício de cargo/função por 1 a 5 anos; e (III) a perda do cargo, do mandato ou da função pública. ATENÇÃO: Os efeitos II e III (inabilitação e perda do cargo) são condicionados à ocorrência de REINCIDÊNCIA EM CRIME DE ABUSO DE AUTORIDADE e NÃO são automáticos, devendo ser declarados motivadamente na sentença!",
                            practicalExample: "Um Soldado primário (ou mesmo reincidente em crime de furto, mas primário em abuso de autoridade) é condenado por abuso de autoridade. O juiz NÃO pode decretar a perda do seu cargo com base no Art. 4º, III, pois falta a reincidência específica em crime de abuso de autoridade!"
                        },
                        {
                            article: "Art. 13 — Constrangimento Ilegal de Preso e Exposição Curiosa à Imprensa",
                            plainExplanation: "Constranger o preso ou o detento, mediante violência, grave ameaça ou redução de sua capacidade de resistência, a: (I) exibir-se ou ter seu corpo ou parte dele exibido à curiosidade pública; (II) submeter-se a situação vexatória ou a constrangimento não autorizado em lei; ou (III) produzir prova contra si mesmo ou contra terceiro (detenção de 1 a 4 anos).",
                            practicalExample: "Após prender um suspeito, o policial o obriga mediante ameaça a posar sem camisa segurando drogas para que jornalistas ou páginas de redes sociais filmem o rosto dele. Configura o crime do Art. 13, I."
                        },
                        {
                            article: "Art. 16 — Deixar de Identificar-se ou Identificar-se Falsamente ao Preso",
                            plainExplanation: "Deixar de identificar-se ou identificar-se falsamente ao preso por ocasião de sua captura ou quando deva fazê-lo durante sua detenção ou prisão (detenção de 6 meses a 2 anos). Incorre na mesma pena quem, como responsável por interrogatório em sede de procedimento investigatório, deixa de identificar-se ao preso ou atribui a si mesmo falsa identidade, cargo ou função.",
                            practicalExample: "Durante a captura em flagrante, o policial retira sua tarjeta de identificação da farda e recusa-se acintosamente a informar seu nome e posto/graduação ao preso para impedi-lo de saber quem o prendeu."
                        },
                        {
                            article: "Art. 18 — Submeter o Preso a Interrogatório Policial durante o Período de Repouso Noturno",
                            plainExplanation: "Submeter o preso a interrogatório policial durante o período de repouso noturno, SALVO se capturado em flagrante delito ou se ele, devidamente assistido, consentir em prestar declarações (detenção de 6 meses a 2 anos).",
                            practicalExample: "Cuidado com as duas exceções! Se o indivíduo acabou de ser preso em flagrante delito às 02h da madrugada, ele PODE ser interrogado na lavratura do Auto de Prisão em Flagrante sem que isso configure abuso de autoridade!"
                        },
                        {
                            article: "Art. 22 — Invasão de Domicílio sem Mandado ou Fora das Hipóteses Legais",
                            plainExplanation: "Invadir ou adentrar, clandestina ou astuciosamente, ou contra a vontade expressa ou tácita de quem de direito, imóvel alheio ou suas dependências, ou nele permanecer nas mesmas condições, sem determinação judicial ou fora das condições estabelecidas em lei (1 a 4 anos). Na mesma pena incorre quem cumpre mandado de busca e apreensão domiciliar APÓS AS 21H (vinte e uma horas) OU ANTES DAS 5H (cinco horas)! Não há crime se o ingresso for para prestar socorro ou quando houver fundados indícios de flagrante delito ou desastre.",
                            practicalExample: "Para fins do crime de abuso de autoridade no cumprimento de mandado judicial de busca domiciliar (Art. 22, § 1º, III), a lei fixou critério cronológico objetivo: é crime cumprir o mandado entre 21h01 e 04h59!"
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 21 — Manter Presos de Ambos os Sexos ou Criança/Adolescente na Mesma Cela",
                            plainExplanation: "Manter presos de ambos os sexos na mesma cela ou espaço de confinamento. Incorre na mesma pena quem mantém, na mesma cela, criança ou adolescente na companhia de maior de idade ou em ambiente inadequado, observado o Estatuto da Criança e do Adolescente.",
                            practicalExample: "Em uma operação policial, a equipe tranca no mesmo compartimento de confinamento (xadrez/cela) um homem maior de idade e um adolescente apreendido, ou um homem e uma mulher."
                        },
                        {
                            article: "Art. 23 — Fraude Processual / Inovação Artificiosa de Local de Crime",
                            plainExplanation: "Inovar artificiosamente, no curso de diligência, de investigação ou de processo, o estado de lugar, de coisa ou de pessoa, com o fim de eximir-se de responsabilidade ou de responsabilizar criminalmente alguém ou agravar-lhe a responsabilidade.",
                            practicalExample: "Desfazer a cena de uma ocorrência policial ou 'plantar' um objeto ilícito na mochila de um abordado para forjar um flagrante configura o crime do Art. 23."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Arts. 6º, 7º e 8º — Comunicabilidade entre as Instâncias Penal, Civil e Administrativa",
                            plainExplanation: "As responsabilidades civil e administrativa são independentes da criminal, não se podendo mais questionar sobre a existência ou a autoria do fato quando essas questões tenham sido decididas no juízo criminal (Art. 7º). Faz coisa julgada em âmbito cível e administrativo-disciplinar a sentença penal que reconhecer ter sido o ato praticado em estado de necessidade, em legítima defesa, em estrito cumprimento de dever legal ou no exercício regular de direito (Art. 8º).",
                            practicalExample: "Se o Policial Militar é absolvido na Justiça Militar pelo reconhecimento de que agiu em legítima defesa ou estrito cumprimento do dever legal, essa decisão vincula a esfera administrativa disciplinar e cível."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Perda do Cargo na Primeira Condenação (Art. 4º, parágrafo único): O Cebraspe adora afirmar que a condenação por abuso de autoridade acarreta automaticamente a perda do cargo público. Duplamente errado: (1) NÃO é efeito automático (exige motivação na sentença) e (2) exige REINCIDÊNCIA específica em crime de abuso de autoridade!",
                        "Horário de Cumprimento do Mandado de Busca Domiciliar (Art. 22, § 1º, III): Trocar o horário da Lei de Abuso de Autoridade (crime cumprir após as 21h ou antes das 5h) pelo horário do CPC (6h às 20h).",
                        "Interrogatório Noturno em Flagrante Delito (Art. 18): Dizer que é proibido em qualquer hipótese interrogar o preso durante a madrugada. Errado: é permitido se ele foi capturado em flagrante delito ou se, devidamente assistido, consentir em prestar declarações.",
                        "Natureza da Ação Penal (Art. 3º): Afirmar que os crimes de abuso de autoridade dependem de representação da vítima. Errado: são todos de ação penal pública incondicionada.",
                        "Prazo de Suspensão do Exercício do Cargo como Pena Restritiva (Art. 5º, II): Trocar o prazo da pena restritiva de suspensão do cargo (1 a 6 meses, com perda dos vencimentos) pelo prazo do efeito da condenação de inabilitação (1 a 5 anos)."
                    ],
                    jurisprudence: [
                        "STF/STJ — Competência da Justiça Militar nos Crimes da Lei nº 13.869/2019: Quando o crime de abuso de autoridade é praticado por Policial Militar em serviço ou atuando em razão da função (mesmo contra vítima civil), configura crime militar (Art. 9º, II, 'c' do CPM, com redação da Lei nº 13.491/2017), sendo julgado na Justiça Militar do Estado/DF pelo Juiz de Direito singularmente (Art. 125, § 5º da CF/88).",
                        "STF — Constitucionalidade do Art. 1º, §§ 1º e 2º: A exigência de finalidade específica (dolo específico) e a vedação ao crime de hermenêutica são garantias de independência funcional dos agentes públicos no exercício regular de suas atribuições."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Art. 1º, §§ 1º e 2º, da Lei Federal nº 13.869/2019 (Nova Lei de Abuso de Autoridade)",
                        themes: "Limites do poder de polícia, segurança jurídica na atividade policial, combate a excessos e proteção da dignidade humana.",
                        modelSentence: "A Lei Federal nº 13.869/2019 (Nova Lei de Abuso de Autoridade) estabelece uma baliza fundamental para a atuação dos agentes da segurança pública: ao mesmo tempo em que reprime com rigor desvios praticados com finalidade de prejudicar outrem ou por mero capricho pessoal, resguarda a atuação técnica de boa-fé do policial ao vedar a criminalização da hermenêutica e da avaliação regular de fatos em ocorrências operacionais."
                    },
                    {
                        legalDevice: "Arts. 13 e 22 da Lei Federal nº 13.869/2019 (Tutela da Integridade do Custodiado e da Inviolabilidade Domiciliar)",
                        themes: "Direitos humanos na abordagem policial, profissionalismo no policiamento ostensivo e legalidade constitucional.",
                        modelSentence: "O profissionalismo policial no Estado Democrático de Direito manifesta-se na estrita observância dos protocolos legais de abordagem e custódia. Ao tipificar a exposição vexatória de detentos e o ingresso domiciliar fora das hipóteses constitucionais (artigos 13 e 22 da Lei nº 13.869/2019), o legislador reforça que a eficácia da persecução penal é plenamente compatível com a preservação das garantias individuais."
                    }
                ]
            },

            cp: {
                lawName: "Decreto-Lei nº 2.848/1940 (Código Penal Brasileiro - CP Comum)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "O Código Penal Brasileiro (Decreto-Lei nº 2.848/1940) é a matriz dogmática do Direito Penal no Brasil, estruturado em Parte Geral (Arts. 1º a 120) e Parte Especial (Arts. 121 a 359-U). Nos concursos da Polícia Militar do Distrito Federal (CFP e CFO) e das demais carreiras policiais, o Código Penal Comum possui dupla importância estratégica: primeiro, porque é cobrado autonomamente na disciplina de Direito Penal; segundo, porque, desde o advento da Lei nº 13.491/2017, todos os tipos penais previstos no Código Penal Comum podem configurar crimes militares por extensão (Art. 9º, II do CPM) quando praticados por militar em serviço ou em razão da função.\n\nNa Parte Geral, o Cebraspe concentra suas questões nos princípios da legalidade e anterioridade (Art. 1º), aplicação da lei penal no tempo e no espaço — Teoria da Atividade para o tempo do crime (Art. 4º) e Teoria da Ubiquidade para o lugar do crime (Art. 6º) —, teoria tripartida do crime (fato típico, ilícito e culpável), erro de tipo e erro de proibição (Arts. 20 e 21), tentativa, desistência voluntária, arrependimento eficaz, arrependimento posterior e crime impossível (Arts. 14 a 17), além das causas excludentes de ilicitude (Art. 23: estado de necessidade, legítima defesa — inclusive a legítima defesa do agente de segurança pública introduzida pelo Pacote Anticrime no Art. 25, parágrafo único —, estrito cumprimento de dever legal e exercício regular de direito).\n\nNa Parte Especial, a incidência nas provas policiais recai massivamente sobre o Título I (Crimes contra a Pessoa: Homicídio simples, privilegiado, qualificado e feminicídio/Lei 14.994/2024, Lesão Corporal, incluída a majorante contra agentes de segurança pública do Art. 121, § 2º, VII e Art. 129, § 12), Título II (Crimes contra o Patrimônio: Furto, Roubo, Extorsão e Receptação), Título X (Crimes contra a Fé Pública) e Título XI (Crimes contra a Administração Pública: Peculato, Concussão, Corrupção Passiva e Ativa, Prevaricação, Resistência, Desobediência e Desacato).",
                    keyConcepts: [
                        "Tempo e Lugar do Crime no CP Comum (Arts. 4º e 6º - MNEMÔNICO LUTA): Diferentemente do CPM (que diferencia crimes omissivos no lugar do crime), o Código Penal Comum adota a regra absoluta do mnemônico LUTA: Lugar do crime = Ubiquidade (Art. 6º: lugar da ação/omissão, no todo ou em parte, bem como onde se produziu ou deveria produzir-se o resultado); Tempo do crime = Atividade (Art. 4º: momento da ação ou omissão, ainda que outro seja o momento do resultado).",
                        "Iter Criminis e os Institutos dos Arts. 14 a 17 (Tentativa, Desistência Voluntária, Arrependimento Eficaz, Arrependimento Posterior e Crime Impossível): Na Tentativa (Art. 14, II), o crime não se consuma por circunstâncias alheias à vontade do agente (reduz a pena de 1/3 a 2/3). Na Desistência Voluntária e no Arrependimento Eficaz (Art. 15 - 'ponte de ouro'), o agente interrompe voluntariamente a execução ou impede a produção do resultado, respondendo APENAS pelos atos já praticados. No Arrependimento Posterior (Art. 16), nos crimes cometidos sem violência ou grave ameaça à pessoa, reparado o dano ou restituída a coisa até o recebimento da denúncia ou queixa, a pena é reduzida de 1/3 a 2/3. No Crime Impossível (Art. 17), não se pune a tentativa por ineficácia absoluta do meio ou impropriedade absoluta do objeto.",
                        "Excludentes de Ilicitude e Legítima Defesa Policial (Arts. 23 a 25 do CP): Não há crime quando o agente pratica o fato em Estado de Necessidade, Legítima Defesa, Estrito Cumprimento de Dever Legal ou Exercício Regular de Direito (Art. 23), respondendo pelo excesso doloso ou culposo. O Art. 25, parágrafo único (incluído pela Lei nº 13.964/2019 - Pacote Anticrime), explicita que também se considera em legítima defesa o agente de segurança pública que repele agressão ou risco de agressão a vítima mantida refém durante a prática de crimes.",
                        "Homicídio Funcional e Lesão Funcional contra Policiais (Art. 121, § 2º, VII e Art. 129, § 12 do CP): O homicídio e a lesão corporal praticados contra autoridade ou agente descrito nos arts. 142 e 144 da CF/88 (incluindo Policiais Militares!), no exercício da função ou em decorrência dela, ou contra seu cônjuge, companheiro ou parente consanguíneo até o 3º grau, em razão dessa condição, constituem homicídio qualificado (crime hediondo!) e lesão corporal majorada de 1/3 a 2/3.",
                        "Crimes contra a Administração Pública na Abordagem Policial (Arts. 312 a 333): Essencial distinguir: Peculato (Art. 312 - apropriar-se ou desviar bem público ou particular de que tem a posse em razão do cargo), Concussão (Art. 316 - EXIGIR vantagem indevida, crime formal), Corrupção Passiva (Art. 317 - SOLICITAR, RECEBER ou ACEITAR promessa de vantagem indevida), Resistência (Art. 329 - opor-se à execução de ato legal mediante violência ou ameaça), Desobediência (Art. 330 - desobedecer a ordem legal de funcionário público) e Desacato (Art. 331 - desacatar funcionário público no exercício da função ou em razão dela)."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Parte Geral - Títulos I, II e III (Da Aplicação da Lei Penal, Do Crime e Da Imputabilidade Penal - Arts. 1º ao 31)",
                            reason: "Leitura obrigatória: lei penal no tempo e no espaço, tentativa, desistência voluntária, arrependimento eficaz/posterior, erro de tipo/proibição, excludentes de ilicitude e concurso de pessoas."
                        },
                        {
                            title: "Parte Especial - Título I (Dos Crimes contra a Pessoa - Arts. 121 ao 154-B) e Título II (Dos Crimes contra o Patrimônio - Arts. 155 ao 183)",
                            reason: "Homicídio funcional (contra policiais), feminicídio, lesão corporal, furto qualificado, roubo circunstanciado e extorsão."
                        },
                        {
                            title: "Parte Especial - Título XI (Dos Crimes contra a Administração Pública - Arts. 312 ao 359-H)",
                            reason: "Despenca em todas as provas policiais: peculato, concussão, corrupção passiva e ativa, prevaricação, resistência, desobediência e desacato."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Parte Geral - Títulos V e VIII (Das Penas, do Concurso de Crimes e da Extinção da Punibilidade - Arts. 32 ao 120)",
                            reason: "Concurso material, formal e crime continuado (Arts. 69 a 71) e causas de extinção da punibilidade (Art. 107)."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Parte Especial - Títulos IV, V e VII (Crimes contra a Organização do Trabalho, Sentimento Religioso e Família - Arts. 197 ao 249)",
                            reason: "Incidência muito baixa nos editais de carreiras policiais."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 14 a 17 — Tentativa, Desistência Voluntária, Arrependimento Eficaz, Arrependimento Posterior e Crime Impossível",
                            plainExplanation: "Na Desistência Voluntária ('posso prosseguir, mas não quero') e no Arrependimento Eficaz ('já esgotei a execução, mas atuo para evitar o resultado'), o agente só responde pelos atos já praticados (afasta a tentativa!). No Arrependimento Posterior (Art. 16), exige-se crime SEM violência ou grave ameaça à pessoa e reparação integral do dano voluntária até o recebimento da denúncia (reduz a pena de 1/3 a 2/3).",
                            practicalExample: "Um indivíduo atira contra um desafeto para matá-lo, mas, vendo a vítima sangrar, arrepende-se imediatamente, coloca-a no carro, leva ao hospital e salva sua vida (Arrependimento Eficaz - Art. 15). Ele NÃO responderá por tentativa de homicídio, mas apenas pelas lesões corporais causadas!"
                        },
                        {
                            article: "Arts. 23 e 25 — Excludentes de Ilicitude e Legítima Defesa do Agente de Segurança Pública",
                            plainExplanation: "Entende-se em legítima defesa quem, usando moderadamente dos meios necessários, repele injusta agressão, atual ou iminente, a direito seu ou de outrem. O Parágrafo Único do Art. 25 considera em legítima defesa o agente de segurança pública que repele agressão ou risco de agressão a vítima mantida refém durante a prática de crimes.",
                            practicalExample: "Em uma ocorrência com refém sob a mira de arma de fogo no Plano Piloto, o atirador de precisão do BOPE/PMDF efetua disparo letal para salvar a vida do refém diante do risco de agressão. Atua amparado pelo Art. 25, parágrafo único do CP."
                        },
                        {
                            article: "Art. 121, § 2º, VII e Art. 129, § 12 — Homicídio e Lesão Corporal contra Policiais e Familiares",
                            plainExplanation: "Qualifica o homicídio (12 a 30 anos, hediondo!) e majora a lesão corporal (de 1/3 a 2/3) quando praticados contra integrante dos órgãos dos arts. 142 e 144 da CF/88 (PM, PC, PF, PRF, PP, CBM, Forças Armadas), no exercício da função ou em decorrência dela, ou contra seu cônjuge, companheiro ou parente consanguíneo até TERCEIRO GRAU, em razão dessa condição.",
                            practicalExample: "Cuidado com o grau de parentesco! A proteção abrange parente consanguíneo até o 3º GRAU (pais, filhos, avós, netos, irmãos, tios e sobrinhos). Primos (4º grau) ou parentes por afinidade (cunhado/sogro) não entram nessa qualificadora por vedação de analogia in malam partem!"
                        },
                        {
                            article: "Arts. 312, 316, 317 e 319 — Peculato, Concussão, Corrupção Passiva e Prevaricação",
                            plainExplanation: "Peculato (Art. 312): apropriar-se, desviar ou subtrair bem valendo-se da facilidade do cargo (admite a modalidade culposa no § 2º; se no peculato culposo o agente repara o dano antes da sentença irrecorrível, extingue a punibilidade!). Concussão (Art. 316): EXIGIR vantagem indevida. Corrupção Passiva (Art. 317): SOLICITAR ou RECEBER vantagem indevida. Prevaricação (Art. 319): retardar ou deixar de praticar ato de ofício para satisfazer interesse ou sentimento pessoal.",
                            practicalExample: "Se um agente público deixa de multar um veículo irregular porque o motorista é seu melhor amigo, não recebeu dinheiro, mas agiu por sentimento pessoal (amizade): cometeu Prevaricação (Art. 319)."
                        },
                        {
                            article: "Arts. 329, 330 e 331 — Resistência, Desobediência e Desacato",
                            plainExplanation: "Resistência (Art. 329): opor-se à execução de ato legal, mediante violência ou ameaça a funcionário competente para executá-lo ou a quem lhe esteja prestando auxílio (resistência passiva, como jogar-se no chão sem violência ou ameaça, NÃO configura o crime do Art. 329). Desobediência (Art. 330): desobedecer a ordem legal de funcionário público. Desacato (Art. 331): desacatar funcionário público no exercício da função ou em razão dela.",
                            practicalExample: "Durante abordagem de trânsito da PMDF, o condutor recusa-se a parar na blitz e empreende fuga em alta velocidade: comete crime de Desobediência (Art. 330), conforme jurisprudência do STJ."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Arts. 155 e 157 — Furto e Roubo (Majorantes de Arma Branca e Arma de Fogo)",
                            plainExplanation: "No Roubo (Art. 157, § 2º, VII), o emprego de arma branca aumenta a pena de 1/3 até metade; o emprego de arma de fogo comum (Art. 157, § 2º-A, I) aumenta a pena de 2/3; e o emprego de arma de fogo de uso restrito ou proibido (Art. 157, § 2º-B) aplica a pena em DOBRO! O roubo com restrição de liberdade da vítima, com emprego de arma de fogo ou que resulta em lesão grave ou morte (latrocínio) é crime hediondo.",
                            practicalExample: "Assalto praticado com pistola de calibre restrito tem a pena base do roubo aplicada em DOBRO (Art. 157, § 2º-B) e possui natureza hedionda."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 28 — Emoção, Paixão e Embriaguez",
                            plainExplanation: "Não excluem a imputabilidade penal: (I) a emoção ou a paixão; (II) a embriaguez, voluntária ou culposa, pelo álcool ou substância de efeitos análogos (Teoria da Actio Libera in Causa). Só exclui a imputabilidade a embriaguez COMPLETA proveniente de CASO FORTUITO OU FORÇA MAIOR (§ 1º).",
                            practicalExample: "Indivíduo bebe voluntariamente em uma festa e agride alguém: responde integralmente pelo crime, pois a embriaguez voluntária ou culposa jamais exclui a imputabilidade."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Reparação do Dano no Peculato Doloso vs. Culposo (Art. 312, § 3º): Afirmar que a reparação do dano antes da sentença irrecorrível extingue a punibilidade em qualquer peculato. Errado: só extingue a punibilidade no peculato CULPOSO! No peculato doloso, funciona apenas como arrependimento posterior ou atenuante.",
                        "Parentesco no Homicídio Funcional (Art. 121, § 2º, VII): Incluir primo (4º grau) ou sogro/cunhado (parentes por afinidade) na qualificadora do homicídio funcional. Errado: a lei restringe a cônjuge, companheiro ou parente CONSANGUÍNEO até o 3º grau.",
                        "Resistência Passiva (Art. 329): Dizer que o abordado que se agarra a um poste para não ser conduzido, sem agredir nem ameaçar os policiais, comete crime de resistência. Errado: o tipo do Art. 329 exige violência contra a pessoa ou ameaça.",
                        "Arrependimento Posterior em Crime com Violência (Art. 16): Aplicar a redução de pena do arrependimento posterior a um roubo em que o agente devolveu o celular antes da denúncia. Errado: o Art. 16 exige crime cometido SEM violência ou grave ameaça à pessoa."
                    ],
                    jurisprudence: [
                        "Súmula 610 do STF (Latrocínio): Há crime de latrocínio, quando o homicídio se consuma, ainda que não realize o agente a subtração de bens da vítima.",
                        "Súmula 582 do STJ (Consumação do Roubo e do Furto - Teoria da Amotio): Consuma-se o crime de roubo com a inversão da posse do bem mediante emprego de violência ou grave ameaça, ainda que por breve tempo e em seguida à perseguição imediata ao agente e recuperação da coisa roubada, sendo prescindível a posse mansa e pacífica ou desvigiada.",
                        "STJ (Tema 934) — Constitucionalidade do Crime de Desacato (Art. 331 do CP): A tipificação penal do crime de desacato é plenamente compatível com a Constituição Federal e com a Convenção Americana de Direitos Humanos (Pacto de São José da Costa Rica)."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Art. 121, § 2º, inciso VII, do Código Penal (Homicídio Funcional - Lei nº 13.142/2015)",
                        themes: "Proteção jurídica e valorização dos agentes de segurança pública, enfrentamento ao crime organizado e tutela da autoridade estatal.",
                        modelSentence: "Ao qualificar como hediondo o homicídio praticado contra integrantes das forças de segurança pública no exercício da função ou em razão dela (Art. 121, § 2º, VII, do Código Penal), o ordenamento jurídico brasileiro reconhece que atentar contra a vida de um policial significa atingir o próprio Estado Democrático de Direito e a garantia de proteção de toda a coletividade."
                    }
                ]
            },

            cpp: {
                lawName: "Decreto-Lei nº 3.689/1941 (Código de Processo Penal Comum - CPP)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "O Código de Processo Penal (Decreto-Lei nº 3.689/1941) disciplina a persecução penal comum no Brasil, abrangendo a fase pré-processual de investigação (Inquérito Policial) e a fase processual em contraditório. Para os concursos da Polícia Militar do Distrito Federal (CFP e CFO) e das demais carreiras policiais, o CPP é cobrado com altíssima intensidade nos institutos que se conectam diretamente com a atuação ostensiva nas ruas: Inquérito Policial (Arts. 4º a 23), Ação Penal (Arts. 24 a 62), Cadeia de Custódia da Prova (Arts. 158-A a 158-F, incluídos pelo Pacote Anticrime), Busca Domiciliar e Pessoal (Arts. 240 a 250) e Prisões Cautelares — especialmente a Prisão em Flagrante (Arts. 301 a 310) e a Prisão Preventiva (Arts. 311 a 316).\n\nNo cotidiano operacional da PMDF, é o Policial Militar quem chega primeiro ao local do crime (first responder), sendo legalmente responsável pelo isolamento e preservação dos vestígios (início da Cadeia de Custódia - Art. 158-A, § 1º), pela realização da busca pessoal fundada em suspeita (Art. 244), pela captura em flagrante delito (Art. 301 e 302) e pela apresentação do conduzido para a audiência de custódia.\n\nPor essa razão, o Cebraspe concentra suas questões de CPP justamente nas regras de busca pessoal sem mandado (e a exigência de fundadas razões segundo o STF/STJ), nas modalidades de flagrante (próprio, impróprio/quase-flagrante, presumido/ficto, esperado vs. preparado/provocado), na vedação de prisão preventiva decretada de ofício pelo juiz (Art. 311) e nas etapas da Cadeia de Custódia.",
                    keyConcepts: [
                        "Características e Prazos do Inquérito Policial Comum (Arts. 4º a 23): O IP é procedimento administrativo, escrito (Art. 9º), sigiloso (Art. 20, ressalvada a Súmula Vinculante 14 do STF), inquisitivo e dispensável (Art. 12). No CPP comum, o prazo geral de conclusão do IP é de 10 dias se o indiciado estiver preso (admitindo prorrogação de mais 15 dias pelo juiz das garantias no Art. 3º-B, § 2º) e 30 dias se estiver solto (prorrogáveis pelo juiz). A autoridade policial nunca pode mandar arquivar autos de inquérito (Art. 17).",
                        "Cadeia de Custódia da Prova e Preservação do Local de Crime (Arts. 158-A a 158-F - Lei nº 13.964/2019): Considera-se cadeia de custódia o conjunto de todos os procedimentos utilizados para manter e documentar a história cronológica do vestígio coletado em locais ou em vítimas de crimes, para rastrear sua posse e manuseio. Tem início com a preservação do local de crime ou com procedimentos policiais ou periciais nos quais seja detectada a existência de vestígio! É PROIBIDA a entrada em locais isolados bem como a remoção de quaisquer vestígios de locais de crime antes da liberação por parte do perito responsável, sendo tipificada como fraude processual a sua realização (Art. 158-C, § 2º).",
                        "Busca Domiciliar vs. Busca Pessoal Independente de Mandado (Arts. 240 a 249): A busca domiciliar exige mandado judicial cumprido durante o dia, salvo consentimento do morador, flagrante delito, desastre ou socorro (Art. 245). Já a BUSCA PESSOAL (Art. 244) independe de mandado no caso de prisão ou quando houver FUNDADA SUSPEITA de que a pessoa esteja na posse de arma proibida ou de objetos ou papéis que constituam corpo de delito. A busca em mulher será feita por outra mulher, se não importar retardamento ou prejuízo da diligência (Art. 249).",
                        "Modalidades de Flagrante Delito (Arts. 301 e 302 do CPP): Qualquer do povo pode e as autoridades policiais e seus agentes DEVEM prender quem quer que seja encontrado em flagrante delito (Art. 301). O Art. 302 divide o flagrante em: (a) Próprio/Real (incisos I e II: está cometendo ou acaba de cometer a infração); (b) Impróprio/Irreal/Quase-Flagrante (inciso III: é perseguido, logo após, pela autoridade, pelo ofendido ou por qualquer pessoa, em situação que faça presumir ser autor da infração); e (c) Presumido/Ficto/Assimilado (inciso IV: é encontrado, logo depois, com instrumentos, armas, objetos ou papéis que façam presumir ser ele autor da infração).",
                        "Audiência de Custódia em 24 Horas e Vedação de Prisão Preventiva de Ofício (Arts. 310 e 311 do CPP): Após receber o auto de prisão em flagrante, no prazo máximo de até 24 horas após a realização da prisão, o juiz deverá promover audiência de custódia e, fundamentadamente: (I) relaxar a prisão ilegal; (II) converter a prisão em flagrante em preventiva (somente se houver requerimento do MP, do querelante/assistente ou representação da autoridade policial — o juiz NUNCA pode converter de ofício nem decretar prisão preventiva de ofício, nem na investigação nem no processo!); ou (III) conceder liberdade provisória, com ou sem fiança."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Livro I - Título II (Do Inquérito Policial - Arts. 4º ao 23) e Título III (Da Ação Penal - Arts. 24 ao 62)",
                            reason: "Características do IP, arquivamento, acordo de não persecução penal (ANPP - Art. 28-A) e espécies de ação penal."
                        },
                        {
                            title: "Livro I - Título VII (Da Prova: Exame de Corpo de Delito, Cadeia de Custódia e Busca e Apreensão - Arts. 155 ao 250)",
                            reason: "Foco cirúrgico na Cadeia de Custódia (Arts. 158-A a 158-F) e nas regras de Busca Domiciliar e Busca Pessoal (Arts. 240 a 250)."
                        },
                        {
                            title: "Livro I - Título IX (Da Prisão, das Medidas Cautelares e da Liberdade Provisória - Arts. 282 ao 350)",
                            reason: "Regras gerais das prisões (uso de algemas, emprego de força), espécies de flagrante (Art. 302), audiência de custódia (Art. 310) e prisão preventiva (Arts. 311 a 316)."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Livro I - Título IV e VI (Da Competência e das Questões e Processos Incidentes - Arts. 69 ao 91)",
                            reason: "Regras de fixação da competência pelo lugar da infração (teoria do resultado - Art. 70)."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Livro II e III (Dos Processos em Espécie, das Nulidades e dos Recursos em Geral - Arts. 394 ao 667)",
                            reason: "Geralmente cobrados apenas em concursos de Delegado, Juiz ou Promotor."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 158-A a 158-F — Cadeia de Custódia e Etapas do Vestígio",
                            plainExplanation: "A cadeia de custódia inicia-se com a preservação do local de crime ou com procedimentos policiais ou periciais nos quais seja detectada a existência de vestígio. O agente público que reconhecer um elemento como de potencial interesse para a produção da prova pericial fica responsável por sua preservação! As 10 etapas (Art. 158-B) dividem-se em fase externa (Reconhecimento, Isolamento, Fixação, Coleta, Acondicionamento e Transporte) e fase interna (Recebimento, Processamento, Armazenamento e Descarte).",
                            practicalExample: "Quando a guarnição da PMDF chega a um local de homicídio e isola a área com fita zebrada impedindo a entrada de curiosos, já deu início formal à Cadeia de Custódia da prova (etapas de Reconhecimento e Isolamento)."
                        },
                        {
                            article: "Arts. 244 e 249 — Busca Pessoal sem Mandado e Busca em Mulher",
                            plainExplanation: "A busca pessoal independe de mandado no caso de prisão ou quando houver fundada suspeita de que a pessoa esteja na posse de arma proibida ou de objetos ou papéis que constituam corpo de delito (Art. 244). A busca em mulher será feita por outra mulher, SE NÃO IMPORTAR RETARDAMENTO OU PREJUÍZO DA DILIGÊNCIA (Art. 249).",
                            practicalExample: "Em uma abordagem de urgência onde há fundada suspeita de que uma mulher esteja armada prestes a sacar uma arma e não há policial feminina na guarnição nem possibilidade de aguardar apoio sem risco/prejuízo, o Art. 249 autoriza a realização da busca para cessar o perigo."
                        },
                        {
                            article: "Art. 302 — Espécies de Flagrante (Próprio, Impróprio e Presumido)",
                            plainExplanation: "Cuidado com as expressões temporais do Art. 302 que o Cebraspe troca: no inciso III (Flagrante Impróprio / Quase-Flagrante), o agente é perseguido LOGO APÓS o crime; no inciso IV (Flagrante Presumido / Ficto), não exige perseguição ininterrupta, bastando que o agente seja encontrado LOGO DEPOIS com armas, objetos ou papéis do crime!",
                            practicalExample: "Mnemônico infalível para a prova do Cebraspe: Perseguido = LOGO APÓS (4 letras em 'após' = inciso III). Encontrado com objetos = LOGO DEPOIS (6 letras em 'depois' = inciso IV)."
                        },
                        {
                            article: "Arts. 310, 311 e 316 — Audiência de Custódia, Vedação de Preventiva de Ofício e Revisão a cada 90 Dias",
                            plainExplanation: "O juiz NÃO pode decretar prisão preventiva de ofício nem converter o flagrante em preventiva de ofício (exige requerimento do MP/querelante/assistente ou representação da autoridade policial). Além disso, decretada a prisão preventiva, o órgão emissor da decisão deverá revisar a necessidade de sua manutenção a cada 90 (noventa) dias, mediante decisão fundamentada, de ofício, sob pena de tornar a prisão ilegal (Art. 316, parágrafo único).",
                            practicalExample: "Se o Cebraspe afirmar que 'na fase processual o juiz pode decretar a prisão preventiva de ofício', o item está ERRADO após o Pacote Anticrime (Lei 13.964/2019)."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 28-A — Acordo de Não Persecução Penal (ANPP)",
                            plainExplanation: "Não sendo caso de arquivamento e tendo o investigado confessado formal e circunstancialmente a prática de infração penal SEM violência ou grave ameaça e com pena mínima inferior a 4 (quatro) anos, o Ministério Público poderá propor acordo de não persecução penal. Não cabe ANPP nos crimes de âmbito da Lei Maria da Penha ou praticados contra a mulher por razões da condição do sexo feminino.",
                            practicalExample: "Indivíduo primário confessa furto simples (pena mínima de 1 ano, sem violência): preenche os requisitos objetivos para proposta de ANPP pelo Ministério Público."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 284 e Art. 292 — Emprego da Força na Prisão e Auto de Resistência",
                            plainExplanation: "Não será permitido o emprego de força, salvo a indispensável no caso de resistência ou de tentativa de fuga do preso (Art. 284). Se houver resistência à prisão em flagrante ou à determinada por autoridade competente, o executor e as pessoas que o auxiliarem poderão usar dos meios necessários para defender-se ou para vencer a resistência, do que tudo se lavrará auto subscrito também por duas testemunhas (Art. 292).",
                            practicalExample: "O uso progressivo e diferenciado da força pela PMDF na captura tem fundamento expresso nos artigos 284 e 292 do CPP."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Expressões 'Logo Após' vs. 'Logo Depois' no Flagrante (Art. 302, III e IV): Inverter as expressões entre a perseguição (logo após) e o encontro com objetos (logo depois).",
                        "Prisão Preventiva de Ofício pelo Juiz (Arts. 282, § 2º e 311): Afirmar que o juiz pode converter a prisão em flagrante em preventiva de ofício na audiência de custódia. Errado (STF e STJ pacificaram que a conversão de ofício é ilegal).",
                        "Busca em Mulher como Regra Absoluta (Art. 249): Dizer que em nenhuma hipótese um policial masculino pode realizar busca pessoal em mulher. Errado: a regra do Art. 249 comporta exceção expressa ('se não importar retardamento ou prejuízo da diligência').",
                        "Coleta de Vestígios na Cadeia de Custódia (Art. 158-C): Afirmar que qualquer policial que chega ao local deve coletar imediatamente os vestígios. Errado: a coleta dos vestígios deverá ser realizada preferencialmente por perito oficial (Art. 158-C), cabendo à equipe policial o isolamento e a preservação do local."
                    ],
                    jurisprudence: [
                        "Súmula 145 do STF (Flagrante Preparado / Provocado): Não há crime, quando a preparação do flagrante pela polícia torna impossível a sua consumação (configura crime impossível; diferente do flagrante esperado, que é perfeitamente válido!).",
                        "STJ (RHC 158.580) e STF (HC 208.240) — Fundada Suspeita na Busca Pessoal (Art. 244 do CPP): A fundada suspeita que autoriza a busca pessoal sem mandado não pode basear-se apenas em parâmetros puramente subjetivos ('tirocínio policial' ou nervosismo isolado), exigindo elementos concretos e objetivos de que a pessoa esteja na posse de arma ou corpo de delito, embora o STF reconheça que fatores contextuais objetivos de policiamento ostensivo podem legitimar a abordagem."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Arts. 158-A a 158-F do Código de Processo Penal (Cadeia de Custódia da Prova - Lei nº 13.964/2019)",
                        themes: "Polícia científica, preservação do local de crime pelo primeiro interventor (PMDF), combate à impunidade e prova técnica.",
                        modelSentence: "A efetividade da justiça criminal depende diretamente da confiabilidade da prova pericial produzida desde os primeiros instantes após o delito. Nesse sentido, a disciplina da Cadeia de Custódia nos artigos 158-A a 158-F do Código de Processo Penal destaca o papel estratégico da Polícia Militar como primeira interventora no isolamento e na preservação do local de crime, garantindo a integridade cronológica dos vestígios e evitando nulidades processuais."
                    }
                ]
            },

            drogas: {
                lawName: "Lei Federal nº 11.343/2006 (Lei de Drogas - SISNAD)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "A Lei Federal nº 11.343/2006 institui o Sistema Nacional de Políticas Públicas sobre Drogas (SISNAD), prescreve medidas para prevenção do uso indevido, atenção e reinserção social de usuários e dependentes de drogas e estabelece normas para repressão à produção não autorizada e ao tráfico ilícito de drogas. É uma das leis penais extravagantes mais cobradas em concursos policiais, pois a grande maioria das ocorrências de flagrante delito atendidas pelas guarnições da PMDF envolve o Art. 28 (posse para consumo pessoal) ou o Art. 33 (tráfico de drogas).\n\nA Lei de Drogas adota a técnica das normas penais em branco heterogêneas (complementadas pela Portaria SVS/MS nº 344/1998 da ANVISA, que lista as substâncias entorpecentes ou psicotrópicas proscritas no Brasil). Ela estabelece um tratamento jurídico nitidamente dual: para o usuário (Art. 28), veda qualquer pena privativa de liberdade (prevendo apenas advertência, prestação de serviços à comunidade e medida educativa, além de proibir a prisão em flagrante); já para o traficante (Art. 33), impõe rigoroso regime punitivo (reclusão de 5 a 15 anos, equiparado a crime hediondo, salvo na modalidade privilegiada do § 4º).\n\nPara as provas da PMDF, é essencial dominar a distinção entre o Art. 28 da Lei de Drogas e o Art. 290 do Código Penal Militar (em local sujeito à administração militar, aplica-se o CPM!), bem como a tese de Repercussão Geral do STF (Tema 506 - 2024) sobre o porte de cannabis para consumo pessoal (40 gramas ou 6 plantas fêmeas) e as súmulas do STJ sobre tráfico privilegiado e causas de aumento de pena (Art. 40).",
                    keyConcepts: [
                        "Norma Penal em Branco Heterogênea (Art. 1º, parágrafo único e Art. 66): Consideram-se drogas as substâncias ou os produtos capazes de causar dependência, assim especificados em lei ou relacionados em listas atualizadas periodicamente pelo Poder Executivo da União (Portaria nº 344/1998 da ANVISA). Se uma substância não consta na lista da ANVISA, sua posse ou venda não configura crime da Lei nº 11.343/2006.",
                        "Posse para Consumo Pessoal vs. Decisão do STF sobre Cannabis (Art. 28 e Tema 506 do STF): O Art. 28 pune com advertência, prestação de serviços à comunidade ou comparecimento a programa educativo quem adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, drogas sem autorização (prazo prescricional de 2 anos - Art. 30; vedada prisão em flagrante - Art. 48, § 2º). Em 2024 (Tema 506), o STF decidiu que não comete infração penal quem adquirir, guardar ou trouxer consigo, para consumo pessoal, a substância cannabis sativa (presumindo-se usuário até 40 gramas ou 6 plantas fêmeas, salvo se houver elementos concretos de mercancia), mantendo-se a ilicitude extrapenal e a apreensão da droga!",
                        "Tráfico de Drogas (Art. 33, caput), Figuras Equiparadas (§ 1º), Auxílio/Induzimento (§ 2º), Uso Compartilhado (§ 3º) e Tráfico Privilegiado (§ 4º): O Art. 33, caput possui 18 verbos nucleares (tipo misto alternativo) e é equiparado a crime hediondo. Já o Uso Compartilhado (Art. 33, § 3º: oferecer droga eventualmente, sem objetivo de lucro, a pessoa de seu relacionamento, para juntos a consumirem) é infração de menor potencial ofensivo (detenção de 6 meses a 1 ano). E o Tráfico Privilegiado (Art. 33, § 4º: agente primário, de bons antecedentes, que não se dedique às atividades criminosas nem integre organização criminosa) reduz a pena de 1/6 a 2/3 e AFASTA a hediondez!",
                        "Associação para o Tráfico vs. Associação Criminosa do CP (Art. 35): Enquanto a associação criminosa comum do Art. 288 do CP exige 3 ou mais pessoas, a Associação para o Tráfico (Art. 35 da Lei de Drogas) exige apenas 2 (DUAS) ou mais pessoas associadas de forma estável e permanente para o fim de praticar, reiteradamente ou não, qualquer dos crimes dos arts. 33, caput e § 1º, e 34 (e NÃO é crime equiparado a hediondo segundo o STJ!).",
                        "Inaplicabilidade da Lei nº 11.343/2006 na Caserna (Art. 290 do CPM): Quando um Policial Militar porta ou guarda qualquer droga ilícita dentro do quartel, batalhão ou viatura militar, mesmo para consumo próprio e em quantidade inferior a 40g, NÃO se aplica o Art. 28 da Lei de Drogas nem o Tema 506 do STF, respondendo pelo crime militar do Art. 290 do CPM (reclusão de 1 a 5 anos), por tutela da hierarquia, disciplina e segurança das armas!"
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Título III - Capítulo III (Dos Crimes e das Penas - Posse para Consumo Pessoal - Arts. 27 ao 30)",
                            reason: "Sanções do Art. 28, plantio para consumo pessoal (§ 1º), vedação de prisão em flagrante, prescrição em 2 anos (Art. 30) e jurisprudência do STF."
                        },
                        {
                            title: "Título IV - Capítulo II (Dos Crimes de Tráfico, Maquinário, Associação, Financiamento e Causas de Aumento - Arts. 33 ao 47)",
                            reason: "Concentra 70% das questões: Art. 33 (caput e §§ 1º a 4º), Art. 35 (associação de 2 pessoas), Art. 37 (informante colaborador) e Art. 40 (causas de aumento de 1/6 a 2/3)."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Título IV - Capítulo III (Do Procedimento Penal, Investigação, Laudo de Constatação, Infiltração e Ação Controlada - Arts. 50 ao 64)",
                            reason: "Prazo do inquérito policial (30 dias preso / 90 dias solto, duplicáveis pelo juiz!), laudo de constatação provisória, destruição de drogas (15 dias) e perda de bens."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Títulos I, II e V (Disposições Preliminares, Prevenção, Atenção, Reinserção Social e Cooperação Internacional - Arts. 1º ao 26 e 65 ao 75)",
                            reason: "Baixa incidência em provas policiais (exceto o conceito de droga no Art. 1º, parágrafo único)."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Arts. 28 e 30 — Posse de Drogas para Consumo Pessoal e Prescrição em 2 Anos",
                            plainExplanation: "Quem adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, drogas sem autorização fica sujeito a: (I) advertência sobre os efeitos das drogas; (II) prestação de serviços à comunidade; (III) medida educativa de comparecimento a programa ou curso educativo (pelo prazo máximo de 5 meses para primário e 10 meses para reincidente específico). Não cabe pena de prisão nem prisão em flagrante! Prescreve em 2 (dois) anos (Art. 30).",
                            practicalExample: "Cuidado: 'fumar/usar' no passado não é verbo do Art. 28; pune-se quem traz consigo, guarda ou transporta para consumo atual ou futuro. Além disso, o Art. 28, § 1º equipara ao usuário quem semeia, cultiva ou colhe plantas destinadas à preparação de pequena quantidade de substância para consumo pessoal!"
                        },
                        {
                            article: "Art. 33, §§ 2º, 3º e 4º — Induzimento ao Uso, Uso Compartilhado e Tráfico Privilegiado",
                            plainExplanation: "§ 2º: Induzir, instigar ou auxiliar alguém ao uso indevido de droga (detenção de 1 a 3 anos). § 3º (Uso Compartilhado): Oferecer droga, eventualmente e sem objetivo de lucro, a pessoa de seu relacionamento, para juntos a consumirem (detenção de 6 meses a 1 ano — cabe JECrim!). § 4º (Tráfico Privilegiado): Redução de 1/6 a 2/3 se o agente for primário, de bons antecedentes, não se dedicar às atividades criminosas nem integrar organização criminosa (retira o caráter hediondo!).",
                            practicalExample: "Em uma festa, João oferece gratuitamente um cigarro de droga ilícita ao seu amigo Pedro para fumarem juntos naquele momento, sem habitualidade e sem lucro: João responde pelo crime de menor potencial ofensivo do Art. 33, § 3º (e não pelo tráfico do caput!)."
                        },
                        {
                            article: "Art. 40 — Causas de Aumento de Pena (1/6 a 2/3)",
                            plainExplanation: "As penas dos arts. 33 a 37 são aumentadas de 1/6 a 2/3 se: (I) houver transnacionalidade do delito; (II) o agente praticar o crime prevalecendo-se de função pública ou no desempenho de missão de educação, poder familiar, guarda ou vigilância; (III) a infração tiver sido cometida nas dependências ou imediações de estabelecimentos prisionais, de ensino, hospitalares, culturais/esportivos ou unidades militares/policiais; (IV) o crime tiver sido praticado com violência, grave ameaça, emprego de arma de fogo; (V) caracterizado o tráfico entre Estados da Federação ou entre estes e o Distrito Federal (interestadualidade); (VI) sua prática envolver ou visar a atingir criança ou adolescente; (VII) o agente financiar ou custear a prática do crime.",
                            practicalExample: "Indivíduo traz drogas de Luziânia/GO para vender em Santa Maria/DF: incide a causa de aumento do tráfico interestadual (Art. 40, V), sendo que a Súmula 587 do STJ diz que basta a comprovação de que a droga tinha como destino outro Estado/DF, mesmo que o agente seja preso antes de cruzar a divisa!"
                        },
                        {
                            article: "Arts. 50 e 51 — Laudo de Constatação Provisória, Destruição da Droga e Prazos do Inquérito Policial",
                            plainExplanation: "Para a lavratura do auto de prisão em flagrante e estabelecimento da materialidade, é suficiente o laudo de constatação da natureza e quantidade da droga, firmado por perito oficial ou, na falta deste, por pessoa idônea (Art. 50, § 1º). A destruição das drogas apreendidas em flagrante será executada pelo delegado no prazo de 15 dias na presença do MP e da autoridade sanitária, guardando-se amostra para o laudo definitivo. Prazos do IP (Art. 51): 30 dias se o indiciado estiver preso e 90 dias se estiver solto (ambos podem ser DUPLICADOS pelo juiz!).",
                            practicalExample: "Na Lei de Drogas, o prazo do IP pode chegar a 60 dias com indiciado preso (30 + 30) e 180 dias com indiciado solto (90 + 90) mediante duplicação judicial!"
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 35 — Associação para o Tráfico (Mínimo de 2 Pessoas)",
                            plainExplanation: "Associarem-se duas ou mais pessoas para o fim de praticar, reiteradamente ou não, qualquer dos crimes previstos nos arts. 33, caput e § 1º, e 34 desta Lei (reclusão de 3 a 10 anos). Exige estabilidade e permanência do vínculo associativo.",
                            practicalExample: "Se duas pessoas se unem apenas eventualmente para transportar uma encomenda de droga (concurso eventual de agentes), não há o crime do Art. 35; este exige vínculo estável e permanente entre no mínimo 2 agentes."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 33, § 1º, IV — Agente Policial Disfarçado",
                            plainExplanation: "Incorre nas mesmas penas do tráfico (5 a 15 anos) quem vende ou entrega drogas ou matéria-prima a agente policial disfarçado, quando presentes elementos probatórios razoáveis de conduta criminal preexistente.",
                            practicalExample: "Se o traficante já tinha a droga pronta para venda (conduta preexistente) e a oferece ou vende a um policial disfarçado, o crime é válido e não configura flagrante preparado."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Prazos do Inquérito na Lei de Drogas (Art. 51): Trocar os prazos especiais da Lei de Drogas (30 dias preso / 90 dias solto, duplicáveis) pelos do CPP (10 / 30) ou do CPPM (20 / 40+20).",
                        "Plantio de Pequena Quantidade para Consumo Pessoal (Art. 28, § 1º): Afirmar que quem planta 2 pés para consumo próprio responde pelo tráfico do Art. 33, § 1º, II. Errado: o plantio de pequena quantidade para consumo próprio incide no Art. 28, § 1º.",
                        "Hediondez no Tráfico Privilegiado e na Associação para o Tráfico: Dizer que o tráfico privilegiado (Art. 33, § 4º) e a associação para o tráfico (Art. 35) são crimes equiparados a hediondos. Errado: nenhum dos dois possui natureza hedionda (Art. 112, § 5º da LEP e jurisprudência pacífica do STF/STJ)!",
                        "Número Mínimo de Agentes no Art. 35: Dizer que a associação para o tráfico exige no mínimo 3 pessoas. Errado: exige 2 ou mais pessoas."
                    ],
                    jurisprudence: [
                        "Súmula 587 do STJ: Para a incidência da majorante prevista no art. 40, V, da Lei n. 11.343/2006 (tráfico interestadual), é desnecessária a efetiva transposição de fronteiras entre estados da Federação, sendo suficiente a demonstração inequívoca da intenção de realizar o tráfico interestadual.",
                        "Súmula 607 do STJ: A majorante do tráfico transnacional de drogas (art. 40, I, da Lei n. 11.343/2006) configura-se com a prova da destinação internacional das drogas, ainda que não consumada a transposição de fronteiras.",
                        "STF (Tema 506 - RE 635.659): Não comete infração penal quem adquirir, guardar, tiver em depósito, transportar ou trouxer consigo, para consumo pessoal, a substância cannabis sativa (parâmetro objetivo presumido de 40g ou 6 plantas fêmeas, afastável se houver elementos concretos de mercancia), mantendo-se a apreensão da substância e as sanções administrativas/educativas."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Art. 1º e Art. 33 da Lei Federal nº 11.343/2006 (Sistema Nacional de Políticas Públicas sobre Drogas - SISNAD)",
                        themes: "Combate ao narcotráfico, políticas públicas de segurança e saúde, repressão qualificada e prevenção ao uso de drogas.",
                        modelSentence: "Ao instituir o Sistema Nacional de Políticas Públicas sobre Drogas (Lei nº 11.343/2006), o legislador brasileiro adotou uma diretriz bipartida e racional: ao passo que prioriza a prevenção e a atenção multidisciplinar ao usuário, impõe repressão rigorosa e descapitalização patrimonial às organizações dedicadas ao tráfico ilícito de entorpecentes, principal vetor de violência letal nos centros urbanos."
                    }
                ]
            },

            tortura: {
                lawName: "Lei Federal nº 9.455/1997 (Lei dos Crimes de Tortura)",
                targetRole: "CFP / Soldado PMDF (Curso de Formação de Praças)",
                examBoard: "Cebraspe",
                executiveSummary: {
                    centralObjective: "A Lei Federal nº 9.455/1997 define os crimes de tortura e dá outras providências, regulamentando diretamente o mandamento constitucional do Art. 5º, incisos III e XLIII, da Constituição Federal de 1988 ('ninguém será submetido a tortura nem a tratamento desumano ou degradante', sendo a prática da tortura crime inafiançável e insuscetível de graça ou anistia). Por ser uma lei curta (apenas 4 artigos) e de altíssima relevância constitucional e operacional para a atividade policial e prisional, está presente em praticamente todos os editais da PMDF, PCDF, PF, PRF e Polícia Penal.\n\nDiferentemente do que ocorre nos tratados internacionais de Direitos Humanos (nos quais a tortura é crime próprio de agente público ou de quem atua sob seu consentimento), no Brasil o crime de tortura é, como regra geral, um CRIME COMUM (Art. 1º, incisos I, II e § 1º), podendo ser praticado por qualquer pessoa! Apenas a modalidade de Tortura-Omissão (Art. 1º, § 2º: aquele que se omite em face dessas condutas quando tinha o dever de evitá-las ou apurá-las) e a forma de submeter pessoa presa ou sujeita a medida de segurança são crimes próprios.\n\nPara o Policial Militar da PMDF, dois pontos da Lei nº 9.455/1997 exigem atenção redobrada: primeiro, a perda do cargo, função ou emprego público e a interdição para seu exercício pelo dobro do prazo da pena aplicada são EFEITOS AUTOMÁTICOS da condenação (Art. 1º, § 5º), independendo de reincidência e de motivação específica na sentença; segundo, quando praticada por Policial Militar em serviço ou em razão da função, a tortura configura crime militar por extensão (Art. 9º, II do CPM c/c Lei nº 13.491/2017).",
                    keyConcepts: [
                        "Regra de Crime Comum no Brasil vs. Crime Próprio Internacional (Art. 1º da Lei nº 9.455/1997): No direito brasileiro, a tortura NÃO exige que o autor seja agente público (salvo na tortura-omissão do § 2º e na tortura de preso do § 4º, I como causa de aumento). Qualquer particular pode cometer tortura-prova (inciso I, 'a'), tortura-crime (inciso I, 'b'), tortura-discriminatória/racismo (inciso I, 'c') ou tortura-castigo (inciso II, desde que detenha guarda, poder ou autoridade sobre a vítima!).",
                        "Modalidades Típicas do Art. 1º (Reclusão de 2 a 8 anos) vs. Tortura-Omissão (§ 2º - Detenção de 1 a 4 anos): Todas as modalidades comissivas de tortura têm pena de RECLUSÃO de 2 a 8 anos. A única exceção é a Tortura-Omissão ou Imprópria (Art. 1º, § 2º: aquele que se omite em face dessas condutas, quando tinha o dever de evitá-las ou apurá-las), que é punida com DETENÇÃO de 1 a 4 anos e, por isso, segundo o STF/STJ, admite início de cumprimento de pena em regime aberto ou semiaberto!",
                        "Tortura Qualificada pelo Resultado Lesão Grave/Gravíssima ou Morte (Art. 1º, § 3º - Crimes Preterdolosos): Se da tortura resulta lesão corporal de natureza grave ou gravíssima, a pena é de reclusão de 4 a 10 anos; se resulta MORTE, a reclusão é de 8 a 16 anos. Trata-se de figura exclusivamente PRETERDOLOSA (dolo na tortura antecedente e culpa no resultado morte consequente). Se o agente tiver dolo de matar mediante tortura, responde por Homicídio Qualificado pela tortura (Art. 121, § 2º, III do CP, pena de 12 a 30 anos, julgado pelo Tribunal do Júri!).",
                        "Efeito Automático da Condenação: Perda do Cargo e Interdição pelo Dobro do Prazo (Art. 1º, § 5º): A condenação acarretará a perda do cargo, função ou emprego público e a interdição para seu exercício pelo DOBRO do prazo da pena aplicada. Diferente da Lei de Abuso de Autoridade (que exige reincidência específica e motivação), na Lei de Tortura a perda do cargo é AUTOMÁTICA já na primeira condenação!",
                        "Extraterritorialidade Incondicionada (Art. 2º): O disposto na Lei nº 9.455/1997 aplica-se ainda quando o crime não tenha sido cometido em território nacional, sendo a vítima brasileira ou encontrando-se o agente em local sob jurisdição brasileira."
                    ]
                },
                structuralXRay: {
                    highPriority: [
                        {
                            title: "Art. 1º, Incisos I e II e §§ 1º a 4º (Modalidades de Tortura, Tortura-Omissão, Qualificadoras e Causas de Aumento)",
                            reason: "Concentra 85% das questões: distinção entre tortura-prova, tortura-crime, tortura-discriminatória, tortura-castigo, tortura de preso e tortura-omissão."
                        },
                        {
                            title: "Art. 1º, §§ 5º, 6º e 7º e Art. 2º (Perda Automática do Cargo, Inafiançabilidade, Regime Inicial e Extraterritorialidade)",
                            reason: "Cobra os efeitos automáticos da condenação (perda do cargo + interdição pelo dobro da pena), a inconstitucionalidade do regime integralmente fechado e a extraterritorialidade."
                        }
                    ],
                    secondaryPriority: [
                        {
                            title: "Comparativo Constitucional (Art. 5º, III e XLIII da CF/88 vs. Lei nº 9.455/1997)",
                            reason: "Compreender por que a tortura é inafiançável e insuscetível de graça, anistia ou indulto, mas é PRESCRITÍVEL."
                        }
                    ],
                    deadZones: [
                        {
                            title: "Arts. 3º e 4º (Vigência e Revogação do art. 233 do ECA)",
                            reason: "Dispositivos finais meramente formais."
                        }
                    ]
                },
                articlesMapping: {
                    highIncidence: [
                        {
                            article: "Art. 1º, I ('a', 'b', 'c') e II — As 4 Modalidades Básicas de Tortura",
                            plainExplanation: "Constitui crime de tortura constranger alguém com emprego de violência ou grave ameaça, causando-lhe sofrimento físico ou mental: (I-a: Tortura-Prova) com o fim de obter informação, declaração ou confissão da vítima ou de terceira pessoa; (I-b: Tortura-Crime) para provocar ação ou omissão de natureza criminosa; (I-c: Tortura-Discriminatória) em razão de discriminação racial ou religiosa (atenção: a lei fala apenas em racial ou religiosa!); (II: Tortura-Castigo) submeter alguém, sob sua guarda, poder ou autoridade, com emprego de violência ou grave ameaça, a intenso sofrimento físico ou mental, como forma de aplicar castigo pessoal ou medida de caráter preventivo.",
                            practicalExample: "Cuidado com duas diferenças vitais no texto da lei: (1) apenas a Tortura-Castigo (inciso II) exige que o sofrimento físico ou mental seja INTENSO e que a vítima esteja sob guarda, poder ou autoridade do agente; (2) na Tortura-Discriminatória (inciso I, 'c'), a lei menciona apenas discriminação RACIAL ou RELIGIOSA!"
                        },
                        {
                            article: "Art. 1º, §§ 1º e 2º — Tortura de Preso e Tortura por Omissão (Imprópria)",
                            plainExplanation: "§ 1º: Na mesma pena (reclusão de 2 a 8 anos) incorre quem submete pessoa presa ou sujeita a medida de segurança a sofrimento físico ou mental, por intermédio da prática de ato não previsto em lei ou não resultante de medida legal (independe de finalidade específica!). § 2º: Aquele que se omite em face dessas condutas, quando tinha o dever de evitá-las ou apurá-las, incorre na pena de DETENÇÃO de 1 (um) a 4 (quatro) anos.",
                            practicalExample: "Um Oficial ou Sargento toma conhecimento de que policiais sob seu comando estão torturando um detento e nada faz para impedir ou apurar o fato: responde pela Tortura-Omissão do § 2º (detenção de 1 a 4 anos)."
                        },
                        {
                            article: "Art. 1º, § 4º — Causas de Aumento de Pena (1/6 até 1/3)",
                            plainExplanation: "Aumenta-se a pena de 1/6 (um sexto) até 1/3 (um terço): (I) se o crime é cometido por agente público; (II) se o crime é cometido contra criança, gestante, portador de deficiência, adolescente ou maior de 60 (sessenta) anos; (III) se o crime é cometido mediante sequestro.",
                            practicalExample: "Se um Policial Militar pratica tortura, sua pena base de 2 a 8 anos é aumentada de 1/6 a 1/3 pelo fato de ser agente público (§ 4º, I)."
                        },
                        {
                            article: "Art. 1º, §§ 5º, 6º e 7º — Perda Automática do Cargo, Vedação de Fiança/Graça/Anistia e Regime Inicial",
                            plainExplanation: "§ 5º: A condenação acarretará a perda do cargo, função ou emprego público e a interdição para seu exercício pelo DOBRO do prazo da pena aplicada (efeito automático!). § 6º: O crime de tortura é inafiançável e insuscetível de graça ou anistia. § 7º: O texto da lei fala em início de cumprimento em regime fechado, mas o STF declarou a INCONSTITUCIONALIDADE da obrigatoriedade do regime inicial fechado automático!",
                            practicalExample: "Policial condenado a 3 anos de reclusão por tortura perde automaticamente o cargo público e fica interditado para exercer qualquer cargo ou função pública por 6 anos (dobro da pena aplicada)."
                        }
                    ],
                    mediumIncidence: [
                        {
                            article: "Art. 1º, § 3º — Tortura Qualificada pelo Resultado (Lesão Grave/Gravíssima ou Morte)",
                            plainExplanation: "Se resulta lesão corporal de natureza grave ou gravíssima, a pena é de reclusão de 4 a 10 anos; se resulta morte, a reclusão é de 8 a 16 anos (delito preterdoloso, julgado pelo juízo singular/militar e não pelo Tribunal do Júri, pois não houve dolo de matar).",
                            practicalExample: "Durante sessão de tortura para obter confissão (sem intenção de matar), a vítima sofre parada cardíaca e morre: configura Tortura Qualificada pela Morte (Art. 1º, § 3º - 8 a 16 anos), e não homicídio doloso."
                        }
                    ],
                    lowIncidence: [
                        {
                            article: "Art. 2º — Extraterritorialidade da Lei de Tortura",
                            plainExplanation: "O disposto nesta Lei aplica-se ainda quando o crime não tenha sido cometido em território nacional, sendo a vítima brasileira ou encontrando-se o agente em local sob jurisdição brasileira.",
                            practicalExample: "Se um brasileiro é torturado no exterior, a lei brasileira aplica-se de forma incondicionada por força do Art. 2º."
                        }
                    ]
                },
                trapsAndJurisprudence: {
                    examTraps: [
                        "Tortura como Crime Próprio (Art. 1º): Afirmar que só o agente público pode praticar tortura. Errado: é crime comum; a condição de agente público é causa de aumento (§ 4º, I).",
                        "Tortura-Omissão (§ 2º): Dizer que a pena é a mesma da tortura comissiva. Errado: é detenção de 1 a 4 anos, contra reclusão de 2 a 8 anos das formas comissivas.",
                        "Prescrição e Fiança (§ 6º): Dizer que a tortura é imprescritível. Errado: é inafiançável e insuscetível de graça ou anistia, mas PRESCRITÍVEL.",
                        "Perda do Cargo (§ 5º): Afirmar que depende de decisão fundamentada à parte. A lei a prevê como efeito da condenação, com interdição pelo DOBRO do prazo da pena aplicada."
                    ],
                    jurisprudence: [
                        "STF e STJ: a tortura é crime comum, podendo ter como sujeito ativo qualquer pessoa; a qualidade de agente público apenas aumenta a pena em 1/6 a 1/3 (Art. 1º, § 4º, I).",
                        "STF (HC 82.959): declarou inconstitucional o regime integralmente fechado para crimes hediondos e equiparados, o que impulsionou a discussão sobre a progressão de regime na tortura."
                    ]
                },
                essayRepertoire: [
                    {
                        legalDevice: "Art. 5º, III e XLIII da CF/88 e Lei nº 9.455/1997 (Lei de Tortura); Convenção contra a Tortura da ONU (Decreto nº 40/1991)",
                        themes: "Direitos humanos, abuso de poder, controle da atividade policial e dignidade da pessoa humana.",
                        modelSentence: "Ao proibir a tortura e o tratamento desumano ou degradante (Art. 5º, III, da CF/88) e tipificá-la na Lei nº 9.455/1997, o ordenamento brasileiro estabeleceu limite intransponível à atuação estatal, de modo que a eficiência policial só se legitima quando exercida em respeito à dignidade da pessoa humana."
                    }
                ]
            }
        };
