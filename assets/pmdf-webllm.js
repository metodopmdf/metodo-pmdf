/* Método PMDF · WebLLM local (navegador). Sem backend, API key ou IA paga.
 * WebLLM: Apache-2.0. A primeira ativação requer internet para baixar os pesos.
 * Módulo carregado sob demanda: nenhum modelo é baixado ao abrir a página.
 */
(function (root) {
    'use strict';
    const CDN = 'https://esm.run/@mlc-ai/web-llm@0.2.87';
    const MODELS = Object.freeze([
        { id:'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',label:'Leve · Qwen 0,5B',vramMB:1061,f16:false,quality:'limitada' },
        { id:'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',label:'Equilibrado · Qwen 1,5B',vramMB:1630,f16:true,quality:'intermediária' },
        { id:'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',label:'Compatível · Qwen 1,5B',vramMB:1889,f16:false,quality:'intermediária' },
        { id:'Qwen2.5-3B-Instruct-q4f16_1-MLC',label:'Avançado · Qwen 3B',vramMB:2505,f16:true,quality:'melhor, maior consumo' }
    ]);
    let modulePromise=null,engine=null,loadedId=null,loading=null,active=false;
    function modelInfo(id){return MODELS.find(m=>m.id===id)||null;}
    async function compatibility(){
        if(root.isSecureContext===false)return {ok:false,reason:'É necessário acessar o site por HTTPS.'};
        if(!root.navigator?.gpu?.requestAdapter)return {ok:false,reason:'WebGPU indisponível neste navegador ou dispositivo.'};
        try{
            const adapter=await root.navigator.gpu.requestAdapter({powerPreference:'high-performance'});
            if(!adapter)return {ok:false,reason:'Nenhuma GPU compatível com WebGPU foi encontrada.'};
            return {ok:true,f16:!!adapter.features?.has('shader-f16'),maxBufferSize:adapter.limits?.maxBufferSize||null};
        }catch(e){return {ok:false,reason:'Não foi possível inicializar WebGPU: '+String(e?.message||e)};}
    }
    async function load(modelId,progress){
        const item=modelInfo(modelId);
        if(!item)throw Error('Modelo não autorizado pela plataforma.');
        const gpu=await compatibility();
        if(!gpu.ok)throw Error(gpu.reason);
        if(item.f16&&!gpu.f16)throw Error('Esta GPU não aceita shader-f16. Selecione o modelo Compatível ou Leve.');
        if(engine&&loadedId===modelId)return engine;
        if(loading){
            await loading;
            if(engine&&loadedId===modelId)return engine;
            return load(modelId,progress);
        }
        loading=(async()=>{
            const api=await (modulePromise||(modulePromise=import(CDN).catch(e=>{modulePromise=null;throw e;})));
            if(!api.prebuiltAppConfig?.model_list?.some(m=>m.model_id===modelId))
                throw Error('O modelo selecionado não está listado na versão instalada do WebLLM.');
            if(engine){await engine.unload();engine=null;loadedId=null;}
            const newEngine=await api.CreateMLCEngine(modelId,{
                initProgressCallback: info=>{
                    const n=Number(info?.progress);
                    progress?.({text:String(info?.text||'Preparando modelo...'),progress:Number.isFinite(n)?Math.max(0,Math.min(1,n)):null});
                }
            });
            engine=newEngine;loadedId=modelId;
            return engine;
        })();
        try{return await loading;}finally{loading=null;}
    }
    async function generate(messages,config){
        if(!engine||!loadedId)throw Error('Carregue um modelo de IA antes de gerar questões.');
        if(active)throw Error('A IA já está gerando um lote.');
        active=true;
        try{
            const result=await engine.chat.completions.create({
                messages,model:loadedId,response_format:{type:'json_object'},
                temperature:config?.temperature??0.35,top_p:0.9,
                max_tokens:config?.max_tokens??1536
            });
            const raw=result?.choices?.[0]?.message?.content;
            if(!raw||typeof raw!=='string')throw Error('A IA não retornou conteúdo textual utilizável.');
            return {text:raw,finishReason:result?.choices?.[0]?.finish_reason||null};
        }finally{active=false;}
    }
    function interrupt(){
        try{engine?.interruptGenerate?.();}catch(_){}
    }
    function status(){return {loadedId,active,loading:!!loading};}
    root.PMDFWebLLM=Object.freeze({MODELS,compatibility,load,generate,interrupt,status,modelInfo});
})(window);
