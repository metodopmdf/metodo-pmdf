/* Método PMDF — gerador neural local adaptado do código fornecido pelo usuário.
   Sem Gemini, sem WebGPU, sem chaves privadas no navegador.
   Rede neural pequena classifica dificuldade; enunciados são extrativos/mutações, NÃO IA generativa.
*/
(function(root){
"use strict";
class MotorNeuralSupabase {
  constructor() {
    this.chaveStorage = "pesos_ia_sb_v5";
    this.taxaAprendizado = 0.35;
    this.ciclosTreino = 0;
    this.pesosOculta = this.criarMatriz(6, 8);
    this.pesosSaida = this.criarMatriz(8, 3);

    this.regrasMutacao = [
      { tipo: "Inversão de Exceção", regex: /\b(salvo|exceto|ressalvado|ressalvada)\b/i, substituir: "inclusive", explicacao: "Transformou exceção em regra geral ('inclusive')." },
      { tipo: "Supressão de Condicional", regex: /\b(desde que|mediante|condicionado a)\b/i, substituir: "independentemente de", explicacao: "Eliminou requisito condicional obrigatório." },
      { tipo: "Troca Deôntica", regex: /\b(pode|poderá|é facultado)\b/i, substituir: "deverá obrigatoriamente", explicacao: "Converteu permissão em obrigação estrita." },
      { tipo: "Inversão de Proibição", regex: /\b(vedado|vedada|proibido|defeso|inadmissível)\b/i, substituir: "plenamente facultado e lícito", explicacao: "Inverteu proibição para permissão." },
      { tipo: "Inversão de Exigência", regex: /\b(prescinde|independe|dispensa)\b/i, substituir: "depende estritamente e exige", explicacao: "Trocou dispensa por exigência." },
      { tipo: "Efeito Temporal", regex: /\b(ex tunc|retroativos|ex nunc)\b/i, substituir: (m) => /tunc/i.test(m) ? "ex nunc" : "ex tunc", explicacao: "Inverteu a modulação temporal." },
      { tipo: "Quórum", regex: /\b(maioria absoluta|maioria simples|unanimidade)\b/i, substituir: "maioria qualificada de dois terços", explicacao: "Alterou o quórum de deliberação." },
      { tipo: "Prazo Numérico", regex: /\b(\d+)\s*(dias|meses|anos|horas)\b/i, substituir: (m, n, u) => `${parseInt(n)+15} ${u}`, explicacao: "Alterou o prazo legal previsto." },
      { tipo: "Polaridade Negativa", regex: /\b(não pode|não deve|não se admite)\b/i, substituir: "admite-se expressamente e cabe", explicacao: "Suprimiu a negação do enunciado." }
    ];

    this.inicializarModelo();
  }

  criarMatriz(l, c) { return Array.from({ length: l }, () => Array.from({ length: c }, () => Math.random() * 2 - 1)); }
  sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  derivadaSigmoid(x) { return x * (1 - x); }

  gerarHash(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) h = ((h << 5) + h) + texto.charCodeAt(i);
    return "QH-" + Math.abs(h).toString(16).toUpperCase();
  }

  extrairFeatures(texto) {
    const t = texto.toLowerCase();
    const p = t.split(/\s+/).filter(Boolean);
    return [
      Math.min(((t.match(/\b(somente|apenas|vedado|defeso)\b/g) || []).length) / 2, 1),
      Math.min(((t.match(/\b(salvo|exceto|ressalvado|desde que)\b/g) || []).length) / 2, 1),
      Math.min(((t.match(/\b(\d+|dias|meses|anos)\b/g) || []).length) / 2, 1),
      Math.min(((t.match(/\b(deve|pode|facultado|compete)\b/g) || []).length) / 2, 1),
      Math.min(((t.match(/\b(não|jamais|independe)\b/g) || []).length) / 2, 1),
      Math.min(p.length / 50, 1)
    ];
  }

  preverVetor(entradas) {
    const oculta = this.pesosOculta[0].map((_, j) => {
      let s = 0;
      for (let i = 0; i < entradas.length; i++) s += entradas[i] * this.pesosOculta[i][j];
      return this.sigmoid(s);
    });
    const saida = this.pesosSaida[0].map((_, k) => {
      let s = 0;
      for (let j = 0; j < oculta.length; j++) s += oculta[j] * this.pesosSaida[j][k];
      return this.sigmoid(s);
    });
    return { oculta, saida };
  }

  treinarPasso(entradas, esperado) {
    const { oculta, saida } = this.preverVetor(entradas);
    const ajSaida = saida.map((s, k) => (esperado[k] - s) * this.derivadaSigmoid(s));
    const ajOculta = oculta.map((o, j) => {
      let err = 0;
      for (let k = 0; k < ajSaida.length; k++) err += ajSaida[k] * this.pesosSaida[j][k];
      return err * this.derivadaSigmoid(o);
    });

    for (let j = 0; j < oculta.length; j++)
      for (let k = 0; k < ajSaida.length; k++)
        this.pesosSaida[j][k] += oculta[j] * ajSaida[k] * this.taxaAprendizado;

    for (let i = 0; i < entradas.length; i++)
      for (let j = 0; j < ajOculta.length; j++)
        this.pesosOculta[i][j] += entradas[i] * ajOculta[j] * this.taxaAprendizado;
  }

  inicializarModelo(reset = false) {
    if (!reset) {
      const salvo = localStorage.getItem(this.chaveStorage);
      if (salvo) {
        try {
          const d = JSON.parse(salvo);
          this.pesosOculta = d.pesosOculta;
          this.pesosSaida = d.pesosSaida;
          this.ciclosTreino = d.ciclosTreino || 4000;
          return;
        } catch (e) {}
      }
    }
    this.pesosOculta = this.criarMatriz(6, 8);
    this.pesosSaida = this.criarMatriz(8, 3);
    const ds = [
      { in: [0,0,0,0,0,0.2], out: [0.15,0.10,0.20] },
      { in: [1,0,0,0.5,0,0.5], out: [0.65,0.85,0.45] },
      { in: [0,1,1,0.5,0.5,0.8], out: [0.90,0.90,0.88] }
    ];
    for (let ep = 0; ep < 3000; ep++) for (const item of ds) this.treinarPasso(item.in, item.out);
    this.ciclosTreino = 3000;
    this.salvarModelo();
  }

  salvarModelo() {
    localStorage.setItem(this.chaveStorage, JSON.stringify({ pesosOculta: this.pesosOculta, pesosSaida: this.pesosSaida, ciclosTreino: this.ciclosTreino }));
  }

  segmentarTexto(textoBruto) {
    const unificado = textoBruto.replace(/\r\n/g, "\n").replace(/([a-záéíóúâêôãõç,])\n+([a-záéíóúâêôãõç])/g, "$1 $2");
    const linhas = unificado.split(/\n+|(?<=[.?!;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ]|Art\.|§)/).map(s => s.trim()).filter(Boolean);
    const blocos = [];
    const vistos = new Set();

    for (const l of linhas) {
      if (/^(cap[íi]tulo|t[íi]tulo|se[çc][ãa]o|livro)\s+[ivxlcdm\d]+/i.test(l) && l.length < 50) continue;
      const limpo = l.replace(/^(Art\.?\s*\d+[º°]?[\s.-]*|§\s*\d+[º°]?[\s.-]*|[IVXLCDM]+\s*[-–]\s*)/i, "").trim();
      if (limpo.length >= 25) {
        const fmt = limpo.charAt(0).toUpperCase() + limpo.slice(1);
        const final = fmt.endsWith(".") ? fmt : fmt + ".";
        const h = this.gerarHash(final.toLowerCase());
        if (!vistos.has(h)) { vistos.add(h); blocos.push(final); }
      }
    }
    if (blocos.length === 0 && textoBruto.trim().length > 10) blocos.push(textoBruto.trim());
    return blocos;
  }

  gerarDistratores(textoOriginal, qtd = 4) {
    const dists = [];
    const limpa = textoOriginal.trim().replace(/[.;:]$/, "");
    for (const r of this.regrasMutacao) {
      if (dists.length >= qtd) break;
      if (r.regex.test(limpa)) {
        const mutado = limpa.replace(r.regex, r.substituir) + ".";
        if (mutado.toLowerCase() !== textoOriginal.trim().toLowerCase()) {
          dists.push({ texto: mutado, correta: false, tipoPegadinha: r.tipo, comentario: `INCORRETA (${r.tipo}): ${r.explicacao}` });
        }
      }
    }
    while (dists.length < qtd) {
      dists.push({ texto: limpa + ", sendo vedada qualquer exceção contrária.", correta: false, tipoPegadinha: "Extrapolação", comentario: "INCORRETA: Extrapolação indevida do texto." });
    }
    return dists;
  }

  criarCertoErrado(frase, idx, meta) {
    const { saida } = this.preverVetor(this.extrairFeatures(frase));
    const [dif, peg] = saida;
    const aplicar = (idx % 2 !== 0) || (peg > 0.65);
    let enunciado = frase, gab = "CERTO", com = "CERTO: O item reproduz o texto-base.", arm = "Literalidade";

    if (aplicar) {
      const mut = this.gerarDistratores(frase, 1)[0];
      enunciado = mut.texto; gab = "ERRADO"; com = mut.comentario.replace(/^INCORRETA/, "ERRADO"); arm = mut.tipoPegadinha;
    }

    return {
      hash_unico: this.gerarHash(enunciado),
      disciplina: meta.disciplina,
      assunto: meta.assunto,
      formato: "CERTO_ERRADO",
      dificuldade: this.classificarNivel(dif),
      score_dificuldade: Number(dif.toFixed(3)),
      tipo_armadilha: arm,
      enunciado,
      alternativas: null,
      gabarito: gab,
      comentario_gabarito: com,
      texto_origem: frase
    };
  }

  criarMultiplaEscolha(frase, pool, idx, meta, pedirIncorreta = false) {
    const { saida } = this.preverVetor(this.extrairFeatures(frase));
    const [dif] = saida;
    const outras = pool.filter(f => f !== frase);
    const brutas = [];

    if (!pedirIncorreta) {
      brutas.push({ texto: frase, correta: true, comentario: "CORRETA: Em conformidade com a premissa original." });
      const sort = outras.sort(() => Math.random() - 0.5).slice(0, 4);
      for (const s of sort) brutas.push(this.gerarDistratores(s, 1)[0]);
    } else {
      const d = this.gerarDistratores(frase, 1)[0];
      brutas.push({ texto: d.texto, correta: true, comentario: `GABARITO (Única INCORRETA): ${d.comentario}` });
      for (let i = 0; i < 4; i++) brutas.push({ texto: outras[i] || frase, correta: false, comentario: "Afirmativa verdadeira de acordo com o texto." });
    }

    brutas.sort(() => Math.random() - 0.5);
    const letras = ["A", "B", "C", "D", "E"];
    let gabarito = "A";

    const alternativas = brutas.slice(0, 5).map((op, i) => {
      const letra = letras[i];
      if (op.correta) gabarito = letra;
      return { letra, texto: op.texto, correta: op.correta, comentario: op.comentario };
    });

    const comando = pedirIncorreta ? `Assinale a alternativa INCORRETA:` : `Assinale a alternativa CORRETA:`;

    return {
      hash_unico: this.gerarHash(comando + frase),
      disciplina: meta.disciplina,
      assunto: meta.assunto,
      formato: "MULTIPLA_ESCOLHA",
      dificuldade: this.classificarNivel(dif),
      score_dificuldade: Number(dif.toFixed(3)),
      tipo_armadilha: pedirIncorreta ? "Incorreta" : "Distratores Semânticos",
      enunciado: comando,
      alternativas,
      gabarito,
      comentario_gabarito: alternativas.map(a => `(${a.letra}) ${a.comentario}`).join(" | "),
      texto_origem: frase
    };
  }

  gerarLote(texto, config) {
    const blocos = this.segmentarTexto(texto);
    const limite = Math.min(blocos.length, config.limite || 35);
    const questoes = [];
    for (let i = 0; i < limite; i++) {
      const b = blocos[i];
      const { saida } = this.preverVetor(this.extrairFeatures(b));
      let modo = config.formato;
      if (modo === "MISTO_IA") modo = (saida[2] > 0.6 && i % 2 === 0) ? "ME_CORRETA" : "APENAS_CE";

      if (modo === "APENAS_CE") questoes.push(this.criarCertoErrado(b, i, config));
      else questoes.push(this.criarMultiplaEscolha(b, blocos, i, config, modo === "ME_INCORRETA"));
    }
    return questoes;
  }

  aprenderComFeedback(texto, dif, peg) {
    for (let i = 0; i < 150; i++) this.treinarPasso(this.extrairFeatures(texto), [dif, peg, 0.5]);
    this.ciclosTreino += 150;
    this.salvarModelo();
  }

  classificarNivel(s) { return s > 0.72 ? "Difícil" : s > 0.42 ? "Médio" : "Fácil"; }
}

class MotorNeuralPMDF extends MotorNeuralSupabase {
  gerarDistratores(frase, quantidade=4) {
    const base=String(frase||"").trim().replace(/[.;:]$/,"");
    const vistos=new Set([this.normalizar(base)]), resultado=[];
    for(const regra of this.regrasMutacao){
      if(!regra.regex.test(base))continue;
      const texto=base.replace(regra.regex,regra.substituir).replace(/[.;:]?$/,".") ;
      const chave=this.normalizar(texto);
      if(chave.length<25||vistos.has(chave))continue;
      vistos.add(chave);
      resultado.push({texto,correta:false,tipoPegadinha:regra.tipo,
        comentario:"Alteração de "+regra.tipo+": "+regra.explicacao});
      if(resultado.length>=quantidade)break;
    }
    return resultado;
  }
  normalizar(texto){return String(texto||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").replace(/[.;:]$/,"").trim();}
  gerarHash(texto) {
    const s=String(texto||"");let a=2166136261,b=16777619;
    for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b+s.charCodeAt(i),2246822519);}
    return "QH-"+(a>>>0).toString(16).padStart(8,"0")+(b>>>0).toString(16).padStart(8,"0");
  }
  gerarUnidades(rows) {
    const result=[],unique=new Set();
    for(const row of rows){
      const text=String(row.text||"").trim();
      if(!text||text.length>120000)continue;
      for(const trecho of this.segmentarTexto(text)){
        const sentence=trecho.replace(/\s+/g," ").trim();
        const sig=this.normalizar(sentence);
        if(sentence.length<42||sentence.length>1400||unique.has(sig)||/[.…]$/.test(sentence.slice(0,-1)))continue;
        unique.add(sig);
        result.push({text:sentence,law:row.law||"Material",article:row.article||"Texto-base"});
        if(result.length>=2500)return result;
      }
    }
    return result;
  }
  criarBanco(rows,config){
    const unidades=this.gerarUnidades(rows),out=[],seen=new Set();
    const modo=config.formato,lista=unidades.map((u,i)=>({...u,i,
      d:this.gerarDistratores(u.text,4)}));
    const incluir=(raw,origin)=>{
      const choices=raw.alternativas;
      const id=raw.formato+"|"+raw.enunciado+"|"+(choices||[]).map(x=>x.texto).join("|")+"|"+raw.texto_origem;
      const signature=this.normalizar(id);
      if(seen.has(signature))return;
      seen.add(signature);
      const full={...raw,hash_unico:this.gerarHash(id),_law:origin.law,_article:origin.article};
      out.push(full);
    };
    const makeBase=(u,formato,statement,answer,alts,arm,comment)=>{
      const score=this.preverVetor(this.extrairFeatures(u.text)).saida[0];
      return {disciplina:config.disciplina||u.law,assunto:config.assunto||u.article,formato,
        dificuldade:this.classificarNivel(score),score_dificuldade:Number(score.toFixed(3)),
        tipo_armadilha:arm,enunciado:statement,alternativas:alts,gabarito:answer,
        comentario_gabarito:comment,texto_origem:u.text};
    };
    const makeMC=(u,incorrect)=>{
      let alternativas=[];
      if(incorrect){
        if(!u.d.length)return;
        const outras=lista.filter(v=>v.i!==u.i&&v.law===u.law&&this.normalizar(v.text)!==this.normalizar(u.text)).slice(0,4);
        if(outras.length<4)return;
        alternativas=[{texto:u.d[0].texto,correta:true,comentario:u.d[0].comentario},
          ...outras.map(v=>({texto:v.text,correta:false,comentario:"Afirmativa presente no texto-base ("+v.article+")."}))];
      }else{
        const falsos=[];
        const seenFalse=new Set([this.normalizar(u.text)]);
        // Reaproveita mutações de outros trechos da mesma fonte; nunca preenche com alternativas repetidas.
        for(const v of [u,...lista]){
          if(v.law!==u.law)continue;
          for(const d of v.d){
            const norm=this.normalizar(d.texto);
            if(seenFalse.has(norm))continue;
            seenFalse.add(norm);falsos.push(d);
            if(falsos.length>=4)break;
          }
          if(falsos.length>=4)break;
        }
        if(falsos.length<4)return;
        alternativas=[{texto:u.text,correta:true,comentario:"Trecho do material de origem."},
          ...falsos.map(d=>({...d,correta:false}))];
      }
      if(alternativas.length!==5||new Set(alternativas.map(a=>this.normalizar(a.texto))).size!==5)return;
      const deslocamento=u.i%5;
      alternativas=[...alternativas.slice(deslocamento),...alternativas.slice(0,deslocamento)];
      alternativas=alternativas.map((a,i)=>({letra:"ABCDE"[i],texto:a.texto,correta:a.correta,
        comentario:a.comentario||"Compare com o texto-base."}));
      const selected=alternativas.find(a=>a.correta);
      if(!selected||alternativas.filter(a=>a.correta).length!==1)return;
      const enunciado="Considerando o conteúdo de "+u.law+" ("+u.article+"), assinale a alternativa "+(incorrect?"INCORRETA":"CORRETA")+".";
      incluir(makeBase(u,"MULTIPLA_ESCOLHA",enunciado,selected.letra,alternativas,
        incorrect?"Identificação da incorreta":"Distratores por alterações textuais",
        alternativas.map(a=>"("+a.letra+") "+a.comentario).join(" | ")),u);
    };
    for(const u of lista){
      if(modo==="APENAS_CE"||modo==="MISTO_IA"){
        incluir(makeBase(u,"CERTO_ERRADO",u.text,"CERTO",null,"Literalidade",
          "O enunciado reproduz um trecho do material fornecido, sem confirmação externa de vigência."),u);
        if(u.d.length)incluir(makeBase(u,"CERTO_ERRADO",u.d[0].texto,"ERRADO",null,u.d[0].tipoPegadinha,
          u.d[0].comentario+" Confira a alteração com o texto original."),u);
      }
      if(modo==="ME_CORRETA"||modo==="ME_INCORRETA"||modo==="MISTO_IA"){
        if(modo==="MISTO_IA"){if(u.i%2===0)makeMC(u,false);else makeMC(u,true);}
        else makeMC(u,modo==="ME_INCORRETA");
      }
    }
    return {questoes:out,unidades:unidades.length};
  }
  aprenderComFeedback(texto,dif,peg){
    const entradas=this.extrairFeatures(texto);
    for(let i=0;i<25;i++)this.treinarPasso(entradas,[dif,peg,0.5]);
    this.ciclosTreino+=25;
    try{this.salvarModelo();}catch(e){/* navegação privada/sem espaço */ }
  }
}
const host=()=>root.PMDFNeuralQuestionHost;
const el=id=>host()?.el(id);
let motor=null,run=null,lastRows=[];
function getMotor(){return motor||(motor=new MotorNeuralPMDF());}
function info(value){const e=el("q-neural-status");if(e)e.textContent=String(value||"");}
function status(){return {running:!!run};}
function stop(){if(run){run.cancelled=true;info("Geração interrompida.");}}
function convert(q){
  return {type:q.formato==="MULTIPLA_ESCOLHA"?"MC":"CE",statement:q.enunciado,
    options:q.alternativas?.map(a=>a.texto)||null,
    answer:q.formato==="MULTIPLA_ESCOLHA"?q.gabarito:(q.gabarito==="CERTO"?"C":"E"),
    explanation:q.comentario_gabarito,law:q._law,topic:q._article,
    lawBasis:q._article,sourceQuote:q.texto_origem,origin:"neural-local",
    neuralDifficulty:q.dificuldade,neuralScore:q.score_dificuldade,
    neuralHash:q.hash_unico,neuralTrap:q.tipo_armadilha,
    optionAnalysis:q.alternativas?.map(a=>a.comentario)||null,
    coverageId:q.hash_unico};
}
async function start(more=false){
  const h=host();
  if(!h?.auth())return h?.toast("Entre na sua conta para gerar questões.","error");
  if(run)return h.toast("Já existe uma geração em andamento.","error");
  const guides=h.guides(),source=el("q-source")?.value;
  if(source==="imported")return h.toast("Provas importadas estão disponíveis no modo Tradicional.","error");
  if(!guides?.length)return h.toast("Selecione ou envie um material antes de gerar.","error");
  const fmt=el("q-format")?.value||"CE";
  const comando=el("q-neural-command")?.value||"correta";
  const formato=fmt==="MIX"?"MISTO_IA":fmt==="MC"?(comando==="incorreta"?"ME_INCORRETA":"ME_CORRETA"):"APENAS_CE";
  const target=Math.min(200,Math.max(1,Number(el("q-neural-target")?.value)||30));
  const state={cancelled:false};run=state;
  if(el("q-generate-button"))el("q-generate-button").disabled=true;
  if(el("q-next-button"))el("q-next-button").disabled=true;
  info("Extraindo proposições e validando alternativas...");
  try{
    await new Promise(resolve=>setTimeout(resolve,0));
    const units=h.sourceUnits(guides);
    if(state.cancelled)return;
    const engine=getMotor(),build=engine.criarBanco(units,{formato,
      disciplina:guides.length===1?guides[0].lawName:"Legislação policial",
      assunto:guides.length===1?guides[0].lawName:"Conteúdo selecionado"});
    if(state.cancelled)return;
    const sourceKey=h.hash(units.map(u=>u.law+"|"+u.article+"|"+u.text).join("§"));
    const key="q:neural:cycle:v1:"+engine.gerarHash(sourceKey+"|"+formato);
    const all=build.questoes,available=all.length;
    if(!available)throw Error("O texto não contém trechos suficientes para formar questões verificáveis neste formato. Experimente Certo/Errado ou envie mais artigos.");
    let cursor=more?Math.max(0,Number(h.store.get(key))||0):0;
    if(cursor>=available)cursor=0;
    const picked=all.slice(cursor,cursor+target),next=cursor+picked.length;
    h.store.set(key,String(next));
    lastRows=picked;
    h.setQuestions(picked.map(convert),{model:"Rede 6-8-3 · mutações locais",key,total:next,target:available});
    info(picked.length+" questões criadas de "+available+" possibilidades ("+build.unidades+" trechos). "+
      (next>=available?"Cobertura concluída; próximo lote reiniciará o ciclo.":"Use Próximo lote para continuar.")+
      " Gabaritos baseados no texto fornecido, sem verificação jurídica externa.");
    h.toast(picked.length+" questões elaboradas localmente.","ok");
    return {ok:true,count:picked.length,total:available};
  }catch(e){
    info("Falha na geração: "+String(e?.message||e));
    h.toast("Falha no motor neural: "+String(e?.message||e),"error");
    return {ok:false,error:String(e?.message||e)};
  }finally{
    run=null;
    if(el("q-generate-button"))el("q-generate-button").disabled=false;
    if(el("q-next-button"))el("q-next-button").disabled=false;
  }
}
function reset(){
  stop();lastRows=[];
  const guides=host()?.guides()||[],units=host()?.sourceUnits(guides)||[];
  const engine=getMotor(),fmt=el("q-format")?.value||"CE",cmd=el("q-neural-command")?.value||"correta";
  const forma=fmt==="MIX"?"MISTO_IA":fmt==="MC"?(cmd==="incorreta"?"ME_INCORRETA":"ME_CORRETA"):"APENAS_CE";
  const sourceKey=host().hash(units.map(u=>u.law+"|"+u.article+"|"+u.text).join("§"));
  host().store.del("q:neural:cycle:v1:"+engine.gerarHash(sourceKey+"|"+forma));
  info("Cobertura reiniciada. O aprendizado local foi preservado.");
  host().toast("Cobertura reiniciada.","ok");
}
function json(){
  if(!lastRows.length)return host()?.toast("Gere questões antes de exportar.","error");
  const exportRows=lastRows.map(({_law,_article,...rest})=>rest);
  const blob=new Blob([JSON.stringify(exportRows,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="questoes-neurais-"+Date.now()+".json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function save(){
  if(!lastRows.length)return host()?.toast("Gere questões antes de salvar no Supabase.","error");
  if(!host()?.auth())return host()?.toast("Faça login antes de salvar.","error");
  const b=el("q-neural-save");if(b)b.disabled=true;
  info("Salvando "+lastRows.length+" questões no banco...");
  try{
    const rows=lastRows.map(q=>{
      const {_law,_article,...o}=q;
      return {...o,hash_unico:getMotor().gerarHash(host().auth().username+"|"+q.hash_unico),
        criado_por:host().auth().username,publicada:false};
    });
    await host().persist(rows);
    info(rows.length+" questões salvas em seu banco privado do Supabase.");
    host().toast("Lote salvo no Supabase.","ok");
  }catch(e){
    info("Falha no Supabase: "+String(e?.message||e)+
      ". Confirme se a migração SQL da tabela questoes já foi aplicada.");
    host().toast("Banco de questões indisponível: "+String(e?.message||e),"error");
  }finally{if(b)b.disabled=false;}
}
root.PMDFNeuralQuestions=Object.freeze({start,stop,reset,save,json,status,
  testModel:()=>getMotor()});
})(window);
