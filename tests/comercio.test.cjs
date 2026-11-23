'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const cp=require('node:child_process');
const path=require('node:path');
const base=path.resolve(__dirname,'..');
const read=filename=>fs.readFileSync(path.join(base,filename),'utf8');
const script=read('assets/pmdf-comercial.js');
const schema=read('supabase/migrations/20261123_comercio_hotmart.sql');
const checkout=read('supabase/functions/pmdf-checkout/index.ts');
const webhook=read('supabase/functions/pmdf-hotmart-webhook/index.ts');
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
function testPage(hostname='loja.netlify.app',session=null,checkoutUrl='https://pay.hotmart.com/PRODUTO?sck=abc'){
  class FakeNode {
    constructor(){this.children=[];this.listeners={};this.textContent='';this.hidden=false;this.disabled=false;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    addEventListener(name,cb){this.listeners[name]=cb;}
  }
  const nodes=new Map();
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,new FakeNode());return nodes.get(id);},
    createElement(){return new FakeNode();}
  };
  const calls=[];
  const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
  const fetch=async (url,options={})=>{
    calls.push({url:String(url),options});
    if(String(url).includes('pmdf_store_products'))return response([{slug:'questoes-comentadas',title:'Banco Comentado',description:'Conteúdo de teste.',kind:'download',price_cents:2990,status:'active'}]);
    if(String(url).includes('pmdf_store_entitlements'))return response([]);
    if(String(url).includes('/functions/v1/pmdf-checkout'))return response({checkout_url:checkoutUrl});
    throw Error('Unexpected request: '+url);
  };
  const storage={};
  if(session)storage['pmdf:supabase:session:v1']=JSON.stringify(session);
  const localStorage={getItem:k=>storage[k]||null,setItem:(k,v)=>{storage[k]=v;}};
  const location={hostname,href:'https://'+hostname+'/comercial.html',assigned:null,assign(href){this.assigned=href;}};
  vm.runInNewContext(script,{document,location,window:{location},localStorage,fetch,URL,Date,Intl,console},{timeout:1000});
  return {nodes,calls,location};
}
test('estrutura de loja não possui checkout falso ou credenciais privilegiadas no navegador',()=>{
  const h=read('comercial.html');
  assert.match(h,/pmdf-comercial[.]js/);
  assert.match(h,/noindex,nofollow/);
  assert.doesNotMatch(script,/service_role|HOTMART_HOTTOK/i);
  assert.match(checkout,/\/auth\/v1\/user/);
  assert.match(checkout,/pmdf_store_checkout_intents/);
  assert.match(checkout,/hostname!=='pay[.]hotmart[.]com'/);
  assert.match(webhook,/x-hotmart-hottok/);
  assert.match(webhook,/pmdf_store_reconcile_hotmart/);
});
test('produtos começam inativos e políticas protegem dados financeiros',()=>{
  const draft=Array.from(schema.matchAll(/,'draft'\)/g));
  assert.equal(draft.length,3,'Três produtos iniciais devem começar como rascunhos');
  assert.match(schema,/pmdf_store_products_public/);
  assert.match(schema,/pmdf_store_entitlements_own/);
  assert.match(schema,/pmdf_store_reconcile_hotmart/);
  assert.match(schema,/on conflict\(event_id\) do nothing/);
  assert.match(schema,/select user_id into v_user from public[.]pmdf_store_orders/);
  assert.match(webhook,/decision==='approved'&&!sck/);
  assert.match(schema,/grant execute on function [^;]+ to service_role/i);
  assert.doesNotMatch(schema,/grant (insert|update|delete) on .* to anon/i);
});
test('checkout está desativado nas páginas do GitHub',async()=>{
  const page=testPage('metodopmdf.github.io');
  await flush();
  assert.equal(page.nodes.get('products').children.length,3);
  assert.equal(page.nodes.get('products').children[0].children.some(n=>n.className==='buy'),false);
  assert.match(page.nodes.get('environment-notice').textContent,/demonstrativo/);
});
test('checkout autenticado só usa link oficial retornado pelo servidor',async()=>{
  const page=testPage('loja.netlify.app',{access_token:'access-token',expires_at:4102444800});
  await flush();
  const card=page.nodes.get('products').children[0];
  const buy=card.children.find(n=>n.className==='buy');
  assert.ok(buy,'produto ativo precisa ter botão de compra');
  await buy.listeners.click();
  await flush();
  const checkoutCall=page.calls.find(c=>c.url.includes('/functions/v1/pmdf-checkout'));
  assert.ok(checkoutCall);
  assert.equal(JSON.parse(checkoutCall.options.body).slug,'questoes-comentadas');
  assert.equal(checkoutCall.options.headers.Authorization,'Bearer access-token');
  assert.equal(page.location.assigned,'https://pay.hotmart.com/PRODUTO?sck=abc');
});
test('página não aceita checkout externo ou domínio fraudulento',async()=>{
  const page=testPage('loja.netlify.app',{access_token:'access-token',expires_at:4102444800},'https://site-malicioso.example/checkout');
  await flush();
  const buy=page.nodes.get('products').children[0].children.find(n=>n.className==='buy');
  await buy.listeners.click();await flush();
  assert.equal(page.location.assigned,null);
  assert.match(page.nodes.get('purchase-status').textContent,/inválido/i);
});
test('script comercial é sintaticamente válido no Node',()=>{
  const result=cp.spawnSync(process.execPath,['--check',path.join(base,'assets/pmdf-comercial.js')],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
