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
import AxeBuilder from '@axe-core/playwright';

const BASE=(process.env.PMDF_ONLINE_URL||'https://metodopmdf.github.io/metodo-pmdf/').replace(/\/?$/,'/');
const expected=readFileSync(new URL('../index.html',import.meta.url));
const expectedNeural=readFileSync(new URL('../assets/pmdf-neural-questions.js',import.meta.url));
const expectedFlashcards=readFileSync(new URL('../assets/pmdf-neural-flashcards.js',import.meta.url));
const expectedApp=readFileSync(new URL('../assets/pmdf-app.js',import.meta.url));
const expectedGuides=readFileSync(new URL('../assets/pmdf-guides.js',import.meta.url));
const expectedBase=readFileSync(new URL('../assets/pmdf-tailwind.css',import.meta.url));
const expectedStyles=readFileSync(new URL('../assets/pmdf-components.css',import.meta.url));
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
          if(flash.ok&&hash(Buffer.from(await flash.arrayBuffer()))===hash(expectedFlashcards)){
            const assets=[
              ['assets/pmdf-app.js',expectedApp],['assets/pmdf-guides.js',expectedGuides],['assets/pmdf-tailwind.css',expectedBase],
              ['assets/pmdf-components.css',expectedStyles]
            ];
            let confirmed=true;
            for(const [path,content] of assets){
              const res=await fetch(BASE+path+'?qa_build='+Date.now(),{
                headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});
              if(!res.ok||hash(Buffer.from(await res.arrayBuffer()))!==hash(content)){confirmed=false;break;}
            }
            if(confirmed)return true;
          }
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
  const secret=page.locator('#account-password');
  assert.equal(await secret.getAttribute('type'),'password','Senha deve iniciar oculta');
  await secret.fill('Senha-de-auditoria-nao-real-123');
  const toggle=page.locator('#account-password-toggle');
  assert.equal(await toggle.getAttribute('type'),'button','Olho não pode enviar o formulário');
  await toggle.click();
  assert.equal(await secret.getAttribute('type'),'text','Olho não revelou a senha');
  assert.equal(await toggle.getAttribute('aria-pressed'),'true','ARIA do olho não foi atualizado');
  await toggle.click();
  assert.equal(await secret.getAttribute('type'),'password','Olho não ocultou a senha novamente');
  await toggle.click();
  await page.locator('#account-switch').click();
  assert.equal(await secret.getAttribute('type'),'password','Mudar para cadastro não ocultou a senha');
  await page.locator('#account-switch').click();
  assert.equal(await page.locator('#account-submit').getAttribute('type'),'submit','Login não restaurado');
  const oldTheme=await page.evaluate(()=>document.body.dataset.theme);
  await page.locator('.welcome-actions button[data-pmdf-onclick="toggleTheme()"]').click();
  assert.notEqual(await page.evaluate(()=>document.body.dataset.theme),oldTheme,'Troca de tema falhou');
  const themeColor=await page.locator('#pmdf-theme-color').getAttribute('content');
  assert.equal(themeColor,(await page.evaluate(()=>document.body.dataset.theme))==='light'?'#f6f8fc':'#071020',
    'Navegador não acompanha a cor do tema');
  await page.evaluate(()=>{
    window.eval("AUTH_USER={username:'qa_chromium_local',displayName:'Teste de interface'}; CUR={key:'lai',guide:BUILTIN_PMDF_GUIDES.lai,_poolCache:Object.create(null)}");
    window.beginStudies(false);
  });
  await page.locator('#tab-btn-questoes').click();
  await page.locator('#q-engine-neural').click();
  await page.locator('#q-source').selectOption('current');
  await page.locator('#q-neural-target').selectOption('30');
}
// Auditoria WCAG automatizada; resultados completos ficam anexados ao CI.
async function auditAccessibility(page,view,phase){
  const results=await new AxeBuilder({page})
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const violations=results.violations.map(v=>({
    id:v.id,impact:v.impact,description:v.help,
    nodes:v.nodes.slice(0,8).map(n=>({target:n.target,summary:n.failureSummary}))
  }));
  writeFileSync(output+'/axe-'+view.name+'-'+phase+'.json',JSON.stringify({
    at:new Date().toISOString(),violations,passed:results.passes.length
  },null,2));
  const critical=violations.filter(v=>v.impact==='critical');
  const significant=violations.filter(v=>v.impact==='critical'||v.impact==='serious');
  assert.equal(significant.length,0,'WCAG AA: violações graves '+JSON.stringify(significant).slice(0,1000));
  return {violations:violations.length,critical:critical.length,issues:violations.map(v=>v.id)};
}
async function checkUsability(page,view){
  for(const t of ['leis','questoes','anki','resultados','redacao']){
    await page.locator('#tab-btn-'+t).click();
    assert.equal(await page.locator('#tab-btn-'+t).getAttribute('aria-selected'),'true','ARIA active tab '+t);
    assert.equal(await page.locator('#tab-btn-'+t).getAttribute('tabindex'),'0','Focus order '+t);
    assert.equal(await page.locator('#tab-'+t).getAttribute('role'),'tabpanel','Tab panel semantics '+t);
    assert(await page.locator('#pmdf-context-'+t).isVisible(),'Tool guidance '+t);
    await auditAccessibility(page,view,'light-tab-'+t);
  }
  // Teclado e diálogos: foco inicial, Tab circular, Escape e devolução do foco.
  await page.locator('#tab-btn-leis').focus();
  await page.evaluate(()=>{
    window.__pmdfInjected=false;
    window.openModal('Auditoria de acessibilidade',
      '<button id="qa-dialog-action" type="button">Ação de teste</button>'+
      '<img src="x" onerror="window.__pmdfInjected=true" alt="">'+
      '<a id="qa-unsafe-url" href="javascript:window.__pmdfInjected=true">Link bloqueado</a>'+
      '<script>window.__pmdfInjected=true<\\/script>');
  });
  assert.equal(await page.locator('#gen-modal img').first().getAttribute('onerror'),null,
    'Sanitizador preservou manipulador de evento malicioso');
  assert.equal(await page.locator('#qa-unsafe-url').getAttribute('href'),null,
    'Sanitizador preservou esquema javascript:');
  assert.equal(await page.evaluate(()=>window.__pmdfInjected),false,
    'HTML injetado executou script');
  assert.equal(await page.evaluate(()=>
    window.pmdfSafeHtml('<button data-pmdf-onclick="logoutAccount()">Injetado</button>').includes('data-pmdf-onclick')),false,
    'HTML não confiável preservou ação privilegiada');
  assert(await page.locator('#gen-modal').isVisible(),'Modal genérico não abriu');
  assert.equal(await page.locator('#gen-modal').getAttribute('aria-modal'),'true','Modal sem semântica ARIA');
  assert(await page.evaluate(()=>!!document.activeElement?.closest('#gen-modal')),'Foco escapou do diálogo');
  await page.locator('#qa-dialog-action').focus();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),
    'Fechar janela','Tab não retornou ao primeiro elemento do modal');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#gen-modal').isVisible()),'Escape não fechou o diálogo genérico');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'tab-btn-leis',
    'Fechamento não devolveu o foco ao acionador');
  await page.locator('#tab-btn-leis').focus();
  await page.evaluate(()=>window.openPromptModal());
  assert(await page.locator('#prompt-modal').isVisible(),'Modal de prompt não abriu');
  assert(await page.evaluate(()=>!!document.activeElement?.closest('#prompt-modal')),'Foco não entrou no modal de prompt');
  await page.keyboard.press('Escape');
  assert(!(await page.locator('#prompt-modal').isVisible()),'Escape não fechou o prompt');
  assert.equal(await page.evaluate(()=>document.activeElement?.id),'tab-btn-leis','Foco do prompt não voltou');
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
  const reset=page.locator('#q-extra-actions button[data-pmdf-onclick="resetQuestionCycle()"]');
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
  assert(await page.locator('#q-nav-next').isEnabled(),'Próximo bloqueado após resposta');
  assert(await page.locator('#q-nav-prev').isDisabled(),'Anterior habilitado na primeira questão');
  const totals=await page.evaluate(()=>{const q=window.eval('Q_STATE');return [q.hits,q.wrong,q.blank,q.pending]});
  await page.locator('#q-nav-next').click();
  assert.equal(await page.evaluate(()=>window.eval('Q_STATE.index')),1,'Avanço da questão falhou');
  await page.locator('#q-nav-prev').click();
  assert.equal(await page.evaluate(()=>window.eval('Q_STATE.index')),0,'Retorno à questão falhou');
  assert.match(await page.locator('#q-feedback').innerText(),/Gabarito:/,'Correção perdida ao voltar');
  assert(await page.locator('#q-alternatives .q-choice').first().isDisabled(),'Questão já respondida ficou editável');
  assert.deepEqual(await page.evaluate(()=>{const q=window.eval('Q_STATE');return [q.hits,q.wrong,q.blank,q.pending]}),
    totals,'Voltar duplicou a contagem da questão');
  await page.locator('#q-nav-next').click();
  return result;
}
async function checkFlashcards(page){
  await page.locator('#tab-btn-anki').click();
  await page.locator('#anki-source').selectOption('all');
  await page.locator('#anki-generation-mode').selectOption('advanced');
  await page.locator('#anki-mode').selectOption('all');
  await page.locator('#anki-batch-size').selectOption('50');
  await page.locator('button[data-pmdf-onclick="startAnki()"]').click();
  await page.waitForFunction(()=>document.querySelector('#anki-panel .anki-question')?.textContent?.length>35,
    null,{timeout:20000});
  assert((await page.evaluate(()=>window.eval('ANKI_STATE.cards.length')))<=50,
    'Quantidade de flashcards por sessão ultrapassou o limite');
  const cards=await page.evaluate(()=>window.eval('ANKI_BANK.map(c=>({law:c.law,kind:c.modality,source:c.source,front:c.front,reference:c.reference,tip:c.tip,pitfall:c.pitfall,application:c.application,cardKind:c.kind}))'));
  assert(cards.length>=50,'Novo banco de flashcards insuficiente');
  assert(cards.some(c=>c.kind==='Básico (P&R)'),'Sem perguntas diretas');
  assert(cards.some(c=>c.kind==='Cloze (Lacuna)'),'Sem lacunas');
  assert(cards.some(c=>c.kind==='Gatilho de Banca'),'Sem julgamento de banca');
  assert(cards.every(c=>c.source?.length>20),'Cartão sem fonte');
  assert(cards.every(c=>c.cardKind!=='Síntese expressa'),'Modelo de cartão sem pergunta voltou');
  assert(cards.every(c=>c.front?.trim()!==c.reference?.trim()),'Card só com título legal');
  assert(cards.every(c=>c.tip?.length>=12),'Flashcard sem dica de estudo');
  assert(cards.some(c=>c.pitfall?.length>15),'Faltam pegadinhas de concurso');
  assert.equal(new Set(cards.slice(0,26).map(c=>c.law)).size,26,'Distribuição das 26 leis insuficiente');
  assert.match(await page.locator('#anki-coverage').innerText(),/Modalidades:/,'Relatório de cobertura ausente');
  const first=await page.locator('#anki-panel .anki-question').innerText();
  assert(first.length>35,'Flashcard sem pergunta substantiva');
  assert(!first.includes('Identifique o instituto, seu requisito principal'),
    'Flashcard genérico antigo reapareceu');
  await page.locator('button[data-pmdf-onclick="revealAnki()"]').click();
  assert(await page.locator('#anki-panel .anki-proof').isVisible(),'Fundamento do verso ausente');
  assert(await page.locator('#anki-panel .anki-learn-aid').count()>=1,'Verso sem orientação prática');
  assert(await page.locator('#anki-nav-next').isVisible(),'Botão próximo ausente no flashcard');
  assert(await page.locator('#anki-nav-prev').isDisabled(),'Retornar antes do primeiro cartão não foi bloqueado');
  assert((await page.locator('#anki-panel .anki-proof').innerText()).length>45,'Fundamento incompleto');
  assert(await page.locator('button[data-pmdf-onclick="gradeAnki(false)"]').isVisible(),
    'Falta botão de avaliação honesta');
  assert.equal(await page.locator('#anki-panel .anki-grade-choices button').count(),4,
    'Revisão estilo Anki deve mostrar 4 avaliações');
  const before=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  await page.locator('button[data-pmdf-onclick="gradeAnki(false)"]').click();
  const state=await page.evaluate(id=>({box:window.eval('getCardBox('+JSON.stringify(id)+').box'),
    wrong:window.eval('ANKI_STATE.wrong')}),before);
  assert.equal(state.box,0,'Cartão marcado como não lembrado avançou a caixa');
  assert.equal(state.wrong,1,'Cartão não lembrado não foi contabilizado');
  await page.locator('#anki-nav-prev').click();
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.index')),0,'Retorno a flashcard anterior falhou');
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.ratings[0]')),'again','Nota anterior não preservada');
  assert.equal(await page.locator('#anki-panel .anki-grade-choices button').count(),0,
    'Retorno permitiu avaliar cartão já pontuado novamente');
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.wrong')),1,'Retorno duplicou erros');
  await page.locator('#anki-nav-next').click();
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.index')),1,'Próximo não retornou ao ponto anterior');
  await page.locator('button[data-pmdf-onclick="revealAnki()"]').click();
  const hardId=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  await page.locator('button[data-pmdf-onclick="gradeAnkiRating(\'hard\')"]').click();
  const hardState=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+')'),hardId);
  assert(hardState.due>Date.now()+11*3600000&&hardState.due<Date.now()+13*3600000,
    'Difícil não agendou a revisão em aproximadamente 12 horas');
  await page.locator('button[data-pmdf-onclick="revealAnki()"]').click();
  const easyId=await page.evaluate(()=>window.eval('ANKI_STATE.cards[ANKI_STATE.index].id'));
  const oldBox=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+').box'),easyId);
  await page.locator('button[data-pmdf-onclick="gradeAnkiRating(\'easy\')"]').click();
  const easyState=await page.evaluate(id=>window.eval('getCardBox('+JSON.stringify(id)+')'),easyId);
  assert.equal(easyState.box,Math.min(4,oldBox+2),'Fácil não avançou duas caixas');
  assert(easyState.due>Date.now(),'Fácil não programou revisão futura');
  const rated=await page.evaluate(()=>window.eval('ANKI_STATE.seen'));
  const beforeSkip=await page.evaluate(()=>window.eval('ANKI_STATE.index'));
  await page.locator('#anki-nav-next').click();
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.index')),beforeSkip+1,'Próximo flashcard não avançou');
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.seen')),rated,'Pular cartão alterou contagem');
  await page.locator('#anki-nav-prev').click();
  assert.equal(await page.evaluate(()=>window.eval('ANKI_STATE.index')),beforeSkip,'Anterior após pulo falhou');
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
  await page.locator('button[data-pmdf-onclick="questionUseText()"]').click();
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
async function verifyCsp(browser){
  const context=await browser.newContext();
  try{
    const page=await context.newPage();
    const res=await page.goto(BASE+'?qa_csp='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
    assert.equal(res?.status(),200,'CSP: publicação indisponível');
    const result=await page.evaluate(()=>{
      window.__pmdfUnsafeInlineMarker=0;
      const button=document.createElement('button');
      button.setAttribute('onclick','window.__pmdfUnsafeInlineMarker=1');
      document.body.appendChild(button);button.click();button.remove();
      const script=document.createElement('script');
      script.textContent='window.__pmdfUnsafeInlineMarker=2';
      document.body.appendChild(script);script.remove();
      return window.__pmdfUnsafeInlineMarker;
    });
    assert.equal(result,0,'CSP não bloqueou scripts e eventos inline');
    // axe injeta o analisador no DOM; apenas esta fase usa bypass depois do teste CSP.
    const devtools=await context.newCDPSession(page);
    await devtools.send('Page.setBypassCSP',{enabled:true});
    await page.reload({waitUntil:'domcontentloaded'});
    await auditAccessibility(page,{name:'landing'},'initial');
  } finally {await context.close();}
}
async function main(){
  await published();
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    await verifyCsp(browser);
    for(const view of [
      {name:'desktop',viewport:{width:1366,height:900}},
      {name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}
    ]){
      const context=await browser.newContext({viewport:view.viewport,
        ...(view.isMobile?{isMobile:true,hasTouch:true}:{}),deviceScaleFactor:1});
      const page=await context.newPage();
      await page.addInitScript(()=>{
        // PerformanceObserver captura Web Vitals sem bibliotecas nem rastreamento pessoal.
        window.__pmdfVitals={lcp:null,cls:0,inp:0};
        try{new PerformanceObserver(list=>{
          for(const item of list.getEntries())window.__pmdfVitals.lcp=Math.round(item.startTime);
        }).observe({type:'largest-contentful-paint',buffered:true});}catch(_){}
        try{new PerformanceObserver(list=>{
          for(const item of list.getEntries())if(!item.hadRecentInput)window.__pmdfVitals.cls+=item.value;
        }).observe({type:'layout-shift',buffered:true});}catch(_){}
        try{new PerformanceObserver(list=>{
          for(const item of list.getEntries())if(item.interactionId)
            window.__pmdfVitals.inp=Math.max(window.__pmdfVitals.inp,item.duration||0);
        }).observe({type:'event',durationThreshold:40,buffered:true});}catch(_){}
      });
      // A execução funcional necessita manipular um estado autenticado fictício por window.eval.
      // CSP é verificada separadamente acima; o bypass existe SOMENTE no navegador de QA.
      const devtools=await context.newCDPSession(page);
      await devtools.send('Page.setBypassCSP',{enabled:true});
      const errors=[];
      page.on('pageerror',err=>errors.push(String(err.message||err)));
      page.on('crash',()=>errors.push('Chromium renderer crashed'));
      try{
        await setup(page);
        await checkUsability(page,view);
        const a11y=await auditAccessibility(page,view,'app');
        const currentTheme=await page.evaluate(()=>document.body.dataset.theme||'dark');
        await page.evaluate(()=>window.applyTheme('dark'));
        const darkTabs={};
        for(const tab of ['leis','questoes','anki','resultados','redacao']){
          await page.locator('#tab-btn-'+tab).click();
          darkTabs[tab]=await auditAccessibility(page,view,'dark-tab-'+tab);
        }
        await page.locator('#tab-btn-questoes').click();
        const darkA11y=await auditAccessibility(page,view,'dark');
        await page.evaluate(theme=>window.applyTheme(theme),currentTheme);
        const ce=await generate(page,'CE');
        const mc=await generate(page,'MC');
        const mix=await generate(page,'MIX');
        await checkFlashcards(page);
        const large=view.name==='desktop'?await longSource(page):null;
        assert.deepEqual(errors,[],'Erros no navegador: '+errors.join(' | '));
        // Medições observacionais de Web Vitals (sem travar CI por variação da rede).
        const perf=await page.evaluate(()=>({
          fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,
          navigation:performance.getEntriesByType('navigation')[0]?.duration??null,
          resources:performance.getEntriesByType('resource').length,
          transfer:performance.getEntriesByType('resource').reduce((n,r)=>n+(r.transferSize||0),0),
          lcp:window.__pmdfVitals?.lcp??null,
          cls:window.__pmdfVitals?.cls??null,
          inp:window.__pmdfVitals?.inp??null
        }));
        writeFileSync(output+'/performance-'+view.name+'.json',JSON.stringify(perf,null,2));
        await page.screenshot({path:output+'/'+view.name+'-ok.png',fullPage:true});
        report.push({viewport:view.name,status:'PASS',ce:ce.num,mc:mc.num,mix:mix.num,large,a11y,darkA11y});
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
