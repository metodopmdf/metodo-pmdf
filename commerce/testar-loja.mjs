import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";
import assert from "node:assert/strict";
const root=dirname(fileURLToPath(import.meta.url));
const source=readFileSync(join(root,"app.js"),"utf8");
const catalog=JSON.parse(readFileSync(join(root,"catalogo.json"),"utf8"));
class Elemento{
  constructor(tag){this.tag=tag;this.children=[];this.attributes={};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(k,v){this.attributes[k]=v;}
}
const nodes={produtos:new Elemento("div"),"catalogo-status":new Elemento("p"),ano:new Elemento("span")};
const doc={
  getElementById:id=>nodes[id],
  createElement:tag=>new Elemento(tag),
  createDocumentFragment:()=>new Elemento("#fragment")
};
let resposta=catalog;
const ctx={document:doc,URL,fetch:async()=>({ok:true,json:async()=>resposta})};
runInNewContext(source,ctx);
function descer(node){const out=[node];for(const child of (node.children||[]))out.push(...descer(child));return out;}
async function testar(produtos,esperados){
  resposta={...catalog,produtos};
  await ctx.carregar();
  const itens=descer(nodes.produtos);
  const compras=itens.filter(n=>n.tag==="a"&&n.className==="buy");
  assert.equal(compras.length,esperados,"Quantidade de checkouts incorreta");
  return compras;
}
const draft=structuredClone(catalog.produtos);
await testar(draft,0);
let fake=structuredClone(draft);
fake[0]={...fake[0],status:"publicado",checkout_url:"https://pay.kiwify.com.br/ABCdef",entrega_configurada:true,direitos_verificados:false};
await testar(fake,0);
fake[0].direitos_verificados=true;fake[0].checkout_url="https://pay.kiwify.com.br.evil.example/ABCdef";
await testar(fake,0);
fake[0].checkout_url="https://pay.kiwify.com.br/ABCdef";
const links=await testar(fake,1);
assert.equal(links[0].href,"https://pay.kiwify.com.br/ABCdef");
assert.equal(links[0].rel,"noopener noreferrer");
fake[0].entrega_configurada=false;
await testar(fake,0);
console.log("QA de execução OK: rascunhos bloqueados, checkout legítimo liberado, domínio fraudulento e entrega ausente bloqueados.");