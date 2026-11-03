"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const root=require("node:path").join(__dirname,"..");
const asset=fs.readFileSync(require("node:path").join(root,"assets/pmdf-neural-questions.js"),"utf8");
const html=fs.readFileSync(require("node:path").join(root,"index.html"),"utf8");
const sql=fs.readFileSync(require("node:path").join(root,"supabase/migrations/20261103_questoes_neurais.sql"),"utf8");
new Function(asset);
new Function(html.slice(html.lastIndexOf("<script>")+8,html.lastIndexOf("</script>")));
assert.match(html,/pmdf-neural-questions\.js/);
assert.doesNotMatch(html,/gemini/i);
assert.match(html,/id="q-neural-save"/);
assert.match(html,/id="q-neural-settings"/);
assert.match(sql,/enable row level security/i);
assert.match(sql,/to authenticated/);
assert.doesNotMatch(sql,/for insert\s+to anon/);
const fakeStorage=new Map();
const localStorage={getItem:k=>fakeStorage.get(k)||null,setItem:(k,v)=>fakeStorage.set(k,String(v)),removeItem:k=>fakeStorage.delete(k)};
const rootWindow={};
const api=new Function("window","localStorage","setTimeout",asset+";return window.PMDFNeuralQuestions;")(rootWindow,localStorage,fn=>fn());
const neural=api.testModel();
const textRows=Array.from({length:60},(_,i)=>({
  law:"Direito Administrativo",article:"Artigo "+(i+1),
  text:(i%3===0
    ?"A autoridade poderá rever os atos administrativos, observadas a competência legal e a motivação do respectivo procedimento."
    :i%3===1
    ?"É vedado exigir taxas para a emissão de certidões destinadas à defesa de direitos individuais, conforme a legislação aplicável."
    :"O interessado deve apresentar o recurso administrativo no prazo legal de 10 dias a contar da ciência da decisão motivada.")+
    " Regra específica número "+(i+1)+" define o objeto do estudo."
}));
for(const mode of ["APENAS_CE","ME_CORRETA","ME_INCORRETA","MISTO_IA"]){
  const result=neural.criarBanco(textRows,{formato:mode,disciplina:"Direito",assunto:"Atos"});
  assert.ok(result.questoes.length,mode+" deve gerar questões");
  if(mode==="MISTO_IA")assert.ok(result.questoes.length>100,"Texto extenso deve gerar mais de 100 questões mistas");
  for(const q of result.questoes){
    assert.ok(q.hash_unico&&q.enunciado&&q.gabarito);
    if(q.formato==="MULTIPLA_ESCOLHA"){
      assert.equal(q.alternativas.length,5);
      assert.equal(q.alternativas.filter(a=>a.correta).length,1);
      assert.equal(new Set(q.alternativas.map(a=>a.texto)).size,5);
      assert.equal(q.alternativas.find(a=>a.correta).letra,q.gabarito);
    }else assert.ok(["CERTO","ERRADO"].includes(q.gabarito));
  }
}
const fields={};
function el(id){return fields[id]||(fields[id]={value:"",textContent:"",disabled:false});}
el("q-source").value="current";el("q-format").value="MC";el("q-neural-command").value="correta";el("q-neural-target").value="30";
const cycle=new Map();let latest=[],persisted=[],calls=0;
rootWindow.PMDFNeuralQuestionHost={
  el,auth:()=>({username:"1d8ed87c-5a20-4cd0-9a17-924c91ae413e"}),
  guides:()=>[{lawName:"Direito Administrativo"}],sourceUnits:()=>textRows,hash:x=>x.length,
  store:{get:k=>cycle.get(k),set:(k,v)=>{cycle.set(k,String(v));return true;},del:k=>cycle.delete(k)},
  setQuestions:qs=>{latest=qs;calls++;},persist:async rows=>{persisted=rows;},toast:()=>{}
};
(async()=>{
  const a=await api.start(false),b=await api.start(true);
  assert.equal(a.ok,true);assert.equal(b.ok,true);assert.equal(a.count,30);assert.ok(b.count>0);
  assert.equal(calls,2);assert.ok(latest.every(q=>q.type==="MC"&&q.options.length===5));
  await api.save();
  assert.equal(persisted.length,latest.length);
  assert.ok(persisted.every(q=>q.publicada===false&&q.criado_por==="1d8ed87c-5a20-4cd0-9a17-924c91ae413e"));
  console.log("QA PASS: HTML, sintaxe, CE, MC correta/incorreta, misto >100, não repetição, lotes, RLS e payload Supabase.");
})().catch(e=>{console.error(e);process.exitCode=1;});
