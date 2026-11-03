/* Método PMDF · WebLLM leve.
 * Cálculo e memória do modelo isolados em um Web Worker dedicado.
 * Nenhum fallback para inferência na thread principal.
 */
(function(root){
  'use strict';
  const CDN='https://esm.run/@mlc-ai/web-llm@0.2.87';
  const MODELS=Object.freeze([
    {id:'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',label:'Leve · Qwen 0,5B',vramMB:1061,f16:false},
    {id:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',label:'Qwen 1,5B (GPU potente)',vramMB:1630,f16:true},
    {id:'SmolLM2-360M-Instruct-q4f16_1-MLC',label:'SmolLM2 360M · baixo consumo (qualidade limitada em português)',vramMB:377,f16:true},
    {id:'Qwen2.5-3B-Instruct-q4f16_1-MLC',label:'Qwen 3B (não recomendado)',vramMB:2505,f16:true}
  ]);
  let apiPromise=null,worker=null,engine=null,loadedId=null,loading=null,active=false,version=0;
  const pending=new Set();
  const modelInfo=id=>MODELS.find(x=>x.id===id)||null;
  async function compatibility(){
    if(root.isSecureContext===false)return {ok:false,reason:'A IA local exige conexão HTTPS.'};
    if(typeof root.Worker!=='function')return {ok:false,reason:'Este navegador não oferece Web Workers. Use o modo seguro.'};
    if(/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(String(root.navigator?.userAgent||'')))
      return {ok:false,mobile:true,reason:'Inferência WebGPU bloqueada em dispositivos móveis por segurança. O modo seguro gera questões sem GPU.'};
    const detectedMemory=Number(root.navigator?.deviceMemory)||null;
    if(detectedMemory&&detectedMemory<8)
      return {ok:false,memoryGB:detectedMemory,reason:'Memória insuficiente para IA generativa local com segurança. Use o modo seguro.'};
    if(!root.navigator?.gpu?.requestAdapter)return {ok:false,reason:'WebGPU indisponível. Use o modo seguro.'};
    try{
      const adapter=await root.navigator.gpu.requestAdapter({powerPreference:'low-power'});
      if(!adapter)return {ok:false,reason:'Nenhuma GPU WebGPU compatível foi encontrada.'};
      const memory=Number(root.navigator?.deviceMemory)||null;
      const mobile=/Android|iPhone|iPad|iPod|Mobile|Silk/i.test(String(root.navigator?.userAgent||''));
      return {ok:true,f16:!!adapter.features?.has('shader-f16'),memoryGB:memory,mobile,
        cores:Number(root.navigator?.hardwareConcurrency)||null,
        maxBufferSize:adapter.limits?.maxBufferSize||null};
    }catch(e){return {ok:false,reason:'Falha na verificação de GPU: '+String(e?.message||e)};}
  }
  function protect(promise){
    return new Promise((resolve,reject)=>{
      const cancel=error=>{pending.delete(cancel);reject(error);};
      pending.add(cancel);
      Promise.resolve(promise).then(x=>{pending.delete(cancel);resolve(x);},e=>{pending.delete(cancel);reject(e);});
    });
  }
  function unload(){
    version++;
    const error=Error('Processamento local interrompido; os itens aprovados permanecem salvos.');
    for(const cancel of [...pending])cancel(error);
    try{worker?.terminate?.();}catch(_){}
    worker=null;engine=null;loadedId=null;loading=null;active=false;
  }
  function assertCapacity(info,device){
    if(!device.ok)throw Error(device.reason);
    if(device.mobile)throw Error('IA generativa de GPU desativada em dispositivos móveis para prevenir travamentos. Utilize o modo automático seguro.');
    if(device.memoryGB&&device.memoryGB<8)throw Error('Para modelos generativos locais é necessário um computador com pelo menos 8 GB de RAM detectáveis. Utilize o modo automático seguro.');
    if(device.cores&&device.cores<4)throw Error('Dispositivo com poucos núcleos: utilize o modo automático seguro.');
    if(info.f16&&!device.f16)throw Error('A GPU não oferece shader-f16; escolha Qwen 0,5B ou utilize o modo seguro.');
    if(info.vramMB>=2500)throw Error('O modelo 3B foi desativado no modo leve devido ao risco de travamento.');
    if(!device.memoryGB&&info.vramMB>400)throw Error('Memória do computador não identificada. Utilize o modo automático ou um modelo experimental menor.');
  }
  async function load(id,progress){
    const info=modelInfo(id);if(!info)throw Error('Modelo inválido.');
    const device=await compatibility();assertCapacity(info,device);
    if(engine&&loadedId===id)return engine;
    if(loading){
      await loading;
      if(engine&&loadedId===id)return engine;
      return load(id,progress);
    }
    if(engine||worker)unload();
    const generation=version;
    loading=(async()=>{
      const api=await protect(apiPromise||(apiPromise=import(CDN).catch(e=>{apiPromise=null;throw e;})));
      if(version!==generation)throw Error('Inicialização cancelada.');
      if(!api.prebuiltAppConfig?.model_list?.some(m=>m.model_id===id))
        throw Error('Este modelo não está disponível nesta versão do WebLLM.');
      const url=new URL('assets/pmdf-webllm-worker.js',root.document?.baseURI||root.location?.href);
      worker=new root.Worker(url,{type:'module',name:'pmdf-webllm'});
      worker.addEventListener?.('error',()=>unload());
      worker.addEventListener?.('messageerror',()=>unload());
      const created=api.CreateWebWorkerMLCEngine(worker,id,{
        initProgressCallback:p=>{
          if(version!==generation)return;
          const n=Number(p?.progress);
          progress?.({text:String(p?.text||'Carregando pesos da IA...'),
            progress:Number.isFinite(n)?Math.max(0,Math.min(1,n)):null});
        }
      });
      const result=await protect(created);
      if(version!==generation)throw Error('Inicialização cancelada.');
      engine=result;loadedId=id;
      return result;
    })();
    const inFlight=loading;
    try{return await inFlight;}
    catch(e){if(version===generation)unload();throw e;}
    finally{if(loading===inFlight)loading=null;}
  }
  async function generate(messages,config){
    if(!engine||!loadedId)throw Error('Carregue um modelo antes de gerar questões.');
    if(active)throw Error('Uma questão já está sendo elaborada.');
    active=true;
    try{
      const result=await protect(engine.chat.completions.create({
        messages,response_format:{type:'json_object'},model:loadedId,
        max_tokens:Math.min(750,Math.max(96,Number(config?.max_tokens)||480)),
        temperature:config?.temperature??0.25,top_p:0.85
      }));
      const output=result?.choices?.[0]?.message?.content;
      if(typeof output!=='string'||!output.trim())throw Error('A IA não retornou texto aproveitável.');
      return {text:output,finishReason:result.choices[0]?.finish_reason||null};
    }finally{active=false;}
  }
  // Cancelamento forte: encerra o Web Worker e libera sua memória. Nova geração
  // exige carregar novamente o modelo (o download costuma estar em cache).
  function interrupt(){unload();}
  function status(){return {loadedId,active,loading:!!loading,worker:!!worker};}
  root.PMDFWebLLM=Object.freeze({MODELS,compatibility,load,generate,interrupt,status,modelInfo});
})(window);
