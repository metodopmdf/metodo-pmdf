/*
 * Método PMDF · acervo autoral por tópico (2026-11).
 * Não reproduz questões de bancas; não substitui leitura da legislação vigente.
 * CE editorial (uma assertiva fundamentada por tópico) e MC selecionadas.
 * Geração adicional: o motor local usa explicações autorais como fonte.
 */
(function(root){
 "use strict";
 const catalog=root.PMDF_PRACA_CATALOG;
 const packs=new Map(), used=new Set();
 const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
 const checkedUrl=url=>/^https:\/\/(?:www\d*\.)?(?:planalto\.gov\.br|gov\.br|www\.gov\.br|sinj\.df\.gov\.br|ibge\.gov\.br|bvsms\.saude\.gov\.br|portaldaobmep\.impa\.br|learnenglish\.britishcouncil\.org)(?:\/|$)/i.test(String(url||'')) ? url : '';
 function add(index, rows, source, multipleChoice=[]){
   if(!catalog)throw Error("Carregue o catálogo PMDF antes do banco autoral");
   const d=catalog.disciplinas[index-1];
   if(!d||packs.has(d.slug))throw Error("Disciplina inválida ou duplicada: "+index);
   if(!Array.isArray(rows)||rows.length!==d.assuntos.length)throw Error("Cobertura incompleta: "+d.nome);
   if(!checkedUrl(source?.url))throw Error("URL de referência inválida: "+d.nome);
   const questions=[];
   rows.forEach((r,i)=>{
     const [statement,answer,explanation]=r;
     if(!["C","E"].includes(answer)||String(statement).trim().length<75||String(explanation).trim().length<48)
       throw Error("Revisar item "+d.nome+" #"+(i+1));
     const a=d.assuntos[i],id=d.slug+"|"+a.slug+"|CE|1";
     if(used.has(id))throw Error("Duplicata "+id);
     used.add(id);
     questions.push(Object.freeze({
       id,coverageId:"programa-v1:"+id,type:"CE",
       statement:String(statement).trim(),answer,
       explanation:String(explanation).trim(),
       law:d.nome,topic:a.nome,disciplineSlug:d.slug,topicSlug:a.slug,
       lawBasis:source.label,sourceUrl:source.url,
       evidence:(answer==="C"?statement:explanation),
       origin:"curriculo-autoral",board:"Estilo Cebraspe · questão autoral",
       difficulty:"Médio"
     }));
   });
   for(const [topicIndex,statement,alternatives,answer,explanation] of multipleChoice){
     const a=d.assuntos[topicIndex-1];
     if(!a||!Array.isArray(alternatives)||alternatives.length!==5||
        new Set(alternatives.map(norm)).size!==5||!["A","B","C","D","E"].includes(answer)||
        String(statement).trim().length<55||String(explanation).trim().length<48)
       throw Error("Questão MC inválida: "+d.nome+" #"+topicIndex);
     const id=d.slug+"|"+a.slug+"|MC|1";
     if(used.has(id))throw Error("Duplicata "+id);used.add(id);
     questions.push(Object.freeze({
       id,coverageId:"programa-v1:"+id,type:"MC",
       statement,options:Object.freeze(alternatives),answer,explanation,
       law:d.nome,topic:a.nome,disciplineSlug:d.slug,topicSlug:a.slug,
       lawBasis:source.label,sourceUrl:source.url,origin:"curriculo-autoral",
       board:"Questão autoral · múltipla escolha",difficulty:"Médio"
     }));
   }
   packs.set(d.slug,Object.freeze({source:Object.freeze({...source}),questions:Object.freeze(questions)}));
 }
 function choose(dslug,aslug,format){
   const ds=dslug?[catalog.disciplina(dslug)].filter(Boolean):catalog.disciplinas;
   return ds.flatMap(d=>(packs.get(d.slug)?.questions||[]).filter(q=>
     (!aslug||q.topicSlug===aslug) &&
     (format==="MIX"||format===(q.type==="MC"?"MC":"CE"))
   ));
 }
 function guide(dslug,aslug){
   return (dslug?[catalog.disciplina(dslug)].filter(Boolean):catalog.disciplinas).map(d=>{
     const pack=packs.get(d.slug);
     const rows=(pack?.questions||[]).filter(q=>q.type==="CE"&&(!aslug||q.topicSlug===aslug))
       .map(q=>({article:q.topic,sourceText:String(q.evidence||"").trim(),
         plainExplanation:q.explanation,practicalExample:q.statement}));
     return {lawName:d.nome,articlesMapping:{highIncidence:rows,mediumIncidence:[],lowIncidence:[]},
       curriculum:true};
   }).filter(g=>g.articlesMapping.highIncidence.length);
 }
 root.PMDF_TOPIC_BANK=Object.freeze({
   add,choose,guide,
   count:()=>[...packs.values()].reduce((n,p)=>n+p.questions.length,0),
   coverage:()=>Object.freeze(catalog.disciplinas.map(d=>Object.freeze({
     disciplina:d.nome,slug:d.slug,esperados:d.assuntos.length,
     registrados:(packs.get(d.slug)?.questions||[]).filter(q=>q.type==="CE").length,
     multiplaEscolha:(packs.get(d.slug)?.questions||[]).filter(q=>q.type==="MC").length
   })))
 });
})(window);

/* 01 · Língua Portuguesa */
window.PMDF_TOPIC_BANK.add(1,[["No contexto do Acordo Ortográfico, a palavra “ideia” não recebe acento agudo, enquanto “herói” conserva o acento, apesar de ambas apresentarem sequência vocálica aberta.","C","A regra retirou o acento de ditongos abertos em paroxítonas como “ideia”; em oxítonas como “herói”, a acentuação permanece."],["Na oração “A equipe atuou rapidamente”, a palavra “rapidamente” é classificada como adjetivo porque atribui uma qualidade ao substantivo “equipe”.","E","“Rapidamente” é advérbio de modo: modifica a ação expressa pelo verbo “atuou”, e não caracteriza diretamente o substantivo “equipe”."],["Em um relatório que apresenta a expressão “os agentes” e, na frase seguinte, utiliza “eles” para retomar esse grupo, o pronome exerce função coesiva de referenciação.","C","O pronome retoma um referente textual já mencionado (anáfora), produzindo continuidade temática e evitando repetição desnecessária da expressão nominal."],["Em “Se o candidato estudar com regularidade, obterá melhores resultados”, a oração introduzida por “se” apresenta hipótese expressa por futuro do subjuntivo.","C","A forma “estudar” é futuro do subjuntivo; combina-se com a oração principal no futuro do presente, sem expressar um acontecimento já consumado."],["No enunciado “Vendem-se equipamentos de proteção”, o “se” é índice de indeterminação do sujeito e o verbo deve permanecer sempre no singular.","E","Trata-se de voz passiva sintética com verbo transitivo direto; “equipamentos de proteção” é sujeito paciente plural e exige “vendem-se”."],["A oração subordinada introduzida por “embora” em “Embora chovesse, a equipe prosseguiu” exprime concessão e não equivale semanticamente a uma causa.","C","A conjunção “embora” instaura circunstância concessiva: um fato que não impede a ocorrência da ação principal, diferentemente de “porque”."],["Na frase “A equipe chegou cedo, mas o atendimento atrasou”, a conjunção “mas” introduz oração coordenada conclusiva, equivalente a “portanto”.","E","“Mas” introduz oração coordenada sindética adversativa, enquanto “portanto” expressa uma relação conclusiva."],["Em textos formais, a pontuação permite separar por vírgula o sujeito simples de seu predicado apenas porque o sujeito é extenso.","E","A extensão do sujeito não autoriza, por si só, vírgula entre sujeito e verbo; essa separação costuma violar a estrutura sintática básica."],["Na frase “Faz cinco anos que o setor funciona neste prédio”, a forma verbal “faz” deve permanecer no singular, pois indica tempo decorrido.","C","Quando indica tempo transcorrido, o verbo “fazer” é impessoal e permanece na terceira pessoa do singular."],["Na acepção de “ver” ou “presenciar”, o verbo “assistir” é tradicionalmente transitivo indireto na norma-padrão: “Os candidatos assistiram à palestra”.","C","Na regência normativa dessa acepção, “assistir” pede preposição “a”; em “à palestra”, ocorre a fusão da preposição com artigo feminino."],["Em “O policial dirigiu-se à unidade”, o acento grave pode indicar a fusão da preposição exigida pelo verbo com o artigo feminino que antecede “unidade”.","C","A crase resulta da combinação de preposição “a” e artigo “a”; o acento grave registra graficamente essa fusão."],["Em “Não me informaram o resultado”, a presença do advérbio negativo “não” favorece a próclise do pronome átono “me” na norma-padrão.","C","A palavra negativa atrai o pronome oblíquo átono, justificando sua posição antes da forma verbal “informaram”."],["A reescrita de “O atendimento atrasou porque houve um acidente” por “O atendimento atrasou embora houvesse um acidente” preserva integralmente a relação lógica original.","E","“Porque” indica causa; “embora” indica concessão. A troca altera o sentido argumentativo e não mantém equivalência semântica."],["Um editorial de jornal é necessariamente um gênero estritamente descritivo, desprovido de posicionamento argumentativo ou avaliação institucional.","E","Editorial é gênero que normalmente explicita posicionamento opinativo e argumentação institucional, diferentemente de notícia predominantemente informativa."],["Uma inferência textual válida deve ser compatível com os elementos e relações presentes no texto, sem introduzir como fato uma informação não sustentada pelo enunciado.","C","Interpretar envolve relacionar informações explícitas e implícitas; extrapolações incompatíveis com o texto não constituem inferências justificáveis."],["Segundo os princípios da redação oficial, clareza, precisão e impessoalidade são exigências do texto administrativo, sem dispensar adequação ao destinatário.","C","O Manual de Redação da Presidência da República orienta que comunicações oficiais sejam claras, precisas, objetivas e impessoais."],["As grafias “exceção” e “excessão” são igualmente aceitas na norma ortográfica atual, devendo a escolha seguir apenas o estilo do redator.","E","A grafia correta da palavra é “exceção”; a forma “excessão” não integra a ortografia-padrão."]],{"label":"Manual de Redação da Presidência da República (3ª ed.) e gramática normativa","url":"https://www4.planalto.gov.br/centrodeestudos/pages/assuntos/manual-de-redacao-da-presidencia-da-republica.html"},[[9,"Assinale a frase que apresenta concordância verbal compatível com a norma-padrão.",["Fazem cinco anos que a unidade foi inaugurada.","Houveram três ocorrências ontem.","Existem razões para manter o procedimento.","Deve haverem novas orientações.","É necessário a apresentação dos documentos."],"C","O verbo “existir” concorda com “razões”. “Fazer” e “haver” impessoais ficam no singular; “dever” auxiliar de haver impessoal também fica no singular; “necessária” concordaria com “a apresentação”."],[11,"Um candidato precisa redigir o destino de uma equipe, mantendo o uso normativo do acento indicativo de crase. Assinale a alternativa adequada.",["A equipe retornou à Brasília ontem.","O agente entregou o documento à ele.","Os oficiais seguiram à unidade policial.","O documento foi enviado à todos.","O servidor chegou à pé ao local."],"C","Em “seguir à unidade policial”, há preposição exigida pelo verbo de movimento e artigo feminino definido. Não ocorre crase antes de “ele”, “todos” ou “pé”, nem nesse uso comum de “Brasília” sem artigo."]]);

/* 02 · RLM */
window.PMDF_TOPIC_BANK.add(2,[["Todo número inteiro pertence ao conjunto dos números racionais, pois pode ser escrito como quociente de dois inteiros com denominador diferente de zero.","C","Para qualquer inteiro n, a igualdade n = n/1 demonstra sua representação como número racional; todo racional também é real."],["No sistema de equações x + y = 12 e x − y = 4, a única solução é o par ordenado (x,y) = (4,8), obtido pela subtração das equações.","E","Somando as duas equações, obtém-se 2x = 16 e x = 8; substituindo, y = 4. A solução é (8,4), e não (4,8)."],["Em lógica de predicados, a proposição “Todos os policiais do grupo foram aprovados” não é equivalente à proposição “Existe pelo menos um policial do grupo aprovado”.","C","O quantificador universal exige a propriedade para todos os elementos do domínio; o existencial afirma sua ocorrência em ao menos um elemento, não equivalendo ao universal."],["O argumento “Se houver chuva, a operação será remarcada; houve chuva; logo, a operação será remarcada” apresenta a forma válida de inferência denominada modus ponens.","C","A estrutura p → q; p; logo q é dedutivamente válida; a validade da forma não depende de ter sido verificada a veracidade das premissas no mundo real."],["A proposição condicional “p implica q” é falsa exatamente quando p é falsa e q é verdadeira, permanecendo verdadeira nas demais combinações de valores.","E","Uma condicional material p → q é falsa apenas com antecedente verdadeiro e consequente falso; é equivalente a ¬p ∨ q."],["A função real f(x)=√(x−3) está definida para qualquer número real, pois a operação de radiciação elimina restrições sobre o radicando.","E","No conjunto dos reais, o radicando de uma raiz quadrada deve ser não negativo: x−3 ≥ 0, portanto o domínio é x ≥ 3."],["Se A = {1,2,3} e B = {3,4}, a interseção A ∩ B contém exclusivamente o elemento 3, ao passo que a união contém 1, 2, 3 e 4.","C","A interseção reúne elementos comuns aos dois conjuntos, enquanto a união reúne elementos pertencentes a pelo menos um deles."],["A sequência numérica 5, 8, 11, 14, ... constitui progressão geométrica de razão 3, pois a diferença entre termos consecutivos é constante.","E","Uma diferença constante caracteriza progressão aritmética de razão 3. Na progressão geométrica, é o quociente entre termos consecutivos que permanece constante."],["Ao escolher dois integrantes entre cinco candidatos, sem distinguir a ordem de escolha, existem 20 combinações possíveis de duplas.","E","Como a ordem não importa, aplicam-se combinações: C(5,2) = 5!/(2!3!) = 10. O resultado 20 corresponde a escolhas ordenadas."],["Uma tabela de distribuição de efetivo por duas regiões e três turnos pode ser modelada por matriz 2×3, com seis posições identificadas por linha e coluna.","C","O número de linhas representa as regiões e o de colunas representa os turnos; o total de entradas da matriz é 2 × 3 = 6."],["Se seis agentes executam igualmente certa tarefa em quatro horas, então, mantendo produtividade constante, doze agentes executam a mesma tarefa em oito horas.","E","Número de agentes e tempo são grandezas inversamente proporcionais; com o dobro de agentes e produtividade constante, o tempo cai de quatro para duas horas."],["Na conversão de medidas de capacidade, 2,5 litros correspondem a 2.500 mililitros, porque cada litro contém mil mililitros.","C","O fator de conversão é 1 L = 1.000 mL. Assim, 2,5 L × 1.000 = 2.500 mL."]],{"label":"Matemática e lógica elementar: definições de conjuntos, proposições, funções e combinatória; material didático OBMEP","url":"https://portaldaobmep.impa.br/"},[[5,"Em uma escala de plantão, p significa “o agente está de serviço” e q, “ele usa equipamento”. Qual situação torna falsa a proposição “Se p, então q”?",["p falsa e q falsa.","p falsa e q verdadeira.","p verdadeira e q verdadeira.","p verdadeira e q falsa.","p e q ambas não definidas."],"D","A implicação material p → q só é falsa quando o antecedente é verdadeiro e o consequente falso; nos outros casos, é verdadeira."],[9,"Uma equipe dispõe de sete candidatos e formará uma dupla sem cargos distintos. Quantas duplas diferentes poderão ser formadas?",["14","21","28","35","42"],"B","Como a ordem não diferencia as duplas, calcula-se C(7,2) = 7×6/2 = 21. A permutação de dois candidatos contaria cada dupla duas vezes."]]);
