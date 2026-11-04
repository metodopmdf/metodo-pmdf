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
const expectedNeural=readFileSync(new URL('../assets/pmdf-neural-questions.js',import.meta.url));
const expectedFlashcards=readFileSync(new URL('../assets/pmdf-neural-flashcards.js',import.meta.url));
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
      if(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===expectedHash){
        const asset=await fetch(BASE+'assets/pmdf-neural-questions.js?qa_build='+Date.now(),{
          headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
        if(asset.ok&&hash(Buffer.from(await asset.arrayBuffer()))===hash(expectedNeural)){
          const flash=await fetch(BASE+'assets/pmdf-neural-flashcards.js?qa_build='+Date.now(),{
            headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
          if(flash.ok&&hash(Buffer.from(await flash.arrayBuffer()))===hash(expectedFlashcards))return true;
        }
      }
    }catch(e){console.log('[QA ONLINE] Verificação indisponível: '+String(e.message||e));}
    await pause(8000);
  }
  throw Error('GitHub Pages ainda não publicou exatamente o index.html deste commit.');
}
async function setup(page){
  const response=await page.goto(BASE+'?qa_browser='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  assert.equal(response?.status(),200,'Site não respondeu HTTP 200');
  await page.waitForFunction(()=>typeof window.beginStudies==='function'&&
    typeof window.PMDFNeuralQuestions?.start==='function'&&
    typeof window.PMDFNeuralFlashcards?.buildAsync==='function',{},{timeout:30000});
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
async function checkUsability(page,view){
  for(const t of ['leis','questoes','anki','resultados','redacao']){
    await page.locator('#tab-btn-'+t).click();
    assert.equal(await page.locator('#tab-btn-'+t).getAttribute('aria-selected'),'true','ARIA active tab '+t);
    assert.equal(await page.locator('#tab-btn-'+t).getAttribute('tabindex'),'0','Focus order '+t);
    assert.equal(await page.locator('#tab-'+t).getAttribute('role'),'tabpanel','Tab panel semantics '+t);
    assert(await page.locator('#pmdf-context-'+t).isVisible(),'Tool guidance '+t);
  }
  await page.locator('#tab-btn-leis').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-btn-questoes').getAttribute('aria-selected'),'true','Keyboard ArrowRight');
  await page.keyboard.press('End');
  assert.equal(await page.locator('#tab-btn-redacao').getAttribute('aria-selected'),'true','Keyboard End');
  await page.locator('#tab-btn-leis').click();
  assert(!(await page.locator('#role-select').isVisible()),'Advanced law filters should start closed');
  await page.locator('#pmdf-advanced-law > summary').click();
  assert(await page.locator('#role-select').isVisible(),'Advanced law filters cannot be opened');
  await page.locator('#pmdf-primary-jump').click();
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'generate-btn','Primary action navigation');
  await page.locator('#tab-btn-questoes').click();
  assert(await page.locator('#q-generate-button').isVisible(),'Question generation button hidden');
  const reset=page.locator('#q-extra-actions button[onclick="resetQuestionCycle()"]');
  assert(!(await reset.isVisible()),'Secondary actions should be collapsed');
  await page.locator('#q-extra-actions > summary').click();
  assert(await reset.isVisible(),'Secondary actions not reachable');
  assert(!(await page.locator('#exam-answer-source').isVisible()),'Import tools should start collapsed');
  await page.locator('#auto-questions-section > summary').click();
  assert(await page.locator('#exam-answer-source').isVisible(),'Import tools not reachable');
  if(view.name==='mobile'){
    const menu=await page.locator('nav.pmdf-app-tabs').evaluate(el=>({
      scroll:el.scrollWidth,width:el.clientWidth,
      taps:[...el.querySelectorAll('button')].map(b=>b.getBoundingClientRect().width)
    }));
    assert(menu.scroll<=menu.width+2,'Mobile navigation overflow: '+JSON.stringify(menu));
    assert(menu.taps.every(n=>n>=88),'Mobile navigation touch targets too narrow');
  }
}
async function generate(page,format){
  await page.locator('#q-format').selectOption(format);
  // O estado do simulado anterior permanece visível até a geração assíncrona
  // terminar. Aguardar apenas o tipo permite falso positivo MC -> MIX.
  await page.evaluate(()=>{window.__pmdfQaPreviousState=window.eval('Q_STATE');});
  await page.locator('#q-generate-button').click();
  await page.waitForFunction(wanted=>{
    const q=window.eval('Q_STATE');
    return !!q&&q!==window.__pmdfQaPreviousState&&q.engine==='neural'&&q.items.length>0&&
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
  if(format==='MIX')assert(new Set(result.types).size===2,
    'Misto sem os dois formatos: '+JSON.stringify({types:result.types,coverage:result.shown,available:result.total}));
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
  await page.locator('#anki-source').selectOption('all');
  await page.locator('#anki-generation-mode').selectOption('advanced');
  await page.locator('#anki-mode').selectOption('all');
  await page.locator('#anki-batch-size').selectOption('50');
  await page.locator('button[onclick="startAnki()"]').click();
  await page.waitForFunction(()=>document.querySelector('#anki-panel .anki-question')?.textContent?.length>35,
    null,{timeout:20000});
  assert((await page.evaluate(()=>window.eval('ANKI_STATE.cards.length')))<=50,
    'Quantidade de flashcards por sessão ultrapassou o limite');
  const cards=await page.evaluate(()=>window.eval('ANKI_BANK.map(c=>({law:c.law,kind:c.modality,source:c.source}))'));
  assert(cards.length>=50,'Novo banco de flashcards insuficiente');
  assert(cards.some(c=>c.kind==='Básico (P&R)'),'Sem perguntas diretas');
  assert(cards.some(c=>c.kind==='Cloze (Lacuna)'),'Sem lacunas');
  assert(cards.some(c=>c.kind==='Gatilho de Banca'),'Sem julgamento de banca');
  assert(cards.every(c=>c.source?.length>20),'Cartão sem fonte');
  assert.equal(new Set(cards.slice(0,26).map(c=>c.law)).size,26,'Distribuição das 26 leis insuficiente');
  assert.match(await page.locator('#anki-coverage').innerText(),/Modalidades:/,'Relatório de cobertura ausente');
  const first=await page.locator('#anki-panel .anki-question').innerText();
  assert(first.length>35,'Flashcard sem pergunta substantiva');
  assert(!first.includes('Identifique o instituto, seu requisito principal'),
    'Flashcard genérico antigo reapareceu');
  await page.locator('button[onclick="revealAnki()"]').click();
  assert(await page.locator('#anki-panel .anki-proof').isVisible(),'Fundamento do verso ausente');
  assert((await page.locator('#anki-panel .anki-proof').innerText()).length>45,'Fundamento incompleto');
  assert(await page.locator('button[onclick="gradeAnki(false)"]').isVisible(),
    'Falta botão de avaliação honesta');
  assert.equal(await page.locator('#anki-panel .anki-grade-choices button').count(),4,
    'Revisão estilo Anki deve mostrar 4 avaliações');
  const before=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  await page.locator('button[onclick="gradeAnki(false)"]').click();
  const state=await page.evaluate(id=>({box:window.eval('getCardBox('+JSON.stringify(id)+').box'),
    wrong:window.eval('ANKI_STATE.wrong')}),before);
  assert.equal(state.box,0,'Cartão marcado como não lembrado avançou a caixa');
  assert.equal(state.wrong,1,'Cartão não lembrado não foi contabilizado');
  await page.locator('button[onclick="revealAnki()"]').click();
  const hardId=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  await page.locator('button[onclick="gradeAnkiRating(\'hard\')"]').click();
  const hardState=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+')'),hardId);
  assert(hardState.due>Date.now()+11*3600000&&hardState.due<Date.now()+13*3600000,
    'Difícil não agendou a revisão em aproximadamente 12 horas');
  await page.locator('button[onclick="revealAnki()"]').click();
  const easyId=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  const oldBox=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+').box'),easyId);
  await page.locator('button[onclick="gradeAnkiRating(\'easy\')"]').click();
  const easyState=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+')'),easyId);
  assert.equal(easyState.box,Math.min(4,oldBox+2),'Fácil não avançou duas caixas');
  assert(easyState.due>Date.now(),'Fácil não programou revisão futura');
  const csvWait=page.waitForEvent('download',{timeout:15000});
  await page.locator('#anki-export-csv').click();
  const csv=await csvWait;
  assert.match(csv.suggestedFilename(),/\.csv$/,'Exportação CSV incompatível');
  const tsvWait=page.waitForEvent('download',{timeout:15000});
  await page.locator('#anki-export-tsv').click();
  const tsv=await tsvWait;
  assert.match(tsv.suggestedFilename(),/\.tsv$/,'Exportação TSV incompatível');
  const clozeWait=page.waitForEvent('download',{timeout:15000});
  await page.locator('#anki-export-cloze').click();
  const clozeFile=await clozeWait,clozeText=readFileSync(await clozeFile.path(),'utf8');
  assert.match(clozeText,/#notetype:Cloze/);
  assert.match(clozeText,/\{\{c1::/);
  const basicWait=page.waitForEvent('download',{timeout:15000});
  await page.locator('#anki-export-basic').click();
  const basicFile=await basicWait,basicText=readFileSync(await basicFile.path(),'utf8');
  assert.match(basicText,/#notetype:Basic/);
  assert(!basicText.includes('{{c1::'),'Notas Cloze foram exportadas como Basic');
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
  await page.locator('#tab-btn-anki').click();
  await page.locator('#anki-source').selectOption('current');
  await page.locator('#anki-generation-mode').selectOption('advanced');
  await page.locator('#anki-mode').selectOption('all');
  await page.locator('#anki-batch-size').selectOption('100');
  await page.locator('#anki-start').click();
  await page.waitForFunction(()=>window.eval('ANKI_STATE')?.cards?.length>=90,
    null,{timeout:45000});
  const flash=await page.evaluate(()=>window.eval('ANKI_BANK.length'));
  assert(flash>90,'Documento com 90 dispositivos produziu poucos flashcards');
  assert.match(await page.locator('#anki-generation-status').innerText(),/Cobertura:/);
  return {first:first.length,second:second.length,flashcards:flash};
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
        await checkUsability(page,view);
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
  console.log('QA ONLINE PASS: navegação, acessibilidade, controles opcionais, CE/MC/MIX, flashcards, desktop e mobile.');
}
await main();
