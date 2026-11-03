/**
 * Método PMDF — teste REAL do site publicado, em Chromium via Playwright.
 * Não cria conta, não solicita credenciais nem testa uma GPU física.
 * Verifica a versão publicada byte-a-byte antes de executar as interações.
 * O teste de usuário autenticado simula somente o estado local NO NAVEGADOR
 * para não criar/alterar dados no Supabase; autenticação remota não é coberta.
 *
 * Execute: npm install --no-save playwright@1.57.0
 *          npx playwright install chromium
 *          node tests/online-e2e.mjs
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE=(process.env.PMDF_ONLINE_URL||'https://metodopmdf.github.io/metodo-pmdf/').replace(/\/?$/,'/');
const expected=readFileSync(new URL('../index.html',import.meta.url));
const digest=b=>createHash('sha256').update(b).digest('hex');
const expectedHash=digest(expected);
const output='test-artifacts';
mkdirSync(output,{recursive:true});
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const log=message=>console.log('[QA ONLINE] '+message);

async function waitForPublishedVersion(){
  const attempts=Number(process.env.PMDF_DEPLOY_ATTEMPTS||50);
  let last='';
  for(let i=0;i<attempts;i++){
    try{
      const request=await fetch(BASE+'?qa_build='+Date.now(),{
        headers:{'Cache-Control':'no-cache','Pragma':'no-cache'},
        signal:AbortSignal.timeout(15000)
      });
      assert.equal(request.status,200,'GitHub Pages não respondeu HTTP 200');
      const response=Buffer.from(await request.arrayBuffer());
      last=digest(response);
      if(last===expectedHash){
        log('Versão publicada corresponde ao index.html do commit testado ('+expectedHash.slice(0,12)+').');
        return;
      }
      log('GitHub Pages ainda serve outra revisão ('+last.slice(0,12)+'). Tentativa '+(i+1)+'/'+attempts+'.');
    }catch(e){last=String(e?.message||e);log('Consulta HTTP falhou: '+last);}
    await sleep(8000);
  }
  throw Error('A versão publicada não corresponde ao commit após '+attempts+' verificações. Atual='+last+', esperado='+expectedHash);
}
async function startSyntheticStudy(page){
  const result=await page.evaluate(()=>{
    // Sessão falsa existe apenas no contexto isolado deste teste de interface.
    // Não fornece token e não realiza login/registro no serviço remoto.
    window.eval("AUTH_USER={username:'qa_browser_roteiro',displayName:'Teste de navegação'};CUR={key:'lai',guide:BUILTIN_PMDF_GUIDES.lai,_poolCache:Object.create(null)}");
    window.beginStudies(false);
    return {logged:window.eval('AUTH_USER.username'),hasGuide:window.eval('CUR.guide.lawName')};
  });
  assert.equal(result.logged,'qa_browser_roteiro','A sessão de UI simulada não pôde ser criada');
  assert(result.hasGuide.includes('Acesso à Informação'),'Guia real de teste não selecionado');
  await page.locator('#tab-btn-questoes').click();
  await page.locator('#q-engine-gemini').click();
  await page.locator('#q-ai-backend').selectOption('safe');
  assert.equal(await page.locator('#q-ai-backend').inputValue(),'safe');
}
async function checkQuestionFlow(page,type){
  await page.locator('#q-format').selectOption(type);
  await page.locator('#q-source').selectOption('current');
  await page.locator('#q-generate-button').click();
  await page.waitForFunction(
    wanted=>{
      const panel=document.getElementById('q-panel');
      const options=document.querySelectorAll('#q-alternatives .q-choice').length;
      const status=document.getElementById('q-status')?.textContent||'';
      return !panel.classList.contains('hidden')&&status.includes('Modo seguro (regras locais)')&&
        (wanted==='CE'?options===2:(options===4||options===5));
    },
    type,{timeout:20000}
  );
  const number=await page.locator('#q-alternatives .q-choice').count();
  assert(type==='CE'?number===2:number===4||number===5,
    'Opções de '+type+' inconsistentes: '+number);
  const status=await page.locator('#q-status').innerText();
  assert.match(status,/Modo seguro \(regras locais\)/,'O modo seguro não foi realmente executado');
  assert(!status.includes('Falha de geração'),'O gerador apresentou aviso de falha');
  await page.locator('#q-alternatives .q-choice').first().click();
  const feedback=await page.locator('#q-feedback').innerText();
  assert.match(feedback,/Gabarito:/,'A resposta não revelou gabarito');
  assert.match(feedback,/Comentário:/,'A resposta não trouxe explicação');
  await page.locator('#q-feedback button').click();
  assert.match(await page.locator('#q-panel').innerText(),/Questão 2|Simulado concluído/,
    'A navegação para a próxima questão não funciona');
  log('Fluxo '+type+' online OK: '+number+' opções, gabarito, explicação e avanço.');
}
async function checkLongDocumentAndExhaustion(page){
  const law=Array.from({length:80},(_,i)=>
    'Art. '+(i+1)+'º O setor de fiscalização '+(i+1)+
    ' deve registrar cada decisão administrativa em documento próprio, deve apresentar motivação expressa, pode consultar a autoridade competente e deve assegurar que o relatório seja acessível aos interessados.'
  ).join('\n');
  await page.locator('#q-engine-gemini').click();
  await page.locator('#q-ai-backend').selectOption('safe');
  await page.locator('details.qstudio-paste summary').click();
  await page.locator('#q-inline-title').fill('Regulamento fictício de 80 dispositivos para QA online');
  await page.locator('#q-inline-text').fill(law);
  await page.locator('button[onclick="questionUseText()"]').click();
  await page.waitForFunction(()=>document.getElementById('q-document-indicator').textContent.includes('Regulamento fictício'),
    null,{timeout:20000});
  await page.locator('#q-format').selectOption('MC');
  await page.locator('#q-level').selectOption('intermediario');
  await page.locator('#q-source').selectOption('current');
  const identifiers=new Set();
  let seenReview=false,lastCount=0;
  for(let i=0;i<20;i++){
    const current=i===0?'#q-generate-button':'#q-next-button';
    await page.locator(current).click();
    await page.waitForFunction(prev=>{
      const q=window.eval('Q_STATE');
      return !!q&&q.engine==='adaptive'&&q.items.length>0&&
        String(q.items[0].law||'').includes('Regulamento fictício')&&
        (q.review||q.coverage.shown>prev);
    },lastCount,{timeout:20000});
    const result=await page.evaluate(()=>{
      const s=window.eval('Q_STATE');
      return {review:s.review||false,shown:s.coverage.shown,total:s.coverage.total,
        items:s.items.map(q=>({id:q.coverageId,answer:q.answer,options:q.options.length}))};
    });
    assert(result.items.every(q=>q.options===4||q.options===5),
      'Documento próprio retornou MC com alternativas inválidas');
    if(result.review){
      seenReview=true;
      assert.match(await page.locator('#q-status').innerText(),/REVISÃO/);
      break;
    }
    for(const item of result.items){
      assert(!identifiers.has(item.id),'Questão repetida antes da revisão: '+item.id);
      identifiers.add(item.id);
    }
    lastCount=result.shown;
  }
  assert(identifiers.size>=100,'O documento com 80 regras completas gerou menos de 100 questões MC distintas: '+identifiers.size);
  assert(seenReview,'A plataforma não reiniciou uma rodada explícita de revisão ao terminar a cobertura.');
  log('Documento fictício longo online: '+identifiers.size+
    ' questões de múltipla escolha distintas e reinício explícito da revisão (sem GPU).');
}
async function checkGeminiFrontendWithMock(page,viewport) {
  // Teste do código Gemini publicado com Edge Function simulada.
  // NÃO constitui chamada real à API do Google ou autenticação real.
  let mockCalls=0;
  await page.route('**/functions/v1/gemini-questions',async route=>{
    if(route.request().method()==='GET'){
      return route.fulfill({status:200,contentType:'application/json',
        body:JSON.stringify({available:true,provider:'Gemini',model:'gemini-3.5-flash-lite'})});
    }
    const payload=JSON.parse(route.request().postData());
    mockCalls++;
    const options=['A norma dispensa totalmente a motivação e o registro dos atos.',
      'A autoridade deve registrar e justificar as decisões administrativas.',
      'A competência é irrelevante para a validação dos procedimentos.',
      'A transparência é vedada independentemente do teor da informação.'];
    const item={
      statement:'Considerando o regulamento administrativo e o controle de legalidade, qual alternativa corresponde à regra de fundamentação expressa prevista para os atos públicos do segmento '+mockCalls+'?',
      evidence:payload.source.text.slice(0,100),
      answer:'B',
      explanation:'A fonte exige registro documental e fundamentação expressa nos procedimentos praticados pela autoridade competente.',
      topic:'Dever de motivação',subtopic:'Requisitos da atuação estatal',
      options,optionAnalysis:[
        'Incorreta: contraria a obrigação expressa de motivar.',
        'Correta: reproduz o dever de fundamentar e documentar.',
        'Incorreta: ignora a competência exigida no texto.',
        'Incorreta: afasta injustificadamente a transparência.'
      ]
    };
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({questions:[item],provider:'Gemini',model:'gemini-3.5-flash-lite',
        quota:{userRemaining:10,globalRemaining:40}})});
  });
  await page.locator('#q-engine-gemini').click();
  await page.locator('#q-ai-backend').selectOption('gemini');
  await page.locator('#q-format').selectOption('MC');
  await page.locator('#q-source').selectOption('current');
  await page.evaluate(()=>window.eval("SB_SESSION={access_token:'fake.jwt.token.for_chromium_test',expires_at:Math.floor(Date.now()/1000)+3600};"));
  await page.locator('#q-generate-button').click();
  await page.waitForFunction(()=>{
    const q=window.eval('Q_STATE');
    return q?.engine==='gemini'&&q.items.length>0&&q.items[0].origin==='gemini';
  },null,{timeout:20000});
  const result=await page.evaluate(()=>{
    const q=window.eval('Q_STATE');
    return {count:q.items.length,optionCount:q.items[0].options.length,
      origin:q.items[0].origin,answer:q.items[0].answer};
  });
  assert(result.count>=1&&result.optionCount===4&&result.answer==='B');
  assert(mockCalls>=1,'Frontend não enviou pedidos ao gateway Gemini simulado');
  await page.locator('#q-alternatives .q-choice').nth(1).click();
  assert.match(await page.locator('#q-feedback').innerText(),/Gabarito:/);
  assert.match(await page.locator('#q-feedback').innerText(),/Trecho literal:/);
  log('Gemini '+viewport+' integrado ao site REAL com servidor de IA SIMULADO, sem uso de GPU.');
  await page.unroute('**/functions/v1/gemini-questions');
}
async function run(){
  await waitForPublishedVersion();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const records=[];
  try{
    for(const variant of [
      {name:'desktop',viewport:{width:1366,height:900}},
      {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true,
        userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'}
    ]){
      const context=await browser.newContext({
        viewport:variant.viewport,deviceScaleFactor:1,
        ...(variant.userAgent?{userAgent:variant.userAgent,isMobile:variant.isMobile,hasTouch:variant.hasTouch}:{})
      });
      const page=await context.newPage();
      const issues=[];
      page.on('pageerror',e=>issues.push('Erro JavaScript: '+String(e?.message||e)));
      page.on('crash',()=>issues.push('O processo de renderização do navegador falhou.'));
      try{
        const response=await page.goto(BASE+'?qa_browser='+Date.now(),
          {waitUntil:'domcontentloaded',timeout:60000});
        assert.equal(response?.status(),200,'Site não abriu em '+variant.name);
        await page.waitForFunction(()=>typeof window.startQuestions==='function'&&
          typeof window.beginStudies==='function'&&!!window.PMDFQuestionAI,
          null,{timeout:30000});
        assert(await page.locator('#account-form').count(),'Formulário de acesso ausente');
        assert(await page.locator('#q-ai-backend').count(),'Controles de geração ausentes');
        assert.equal(await page.locator('#q-ai-backend').inputValue(),'gemini',
          'Gemini deve ser o padrão, sem GPU local. O backend poderá estar desativado.');
        const themeBefore=await page.evaluate(()=>document.body.dataset.theme);
        await page.locator('.welcome-actions button[onclick="toggleTheme()"]').click();
        assert.notEqual(await page.evaluate(()=>document.body.dataset.theme),themeBefore,
          'Alternância de tema não alterou a aparência');
        await startSyntheticStudy(page);
        await checkQuestionFlow(page,'CE');
        await checkQuestionFlow(page,'MC');
        if(variant.name==='desktop')await checkLongDocumentAndExhaustion(page);
        await checkGeminiFrontendWithMock(page,variant.name);
        assert.deepEqual(issues,[],'Erro não tratado no navegador: '+issues.join(' | '));
        await page.screenshot({path:output+'/'+variant.name+'-ok.png',fullPage:true});
        records.push({viewport:variant.name,result:'PASS',flow:'guest/theme + authenticated-UI-simulated + CE + MC'+
          ' + Gemini com servidor simulado (sem credenciais reais)'});
        log('Navegação REAL '+variant.name+': APROVADA.');
      }catch(e){
        records.push({viewport:variant.name,result:'FAIL',error:String(e?.stack||e),issues});
        try{await page.screenshot({path:output+'/'+variant.name+'-failure.png',fullPage:true});}catch(_){}
        throw e;
      }finally{await context.close();}
    }
  }finally{
    writeFileSync(output+'/resultado-online.json',JSON.stringify({
      site:BASE,commit:process.env.GITHUB_SHA||'local',timestamp:new Date().toISOString(),records
    },null,2));
    await browser.close();
  }
  log('APROVADO: website publicado, versão exata, tema, CE/MC, Gemini com backend simulado em Chromium desktop/móvel.');
}
await run();
