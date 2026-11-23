/* Método PMDF — loja com pagamento externo e autorização no servidor.
 * Sem checkout configurado, não exibe botão de compra nem simula pagamento.
 * Direitos de acesso nunca são determinados pelo estado local do navegador.
 */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://wskuhkvgipqwykbnuspk.supabase.co';
  const PUBLIC_KEY = 'sb_publishable_GD37Y7cVTTKo74Vg5_5U1g_lyoqwcvH';
  const SESSION_KEY = 'pmdf:supabase:session:v1';
  const USER_DOMAIN = 'users.metodopmdf.invalid';
  const initialItems = [
    {slug:'questoes-comentadas', title:'Banco de Questões Comentadas', description:'Questões autorais e comentários por disciplina.', kind:'download'},
    {slug:'apostilas-tematicas', title:'Apostilas Temáticas', description:'Teoria integrada a exercícios e explicações.', kind:'download'},
    {slug:'premium-mensal', title:'Método PMDF Premium', description:'Ferramentas avançadas da plataforma, após lançamento.', kind:'subscription'}
  ];

  const elements = {
    catalog: document.getElementById('products'),
    status: document.getElementById('purchase-status'),
    login: document.getElementById('login-state'),
    entitlements: document.getElementById('entitlements'),
    refresh: document.getElementById('refresh-access'),
    form: document.getElementById('account-form'),
    name: document.getElementById('account-name'),
    password: document.getElementById('account-password'),
    submit: document.getElementById('account-submit'),
    switchMode: document.getElementById('account-switch'),
    message: document.getElementById('account-message'),
    signedOut: document.getElementById('account-signed-out'),
    signedIn: document.getElementById('account-signed-in'),
    welcome: document.getElementById('account-welcome'),
    signout: document.getElementById('account-signout')
  };

  const money = cents => (Number(cents) / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  const normalizeUsername = value => String(value || '').trim().toLowerCase();
  const usernameIsValid = value => /^[a-z0-9][a-z0-9._-]{2,23}$/.test(value);
  const usernameToLoginEmail = value => normalizeUsername(value) + '@' + USER_DOMAIN;
  let products = [];
  let accountMode = 'login';

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  }

  function saveSession(session) {
    try {
      if (session?.access_token) {
        session.expires_at ||= Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600);
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {}
  }

  async function supabase(path, options = {}, bearer) {
    const response = await fetch(SUPABASE_URL + path, {
      ...options,
      headers: {
        apikey: PUBLIC_KEY,
        Authorization: 'Bearer ' + (bearer || PUBLIC_KEY),
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.msg || data.error_description || data.message || data.error || 'Supabase HTTP ' + response.status);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function token() {
    let session = readSession();
    if (!session?.access_token) return null;
    if (session.expires_at && Date.now() / 1000 > Number(session.expires_at) - 90) {
      if (!session.refresh_token) { saveSession(null); return null; }
      try {
        const refreshed = await supabase('/auth/v1/token?grant_type=refresh_token', {
          method:'POST',
          body:JSON.stringify({refresh_token:session.refresh_token})
        });
        session = {...session, ...refreshed, user:refreshed.user || session.user};
        saveSession(session);
      } catch {
        saveSession(null);
        return null;
      }
    }
    return session.access_token;
  }

  function currentDisplayName() {
    const user = readSession()?.user;
    return user?.user_metadata?.username || (user?.email || '').split('@')[0] || 'candidato';
  }

  function setAccountMode(mode) {
    accountMode = mode === 'register' ? 'register' : 'login';
    elements.submit.textContent = accountMode === 'register' ? 'Cadastrar' : 'Entrar';
    elements.switchMode.textContent = accountMode === 'register' ? 'Já tenho uma conta' : 'Criar conta gratuita';
    elements.password.autocomplete = accountMode === 'register' ? 'new-password' : 'current-password';
    elements.message.textContent = accountMode === 'register'
      ? 'Escolha um usuário de 3 a 24 caracteres e uma senha de 6 a 72 caracteres.'
      : 'Use o mesmo usuário e senha da plataforma gratuita.';
  }

  function setSignedIn(signedIn) {
    elements.signedOut.hidden = signedIn;
    elements.signedIn.hidden = !signedIn;
    elements.login.textContent = signedIn ? 'Conta conectada' : 'Não autenticado';
    if (signedIn) elements.welcome.textContent = 'Você entrou como ' + currentDisplayName() + '.';
  }

  function friendlyAuthError(error, registering) {
    const message = String(error?.message || '');
    if (/invalid login|invalid credentials/i.test(message)) return 'Usuário ou senha incorretos.';
    if (/already registered|already exists|user already/i.test(message)) return 'Este usuário já possui conta. Use a opção “Já tenho uma conta”.';
    if (/password/i.test(message)) return 'A senha não foi aceita. Use de 6 a 72 caracteres.';
    if (/rate limit|too many/i.test(message)) return 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.';
    return registering ? 'Não foi possível criar a conta agora.' : 'Não foi possível entrar agora.';
  }

  async function submitAccount(event) {
    event.preventDefault();
    if (elements.submit.disabled) return;
    const username = normalizeUsername(elements.name.value);
    const password = elements.password.value;
    if (!usernameIsValid(username)) {
      elements.message.textContent = 'Use de 3 a 24 caracteres: letras sem acento, números, ponto, hífen ou sublinhado; comece por letra ou número.';
      elements.name.focus();
      return;
    }
    if (password.length < 6 || password.length > 72) {
      elements.message.textContent = 'Informe uma senha de 6 a 72 caracteres.';
      elements.password.focus();
      return;
    }

    elements.submit.disabled = true;
    elements.switchMode.disabled = true;
    elements.message.textContent = accountMode === 'register' ? 'Criando conta segura…' : 'Entrando…';
    const registering = accountMode === 'register';
    try {
      const email = usernameToLoginEmail(username);
      const result = registering
        ? await supabase('/auth/v1/signup', {method:'POST', body:JSON.stringify({email, password, data:{username, display_name:username}})})
        : await supabase('/auth/v1/token?grant_type=password', {method:'POST', body:JSON.stringify({email, password})});
      if (!result?.access_token || !result?.user?.id) throw new Error('Sessão autenticada não recebida.');
      saveSession(result);
      elements.password.value = '';
      setSignedIn(true);
      elements.message.textContent = registering ? 'Conta criada e conectada.' : 'Conta conectada.';
      await loadAccess();
    } catch (error) {
      elements.message.textContent = friendlyAuthError(error, registering);
    } finally {
      elements.submit.disabled = false;
      elements.switchMode.disabled = false;
    }
  }

  async function signOut() {
    elements.signout.disabled = true;
    const bearer = await token();
    try {
      if (bearer) await supabase('/auth/v1/logout', {method:'POST'}, bearer);
    } catch {}
    saveSession(null);
    elements.password.value = '';
    setSignedIn(false);
    elements.entitlements.textContent = 'Entre em sua conta para consultar os acessos vinculados.';
    elements.message.textContent = 'Sessão encerrada neste dispositivo.';
    elements.signout.disabled = false;
  }

  async function restoreAccount() {
    const bearer = await token();
    if (!bearer) { setSignedIn(false); return; }
    try {
      const user = await supabase('/auth/v1/user', {method:'GET'}, bearer);
      const session = readSession();
      saveSession({...session, user});
      setSignedIn(true);
    } catch {
      saveSession(null);
      setSignedIn(false);
    }
  }

  async function api(path, bearer) {
    return supabase(path, {method:'GET'}, bearer);
  }

  function showMessage(message) {
    elements.status.textContent = message;
  }

  function card(item) {
    const box = document.createElement('article');
    box.className = 'product';
    const badge = document.createElement('span');
    badge.className = 'tag';
    badge.textContent = item.active ? 'Disponível' : 'Em preparação';
    const title = document.createElement('h3');
    title.textContent = item.title;
    const description = document.createElement('p');
    description.textContent = item.description;
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = item.active ? money(item.price_cents) + (item.kind === 'subscription' ? ' / mês' : '') : 'Em breve';
    box.append(badge, title, description, price);
    if (item.active) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'buy';
      button.textContent = 'Comprar com segurança';
      button.addEventListener('click', () => startCheckout(item, button));
      box.append(button);
    }
    return box;
  }

  function render() {
    const rows = initialItems.map(item => ({...item, ...products.find(product => product.slug === item.slug)}));
    elements.catalog.replaceChildren(...rows.map(item => card({
      ...item,
      active: item.status === 'active' && !location.hostname.endsWith('.github.io')
    })));
  }

  async function startCheckout(product, button) {
    const bearer = await token();
    if (!bearer) {
      showMessage('Entre ou crie uma conta nesta página para vincular a compra ao seu acesso.');
      document.querySelector('.account-access')?.scrollIntoView({behavior:'smooth', block:'start'});
      elements.name.focus();
      return;
    }
    button.disabled = true;
    button.textContent = 'Preparando checkout…';
    showMessage('Gerando referência segura de compra.');
    try {
      const response = await fetch(SUPABASE_URL + '/functions/v1/pmdf-checkout', {
        method:'POST',
        headers:{apikey:PUBLIC_KEY, Authorization:'Bearer ' + bearer, 'Content-Type':'application/json'},
        body:JSON.stringify({slug:product.slug})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Checkout temporariamente indisponível.');
      const checkoutUrl = new URL(result.checkout_url);
      if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'pay.hotmart.com') throw new Error('Link de pagamento inválido.');
      window.location.assign(checkoutUrl.href);
    } catch (error) {
      showMessage(error.message || 'Não foi possível iniciar a compra.');
      button.disabled = false;
      button.textContent = 'Comprar com segurança';
    }
  }

  async function loadAccess() {
    elements.refresh.disabled = true;
    try {
      const bearer = await token();
      if (!bearer) {
        setSignedIn(false);
        elements.entitlements.textContent = 'Entre em sua conta para consultar os acessos vinculados.';
        return;
      }
      setSignedIn(true);
      const rows = await api('/rest/v1/pmdf_store_entitlements?select=product_slug,active,expires_at&active=eq.true', bearer);
      const valid = rows.filter(row => !row.expires_at || new Date(row.expires_at).getTime() > Date.now());
      elements.entitlements.textContent = valid.length
        ? 'Acessos ativos: ' + valid.map(row => initialItems.find(item => item.slug === row.product_slug)?.title || row.product_slug).join(' · ') + '. Entrega de arquivos digitais pela área de membros da Hotmart.'
        : 'Nenhum acesso premium ativo vinculado a esta conta.';
    } catch {
      elements.login.textContent = 'Conta indisponível';
      elements.entitlements.textContent = 'Não foi possível consultar os acessos agora.';
    } finally {
      elements.refresh.disabled = false;
    }
  }

  async function init() {
    render();
    setAccountMode('login');
    if (location.hostname.endsWith('.github.io')) {
      const notice = document.getElementById('environment-notice');
      notice.hidden = false;
      notice.textContent = 'Ambiente demonstrativo: as compras ficam desativadas nesta hospedagem.';
    }
    await restoreAccount();
    try {
      products = await api('/rest/v1/pmdf_store_products?select=slug,title,description,price_cents,kind,status&status=eq.active');
    } catch {
      products = [];
      showMessage('A loja ainda não está ativada. Não há produtos disponíveis para pagamento.');
    }
    render();
    await loadAccess();
  }

  elements.form.addEventListener('submit', submitAccount);
  elements.switchMode.addEventListener('click', () => setAccountMode(accountMode === 'login' ? 'register' : 'login'));
  elements.signout.addEventListener('click', signOut);
  elements.refresh.addEventListener('click', loadAccess);
  init();
})();
