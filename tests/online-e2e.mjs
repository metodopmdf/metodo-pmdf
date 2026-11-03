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
  await page.locator('#q-engine-webllm').click();
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
        assert.equal(await page.locator('#q-ai-backend').inputValue(),'safe',
          'O modo inicial deve ser seguro e sem GPU');
        const themeBefore=await page.evaluate(()=>document.body.dataset.theme);
        await page.locator('.welcome-actions button[onclick="toggleTheme()"]').click();
        assert.notEqual(await page.evaluate(()=>document.body.dataset.theme),themeBefore,
          'Alternância de tema não alterou a aparência');
        await startSyntheticStudy(page);
        await checkQuestionFlow(page,'CE');
        await checkQuestionFlow(page,'MC');
        if(variant.name==='mobile'){
          // Simular escolha experimental em aparelho móvel: proibir modelo pesado.
          await page.locator('#q-ai-backend').selectOption('experimental');
          await page.locator('#q-generate-button').click();
          await page.waitForFunction(()=>document.getElementById('q-ai-backend').value==='safe',
            null,{timeout:12000});
          assert.match(await page.locator('#q-status').innerText(),/Modo seguro/,
            'A proteção do dispositivo móvel não gerou o lote seguro');
          log('Fallback móvel sem WebGPU confirmado em interface real.');
        }
        assert.deepEqual(issues,[],'Erro não tratado no navegador: '+issues.join(' | '));
        await page.screenshot({path:output+'/'+variant.name+'-ok.png',fullPage:true});
        records.push({viewport:variant.name,result:'PASS',flow:'guest/theme + authenticated-UI-simulated + CE + MC'+
          (variant.name==='mobile'?' + fallback sem WebGPU':'')});
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
  log('APROVADO: website publicado, versão exata, tema, navegação, CE, MC e fallback móvel.');
}
await run();
