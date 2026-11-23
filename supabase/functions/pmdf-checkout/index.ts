// Supabase Edge Function: POST /functions/v1/pmdf-checkout
// Serviço deliberadamente fechado enquanto não configurar origens e ofertas reais.
function envKey(jsonName: string, legacyName: string): string {
  const raw=Deno.env.get(jsonName)||'';
  if(raw){
    try{
      const keys=JSON.parse(raw);
      if(typeof keys?.default==='string')return keys.default;
      const first=Object.values(keys||{}).find(value=>typeof value==='string');
      if(typeof first==='string')return first;
    }catch{/* Compatibilidade com variáveis simples. */}
  }
  return Deno.env.get(legacyName)||'';
}
const url = Deno.env.get('SUPABASE_URL') || Deno.env.get('SUPABASE_PUBLIC_URL') || '';
const publicKey = envKey('SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
const serviceKey = envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const origins = (Deno.env.get('PMDF_COMMERCE_ALLOWED_ORIGINS') || '').split(',').map(x=>x.trim()).filter(Boolean);
const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Vary': 'Origin',
  'Content-Type': 'application/json; charset=utf-8'
});
const response = (code: number, data: Record<string,unknown>, origin: string) =>
  new Response(JSON.stringify(data),{status:code,headers:cors(origin)});
Deno.serve(async req=>{
  const origin=req.headers.get('origin')||'';
  if(!origins.length || !origins.includes(origin))return response(403,{error:'Origem comercial não autorizada.'},'null');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return response(405,{error:'Método não permitido.'},origin);
  if(!url||!publicKey||!serviceKey)return response(503,{error:'Integração de pagamentos ainda não configurada.'},origin);
  const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!bearer)return response(401,{error:'Faça login antes de comprar.'},origin);
  try{
    const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:publicKey,authorization:'Bearer '+bearer}});
    if(!auth.ok)return response(401,{error:'Sua sessão expirou. Entre novamente.'},origin);
    const user=await auth.json();
    if(!/^[0-9a-f-]{36}$/i.test(String(user.id||'')))return response(401,{error:'Conta não reconhecida.'},origin);
    const raw=await req.text();
    if(raw.length>2048)return response(413,{error:'Requisição muito grande.'},origin);
    const slug=String(JSON.parse(raw).slug||'');
    if(!/^[a-z0-9-]{3,60}$/.test(slug))return response(400,{error:'Produto inválido.'},origin);
    const adminHeaders:Record<string,string>={apikey:serviceKey,'Content-Type':'application/json'};
    if(!serviceKey.startsWith('sb_secret_'))adminHeaders.authorization='Bearer '+serviceKey;
    const productRes=await fetch(url+'/rest/v1/pmdf_store_products?slug=eq.'+encodeURIComponent(slug)+'&status=eq.active&select=slug,kind',{
      headers:adminHeaders
    });
    if(!productRes.ok)throw Error('products_lookup');
    const products=await productRes.json();
    if(!products.length)return response(404,{error:'Produto indisponível para compra.'},origin);
    const gatewayRes=await fetch(url+'/rest/v1/pmdf_store_gateways?product_slug=eq.'+encodeURIComponent(slug)+'&select=checkout_url,hotmart_product_id',{headers:adminHeaders});
    if(!gatewayRes.ok)throw Error('checkout_lookup');
    const gateways=await gatewayRes.json();
    const target=gateways[0]?.checkout_url;
    if(!target)return response(503,{error:'Checkout ainda não configurado.'},origin);
    const link=new URL(target);
    if(link.protocol!=='https:'||link.hostname!=='pay.hotmart.com'||!link.pathname.startsWith('/'))
      throw Error('checkout_url_invalid');
    // Cota por conta para evitar abuso de intents e preservar o plano gratuito.
    const since=encodeURIComponent(new Date(Date.now()-3600000).toISOString());
    const quotaRes=await fetch(url+'/rest/v1/pmdf_store_checkout_intents?user_id=eq.'+
      encodeURIComponent(user.id)+'&created_at=gte.'+since+'&select=sck&limit=11',{headers:adminHeaders});
    if(!quotaRes.ok)throw Error('checkout_quota_lookup');
    if((await quotaRes.json()).length>=10)return response(429,{error:'Limite de tentativas de checkout atingido. Tente novamente mais tarde.'},origin);
    const sck=crypto.randomUUID().replaceAll('-','').slice(0,24);
    const intentRes=await fetch(url+'/rest/v1/pmdf_store_checkout_intents',{
      method:'POST',headers:{...adminHeaders,Prefer:'return=minimal'},
      body:JSON.stringify({sck,user_id:user.id,product_slug:slug})
    });
    if(!intentRes.ok)throw Error('checkout_intent_insert');
    link.searchParams.set('sck',sck);
    link.searchParams.set('utm_source','metodopmdf');
    return response(200,{checkout_url:link.href},origin);
  }catch(err){
    console.error('checkout failure',String(err));
    return response(503,{error:'Não foi possível preparar o checkout. Tente novamente mais tarde.'},origin);
  }
});
