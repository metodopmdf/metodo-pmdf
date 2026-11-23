const conteiner=document.getElementById("produtos");
const status=document.getElementById("catalogo-status");
document.getElementById("ano").textContent=String(new Date().getFullYear());
const moeda=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
function linkSeguro(v){
  if(typeof v!=="string")return false;
  try{const u=new URL(v);return u.protocol==="https:"&&u.hostname==="pay.kiwify.com.br"&&/^\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)&&!u.username&&!u.password;}catch{return false;}
}
function publicado(p){return p.status==="publicado"&&p.direitos_verificados===true&&p.entrega_configurada===true&&linkSeguro(p.checkout_url);}
function el(tag,classe,texto){const n=document.createElement(tag);if(classe)n.className=classe;if(texto!==undefined)n.textContent=String(texto);return n;}
function cartao(p){
  const c=el("article","card");c.append(el("div","tag",p.categoria),el("h3","",p.titulo),el("p","",p.descricao));
  const lista=el("ul");for(const x of p.beneficios)lista.append(el("li","",x));c.append(lista);
  const fundo=el("div","card-bottom"),linha=el("div","price-row");
  linha.append(el("strong","price",moeda.format(p.preco_centavos/100)),el("span","","Pagamento único"));fundo.append(linha);
  if(publicado(p)){
    const a=el("a","buy","Comprar na Kiwify");a.href=p.checkout_url;a.target="_blank";a.rel="noopener noreferrer";a.setAttribute("aria-label","Comprar "+p.titulo+" pelo checkout Kiwify");
    fundo.append(a,el("p","availability","Pagamento e acesso digital pela Kiwify."));
  }else{
    const b=el("button","disabled","Em preparação");b.type="button";b.disabled=true;
    fundo.append(b,el("p","availability","Vendas não abertas para este material."));
  }
  c.append(fundo);return c;
}
async function carregar(){
  try{
    const r=await fetch("./catalogo.json",{cache:"no-store"});if(!r.ok)throw Error("HTTP");
    const d=await r.json();if(d.schema_version!==1||d.moeda!=="BRL"||!Array.isArray(d.produtos))throw Error("dados");
    const frag=document.createDocumentFragment();
    for(const p of d.produtos){
      if(typeof p.titulo!=="string"||typeof p.descricao!=="string"||!Array.isArray(p.beneficios)||!Number.isSafeInteger(p.preco_centavos)||p.preco_centavos<=0)throw Error("produto");
      frag.append(cartao(p));
    }
    conteiner.replaceChildren(frag);
    const n=d.produtos.filter(publicado).length;
    status.textContent=n===0?"Catálogo em preparação. Compras desativadas até revisão e ativação segura dos materiais.":n+" material(is) disponível(is) para compra.";
  }catch{status.textContent="Catálogo temporariamente indisponível. Nenhuma compra foi aberta.";conteiner.replaceChildren();}
}
carregar();