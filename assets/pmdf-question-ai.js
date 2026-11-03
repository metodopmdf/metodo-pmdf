/* Método PMDF — elaboração Gemini via Supabase. Nenhum modelo WebGPU. */
(function (root) {
  "use strict";
  const host = () => root.PMDFQuestionHost;
  const element = id => host()?.$(id);
  const toast = (message,kind="error") => host()?.toast(message,kind);
  const clean = x => String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  let current = null;
  function report(message,fraction) {
    element("q-ai-progress-wrap")?.classList.remove("hidden");
    if (element("q-ai-progress-text")) element("q-ai-progress-text").textContent=message;
    if (Number.isFinite(fraction)) {
      const n=Math.round(Math.min(1,Math.max(0,fraction))*100);
      if(element("q-ai-progress-fill"))element("q-ai-progress-fill").style.width=n+"%";
      element("q-ai-progress")?.setAttribute("aria-valuenow",String(n));
    }
  }
  function diagnostic(s) {
    if(element("q-ai-diagnostic"))element("q-ai-diagnostic").textContent=String(s||"");
  }
  async function checkCompatibility() {
    const target=element("q-ai-compat");
    if (!target) return;
    if (element("q-ai-backend")?.value==="safe") {
      target.textContent="Modo seguro: geração por regras locais, sem API nem GPU.";
      return;
    }
    target.textContent="Verificando conexão segura com Gemini...";
    if(!host()?.healthGemini) {
      target.textContent="Cliente Gemini não foi carregado completamente.";
      return;
    }
    try{
      const data=await host().healthGemini();
      target.textContent=data.available ?
        "Gemini disponível no servidor · sem WebGPU, downloads ou chave no navegador." :
        "Gemini ainda não ativado no servidor. "+(data.message||"Configure a função e o segredo.");
    }catch(e){
      target.textContent="Servidor Gemini não publicado ou inacessível. "+String(e?.message||"");
    }
  }
  async function prepare() { await checkCompatibility(); return true; }
  function stop() {
    if(current) {
      current.cancelled=true;
      current.abort.abort();
      report("Solicitação interrompida. Questões já recebidas permanecem salvas.");
    }
  }
  function groups(guides){
    const rows=host().sourceUnits(guides);
    const chunks=[];
    let buffer="",title="",law="";
    function flush() {
      if(buffer.trim().length>=60)chunks.push({text:buffer.trim(),title:law,article:title||"Dispositivos examináveis"});
      buffer="";title="";
    }
    for(const r of rows){
      const text=String(r.text||"").replace(/\s+/g," ").trim();
      if(text.length<40 || text.includes("…"))continue;
      const label=String(r.article||"Dispositivo").slice(0,140);
      if(buffer && (buffer.length+text.length+label.length>2600||r.law!==law))flush();
      law=r.law;
      if(!title)title=label;
      if(text.length>2700){
        flush();
        for(let off=0;off<text.length;off+=2600){
          const part=text.slice(off,off+2600);
          if(part.length>=60)chunks.push({text:label+" — "+part,title:law,article:label});
        }
      }else buffer+=label+" — "+text+"\n";
    }
    flush();
    return chunks;
  }
  function bankKey(guides,fmt,level){
    return "q:gemini:bank:v1:"+String(host().hash(guides.map(g=>g.lawName+"|"+
      ["highIncidence","mediumIncidence","lowIncidence"].map(k=>
      (g.articlesMapping?.[k]||[]).map(r=>r.article+"="+(r.sourceText||r.plainExplanation||"")).join("|")).join("|"))
      .join("§")+"|"+fmt+"|"+level+"|"+(element("q-board")?.value||"Cebraspe")));
  }
  function read(key) {
    let saved=host().memory[key]||null;
    if(!saved){try{saved=JSON.parse(host().store.get(key)||"null");}catch(_){}}
    return saved&&saved.version===1&&Array.isArray(saved.questions)&&Number.isInteger(saved.cursor)
      ?saved:{version:1,questions:[],cursor:0,rejected:0};
  }
  function save(key,bank) {
    host().memory[key]=bank;
    if(!host().store.set(key,JSON.stringify(bank))&&!bank.storageWarning) {
      bank.storageWarning=true;
      toast("Espaço de armazenamento insuficiente para salvar todo o banco. Faça backup dos estudos.","error");
    }
  }
  function similar(a,b){
    const aa=clean(a),bb=clean(b);
    if(aa===bb)return true;
    const A=new Set(aa.split(" ").filter(x=>x.length>2));
    const B=new Set(bb.split(" ").filter(x=>x.length>2));
    const union=new Set([...A,...B]);
    return union.size>9&&[...A].filter(x=>B.has(x)).length/union.size>0.89;
  }
  function accept(raw,source,fmt,level,bank) {
    if(!raw||typeof raw!=="object")return null;
    const statement=String(raw.statement||"").trim();
    const evidence=String(raw.evidence||"").trim();
    const explanation=String(raw.explanation||"").trim();
    const answer=String(raw.answer||"").toUpperCase().trim();
    const options=Array.isArray(raw.options)?raw.options.map(x=>String(x)):[];
    const comments=Array.isArray(raw.optionAnalysis)?raw.optionAnalysis.map(x=>String(x)):[];
    if(statement.length<55||explanation.length<35||evidence.length<16||evidence.length>400||
      !clean(source.text).includes(clean(evidence)) || bank.questions.some(q=>similar(q.statement,statement)))return null;
    if(fmt==="CE"&&!["C","E"].includes(answer))return null;
    if(fmt==="MC"&&(![4,5].includes(options.length)||comments.length!==options.length||
      !"ABCDE".slice(0,options.length).includes(answer)||
      new Set(options.map(clean)).size!==options.length))return null;
    const q={origin:"gemini",type:fmt,statement,answer,options:fmt==="MC"?options:[],
      explanation,optionAnalysis:fmt==="MC"?comments:[],
      sourceQuote:evidence,sourceKey:"gemini-source-"+String(host().hash(source.text)),
      law:source.title,lawBasis:source.article+" — "+source.title,
      topic:String(raw.topic||source.article||"Trecho jurídico"),
      subtopic:String(raw.subtopic||"Regra e aplicação"),difficulty:level,
      examRef:"Inédita · Gemini · estilo "+(element("q-board")?.value||"Cebraspe"),
      easyTip:"Elaborada com Gemini. Confirme o texto integral e a vigência da norma."};
    q.coverageId="gemini-"+String(host().hash(fmt+"|"+source.title+"|"+statement));
    return host().validateItem(q)?q:null;
  }
  function show(bank,key,model,count=12,target=null) {
    if(!bank.questions.length)return false;
    // O histórico íntegro fica no banco; o simulador recebe somente o lote
    // recente para evitar sessões enormes e consumo excessivo de memória.
    const batch=bank.questions.slice(-Math.max(1,Math.min(20,count)));
    host().setQuestions(batch,model,key,"gemini",bank.questions.length,target);
    return true;
  }
  function reset(){
    if(current){toast("Interrompa a geração antes de reiniciar o banco.");return false;}
    const guides=host().guides();
    const fmt=element("q-format")?.value==="MC"?"MC":"CE";
    const level=host().level(element("q-level")?.value);
    const key=bankKey(guides,fmt,level);
    host().store.del(key);
    delete host().memory[key];
    if(element("q-coverage"))element("q-coverage").textContent="Banco de questões Gemini reiniciado para esta fonte e configuração.";
    toast("Banco Gemini reiniciado para este material e formato.","ok");
    return true;
  }
  async function start(more=false){
    if(current)return toast("A geração anterior ainda está em andamento.");
    if(!host()?.user())return toast("Entre na sua conta para gerar questões.");
    if(element("q-source")?.value==="imported")return toast("Provas importadas devem usar o gerador Tradicional.");
    if(element("q-ai-backend")?.value==="safe")
      return host()?.safe?.(more,"Geração determinística escolhida pelo usuário.");
    if(!host()?.requestGemini)return toast("Integração Gemini indisponível no cliente. Atualize a página.");
    const guides=host().guides();
    if(!guides?.length)return toast("Selecione uma lei ou envie conteúdo antes de gerar.");
    const source=groups(guides);
    if(!source.length)return toast("A fonte não contém proposições textuais suficientes. Envie a lei integral para melhor cobertura.");
    const fmt=element("q-format")?.value==="MC"?"MC":"CE";
    const level=host().level(element("q-level")?.value);
    const key=bankKey(guides,fmt,level);
    const bank=read(key);
    const target=Math.min(200,Math.max(1,Number(element("q-ai-target")?.value)||100));
    if(bank.questions.length>=target) {
      show(bank,key,"Gemini",12,target);
      return toast("Meta atingida. Selecione uma meta maior para continuar.","ok");
    }
    const roundMax=fmt==="MC"?8:12;
    const desired=Math.min(roundMax,target-bank.questions.length);
    const stopAt=Math.min(source.length*5,bank.cursor+6);
    const state={cancelled:false,abort:new AbortController()};
    current=state;
    const controls=["q-generate-button","q-next-button","q-source","q-format","q-level","q-board","q-ai-backend","q-ai-target"];
    const prior=controls.map(id=>Boolean(element(id)?.disabled));
    controls.forEach(id=>{if(element(id))element(id).disabled=true;});
    element("q-ai-stop")?.classList.remove("hidden");
    diagnostic("");
    let acceptedThisRound=0;
    try{
      while(!state.cancelled && bank.questions.length<target && acceptedThisRound<desired && bank.cursor<stopAt){
        const unit=source[bank.cursor%source.length];
        const phase=["literalidade e requisitos","exceções e ressalvas","caso hipotético","competências e prazos",
          "aplicação sistemática","interpretação no estilo da banca"][Math.floor(bank.cursor/source.length)%6];
        const limit=Math.min(fmt==="MC"?4:6,desired-acceptedThisRound);
        report("Gemini: criando lote sobre "+unit.article+" · "+bank.questions.length+"/"+target+" questões no banco.",
          bank.questions.length/target);
        const recent=bank.questions.slice(-6).map(q=>q.statement.slice(0,145));
        // Cursor só avança depois de retorno processado; falha/quota não
        // descarta unidade, permitindo retomada na próxima tentativa.
        let response;
        try{
          response=await host().requestGemini({
            format:fmt,level,board:element("q-board")?.value||"Cebraspe",
            count:limit,emphasis:phase,
            source:{title:unit.title,article:unit.article,text:unit.text},exclude:recent
          },state.abort.signal);
        }catch(e){
          if(state.cancelled)break;
          const code=String(e?.code||"");
          const message=String(e?.message||"Falha na comunicação com Gemini.");
          diagnostic("Gemini: "+message+" ("+code+"). Não foi necessário utilizar WebGPU.");
          if(element("q-status"))element("q-status").textContent=message;
          if(bank.questions.length)show(bank,key,"Gemini",Math.max(1,acceptedThisRound),target);
          toast(message);
          return {ok:false,code,message};
        }
        if(!Array.isArray(response?.questions)){
          diagnostic("Resposta do servidor fora do formato esperado.");
          break;
        }
        bank.cursor++;
        let additions=0;
        for(const raw of response.questions){
          const item=accept(raw,unit,fmt,level,bank);
          if(item){bank.questions.push(item);additions++;acceptedThisRound++;}
          else bank.rejected++;
          if(acceptedThisRound>=desired||bank.questions.length>=target)break;
        }
        save(key,bank);
        if(response.quota&&element("q-ai-compat")){
          element("q-ai-compat").textContent="Gemini conectado · cota de chamadas restante: "+
            String(response.quota.userRemaining??"?")+" por usuário / "+String(response.quota.globalRemaining??"?")+" geral.";
        }
        if(!additions && bank.cursor>=source.length*3)break;
        await new Promise(resolve=>setTimeout(resolve,20));
      }
      if(bank.questions.length)show(bank,key,"Gemini",Math.max(1,acceptedThisRound),target);
      const note=state.cancelled?"Geração interrompida.":
        bank.questions.length>=target?"Meta acumulada atingida.":
        acceptedThisRound?"Lote Gemini concluído. Use Gerar mais para continuar.":
        "Não foram recebidas questões novas e verificáveis neste recorte. Tente uma lei integral ou outro nível.";
      report(note+" "+bank.questions.length+"/"+target+" armazenadas.",bank.questions.length/target);
      if(element("q-status"))element("q-status").textContent=note+" "+
        acceptedThisRound+" novas questões neste lote.";
      if(element("q-coverage"))element("q-coverage").textContent="Banco Gemini: "+bank.questions.length+
        " questões · "+bank.rejected+" rejeitadas por auditoria estrutural. Confirme a interpretação jurídica.";
      if(!bank.questions.length)diagnostic("Nenhuma questão foi validada. O Gemini pode estar indisponível ou o texto pode não sustentar a geração.");
      return {ok:bank.questions.length>0,count:acceptedThisRound,total:bank.questions.length};
    }finally{
      save(key,bank);
      current=null;
      controls.forEach((id,i)=>{if(element(id))element(id).disabled=prior[i];});
      element("q-ai-stop")?.classList.add("hidden");
      host().saveSession();
    }
  }
  root.PMDFQuestionAI=Object.freeze({start,stop,reset,prepare,checkCompatibility,status:()=>({running:!!current})});
})(window);
