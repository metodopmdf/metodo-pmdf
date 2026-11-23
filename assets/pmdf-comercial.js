/* Método PMDF — loja com pagamento externo e autorização no servidor.
 * Sem checkout configurado, não exibe botão de compra nem simula pagamento.
 * Direitos de acesso nunca são determinados pelo estado local do navegador.
 */
(() => {
  'use strict';
  const SUPABASE_URL = 'https://wskuhkvgipqwykbnuspk.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_GD37Y7cVTTKo74Vg5_5U1g_lyoqwcvH';
  const SESSION_KEY = 'pmdf:supabase:session:v1';
  const catalog = document.getElementById('products');
  const status = document.getElementById('purchase-status');
  const login = document.getElementById('login-state');
  const entitlements = document.getElementById('entitlements');
  const refreshButton = document.getElementById('refresh-access');
  const homeLink = './index.html';
  const money = cents => (Number(cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const initialItems = [
    {slug:'questoes-comentadas', title:'Banco de Questões Comentadas', description:'Questões autorais e comentários por disciplina.', kind:'download'},
    {slug:'apostilas-tematicas', title:'Apostilas Temáticas', description:'Teoria integrada a exercícios e explicações.', kind:'download'},
    {slug:'premium-mensal', title:'Método PMDF Premium', description:'Ferramentas avançadas da plataforma, após lançamento.', kind:'subscription'}
  ];
  let products = [];

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }
  async function token() {
    let s = readSession();
    if (!s?.access_token) return null;
    if (s.expires_at && Date.now() / 1000 > Number(s.expires_at) - 90) {
      if (!s.refresh_token) return null;
      const result = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      if (!result.ok) return null;
      s = await result.json();
      s.expires_at ||= Math.floor(Date.now()/1000) + Number(s.expires_in || 3600);
      localStorage.setItem(SESSION_KEY,JSON.stringify(s));
    }
    return s.access_token;
  }
  async function api(path, bearer) {
    const res = await fetch(SUPABASE_URL + path,{headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+(bearer || PUBLIC_KEY)}});
    if (!res.ok) throw new Error('A consulta ao servidor não está disponível (' + res.status + ').');
    return res.json();
  }
  function showMessage(message) { status.textContent = message; }
  function card(item) {
    const box = document.createElement('article');box.className = 'product';
    const badge = document.createElement('span'); badge.className='tag';badge.textContent=item.active ? 'Disponível' : 'Em preparação';
    const title=document.createElement('h3');title.textContent=item.title;
    const description=document.createElement('p');description.textContent=item.description;
    const price=document.createElement('div');price.className='price';price.textContent=item.active ? money(item.price_cents) + (item.kind === 'subscription' ? ' / mês' : '') : 'Em breve';
    box.append(badge,title,description,price);
    if (item.active) {
      const button=document.createElement('button');button.type='button';button.className='buy';button.textContent='Comprar com segurança';button.addEventListener('click',()=>startCheckout(item,button));box.append(button);
    }
    return box;
  }
  function render() {
    const rows=initialItems.map(p=>({...p,...products.find(r=>r.slug === p.slug)}));
    catalog.replaceChildren(...rows.map(r=>card({...r,active:r.status === 'active' && !location.hostname.endsWith('.github.io')})));
  }
  async function startCheckout(product, button) {
    const bearer=await token().catch(()=>null);
    if (!bearer) {
      showMessage('Entre ou crie uma conta na plataforma gratuita para vincular a compra ao seu acesso.');
      window.location.href=homeLink;
      return;
    }
    button.disabled=true;button.textContent='Preparando checkout…';showMessage('Gerando referência segura de compra.');
    try {
      const res=await fetch(SUPABASE_URL+'/functions/v1/pmdf-checkout',{
        method:'POST',
        headers:{apikey:PUBLIC_KEY,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},
        body:JSON.stringify({slug:product.slug})
      });
      const result=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(result.error || 'Checkout temporariamente indisponível.');
      const u=new URL(result.checkout_url);
      if(u.protocol!=='https:'||u.hostname!=='pay.hotmart.com')throw new Error('Link de pagamento inválido.');
      window.location.assign(u.href);
    }catch(e){showMessage(e.message||'Não foi possível iniciar a compra.');button.disabled=false;button.textContent='Comprar com segurança';}
  }
  async function loadAccess() {
    refreshButton.disabled=true;
    try {
      const bearer=await token();
      if(!bearer) {login.textContent='Não autenticado';entitlements.textContent='Entre pelo botão “Voltar aos estudos” para consultar os seus acessos.';return;}
      login.textContent='Conta conectada';
      const rows=await api('/rest/v1/pmdf_store_entitlements?select=product_slug,active,expires_at&active=eq.true',bearer);
      const valid=rows.filter(r=>!r.expires_at||new Date(r.expires_at).getTime()>Date.now());
      entitlements.textContent=valid.length?'Acessos ativos: '+valid.map(r=>(initialItems.find(x=>x.slug===r.product_slug)?.title || r.product_slug)).join(' · ')+'. Entrega de arquivos digitais pela área de membros da Hotmart.':'Nenhum acesso premium ativo vinculado a esta conta.';
    }catch(e){login.textContent='Conta indisponível';entitlements.textContent='Não foi possível consultar os acessos. O banco comercial pode não estar instalado.';}
    finally{refreshButton.disabled=false;}
  }
  async function init() {
    render();
    if(location.hostname.endsWith('.github.io')) {
      const notice=document.getElementById('environment-notice');
      notice.hidden=false;notice.textContent='Ambiente demonstrativo: a operação comercial deverá ser publicada em hospedagem própria compatível com uso comercial.';
    }
    try {
      products=await api('/rest/v1/pmdf_store_products?select=slug,title,description,price_cents,kind,status&status=eq.active');
    } catch {products=[];showMessage('A loja ainda não está ativada. Não há produtos disponíveis para pagamento.');}
    render();await loadAccess();
  }
  refreshButton.addEventListener('click',loadAccess);
  init();
})();