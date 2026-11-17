/**
 * Fluxo real de estudo intermediário, em Chromium desktop/mobile.
 * Sem login remoto, transações Supabase nem alterações em dados privados.
 * QA simula somente a abertura da UI de estudo; não valida autenticação.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const url=(process.env.PMDF_ONLINE_URL||'https://metodopmdf.github.io/metodo-pmdf/').replace(/\/?$/,'/');
const local=url.startsWith('http://127.0.0.1:');
const output='test-artifacts';mkdirSync(output,{recursive:true});
const outcomes=[],hash=x=>createHash('sha256').update(x).digest('hex');
const pause=t=>new Promise(resolve=>setTimeout(resolve,t));
async function isPublished(){
 if(local)return;
 const expected=readFileSync(new URL('../index.html',import.meta.url));
 const app=readFileSync(new URL('../assets/pmdf-app.js',import.meta.url));
 const editorial=readFileSync(new URL('../assets/pmdf-summary-editorial.js',import.meta.url));
 const css=readFileSync(new URL('../assets/pmdf-ui-intermediate-20261116.css',import.meta.url));
 const required=[['index.html',expected],['assets/pmdf-app.js',app],
  ['assets/pmdf-summary-editorial.js',editorial],['assets/pmdf-ui-intermediate-20261116.css',css]];
 const attempts=Number(process.env.PMDF_DEPLOY_ATTEMPTS||45);
 for(let i=0;i<attempts;i++){
  try{
   let okay=true;
   for(const [file,bytes]of required){
    const response=await fetch(url+(file==='index.html'?'':file)+'?revision='+Date.now(),{
      headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
    if(!response.ok||hash(Buffer.from(await response.arrayBuffer()))!==hash(bytes)){okay=false;break;}
   }
   if(okay)return;
  }catch(e){console.log('Aguardando Pages: '+String(e.message||e));}
  await pause(7500);
 }
 throw new Error('A versão publicada não coincide com os arquivos deste commit.');
}
function log(view,step,detail={}){outcomes.push({view,step,ok:true,...detail});console.log('PASS',view,step);}
async function testViewport(browser,{name,width,height}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,hasTouch:width<600,
  reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();
 page.setDefaultTimeout(25000);
 const failures=[];
 page.on('pageerror',e=>failures.push(String(e)));
 const resp=await page.goto(url+'?test_user=intermediate&v='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
 assert.equal(resp?.status(),200,'A página não respondeu HTTP 200');
 await page.waitForFunction(()=>typeof window.showTab==='function'&&typeof window.selectAndLoadLaw==='function'&&
  !!window.PMDFStrategicSummaries&&!!window.PMDFClozeStrategic&&!!window.PMDFVisualEngine&&
  typeof window.PMDFNeuralFlashcards?.buildAsync==='function',null,{timeout:45000});
 log(name,'módulos principais carregados');
 // Navegação de usuário sem autenticação: exibir apenas a UI pública,
 // preservando banco remoto e sem alterar o estado autenticado.
 await page.evaluate(()=>{
   document.body.classList.remove('landing-active');
   window.showTab('leis');
 });
 const tabs=page.locator('nav.pmdf-app-tabs [role="tab"]:visible');
 assert.equal(await tabs.count(),4,'Devem existir quatro módulos públicos, incluindo banco de questões');
 assert(!await page.locator('#tab-btn-questoes').isVisible(),'Questões deveriam estar pausadas');
 assert(!await page.locator('#tab-btn-resultados').isVisible(),'Resultados deveriam estar pausados');
 assert(await page.locator('#tab-btn-acervo').isVisible(),'Banco de questões deve estar disponível');
 log(name,'quatro módulos públicos e recursos pausados');
 await page.locator('#btn-law-cppm').click();
 assert((await page.locator('#current-doc-title').innerText()).includes('CPPM')||
        (await page.locator('#current-doc-title').innerText()).includes('Militar'),
        'Seleção do CPPM não carregou o guia');
 log(name,'seleção de lei');
 const select=page.locator('#summary-format-toolbar');
 for(const [mode,marker]of [
   ['full','.pmdf-editorial-full'],['bullets','.pmdf-editorial-bullets'],
   ['visual','.pmdf-visual-card'],['infographic','.pmdf-info-report'],['cloze','.pmdf-cloze-report'],
   ['flash','.pmdf-flash-batch']
 ]){
  await select.selectOption(mode);
  assert(await page.locator('#printable-area '+marker).count()>0,'Formato indisponível: '+mode);
  log(name,'formato '+mode);
  if(mode==='full'||mode==='bullets'){
    const content=await page.locator('#printable-area').innerText();
    assert(content.length>1800,'Resumo encurtado: '+mode);
    assert((await page.locator('.pmdf-editorial-topic').count())>=5,'Dispositivos insuficientes');
  }
  if(mode==='cloze'){
    const gap=page.locator('#printable-area .pmdf-cloze-gap').first();
    assert(await gap.count()>0,'Lacunas estratégicas indisponíveis');
    await gap.click();
    assert.equal(await gap.getAttribute('aria-pressed'),'true','Lacuna não revelou a resposta');
    await gap.click();
    assert.equal(await gap.getAttribute('aria-pressed'),'false','Lacuna não foi ocultada');
    log(name,'revelar e ocultar lacuna');
  }
  if(mode==='flash'){
    const details=page.locator('#printable-area .pmdf-flash-batch').first();
    assert(await details.count()>0,'Nenhum lote de flashcards');
    assert(await details.locator('.study-card').count()>0,'Lote de cartões vazio');
  }
 }
 // Alternância de tema e contraste base.
 const before=await page.evaluate(()=>document.body.dataset.theme);
 await page.evaluate(()=>window.toggleTheme());
 const after=await page.evaluate(()=>document.body.dataset.theme);
 assert.notEqual(after,before,'Alternância de tema falhou');
 await page.locator('#tab-btn-anki').click();
 assert.equal(await page.locator('#tab-btn-anki').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('.pmdf-anki-fields > label > select').count(),5);
 await page.locator('#anki-source').selectOption('cfo-gst');
 assert(await page.locator('#anki-cfo-controls').isVisible(),'Filtros do acervo ANKI devem aparecer');
 assert.equal((await page.locator('#anki-source option[value="cfo-gst"]').textContent()).trim(),'📚 ANKI');
 assert.equal(await page.locator('#anki-cfo-import').count(),0,'Não deve existir campo para envio de arquivos');
 await page.waitForFunction(()=>document.querySelector('#anki-cfo-status')?.textContent?.includes('2.624'),null,{timeout:45000});
 assert.equal(await page.locator('#anki-cfo-disciplina option').count(),23,'O banco deve carregar 22 disciplinas automaticamente');
 await page.locator('#anki-source').selectOption('current');
 assert(!await page.locator('#anki-cfo-controls').isVisible(),'Filtros ANKI devem recolher');
 const exports=page.locator('.pmdf-anki-export-details');
 assert(!await page.locator('#anki-export-csv').isVisible(),'Exportações devem iniciar recolhidas');
 await exports.locator('summary').click();
 assert(await page.locator('#anki-export-csv').isVisible(),'Exportações não abriram');
 assert.equal(await page.locator('.pmdf-anki-export-options button').count(),4);
 log(name,'configuração e exportações de flashcards');
 await page.locator('#anki-source').selectOption('current');
 await page.locator('#anki-card-style').selectOption('questions');
 await page.locator('#anki-mode').selectOption('all');
 await page.locator('#anki-batch-size').selectOption('25');
 await page.locator('#anki-start').click();
 await page.locator('#anki-panel button[data-pmdf-onclick="revealAnki()"]').waitFor({state:'visible',timeout:60000});
 assert(await page.locator('#anki-panel .anki-question').innerText().then(x=>x.length>20),
  'Pergunta de revisão muito curta');
 await page.locator('#anki-panel button[data-pmdf-onclick="revealAnki()"]').click();
 assert(await page.locator('#anki-panel .anki-proof').isVisible(),'Fundamento não apareceu no verso');
 assert((await page.locator('#anki-panel .anki-proof').innerText()).length>30,'Fundamento incompleto');
 await page.locator('#anki-nav-next').click();
 await page.locator('#anki-nav-prev').click();
 assert(await page.locator('#anki-nav-prev').isDisabled(),'Anterior não voltou ao primeiro cartão');
 log(name,'revisão com revelar, próximo e anterior');
 await page.locator('#tab-btn-redacao').click();
 await page.locator('#essay-theme').fill('A relevância dos direitos fundamentais no trabalho policial');
 await page.locator('#essay-motiv').fill('Aborde legalidade, proporcionalidade e respeito à dignidade humana.');
 await page.locator('#essay-text').fill(
  'A atuação policial deve observar a Constituição Federal, que assegura direitos e garantias fundamentais. O cumprimento da lei constitui condição indispensável à legitimidade da ação estatal.\n\n'+
  'Nesse sentido, a formação continuada dos profissionais de segurança pública contribui para decisões fundamentadas e proporcionais. Tal preparo permite maior respeito às competências e às restrições legais.\n\n'+
  'Além disso, os mecanismos de controle favorecem a transparência institucional e a proteção da população. Sua utilização deve considerar as circunstâncias de cada ocorrência.\n\n'+
  'Portanto, é necessário fortalecer a capacitação dos agentes e os procedimentos de fiscalização, com o objetivo de conciliar a segurança coletiva e os direitos fundamentais.'
 );
 await page.locator('#essay-btn').click();
 await page.locator('#essay-out').waitFor({state:'visible',timeout:45000}).catch(()=>{});
 assert((await page.locator('#essay-out').innerText()).length>100,'Correção local de redação vazia');
 log(name,'correção local de redação');
 const overflow=await page.evaluate(()=>({
  width:document.documentElement.clientWidth,
  documentWidth:document.documentElement.scrollWidth,
  tabs:document.querySelector('nav.pmdf-app-tabs')?.getBoundingClientRect().width
 }));
 assert(overflow.documentWidth<=overflow.width+3,'Rolagem horizontal indevida: '+JSON.stringify(overflow));
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 const problems=axe.violations.filter(x=>x.impact==='critical').map(x=>({id:x.id,targets:x.nodes.map(y=>y.target)}));
 writeFileSync(output+'/axe-intermediario-'+name+'.json',JSON.stringify({
  viewport:{width,height},violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.length}))
 },null,2));
 assert.equal(problems.length,0,'Violação crítica de acessibilidade: '+JSON.stringify(problems));
 log(name,'sem rolagem horizontal e sem violações críticas de acessibilidade',
  {wcagFindings:axe.violations.length});
 await page.screenshot({path:output+'/intermediario-'+name+'.png',fullPage:true,animations:'disabled'});
 writeFileSync(output+'/page-errors-'+name+'.json',JSON.stringify(failures,null,2));
 assert.equal(failures.length,0,'Erros globais JS: '+failures.join('; '));
 await context.close();
}
await isPublished();
const browser=await chromium.launch({headless:true});
try{
 for(const view of [{name:'desktop',width:1440,height:900},
  {name:'tablet',width:768,height:1024},{name:'celular',width:390,height:844}]){
  await testViewport(browser,view);
 }
 console.log('QA INTERMEDIÁRIO: '+outcomes.length+' verificações concluídas');
 writeFileSync(output+'/intermediate-qa.json',JSON.stringify(outcomes,null,2));
}catch(error){
 writeFileSync(output+'/intermediate-qa.json',JSON.stringify({outcomes,error:String(error),stack:error.stack},null,2));
 throw error;
}finally{await browser.close();}
