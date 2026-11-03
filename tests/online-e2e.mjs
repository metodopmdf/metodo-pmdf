/**
 * QA real no GitHub Pages em Chromium desktop + mobile.
 * Verifica versão publicada, tema, modos neural CE/MC/misto,
 * anexação textual, gabarito, comentário e lotes inéditos.
 * A sessão autenticada é simulada SOMENTE na UI; sem persistência remota.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.PMDF_ONLINE_URL||'https://metodopmdf.github.io/metodo-pmdf/').replace(/\/?$/,'/');
const expected=readFileSync(new URL('../index.html',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
const output='test-artifacts';
mkdirSync(output,{recursive:true});
const report=[];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function published(){
  const expectedHash=hash(expected);
  for(let i=0;i<Number(process.env.PMDF_DEPLOY_ATTEMPTS||65);i++){
    try{
      const response=await fetch(BASE+'?qa_build='+Date.now(),{
        headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
      if(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===expectedHash)return true;
    }catch(e){console.log('[QA ONLINE] Verificação indisponível: '+String(e.message||e));}
    await pause(8000);
  }
  throw Error('GitHub Pages ainda não publicou exatamente o index.html deste commit.');
}
async function setup(page){
  const response=await page.goto(BASE+'?qa_browser='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'Site não respondeu HTTP 200');
  await page.waitForFunction(()=>typeof window.beginStudies==='function'&&
    typeof window.PMDFNeuralQuestions?.start==='function',{},{timeout:30000});
  assert.equal(await page.locator('#q-engine-neural').count(),1,'Seletor neural ausente');
  const oldTheme=await page.evaluate(()=>document.body.dataset.theme);
  await page.locator('.welcome-actions button[onclick="toggleTheme()"]').click();
  assert.notEqual(await page.evaluate(()=>document.body.dataset.theme),oldTheme,'Troca de tema falhou');
  await page.evaluate(()=>{
    window.eval("AUTH_USER={username:'qa_chromium_local',displayName:'Teste de interface'}; CUR={key:'lai',guide:BUILTIN_PMDF_GUIDES.lai,_poolCache:Object.create(null)}");
    window.beginStudies(false);
  });
  await page.locator('#tab-btn-questoes').click();
  await page.locator('#q-engine-neural').click();
  await page.locator('#q-source').selectOption('current');
  await page.locator('#q-neural-target').selectOption('30');
}
async function generate(page,format){
  await page.locator('#q-format').selectOption(format);
  await page.locator('#q-generate-button').click();
  await page.waitForFunction(wanted=>{
    const q=window.eval('Q_STATE');
    return !!q&&q.engine==='neural'&&q.items.length>0&&
      q.items.every(item=>wanted==='MIX'?['CE','MC'].includes(item.type):item.type===wanted);
  },format,{timeout:30000});
  const result=await page.evaluate(()=>{
    const q=window.eval('Q_STATE');
    return {types:q.items.map(x=>x.type),num:q.items.length,
      items:q.items.map(x=>({id:x.coverageId,answer:x.answer,options:x.options?.length||0})),
      shown:q.coverage.shown,total:q.coverage.total};
  });
  assert(result.num>0,'Geração vazia em '+format);
  for(const item of result.items)assert(format==='CE'?['C','E'].includes(item.answer):
    format==='MC'?'ABCDE'.includes(item.answer)&&item.options===5:
    ['C','E','A','B','C','D','E'].includes(item.answer),'Gabarito inválido '+format);
  if(format==='MIX')assert(new Set(result.types).size===2,'Misto sem os dois formatos');
  const choices=await page.locator('#q-alternatives .q-choice').count();
  assert(choices===2||choices===5,'Quantidade de botões de resposta inválida: '+choices);
  await page.locator('#q-alternatives .q-choice').first().click();
  assert.match(await page.locator('#q-feedback').innerText(),/Gabarito:/,'Correção não exibida');
  assert.match(await page.locator('#q-feedback').innerText(),/Comentário:/,'Fundamentação não exibida');
  await page.locator('#q-feedback button').click();
  return result;
}
async function checkFlashcards(page){
  await page.locator('#tab-btn-anki').click();
  await page.locator('#anki-mode').selectOption('all');
  await page.locator('button[onclick="startAnki()"]').click();
  await page.waitForFunction(()=>document.querySelector('#anki-panel .anki-question')?.textContent?.length>35,
    null,{timeout:20000});
  const first=await page.locator('#anki-panel .anki-question').innerText();
  assert(first.length>35,'Flashcard sem pergunta substantiva');
  assert(!first.includes('Identifique o instituto, seu requisito principal'),
    'Flashcard genérico antigo reapareceu');
  await page.locator('button[onclick="revealAnki()"]').click();
  assert(await page.locator('#anki-panel .anki-proof').isVisible(),'Fundamento do verso ausente');
  assert((await page.locator('#anki-panel .anki-proof').innerText()).length>45,'Fundamento incompleto');
  assert(await page.locator('button[onclick="gradeAnki(false)"]').isVisible(),
    'Falta botão de avaliação honesta');
  const before=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  await page.locator('button[onclick="gradeAnki(false)"]').click();
  const state=await page.evaluate(id=>({box:window.eval('getCardBox('+JSON.stringify(id)+').box'),
    wrong:window.eval('ANKI_STATE.wrong')}),before);
  assert.equal(state.box,0,'Cartão marcado como não lembrado avançou a caixa');
  assert.equal(state.wrong,1,'Cartão não lembrado não foi contabilizado');
  await page.locator('#tab-btn-questoes').click();
}
async function longSource(page){
  const rules=Array.from({length:90},(_,i)=>
    'Art. '+(i+1)+'º A autoridade pública deverá motivar a decisão administrativa do procedimento '+(i+1)+
    ', poderá ordenar diligências adicionais e deve observar o prazo legal de 10 dias, ressalvadas as exceções expressas neste regulamento fictício.'
  ).join('\n');
  await page.locator('details.qstudio-paste summary').click();
  await page.locator('#q-inline-title').fill('Regulamento fictício de 90 dispositivos QA');
  await page.locator('#q-inline-text').fill(rules);
  await page.locator('button[onclick="questionUseText()"]').click();
  await page.waitForFunction(()=>document.getElementById('q-document-indicator')?.textContent?.includes('Regulamento fictício de 90'),
    null,{timeout:15000});
  await page.locator('#q-format').selectOption('CE');
  await page.locator('#q-neural-target').selectOption('100');
  await page.locator('#q-generate-button').click();
  await page.waitForFunction(()=>window.eval('Q_STATE')?.engine==='neural'&&
    window.eval('Q_STATE').items.length>=80,null,{timeout:45000});
  const first=await page.evaluate(()=>window.eval('Q_STATE').items.map(q=>q.coverageId));
  assert.equal(new Set(first).size,first.length,'Primeiro lote contém repetição');
  await page.locator('#q-next-button').click();
  await page.waitForFunction(previous=>{
    const q=window.eval('Q_STATE');
    return q?.engine==='neural'&&q.coverage.shown>previous;
  },first.length,{timeout:45000});
  const second=await page.evaluate(()=>window.eval('Q_STATE').items.map(q=>q.coverageId));
  assert(second.every(x=>!first.includes(x)),'Lote seguinte repetiu questões antes da cobertura');
  assert(first.length+second.length>=120,'Documento com 90 regras gerou poucas questões verificáveis');
  return {first:first.length,second:second.length};
}
async function main(){
  await published();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const view of [
      {name:'desktop',viewport:{width:1366,height:900}},
      {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
    ]){
      const context=await browser.newContext({viewport:view.viewport,
        ...(view.isMobile?{isMobile:true,hasTouch:true}:{}),deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',err=>errors.push(String(err.message||err)));
      page.on('crash',()=>errors.push('Chromium renderer crashed'));
      try{
        await setup(page);
        const ce=await generate(page,'CE');
        const mc=await generate(page,'MC');
        const mix=await generate(page,'MIX');
        await checkFlashcards(page);
        const large=view.name==='desktop'?await longSource(page):null;
        assert.deepEqual(errors,[],'Erros no navegador: '+errors.join(' | '));
        await page.screenshot({path:output+'/'+view.name+'-ok.png',fullPage:true});
        report.push({viewport:view.name,status:'PASS',ce:ce.num,mc:mc.num,mix:mix.num,large});
      }catch(e){
        report.push({viewport:view.name,status:'FAIL',error:String(e.stack||e),errors});
        try{await page.screenshot({path:output+'/'+view.name+'-failure.png',fullPage:true});}catch(_){}
        throw e;
      }finally{await context.close();}
    }
  }finally{
    writeFileSync(output+'/resultado-online.json',JSON.stringify({site:BASE,at:new Date().toISOString(),
      sha:process.env.GITHUB_SHA||'local',report},null,2));
    await browser.close();
  }
  console.log('QA ONLINE PASS: versão publicada, tema, neural CE/MC/MIX, flashcards avaliados, gabarito, lote inédito, desktop e celular.');
}
await main();
