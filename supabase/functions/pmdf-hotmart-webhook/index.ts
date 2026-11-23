// Supabase Edge Function: POST /functions/v1/pmdf-hotmart-webhook
// Webhook V2 da Hotmart. Não expor HOTMART_HOTTOK ou service role no navegador.
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
const sbUrl=Deno.env.get('SUPABASE_URL')||Deno.env.get('SUPABASE_PUBLIC_URL')||'';
const serviceKey=envKey('SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY');
const secret=Deno.env.get('HOTMART_HOTTOK')||'';
const json=(status:number,body:Record<string,unknown>)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
async function safeEqual(a:string,b:string) {
  const e=new TextEncoder();
  const [ah,bh]=await Promise.all([crypto.subtle.digest('SHA-256',e.encode(a)),crypto.subtle.digest('SHA-256',e.encode(b))]);
  const aa=new Uint8Array(ah),bb=new Uint8Array(bh);let x=0;
  for(let i=0;i<aa.length;i++)x|=aa[i]^bb[i];
  return x===0&&a.length===b.length;
}
function expiryDate(data:any):string|null {
  const raw=data?.subscription?.date_next_charge ?? data?.subscription?.next_charge_date ?? data?.subscription?.next_charge
    ?? data?.purchase?.subscription?.date_next_charge;
  if(!raw)return null;
  let parsed:Date;
  if(typeof raw==='number')parsed=new Date(raw<1e12?raw*1000:raw);
  else parsed=new Date(String(raw));
  return isNaN(parsed.getTime())?null:parsed.toISOString();
}
Deno.serve(async req=>{
  if(req.method!=='POST')return json(405,{error:'method_not_allowed'});
  if(!secret||!sbUrl||!serviceKey)return json(503,{error:'not_configured'});
  const received=req.headers.get('x-hotmart-hottok')||'';
  if(!received||!(await safeEqual(received,secret)))return json(401,{error:'invalid_token'});
  if(Number(req.headers.get('content-length')||0)>65536)return json(413,{error:'payload_too_large'});
  let payload:any;
  try {
    const text=await req.text();
    if(text.length>65536)return json(413,{error:'payload_too_large'});
    payload=JSON.parse(text);
  }catch{return json(400,{error:'invalid_json'});}
  const event=String(payload?.event||'').toUpperCase();
  const state=String(payload?.data?.purchase?.status||'').toUpperCase();
  const approved=new Set(['PURCHASE_APPROVED','PURCHASE_COMPLETE','PURCHASE_COMPLETED']);
  const revoked=new Set(['PURCHASE_REFUNDED','PURCHASE_CHARGEBACK','PURCHASE_CANCELED']);
  let decision:string|null=null;
  if(revoked.has(event)||['REFUNDED','CHARGEBACK','CANCELED'].includes(state))decision='revoked';
  else if(approved.has(event)&&state==='APPROVED')decision='approved';
  if(!decision)return json(200,{result:'ignored_event'});
  const id=String(payload?.id||'');
  const transaction=String(payload?.data?.purchase?.transaction||'');
  const productId=String(payload?.data?.product?.id||'');
  const tracking=payload?.data?.tracking || {};
  const sck=String(tracking?.source_sck||tracking?.sck||payload?.data?.purchase?.sck||payload?.data?.purchase?.tracking?.source_sck||'');
  if(!id||!transaction||!productId||(decision==='approved'&&!sck))
    return json(200,{result:'unmatched_metadata'});
  try{
    const rpc=await fetch(sbUrl+'/rest/v1/rpc/pmdf_store_reconcile_hotmart',{
      method:'POST',
      headers:{
        apikey:serviceKey,
        ...(serviceKey.startsWith('sb_secret_')?{}:{authorization:'Bearer '+serviceKey}),
        'Content-Type':'application/json'
      },
      body:JSON.stringify({
        p_event_id:id,p_transaction_id:transaction,p_hotmart_product_id:productId,
        p_sck:sck,p_state:decision,p_expires_at:expiryDate(payload.data)
      })
    });
    if(!rpc.ok)throw Error('reconciliation_http_'+rpc.status);
    const result=await rpc.json();
    if(result==='invalid')return json(400,{result});
    return json(200,{result});
  }catch(e){console.error('commerce webhook retryable failure',String(e));return json(500,{error:'reconciliation_failed'});}
});
