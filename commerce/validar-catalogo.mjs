import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname,join} from "node:path";
import assert from "node:assert/strict";
const raiz=dirname(fileURLToPath(import.meta.url));
const c=JSON.parse(readFileSync(join(raiz,"catalogo.json"),"utf8"));
assert.equal(c.schema_version,1);
assert.equal(c.moeda,"BRL");
assert.equal(c.provedor_pagamento,"kiwify");
assert.ok(Array.isArray(c.produtos)&&c.produtos.length>0);
const ids=new Set();
for(const p of c.produtos){
  assert.match(p.id,/^[a-z0-9-]{5,80}$/);
  assert.ok(!ids.has(p.id),"ID duplicado "+p.id);ids.add(p.id);
  assert.ok(typeof p.titulo==="string"&&p.titulo.length>=8);
  assert.ok(typeof p.descricao==="string"&&p.descricao.length>=20);
  assert.ok(typeof p.categoria==="string"&&p.categoria.length>=3);
  assert.ok(Array.isArray(p.beneficios)&&p.beneficios.length>=2&&p.beneficios.every(v=>typeof v==="string"&&v.length>5));
  assert.ok(Number.isSafeInteger(p.preco_centavos)&&p.preco_centavos>0);
  assert.ok(["rascunho","publicado"].includes(p.status));
  assert.equal(typeof p.direitos_verificados,"boolean");
  assert.equal(typeof p.entrega_configurada,"boolean");
  if(p.status==="publicado"){
    assert.equal(p.direitos_verificados,true,"Verificar licenca/autoria antes de publicar "+p.id);
    assert.equal(p.entrega_configurada,true,"Configurar entrega digital antes de publicar "+p.id);
    assert.equal(typeof p.checkout_url,"string");
    const u=new URL(p.checkout_url);
    assert.equal(u.protocol,"https:");
    assert.equal(u.hostname,"pay.kiwify.com.br");
    assert.match(u.pathname,/^\/[A-Za-z0-9_-]+\/?$/);
    assert.equal(u.username,"");assert.equal(u.password,"");
  }
}
const h=readFileSync(join(raiz,"index.html"),"utf8");
const j=readFileSync(join(raiz,"app.js"),"utf8");
const css=readFileSync(join(raiz,"styles.css"),"utf8");
assert.ok(h.includes('id="produtos"')&&h.includes('id="catalogo-status"'));
assert.ok(h.includes('href="./styles.css"')&&h.includes('src="./app.js"'));
assert.ok(j.includes("linkSeguro")&&j.includes("publicado(p)"));
assert.ok(css.includes("@media(max-width:620px)"));
console.log("QA loja OK: "+c.produtos.length+" produtos, "+c.produtos.filter(p=>p.status==="publicado").length+" habilitados.");
