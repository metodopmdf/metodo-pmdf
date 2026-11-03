// Método PMDF — Gateway seguro Gemini. Deno / Supabase Edge Functions.
// Nunca coloque GEMINI_API_KEY em arquivos publicados no GitHub Pages.
const ORIGINS = new Set([
  "https://metodopmdf.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173"
]);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const ENABLED = Deno.env.get("GEMINI_ENABLED") === "true";
const ALLOWED_MODELS = new Set(["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.8-flash"]);
const configuredModel = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
const MODEL = ALLOWED_MODELS.has(configuredModel) ? configuredModel : "gemini-3.5-flash-lite";
function secretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    return keys.default || Object.values(keys)[0] || "";
  } catch (_) { return ""; }
}
const ADMIN_KEY = secretKey();
function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : "https://metodopmdf.github.io",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
}
function reply(status, data, origin, extras = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(origin), ...extras } });
}
function norm(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function clamp(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback;
}
function validateResult(item, sourceText, format) {
  if (!item || typeof item !== "object") return null;
  const statement = String(item.statement || "").replace(/\s+/g, " ").trim();
  const evidence = String(item.evidence || "").replace(/\s+/g, " ").trim();
  const explanation = String(item.explanation || "").replace(/\s+/g, " ").trim();
  const answer = String(item.answer || "").trim().toUpperCase();
  if (statement.length < 55 || statement.length > 1300 ||
      explanation.length < 35 || explanation.length > 3000 ||
      evidence.length < 16 || evidence.length > 400 ||
      !norm(sourceText).includes(norm(evidence))) return null;
  const options = format === "MC" && Array.isArray(item.options)
    ? item.options.map(x => String(x || "").replace(/^[A-E]\s*[).:\-]\s*/i, "").trim()) : [];
  const optionAnalysis = format === "MC" && Array.isArray(item.optionAnalysis)
    ? item.optionAnalysis.map(x => String(x || "").trim()) : [];
  if (format === "CE" && !["C", "E"].includes(answer)) return null;
  if (format === "MC" && (
      ![4,5].includes(options.length) || optionAnalysis.length !== options.length ||
      !("ABCDE".slice(0, options.length).includes(answer)) ||
      options.some(x => x.length < 12 || x.length > 550) ||
      new Set(options.map(norm)).size !== options.length ||
      optionAnalysis.some(x => x.length < 12 || x.length > 1000)
    )) return null;
  return { statement, evidence, explanation, answer, options, optionAnalysis,
    topic: String(item.topic || "Trecho da lei").slice(0,120),
    subtopic: String(item.subtopic || "").slice(0,120) };
}
const QUESTION = {
  type:"object",
  properties:{
    statement:{type:"string"},
    answer:{type:"string"},
    explanation:{type:"string"},
    evidence:{type:"string"},
    topic:{type:"string"},
    subtopic:{type:"string"},
    options:{type:"array",items:{type:"string"}},
    optionAnalysis:{type:"array",items:{type:"string"}}
  },
  required:["statement","answer","explanation","evidence","topic","subtopic","options","optionAnalysis"]
};
const OUTPUT = {
  type:"object",
  properties:{questions:{type:"array",items:QUESTION}},
  required:["questions"]
};
async function authenticatedUser(jwt) {
  if (!SUPABASE_URL || !ADMIN_KEY) throw Error("SERVER_CONFIGURATION");
  const response = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers:{ "apikey": ADMIN_KEY, "Authorization": "Bearer " + jwt },
    signal:AbortSignal.timeout(9000)
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" && /^[a-f0-9-]{36}$/i.test(user.id) ? user.id : null;
}
async function consumeQuota(userId) {
  const perUser = clamp(Deno.env.get("GEMINI_USER_DAILY_LIMIT"), 20, 1, 200);
  const globalLimit = clamp(Deno.env.get("GEMINI_GLOBAL_DAILY_LIMIT"), 80, 1, 1000);
  const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/pmdf_consume_gemini_quota", {
    method:"POST",
    headers:{ "apikey": ADMIN_KEY, "Authorization":"Bearer " + ADMIN_KEY,
      "Content-Type":"application/json" },
    body:JSON.stringify({p_user_id:userId,p_user_limit:perUser,p_global_limit:globalLimit}),
    signal:AbortSignal.timeout(10000)
  });
  if (!response.ok) throw Error("QUOTA_NOT_CONFIGURED");
  const data = await response.json();
  if (!data || typeof data.allowed !== "boolean") throw Error("QUOTA_NOT_CONFIGURED");
  return data;
}
function makePrompt(source, format, difficulty, board, count, emphasis, exclude) {
  const type = format === "CE"
    ? "Elabore assertivas de CERTO/ERRADO; answer deve ser somente C ou E; options e optionAnalysis devem ser listas vazias."
    : "Elabore questões de MÚLTIPLA ESCOLHA com quatro ou cinco alternativas plausíveis e UMA ÚNICA correta; answer deve ser uma letra; explique cada opção no campo optionAnalysis.";
  return [
    "Você é uma banca examinadora especializada, com domínio técnico de elaboração de questões jurídicas brasileiras.",
    "Estilo metodológico: " + board + " (sem copiar provas oficiais nem alegar vínculo com a banca).",
    "Fonte única: " + source.title + " — " + source.article + ".",
    "Nível: " + difficulty + ". Abordagem: " + emphasis + ".",
    "Gere ATÉ " + count + " questões inéditas, independentes e cognitivamente distintas.",
    type,
    "Mapeie literalidade, requisitos, condições, exceções, competências, consequências, prazos e casos hipotéticos SOMENTE quando houver fundamento explícito no trecho.",
    "Não crie dispositivos, jurisprudência, datas ou sanções que não constem do texto. Evite ambiguidade e distratores com dupla correção.",
    "Cada item precisa conter statement, answer, explanation, evidence, topic, subtopic, options e optionAnalysis.",
    "O campo evidence deve COPIAR LITERALMENTE 16 a 400 caracteres consecutivos do trecho, sem alterar palavras.",
    "Explique precisamente o elemento que torna a assertiva certa ou errada. Em múltipla escolha explique separadamente a correta e todas as incorretas.",
    "Reveja cada questão como examinador, revisor de gabarito e auditor de fonte. Elimine redundâncias ou itens inseguros; gere menos quando necessário.",
    "Não repita esses tópicos já cobrados: " + exclude.join(" | "),
    "Trecho de referência:\n" + source.text
  ].join("\n\n");
}
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") return new Response(null, {status:204,headers:cors(origin)});
  if (!ORIGINS.has(origin)) return reply(403,{code:"ORIGIN_DENIED",message:"Origem não autorizada."},origin);
  if (req.method === "GET") return reply(200,{
    available:ENABLED && Boolean(API_KEY) && Boolean(ADMIN_KEY) && Boolean(SUPABASE_URL),
    provider:"Gemini", model:MODEL, requiresLogin:true,
    message:ENABLED && API_KEY && ADMIN_KEY ? "Servidor Gemini configurado." :
      "Integração preparada; habilite a função no Supabase e configure a chave privada."
  },origin);
  if (req.method !== "POST") return reply(405,{code:"METHOD_NOT_ALLOWED"},origin);
  if (!ENABLED || !API_KEY || !ADMIN_KEY || !SUPABASE_URL)
    return reply(503,{code:"GEMINI_NOT_CONFIGURED",message:"A IA Gemini ainda não foi ativada pelo administrador. O modo seguro permanece disponível."},origin);
  const authorization = req.headers.get("authorization") || "";
  if (!/^Bearer [\w.-]{20,}$/i.test(authorization))
    return reply(401,{code:"LOGIN_REQUIRED",message:"Entre na sua conta do Método PMDF."},origin);
  const jwt=authorization.replace(/^Bearer\s+/i,"");
  try {
    const userId = await authenticatedUser(jwt);
    if (!userId) return reply(401,{code:"SESSION_EXPIRED",message:"Sessão expirada. Entre novamente."},origin);
    const length=clamp(req.headers.get("content-length"),0,0,999999);
    if (length>24000) return reply(413,{code:"REQUEST_TOO_LARGE",message:"Trecho acima do limite permitido."},origin);
    const data=await req.text();
    if (data.length>24000) return reply(413,{code:"REQUEST_TOO_LARGE"},origin);
    const payload=JSON.parse(data);
    const source=payload?.source;
    const format=payload?.format==="MC"?"MC":payload?.format==="CE"?"CE":null;
    const text=String(source?.text||"").trim();
    if (!format || text.length<60 || text.length>7500)
      return reply(400,{code:"INVALID_SOURCE",message:"Envie um trecho entre 60 e 7.500 caracteres com formato de questão válido."},origin);
    const normalizedSource={
      title:String(source.title||"Material enviado").slice(0,160),
      article:String(source.article||"Trecho").slice(0,160),
      text
    };
    const level=["iniciante","intermediario","avancado"].includes(payload?.level)?payload.level:"intermediario";
    const board=String(payload?.board||"Cebraspe").replace(/[^\p{L}\p{N}\s.-]/gu,"").slice(0,40);
    const count=clamp(payload?.count,format==="MC"?4:6,1,format==="MC"?5:8);
    const exclude=Array.isArray(payload?.exclude)?payload.exclude.slice(0,6).map(s=>String(s).slice(0,150)):[];
    const emphasis=String(payload?.emphasis||"literalidade e aplicação").slice(0,100);
    let quota;
    try{ quota=await consumeQuota(userId); }
    catch(e){return reply(503,{code:"QUOTA_NOT_CONFIGURED",message:"O controle de cotas no servidor ainda não foi ativado. Nenhuma solicitação à IA foi realizada."},origin);}
    if(!quota.allowed)
      return reply(429,{code:"PMDF_QUOTA_EXCEEDED",message:"Limite gratuito de geração atingido. Retorne após a renovação diária da cota ou use o modo seguro.",quota},origin,{"Retry-After":"3600"});
    const instructions=makePrompt(normalizedSource,format,level,board,count,emphasis,exclude);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),45000);
    let remote;
    try{
      remote=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+MODEL+":generateContent",{
        method:"POST",
        headers:{"x-goog-api-key":API_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({
          contents:[{role:"user",parts:[{text:instructions}]}],
          generationConfig:{
            responseMimeType:"application/json",
            responseSchema:OUTPUT,
            temperature:0.35,
            maxOutputTokens:format==="MC"?5500:3500
          }
        }),
        signal:controller.signal
      });
    }catch(e){
      return reply(504,{code:"GEMINI_TIMEOUT",message:"A geração demorou mais que o permitido. Tente outro trecho; sua cota poderá ter sido consumida."},origin);
    }finally{clearTimeout(timeout);}
    if(!remote.ok){
      if(remote.status===429)return reply(429,{code:"GEMINI_RATE_LIMIT",message:"O limite de requisições do Google foi atingido. Aguarde ou use o modo seguro."},origin,{"Retry-After":"60"});
      if(remote.status===404)return reply(503,{code:"GEMINI_MODEL_UNAVAILABLE",message:"O modelo Gemini configurado não está disponível para este projeto."},origin);
      return reply(502,{code:"GEMINI_PROVIDER_ERROR",message:"O serviço de IA não conseguiu concluir esta geração. Tente novamente."},origin);
    }
    const response=await remote.json();
    const output=(response?.candidates?.[0]?.content?.parts||[]).map(p=>p?.text||"").join("").trim();
    let items;
    try{items=JSON.parse(output).questions;}catch(e){items=[];}
    if(!Array.isArray(items))items=[];
    const used=new Set();
    const questions=items.slice(0,count).map(item=>validateResult(item,text,format))
      .filter(item=>{
        if(!item)return false;
        const key=norm(item.statement);
        if(used.has(key))return false;
        used.add(key);
        return true;
      });
    if(!questions.length)
      return reply(422,{code:"GEMINI_NO_VALID_QUESTIONS",message:"O Gemini não retornou questões com gabarito e citação verificáveis. Experimente um trecho mais completo."},origin);
    return reply(200,{questions,provider:"Gemini",model:MODEL,quota:{
      userRemaining:quota.user_remaining,globalRemaining:quota.global_remaining
    }},origin);
  }catch(e){
    console.error("gemini-questions",e instanceof Error?e.name:"unknown");
    return reply(500,{code:"SERVER_ERROR",message:"Não foi possível concluir a geração. Tente novamente."},origin);
  }
});
