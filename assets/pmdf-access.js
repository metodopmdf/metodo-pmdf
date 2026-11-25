/* Acesso individual ao Método PMDF. A autorização efetiva ocorre no servidor. */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = root.PMDFAccessConfig || {};
  const POLL_MS = 30000, MAX_VALIDATION_MS = 60000;
  let client, identity = null, state = {active: false, user: null, expires_at: null};
  let epoch = 0, running = null, timer, expiryTimer, mode = 'login', submitting = false;
  let deadline = 0, verifiedUntil = 0, readyResolved = false, lockedAfterReady = false;
  let resolveReady;
  const readyPromise = new Promise(resolve => { resolveReady = resolve; });
  const now = () => root.performance.now();

  function message(text, error = false) {
    $('access-status').textContent = text;
    $('access-status').dataset.error = String(error);
  }
  function isActive() {
    return state.active && now() < deadline && now() < verifiedUntil;
  }
  function render() {
    const active = isActive(), signedIn = Boolean(state.user);
    $('member-workspace').hidden = !active;
    $('access-gate').hidden = active;
    $('access-account').hidden = !signedIn;
    $('access-identity').textContent = state.user?.email || '';
    $('access-expiry').textContent = active && state.expires_at ?
      'Acesso até ' + new Date(state.expires_at).toLocaleDateString('pt-BR', {timeZone: 'America/Sao_Paulo'}) : '';
    $('access-auth-form').hidden = signedIn && mode !== 'update-password';
    $('access-check').hidden = !signedIn || mode === 'update-password';
    $('access-modes').hidden = signedIn;
    $('access-signout').hidden = !signedIn;
  }
  function revoke(reason, text) {
    const hadActive = state.active;
    state = {...state, active: false, reason};
    deadline = verifiedUntil = 0;
    clearTimeout(expiryTimer);
    if (hadActive) {
      lockedAfterReady = readyResolved;
      root.PMDFAnkiCatalog?.clear();
      document.dispatchEvent(new CustomEvent('pmdf:access-lost'));
    }
    render();
    if (text) message(text, reason !== 'signed_out');
  }
  function setMode(nextMode) {
    mode = nextMode;
    const recovery = mode === 'recovery', updating = mode === 'update-password', signup = mode === 'signup';
    $('access-form-title').textContent = updating ? 'Crie sua nova senha' : recovery ? 'Recuperar acesso' : signup ? 'Criar minha conta' : 'Entrar na minha conta';
    $('access-email-field').hidden = updating;
    $('access-email').required = !updating;
    $('access-password-field').hidden = recovery;
    $('access-password').required = !recovery;
    $('access-password').minLength = signup || updating ? 12 : 1;
    $('access-password').autocomplete = signup || updating ? 'new-password' : 'current-password';
    $('access-password').value = '';
    $('access-password-confirm-field').hidden = !(signup || updating);
    $('access-password-confirm').required = signup || updating;
    $('access-password-confirm').value = '';
    $('access-password-help').hidden = !(signup || updating);
    $('access-submit').textContent = updating ? 'Salvar nova senha' : recovery ? 'Enviar link de recuperação' : signup ? 'Criar conta' : 'Entrar';
    $('access-show-login').hidden = mode === 'login';
    $('access-show-signup').hidden = mode === 'signup';
    $('access-show-recovery').hidden = mode === 'recovery';
    render();
  }
  function friendlyError(error) {
    const code = error?.code || error?.error || '';
    if (code === 'email_reverification_required') return 'Sua conta foi criada antes da verificação obrigatória de e-mail. Entre em contato com o suporte para validar seu acesso.';
    if (code === 'email_not_confirmed' || code === 'email_not_verified') return 'Confirme seu e-mail pelo link recebido antes de entrar. Confira também a pasta de spam.';
    if (code === 'invalid_credentials' || error?.status === 400 && /credentials/i.test(error?.message || '')) return 'Não foi possível entrar. Confira o e-mail e a senha.';
    if (code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos 12 caracteres.';
    if (code === 'same_password') return 'Escolha uma senha diferente da atual.';
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error?.status === 429) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
    if (code === 'email_address_not_authorized' || code === 'unexpected_failure') return 'Não foi possível enviar o e-mail de acesso. Tente novamente mais tarde ou procure o suporte do produtor na sua compra Hotmart.';
    if (code === 'validation_failed') return 'Confira os dados informados e tente novamente.';
    return 'Não foi possível concluir agora. Confira sua conexão e tente novamente. Se continuar, procure o suporte do produtor na sua compra Hotmart.';
  }
  async function request(action) {
    const {data, error} = await client.auth.getSession();
    if (error || !data.session?.access_token) throw Object.assign(new Error('authentication_required'), {code: 'authentication_required', status: 401});
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(config.supabaseUrl + '/functions/v1/' + config.accessFunction, {
        method: 'POST', cache: 'no-store', credentials: 'omit', signal: controller.signal,
        headers: {'Content-Type': 'application/json', apikey: config.publishableKey,
          Authorization: 'Bearer ' + data.session.access_token}, body: JSON.stringify({action})
      });
      let result;
      try { result = await response.json(); } catch (_) { throw new Error('invalid_response'); }
      if (!response.ok) throw Object.assign(new Error('access_request_failed'), {code: result.error, reason: result.reason, status: response.status});
      return result;
    } finally { clearTimeout(timeout); }
  }
  function planNextCheck() {
    clearTimeout(timer);
    timer = setTimeout(() => { if (state.user && document.visibilityState !== 'hidden') check(); else planNextCheck(); }, POLL_MS);
  }
  async function check() {
    if (!client || mode === 'update-password') return false;
    if (running) return running;
    const revision = epoch;
    running = (async () => {
      try {
        const {data: sessionData, error: sessionError} = await client.auth.getSession();
        if (revision !== epoch) return false;
        if (sessionError || !sessionData.session) {
          state = {...state, user: null};
          revoke('signed_out', 'Entre com o e-mail usado na compra. No primeiro acesso, crie e confirme sua conta.');
          return false;
        }
        const {data, error} = await client.auth.getUser();
        if (revision !== epoch) return false;
        if (error) throw error;
        if (!data.user || data.user.is_anonymous) throw Object.assign(new Error('invalid_session'), {status: 401});
        const user = data.user;
        state = {...state, user};
        if (!user.email_confirmed_at) {
          revoke('email_not_verified', 'Confirme seu e-mail pelo link recebido para liberar o acesso.');
          return false;
        }
        const result = await request('status');
        if (revision !== epoch) return false;
        const remaining = Date.parse(result.expires_at) - Date.parse(result.server_time);
        if (result.active !== true || !Number.isFinite(remaining) || remaining <= 0) {
          const messages = {
            no_purchase: 'Sua conta está confirmada, mas ainda não encontramos uma compra aprovada dos Flashcards Estratégicos neste e-mail. Se acabou de pagar, aguarde a confirmação e clique em Verificar minha compra.',
            expired: 'Seu período de acesso terminou. Você pode adquirir um novo acesso para continuar a revisão.',
            revoked: 'Esta compra não possui mais acesso ativo. Confira a situação da compra na Hotmart.',
            not_ready: 'A liberação do produto ainda está sendo preparada. Tente novamente mais tarde.'
          };
          const reason = result.reason || 'expired';
          revoke(reason, messages[reason] || 'Não foi possível confirmar um acesso ativo para esta conta.');
          return false;
        }
        state = {active: true, user, expires_at: result.expires_at, reason: 'active'};
        deadline = now() + remaining;
        verifiedUntil = now() + MAX_VALIDATION_MS;
        clearTimeout(expiryTimer);
        expiryTimer = setTimeout(() => revoke('expired', 'Precisamos confirmar seu acesso novamente. Confira a conexão e clique em Verificar minha compra.'), Math.min(remaining, MAX_VALIDATION_MS));
        if (lockedAfterReady) { location.reload(); return false; }
        render();
        message('Acesso confirmado. Sua base está pronta para revisão.');
        if (!readyResolved) { readyResolved = true; resolveReady(Object.freeze({id: user.id, email: user.email})); }
        return true;
      } catch (error) {
        if (revision !== epoch) return false;
        if (error.status === 401) {
          state = {...state, user: null};
          revoke('invalid_session', 'Sua sessão terminou. Entre novamente para continuar.');
        } else if (error.code === 'email_not_verified' || error.code === 'email_reverification_required') revoke(error.code, friendlyError(error));
        else revoke(error.code || 'unavailable', 'Não foi possível validar seu acesso agora. Confira a conexão e clique em Verificar minha compra.');
        return false;
      } finally { running = null; planNextCheck(); }
    })();
    return running;
  }
  async function fetchCatalog() {
    if (!isActive() || !(await check())) throw new Error('Entre e confirme uma compra ativa para carregar o acervo.');
    const revision = epoch, userId = state.user.id;
    try {
      const catalog = await request('catalog');
      if (revision !== epoch || !isActive() || state.user?.id !== userId) throw new Error('access_changed');
      return catalog;
    } catch (error) {
      if (revision === epoch) revoke(error.code || 'unavailable', error.code === 'email_reverification_required' ? friendlyError(error) : 'O acesso ao acervo não pôde ser confirmado. Verifique sua compra para continuar.');
      throw new Error('Não foi possível carregar seu acervo autorizado.');
    }
  }
  async function signOut() {
    ++epoch;
    identity = null;
    state = {...state, user: null};
    revoke('signed_out', 'Você saiu da conta. Seu progresso está guardado para seu próximo acesso neste navegador.');
    setMode('login');
    try { await client.auth.signOut({scope: 'local'}); } catch (_) { /* Interface e acervo já bloqueados. */ }
  }
  async function submit(event) {
    event.preventDefault();
    if (submitting || !client || !$('access-auth-form').reportValidity()) return;
    const email = $('access-email').value.trim(), password = $('access-password').value;
    if ((mode === 'signup' || mode === 'update-password') && password !== $('access-password-confirm').value) {
      message('As senhas precisam ser iguais.', true); return;
    }
    const action = mode;
    submitting = true;
    $('access-submit').disabled = true;
    message('Aguarde um momento…');
    try {
      const redirectTo = new URL('./', location.href).href;
      if (action === 'signup') {
        const {error} = await client.auth.signUp({email, password, options: {emailRedirectTo: redirectTo}});
        if (error) throw error;
        setMode('login');
        message('Se o cadastro puder ser concluído, você receberá um e-mail de confirmação. Abra o link neste navegador e depois entre na sua conta. Confira também o spam.');
      } else if (action === 'recovery') {
        const {error} = await client.auth.resetPasswordForEmail(email, {redirectTo});
        if (error) throw error;
        message('Se houver uma conta correspondente, você receberá um link para escolher uma nova senha. Abra o link neste navegador.');
      } else if (action === 'update-password') {
        const {error} = await client.auth.updateUser({password});
        if (error) throw error;
        setMode('login');
        await signOut();
        message('Senha atualizada. Entre com sua nova senha para continuar.');
      } else {
        const {error} = await client.auth.signInWithPassword({email, password});
        if (error) throw error;
        $('access-password').value = '';
        await check();
      }
    } catch (error) { message(friendlyError(error), true); }
    finally { submitting = false; $('access-submit').disabled = false; }
  }
  function start() {
    const themeKey = 'pmdf:flashcards:standalone:v1:theme';
    const applyTheme = dark => {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      $('theme-toggle').textContent = dark ? 'Tema claro' : 'Tema escuro';
      $('theme-toggle').setAttribute('aria-pressed', String(dark));
    };
    let savedTheme;
    try { savedTheme = localStorage.getItem(themeKey); } catch (_) { /* Preferência desta sessão. */ }
    applyTheme(savedTheme ? savedTheme === 'dark' : Boolean(root.matchMedia?.('(prefers-color-scheme: dark)').matches));
    $('theme-toggle').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      applyTheme(dark);
      try { localStorage.setItem(themeKey, dark ? 'dark' : 'light'); } catch (_) { /* Preferência desta sessão. */ }
    });
    $('access-auth-form').addEventListener('submit', submit);
    $('access-show-login').addEventListener('click', () => setMode('login'));
    $('access-show-signup').addEventListener('click', () => setMode('signup'));
    $('access-show-recovery').addEventListener('click', () => setMode('recovery'));
    $('access-check').addEventListener('click', () => check());
    $('access-signout').addEventListener('click', signOut);
    const checkout = config.checkoutUrl;
    if (config.salesEnabled === true && typeof checkout === 'string' && /^https:\/\/pay\.hotmart\.com\/[A-Za-z0-9]+(?:[?#].*)?$/.test(checkout)) {
      $('access-buy').href = checkout;
      $('access-buy').removeAttribute('aria-disabled');
      $('access-buy').removeAttribute('tabindex');
      $('access-purchase-note').textContent = 'Pagamento único. O período de 6 meses começa na aprovação da compra.';
    } else $('access-buy').addEventListener('click', event => event.preventDefault());
    setMode('login');
    if (!root.supabase?.createClient || !/^https:\/\/[a-z]+\.supabase\.co$/.test(config.supabaseUrl || '') || !config.publishableKey) {
      message('O acesso está temporariamente indisponível. Tente novamente mais tarde.', true);
      $('access-submit').disabled = true; return;
    }
    client = root.supabase.createClient(config.supabaseUrl, config.publishableKey, {
      auth: {flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'pmdf:auth:v1'}
    });
    client.auth.onAuthStateChange((event, session) => {
      const nextIdentity = session?.user?.id || null;
      if (nextIdentity !== identity || event === 'SIGNED_OUT') {
        ++epoch;
        identity = nextIdentity;
        state = {...state, user: session?.user || null};
        revoke('session_changed');
      }
      if (event === 'PASSWORD_RECOVERY') {
        revoke('password_recovery');
        setMode('update-password');
        message('Escolha uma nova senha para sua conta.');
      } else setTimeout(() => { Promise.resolve(running).then(() => check()); }, 0);
    });
    root.addEventListener('focus', () => { if (state.user) check(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.user) check(); });
    root.addEventListener('offline', () => {
      ++epoch;
      revoke('offline', 'Conecte-se à internet para confirmar seu acesso e continuar.');
    });
    root.addEventListener('online', () => check());
    check();
  }
  root.PMDFAccess = Object.freeze({ready: () => readyPromise, isActive, check, fetchCatalog,
    userId: () => isActive() ? state.user?.id : null,
    storageKey: key => {
      if (!isActive() || !state.user?.id) throw new Error('Acesso não confirmado.');
      return 'pmdf:member:' + state.user.id + ':' + key;
    }});
  start();
})(window);
