// QA WebLLM sem baixar pesos: valida integração, JSON, origem e deduplicação.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const engineText=readFileSync(new URL('../assets/pmdf-webllm.js',import.meta.url),'utf8');
const controllerText=readFileSync(new URL('../assets/pmdf-question-ai.js',import.meta.url),'utf8');
assert(index.includes('assets/pmdf-webllm.js'),'Script WebLLM não registrado');
assert(index.includes('assets/pmdf-question-ai.js'),'Controlador de IA não registrado');
assert(index.includes('id="q-ai-settings"'),'Interface IA ausente');
assert(index.includes('id="q-engine-local"')&&index.includes('id="q-engine-webllm"'),'Alternância de motores ausente');
assert(index.includes('selected value="SmolLM2-360M-Instruct-q4f16_1-MLC"'),'Modelo experimental menor deve ser selecionado');
assert(index.includes('id="q-ai-backend"'),'Seletor de processamento seguro não encontrado');
assert(index.includes('selected value="safe"'),'Geração sem GPU deve ser o padrão');
assert(engineText.includes('CreateWebWorkerMLCEngine')&&!engineText.includes('api.CreateMLCEngine('),'A inferência não pode executar na thread principal');
assert(engineText.includes('worker?.terminate'),'O motor precisa liberar o Worker ao interromper');
assert(readFileSync(new URL('../assets/pmdf-webllm-worker.js',import.meta.url),'utf8').includes('WebWorkerMLCEngineHandler'),'Handler do Worker ausente');
new Function('window',engineText);
new Function('window',controllerText);
const pageScript=[...index.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1];
new Function(pageScript);

const win={isSecureContext:true,Worker:function(){},navigator:{gpu:{requestAdapter:async()=>({
  features:new Set(['shader-f16']),limits:{maxBufferSize:2**30}
})}}};
new Function('window',engineText)(win);
assert.equal(win.PMDFWebLLM.MODELS.length,4,'Seleção de modelos não disponível');
assert(win.PMDFWebLLM.modelInfo('Qwen2.5-1.5B-Instruct-q4f16_1-MLC'));
assert.equal((await win.PMDFWebLLM.compatibility()).ok,true);
const noGpu={navigator:{},Worker:function(){},isSecureContext:true};
new Function('window',engineText)(noGpu);
assert.equal((await noGpu.PMDFWebLLM.compatibility()).ok,false);

function makeHarness(format='CE',gpu=true){
  const map=new Map(),storeMap=new Map(),memory={},seen=[];
  const values={
    'q-source':'current','q-format':format,'q-level':'intermediario','q-board':'Cebraspe',
    'q-ai-target':'30','q-ai-model':'Qwen2.5-1.5B-Instruct-q4f16_1-MLC','q-ai-backend':'experimental'
  };
  const find=id=>{
    if(!map.has(id))map.set(id,{value:values[id]??'',disabled:false,textContent:'',innerHTML:'',style:{},
      classList:{add(){},remove(){},toggle(){}},setAttribute(){}});
    return map.get(id);
  };
  const hash=s=>[...String(s)].reduce((h,c)=>(h*31+c.charCodeAt(0))|0,0);
  const source=Array.from({length:12},(_,i)=>({
    law:'Norma fictícia integral',article:'Art. '+(i+1),
    text:'O procedimento administrativo '+(i+1)+' exige motivação expressa, registro documental e observância da competência da autoridade. A decisão deve garantir o direito do interessado à informação e ao contraditório.'
  }));
  const h={$:find,user:()=>({username:'qa'}),guides:()=>[{lawName:'Norma fictícia integral'}],
    sourceUnits:()=>source,hash,level:x=>x,rubric:()=> 'PROMPT MESTRE\n1. Extraia questões válidas\n--- MATERIAL DISPONÍVEL ---',
    validateItem:q=>q.statement.length>=56&&q.type==='CE'||(q.type==='MC'&&q.options.length===4),
    store:{get:k=>storeMap.get(k)||null,set:(k,v)=>{storeMap.set(k,String(v));return true;}},
    bankKey:(g,f,l)=>'qa:'+f+':'+l,memory,toast:(m,type)=>seen.push({m,type}),
    setQuestions:(items,model,key)=>{h.result={items,model,key};},
    safe:async(more,reason)=>{h.safeCalls=(h.safeCalls||0)+1;h.lastSafe={more,reason};return 'seguro';},
    saveSession:()=>{}
  };
  const win={PMDFQuestionHost:h};
  let runs=0,modelLoads=0;
  win.PMDFWebLLM={
    compatibility:async()=>({ok:gpu,f16:gpu,reason:'WebGPU indisponível'}),
    load:async(_id,cb)=>{modelLoads++;cb({progress:1,text:'Modelo pronto'});},
    interrupt(){},
    async generate(messages){
      runs++;
      const excerpt=messages[1].content.split('\n').at(-1);
      const wordsets=['formalidade','legalidade','motivação','competência','documentação','revisão','publicidade','eficiência','motivação','proporcionalidade'];
      const questions=Array.from({length:format==='CE'?5:3},(_,i)=>{
        const serial=runs*10+i, unique=wordsets[(serial+i)%wordsets.length];
        const aspects=Array.from({length:7},(_,n)=>'elemento'+serial+'fase'+n).join(' ');
        return {
          statement:'No procedimento administrativo simulado nº '+serial+', os tópicos '+aspects+' e a avaliação da '+unique+
            ' pressupõem registro adequado dos fatos e consideração da competência da autoridade que decide o pedido de maneira fundamentada.',
          evidence:excerpt.slice(0,83).trim(),
          answer:format==='CE'?'C':'B',
          explanation:'O trecho-fonte estabelece exigências expressas de motivação, registro documental e competência da autoridade responsável.',
          subtopic:'Requisitos do procedimento',
          ...(format==='MC'?{
            options:['A norma afasta totalmente os registros do procedimento.',
              'A autoridade deve cumprir os requisitos documentais mencionados na fonte.',
              'O procedimento elimina todas as obrigações de motivação exigidas.',
              'A competência é sempre livremente transferível a qualquer cidadão.'],
            optionAnalysis:[
              'Incorreta: contraria o dever de registro documental previsto na fonte.',
              'Correta: reproduz as condições documentais expressas no dispositivo.',
              'Incorreta: afasta a motivação que o dispositivo expressamente exige.',
              'Incorreta: inventa transferência de competência não prevista.'
            ]
          }:{})
        };
      });
      if(runs===1)questions.unshift({...questions[0],evidence:'Esta frase nunca esteve na fonte.'});
      return {text:JSON.stringify({questions})};
    }
  };
  new Function('window',controllerText)(win);
  return {h,win,find,storeMap,seen,get runs(){return runs;},get modelLoads(){return modelLoads;}};
}
const ce=makeHarness('CE');
await ce.win.PMDFQuestionAI.start(false);
assert.equal(ce.h.result?.items.length,6,'Primeira sessão leve CE deve limitar-se a 6 questões');
for(let round=0;round<4;round++)await ce.win.PMDFQuestionAI.start(true);
assert.equal(ce.h.result?.items.length,30,'Meta CE de 30 não atingida após sessões curtas');
assert(ce.h.result.items.every(q=>q.type==='CE'&&q.answer==='C'&&q.sourceQuote.length>16));
assert.equal(new Set(ce.h.result.items.map(q=>q.statement)).size,30,'Questões repetidas em CE');
assert(ce.h.result.items.every(q=>q.origin==='webllm-local'),'Origem local ausente');
const recorded=JSON.parse(ce.storeMap.values().next().value);
assert(recorded.rejected>=1,'Auditoria não rejeitou a evidência falsa');
const completedRuns=ce.runs;
await ce.win.PMDFQuestionAI.start(false);
assert.equal(ce.h.result?.items.length,30,'Retomada perdeu questões');
assert.equal(ce.runs,completedRuns,'Um banco já concluído não deve chamar o modelo novamente');

const mc=makeHarness('MC');
await mc.win.PMDFQuestionAI.start(false);
assert.equal(mc.h.result?.items.length,3,'Primeira sessão leve MC deve limitar-se a 3 questões');
for(let round=0;round<9;round++)await mc.win.PMDFQuestionAI.start(true);
assert.equal(mc.h.result?.items.length,30,'Meta MC de 30 não atingida após sessões curtas');
assert(mc.h.result.items.every(q=>q.type==='MC'&&q.options.length===4&&q.answer==='B'));
assert(mc.h.result.items.every(q=>q.optionAnalysis.length===4),'Comentários por alternativa ausentes');

const fail=makeHarness('CE',false);
await fail.win.PMDFQuestionAI.start(false);
assert.equal(fail.modelLoads,0,'Dispositivo incompatível não deve carregar modelo');
assert.equal(fail.h.safeCalls,1,'Dispositivo incompatível deve gerar por regras locais sem IA');


// Teste do serviço de inferência com fábrica WebLLM simulada: verifica que
// o cálculo fica no Worker, o limite de tokens e o cancelamento que libera a GPU.
let createdWorkers=0,terminatedWorkers=0,inferenceCalls=0,requestedTokens=0;
class FakeWorker {
  constructor(url,config){
    assert.equal(config.type,'module','O Worker deve ser do tipo module');
    assert(String(url).endsWith('/assets/pmdf-webllm-worker.js'),'Caminho do Worker incorreto');
    createdWorkers++;
  }
  addEventListener(){}
  terminate(){terminatedWorkers++;}
}
const tinyId='Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
const mockedAPI={
  prebuiltAppConfig:{model_list:[{model_id:tinyId}]},
  async CreateWebWorkerMLCEngine(worker,id,config){
    assert(worker instanceof FakeWorker);
    assert.equal(id,tinyId);
    config.initProgressCallback({progress:1,text:'Modelo de teste pronto'});
    return {chat:{completions:{async create(args){
      requestedTokens=args.max_tokens;inferenceCalls++;
      return {choices:[{message:{content:'{"questions":[]}'},finish_reason:'stop'}]};
    }}}};
  },
  CreateMLCEngine(){throw Error('Execução direta do modelo não autorizada');}
};
const virtualRoot={
  Worker:FakeWorker,isSecureContext:true,__TEST_API__:mockedAPI,
  document:{baseURI:'https://example.org/metodo-pmdf/'},
  navigator:{deviceMemory:8,gpu:{requestAdapter:async()=>({features:new Set(['shader-f16']),limits:{maxBufferSize:2**30}})}}
};
const isolatedEngine=engineText.replace('import(CDN)','Promise.resolve(root.__TEST_API__)');
assert.notEqual(isolatedEngine,engineText,'Não foi possível simular a importação do WebLLM');
new Function('window',isolatedEngine)(virtualRoot);
const service=virtualRoot.PMDFWebLLM;
await service.load(tinyId);
assert.equal(createdWorkers,1,'Modelo não foi carregado em Worker dedicado');
await service.generate([{role:'user',content:'Faça uma questão'}],{max_tokens:2000});
assert.equal(inferenceCalls,1);
assert(requestedTokens<=750,'Limite de geração por chamada não aplicado');
service.interrupt();
assert.equal(terminatedWorkers,1,'Interromper deve encerrar Worker e liberar recursos');
assert.equal(service.status().worker,false);
await assert.rejects(service.generate([],{}),'Após interromper, o modelo precisa ser recarregado');
const smallRAM={
  Worker:FakeWorker,isSecureContext:true,__TEST_API__:mockedAPI,
  document:{baseURI:'https://example.org/metodo-pmdf/'},
  navigator:{deviceMemory:2,gpu:{requestAdapter:async()=>({features:new Set(),limits:{}})}}
};
new Function('window',isolatedEngine)(smallRAM);
await assert.rejects(smallRAM.PMDFWebLLM.load(tinyId),/Memória insuficiente/);
assert.equal(createdWorkers,1,'Um dispositivo de 2 GB não deve abrir Worker de inferência');


const safe=makeHarness('CE');
safe.find('q-ai-backend').value='safe';
await safe.win.PMDFQuestionAI.start(false);
assert.equal(safe.h.safeCalls,1,'Modo seguro deve gerar questões sem GPU');
assert.equal(safe.modelLoads,0,'Modo seguro jamais deve baixar pesos de IA');
assert.equal(safe.runs,0,'Modo seguro não pode executar inferência generativa');
await safe.win.PMDFQuestionAI.checkCompatibility();
assert.match(safe.find('q-ai-compat').textContent,/sem GPU/i);

const mobile=makeHarness('MC');
mobile.find('q-ai-backend').value='experimental';
mobile.win.navigator={userAgent:'Mozilla/5.0 (Linux; Android 13; Mobile)'};
await mobile.win.PMDFQuestionAI.start(false);
assert.equal(mobile.h.safeCalls,1,'Android deve ser protegido por fallback automático');
assert.equal(mobile.modelLoads,0,'Android não deve executar inicialização de modelo');

let adapterRequests=0;
const mobileWebGPU={
  isSecureContext:true,Worker:function(){},
  navigator:{userAgent:'Mozilla/5.0 (Linux; Android 13; Mobile)',deviceMemory:12,
    gpu:{requestAdapter:async()=>{adapterRequests++;return {features:new Set(['shader-f16']),limits:{}};}}}
};
new Function('window',engineText)(mobileWebGPU);
assert.equal((await mobileWebGPU.PMDFWebLLM.compatibility()).ok,false);
assert.equal(adapterRequests,0,'A GPU de um Android não pode ser inicializada em modo seguro');

console.log('PASSOU: WebLLM em Worker, fallback automático padrão, sessões CE/MC de até 6/3, acumulação de 30 questões, evidência e fallback WebGPU.');
