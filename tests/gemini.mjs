import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const client=readFileSync(new URL("../assets/pmdf-question-ai.js",import.meta.url),"utf8");
const backend=readFileSync(new URL("../supabase/functions/gemini-questions/index.ts",import.meta.url),"utf8");
const sql=readFileSync(new URL("../supabase/migrations/202611030001_gemini_quota.sql",import.meta.url),"utf8");
assert(html.includes('id="q-engine-gemini"'));assert(html.includes('selected value="gemini"'));
assert(!html.includes("assets/pmdf-webllm.js"));assert(!html.includes("x-goog-api-key"));
assert(sql.includes("pg_advisory_xact_lock"));
new Function("window",client);new Function("Deno","Response","fetch","AbortSignal","setTimeout","clearTimeout","console",backend);
const law="Art. 1º A Administração deverá registrar os atos e motivar as decisões, garantindo transparência e observância da competência legal da autoridade pública responsável pelo procedimento.";
function item(fmt,i,text){
  return {statement:fmt==="CE"?
    "A autoridade administrativa deverá motivar decisões e registrar os atos em documentos públicos conforme a regra estabelecida no artigo "+i+".":
    "Considerando a regra da fonte fornecida, qual alternativa corresponde à obrigação administrativa de registro e motivação prevista no artigo "+i+"?",
    evidence:text.slice(0,80),answer:fmt==="CE"?"C":"B",explanation:"O dispositivo impõe expressamente motivação dos atos e registro documental com respeito à competência da autoridade pública.",
    topic:"Atos administrativos",subtopic:"Motivação",options:fmt==="MC"?
    ["Os atos públicos ficam integralmente sem registros.","A autoridade documenta e motiva as decisões.","A competência deixa de ser requisito legal.","A transparência é vedada em todas as decisões."]:[],
    optionAnalysis:fmt==="MC"?["Contraria o registro expresso.","É a regra documental correta.",
      "Contraria a exigência de competência.","Contraria a transparência prevista."]:[]
  };
}
const env={GEMINI_ENABLED:"true",GEMINI_API_KEY:"private-gemini-test",SUPABASE_URL:"https://example.supabase.co",SUPABASE_SERVICE_ROLE_KEY:"service-key"};
function server(flags={}){
  let handler,calls=0;
  const mock=async (url,options)=>{
    url=String(url);
    if(url.includes("/auth/v1/user"))return Response.json(flags.noAuth?{}:{id:"11111111-2222-4333-8444-555555555555"},{status:flags.noAuth?401:200});
    if(url.includes("/rpc/pmdf_consume_gemini_quota"))return Response.json(flags.noQuota?{error:"not ready"}:
      flags.limit?{allowed:false}:{allowed:true,user_remaining:18,global_remaining:70},
      {status:flags.noQuota?404:200});
    if(url.includes("generativelanguage.googleapis.com")){
      calls++;assert.equal(options.headers["x-goog-api-key"],env.GEMINI_API_KEY);
      if(flags.provider429)return Response.json({message:"exhausted"},{status:429});
      const body=JSON.parse(options.body);
      const fmt=body.contents[0].parts[0].text.includes("MÚLTIPLA ESCOLHA")?"MC":"CE";
      return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({questions:[item(fmt,calls,law)]})}]}}]});
    }
    throw Error("unexpected URL "+url);
  };
  vm.runInNewContext(backend,{Deno:{env:{get:k=>flags.off&&k==="GEMINI_ENABLED"?"false":env[k]},serve:fn=>handler=fn},
    fetch:mock,Response,AbortController,AbortSignal,setTimeout,clearTimeout,console});
  const request=async (payload,method="POST",origin="https://metodopmdf.github.io")=>handler(
    new Request("https://example.supabase.co/functions/v1/gemini-questions",{
      method,headers:{"origin":origin,"authorization":"Bearer token.with.periods_and_sufficient_length"},
      body:method==="POST"?JSON.stringify(payload):undefined
    }));
  return {request,get calls(){return calls;}};
}
const payload={format:"CE",level:"intermediario",count:4,source:{title:"Regulamento QA",article:"Art. 1º",text:law}};
const good=server();
assert.equal((await good.request(payload)).status,200);
assert.equal((await (await good.request({...payload,format:"MC"})).json()).questions[0].options.length,4);
assert.equal(good.calls,2);
assert.equal((await good.request(null,"GET")).status,200);
assert.equal((await good.request(null,"GET","https://wrong.example")).status,403);
assert.equal((await server({off:true}).request(payload)).status,503);
assert.equal((await server({noAuth:true}).request(payload)).status,401);
const noQuota=server({noQuota:true});assert.equal((await noQuota.request(payload)).status,503);assert.equal(noQuota.calls,0);
const limit=server({limit:true});assert.equal((await limit.request(payload)).status,429);assert.equal(limit.calls,0);
assert.equal((await server({provider429:true}).request(payload)).status,429);
function harness(fmt){
  const fields=new Map(),storage=new Map(),memory={},seen=[];
  const def={"q-ai-backend":"gemini","q-source":"current","q-format":fmt,
    "q-level":"intermediario","q-board":"Cebraspe","q-ai-target":"30"};
  const $=key=>{if(!fields.has(key))fields.set(key,{value:def[key]||"",disabled:false,textContent:"",
    style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){}});return fields.get(key);};
  let n=0;
  const host={$,
    user:()=>({username:"qa"}),level:x=>x,hash:s=>[...String(s)].reduce((v,c)=>(v*31+c.charCodeAt(0))|0,0),
    guides:()=>[{lawName:"Regulamento",articlesMapping:{highIncidence:[],mediumIncidence:[],lowIncidence:[]}}],
    sourceUnits:()=>Array.from({length:8},(_,i)=>({law:"Regulamento",article:"Art. "+i,text:law})),
    memory,store:{get:k=>storage.get(k),set:(k,v)=>{storage.set(k,v);return true;},del:k=>storage.delete(k)},
    toast:(text,kind)=>seen.push({text,kind}),saveSession(){},validateItem:q=>q.statement.length>=55,
    setQuestions:(items,model,key,engine,total,target)=>host.last={items,model,key,engine,total,target},
    safe:async()=>{host.safeCalled=true;return {ok:true};},
    healthGemini:async()=>({available:true}),
    requestGemini:async ({format,count,source})=>({
      questions:Array.from({length:count},()=>item(format,++n,source.text)),
      quota:{userRemaining:12,globalRemaining:70}
    })
  };
  const win={PMDFQuestionHost:host};new Function("window",client)(win);return {host,win,$,seen};
}
const ce=harness("CE");await ce.win.PMDFQuestionAI.start();
assert(ce.host.last?.items.length>=6);assert(ce.host.last.items.every(q=>q.origin==="gemini"&&q.answer==="C"));
await ce.win.PMDFQuestionAI.start(true);assert(ce.host.last.total>=ce.host.last.items.length);
const mc=harness("MC");await mc.win.PMDFQuestionAI.start();
assert(mc.host.last.items.every(q=>q.options.length===4&&q.answer==="B"));
const safe=harness("CE");safe.$("q-ai-backend").value="safe";await safe.win.PMDFQuestionAI.start();assert(safe.host.safeCalled);
const failed=harness("CE");failed.host.requestGemini=async()=>{const e=Error("Cota do Gemini atingida");e.code="GEMINI_RATE_LIMIT";throw e;};
assert.equal((await failed.win.PMDFQuestionAI.start()).ok,false);
assert(!failed.host.safeCalled,"Não mascarar falha da API como questões geradas pelo Gemini");
console.log("PASSOU: gateway Gemini, segredo privado, JWT, cotas, retorno JSON CE/MC, limite de API, simulador e modo seguro.");
