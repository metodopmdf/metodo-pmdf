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
new Function('window',engineText);
new Function('window',controllerText);
const pageScript=[...index.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].at(-1)[1];
new Function(pageScript);

const win={isSecureContext:true,navigator:{gpu:{requestAdapter:async()=>({
  features:new Set(['shader-f16']),limits:{maxBufferSize:2**30}
})}}};
new Function('window',engineText)(win);
assert.equal(win.PMDFWebLLM.MODELS.length,4,'Seleção de modelos não disponível');
assert(win.PMDFWebLLM.modelInfo('Qwen2.5-1.5B-Instruct-q4f16_1-MLC'));
assert.equal((await win.PMDFWebLLM.compatibility()).ok,true);
const noGpu={navigator:{},isSecureContext:true};
new Function('window',engineText)(noGpu);
assert.equal((await noGpu.PMDFWebLLM.compatibility()).ok,false);

function makeHarness(format='CE',gpu=true){
  const map=new Map(),storeMap=new Map(),memory={},seen=[];
  const values={
    'q-source':'current','q-format':format,'q-level':'intermediario','q-board':'Cebraspe',
    'q-ai-target':'30','q-ai-model':'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'
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
      if(runs===1)questions.push({...questions[0],evidence:'Esta frase nunca esteve na fonte.'});
      return {text:JSON.stringify({questions})};
    }
  };
  new Function('window',controllerText)(win);
  return {h,win,find,storeMap,seen,get runs(){return runs;},get modelLoads(){return modelLoads;}};
}
const ce=makeHarness('CE');
await ce.win.PMDFQuestionAI.start(false);
assert.equal(ce.h.result?.items.length,30,'Meta CE de 30 não atingida');
assert(ce.h.result.items.every(q=>q.type==='CE'&&q.answer==='C'&&q.sourceQuote.length>16));
assert.equal(new Set(ce.h.result.items.map(q=>q.statement)).size,30,'Questões repetidas em CE');
assert(ce.h.result.items.every(q=>q.origin==='webllm-local'),'Origem local ausente');
const recorded=JSON.parse(ce.storeMap.values().next().value);
assert(recorded.rejected>=1,'Auditoria não rejeitou a evidência falsa');
await ce.win.PMDFQuestionAI.start(false);
assert.equal(ce.h.result?.items.length,30,'Retomada perdeu questões');
assert.equal(ce.runs,6,'Um banco já concluído não deve chamar o modelo novamente');

const mc=makeHarness('MC');
await mc.win.PMDFQuestionAI.start(false);
assert.equal(mc.h.result?.items.length,30,'Meta MC de 30 não atingida');
assert(mc.h.result.items.every(q=>q.type==='MC'&&q.options.length===4&&q.answer==='B'));
assert(mc.h.result.items.every(q=>q.optionAnalysis.length===4),'Comentários por alternativa ausentes');

const fail=makeHarness('CE',false);
await fail.win.PMDFQuestionAI.start(false);
assert.equal(fail.modelLoads,0,'Dispositivo incompatível não deve carregar modelo');
assert.equal(fail.h.result,undefined,'Dispositivo incompatível não pode gerar questões');

console.log('PASSOU: módulo WebLLM, escolha de modelos, geração mock CE/MC, meta de 30, descarte de evidência falsa, recuperação do banco e fallback WebGPU.');
