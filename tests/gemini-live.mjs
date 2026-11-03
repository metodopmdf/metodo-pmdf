/* Teste ponta a ponta opcional: login Supabase real + 1 chamada Gemini real.
 * Necessita conta de teste e backend ATIVADO; não armazena credenciais.
 */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const user=process.env.PMDF_GEMINI_QA_USER;
const password=process.env.PMDF_GEMINI_QA_PASSWORD;
if(!user||!password)throw Error("Credenciais de QA Gemini não informadas.");
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const publicKey=html.match(/const SB_KEY='([^']+)'/)?.[1];
assert(publicKey,"Chave publicável Supabase não encontrada no site.");
const url="https://wskuhkvgipqwykbnuspk.supabase.co";
const origin="https://metodopmdf.github.io";
const email=user.trim().toLowerCase()+"@users.metodopmdf.invalid";
const auth=await fetch(url+"/auth/v1/token?grant_type=password",{
  method:"POST",headers:{apikey:publicKey,"Content-Type":"application/json"},
  body:JSON.stringify({email,password})
});
if(!auth.ok)throw Error("Login QA Supabase não autorizado (HTTP "+auth.status+").");
const session=await auth.json();
assert(session.access_token,"Sessão autenticada não retornou token.");
const functionUrl=url+"/functions/v1/gemini-questions";
const health=await fetch(functionUrl,{headers:{apikey:publicKey,Origin:origin}});
assert.equal(health.status,200,"Função Gemini não implantada.");
const state=await health.json();
assert(state.available===true,"Gemini ainda não ativado no servidor.");
const text=[
  "Art. 1º O órgão público deve registrar os atos administrativos praticados em procedimento formal.",
  "Parágrafo único. A autoridade competente deve justificar suas decisões e assegurar a transparência dos documentos.",
  "Art. 2º A justificativa deve identificar os fatos analisados e os fundamentos da decisão administrativa.",
  "Art. 3º O acesso aos registros é assegurado, observadas as hipóteses de restrição expressamente previstas no documento."
].join("\n");
const response=await fetch(functionUrl,{
  method:"POST",headers:{apikey:publicKey,Authorization:"Bearer "+session.access_token,
    Origin:origin,"Content-Type":"application/json"},
  body:JSON.stringify({format:"CE",level:"intermediario",board:"Cebraspe",count:2,
    source:{title:"Regulamento fictício de QA",article:"Arts. 1º a 3º",text}})
});
const output=await response.json().catch(()=>({}));
if(!response.ok)throw Error("Gateway Gemini real falhou: HTTP "+response.status+" "+String(output.code||output.message||""));
assert(Array.isArray(output.questions)&&output.questions.length>=1,"Gemini não retornou questões verificáveis.");
for(const q of output.questions){
  assert(["C","E"].includes(q.answer),"Gabarito inválido.");
  assert(q.statement.length>=55&&q.explanation.length>=35);
  assert(text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ")
    .includes(q.evidence.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()),
    "Evidência não vinculada ao texto.");
}
console.log("PASSOU: Gemini REAL no Supabase autenticado, "+output.questions.length+
  " questão(ões) C/E com fonte verificável; modelo "+state.model+". Uma chamada de cota foi consumida.");
