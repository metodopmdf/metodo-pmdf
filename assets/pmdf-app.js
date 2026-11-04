
        // ============================================================================
        // BASE DE CONHECIMENTO TÁTICA INTEGRADA (AS 5 LEIS PRINCIPAIS DA PMDF)
        // Garante funcionamento 100% instantâneo e sem falhas mesmo em arquivo local
        // ============================================================================
        // O catálogo BUILTIN_PMDF_GUIDES é carregado por assets/pmdf-guides.js.


        // =====================================================
        // NÚCLEO (reconstruído): utilitários, nível, IA, render
        // =====================================================
        const $ = id => document.getElementById(id);
        const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        // Defesa em profundidade: conteúdo importado não pode introduzir scripts,
        // eventos HTML, URLs executáveis nem atributos de ações privilegiadas.
        // "trustedActions" é reservado exclusivamente a templates montados pelo app.
        function pmdfSafeHtml(raw, trustedActions=false) {
            const html=String(raw??'');
            const root=document.createElement('template');
            if (!root?.content?.querySelectorAll) return html; // mocks de teste sem DOM HTML
            root.innerHTML=html;
            root.content.querySelectorAll('script,iframe,frame,object,embed,base,meta,link,foreignObject').forEach(el=>el.remove());
            root.content.querySelectorAll('*').forEach(el=>{
                for(const attr of Array.from(el.attributes)){
                    const name=attr.name.toLowerCase(),value=attr.value.trim();
                    const isUrl=['href','src','action','formaction','xlink:href','poster'].includes(name);
                    const dangerousUrl=isUrl&&(/^(?:javascript|vbscript|file):/i.test(value)||
                        /^data:(?!image\/(?:png|jpeg|gif|webp);base64,)/i.test(value));
                    const dangerousStyle=name==='style'&&/(?:expression\s*\(|url\s*\(\s*['"]?\s*(?:javascript|vbscript):|@import)/i.test(value);
                    const forbiddenAction=!trustedActions&&(name.startsWith('data-pmdf-on')||name==='data-pmdf-special');
                    if(name.startsWith('on')||name==='srcdoc'||name==='formaction'||dangerousUrl||dangerousStyle||forbiddenAction)
                        el.removeAttribute(attr.name);
                }
                if(el.tagName==='A'&&el.target==='_blank'){
                    el.rel='noopener noreferrer';
                }
            });
            return root.innerHTML;
        }

        const BACKUP_KEY_RE = /^(lvl|summaryFormat|lastKey|sim:stats|sim:errs|pmdf:session:v4|exam:imports|pmdf:results:events|pmdf:results:aggregates|q:coverage:v2:|essay:totals|(st|fc|leitner|leitnerDue|note|custom|essay):)/; // bancos de IA extensos ficam no dispositivo
        const SCRIPT_CACHE=Object.create(null);
        let AUTH_USER=null,CLOUD_SAVE_TIMER=null,CLOUD_SAVE_BUSY=false,CLOUD_DIRTY=false,CLOUD_LAST_ERROR='',CLOUD_MUTATION_SERIAL=0;
        const SYNC_LOCAL_META='__pmdf_sync_meta_v1',SYNC_REMOTE_META='__pmdfSync';
        const namespaceKey=k=>AUTH_USER?'pmdf:account:'+AUTH_USER.username+':'+k:'pmdf:visitor:'+k;
        const getSyncMeta=()=>{try{const m=JSON.parse(localStorage.getItem(namespaceKey(SYNC_LOCAL_META))||'{}');return m&&typeof m==='object'&&!Array.isArray(m)?m:{};}catch(e){return {};}};
        const putSyncMeta=m=>{try{localStorage.setItem(namespaceKey(SYNC_LOCAL_META),JSON.stringify(m));}catch(e){}};
        const syncEntry=x=>typeof x==='number'?{ts:x,deleted:false}:x&&typeof x==='object'?{ts:Number(x.ts)||0,deleted:!!x.deleted}:{ts:0,deleted:false};
        function markSyncMutation(key,deleted=false){
            const versions=getSyncMeta(),old=syncEntry(versions[key]);
            versions[key]={ts:Math.max(Date.now(),old.ts+1),deleted};putSyncMeta(versions);CLOUD_MUTATION_SERIAL++;
        }
        const store={
            get(k){try{return localStorage.getItem(namespaceKey(k));}catch(e){return null;}},
            set(k,v){try{localStorage.setItem(namespaceKey(k),String(v));if(AUTH_USER&&BACKUP_KEY_RE.test(k)){markSyncMutation(k);scheduleCloudSave();}return true;}catch(e){return false;}},
            del(k){try{localStorage.removeItem(namespaceKey(k));if(AUTH_USER&&BACKUP_KEY_RE.test(k)){markSyncMutation(k,true);scheduleCloudSave();}}catch(e){}}
        };
        const accountData=()=>{if(!AUTH_USER)return {};const data={},prefix='pmdf:account:'+AUTH_USER.username+':';
            for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(prefix)){const k=key.slice(prefix.length);if(BACKUP_KEY_RE.test(k))data[k]=localStorage.getItem(key);}}
            return data;};
        function mergeProgressData(remote,local,localMeta=getSyncMeta()){
            remote=remote&&typeof remote==='object'&&!Array.isArray(remote)?remote:{};
            local=local&&typeof local==='object'&&!Array.isArray(local)?local:{};
            const remoteMeta=remote[SYNC_REMOTE_META]&&typeof remote[SYNC_REMOTE_META]==='object'?remote[SYNC_REMOTE_META]:{};
            const data={},versions={},keys=new Set([...Object.keys(remote),...Object.keys(local),...Object.keys(remoteMeta),...Object.keys(localMeta)]);
            for(const k of keys){
                if(!BACKUP_KEY_RE.test(k))continue;
                const rv=syncEntry(remoteMeta[k]),lv=syncEntry(localMeta[k]),localHas=typeof local[k]==='string',remoteHas=typeof remote[k]==='string';
                const localWins=lv.ts>rv.ts||(lv.ts===rv.ts&&!remoteHas&&localHas);
                const winner=localWins?lv:rv,content=localWins?local[k]:remote[k];
                if(winner.ts)versions[k]={ts:winner.ts,deleted:!!winner.deleted};
                if(!winner.deleted&&typeof content==='string')data[k]=content;
            }
            data[SYNC_REMOTE_META]=versions;return {data,versions};
        }
        function applyProgressSnapshot(snapshot){
            if(!AUTH_USER)return;
            const values=snapshot.data||{},versions=snapshot.versions||{};
            const prior=accountData();
            for(const k of Object.keys(prior))if(!Object.prototype.hasOwnProperty.call(values,k))try{localStorage.removeItem(namespaceKey(k));}catch(e){}
            for(const [k,v] of Object.entries(values))if(BACKUP_KEY_RE.test(k)&&typeof v==='string')try{localStorage.setItem(namespaceKey(k),v);}catch(e){}
            putSyncMeta(versions);
        }
        const fmtSeconds=n=>{n=Math.max(0,Math.round(Number(n)||0));return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');};
        function cloudStatus(message,issue=false){const t=$('cloud-save-status');if(t){t.textContent=message;t.classList.toggle('text-rose-300',issue);}const m=$('account-msg');if(m&&issue&&AUTH_USER)m.textContent=message;}
        function scheduleCloudSave(){if(!AUTH_USER)return;CLOUD_DIRTY=true;cloudStatus('◌ Alterações pendentes');clearTimeout(CLOUD_SAVE_TIMER);CLOUD_SAVE_TIMER=setTimeout(flushCloudSave,5000);}
        async function flushCloudSave(){
            if(!AUTH_USER||CLOUD_SAVE_BUSY)return;
            const owner=AUTH_USER.username;clearTimeout(CLOUD_SAVE_TIMER);CLOUD_SAVE_BUSY=true;CLOUD_DIRTY=false;cloudStatus('↻ Sincronizando...');
            try{
                const response=await accountFetch('progresso',{method:'PUT',body:JSON.stringify({data:accountData()})});
                if(!response.ok){const d=await response.json().catch(()=>({}));throw Error(d.error||'HTTP '+response.status);}
                CLOUD_LAST_ERROR='';if(AUTH_USER?.username===owner)cloudStatus('✓ Progresso salvo na nuvem');
            }catch(e){CLOUD_DIRTY=true;CLOUD_LAST_ERROR=e.message;cloudStatus('⚠ Não sincronizado. Dados locais preservados.',true);}
            finally{CLOUD_SAVE_BUSY=false;if(CLOUD_DIRTY&&AUTH_USER?.username===owner)CLOUD_SAVE_TIMER=setTimeout(flushCloudSave,12000);}
        }
        const LEVELS_SAFE_LEVEL = v => ['iniciante','intermediario','avancado'].includes(v) ? v : 'intermediario';
        let CUR = { key: null, guide: null, _poolCache: Object.create(null) }, LEVEL = LEVELS_SAFE_LEVEL(store.get('lvl')), TAB = 'leis';

        function toast(m, t = 'info') {
            const box = $('toast-container');
            if (!box) return;
            // Evita empilhamento ilimitado de avisos durante operações e cliques repetidos.
            if (box.children?.length >= 4) box.firstElementChild?.remove?.();
            const d = document.createElement('div');
            d.setAttribute('role', t === 'error' ? 'alert' : 'status');
            d.className = 'pointer-events-none px-4 py-3 rounded-xl text-sm shadow-xl border ' + (t === 'error' ? 'bg-red-950 border-red-500/50 text-red-100' : t === 'ok' ? 'bg-emerald-950 border-emerald-500/50 text-emerald-100' : 'bg-[#0E1B33] border-slate-600 text-slate-100');
            d.textContent = String(m ?? '').slice(0, 600);
            box.appendChild(d);
            setTimeout(() => d.remove(), 5000);
        }

        // ---------- Nível do candidato ----------
        const LEVELS = {
            iniciante: { label: 'Iniciante', pomo: [25, 5], simN: 500, desc: 'Direto ao ponto: resumo simples, só o que mais cai, passo a passo. Itens secundários ficam recolhidos.',
                road: '<b>Roteiro:</b> 1) leia o Resumo; 2) estude só a “Alta Incidência” e marque ✔; 3) treine os Flashcards; 4) faça o Simulado; 5) revise o Caderno de Erros.',
                essay: 'Iniciante: explique cada erro e cada conceito de forma didática, com exemplos curtos, e priorize os 3 ajustes de maior ganho de nota.',
                instr: 'NÍVEL INICIANTE: use linguagem simples e frases curtas; defina cada termo jurídico na primeira vez que aparecer; use analogias do cotidiano policial; limite-se a 4 conceitos-chave; priorize apenas o essencial de alta incidência; não aprofunde jurisprudência nem controvérsias doutrinárias.' },
            intermediario: { label: 'Intermediário', pomo: [40, 8], simN: 500, desc: 'Equilíbrio entre teoria e prova: alta e média incidência, comparativos e filtro por banca.',
                road: '<b>Meta:</b> dominar alta e média incidência; compare institutos parecidos, use o filtro de banca e deixe o Caderno de Erros dizer o que revisar.',
                essay: 'Intermediário: seja objetivo e técnico, mostrando o erro, a regra e a correção, sem rodeios.',
                instr: 'NÍVEL INTERMEDIÁRIO: use linguagem técnica acessível; traga 5 a 6 conceitos-chave com os artigos correspondentes; inclua comparativos entre institutos parecidos e os principais prazos/penas; cite jurisprudência apenas quando sumulada.' },
            avancado: { label: 'Avançado', pomo: [50, 10], simN: 500, desc: 'Tudo aberto: exceções, jurisprudência STF/STJ e pegadinhas finas, começando pelo que a banca mais explora.',
                road: '<b>Estratégia:</b> comece pelas pegadinhas e jurisprudência, use o Simulado para achar lacunas e feche com baixa incidência e flashcards completos.',
                essay: 'Avançado: seja sucinto e rigoroso, aponte apenas o que impede a nota máxima, com fundamento normativo preciso.',
                instr: 'NÍVEL AVANÇADO: use terminologia técnica e densidade alta; traga 6 a 8 conceitos-chave com exceções, controvérsias doutrinárias, entendimentos do STF/STJ e as pegadinhas mais sutis da banca; assuma que o candidato já domina o básico e vá direto aos detalhes que diferenciam acertos de erros.' }
        };
        function paintLevel() {
            Object.keys(LEVELS).forEach(k => {
                const b = $('lvl-' + k); if (!b) return;
                b.className = 'lvl-btn px-3 py-2 rounded-xl text-sm border transition ' + (k === LEVEL ? 'bg-[#D4AF37] text-[#050B16] font-bold border-[#E5C158]' : 'bg-[#0E1B33] text-slate-300 border-[#1E2E4F] hover:border-[#D4AF37]/60');
            });
            $('level-desc').textContent = LEVELS[LEVEL].desc;
        }
        function setLevel(l) { if(!LEVELS[l])return; LEVEL = l; store.set('lvl', l); paintLevel(); if (CUR.guide) rerenderPreservingStudyState(); }

        // =====================================================================
        // MOTOR LOCAL: análise didática de leis, questões e redações
        // =====================================================================
        const lcf = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
        const ucf = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
        const lcSmart = s => /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) ? lcf(s) : s;
        const STOP = new Set('para como esse essa isso pelo pela pelos pelas entre sobre sendo desde ainda onde qual quais mais menos muito muita também porque quando seus suas dele dela deles delas numa nesse nessa neste nesta aquele aquela outro outra outros outras cada todo toda todos todas após ante contra durante mediante perante segundo conforme deve devem pode podem será serão está estão ser são'.split(' '));
        const stem = w => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().slice(0, 5);
        const kw = t => [...new Set((String(t || '').match(/[A-Za-zÀ-ÿ]{5,}/g) || []).filter(w => !STOP.has(w.toLowerCase())).map(stem))];
        const LETTER = '[A-Za-zÀ-ÿ]';
        const wordRe = (w, fl = 'g') => new RegExp('(?<!' + LETTER + ')' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!' + LETTER + ')', fl);

        function lawShort(g) {
            const n = g.lawName || '', m = n.match(/\(([^)]*)\)\s*$/);
            if (m) { const p = m[1].split(/\s+-\s+/), last = p[p.length - 1].trim(); if (last.length <= 24) return last; }
            return n.replace(/\s*\(.*$/, '').trim();
        }
        const artHead = a => String(a).split(/\s+[—–]\s+|\s+\(/)[0].trim();

        // ---------- 1. Análise automática do texto de uma lei ----------
        const RESTR = /(?<![A-Za-zÀ-ÿ])(somente|apenas|exclusivamente|exceto|salvo|vedad[oa]s?|proibid[oa]s?|nunca|sempre|independe|independentemente|obrigat[óo]ri[oa]s?|inafiançáve(?:l|is)|imprescritíve(?:l|is)|insuscetíve(?:l|is)|hediondo|incondicionada|automátic[oa]|vedação|compete|competência)(?![A-Za-zÀ-ÿ])/gi;
        const PRAZO = /\b\d+(?:\.\d+)?\s*(?:\([^)]*\)\s*)?(?:dias|dia|meses|mês|anos|ano|horas|hora)\b/gi;
        const PENA = /(?<![A-Za-zÀ-ÿ])(reclusão|detenção|prisão|multa)(?![A-Za-zÀ-ÿ])/gi;

        function scoreArt(a) {
            const t = a.text, pr = t.match(PRAZO) || [], pe = t.match(PENA) || [], re = t.match(RESTR) || [];
            const par = (t.match(/§|Parágrafo único/g) || []).length, def = /(considera-se|entende-se|define-se|constitui|é vedado|é obrigat)/i.test(t) ? 1 : 0;
            let s = pr.length * 3 + pe.length * 1.5 + re.length * 2 + Math.min(par, 4) + def * 2;
            if (t.length < 80) s -= 1; if (t.length > 1800) s -= 1;
            return { s, pr, pe, re };
        }
        function firstSentences(t, max = 320) {
            const clean = String(t).replace(/\s+/g, ' ').trim(), parts = clean.split(/(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚ§])/); let out = '';
            for (const p of parts) { if (out && (out + ' ' + p).length > max) break; out += (out ? ' ' : '') + p; }
            return out.length > max ? out.slice(0, max - 1).trim() + '…' : out;
        }
        const uniq = a => [...new Set(a.map(x => String(x).replace(/\s+/g, ' ').trim()))];
        const rangeLabel = arr => arr.length ? (arr[0].label === arr[arr.length - 1].label ? arr[0].label : arr[0].label + ' a ' + arr[arr.length - 1].label) : '';

        function filterBuiltGuide(g, f) {
            const phrase = f.toLowerCase().trim(), terms = phrase.split(/[\s,;]+/).filter(w => w.length >= 3);
            const run = ts => {
                const c = JSON.parse(JSON.stringify(g)); c._baseLawName = g._baseLawName || g.lawName; let any = false;
                const keep = a => { const r = (a || []).filter(o => { const s = JSON.stringify(o).toLowerCase(); return ts.some(t => s.includes(t)); }); if (r.length) any = true; return r; };
                ['highPriority', 'secondaryPriority', 'deadZones'].forEach(k => c.structuralXRay[k] = keep(c.structuralXRay[k]));
                ['highIncidence', 'mediumIncidence', 'lowIncidence'].forEach(k => c.articlesMapping[k] = keep(c.articlesMapping[k]));
                c.trapsAndJurisprudence.examTraps = keep(c.trapsAndJurisprudence.examTraps); c.trapsAndJurisprudence.jurisprudence = keep(c.trapsAndJurisprudence.jurisprudence);
                c.essayRepertoire = keep(c.essayRepertoire);
                if (!any) return null; c.lawName = g.lawName + ' — recorte: ' + f; return c;
            };
            return run([phrase]) || (terms.length ? run(terms) : null);
        }
        function htmlToText(html) {
            const h = html.replace(/<(strike|s|del)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|li|h\d|center)>/gi, '\n');
            const d = new DOMParser().parseFromString(h, 'text/html'); d.querySelectorAll('script,style').forEach(x => x.remove());
            return (d.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
        }

        // ---------- 2. Gerador local de questões ----------
        const NUMALT = { dias: [5, 10, 15, 20, 30, 40, 60, 90], dia: [5, 10, 15, 20, 30], meses: [1, 3, 6, 12], mês: [1, 3, 6], anos: [1, 2, 3, 4, 5, 8, 10, 12, 15], ano: [1, 2, 3, 5, 10], horas: [12, 24, 48, 72], hora: [12, 24, 48] };
        const FRAC = { '1/3': '1/2', '1/6': '1/3', '2/3': '1/2', '1/2': '2/3' };
        const SWAPS = [['não podem', 'podem'], ['não pode', 'pode'], ['somente', 'também'], ['apenas', 'também'], ['exclusivamente', 'inclusive'], ['sempre', 'nunca'], ['nunca', 'sempre'], ['independe', 'depende'], ['é vedado', 'é permitido'], ['obrigatório', 'facultativo'], ['obrigatória', 'facultativa'], ['incondicionada', 'condicionada à representação'], ['Governador', 'Comandante-Geral'], ['Comandante-Geral', 'Governador'], ['Oficiais', 'Praças'], ['Praças', 'Oficiais'], ['Oficial', 'Praça'], ['Praça', 'Oficial'], ['antiguidade', 'merecimento'], ['merecimento', 'antiguidade'], ['preso', 'solto'], ['solto', 'preso'], ['dolosa', 'culposa'], ['doloso', 'culposo'], ['culposo', 'doloso'], ['reclusão', 'detenção'], ['detenção', 'reclusão'], ['aumenta', 'reduz'], ['aumentada', 'reduzida'], ['reduzida', 'aumentada'], ['exige', 'dispensa'], ['Ministério Público', 'autoridade policial'], ['crime comum', 'crime próprio'], ['Justiça Militar', 'Justiça Comum'], ['com indenização', 'sem indenização'], ['sem indenização', 'com indenização'], ['maior', 'menor'], ['menor', 'maior'], ['antes', 'depois'], ['depois', 'antes']];
        function simAI() {
            const fmt = boardFmt(), pool = [];
            Object.values(BUILTIN_PMDF_GUIDES).forEach(g => questionPool(g, fmt, LEVEL).forEach(q => { pool.push(Object.assign({}, q, { topic: lawShort(g) + ' › ' + q.topic })); }));
            if (!pool.length) return toast('Nenhuma questão válida encontrada.');
            startSim(shuffle(pool), true);
        }

        // ---------- 3. Corretor local de redação (padrão Cebraspe) ----------
        const NORM_RE = /(Lei(?:\s+Complementar)?(?:\s+Federal)?\s+n[º°o.]*\s*[\d.]+(?:\/\d{2,4})?|Decreto(?:-Lei)?\s+n[º°o.]*\s*[\d.]+(?:\/\d{2,4})?|Portaria(?:\s+Interministerial)?\s+n[º°o.]*\s*[\d.\/]+|Constituição Federal(?: de 1988)?|\bCF\/?\s?88\b|Código (?:Penal Militar|de Processo Penal Militar|de Processo Penal|Penal)|Estatuto d[aoe]s?\s+[A-Za-zÀ-ÿ ]{3,40}|Pacto de San José(?: da Costa Rica)?|Convenção\s+[A-Za-zÀ-ÿ ]{3,50}|Declaração Universal dos Direitos Humanos|Súmula Vinculante\s*\d+)/gi;
        const getNorms = t => uniq((String(t).match(NORM_RE) || []).map(x => x.toLowerCase()));
        const MISSP = { nao: 'não', tambem: 'também', alem: 'além', porem: 'porém', entao: 'então', voce: 'você', estao: 'estão', ja: 'já', sera: 'será', serao: 'serão', tres: 'três', orgao: 'órgão', orgaos: 'órgãos', seguranca: 'segurança', violencia: 'violência', forca: 'força', forcas: 'forças', ministerio: 'ministério', juridico: 'jurídico', juridica: 'jurídica', democratico: 'democrático', democratica: 'democrática', politica: 'política', politico: 'político', responsavel: 'responsável', possivel: 'possível', impossivel: 'impossível', necessario: 'necessário', necessaria: 'necessária', principio: 'princípio', vitima: 'vítima', obrigatorio: 'obrigatório', obrigatoria: 'obrigatória', estrategia: 'estratégia', unico: 'único', unica: 'única', apos: 'após', atraves: 'através', dificil: 'difícil', facil: 'fácil', ultimo: 'último', proximo: 'próximo', numero: 'número', periodo: 'período', codigo: 'código', area: 'área', excessao: 'exceção', impecilho: 'empecilho', privilegio: 'privilégio', publico: 'público' };
        const NOT_ENC = new Set('evidencia influencia presencia licencia denuncia renuncia pronuncia anuncia agencia'.split(' '));
        function localErrors(text) {
            const errs = [], ctx = (o, l) => ('…' + text.slice(Math.max(0, o - 25), o + l + 25) + '…').replace(/\s+/g, ' ');
            const push = (o, l, type, rep, why) => { if (!errs.some(e => e.off < o + l && o < e.off + e.len)) errs.push({ off: o, len: l, rep, orig: ctx(o, l), type, fix: rep ? rep : why }); };
            for (const m of text.matchAll(/[A-Za-zÀ-ÿ]+/g)) {
                const w = m[0], k = w.toLowerCase(); let rep = null;
                if (MISSP[k]) rep = MISSP[k];
                else if (/^[a-z]{3,}(c|s|z)ao$/.test(k)) rep = k.replace(/ao$/, 'ão').replace(/cão$/, 'ção');
                else if (/^[a-z]{3,}(c|s|z)oes$/.test(k)) rep = k.replace(/oes$/, 'ões').replace(/cões$/, 'ções');
                else if (/^[a-z]{3,}(enc|anc)ia$/.test(k) && !NOT_ENC.has(k)) rep = k.replace(/(enc|anc)ia$/, m2 => m2 === 'enc' + 'ia' ? 'ência' : 'ância');
                if (rep) push(m.index, w.length, 'Acentuação/ortografia', /^[A-ZÀ-Ý]/.test(w) ? ucf(rep) : rep);
            }
            const P = [[/(?<![A-Za-zÀ-ÿ])afim de(?![A-Za-zÀ-ÿ])/gi, 'Expressão', 'a fim de'], [/(?<![A-Za-zÀ-ÿ])[aà] nível de(?![A-Za-zÀ-ÿ])/gi, 'Expressão', 'em nível de'], [/(?<![A-Za-zÀ-ÿ])haja visto(?![A-Za-zÀ-ÿ])/gi, 'Expressão', 'haja vista'], [/(?<![A-Za-zÀ-ÿ])houveram(?![A-Za-zÀ-ÿ])/gi, 'Concordância (haver impessoal)', 'houve'], [/(?<![A-Za-zÀ-ÿ])(devem|podem|irão|vão|poderão) haver(?![A-Za-zÀ-ÿ])/gi, 'Concordância (haver impessoal)', null, 'use o verbo no singular: “deve/pode haver”'], [/(?<![A-Za-zÀ-ÿ])à (partir|respeito|fim|todo|todos|toda|qualquer)(?![A-Za-zÀ-ÿ])/gi, 'Crase indevida', null, 'não há crase antes de palavra masculina/verbo'], [/(?<![A-Za-zÀ-ÿ])implicar em(?![A-Za-zÀ-ÿ])/gi, 'Regência', 'implicar'], [/(?<![A-Za-zÀ-ÿ])porisso(?![A-Za-zÀ-ÿ])/gi, 'Ortografia', 'por isso'], [/(?<![A-Za-zÀ-ÿ])meio-ambiente(?![A-Za-zÀ-ÿ])/gi, 'Ortografia', 'meio ambiente'], [/(?<![A-Za-zÀ-ÿ])([A-Za-zÀ-ÿ]{3,})\s+\1(?![A-Za-zÀ-ÿ])/gi, 'Repetição de palavra', null, 'elimine a palavra repetida']];
            P.forEach(([re, type, rep, why]) => { for (const m of text.matchAll(re)) push(m.index, m[0].length, type, rep, why); });
            for (const m of text.matchAll(/(?<!\d)[.!?]\s+([a-zà-ú])/g)) { const before=text.slice(Math.max(0,m.index-18),m.index+1); if(/\b(?:art|arts|n|nº|n°|inc|cf|dec|obs|ex|p|pp|v|vs|etc|dr|dra)\.$/i.test(before)||/[º°ª]\.$/.test(before)||/\.{3,}$/.test(before))continue; push(m.index + m[0].length - 1, 1, 'Início de frase sem maiúscula', m[1].toUpperCase()); }
            for (const m of text.matchAll(/(?:^|[.!?]\s+)(?:O|A|Os|As|Um|Uma)\s+[A-Za-zÀ-ÿ]+(,)\s*(?:é|são|foi|foram|deve|devem|precisa|precisam|tem|têm|garante|garantem|assegura|asseguram|permite|permitem|possui|possuem|constitui|representa)(?![A-Za-zÀ-ÿ])/g)) push(m.index + m[0].indexOf(','), 1, 'Vírgula entre sujeito e verbo', '');
            return errs.sort((a, b) => a.off - b.off);
        }
        function applyFixes(text, errs) {
            let out = text; const used = [];
            [...errs].filter(e => e.rep !== undefined && e.rep !== null && (e.rep !== '' || e.type === 'Vírgula entre sujeito e verbo')).sort((a, b) => b.off - a.off).forEach(e => {
                if (used.some(u => e.off < u.off + u.len && u.off < e.off + e.len)) return; used.push(e);
                out = out.slice(0, e.off) + e.rep + out.slice(e.off + e.len);
            });
            return out;
        }
        function repertoireFor(theme, motiv, clean) {
            const tk = new Set(kw(theme + ' ' + motiv)), cited = getNorms(clean).join(' ');
            const list = [];
            Object.values(BUILTIN_PMDF_GUIDES).forEach(g => (g.essayRepertoire || []).forEach(r => {
                const ks = kw(r.legalDevice + ' ' + r.themes + ' ' + r.modelSentence), sc = ks.filter(k => tk.has(k)).length;
                const num = (r.legalDevice.match(/\d[\d.]*\/\d{4}/) || [''])[0].toLowerCase();
                list.push({ r, sc: sc - (num && cited.includes(num.replace(/\./g, '')) ? 5 : 0) });
            }));
            return list.sort((a, b) => b.sc - a.sc).slice(0, 3).map(x => x.r);
        }
        let ESSAY_MD = '';
        async function correctEssay() {
            const theme = $('essay-theme').value.trim(), text = $('essay-text').value.trim(), motiv = $('essay-motiv').value.trim();
            if (!theme || text.length < 80) return toast('Informe o tema e cole a redação completa.', 'error');
            setLoading(true, 'Corrigindo redação no padrão Cebraspe...');
            try {
                await new Promise(r => setTimeout(r, 30));
                const words = (text.match(/\S+/g) || []).length, TL = getEssayLineCount(text);
                const paras = text.split(/\n+/).map(x=>x.trim()).filter(Boolean);
                const fp = firstPersonTerms(text);
                const bad = (paras.slice(0, -1).join(' ').match(/(?<![A-Za-zÀ-ÿ])(portanto|por conseguinte)(?![A-Za-zÀ-ÿ])/gi) || []);
                const norms = getNorms(text), last = paras[paras.length - 1] || '';
                const freq = {}; (motiv.match(/[A-Za-zÀ-ÿ]{6,}/g) || []).forEach(w => { if (!STOP.has(w.toLowerCase())) { const k = stem(w); freq[k] = (freq[k] || 0) + 1; } });
                const tk = [...new Set([...kw(theme), ...Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0])])], tx = new Set(kw(text));
                const cov = tk.length ? tk.filter(k => tx.has(k)).length / tk.length : 1;
                const prop = {
                    Agente: /(?<![A-Za-zÀ-ÿ])(Estado|Governo|Poder P[úu]blico|Secretaria|Minist[ée]rio|Congresso|Assembleia|Câmara Legislativa|PMDF|Polícia Militar|Comando|Corporação|Corregedoria|Poder Executivo|Poder Legislativo|União|Distrito Federal|Governador|órgãos?)(?![A-Za-zÀ-ÿ])/i.test(last),
                    'Ação': /(?<![A-Za-zÀ-ÿ])(deve(?:m|rá|rão)?|cabe(?:m)?|compete|incumbe|implementar|criar|promover|ampliar|fortalecer|realizar|investir|instituir|fiscalizar|capacitar|reformular|aprimorar|desenvolver)(?![A-Za-zÀ-ÿ])/i.test(last),
                    Meio: /(por meio d|mediante|através d|(?<![A-Za-zÀ-ÿ])via(?![A-Za-zÀ-ÿ])|por intermédio d|com base n|a partir d|por força d|em conformidade com)/i.test(last),
                    Finalidade: /(a fim de|para que|com o intuito de|com o objetivo de|com a finalidade de|visando|de modo a|de forma a|de maneira a|com vistas a)/i.test(last)
                };
                const pc = Object.values(prop).filter(Boolean).length;
                const hasRep = /(princípio|dignidade da pessoa humana|direitos humanos|Estado Democrático de Direito|proporcionalidade|legalidade)/i.test(text);
                const sStruct = (paras.length === 4 ? 2 : (paras.length === 3 || paras.length === 5 ? 1 : 0)) + (fp.length ? 0 : 1) + (prop.Agente && prop['Ação'] ? 1 : 0);
                const sRep = [0, 2.5, 4, 5][Math.min(norms.length, 3)] + (hasRep ? 1 : 0);
                const sTheme = Math.round(5 * cov * (words < 150 ? .5 : 1) * 4) / 4, sProp = 1.25 * pc;
                const ded = Math.min(1, bad.length * 0.5);
                const NC = Math.max(0, Math.min(20, Math.round((sStruct + sRep + sTheme + sProp - ded) * 100) / 100));
                // erros
                let errs = null, src = 'verificação local (regras do app)';
                if ($('essay-lt') && $('essay-lt').checked) { try { errs = await ltCheck(text); src = 'LanguageTool (verificador gramatical gratuito)'; } catch (e) { errs = null; } }
                if (!errs) errs = localErrors(text);
                if (errs._source === 'local') src = 'verificação local (fallback automático após falha de rede/timeout)';
                const NE = errs.length, NPD = Math.max(0, NC - 4 * NE / TL), f2 = n => n.toFixed(2).replace('.', ',');
                const elim = [['Fuga ao tema', tk.length >= 2 && cov < .2, 'cobertura dos termos do tema/tópicos: ' + Math.round(cov * 100) + '%'], ['Extensão / ausência de texto (menos de 20 linhas)', TL < 20, TL + ' linha(s)'], ['Uso de primeira pessoa', fp.length > 0, fp.length ? fp.join(', ') : 'nenhuma ocorrência']];
                const anyElim = elim.some(e => e[1]), pass = !anyElim && NPD >= 10;
                const strong = [], crit = [], recs = [];
                paras.length === 4 ? strong.push('Estrutura em 4 parágrafos.') : crit.push('O texto tem ' + paras.length + ' parágrafo(s); o padrão esperado é 4 (introdução, 2 de desenvolvimento e conclusão).');
                norms.length >= 2 ? strong.push('Repertório normativo citado nominalmente: ' + norms.slice(0, 3).join('; ') + '.') : crit.push('Poucas normas citadas pelo nome (' + norms.length + '). Cite leis, portarias e tratados nominalmente, com número e ano.');
                pc === 4 ? strong.push('Proposta de intervenção completa (agente, ação, meio e finalidade).') : crit.push('Proposta de intervenção incompleta; faltam: ' + Object.entries(prop).filter(e => !e[1]).map(e => e[0]).join(', ') + '.');
                fp.length ? crit.push('Uso de 1ª pessoa/pessoalidade (' + fp.join(', ') + '): reescreva de forma impessoal.') : strong.push('Texto impessoal (sem 1ª pessoa).');
                bad.length && crit.push('“Portanto/Por conseguinte” usados fora da conclusão (' + bad.length + 'x).');
                cov >= .5 ? strong.push('Boa aderência aos termos do tema e dos tópicos.') : crit.push('Baixa cobertura dos termos do tema/tópicos (' + Math.round(cov * 100) + '%). Aborde todos os tópicos exigidos pela banca.');
                NE > 0 ? crit.push(NE + ' erro(s) de modalidade escrita detectado(s); cada erro desconta ' + f2(4 / TL) + ' ponto(s) da NC.') : strong.push('Nenhum erro de modalidade escrita detectado.');
                recs.push('Feche cada parágrafo de desenvolvimento ligando o argumento a um dispositivo legal citado pelo nome.', 'Escreva a conclusão no modelo: Agente + Ação + Meio (norma) + Finalidade.', 'Releia procurando acentos, crases, concordância e vírgula entre sujeito e verbo antes de passar a limpo.');
                const rep = repertoireFor(theme, motiv, text), fixed = applyFixes(text, errs);
                const tbl = errs.length ? '| Nº | Trecho original | Tipo de erro | Forma correta / observação |\n|---|---|---|---|\n' + errs.slice(0, LEVEL === 'avancado' ? 60 : 30).map((e, i) => `| ${i + 1} | ${e.orig.replace(/\|/g, '/')} | ${String(e.type).replace(/\|/g, '/')} | ${String(e.fix || '—').replace(/\|/g, '/')} |`).join('\n') : 'Nenhum erro detectado.';
                const tpl = ['Introdução (contexto + tese + norma)', 'Desenvolvimento 1 (argumento + dispositivo legal)', 'Desenvolvimento 2 (argumento + dispositivo legal)'].map((t, i) => rep[i] ? `**Parágrafo ${i + 1} — ${t}:** modelo de repertório: “${rep[i].modelSentence}”` : `**Parágrafo ${i + 1} — ${t}:** desenvolva a ideia e cite nominalmente a norma aplicável.`);
                const firstNorm = rep[0] ? rep[0].legalDevice : '[norma nominal: lei, portaria ou tratado]';
                ESSAY_MD = [
                    '*' + LEVELS[LEVEL].essay + '*', '',
                    '### ETAPA 1 — Análise de Conteúdo (NC)',
                    `- Estrutura e impessoalidade: ${f2(sStruct)}/4 (parágrafos: ${paras.length}; 1ª pessoa: ${fp.length ? 'sim' : 'não'})`,
                    `- Repertório técnico: ${f2(sRep)}/6 (normas citadas: ${norms.length}${norms.length ? ' — ' + norms.slice(0, 4).join('; ') : ''})`,
                    `- Aderência ao tema e tópicos: ${f2(sTheme)}/5 (cobertura ${Math.round(cov * 100)}%)`,
                    `- Proposta de intervenção: ${f2(sProp)}/5 (Agente: ${prop.Agente ? 'sim' : 'não'}; Ação: ${prop['Ação'] ? 'sim' : 'não'}; Meio: ${prop.Meio ? 'sim' : 'não'}; Finalidade: ${prop.Finalidade ? 'sim' : 'não'})`,
                    `- Deduções: −${f2(ded)} (conectivos conclusivos fora da conclusão: ${bad.length}; 1ª pessoa: ${fp.length ? 'sim' : 'não'})`,
                    `**NOTA DE CONTEÚDO (NC): ${f2(NC)}**`, '',
                    '### ETAPA 2 — Modalidade Escrita (NE)', `*Fonte: ${src}. Nenhum corretor automático detecta 100% dos erros; revise o texto também por conta própria.*`, '', tbl, '', `**TOTAL DE ERROS (NE): ${NE}**`, '',
                    '### ETAPA 3 — Contagem de Linhas (TL)', `TL = ${TL} (${$('essay-lines').value ? 'informado por você' : 'estimado: ' + words + ' palavras ÷ 12'})`, '',
                    '### ETAPA 4 — Cálculo da NPD', `NPD = NC − (4 × NE ÷ TL) = ${f2(NC)} − (4 × ${NE} ÷ ${TL}) = ${f2(NC)} − ${f2(4 * NE / TL)} = **${f2(NPD)}**`, '',
                    '### ETAPA 5 — Situações eliminatórias', ...elim.map(e => `- ${e[0]}: **${e[1] ? 'Configurada' : 'Não configurada'}** (${e[2]})`), '',
                    '### ETAPA 6 — Resultado final', `- NC (Nota de Conteúdo): ${f2(NC)}`, `- NE (Número de Erros): ${NE}`, `- TL (Total de Linhas): ${TL}`, `- NPD (Nota Final): ${f2(NPD)}`,
                    `- VEREDITO (indicativo): **${anyElim ? 'REPROVADO — situação eliminatória configurada' : pass ? 'APROVADO' : 'REPROVADO'}** *(referência: 50% da nota máxima = 10,00; confira a nota de corte do seu edital)*`, '',
                    '**Pontos fortes**', ...(strong.length ? strong.slice(0, 3) : ['—']).map(x => '- ' + x), '**Pontos críticos**', ...(crit.length ? crit.slice(0, LEVEL === 'iniciante' ? 3 : 5) : ['—']).map(x => '- ' + x), '**Recomendações**', ...recs.map(x => '- ' + x),
                    ...(LEVEL === 'iniciante' ? ['', '**Como corrigir — passo a passo**', ...errs.slice(0, 8).map((e, i) => `${i + 1}. Localize “${e.orig}”; identifique o problema (${e.type}); substitua por “${e.fix || 'reescreva conforme a norma-padrão'}”; releia a frase inteira para conferir sentido e concordância.`), '', '**3 ajustes prioritários para elevar a nota**', '- 1º: organize o texto em quatro parágrafos funcionais (introdução, dois desenvolvimentos e conclusão).', '- 2º: complete a conclusão com agente, ação, meio e finalidade, de forma explícita.', '- 3º: reduza erros de modalidade escrita e elimine a primeira pessoa, mantendo os fundamentos legais nominais.'] : []), '',
                    '### ETAPA 8 — Roteiro de reescritura (meta: 20,00)', '*O app não reescreve o seu texto sozinho: monta o roteiro abaixo com o repertório mais ligado ao seu tema e devolve o seu texto com as correções automáticas aplicadas.*', '',
                    ...tpl, `**Parágrafo 4 — Conclusão com proposta:** “Portanto, cabe ao [AGENTE: ex.: Governo do Distrito Federal / Comando-Geral da PMDF], por meio de [MEIO: ex.: ${firstNorm}], [AÇÃO: verbo + objeto], a fim de [FINALIDADE: resultado esperado].”`, '',
                    '**Seu texto com as correções automáticas aplicadas:**', ...fixed.split(/\n+/).filter(Boolean), ''
                ].join('\n');
                $('essay-out').innerHTML = pmdfSafeHtml(md(ESSAY_MD)); saveEssayCorrectionHistory(); $('essay-result').classList.remove('hidden'); $('essay-result').scrollIntoView({ behavior: 'smooth' }); toast('Correção concluída.', 'ok');
            } catch (e) { toast('Falha na correção: ' + e.message, 'error'); } finally { setLoading(false); }
        }

        function setLoading(on, title) {
            $('loading-panel').classList.toggle('hidden', !on);
            if (title) $('loading-title').textContent = title;
            ['generate-btn', 'essay-btn'].forEach(id => { const b = $(id); if (b) b.disabled = on; });
            const el = $('essay-loading'); if (el) el.classList.toggle('hidden', !(on && TAB === 'redacao'));
        }

        // ---------- Prompts da lei (nível conectado) ----------
        const SCHEMA = '{"lawName":str,"targetRole":str,"examBoard":str,"executiveSummary":{"centralObjective":str,"keyConcepts":[str]},"structuralXRay":{"highPriority":[{"title":str,"reason":str}],"secondaryPriority":[{"title":str,"reason":str}],"deadZones":[{"title":str,"reason":str}]},"articlesMapping":{"highIncidence":[{"article":str,"plainExplanation":str,"practicalExample":str}],"mediumIncidence":[...],"lowIncidence":[...]},"trapsAndJurisprudence":{"examTraps":[str],"jurisprudence":[str]},"essayRepertoire":[{"legalDevice":str,"themes":str,"modelSentence":str}]}';
        function lawPrompt(forJson) {
            const f=$('filter-input').value.trim(); let source='';
            if(SOURCE_MODE==='url'){
                source='FONTE ATIVA: URL / nome da norma\n'+($('law-input').value.trim()||'[informe a lei ou link]');
            }else if(SOURCE_MODE==='text'){
                source='FONTE ATIVA: texto colado\nIDENTIFICAÇÃO: '+($('law-text-title').value.trim()||'Texto sem título')+'\nTEXTO INTEGRAL/DISPONÍVEL:\n'+($('law-text').value.trim()||'[cole o texto da norma]');
            }else{
                source='FONTE ATIVA: arquivo enviado\nARQUIVO: '+(LAW_FILE_NAME||$('law-file-name').textContent||'Arquivo não identificado')+'\nTEXTO EXTRAÍDO/REVISADO:\n'+($('law-file-preview').value.trim()||'[envie e extraia o arquivo]');
            }
            return `Atue como professor especialista em concursos de carreiras policiais (${$('role-select').value}), com foco na banca ${$('board-select').value}.\n\n${source}\n\nRECORTE: ${f||'Lei inteira, triando os Títulos/Capítulos mais importantes'}\n\n${LEVELS[LEVEL].instr}\n\nEntregue: (1) Resumo Executivo; (2) Raio-X Estrutural (alta prioridade, secundário e zonas mortas); (3) Mapeamento de artigos por incidência (alta, média, baixa) com explicação traduzida do juridiquês e exemplo prático policial; (4) Pegadinhas da banca e jurisprudência; (5) Repertório para redação discursiva com frase-modelo.\n`+(forJson?`\nResponda SOMENTE com JSON válido neste esquema (sem markdown): ${SCHEMA}`:'\nOrganize em tópicos claros, pronto para colar no Google Docs.');
        }

        // ---------- Renderização ----------
        const MATCH = [['cpm',/del1001|\b1\.?001\b/],['cppm',/del1002|\b1\.?002\b/],['estatuto',/l7289|7\.?289/],
            ['l12086',/l12086|12\.?086/],['abuso',/l13869|13\.?869/],['cp',/del2848|2\.?848/],['cpp',/del3689|3\.?689/],
            ['drogas',/l11343|11\.?343/],['tortura',/l9455|9\.?455/],['armas',/10\.?826/],['mariadapenha',/l11340|11\.?340/],['hediondos',/l8072|8\.?072/],['cf88',/constituicao|constituição|cf\/?88/i],
            ['jecrim',/l9099|9\.?099|juizados? especiais? criminais?/i],['orcrim',/l12850|12\.?850|organiza[cç][aã]o criminosa/i],
            ['genocidio',/l2889|2\.?889|genoc[ií]dio/i],['racismo',/l7716|7\.?716|crimes? de racismo/i],
            ['eca',/l8069|8\.?069|estatuto da crian[cç]a|\bECA\b/i],['improbidade',/l8429|8\.?429|14\.?230|improbidade/i],
            ['temporaria',/l7960|7\.?960|pris[aã]o tempor[aá]ria/i],['jef',/l10259|10\.?259|juizados? especiais? federais?/i],
            ['r200',/d88777|88\.?777|R-200/i],['d10443',/d10443|10\.?443|organiza[cç][aã]o b[aá]sica da PMDF/i],
            ['l14751',/l14751|14\.?751|lei org[aâ]nica nacional das pol[ií]cias/i]];
        const matchKey = v => (MATCH.find(([, r]) => r.test(v)) || [])[0];
        const studied = () => { try { return JSON.parse(store.get('st:' + CUR.key) || '[]'); } catch (e) { return []; } };

        let BANK = 'auto', NOTE_IDS = [], CLOZE_MODE = false;
        const BTN = 'px-3 py-2 rounded-xl bg-[#0E1B33] hover:bg-[#162646] border border-[#1E2E4F] text-xs text-[#E5C158] font-semibold';
        function effBank() { if (BANK !== 'auto') return BANK; const v = $('board-select').value; return /Cebraspe/.test(v) ? 'cebraspe' : /FGV|Idecan|AOCP|Vunesp/.test(v) ? 'fgv' : 'todas'; }
        function updateProgress(){
            const p=$('g-progress');if(!p||!CUR.guide)return;
            const rows=getVisibleArticleRows(CUR.guide),ids=rows.map(a=>(CUR.key||'x')+'|'+String(a.article).slice(0,40)),done=new Set(studied()),count=ids.filter(id=>done.has(id)).length,total=ids.length;
            p.innerHTML=total?`📈 Progresso de estudo: <b>${count}/${total}</b> dispositivos estudados (${Math.round(100*count/total)}%)`:'Nenhum dispositivo neste nível de visualização.';
        }
        function refreshCurrentBuiltInLawMetadata() { if (CUR.guide) rerenderPreservingStudyState(); }

        // ---------- Seleção e geração ----------
        function markShortcut(key) {
            document.querySelectorAll('.law-shortcut-btn').forEach(button=>{
                const active=button.id==='btn-law-'+key;
                button.classList.toggle('pmdf-law-selected',active);
                button.setAttribute('aria-pressed',String(active));
                // Classes utilitárias antigas permanecem no DOM, mas o estado tem
                // uma fonte única de verdade e prioridade de CSS explícita.
            });
        }
        function selectAndLoadLaw(key,url){
            setSourceMode('url');
            const chosen=url||lawUrlForKey(key);
            $('law-input').value=chosen;
            $('law-input').dispatchEvent(new Event('change',{bubbles:true}));
            $('filter-input').value='';
            markShortcut(key);
            const drawer=document.querySelector('.more-laws-drawer');
            if(drawer)drawer.open=false;
            if($('q-source'))$('q-source').value='current';
            if($('anki-source'))$('anki-source').value='current';
            if($('q-panel'))$('q-panel').classList.add('hidden');
            if($('q-status'))$('q-status').textContent='Norma selecionada: '+(BUILTIN_PMDF_GUIDES[key]?.lawName||key)+'. Gere um novo simulado.';
            Q_STATE=null;
            if(BUILTIN_PMDF_GUIDES[key]){
                CUR={key,guide:BUILTIN_PMDF_GUIDES[key],_poolCache:Object.create(null)};
                store.set('lastKey',key);
                renderGuide(CUR.guide,true);
                markShortcut(key);
                saveStudySession();
            }else{
                toast('Buscando conteúdo da norma selecionada...');
                generateStrategicGuide();
            }
        }
        // ---------- Modais acessíveis: foco inicial, ciclo de Tab e retorno ao acionador. ----------
        let PMDF_DIALOG_PREVIOUS_FOCUS = null;
        function pmdfOpenDialog(id) {
            const modal = $(id);
            if (!modal) return;
            if (modal.classList.contains('hidden')) PMDF_DIALOG_PREVIOUS_FOCUS = document.activeElement || null;
            modal.classList.replace('hidden', 'flex');
            const first = modal.querySelector?.('button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])');
            (first || modal).focus?.();
        }
        function pmdfCloseDialog(id) {
            const modal = $(id);
            if (!modal || modal.classList.contains('hidden')) return;
            modal.classList.replace('flex', 'hidden');
            const previous = PMDF_DIALOG_PREVIOUS_FOCUS;
            PMDF_DIALOG_PREVIOUS_FOCUS = null;
            previous?.focus?.();
        }
        function pmdfTrapDialog(event) {
            if (event.key !== 'Tab') return;
            const active = ['prompt-modal','gen-modal'].map(id => $(id)).find(el => el && !el.classList.contains('hidden'));
            if (!active) return;
            const selectors = 'button:not([disabled]),[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
            const eligible = Array.from(active.querySelectorAll?.(selectors) || []).filter(el => !el.closest?.('[hidden],.hidden,[inert]'));
            if (!eligible.length) { event.preventDefault(); active.focus?.(); return; }
            const first = eligible[0], last = eligible[eligible.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === active)) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !active.contains?.(document.activeElement))) {
                event.preventDefault(); first.focus();
            }
        }
        function openModal(t, h) {
            $('gen-title').textContent = t;
            $('gen-body').innerHTML = pmdfSafeHtml(h,true);
            pmdfOpenDialog('gen-modal');
            if (window.lucide) lucide.createIcons();
        }
        function closeModal() { pmdfCloseDialog('gen-modal'); }
        const jget = (k, d) => { try { return JSON.parse(store.get(k)) ?? d; } catch (e) { return d; } };
        const hash = s => { let x = 0; for (const c of s) x = (x * 31 + c.charCodeAt(0)) | 0; return x; };
        const shuffle = a => { // Fisher-Yates: uniforme, O(n), não altera o array original.
            const result = [...a];
            for (let i = result.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [result[i], result[j]] = [result[j], result[i]];
            }
            return result;
        };
        function copyText(t) { navigator.clipboard.writeText(t).then(() => toast('Copiado!', 'ok'), () => toast('Selecione e copie manualmente.', 'error')); }

        // ---------- 1. Flashcards com repetição espaçada (caixas de Leitner) ----------
        let FC = { cards: [], i: 0, back: false, ok: 0 };
        function buildDeck(g){
            return buildStudyCards(g).map(card=>({id:card.id,f:card.front,b:card.back,k:card.id.startsWith('trap-')?'Pegadinha':card.id.startsWith('ex-')?'Aplicação':'Artigo'}));
        }
        function openFlash(){
            if(!CUR.guide)return toast('Carregue um guia antes de iniciar os flashcards.','error');
            const deck=buildDeck(CUR.guide);if(!deck.length)return toast('Sem conteúdo para flashcards neste guia.');
            const n=LEVEL==='iniciante'?8:12;
            FC={cards:shuffle(deck).sort((a,b)=>getCardBox(a.id).box-getCardBox(b.id).box).slice(0,n),i:0,back:false,ok:0};drawFlash();
        }
        function drawFlash(){
            if(FC.i>=FC.cards.length)return openModal('🃏 Sessão concluída',`<p class="text-base">Você lembrou <b>${FC.ok}/${FC.cards.length}</b> cartões.</p><p class="text-xs text-slate-400 my-2">Os cartões marcados como conhecidos avançam nas caixas; os demais retornam à revisão inicial.</p><button data-pmdf-onclick="openFlash()" class="${BTN}">🔁 Nova sessão</button>`);
            const card=FC.cards[FC.i],box=getCardBox(card.id).box;
            openModal(`🃏 ${FC.i+1}/${FC.cards.length} · ${card.k}`,`<div class="g-card min-h-40 flex flex-col justify-between"><p class="text-xs text-slate-400">Caixa Leitner ${box} · toque para revelar</p><p class="text-lg font-semibold text-white">${esc(FC.back?card.b:card.f)}</p></div><div class="flex flex-wrap gap-2 mt-3">${!FC.back?`<button data-pmdf-onclick="FC.back=true;drawFlash()" class="${BTN}">👁 Revelar resposta</button>`:`<button data-pmdf-onclick="rateFlash(false)" class="${BTN}">✕ Não lembrei</button><button data-pmdf-onclick="rateFlash(true)" class="${BTN}">✓ Lembrei</button>`}</div>`);
        }
        function rateFlash(known){
            const card=FC.cards[FC.i];setCardBox(card.id,!!known);if(known)FC.ok++;FC.i++;FC.back=false;drawFlash();
        }

        // ---------- Cronômetro progressivo, sem contagem regressiva ----------
        const POMO = { elapsed: 0, t: null, startedAt: 0 };
        function pomoDraw() {
            const secs = Math.max(0, Math.floor(POMO.elapsed + (POMO.t ? (performance.now() - POMO.startedAt)/1000 : 0)));
            const hh = Math.floor(secs/3600), mm = Math.floor(secs/60)%60, ss = secs%60;
            const pad = v => String(v).padStart(2,'0');
            $('pomo-time').textContent = (hh?pad(hh)+':':'')+pad(mm)+':'+pad(ss);
            $('pomo-mode').textContent = 'ESTUDO';
            $('pomo-btn').textContent = POMO.t ? '⏸' : '▶';
        }
        function pomoReset() { if(POMO.t)clearInterval(POMO.t);POMO.t=null;POMO.elapsed=0;POMO.startedAt=0;pomoDraw(); }
        function pomoToggle() {
            if(POMO.t) { POMO.elapsed += (performance.now()-POMO.startedAt)/1000;clearInterval(POMO.t);POMO.t=null; }
            else { POMO.startedAt=performance.now();POMO.t=setInterval(pomoDraw,250); }
            pomoDraw();
        }

        // ---------- 3. Mapa mental em árvore ----------
        function mmTree(g) {
            const X = g.structuralXRay || {}, A = g.articlesMapping || {}, T = g.trapsAndJurisprudence || {};
            const it = (arr, k) => (arr || []).map(i => ({ t: String(i[k] || i).split(' — ')[0].split(':')[0], c: [] })), grp = (t, c) => ({ t, g: 1, c });
            const root = { t: g.lawName, c: [grp('Raio-X Estrutural', [grp('Prioridade máxima', it(X.highPriority, 'title')), grp('Prioridade secundária', it(X.secondaryPriority, 'title')), grp('Zonas mortas', it(X.deadZones, 'title'))]),
                grp('Artigos', [grp('Alta incidência', it(A.highIncidence, 'article')), grp('Média incidência', it(A.mediumIncidence, 'article')), grp('Baixa incidência', LEVEL === 'iniciante' ? [] : it(A.lowIncidence, 'article'))]),
                grp('Pegadinhas da banca', it(T.examTraps, 'x')), grp('Repertório de redação', it(g.essayRepertoire, 'legalDevice'))] };
            const prune = n => { n.c = n.c.map(prune).filter(c => !(c.g && !c.c.length)); return n; }; return prune(root);
        }
        const ascii = (n, p = '', top = true) => (top ? n.t + '\n' : '') + n.c.map((c, i) => { const l = i === n.c.length - 1; return p + (l ? '└── ' : '├── ') + c.t + '\n' + ascii(c, p + (l ? '    ' : '│   '), false); }).join('');
        const mdOut = (n, d = 0) => (d ? '  '.repeat(d - 1) + '- ' + n.t + '\n' : '# ' + n.t + '\n') + n.c.map(c => mdOut(c, d + 1)).join('');
        // Mapa mental editorial baseado nas características visíveis do PDF de referência.
        // Não existe prompt embutido no PDF: o texto abaixo reconstrói seu padrão visual.
        const PMDF_MIND_TEMPLATE=Object.freeze({
            name:'Mapa de estudo em infográfico',
            source:'Referência visual: Direito Penal - Outro Turno.pdf',
            layout:'Cartaz de leitura vertical, núcleo central, ramos numerados e síntese final.',
            maxBranches:4
        });
        function pmdfMindEntries(guide,sourceRows){
            const g=guide||{},S=g.executiveSummary||{},X=g.structuralXRay||{},A=g.articlesMapping||{};
            const rows=Array.isArray(sourceRows)?sourceRows:[
                ...safeArray(A.highIncidence),...safeArray(A.mediumIncidence),...safeArray(A.lowIncidence)
            ];
            const list=[],used=new Set();
            const plain=v=>String(v??'').replace(/\s+/g,' ').trim();
            const append=(heading,body,example,tag)=>{
                const title=plain(heading),content=plain(body),hint=plain(example);
                if(content.length<25)return;
                const key=(title+'|'+content).toLocaleLowerCase('pt-BR');
                if(used.has(key))return;used.add(key);
                list.push({heading:title||'Conceito fundamental',body:content,example:hint,tag:plain(tag)});
            };
            for(const row of rows){
                append(row.article||row.title||row.topic||row.name,
                    row.plainExplanation||row.explanation||row.reason||row.content,
                    row.practicalExample||row.example,row.incidence||row.priority);
            }
            if(list.length<3){
                for(const x of [...safeArray(X.highPriority),...safeArray(X.secondaryPriority)]){
                    if(typeof x==='string')append('Ponto-chave',x,'','Tema prioritário');
                    else append(x.title||x.article,x.reason||x.explanation||x.description,'','Tema prioritário');
                }
            }
            if(list.length<3)for(const [i,x] of safeArray(S.keyConcepts).entries())
                append('Conceito '+(i+1),x,'','Conceito');
            if(!list.length){
                const raw=plain(g.sourceText||g.rawText||g.fullText||g.originalText||
                    $('law-text')?.value||$('law-file-preview')?.value||S.centralObjective);
                const parts=raw.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/).filter(t=>t.length>=30);
                for(const [i,p] of parts.entries())append('Ponto '+(i+1),p,'','Texto fornecido');
            }
            if(!list.length&&S.centralObjective)append('Ideia central',S.centralObjective,'','Objetivo');
            return list;
        }

        // Modelo universal de fluxo/decisão: entrada local, sem IA externa obrigatória.
        function pmdfMindShort(s,n=8){
            return String(s||'').replace(/\s+/g,' ').trim().split(' ').slice(0,n).join(' ');
        }
        function pmdfMindTrigger(s){
            const words=String(s||'').match(/\b(exigir|solicitar|receber|salvo|somente|apenas|nunca|independe|vedado|obrigatório|aumenta|reduz|prazo|pena|dolo|culpa)\b/i);
            return words?words[0].toUpperCase():pmdfMindShort(s,3);
        }
        function pmdfMindNodes(v){
            const raw=String(v||'').split(/(?<=[.;!?])\s+|;\s*|:\s+|\s+[–—]\s+/).map(t=>t.trim()).filter(Boolean);
            const segments=raw.flatMap(p=>p.split(/,\s+(?=(?:salvo|quando|desde que|se|exceto|portanto|assim|em caso de)\b)/i));
            const nodes=[];
            for(const p of segments){const words=p.trim().split(/\s+/);for(let i=0;i<words.length;i+=8){const part=words.slice(i,i+8).join(' ');if(part)nodes.push(part);}}
            return nodes.slice(0,8);
        }
        function pmdfMindPrompt(guide){
            const g=guide||CUR.guide||{},S=g.executiveSummary||{},source=pmdfMindEntries(g);
            const title=g.lawName||lawDisplayName()||'Tema selecionado';
            const content=source.map((x,i)=>String(i+1)+'. '+x.heading+'\nREGRA: '+x.body+(x.example?'\nCASO: '+x.example:'')).join('\n\n');
            return [
                'PROMPT MESTRE UNIVERSAL — MAPA MENTAL DE FLUXO E DECISÃO (PADRÃO OUTRO TURNO)',
                'Atue como designer instrucional de concursos policiais e diagramador jurídico. Transforme SOMENTE o conteúdo fornecido em mapa esquemático, preciso, visual, com pergunta-gatilho e decisões sequenciais.',
                '1. ZERO PARÁGRAFOS LONGOS: cada nó terá de 3 a 8 palavras (exceto artigos, prazos e denominações indivisíveis). Frases telegráficas. Não cortar um requisito para obedecer ao limite.',
                '2. CABEÇALHO: tema + artigos de referência efetivamente presentes + pergunta-gatilho central ("O que acontece quando...?" ou outra pergunta adequada ao assunto).',
                '3. CRIE DE 2 A 5 BLOCOS [1], [2], [3], [4], [5] por seção, com pergunta prática em cada bloco: O que é? Quem pratica? Requisitos? Exceção? Consequência? Cores semânticas: AZUL = regra/conduta; VERDE = requisitos/benefícios/excludentes; ÂMBAR = condições/exceções/frações; VERMELHO = vedações/qualificadoras/agravamento.',
                '4. MICROFLUXOS VERTICAIS: [Conduta] ↓ [Meio ou condição] ↓ [Consequência]; ✔ regra confirmada; ✘ vedação; ⚠ exceção; ⚖ confronto jurídico. Cada nó deve ser verificável na fonte.',
                '5. ISOLE EM BOXES: pena (reclusão, detenção, multa), prazo, fração, percentual e aumento/redução SOMENTE quando constarem do material; preserve unidades, condicionantes e referências.',
                '6. QUADRO ⚡ NÃO CONFUNDA / COMO A BANCA DIFERENCIA: compare institutos próximos em colunas: ⚠ pegadinha vs ✔ regra real. Escreva uma PALAVRA-GATILHO precisa por instituto. Não crie diferenças ausentes na fonte.',
                '7. RODAPÉ ⏱ REVISÃO EM 15 SEGUNDOS (PARA MEMORIZAR): de 3 a 5 equações [CONCEITO] ➔ [GATILHO] ➔ [EFEITO/PENA], somente quando embasadas. Se não houver base suficiente, sinalize a lacuna.',
                'FIDELIDADE ABSOLUTA: não inventar legislação, jurisdição, pena, jurisprudência, requisitos, artigos ou citações. Se documento anexado não tiver texto extraível, pedir transcrição, sem simular leitura. Referenciar o dispositivo conforme a fonte.',
                'ENTRADA ATIVA: '+title,
                'NÍVEL: '+(LEVELS[LEVEL]?.label||LEVEL),
                'PERGUNTA PRINCIPAL: '+(S.centralObjective||'Quais regras determinam a consequência jurídica?'),
                'MATERIAL EXTRAÍDO:\n'+(content||((typeof LAW_FILE_TEXT!=='undefined'&&LAW_FILE_TEXT)?String(LAW_FILE_TEXT).slice(0,12000):'Nenhum trecho extraído; aguarde o carregamento de texto verificável.')),
                'SAÍDA: mapa vertical responsivo/Markdown com blocos numerados, setas, quadro comparativo e faixa final de memorização.'
            ].join('\n\n');
        }
        function pmdfMindMarkdown(g){
            const entries=pmdfMindEntries(g);
            let out='# '+(g.lawName||'Mapa mental')+'\n\n**PERGUNTA-GATILHO:** Quais condições mudam a consequência?\n\n';
            entries.forEach((e,i)=>{out+='## ['+(i+1)+'] '+e.heading+'\n';pmdfMindNodes(e.body).forEach((n,j)=>{out+=(j?'↓ ':'✔ ')+n+'\n';});if(e.example)out+='🚓 '+e.example+'\n';out+='\n';});
            out+='## ⚡ NÃO CONFUNDA\n';
            safeArray(g.trapsAndJurisprudence?.examTraps).forEach(t=>out+='⚠ '+String(t)+'\n');
            safeArray(g.trapsAndJurisprudence?.jurisprudence).forEach(t=>out+='✔ '+String(t)+'\n');
            out+='\n## ⏱ REVISÃO EM 15 SEGUNDOS\n';
            entries.slice(0,5).forEach(e=>out+='['+pmdfMindShort(e.heading,5)+'] ➔ ['+pmdfMindTrigger(e.body)+'] ➔ ['+pmdfMindShort(e.body,8)+']\n');
            return out;
        }
        function pmdfMindHtml(guide,sourceRows){
            const g=guide||{},entries=pmdfMindEntries(g,sourceRows),traps=safeArray(g.trapsAndJurisprudence?.examTraps),
                  jurisprudence=safeArray(g.trapsAndJurisprudence?.jurisprudence),subject=g.lawName||'Tema de estudo';
            if(!entries.length)return '<p class="pmdf-mind-empty">Nenhum trecho verificável disponível. Carregue texto ou um documento antes de gerar.</p>';
            const navi=[['overview','01 Visão Geral'],['high','02 Alta Incidência'],['medium','03 Média Incidência'],['compare','04 Não Confunda'],['review','05 Revisão em 15s']];
            const nav='<nav class="mm-nav no-print" aria-label="Navegação do mapa">'+navi.map(([id,label])=>'<a href="#mm-'+id+'">'+label+'</a>').join('')+'</nav>';
            // O modo imprimível contém os mesmos dados e não depende do estado de botões.
            // Reduzir quebras dentro de cartões é responsabilidade da folha de impressão.
            const cards=entries.map((x,i)=>{
                const inc=String(x.tag||'').toLowerCase(),tone=/média|media/.test(inc)?'amber':/baixa|vedad|proib/.test(inc)?'red':/requisit|benef|exclud/.test(inc)?'green':'blue';
                const words=pmdfMindNodes(x.body);
                const terms=String(x.body).match(/\b(?:somente|apenas|nunca|salvo|exige|independe|inafiançável|reclusão|detenção|multa)\b|\b\d+(?:[.,/]\d+)?\s*(?:dias?|meses?|anos?|%|horas?)\b|\b\d+\s*\/\s*\d+\b/gi)||[];
                const marks=[...new Set(terms.map(t=>t.toLowerCase()))].slice(0,8);
                const nodes=words.map((t,j)=>'<div class="mm-step"><div class="mm-step-text">'+esc(t)+'</div>'+(j<words.length-1?'<div class="mm-arrow" aria-hidden="true">↓</div>':'')+'</div>').join('');
                const meta=(x.tag?'<span class="mm-article">'+esc(x.tag)+'</span>':'');
                return '<article class="mm-card mm-'+tone+'" id="mm-card-'+(i+1)+'"><header class="mm-card-head"><span class="mm-number">'+String(i+1).padStart(2,'0')+'</span><span class="mm-card-title">'+esc(x.heading)+'</span>'+meta+'</header><p class="mm-trigger">⚖ '+esc('O que determina '+pmdfMindShort(x.heading,5)+'?')+'</p><div class="mm-flow">'+nodes+'</div>'+(marks.length?'<div class="mm-marks">'+marks.map(m=>'<span>'+esc(m)+'</span>').join('')+'</div>':'')+(x.example?'<aside class="mm-case"><strong>🚓 Caso prático / Consequência</strong><p>'+esc(x.example)+'</p></aside>':'')+'</article>';
            });
            const compare=Math.max(traps.length,jurisprudence.length);
            const comparisons=Array.from({length:compare},(_,i)=>'<div class="mm-compare-row"><div><strong>✘ Pegadinha de prova</strong><p>'+esc(String(traps[i]||'Não informado no material.'))+'</p></div><div><strong>✔ Regra real / Jurisprudência</strong><p>'+esc(String(jurisprudence[i]||'Conferir a literalidade da fonte; não presumir correção.'))+'</p></div></div>').join('');
            const review=entries.slice(0,5).map(x=>'<div class="mm-review-item"><b>'+esc(pmdfMindShort(x.heading,5))+'</b><span>➔ '+esc(pmdfMindTrigger(x.body))+'</span><span>➔ '+esc(pmdfMindShort(x.body,8))+'</span></div>').join('');
            return '<div class="mm-root">'+nav+'<section id="mm-overview" class="mm-hero"><span>MÉTODO PMDF · MAPA DE DECISÃO</span><h2>'+esc(subject)+'</h2><p>⚖ Quais condições determinam a consequência jurídica?</p></section>'+
            '<section id="mm-high"><h3>01–02 · Fluxos e alta incidência</h3><div class="mm-grid">'+cards.slice(0,Math.max(1,Math.ceil(cards.length/2))).join('')+'</div></section>'+
            '<section id="mm-medium"><h3>03 · Demais dispositivos</h3><div class="mm-grid">'+cards.slice(Math.max(1,Math.ceil(cards.length/2))).join('')+'</div></section>'+
            '<section id="mm-compare"><h3>⚡ NÃO CONFUNDA · Como a banca diferencia</h3>'+(comparisons||'<p>Sem comparações explícitas na fonte carregada.</p>')+'</section>'+
            '<section id="mm-review"><h3>⏱ REVISÃO EM 15 SEGUNDOS (PARA MEMORIZAR)</h3><div class="mm-review-grid">'+review+'</div></section></div>';
        }
        function openMindMap(){
            if(!CUR.guide)return toast('Carregue um guia antes de abrir o mapa mental.','error');
            const g=CUR.guide,tree=mmTree(g);
            window._mm=[ascii(tree),mdOut(tree)];
            window._mmPrompt=pmdfMindPrompt(g);
            window._mmOutro=pmdfMindMarkdown(g);
            openModal('🧠 Mapa mental — Padrão Outro Turno','<div class="pmdf-mind-modal"><div class="pmdf-mind-actions no-print">'+
                
                
                '</div>'+
                pmdfMindHtml(g,getVisibleArticleRows(g))+'</div>');
        }

        // ---------- 5. Simulador Certo/Errado + Caderno de Erros ----------
        let SIM = null;
        function simIntro() {
            const b = $('sim-box'); if (!b) return;
            b.innerHTML = `<p class="text-sm text-slate-300">Itens montados automaticamente a partir dos artigos e pegadinhas desta lei (${getCachedPool(CUR.guide, boardFmt(), LEVEL).length} disponíveis; formato conforme a banca). Cada erro vai automaticamente para o Caderno de Erros.</p><div class="flex flex-wrap gap-2 mt-2"><button data-pmdf-onclick="startSim()" class="${BTN}">▶ Iniciar (máximo disponível)</button><button data-pmdf-onclick="simAI()" class="${BTN}">🎲 Misto de todas as leis</button><button data-pmdf-onclick="openErrors()" class="${BTN}">📕 Caderno de Erros</button></div>`;
        }
        function startSim(items,scroll){
            if(!CUR.guide&&!Array.isArray(items))return toast('Carregue um guia antes de iniciar o simulado.','error');
            const explicit=Array.isArray(items),pool=shuffle(explicit?items:getCachedPool(CUR.guide,boardFmt(),LEVEL));
            if(!pool.length)return toast('Nenhuma questão verificável foi encontrada para esta fonte e nível. Selecione outra lei ou acrescente conteúdo.','error');
            closeModal();SIM={items:uniqueQuestions(pool.filter(questionIsComplete)),i:0,hits:0,wrong:0,blank:0};drawSim();if(scroll||explicit)$('sim-box')?.scrollIntoView({behavior:'smooth',block:'center'});
        }
        const boardFmt = () => /Cebraspe/i.test($('board-select').value) ? 'CE' : 'MC';
        function scanPrompt() {
            const law=(CUR.guide&&CUR.guide.lawName)||$('law-text-title')?.value||$('law-input')?.value||'Material fornecido';
            const fmt=$('q-format')?.value==='MC'?'MC':'CE',level=LEVELS_SAFE_LEVEL($('q-level')?.value||LEVEL),bank=$('q-board')?.value||'Cebraspe';
            const texts=[];
            if(CUR.guide)for(const group of ['highIncidence','mediumIncidence','lowIncidence'])
                for(const a of safeArray(CUR.guide.articlesMapping?.[group])){
                    const t=String(a.sourceText||a.plainExplanation||'').trim();
                    if(t)texts.push((a.article||'Tópico')+'\n'+t);
                }
            return [
                'PROMPT MESTRE — ELABORADOR PROFISSIONAL DE QUESTÕES PARA CONCURSOS',
                'Atue como uma equipe examinadora composta por especialistas em conteúdo, elaboração de provas e auditoria de gabaritos. Reproduza características técnicas do estilo CEBRASPE/CESPE sem copiar provas existentes ou declarar autoria oficial.',
                'NORMA OU DOCUMENTO: '+law,
                'BANCA DE REFERÊNCIA: '+bank,
                'FORMATO: '+(fmt==='CE'?'CERTO OU ERRADO':'MÚLTIPLA ESCOLHA (quatro ou cinco alternativas, preferencialmente cinco)'),
                'NÍVEL CONFIGURADO: '+LEVELS[level].label,
                '1. Leia integralmente o conteúdo efetivamente disponível, identifique sua estrutura e registre artigos, parágrafos, incisos, seções e fontes de cada proposição.',
                '2. Antes de criar questões, faça uma matriz de cobertura: literalidade, conceitos, requisitos, condições, exceções, permissões, vedações, competências, prazos, quantidades, consequências, classificações, procedimentos, relações entre dispositivos e casos de aplicação.',
                '3. Gere o maior número possível de questões tecnicamente distintas e sustentadas pelo documento, sem limite arbitrário. Um dispositivo pode gerar várias questões válidas; elimine variações que avaliem o mesmo raciocínio.',
                '4. Priorize questões rigorosas: inversões de competência, troca entre regra e exceção, condições cumulativas ou alternativas, qualificadores, prazos, distinções conceituais e situações hipotéticas contextualizadas. Não crie ambiguidade artificial.',
                '5. Em CERTO/ERRADO, cada afirmação deverá ser inequívoca, com resposta C ou E, fundamento textual verificável e explicação do elemento decisivo. Não force alternância artificial de gabaritos.',
                '6. Em MÚLTIPLA ESCOLHA, exija apenas uma correta e alternativas plausíveis, semanticamente distintas e fundamentadas; explique por que cada distrator está errado. Descarte itens sem quatro opções seguras.',
                '7. Classifique a dificuldade em fácil (literalidade), média (requisitos/interpretação) e difícil (integração/aplicação), usando como referência aproximada 20%, 50% e 30%, adaptável à fonte.',
                '8. Restrinja-se ao conteúdo entregue. Não invente leis, artigos, doutrina, jurisprudência, datas, interpretações ou exceções. Só inclua informação externa por solicitação expressa e quando verificável. Sinalize texto ilegível ou vigência não conferida.',
                '9. Cada questão deve ter ID, assunto, subassunto, nível, tipo, enunciado, alternativas (apenas MC), gabarito, dispositivo, trecho original de apoio, justificativa e análise individual dos distratores MC.',
                '10. Revise como três examinadores independentes: especialista na matéria, elaborador da banca e auditor do gabarito. Corrija ou rejeite itens ambíguos, duplicados, sem apoio documental e de múltipla resposta.',
                '11. Organize a geração por lotes de 30 questões. Ao comando CONTINUAR, retome os pontos examináveis ainda não cobertos, sem reiniciar a sequência ou repetir enunciados. A cobertura deve controlar documento, tópico e unidade examinável.',
                '12. Em estudo interativo, mantenha gabarito e justificativa ocultos até a resposta. Em exportação, separe perguntas e gabarito comentado.',
                '13. Ao fim de cada lote, relate total gerado, temas cobertos, pendências, distribuição de dificuldade e limitações. Somente declare a cobertura esgotada quando não houver outras questões relevantes e sustentáveis no material.',
                '14. Saída estruturada: [{id,sourceKey,topic,subtopic,difficulty,type,statement,options,answer,lawBasis,sourceQuote,explanation,optionAnalysis}]. Em CE, options deve ser []; em MC, quatro ou cinco opções e uma única letra correta. Não divulgue resposta no enunciado.',
                'PRIORIDADE: fidelidade técnica > diversidade cognitiva > cobertura da fonte > quantidade.',
                '--- MATERIAL DISPONÍVEL ---',
                texts.length?texts.join('\n\n'):'[Cole aqui o documento integral. Sem acesso ao texto, a exaustividade não pode ser garantida.]',
                '--- FIM DO MATERIAL ---'
            ].join('\n\n');
        }
        function cutAlt(i) { const e = $('alt-' + 'ABCDE'[i]); if (e && !SIM.lock) { e.classList.toggle('line-through'); e.classList.toggle('opacity-40'); } }
        function drawSim() {
            const b = $('sim-box'); if (!b || !SIM) return; const n = SIM.items.length;
            if (SIM.i >= n) { const pct=Math.round(100*SIM.hits/n), ceb=/Cebraspe/i.test($('board-select').value); const score=ceb?`<p class="text-sm font-bold text-sky-300">Placar líquido Cebraspe (Acertos − Erros): ${SIM.hits-(SIM.wrong||0)} · em branco não desconta</p>`:`<p class="text-sm font-bold text-sky-300">Aproveitamento: ${pct}% · Nota ponderada: ${(pct*0.2).toFixed(2).replace('.',',')}/20,00</p>`; b.innerHTML = `<p class="text-base font-bold text-[#E5C158]">Acertos: ${SIM.hits}/${n} (${pct}%)</p>${score}<p class="text-sm text-slate-300">${SIM.blank ? SIM.blank + ' em branco. ' : ''}${SIM.hits === n ? 'Sem erros. Excelente!' : 'Os itens errados foram salvos no Caderno de Erros.'}</p><div class="flex flex-wrap gap-2 mt-2"><button data-pmdf-onclick="startSim()" class="${BTN}">🔁 Novo simulado</button><button data-pmdf-onclick="downloadSimDoc()" class="${BTN}">📄 Baixar Simulado Comentado (.doc)</button><button data-pmdf-onclick="openErrors()" class="${BTN}">📕 Caderno de Erros</button></div>`; return; }
            const q = SIM.items[SIM.i], mc = q.type === 'MC' && Array.isArray(q.options) && q.options.length >= 2; SIM.lock = false;
            const bd = (t, c) => `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c}">${esc(t)}</span>`;
            const inc = q.incidence === 'Alta' || q.incidence === 'Média' ? q.incidence + ' Incidência' : q.incidence === 'Recente em Prova' ? 'Cobrança Recente' : q.incidence || '';
            const badges = `<div class="flex flex-wrap gap-1.5">${bd(q.topic || 'Geral', 'bg-[#162646] text-slate-100')}${inc ? bd(inc, 'bg-[#D4AF37]/20 text-[#E5C158]') : ''}${q.examRef ? bd(q.examRef, 'bg-sky-500/20 text-sky-300') : ''}${bd(LEVELS[LEVEL].label, 'bg-emerald-500/20 text-emerald-300')}</div>`;
            const acts = mc ? q.options.map((o, i) => `<div class="flex gap-2 items-stretch"><button id="alt-${'ABCDE'[i]}" data-pmdf-special="answer-sim" data-pmdf-value="${'ABCDE'[i]}" class="${BTN} flex-1 text-left">${'ABCDE'[i]}) ${esc(String(o).replace(/^\s*[A-E]\s*[\).\-]\s*/, ''))}</button><button data-pmdf-special="cut-alt" data-pmdf-value="${i}" title="Riscar alternativa" class="${BTN}">✂</button></div>`).join('')
                : `<div class="flex gap-2"><button data-pmdf-onclick="answerSim('C')" class="${BTN} flex-1">✔ CERTO</button><button data-pmdf-onclick="answerSim('E')" class="${BTN} flex-1">✘ ERRADO</button></div>`;
            SIM.startedAt=Date.now();b.innerHTML = `<p class="text-xs text-slate-400 mb-1">Item ${SIM.i + 1}/${n}</p>${badges}<p class="text-sm text-white my-2">${esc(q.statement)}</p><div class="flex flex-col gap-2">${acts}<button data-pmdf-onclick="answerSim('')" class="${BTN}">⏭ Pular / Deixar em Branco</button></div><div id="sim-fb"></div>`; if(window.lucide)lucide.createIcons();
        }
        function answerSim(a) {
            if (SIM.lock) return; SIM.lock = true; const q = SIM.items[SIM.i], blank = a === '', ok = !blank && a === q.answer, law = q.law || (CUR.guide._baseLawName || CUR.guide.lawName);
            if (blank) SIM.blank = (SIM.blank || 0) + 1;
            else {
                recordQuestionResult({...q,law},ok,(Date.now()-(SIM.startedAt||Date.now()))/1000);
                if (!ok) SIM.wrong = (SIM.wrong || 0) + 1; const st = jget('sim:stats', {}); st[law] = st[law] || { a: 0, c: 0 }; st[law].a++; if (ok) st[law].c++; store.set('sim:stats', JSON.stringify(st));
                let er = jget('sim:errs', []); const ix = er.findIndex(e => e.statement === q.statement);
                if (ok) { SIM.hits++; if (ix >= 0) er.splice(ix, 1); } else if (ix >= 0) er[ix].n++; else er.push(Object.assign({ law, n: 1 }, q));
                store.set('sim:errs', JSON.stringify(er));
            }
            const gab = q.type === 'MC' ? q.answer + ') ' + String((q.options || [])['ABCDE'.indexOf(q.answer)] || '').replace(/^\s*[A-E]\s*[\).\-]\s*/, '') : q.answer === 'C' ? 'CERTO' : 'ERRADO';
            const blk = (t, c, x) => x ? `<div class="mt-2 p-3 rounded-xl bg-[#0E1B33]/70 border-l-4 ${c}"><p class="text-[11px] font-bold uppercase tracking-wider text-slate-300">${t}</p><p class="text-sm text-slate-100">${esc(x)}</p></div>` : '';
            $('sim-fb').innerHTML = `<p class="mt-3 text-sm font-bold ${blank ? 'text-slate-300' : ok ? 'text-emerald-300' : 'text-red-300'}">${blank ? '⏭ Em branco.' : ok ? '✅ Acertou!' : '❌ Errou.'} Gabarito: ${esc(gab)}</p>${blk('📜 Fundamento Legal Exato', 'border-[#E5C158]', q.lawBasis)}${blk('🧠 Comentário Técnico', 'border-sky-400', q.explanation)}${blk('🔑 Chave de Compreensão Rápida', 'border-emerald-400', q.easyTip)}<button data-pmdf-onclick="SIM.i++;drawSim()" class="${BTN} mt-3">${SIM.i + 1 >= SIM.items.length ? 'Ver resultado' : 'Próximo →'}</button>`;
        }
const CLOZE_RE = /(\d+\s*(?:dias|dia|anos|ano|meses|mês|horas|hora)|\d+\/\d+|(?<![A-Za-zÀ-ÿ])(?:somente|apenas|exceto|nunca|sempre|exclusivamente|salvo|independe|inafiançável|imprescritível)(?![A-Za-zÀ-ÿ]))/gi;
        function toggleCloze() { CLOZE_MODE = !CLOZE_MODE; if (CUR.guide) renderGuide(CUR.guide); toast(CLOZE_MODE ? 'Modo Lacunas ativo: toque nos blocos laranja para revelar.' : 'Modo Lacunas desligado.', 'ok'); }
        function applyCloze(){
            if(!CLOZE_MODE)return;
            const selector='#printable-area .g-card,#printable-area .mind-node,#printable-area tbody td,#printable-area ul > li';
            const candidates=[...document.querySelectorAll(selector)],roots=candidates.filter(root=>{
                let parent=root.parentElement;while(parent&&parent!==$('printable-area')){if(parent.matches&&parent.matches(selector))return false;parent=parent.parentElement;}return true;
            });
            roots.forEach(root=>{
                const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
                nodes.forEach(node=>{
                    if(!node.parentNode||node.parentNode.closest('button,input,summary,.g-tag,.cloze-mask'))return;
                    const text=node.nodeValue,regex=new RegExp(CLOZE_RE.source,'gi');if(!regex.test(text))return;
                    const frag=document.createDocumentFragment();let last=0,match;regex.lastIndex=0;
                    while((match=regex.exec(text))){frag.appendChild(document.createTextNode(text.slice(last,match.index)));const span=document.createElement('span');span.className='cloze-mask';span.textContent=match[0];span.addEventListener('click',event=>{event.stopPropagation();span.classList.toggle('on');});frag.appendChild(span);last=match.index+match[0].length;}
                    frag.appendChild(document.createTextNode(text.slice(last)));node.parentNode.replaceChild(frag,node);
                });
            });
        }
        function filterGuide(value){
            const query=String(value||'').toLowerCase().trim(),nodes=[...document.querySelectorAll('#printable-area .g-card,#printable-area .study-card,#printable-area .mind-node,#printable-area tbody tr,#printable-area ul > li')];
            let visible=0;
            nodes.forEach(node=>{const match=!query||node.textContent.toLowerCase().includes(query);node.style.display=match?'':'none';if(match)visible++;});
            let notice=$('guide-filter-empty');if(!notice){notice=document.createElement('p');notice.id='guide-filter-empty';notice.className='no-print text-xs text-slate-400 mt-2';const anchor=$('g-progress');if(anchor)anchor.insertAdjacentElement('afterend',notice);else $('printable-area')?.prepend(notice);}
            notice.textContent=query&&visible===0?'Nenhum conteúdo deste guia corresponde à busca.':'';notice.style.display=query&&visible===0?'block':'none';
        }
        function downloadSimDoc() {
            if (!SIM || !CUR.guide) return; const it = SIM.items, opt = q => q.type === 'MC' ? '<br>' + (q.options || []).map((o, k) => 'ABCDE'[k] + ') ' + esc(o)).join('<br>') : '';
            const gab = q => q.type === 'MC' ? q.answer : q.answer === 'C' ? 'CERTO' : 'ERRADO';
            downloadDoc('Simulado_' + CUR.guide.lawName, `<h1>Simulado — ${esc(CUR.guide.lawName)}</h1><p>${esc($('role-select').value)} · ${esc($('board-select').value)} · ${LEVELS[LEVEL].label}</p>` + it.map((q, i) => `<p><b>${i + 1}.</b> ${esc(q.statement)}${opt(q)}</p>`).join('') + '<h2>Gabarito comentado</h2>' + it.map((q, i) => `<div class="g-card"><p><b>${i + 1}. Gabarito: ${esc(gab(q))}</b> (${esc(q.topic || '')})</p>${q.lawBasis ? `<p><b>Dispositivo legal:</b> ${esc(q.lawBasis)}</p>` : ''}<p><b>Comentário:</b> ${esc(q.explanation || '')}</p>${q.easyTip ? `<p><b>Macete:</b> ${esc(q.easyTip)}</p>` : ''}</div>`).join(''));
        }
        function exportErrorsDoc() {
            const er = jget('sim:errs', []); if (!er.length) return toast('Caderno de Erros vazio.');
            downloadDoc('Caderno_de_Erros', '<h1>Caderno de Erros</h1>' + er.map((e, i) => `<div class="g-card"><p><b>${i + 1}. ${esc(e.law)} › ${esc(e.topic || '')}</b> (${e.n} erro/s)</p><p>${esc(e.statement)}</p><p><b>Gabarito:</b> ${esc(e.answer)}</p>${e.lawBasis ? `<p><b>Dispositivo legal:</b> ${esc(e.lawBasis)}</p>` : ''}<p>${esc(e.explanation || '')}</p>${e.easyTip ? `<p><b>Macete:</b> ${esc(e.easyTip)}</p>` : ''}</div>`).join(''));
        }
        const PANEL_LAWS = [["cpm","Código Penal Militar"],["cppm","Código de Processo Penal Militar"],["estatuto","Estatuto PMDF"],["l12086","Lei 12.086/09"],["abuso","Abuso de Autoridade"],["cp","Código Penal"],["cpp","Código de Processo Penal"],["drogas","Lei de Drogas"],["tortura","Lei de Tortura"],["cf88","CF/88"],["armas","Estatuto do Desarmamento"],["mariadapenha","Maria da Penha"],["hediondos","Crimes Hediondos"],["jecrim","Juizados Especiais Criminais (9.099/95)"],["orcrim","Organização Criminosa (12.850/13)"],["genocidio","Genocídio (2.889/56)"],["racismo","Crimes de Racismo (7.716/89)"],["eca","Estatuto da Criança e do Adolescente"],["improbidade","Improbidade Administrativa (8.429/92)"],["temporaria","Prisão Temporária (7.960/89)"],["jef","Juizados Especiais Federais (10.259/01)"],["r200","Regulamento R-200 (Decreto 88.777/83)"],["d10443","Organização Básica PMDF (Decreto 10.443/20)"],["l14751","Lei Orgânica Nacional das PMs (14.751/23)"]];
        function openPanel(){
            const st=jget('sim:stats',{}),rows=PANEL_LAWS.map(([k,nm])=>{
                const g=BUILTIN_PMDF_GUIDES[k],done=jget('st:'+k,[]).length,tot=g?Object.values(g.articlesMapping||{}).filter(Array.isArray).reduce((sum,a)=>sum+a.length,0):0,pc=tot?Math.min(100,Math.round(100*done/tot)):0,stats=g&&st[g._baseLawName||g.lawName],url=lawUrlForKey(k);
                const name=g?`<button type="button" data-pmdf-special="select-law" data-pmdf-key="${esc(k)}" data-pmdf-url="${esc(url)}" class="text-left text-[#E5C158] hover:text-white underline underline-offset-2">${esc(nm)}</button>`:`<span>${esc(nm)} (guia em breve)</span>`;
                return `<div class="mb-3"><div class="flex justify-between items-center gap-3 text-xs"><span>${name}</span><span class="text-right">${g?done+'/'+tot+' artigos':'—'}${stats?' · simulado '+stats.c+'/'+stats.a:''}</span></div><div class="h-2 rounded bg-[#0E1B33] mt-1"><div class="h-2 rounded bg-[#D4AF37]" style="width:${pc}%"></div></div></div>`;
            }).join('');
            openModal('📊 Painel Geral do Edital PMDF',`${rows}<div class="flex flex-wrap gap-2 mt-4"><button data-pmdf-onclick="exportProgress()" class="${BTN}">⬇ Exportar Backup (.json)</button><button data-pmdf-onclick="exportErrorsDoc()" class="${BTN}">📕 Caderno de Erros (.doc)</button><label class="${BTN} cursor-pointer">⬆ Importar Backup (.json)<input type="file" accept=".json,application/json" class="hidden" data-pmdf-onchange="importProgress(this)"></label></div>`);
        }
        function exportProgress(){
            const data={};try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i),prefix=AUTH_USER?'pmdf:account:'+AUTH_USER.username+':':'pmdf:visitor:';if(key?.startsWith(prefix)){const item=key.slice(prefix.length);if(BACKUP_KEY_RE.test(item))data[item]=localStorage.getItem(key);}}}
            catch(e){return toast('Não foi possível ler o armazenamento.','error');}
            const anchor=document.createElement('a'),name=sanitizeFilename('Backup_Mapeador_'+(CUR.guide?.lawName||'PMDF'))+'.json';
            anchor.href=URL.createObjectURL(new Blob([JSON.stringify({app:'mapeador-leis-policiais',v:2,data},null,2)],{type:'application/json'}));anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(anchor.href),4000);toast('Progresso exportado.','ok');
        }
        async function importProgress(inp){
            if(!AUTH_USER){toast('Entre na conta antes de importar um backup.','error');inp.value='';return;}
            const file=inp.files&&inp.files[0];if(!file)return;
            try{
                if(file.size>20*1024*1024)throw new Error('O backup excede 20 MB. Divida-o em arquivos menores.');
                const j=JSON.parse(await file.text()),data=j&&j.data&&typeof j.data==='object'?j.data:j;if(!data||typeof data!=='object')throw new Error('arquivo inválido');let count=0;
                Object.keys(data).forEach(key=>{if(BACKUP_KEY_RE.test(key)&&typeof data[key]==='string'){if(store.set(key,data[key]))count++;}});
                if(data.lvl&&LEVELS[data.lvl]){LEVEL=data.lvl;store.set('lvl',LEVEL);paintLevel();}
                restoreEssayDraft();restoreLastGuide();toast(count+' registros importados.','ok');if(document.body.classList.contains('landing-active'))refreshWelcome();else openPanel();
            }catch(e){toast('Importação falhou: '+e.message,'error');}
            finally{inp.value='';}
        }
        function openErrors() {
            const st = jget('sim:stats', {}), er = jget('sim:errs', []), laws = Object.keys(st), A = laws.reduce((s, l) => s + st[l].a, 0), C = laws.reduce((s, l) => s + st[l].c, 0);
            const byTopic = {}; er.forEach(e => { const k = e.law + ' › ' + e.topic; byTopic[k] = (byTopic[k] || 0) + e.n; });
            const top = Object.entries(byTopic).sort((x, y) => y[1] - x[1]);
            openModal('📕 Caderno de Erros e Estatísticas', !A ? '<p>Nenhuma resposta registrada ainda. Faça um simulado na Seção 6 do guia.</p>' :
                `<p>Acertos gerais: <b>${C}/${A} (${Math.round(100 * C / A)}%)</b></p><h4 class="font-bold text-[#E5C158] mt-3">Por lei</h4><ul class="list-disc pl-5 text-xs">${laws.map(l => `<li>${esc(l)}: ${st[l].c}/${st[l].a} (${Math.round(100 * st[l].c / st[l].a)}%)</li>`).join('')}</ul>
<h4 class="font-bold text-[#E5C158] mt-3">Revisão urgente (${er.length} item(ns) pendente(s))</h4>${top.length ? `<ul class="list-disc pl-5 text-xs">${top.map(([k, n]) => `<li>${esc(k)} — ${n} erro(s)</li>`).join('')}</ul>` : '<p class="text-xs">Nada pendente. 🎉</p>'}
<div class="flex flex-wrap gap-2 mt-3">${er.length ? `<button data-pmdf-onclick="startSim(jget('sim:errs',[]),true)" class="${BTN}">🔁 Refazer meus erros</button>` : ''}<button data-pmdf-onclick="if(confirm('Apagar todo o histórico?')){store.set('sim:stats','{}');store.set('sim:errs','[]');openErrors()}" class="${BTN}">🗑 Limpar</button></div>`);
        }

        // ---------- Texto motivador: PDF / DOCX / TXT ----------
        function loadScript(u){
            if(SCRIPT_CACHE[u])return SCRIPT_CACHE[u];
            SCRIPT_CACHE[u]=new Promise((resolve,reject)=>{
                const existing=[...document.scripts].find(x=>x.src===u&&x.dataset.loaded==='true');
                if(existing){resolve();return;}
                const script=document.createElement('script');script.src=u;script.async=true;
                script.onload=()=>{script.dataset.loaded='true';resolve();};
                script.onerror=()=>{delete SCRIPT_CACHE[u];script.remove();reject(new Error('Falha ao carregar a biblioteca de leitura (verifique a internet).'));};
                document.head.appendChild(script);
            });
            return SCRIPT_CACHE[u];
        }
        async function loadOCRWorker(){
            try {
                await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js');
                if(!window.Tesseract?.createWorker)throw new Error('Biblioteca de OCR indisponível');
                return await Tesseract.createWorker('por');
            } catch(e){throw new Error('OCR indisponível neste navegador/rede. Envie texto digitalizado por outra ferramenta ou cole o conteúdo: '+(e.message||e));}
        }
        async function readFileText(f){
            const n=String(f.name||'').toLowerCase();
            const image=/\.(png|jpe?g|webp)$/.test(n);
            const maxSize=n.endsWith('.txt')?2*1024*1024:12*1024*1024;
            if(f.size>maxSize)throw new Error('Arquivo excede o limite de '+Math.round(maxSize/1048576)+' MB para análise no navegador.');
            if(!f.size)throw new Error('Arquivo vazio.');
            if(n.endsWith('.txt'))return f.text();
            if(image){
                const worker=await loadOCRWorker();
                try{return (await worker.recognize(f)).data.text||'';}
                finally{await worker.terminate();}
            }
            const buf=await f.arrayBuffer();
            if(n.endsWith('.docx')){
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
                if(!window.mammoth?.extractRawText)throw new Error('Leitor DOCX indisponível');
                return(await mammoth.extractRawText({arrayBuffer:buf})).value;
            }
            if(n.endsWith('.pdf')){
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
                if(!window.pdfjsLib?.getDocument)throw new Error('Leitor PDF indisponível');
                pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                const pdf=await pdfjsLib.getDocument({data:buf}).promise;
                let worker=null,text='';
                try {
                    if(pdf.numPages>80)throw new Error('PDF com mais de 80 páginas. Divida o documento em partes menores.');
                    for(let i=1;i<=pdf.numPages;i++){
                        const pg=await pdf.getPage(i),items=(await pg.getTextContent()).items;
                        let extracted=items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim();
                        // PDF com pouco texto costuma ser escaneado; OCR é gratuito, mas precisa da biblioteca/idioma via CDN.
                        if(extracted.length<40){
                            if(pdf.numPages>12)throw new Error('PDF escaneado com mais de 12 páginas: divida em lotes de até 12 para OCR local.');
                            if(!worker)worker=await loadOCRWorker();
                            const view=pg.getViewport({scale:1.45}),canvas=document.createElement('canvas');
                            canvas.width=Math.ceil(view.width);canvas.height=Math.ceil(view.height);
                            const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas indisponível para OCR');
                            await pg.render({canvasContext:ctx,viewport:view}).promise;
                            extracted=(await worker.recognize(canvas)).data.text||'';
                            canvas.width=0;canvas.height=0;
                        }
                        text+='\n'+extracted+'\n';
                    }
                }finally{if(worker)await worker.terminate().catch(()=>{});await pdf.destroy();}
                return text;
            }
            throw new Error('Formato não suportado. Envie PDF, DOCX, TXT ou imagem.');
        }
        async function onMotivFile(inp) {
            const f = inp.files[0]; if (!f) return; $('motiv-status').textContent = 'Lendo ' + f.name + '...';
            try { const t = (await readFileText(f)).trim(); if (!t) throw new Error('Nenhum texto encontrado (PDF escaneado? cole o texto manualmente).'); const m = $('essay-motiv'); m.value = (m.value ? m.value + '\n\n' : '') + t; $('motiv-status').textContent = '✔ ' + f.name + ' (' + t.length + ' caracteres)'; }
            catch (e) { $('motiv-status').textContent = ''; toast(e.message, 'error'); } inp.value = '';
        }

        // ---------- Exportação / prompt ----------
        const DOC_CSS = 'body{font-family:Calibri,Arial,sans-serif;color:#111;font-size:11pt}h1{font-size:18pt}h2{font-size:14pt;border-bottom:1px solid #999;margin-top:18pt}h3{font-size:12pt}.g-card{border:1px solid #bbb;padding:6pt;margin:6pt 0;page-break-inside:avoid}.g-banner{background:#fff3cd;padding:6pt}.g-ex{color:#116644}.mind-node{border:1px solid #999;background:#f7f7f7;border-radius:6pt;padding:7pt;margin:5pt 0;page-break-inside:avoid}.mind-child{border-left:2px solid #aaa;margin-left:12pt;padding-left:8pt;page-break-inside:avoid}.study-card{display:block;width:100%;border:1px solid #999;background:#fff;border-radius:6pt;padding:8pt;margin:6pt 0;color:#111;page-break-inside:avoid}.study-card .front,.study-card .back{display:block!important;color:#111}.study-card .g-tag{display:inline-block;border:1px solid #ccc;background:#eee;color:#333;padding:2pt 4pt}table{border-collapse:collapse;width:100%;table-layout:auto;margin:6pt 0}thead{display:table-header-group}tr{page-break-inside:avoid}td,th{border:1px solid #888;padding:4pt;vertical-align:top;text-align:left}th{background:#eee;font-weight:bold}.mm-grid{display:table;width:100%}.mm-card{display:inline-block;vertical-align:top;width:45%;border:1px solid #888;border-top:3px solid #666;border-radius:8pt;padding:8pt;margin:4pt;page-break-inside:avoid}.mm-step-text{border:1px solid #ccc;background:#f5f5f5;text-align:center;padding:5pt}.mm-arrow{text-align:center}.mm-compare-row{display:table;width:100%;margin:5pt 0}.mm-compare-row>div{display:table-cell;width:50%;border:1px solid #aaa;padding:6pt}.mm-review-item{display:inline-block;width:28%;border:1px solid #999;padding:5pt;margin:3pt}.mm-nav{display:none}.pmdf-report{font-family:Arial,sans-serif;color:#111;padding:18pt;background:#fff}.pmdf-report-heading{border-bottom:2pt solid #b8860b;padding:9pt 0}.pmdf-report-emblem{color:#b8860b;font-size:20pt}.pmdf-report-kicker{font-weight:bold;color:#8a6800;font-size:9pt}.pmdf-report-heading h1{font-size:19pt;color:#111}.pmdf-report h2{color:#14243d;border-left:3pt solid #b8860b;padding-left:7pt}.pmdf-report-footer{border-top:1pt solid #ccc;padding-top:8pt;font-size:8pt;color:#555}.pmdf-report .g-card,.pmdf-report .study-card{border:1pt solid #ccd2d9;background:#f8fafc;padding:8pt;page-break-inside:avoid}@page Section1{size:595.3pt 841.9pt;margin:42.5pt 39.7pt 48.2pt 39.7pt;mso-header-margin:18pt;mso-footer-margin:18pt}div.Section1{page:Section1}html,body{margin:0;padding:0;width:100%;font:10.5pt/1.5 Calibri,Arial,sans-serif;color:#111}.pmdf-report{padding:0;width:100%;box-sizing:border-box}.pmdf-report-heading{page-break-inside:avoid}.g-card,.study-card,.mm-card{page-break-inside:auto;max-width:100%;word-wrap:break-word}.mm-grid,.mm-review-grid{display:block;width:100%}.mm-card,.mm-review-item{display:block;width:auto;margin:7pt 0;page-break-inside:avoid}.mm-compare-row,.mm-compare-row>div{display:block;width:auto}.pmdf-report h1,.pmdf-report h2,.pmdf-report h3{page-break-after:avoid}p,li{orphans:3;widows:3}table{width:100%;table-layout:fixed;word-wrap:break-word}thead{display:table-header-group}tr{page-break-inside:avoid}td,th{word-wrap:break-word;vertical-align:top}';
        function downloadDoc(title, body) {
            const h = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${DOC_CSS}</style><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]--></head><body><div class="Section1">${body}</div></body></html>`;
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + h], { type: 'application/msword' }));
            a.download = sanitizeFilename(title) + '.doc'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        }
        // Exportação isolada: não depende de abas ocultas, modais ou regras
        // de impressão da interface principal. O navegador oferece Salvar como PDF.
        function exportPdfA4(){
            if(!CUR.guide)return toast('Carregue um guia antes de exportar o PDF.','error');
            const content=guideHtml(CUR.guide,false);
            const name=String(CUR.guide.lawName||'Guia Estratégico');
            const css=[...document.querySelectorAll('style')].filter(el=>
                ['pmdf-clean-ui','pmdf-a4-color-print'].includes(el.id)
            ).map(el=>el.textContent).join('\n');
            const printFix=String.raw`
                @page{size:A4 portrait;margin:13mm 14mm 15mm}
                html,body{margin:0!important;padding:0!important;background:#fff!important;
                  -webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
                body #printable-area{display:block!important;position:static!important;
                  width:100%!important;max-width:none!important;overflow:visible!important;
                  margin:0!important;padding:0!important;border:0!important;box-shadow:none!important}
                #printable-area .pmdf-report{margin:0!important;min-height:0!important;
                  width:100%!important;max-width:100%!important;overflow:visible!important}
                #printable-area .mm-grid,#printable-area .mm-review-grid,
                #printable-area .mm-compare-row{display:block!important;columns:auto!important}
                #printable-area .mm-card,#printable-area .mm-review-item{
                  display:block!important;width:auto!important;margin:0 0 5mm!important;
                  height:auto!important;break-inside:auto!important}
                #printable-area .mm-card-head,#printable-area .mm-step-text,
                #printable-area .pmdf-report-heading{break-inside:avoid!important}
                .no-print,.mm-nav{display:none!important}
                table{width:100%!important;table-layout:fixed!important;overflow-wrap:anywhere}
                th,td{overflow-wrap:anywhere!important}
            `;
            // A janela é aberta diretamente pelo clique, evitando bloqueio de popup.
            const preview=window.open('','_blank');
            if(!preview){
                toast('Permita pop-ups deste site para salvar em PDF. Abrindo impressão da página.','error');
                window.print();return;
            }
            const safeTitle=esc(name);
            preview.document.open();
            preview.document.write('<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'+
                '<meta name="viewport" content="width=device-width,initial-scale=1">'+
                '<title>Método PMDF — '+safeTitle+'</title><style>'+css+'\n'+printFix+
                '</style></head><body><article id="printable-area">'+content+
                '</article></body></html>');
            preview.document.close();
            const printNow=()=>{try{preview.focus();preview.print();}catch(e){toast('Falha ao abrir impressão: '+e.message,'error');}};
            if(preview.document.readyState==='complete')setTimeout(printNow,250);
            else preview.addEventListener('load',()=>setTimeout(printNow,250),{once:true});
        }
        // A exportação da redação é independente do guia de leis.
        function exportEssayPdfA4(){
            const result=$('essay-out'),report=String(ESSAY_MD||'').trim();
            if(!report||!result?.innerHTML?.trim())return toast('Corrija uma redação antes de gerar o PDF.','error');
            const popup=window.open('','_blank');
            if(!popup)return toast('Permita pop-ups para abrir a correção em PDF.','error');
            const title='Correção de Redação — '+String($('essay-theme').value||'Método PMDF').slice(0,100);
            const css=[
              '@page{size:A4 portrait;margin:16mm 15mm 18mm}',
              '*{box-sizing:border-box}html,body{margin:0;padding:0}',
              'body{background:#fff;color:#1d2939;font:10.5pt/1.48 Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
              'main{max-width:100%;overflow-wrap:anywhere}',
              'header{border-top:5px solid #d4af37;border-bottom:1px solid #d8dee7;padding:12px 0 16px;margin:0 0 18px}',
              '.brand{color:#a57c13;font-size:9pt;letter-spacing:.13em;font-weight:800}',
              'h1{font-size:18pt;line-height:1.2;margin:8px 0;color:#172b49}',
              'h2,h3{font-size:13pt;color:#172b49;margin:18pt 0 8pt;page-break-after:avoid;break-after:avoid}',
              'p,li{orphans:3;widows:3;margin:7pt 0;line-height:1.5}ul,ol{padding-left:22px}',
              'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9pt}',
              'th,td{border:1px solid #ccd4df;padding:6pt;vertical-align:top;overflow-wrap:anywhere}',
              'th{background:#f1f4f9;color:#172b49}thead{display:table-header-group}',
              'tr{break-inside:avoid;page-break-inside:avoid}',
              'footer{border-top:1px solid #d8dee7;color:#667085;font-size:8pt;margin-top:20pt;padding-top:8pt}',
              '.no-print,button{display:none!important}'
            ].join('');
            popup.document.open();
            popup.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+
                esc(title)+'</title><style>'+css+'</style></head><body><main><header>'+
                '<div class="brand">MÉTODO PMDF · CORRETOR DE REDAÇÃO</div><h1>'+esc(title)+
                '</h1></header><article>'+result.innerHTML+
                '</article><footer>Material didático — correção local estimada, não oficial.</footer>'+
                '</main></body></html>');
            popup.document.close();
            const print=()=>{try{popup.focus();popup.print();}catch(e){toast('Não foi possível imprimir: '+e.message,'error');}};
            if(popup.document.readyState==='complete')setTimeout(print,250);
            else popup.addEventListener('load',()=>setTimeout(print,250),{once:true});
        }
        function exportToWordDoc() { if (!CUR.guide) return toast('Carregue um guia primeiro.', 'error'); downloadDoc('Guia_' + CUR.guide.lawName, guideHtml(CUR.guide, false)); }
        async function copyHtml(html, plain) {
            try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]); toast('Copiado! Cole no Google Docs.', 'ok'); }
            catch (e) { const d = document.createElement('div'); d.innerHTML = pmdfSafeHtml(html); d.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(d);
                const r = document.createRange(); r.selectNodeContents(d); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
                try { document.execCommand('copy'); toast('Copiado!', 'ok'); } catch (_) { toast('Não foi possível copiar.', 'error'); } s.removeAllRanges(); d.remove(); }
        }
        function copyFormattedGuide() { if (!CUR.guide) return toast('Carregue um guia primeiro.', 'error'); const h = guideHtml(CUR.guide, false); const d = document.createElement('div'); d.innerHTML = pmdfSafeHtml(h); copyHtml(d.innerHTML, d.innerText || d.textContent); }
        function currentPrompt() { return TAB === 'redacao' ? essayPrompt() : lawPrompt(false); }
        function openPromptModal() { $('prompt-modal-text').textContent = currentPrompt(); ensurePromptSwitch(); pmdfOpenDialog('prompt-modal'); }
        function ensurePromptSwitch() {
            if ($('ps-btns')) return; const p = $('prompt-modal-text'), d = document.createElement('div'); d.id = 'ps-btns'; d.className = 'flex flex-wrap gap-2 mb-2';
            d.innerHTML = `<button data-pmdf-onclick="$('prompt-modal-text').textContent=currentPrompt()" class="${BTN}">📄 Prompt do guia / redação</button><button data-pmdf-onclick="$('prompt-modal-text').textContent=scanPrompt()" class="${BTN}">🔎 Prompt de Varredura de Questões</button><button data-pmdf-onclick="$('prompt-modal-text').textContent=pmdfMindPrompt(CUR.guide)" class="${BTN}">🧠 Prompt Mapa Mental (Padrão Outro Turno)</button>`; p.parentNode.insertBefore(d, p);
        }
        function closePromptModal() { pmdfCloseDialog('prompt-modal'); }
        function copyPromptFromModal() { navigator.clipboard.writeText($('prompt-modal-text').textContent).then(() => toast('Prompt copiado!', 'ok'), () => toast('Selecione e copie manualmente.', 'error')); }
        function showJsonPrompt(){$('prompt-modal-text').textContent=lawPrompt(true);if($('external-json-input'))$('external-json-input').classList.add('hidden');if($('external-json-help'))$('external-json-help').classList.add('hidden');}
        function toggleExternalJsonInput(){const area=$('external-json-input'),help=$('external-json-help');if(!area)return;area.classList.toggle('hidden');if(help)help.classList.toggle('hidden');if(!area.classList.contains('hidden'))area.focus();}
        function importExternalGuide(){
            const area=$('external-json-input'),raw=(area?.value||'').trim();if(!raw)return toast('Cole o JSON retornado pela IA antes de importar.','error');
            try{
                if(raw.length>10_000_000)throw new Error('O guia JSON excede 10 milhões de caracteres.');
                const cleaned=raw.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();let parsed=JSON.parse(cleaned);if(Array.isArray(parsed))parsed=parsed[0];
                const g=parsed&&parsed.guide?parsed.guide:parsed;
                if(!g||typeof g!=='object'||!g.lawName)throw new Error('O JSON precisa conter lawName.');
                if(!g.executiveSummary&&!g.articlesMapping)throw new Error('O JSON precisa conter executiveSummary ou articlesMapping.');
                g.executiveSummary=g.executiveSummary||{centralObjective:'Resumo não informado.',keyConcepts:[]};
                g.structuralXRay=g.structuralXRay||{highPriority:[],secondaryPriority:[],deadZones:[]};
                g.articlesMapping=g.articlesMapping||{highIncidence:[],mediumIncidence:[],lowIncidence:[]};
                g.trapsAndJurisprudence=g.trapsAndJurisprudence||{examTraps:[],jurisprudence:[]};g.essayRepertoire=Array.isArray(g.essayRepertoire)?g.essayRepertoire:[];
                g._baseLawName=g._baseLawName||g.lawName;
                const key='custom-ai-'+hash(g.lawName+'|'+cleaned.slice(0,2000));CUR={key,guide:g,_poolCache:Object.create(null)};
                store.set('custom:'+key,JSON.stringify(g));store.set('lastKey',key);closePromptModal();renderGuide(g,true);toast('Guia JSON importado e salvo neste dispositivo.','ok');
            }catch(e){toast('Não foi possível importar o JSON: '+e.message,'error');}
        }

        // =====================================================
        // CORRETOR DE REDAÇÃO (CEBRASPE)
        // =====================================================
        function essayPrompt() {
            const tema = $('essay-theme').value.trim() || '[INSERIR TEMA AQUI]', txt = $('essay-text').value.trim() || '[INSERIR TEXTO DA REDAÇÃO AQUI]', tl = $('essay-lines').value || String(getEssayLineCount(txt)), mt = $('essay-motiv').value.trim() || '[Não informado]';
            return `Atue como um Examinador Sênior da Banca CEBRASPE especializado em provas discursivas de carreiras policiais (CFP). Sua tarefa é corrigir a redação abaixo com rigor extremo, simulando as etapas do espelho de correção oficial.

TEMA: ${tema}
TEXTO MOTIVADOR E TÓPICOS EXIGIDOS PELA BANCA:
${mt}
REDAÇÃO DO CANDIDATO:
${txt}
NÚMERO DE LINHAS ESTIMADO: ${tl}

Use o texto motivador e os tópicos da banca como parâmetro: na ETAPA 1, desconte da NC cada tópico não abordado; na ETAPA 5, avalie a fuga ao tema com base neles.
Perfil do candidato: ${LEVELS[LEVEL].essay}

Siga EXATAMENTE as etapas abaixo para gerar a sua resposta de correção:

### ETAPA 1 — ANÁLISE DE CONTEÚDO (NC)
Avalie o texto atribuindo uma Nota de Conteúdo (NC) de 0,00 a 20,00 pontos. Divida a análise em:

Progressão lógica e Estrutura dissertativa: Verifique se o texto tem 4 parágrafos equilibrados, uso estrito da impessoalidade (sem 1ª pessoa) e conectivos corretos (ex: deduzir nota se "portanto" ou "por conseguinte" forem usados fora da conclusão).
Repertório Técnico: Avalie a profundidade. Penalize (desconto na NC) se o candidato mencionar ideias normativas de forma implícita sem nomear a lei específica (ex: deve citar nominalmente Lei 13.869/2019, Portaria Interministerial nº 4.226/2010, Pacto de San José, etc.).
Proposta de intervenção: Verifique se possui claramente AGENTE, AÇÃO, MEIO (ex: Lei 12.850) e FINALIDADE.
Ao final desta etapa, declare a "NOTA DE CONTEÚDO (NC): [Nota de 0 a 20]".

### ETAPA 2 — ANÁLISE DA MODALIDADE ESCRITA (NE)
Seja inflexível com a gramática. Liste todos os erros encontrados (ortografia, acentuação, vírgula entre sujeito e verbo, propriedade vocabular, inversão de sentido).
Apresente no seguinte formato de tabela:
| Nº | Trecho original com erro | Tipo de erro | Forma correta |
Ao final, declare o "TOTAL DE ERROS (NE): [Soma dos erros]".

### ETAPA 3 — CONTAGEM DE LINHAS (TL)
Considere o total de linhas (TL) como o número informado no início do prompt.

### ETAPA 4 — CÁLCULO DA NPD
Calcule a Nota Provisória Discursiva (NPD) usando estritamente a fórmula oficial do Cebraspe:
Fórmula: NPD = NC - (4 × NE ÷ TL)
Mostre o passo a passo do cálculo na sua resposta.

### ETAPA 5 — SITUAÇÕES ELIMINATÓRIAS
Responda com "Configurada" ou "Não configurada" para:

Fuga ao tema:
Extensão / ausência de texto (menos de 20 linhas):
Uso de primeira pessoa:

### ETAPA 6 — RESULTADO FINAL
Apresente um quadro resumo:

NC (Nota de Conteúdo):
NE (Número de Erros):
TL (Total de Linhas):
NPD (Nota Final):
VEREDITO: [Aprovado / Reprovado]

### ETAPA 7 — FEEDBACK TÉCNICO
Elabore um feedback conciso e direto ao ponto (com indicação das linhas estimadas):

Pontos Fortes: Liste até 3 destaques do texto (ex: uso de repertório, acerto na tese).
Pontos Críticos: Liste até 3 falhas principais (foco nos erros de Modalidade Escrita ou ausência de leis explícitas).
Recomendações: Dê 3 dicas práticas de melhoria imediata para a próxima redação.

### ETAPA 8 — REESCRITURA PADRÃO NOTA MÁXIMA (20,00)
Se a Nota Final (NPD) calculada na Etapa 6 for inferior a 20,00 pontos, apresente, ao final da sua avaliação, uma reescritura completa da redação do candidato focada em atingir a nota máxima. Esta nova versão deve OBRIGATORIAMENTE:

Corrigir todos os erros gramaticais e de ortografia apontados na Etapa 2.
Inserir explicitamente as leis, portarias ou fundamentos sociológicos que faltaram (conforme apontado nas críticas da Etapa 1 e 7).
Reestruturar o texto para exatos 4 parágrafos.
Garantir que a proposta de intervenção possua Agente, Ação, Meio e Finalidade de forma inquestionável.
Ter extensão compatível com 30 linhas manuscritas (aproximadamente 350 a 400 palavras).
Se a nota já for 20,00, apenas parabenize o candidato e informe que a reescritura não é necessária.`;
        }
        function estimateLines() { const w = ($('essay-text').value.trim().match(/\S+/g) || []).length; if (!w) return toast('Cole o texto primeiro.'); $('essay-lines').value = Math.max(1, Math.ceil(w / 12)); essayLive(); }
        function calcNPD() { const nc = parseFloat($('npd-nc').value), ne = parseFloat($('npd-ne').value), tl = parseFloat($('npd-tl').value);
            $('npd-out').textContent = (isNaN(nc) || isNaN(ne) || !tl) ? 'NPD: —' : 'NPD = ' + nc.toFixed(2) + ' − (4×' + ne + '÷' + tl + ') = ' + Math.max(0, nc - 4 * ne / tl).toFixed(2).replace('.', ','); }
        // Markdown mínimo → HTML (títulos, negrito, listas, tabelas)
        function md(src) {
            const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
            const lines = src.split('\n'); let out = '', ul = false, tb = [];
            const flushT = () => { if (!tb.length) return; const rows = tb.filter(r => !/^\|?\s*:?-{2,}/.test(r)).map(r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
                out += '<div style="overflow-x:auto"><table><thead><tr>' + rows[0].map(c => `<th>${inl(c)}</th>`).join('') + '</tr></thead><tbody>' + rows.slice(1).map(r => '<tr>' + r.map(c => `<td>${inl(c)}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>'; tb = []; };
            for (const l of lines) {
                if (/^\s*\|/.test(l)) { if (ul) { out += '</ul>'; ul = false; } tb.push(l.trim()); continue; } flushT();
                const h = l.match(/^#{1,4}\s+(.*)/), li = l.match(/^\s*[-*•]\s+(.*)/);
                if (li) { if (!ul) { out += '<ul>'; ul = true; } out += `<li>${inl(li[1])}</li>`; continue; }
                if (ul) { out += '</ul>'; ul = false; }
                if (h) out += `<h3>${inl(h[1])}</h3>`; else if (l.trim() && !/^---+$/.test(l.trim())) out += `<p>${inl(l)}</p>`;
            }
            flushT(); return out + (ul ? '</ul>' : '');
        }
        function copyEssayResult() { copyHtml($('essay-out').innerHTML, ESSAY_MD); }
        function exportEssayDoc() { downloadDoc('Correcao_Redacao_' + ($('essay-theme').value.trim() || 'Cebraspe'), `<h1>Correção de Redação — Cebraspe</h1><p><b>Tema:</b> ${esc($('essay-theme').value)}</p>` + $('essay-out').innerHTML); }

        // =====================================================================
        // REFATORAÇÃO DE PRODUÇÃO — fontes isoladas, formatos, parser universal
        // O banco legado acima permanece íntegro; as quatro entradas ausentes
        // abaixo completam as 14 chaves exibidas na interface.
        // =====================================================================
        const SUMMARY_FORMATS = ['full','bullets','table','mind','flash','traps'];
        let SOURCE_MODE = 'url';
        let SUMMARY_FORMAT = SUMMARY_FORMATS.includes(store.get('summaryFormat')) ? store.get('summaryFormat') : 'full';
        let LAW_FILE_NAME = '';
        const STUDY_GLOSSARY = {
            dolo:'Vontade consciente de praticar a conduta ou assumir o risco do resultado.',
            culpa:'Violação do dever de cuidado por imprudência, negligência ou imperícia.',
            preterdoloso:'Conduta dolosa que produz resultado mais grave por culpa.',
            inafiançável:'Crime para o qual a Constituição ou a lei não admite fiança.',
            imprescritível:'Pretensão punitiva ou executória que não se extingue pelo decurso do prazo prescricional.',
            'ex officio':'Por iniciativa da própria autoridade, sem depender de provocação.',
            sursis:'Suspensão condicional da execução da pena, quando preenchidos os requisitos legais.',
            menagem:'Modalidade de benefício/menagem prevista no processo penal militar, com condições legais próprias.',
            prevaricação:'Retardar, deixar de praticar ou praticar ato de ofício contra a lei para satisfazer interesse ou sentimento pessoal.',
            peculato:'Apropriação, desvio ou subtração de bem a que o agente público tem acesso em razão do cargo.',
            concussão:'Exigir vantagem indevida em razão da função pública.',
            competência:'Parcela de atribuição jurisdicional ou administrativa conferida por norma.',
            ilicitude:'Contrariedade da conduta ao ordenamento jurídico.',
            culpabilidade:'Juízo de reprovação pessoal da conduta típica e ilícita.'
        };
        const safeArray = v => Array.isArray(v) ? v : [];
        const textOf = v => String(v == null ? '' : v);
        const sanitizeFilename = value => {
            const clean = String(value || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'_').replace(/[. ]+$/g,'').replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,120);
            return clean || 'arquivo';
        };
        const FIRST_PERSON_RE = /(?<![A-Za-zÀ-ÿ])(eu|me|meu|minha|meus|minhas|nós|nos|nosso|nossa|nossos|nossas|acho|penso|creio|acredito|considero|entendo|devemos|precisamos|podemos|temos|vamos|sabemos|somos)(?![A-Za-zÀ-ÿ])/gi;
        function firstPersonTerms(text){ FIRST_PERSON_RE.lastIndex=0; return uniq([...String(text||'').matchAll(FIRST_PERSON_RE)].map(m=>m[0].toLowerCase())); }
        function hasFirstPerson(text){ FIRST_PERSON_RE.lastIndex=0; return FIRST_PERSON_RE.test(String(text||'')); }
        function getEssayLineCount(text){
            const manual=String($('essay-lines')?.value||'').trim();
            if(manual){const n=parseInt(manual,10);if(Number.isFinite(n)&&n>0)return Math.max(1,Math.min(60,n));}
            const words=(String(text||'').match(/\S+/g)||[]).length;
            return Math.max(1,Math.ceil(words/12));
        }
        function saveEssayDraft(){
            const draft={theme:$('essay-theme')?.value||'',lines:$('essay-lines')?.value||'',motiv:$('essay-motiv')?.value||'',text:$('essay-text')?.value||''};
            store.set('essay:draft',JSON.stringify(draft));saveStudySession();
        }
        function restoreEssayDraft(){
            const draft=jget('essay:draft',null); if(!draft||typeof draft!=='object')return;
            if($('essay-theme'))$('essay-theme').value=draft.theme||'';
            if($('essay-lines'))$('essay-lines').value=draft.lines||'';
            if($('essay-motiv'))$('essay-motiv').value=draft.motiv||'';
            if($('essay-text'))$('essay-text').value=draft.text||'';
            if(typeof essayLive==='function')essayLive();
        }
        function getCardBox(id){
            const fc=Math.max(0,Math.min(4,parseInt(store.get('fc:'+id)||'0',10)||0));
            const lt=Math.max(0,Math.min(4,parseInt(store.get('leitner:'+id)||'0',10)||0));
            const box=Math.max(fc,lt), due=Math.max(0,Number(store.get('leitnerDue:'+id)||0)||0);
            return {box,due};
        }
        function setCardBox(id,known){
            const current=getCardBox(id).box, next=known?Math.min(4,current+1):0, days=[0,1,3,7,14][next];
            const due=Date.now()+days*86400000;
            store.set('fc:'+id,String(next)); store.set('leitner:'+id,String(next)); store.set('leitnerDue:'+id,String(due));
            return {box:next,due};
        }
        function getCachedPool(g,fmt,lvl){
            if(!g)return[];
            CUR._poolCache=CUR._poolCache||Object.create(null);
            const key=(CUR.key||'')+'|'+fmt+'|'+lvl+'|'+g.lawName;
            if(!Object.prototype.hasOwnProperty.call(CUR._poolCache,key))CUR._poolCache[key]=questionPool(g,fmt,lvl);
            return CUR._poolCache[key];
        }
        function lawUrlForKey(key){
            return ({cpm:'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001.htm',cppm:'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm',estatuto:'https://www.planalto.gov.br/ccivil_03/leis/l7289.htm',l12086:'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12086.htm',abuso:'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm',cp:'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm',cpp:'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm',drogas:'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm',tortura:'https://www.planalto.gov.br/ccivil_03/leis/l9455.htm',cf88:'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm',armas:'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm',mariadapenha:'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm',hediondos:'https://www.planalto.gov.br/ccivil_03/leis/l8072.htm'})[key]||EXTRA_LAW_URLS[key]||'';
        }
        function restoreLastGuide(){
            const key=store.get('lastKey');
            if(key&&BUILTIN_PMDF_GUIDES[key]){CUR={key,guide:BUILTIN_PMDF_GUIDES[key],_poolCache:Object.create(null)};setSourceMode('url');$('law-input').value=lawUrlForKey(key);markShortcut(key);renderGuide(CUR.guide);return true;}
            if(key&&key.startsWith('custom-')){
                try{const g=JSON.parse(store.get('custom:'+key)||'null');if(g&&g.lawName){CUR={key,guide:g,_poolCache:Object.create(null)};setSourceMode('text');if($('law-text-title'))$('law-text-title').value=g.lawName;markShortcut(key);renderGuide(g);return true;}}catch(e){}
            }
            selectAndLoadLaw('cpm',lawUrlForKey('cpm'));return false;
        }
        const flatGuideText = g => [g.lawName, g.executiveSummary && g.executiveSummary.centralObjective,
            ...(g.executiveSummary && g.executiveSummary.keyConcepts || []),
            ...Object.values(g.structuralXRay || {}).flatMap(safeArray).flatMap(x => [x.title,x.reason]),
            ...Object.values(g.articlesMapping || {}).filter(Array.isArray).flatMap(a => a.flatMap(x => [x.article,x.plainExplanation,x.practicalExample])),
            ...(g.trapsAndJurisprudence && g.trapsAndJurisprudence.examTraps || []),
            ...(g.trapsAndJurisprudence && g.trapsAndJurisprudence.jurisprudence || []),
            ...safeArray(g.essayRepertoire).flatMap(x => [x.legalDevice,x.themes,x.modelSentence])].join(' ');

        // Guias complementares: síntese organizada para estudo; conferir sempre a legislação vigente.
        const makeItem = (article, plainExplanation, practicalExample) => ({article,plainExplanation,practicalExample});
        Object.assign(BUILTIN_PMDF_GUIDES, {
            cf88: {
                lawName:'Constituição da República Federativa do Brasil de 1988 — Arts. 5º, 37, 42, 125, § 4º e 144',
                targetRole:'CFP / Soldado PMDF (Curso de Formação de Praças)', examBoard:'Cebraspe',
                executiveSummary:{centralObjective:'A Constituição estabelece os direitos e garantias fundamentais, os princípios que regem a Administração Pública, o estatuto constitucional dos militares estaduais e distritais, a competência da Justiça Militar estadual e a organização da segurança pública. Para a PMDF, o estudo deve conectar legalidade da atuação policial, hierarquia e disciplina, controle judicial e atribuições constitucionais dos órgãos de segurança.',keyConcepts:[
                    'Art. 5º: direitos fundamentais e garantias individuais; legalidade, proteção contra tortura, devido processo, contraditório, ampla defesa e remédios constitucionais.',
                    'Art. 37: Administração direta e indireta submetida aos princípios da legalidade, impessoalidade, moralidade, publicidade e eficiência (LIMPE).',
                    'Art. 42: policiais militares e bombeiros militares dos Estados, DF e Territórios são militares organizados com base na hierarquia e disciplina.',
                    'Art. 125, § 4º: Justiça Militar estadual julga militares dos Estados nos crimes militares definidos em lei; crime doloso contra a vida de civil é julgado pelo Tribunal do Júri, na forma constitucional.',
                    'Art. 144: segurança pública é dever do Estado, direito e responsabilidade de todos; às PMs cabe polícia ostensiva e preservação da ordem pública.' ]},
                structuralXRay:{highPriority:[{title:'Art. 5º — Direitos e garantias fundamentais',reason:'Base da legalidade da abordagem, busca pessoal, prisão, uso da força e proteção da pessoa custodiada.'},{title:'Art. 37 — Princípios da Administração Pública',reason:'Princípios, concurso público, acumulação e responsabilidade administrativa são temas recorrentes.'},{title:'Arts. 42 e 144 — Regime militar e segurança pública',reason:'Relacionam hierarquia/disciplina com missão constitucional das polícias militares.'}],secondaryPriority:[{title:'Art. 125, § 4º — Justiça Militar estadual',reason:'Ponto central de competência e deslocamento ao Tribunal do Júri.'}],deadZones:[]},
                articlesMapping:{highIncidence:[
                    makeItem('Art. 5º — Direitos e garantias fundamentais','Todos são iguais perante a lei. A Constituição protege vida, liberdade, igualdade, segurança e propriedade e prevê garantias como legalidade, vedação à tortura, devido processo, contraditório, ampla defesa e proteção da liberdade.','Em uma prisão em flagrante, o agente deve respeitar os direitos do preso, comunicar a prisão e preservar sua integridade.'),
                    makeItem('Art. 37, caput — Princípios administrativos','A Administração Pública direta e indireta de qualquer Poder e ente federativo obedece à legalidade, impessoalidade, moralidade, publicidade e eficiência.','Uma decisão administrativa da corporação deve ter fundamento legal, finalidade pública e transparência, respeitados os sigilos legais.'),
                    makeItem('Art. 42 — Militares dos Estados e do DF','Os membros das Polícias Militares e Corpos de Bombeiros Militares são militares dos Estados, do Distrito Federal e dos Territórios, organizados com base na hierarquia e disciplina.','A cadeia de comando organiza o serviço, mas não legitima ordem manifestamente ilegal.'),
                    makeItem('Art. 125, § 4º — Justiça Militar estadual','Compete à Justiça Militar estadual processar e julgar os militares dos Estados nos crimes militares definidos em lei; as ações judiciais contra atos disciplinares militares também se submetem à competência ali indicada. A competência do Tribunal do Júri prevalece nos crimes dolosos contra a vida de civil, conforme a ressalva constitucional.','A imputação de crime doloso contra a vida de civil a policial militar desloca o julgamento para o Tribunal do Júri.'),
                    makeItem('Art. 144, §§ 5º e 6º — Polícia Militar','À Polícia Militar cabe a polícia ostensiva e a preservação da ordem pública. As PMs e os CBMs subordinam-se aos Governadores dos Estados, do DF e dos Territórios.','O policiamento ostensivo preventivo é atribuição constitucional da PM, sem confusão com a polícia judiciária comum.')],
                    mediumIncidence:[makeItem('Art. 5º, incisos LIV e LV — Devido processo','Ninguém será privado da liberdade ou de seus bens sem devido processo legal; aos litigantes e acusados são assegurados contraditório e ampla defesa.','Em processo disciplinar, a Administração deve assegurar oportunidade real de defesa.'),makeItem('Art. 37, II e XVI — Concurso e acumulação','A investidura em cargo ou emprego público depende de concurso, ressalvadas as hipóteses constitucionais; a acumulação remunerada é vedada, salvo exceções expressas e com compatibilidade de horários.','Não se pode criar por edital uma hipótese de acumulação além das previstas na Constituição.')],lowIncidence:[]},
                trapsAndJurisprudence:{examTraps:['Art. 37: trocar eficiência por eficácia como princípio expresso — errado; a redação constitucional enumera eficiência.','Art. 42: afirmar que hierarquia e disciplina são opcionais — errado; são bases constitucionais da organização militar.','Art. 125, § 4º: dizer que todo crime militar de PM é julgado pela Justiça Militar — errado; há ressalva para crime doloso contra a vida de civil, da competência do Júri.','Art. 144: atribuir à PM a polícia judiciária comum — errado; a missão constitucional da PM é polícia ostensiva e preservação da ordem pública.'],jurisprudence:['A interpretação do art. 125, § 4º deve observar a ressalva constitucional relativa ao Tribunal do Júri nos crimes dolosos contra a vida de civil. Verificar precedentes atuais do STF sobre competência em casos concretos.']},
                essayRepertoire:[{legalDevice:'Arts. 5º, 37, 42 e 144 da Constituição Federal',themes:'Legalidade policial, direitos fundamentais, profissionalismo, hierarquia e eficiência da segurança pública.',modelSentence:'A atuação da Polícia Militar encontra fundamento nos arts. 42 e 144 da Constituição Federal, devendo conciliar hierarquia e disciplina com a observância dos direitos fundamentais e dos princípios que regem a Administração Pública.'}]
            },
            armas:{
                lawName:'Lei nº 10.826/2003 — Estatuto do Desarmamento',targetRole:'CFP / Soldado PMDF (Curso de Formação de Praças)',examBoard:'Cebraspe',
                executiveSummary:{centralObjective:'A Lei nº 10.826/2003 disciplina o registro, a posse, a comercialização e o porte de armas de fogo e munições, estrutura o Sistema Nacional de Armas (Sinarm) e define crimes relacionados a armas. O estudo deve separar posse em local autorizado, porte fora desses limites, competências administrativas e crimes dos arts. 12 a 18.',keyConcepts:['Sinarm: sistema nacional sob responsabilidade da Polícia Federal, com atribuições de cadastro e controle previstas na lei.','Posse irregular (art. 12): manter arma de uso permitido em desacordo com determinação legal ou regulamentar no interior da residência ou dependência, ou no local de trabalho nas condições legais.','Porte ilegal (art. 14): portar, deter, adquirir, fornecer, receber, transportar ou ocultar arma de uso permitido sem autorização e em desacordo com a norma.','Arma de uso restrito/proibido e comércio/tráfico internacional têm figuras próprias, especialmente nos arts. 16 a 18.']},
                structuralXRay:{highPriority:[{title:'Arts. 1º e 2º — Sinarm',reason:'Competência, cadastro e alcance nacional do sistema.'},{title:'Arts. 4º a 6º — Aquisição, registro e porte',reason:'Distinguir requisitos de aquisição e registro das hipóteses legais de porte.'},{title:'Arts. 12 a 18 — Crimes',reason:'Diferenças entre posse, porte, disparo, posse/porte restrito, comércio e tráfico internacional.'}],secondaryPriority:[{title:'Arts. 7º a 11-A — Controle, taxas e procedimentos',reason:'Complementa a parte administrativa e a fiscalização.'}],deadZones:[]},
                articlesMapping:{highIncidence:[
                    makeItem('Arts. 1º e 2º — Sinarm','O Sinarm, instituído no âmbito da Polícia Federal, possui circunscrição em todo o território nacional e competências cadastrais e de controle descritas na lei.','A consulta cadastral de arma registrada deve considerar o sistema e as competências legalmente atribuídas.'),
                    makeItem('Art. 4º — Aquisição de arma de fogo de uso permitido','A aquisição depende do atendimento aos requisitos legais, entre eles declaração de efetiva necessidade, idoneidade, ocupação lícita e residência certa, capacidade técnica e aptidão psicológica, nos termos legais e regulamentares.','O interessado não adquire arma apenas por declarar interesse; precisa comprovar os requisitos exigidos.'),
                    makeItem('Art. 5º — Certificado de Registro','O certificado autoriza a manutenção da arma nos locais e condições definidos em lei, especialmente residência/domicílio e local de trabalho quando o proprietário ou responsável legal pelo estabelecimento. Não equivale, por si só, a porte geral.','Manter arma registrada na residência não autoriza transportá-la pronta para uso na via pública.'),
                    makeItem('Art. 6º — Proibição do porte e exceções','O porte é em regra proibido em todo o território nacional, ressalvadas as categorias e situações expressamente autorizadas pela legislação.','Uma pessoa não enquadrada em hipótese legal não pode presumir autorização de porte a partir do registro da arma.'),
                    makeItem('Arts. 12 e 14 — Posse irregular e porte ilegal','O art. 12 trata da posse irregular de arma de uso permitido em local abrangido pela norma; o art. 14 tipifica condutas de porte e circulação sem autorização, em desacordo com determinação legal ou regulamentar.','Arma irregular guardada em casa pode configurar art. 12; levá-la consigo em via pública pode configurar art. 14, conforme circunstâncias.'),
                    makeItem('Arts. 16 a 18 — Uso restrito/proibido, comércio e tráfico internacional','A lei prevê tipos penais distintos para posse/porte ilegal de arma de uso restrito ou proibido, comércio ilegal de arma de fogo e tráfico internacional de arma, acessório ou munição.','Não confundir o transporte ilegal em território nacional com a importação ou exportação clandestina.')],
                    mediumIncidence:[makeItem('Art. 15 — Disparo de arma de fogo','Disparar arma de fogo ou acionar munição em lugar habitado, em suas adjacências, em via pública ou em direção a ela é crime, ressalvadas as hipóteses legais de excludente.','O disparo em via pública não se confunde automaticamente com porte ilegal: são tipos distintos e podem concorrer conforme o caso.')],lowIncidence:[]},
                trapsAndJurisprudence:{examTraps:['Posse não é sinônimo de porte: o certificado de registro não concede autorização geral para circular armado.','Trocar o local da conduta: art. 12 aborda posse em residência/dependência ou local de trabalho nos limites legais; art. 14 trata de porte e condutas correlatas.','Afirmar que o porte é livre para qualquer pessoa que tenha registro — errado; a regra do art. 6º é a proibição, com exceções legais.','Confundir comércio ilegal (art. 17) com tráfico internacional (art. 18).'],jurisprudence:['A aplicação dos tipos penais exige conferir a classificação normativa da arma (permitido, restrito ou proibido) vigente à época do fato e a regulamentação aplicável.']},
                essayRepertoire:[{legalDevice:'Lei nº 10.826/2003 — Estatuto do Desarmamento',themes:'Controle estatal de armas, segurança pública, prevenção da violência e fiscalização.',modelSentence:'O Estatuto do Desarmamento estrutura mecanismos de registro e controle de armas de fogo, demonstrando que a política de segurança pública exige fiscalização técnica, rastreabilidade e observância estrita das hipóteses legais de posse e porte.'}]
            },
            mariadapenha:{
                lawName:'Lei nº 11.340/2006 — Lei Maria da Penha',targetRole:'CFP / Soldado PMDF (Curso de Formação de Praças)',examBoard:'Cebraspe',
                executiveSummary:{centralObjective:'A Lei Maria da Penha cria mecanismos para prevenir e coibir a violência doméstica e familiar contra a mulher, estabelece medidas de assistência e proteção e organiza providências policiais e judiciais. Para a prova, concentre-se nos âmbitos de incidência (art. 5º), nas cinco formas de violência (art. 7º), no atendimento policial, nas medidas protetivas de urgência e no crime de descumprimento de medida protetiva.',keyConcepts:['Art. 5º: violência doméstica e familiar pode ocorrer no âmbito da unidade doméstica, da família ou de relação íntima de afeto; não se exige coabitação.','Art. 7º: formas de violência — física, psicológica, sexual, patrimonial e moral.','Arts. 10 a 12-C: providências e atuação da autoridade policial no atendimento à mulher em situação de violência.','Arts. 18 a 24: medidas protetivas de urgência, que podem ser concedidas de imediato e isolada ou cumulativamente; a proteção deve considerar a persistência do risco.','Art. 24-A: descumprir decisão judicial que defere medida protetiva de urgência constitui crime.']},
                structuralXRay:{highPriority:[{title:'Arts. 5º e 7º — Âmbito de incidência e formas de violência',reason:'Ponto de partida para enquadrar a situação fática e identificar as cinco modalidades.'},{title:'Arts. 10 a 12-C — Atendimento policial',reason:'Providências imediatas, registro, proteção e encaminhamento.'},{title:'Arts. 18 a 24-A — Medidas protetivas e descumprimento',reason:'Competência judicial, urgência, conteúdo das medidas e tipo penal de descumprimento.'}],secondaryPriority:[{title:'Arts. 8º e 9º — Políticas públicas e assistência',reason:'Integração institucional e atendimento multidisciplinar.'}],deadZones:[]},
                articlesMapping:{highIncidence:[
                    makeItem('Art. 5º — Configuração de violência doméstica e familiar','A lei considera violência doméstica e familiar contra a mulher a ação ou omissão baseada no gênero que cause morte, lesão, sofrimento físico, sexual ou psicológico e dano moral ou patrimonial, nos âmbitos doméstico, familiar ou de relação íntima de afeto. A coabitação não é requisito.','Ex-companheiros podem estar abrangidos pela lei mesmo que nunca tenham morado juntos, desde que configurado o contexto legal.'),
                    makeItem('Art. 7º — Formas de violência','A lei enumera violência física, psicológica, sexual, patrimonial e moral. A classificação não se limita à agressão física.','Reter documentos, destruir objetos ou controlar recursos pode caracterizar violência patrimonial, conforme o caso.'),
                    makeItem('Arts. 10 a 12-C — Atendimento pela autoridade policial','A autoridade policial deve adotar providências legais cabíveis diante da iminência ou prática de violência doméstica, incluindo proteção, registro, coleta de elementos e encaminhamentos previstos na lei.','O atendimento exige acolhimento e adoção das providências protetivas, sem tratar o caso como simples conflito privado.'),
                    makeItem('Arts. 18 e 19 — Medidas protetivas de urgência','Recebido o expediente, o juiz deve apreciar o pedido no prazo legal de 48 horas. As medidas podem ser concedidas de imediato, sem audiência prévia das partes e sem prejuízo da manifestação do Ministério Público nos termos legais; podem ser aplicadas isolada ou cumulativamente.','Diante de risco atual, a apreciação judicial da medida protetiva deve observar o procedimento urgente previsto na lei.'),
                    makeItem('Arts. 22 a 24 — Conteúdo das medidas protetivas','As medidas podem impor obrigações ao agressor, proteger a ofendida e resguardar bens e direitos, nos termos dos dispositivos. A seleção depende da situação concreta e do risco identificado.','Afastamento do lar e proibição de aproximação são exemplos de providências que podem ser determinadas judicialmente.'),
                    makeItem('Art. 24-A — Descumprimento de medida protetiva','Descumprir decisão judicial que defere medidas protetivas de urgência previstas na lei constitui crime, sem prejuízo de outras consequências cabíveis.','O agente que, ciente da decisão judicial, viola a proibição de aproximação pode incidir no tipo, conforme prova dos elementos legais.')],
                    mediumIncidence:[makeItem('Art. 8º — Diretrizes de política pública','A prevenção da violência doméstica deve ocorrer por meio de ações articuladas entre União, Estados, DF, Municípios e entidades não governamentais, dentro das diretrizes legais.','A rede de atendimento pressupõe integração de segurança, saúde, assistência social e Justiça.')],lowIncidence:[]},
                trapsAndJurisprudence:{examTraps:['Art. 5º: afirmar que a coabitação é indispensável — errado; a lei expressamente não a exige para a relação íntima de afeto.','Art. 7º: reduzir violência doméstica à agressão física — errado; há cinco formas legais.','Art. 19: afirmar que a medida protetiva depende sempre de audiência prévia — errado; a lei permite concessão imediata nos termos do dispositivo.','Art. 24-A: confundir descumprimento de medida protetiva com mero ilícito civil — errado; há tipo penal próprio.'],jurisprudence:['A Súmula 600 do STJ estabelece que, para a configuração da violência doméstica e familiar prevista no art. 5º da Lei 11.340/2006, não se exige coabitação entre autor e vítima.','A aplicação da lei e das medidas protetivas deve observar a redação legal vigente e a avaliação concreta do risco à ofendida.']},
                essayRepertoire:[{legalDevice:'Arts. 5º, 7º e 18 a 24-A da Lei nº 11.340/2006',themes:'Proteção de grupos vulneráveis, prevenção da violência, atendimento policial humanizado e integração institucional.',modelSentence:'A Lei nº 11.340/2006 reconhece diferentes formas de violência doméstica e estabelece instrumentos protetivos urgentes, impondo ao sistema de segurança pública atuação articulada, acolhedora e orientada à prevenção da revitimização.'}]
            },
            hediondos:{
                lawName:'Lei nº 8.072/1990 — Lei dos Crimes Hediondos',targetRole:'CFP / Soldado PMDF (Curso de Formação de Praças)',examBoard:'Cebraspe',
                executiveSummary:{centralObjective:'A Lei nº 8.072/1990 define os crimes considerados hediondos e disciplina consequências penais e processuais específicas. Também equipara a hediondos a tortura, o tráfico ilícito de entorpecentes e drogas afins e o terrorismo. O estudo deve priorizar o rol legal (art. 1º), as consequências do art. 2º, a prisão temporária e as alterações legislativas recentes.',keyConcepts:['Art. 1º: rol legal de crimes hediondos, consumados ou tentados, com tipos e hipóteses definidos na própria lei.','Art. 2º: hediondos e equiparados são insuscetíveis de anistia, graça, indulto e fiança.','A prisão temporária nos crimes do rol tem prazo de 30 dias, prorrogável por igual período em caso de extrema e comprovada necessidade.','A lista é legal e sofre alterações: estudar a redação compilada e as inclusões posteriores, inclusive as alterações da Lei nº 15.159/2025.']},
                structuralXRay:{highPriority:[{title:'Art. 1º — Rol de crimes hediondos',reason:'A identificação do rol e suas alterações é o núcleo literal da lei.'},{title:'Art. 2º — Consequências e vedações',reason:'Anistia, graça, indulto, fiança e prisão temporária são temas de pegadinha.'}],secondaryPriority:[{title:'Art. 5º e alterações correlatas',reason:'Dispositivos de ajuste legislativo e integração com o Código Penal e legislação especial.'}],deadZones:[]},
                articlesMapping:{highIncidence:[
                    makeItem('Art. 1º — Crimes hediondos','A lei considera hediondos os crimes expressamente listados, consumados ou tentados, conforme os tipos e qualificadoras indicados. O rol é legal, não depende apenas de avaliação subjetiva de gravidade. A redação recebeu alterações posteriores, inclusive pela Lei nº 15.159/2025.','Na prova, confira se o tipo penal e a circunstância qualificadora correspondem exatamente a uma hipótese prevista no art. 1º.'),
                    makeItem('Art. 1º, parágrafo único — Hipóteses equiparadas por lei','O dispositivo inclui outras hipóteses previstas expressamente, como genocídio, determinados crimes relativos a armas de fogo, organização criminosa direcionada à prática de crime hediondo ou equiparado e crimes militares que apresentem identidade com crimes do rol, nos termos da redação legal.','A banca pode cobrar a inclusão de crime de comércio ilegal ou tráfico internacional de armas nas hipóteses legais.'),
                    makeItem('Art. 2º, caput — Restrições constitucionais-legais','Os crimes hediondos e equiparados são insuscetíveis de anistia, graça, indulto e fiança. Não se deve confundir vedação à fiança com impossibilidade absoluta de liberdade provisória em qualquer situação.','A afirmação de que é vedada fiança está correta; dizer que toda forma de liberdade provisória é impossível extrapola o texto.'),
                    makeItem('Art. 2º, § 1º — Regime inicial','O texto legal prevê regime inicialmente fechado; a aplicação concreta deve ser lida em conjunto com a jurisprudência constitucional sobre individualização da pena e fundamentação do regime.','A banca pode cobrar literalidade do dispositivo e, em questão jurisprudencial, exigir a ressalva da orientação do STF.'),
                    makeItem('Art. 2º, § 4º — Prisão temporária','A prisão temporária, nos crimes previstos no artigo, tem prazo de 30 dias, prorrogável por igual período em caso de extrema e comprovada necessidade.','O prazo especial não deve ser trocado pelo prazo ordinário de cinco dias da Lei de Prisão Temporária.')],
                    mediumIncidence:[makeItem('Art. 2º — Equiparação constitucional','Tortura, tráfico ilícito de entorpecentes e terrorismo recebem tratamento constitucional equiparado aos crimes hediondos para as vedações expressas, embora não sejam necessariamente integrantes do rol do art. 1º.','Diferenciar “crime hediondo” em sentido estrito de “equiparado a hediondo”.')],lowIncidence:[]},
                trapsAndJurisprudence:{examTraps:['Trocar o rol legal por uma avaliação subjetiva de gravidade: a classificação depende de previsão normativa.','Confundir crimes hediondos em sentido estrito com os equiparados (tortura, tráfico e terrorismo).','Art. 2º: a vedação à fiança não equivale, automaticamente, à proibição de toda liberdade provisória.','Prisão temporária: prazo de 30 dias, prorrogável por mais 30 dias em caso de extrema e comprovada necessidade.','Afirmar que o regime inicial fechado pode ser imposto automaticamente e sem fundamentação individualizada — observar a orientação constitucional do STF.'],jurisprudence:['STF: a imposição automática de regime inicial fechado aos condenados por crimes hediondos/equiparados, sem consideração individualizada das circunstâncias judiciais, não se compatibiliza com a individualização da pena.','A lei foi alterada em 2025; conferir a redação atual do art. 1º, inclusive a inclusão de hipóteses de lesões graves contra agentes públicos e outras categorias legalmente protegidas.']},
                essayRepertoire:[{legalDevice:'Art. 5º, XLIII, da Constituição Federal e Lei nº 8.072/1990',themes:'Política criminal, proteção de agentes públicos, prevenção da violência e proporcionalidade das sanções.',modelSentence:'O tratamento jurídico dos crimes hediondos e equiparados deve articular a resposta penal reforçada prevista na Constituição e na Lei nº 8.072/1990 com as garantias do devido processo e da individualização da pena.'}]
            }
        });


        // Gavetas de seleção: retornam ao estado recolhido após a escolha.
        // Preserva os onclicks existentes e a navegação por teclado.
        document.addEventListener('click', function(e) {
            const target=e.target;
            if(!(target instanceof Element))return;
            const choice=target.closest('.more-laws-drawer .law-shortcut-btn, .pmdf-account-menu button, .pmdf-account-menu a');
            if(choice){
                const drawer=choice.closest('details');
                if(drawer)drawer.open=false;
            }
            document.querySelectorAll('.more-laws-drawer[open], .pmdf-account-menu[open]').forEach(drawer=>{
                if(!drawer.contains(target))drawer.open=false;
            });
        });
        document.addEventListener('keydown',function(e){
            if(e.key==='Escape')document.querySelectorAll('.more-laws-drawer[open], .pmdf-account-menu[open]').forEach(drawer=>{
                drawer.open=false;const summary=drawer.querySelector('summary');if(summary)summary.focus();
            });
        });

        function setSourceMode(mode) {
            if (!['url','text','file'].includes(mode)) return;
            SOURCE_MODE = mode;
            ['url','text','file'].forEach(k => {
                const panel = $('source-' + k + '-panel'), tab = $('source-tab-' + k);
                if (panel) panel.classList.toggle('hidden', k !== mode);
                if (tab) { tab.classList.toggle('active', k === mode); tab.setAttribute('aria-selected', String(k === mode)); tab.tabIndex=k===mode?0:-1; }
            });
            if (window.lucide) lucide.createIcons();
        }
        // Navegação padrão WAI-ARIA das três fontes: setas, Home e End.
        document.addEventListener('keydown',event=>{
            const tab=event.target?.closest?.('[role="tab"][id^="source-tab-"]');
            if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
            const keys=['url','text','file'];
            const index=keys.indexOf(tab.id.slice('source-tab-'.length));
            if(index<0)return;
            event.preventDefault();
            const next=event.key==='Home'?0:event.key==='End'?keys.length-1:
                (index+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;
            setSourceMode(keys[next]);$('source-tab-'+keys[next])?.focus();
        });
        function countLawText() {
            const t = $('law-text') ? $('law-text').value : '';
            const words = (t.match(/\S+/g) || []).length;
            if ($('law-text-counter')) $('law-text-counter').textContent = words.toLocaleString('pt-BR') + ' palavras · ' + t.length.toLocaleString('pt-BR') + ' caracteres';
        }
        function clearLawText() { if ($('law-text')) $('law-text').value = ''; if ($('law-text-title')) $('law-text-title').value = ''; countLawText(); }
        function setSummaryFormat(format) {
            if (!SUMMARY_FORMATS.includes(format)) return;
            SUMMARY_FORMAT = format; store.set('summaryFormat', format);
            ['summary-format-config','summary-format-toolbar'].forEach(id => { if ($(id)) $(id).value = format; });
            if (CUR.guide) renderGuide(CUR.guide);
        }
        function lawDisplayName() {
            if (SOURCE_MODE === 'text') return $('law-text-title').value.trim() || 'Texto personalizado';
            if (SOURCE_MODE === 'file') return LAW_FILE_NAME || $('law-file-name').textContent || 'Arquivo enviado';
            return $('law-input').value.trim();
        }
        function setupLawDropzone() {
            const dz = $('law-dropzone'); if (!dz) return;
            dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('border-[#D4AF37]','bg-[#D4AF37]/10'); });
            dz.addEventListener('dragleave', () => dz.classList.remove('border-[#D4AF37]','bg-[#D4AF37]/10'));
            dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('border-[#D4AF37]','bg-[#D4AF37]/10'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) onLawFile({files:[f],value:''}); });
        }
        async function onLawFile(inp) {
            const f = inp && inp.files && inp.files[0]; if (!f) return;
            if(f.size>50*1024*1024){toast('Arquivo superior a 50 MB. Envie uma versão compactada para evitar travamentos.','error');return;}
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            if (!['pdf','docx','txt','png','jpg','jpeg','webp'].includes(ext)) { toast('Formato inválido. Selecione PDF, DOCX, TXT ou imagem.', 'error'); return; }
            LAW_FILE_NAME = f.name;
            if ($('law-file-name')) $('law-file-name').textContent = 'Arquivo: ' + f.name;
            $('law-file-status').textContent = 'Extraindo conteúdo...';
            try {
                const t = (await readFileText(f)).trim();
                if (!t) throw new Error('Nenhum texto extraível foi encontrado. Verifique a qualidade do documento.');
                $('law-file-preview').value = t;
                $('law-file-status').textContent = '✔ Extração concluída · ' + t.length.toLocaleString('pt-BR') + ' caracteres';
                setSourceMode('file');
                toast('Arquivo extraído. Revise a pré-visualização antes de analisar.', 'ok');
            } catch (e) { $('law-file-status').textContent = 'Falha na extração'; toast(e.message, 'error'); }
            if (inp && 'value' in inp) { try { inp.value = ''; } catch (_) {} }
        }
        // Parser agnóstico: dispositivos, cláusulas, itens, listas e texto corrido.
        const UNIVERSAL_MARKER = /^(?:(?:Art(?:igo)?\.?|Cl[aá]usula|S[uú]mula(?:\s+Vinculante)?|Enunciado|Inciso|Par[aá]grafo|§|Item|T[oó]pico|Se[cç][aã]o|Cap[ií]tulo|T[ií]tulo|Livro|Al[ií]nea|Princ[ií]pio|Diretriz|Norma|Quest[aã]o)\s*(?:n[º°o.]?\s*)?(?:[0-9]+(?:\.[0-9]+)*|[IVXLCDM]+|[A-Za-zÀ-ÿ]+[0-9]*)?(?:[º°oª])?(?:\s*[-–—.):]\s*)?|(?:\d+(?:\.\d+)*[.)]?|[IVXLCDM]+\s*[-–—)]|[a-z]\)))\s*/i;
        function parseArticles(raw) {
            let t = String(raw || '').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ');
            t = t.replace(/(?<=[.;:])\s+(?=(?:Art(?:igo)?\.?\s*\d|Cl[aá]usula\s+\d|S[uú]mula\s+\d|Enunciado\s+\d|§\s*\d))/gi,'\n');
            const lines = t.split(/\n+/).map(x => x.trim()).filter(Boolean), found = [];
            let cur = null, heading = '';
            for (const line of lines) {
                const m = line.match(UNIVERSAL_MARKER);
                if (m) {
                    const label = m[0].trim().replace(/[\s:–—-]+$/,'') || ('Tópico ' + (found.length + 1));
                    let body = line.slice(m[0].length).trim().replace(/^[º°ª]\s*/, '');
                    if (/^(?:T[ií]tulo|Livro|Cap[ií]tulo|Se[cç][aã]o)\b/i.test(label) && body.length < 100) { heading = [label,body].filter(Boolean).join(' — '); cur = {label:heading,head:'',text:''}; }
                    else { cur = {label,head:heading,text:body}; }
                    found.push(cur); continue;
                }
                if (/^(?:T[ií]tulo|Livro|Cap[ií]tulo|Se[cç][aã]o)\b/i.test(line) && line.length < 150) {
                    heading = line; cur = {label:line,head:'',text:''}; found.push(cur); continue;
                }
                if (cur) cur.text += (cur.text ? ' ' : '') + line;
            }
            const cleanFound = found.map((a,i) => ({label:a.label || 'Tópico '+(i+1),head:a.head || '',text:(a.text || '').replace(/\s+/g,' ').trim()})).filter(a => a.text.length > 0);
            if (cleanFound.length) return cleanFound;
            // Fallback para doutrina, notícia, jurisprudência, anotações ou texto livre.
            const paras = t.split(/\n\s*\n+/).map(x => x.replace(/\s+/g,' ').trim()).filter(Boolean);
            const source = paras.length ? paras : [t.replace(/\s+/g,' ').trim()].filter(Boolean);
            const topics = [];
            source.forEach(par => {
                const sentences = par.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/).filter(Boolean);
                if (par.length > 1000 && sentences.length > 3) {
                    for (let i=0;i<sentences.length;i+=3) topics.push(sentences.slice(i,i+3).join(' ').trim());
                } else topics.push(par);
            });
            return topics.filter(Boolean).map((text,i) => ({label:'Tópico '+(i+1),head:'Texto corrido',text}));
        }
        function buildExtractiveSummary(arts, name) {
            // Síntese extrativa: não cria fatos ausentes do material recebido.
            const ranked=[...arts].sort((a,b)=>(b.s||0)-(a.s||0));
            const picks=[],seen=new Set();
            for (const a of ranked) {
                const phrase=firstSentences(String(a.text||''),300).replace(/\s+/g,' ').trim();
                const key=phrase.toLowerCase().slice(0,90);
                if(phrase.length>15&&!seen.has(key)){seen.add(key);picks.push((a.label ? a.label+': ' : '')+phrase);}
                if(picks.length>=6)break;
            }
            return 'Síntese do conteúdo fornecido — '+name+'.\n\n'+picks.join('\n\n')+'\n\nResumo extrativo local. Confira o texto original para detalhes, exceções e contexto.';
        }
        function analyzeLawText(raw, nameHint) {
            const arts = parseArticles(raw);
            if (!arts.length) throw new Error('Não há conteúdo textual para analisar. Cole pelo menos uma frase ou um parágrafo.');
            arts.forEach(a => Object.assign(a, scoreArt(a)));
            const n = arts.length, ranked = [...arts].sort((x,y)=>y.s-x.s);
            const nh = Math.max(1,Math.ceil(n*.45)), nm = Math.min(n-nh,Math.ceil(n*.3)), nl = n-nh-nm; // analisar todas as unidades
            const hi=ranked.slice(0,nh), me=ranked.slice(nh,nh+nm), lo=ranked.slice(nh+nm,nh+nm+nl);
            const m=String(raw).slice(0,2500).match(/((?:LEI COMPLEMENTAR|LEI|DECRETO-LEI|DECRETO|CONSTITUIÇÃO)[^\n]{0,40}?N[º°o.]*\s*[\d.]+[^\n]{0,70})/i);
            const hint=String(nameHint||'').trim();
            const lawName=hint && !/^https?:/i.test(hint) && hint.length<=160 ? hint : (m ? m[1].replace(/\s+/g,' ').trim() : 'Material personalizado');
            const toItem=a=>{
                const base=firstSentences(a.text,400)||a.text.slice(0,400), notes=[];
                if(a.pr.length) notes.push('Prazos/valores: '+uniq(a.pr).slice(0,5).join('; ')+'.');
                if(a.pe.length) notes.push('Sanções citadas: '+uniq(a.pe.map(x=>x.toLowerCase())).join(', ')+'.');
                if(a.re.length) notes.push('Termos restritivos: '+uniq(a.re.map(x=>x.toLowerCase())).slice(0,6).join(', ')+'.');
                const ss=sentencesOf(base), mu=ss.length?mutations(ss[0])[0]:null;
                const item=makeItem(a.label+(a.head?' ('+a.head.replace(/\s+/g,' ').slice(0,60)+')':''),base+(notes.length?' Atenção: '+notes.join(' '):''),mu?'Treino de prova: “'+mu.text+'”. A alteração proposta deve ser conferida com o texto-fonte.':'Exemplo de aplicação: identifique o sujeito, a conduta, os requisitos e as exceções descritos neste tópico.');
                item.sourceText=a.text;item.sourceHeading=a.head;return item;
            };
            const groups={}; arts.forEach((a,i)=>{const k=a.head||('Bloco temático '+(Math.floor(i/5)+1));(groups[k]=groups[k]||[]).push(a);});
            const secs=Object.entries(groups).map(([title,list])=>({title,sum:list.reduce((v,a)=>v+Math.max(0,a.s),0),list,reason:list.length+' unidade(s) · '+list.reduce((v,a)=>v+a.pr.length,0)+' prazo(s)/valor(es) · '+list.reduce((v,a)=>v+a.pe.length,0)+' referência(s) a sanção · '+list.reduce((v,a)=>v+a.re.length,0)+' termo(s) restritivo(s).'})).sort((a,b)=>b.sum-a.sum);
            const sec3=Math.max(1,Math.ceil(secs.length/3)), kc=[];
            arts.filter(a=>/(considera-se|entende-se|define-se|constitui)/i.test(a.text)).slice(0,4).forEach(a=>kc.push(a.label+' — '+firstSentences(a.text,250)));
            hi.forEach(a=>{if(kc.length<8)kc.push(a.label+' — '+firstSentences(a.text,230));});
            const traps=[]; hi.forEach(a=>{uniq(a.pr).slice(0,2).forEach(p=>{if(traps.length<12)traps.push(a.label+': atenção ao número/prazo “'+p+'”; a banca pode alterar o quantitativo.');}); const r=uniq(a.re.map(x=>x.toLowerCase()))[0]; if(r&&traps.length<12)traps.push(a.label+': atenção ao termo restritivo “'+r+'”, que delimita o alcance da regra.');});
            const rep=hi.slice(0,3).map(a=>({legalDevice:a.label+' — '+lawName,themes:uniq((a.text.match(/[A-Za-zÀ-ÿ]{6,}/g)||[]).filter(w=>!STOP.has(w.toLowerCase()))).slice(0,4).join(', ')||'legalidade, segurança pública e direitos fundamentais',modelSentence:'Conforme o conteúdo de '+a.label+' ('+lawName+'), '+lcSmart(firstSentences(a.text,180).replace(/[.:;]\s*$/,''))+', o que evidencia a importância da atuação estatal conforme as regras aplicáveis.'}));
            return {lawName,targetRole:$('role-select').value,examBoard:$('board-select').value,
                executiveSummary:{centralObjective:buildExtractiveSummary(arts,lawName),keyConcepts:kc.length?kc:['Conceito central: '+firstSentences(arts[0].text,220)]},
                structuralXRay:{highPriority:secs.slice(0,sec3).map(x=>({title:x.title,reason:x.reason})),secondaryPriority:secs.slice(sec3,sec3*2).map(x=>({title:x.title,reason:x.reason})),deadZones:secs.slice(sec3*2).map(x=>({title:x.title,reason:x.reason}))},
                articlesMapping:{highIncidence:hi.map(toItem),mediumIncidence:me.map(toItem),lowIncidence:lo.map(toItem)},
                trapsAndJurisprudence:{examTraps:traps,jurisprudence:['A análise não valida jurisprudência externa. Pesquise súmulas e precedentes atuais do STF e STJ relacionados ao tema antes de utilizar esta seção como fundamento.']},essayRepertoire:rep};
        }
        async function fetchLawText(url) {
            const proxies=[u=>'https://r.jina.ai/'+u,u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),u=>'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u),u=>'https://corsproxy.io/?'+encodeURIComponent(u)];
            const failures=[];
            for(let i=0;i<proxies.length;i++){
                const proxyUrl=proxies[i](url),ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),14000);
                try{
                    const r=await fetch(proxyUrl,{signal:ctl.signal,headers:{'Accept':'text/plain,text/html,*/*'}}); clearTimeout(timer);
                    if(!r.ok)throw new Error('HTTP '+r.status);
                    const buf=await r.arrayBuffer(); let txt=new TextDecoder('utf-8').decode(buf);
                    if((txt.match(/�/g)||[]).length>2)txt=new TextDecoder('windows-1252').decode(buf);
                    const plain=proxyUrl.startsWith('https://r.jina.ai/')||!/<(?:html|body|p|div|table|br)\b/i.test(txt)?txt:htmlToText(txt);
                    if(plain.trim().length>40&&parseArticles(plain).length>0)return plain;
                    throw new Error('resposta sem conteúdo textual estruturado suficiente');
                }catch(e){clearTimeout(timer);failures.push(e.message||'falha de rede');}
            }
            throw new Error('Falha de acesso externo/CORS após quatro tentativas. Cole o texto na aba “Colar Texto Extraído” ou envie um PDF/DOCX/TXT.');
        }
        async function generateStrategicGuide() {
            const filter=$('filter-input').value.trim(); let raw='', nameHint='', key=null, built=null;
            // A fonte ativa determina sozinha a entrada; campos de outras abas são ignorados.
            if(SOURCE_MODE==='url'){
                const law=$('law-input').value.trim(); if(!law)return toast('Informe o link ou nome da norma na aba URL.','error');
                nameHint=law; key=matchKey(law); built=key&&BUILTIN_PMDF_GUIDES[key];
                if(built){let g=built;if(filter){g=filterBuiltGuide(built,filter)||built;} CUR={key,guide:g};renderGuide(g,true);return toast('Guia interno carregado.','ok');}
                if(!/^https?:\/\//i.test(law))return toast('Norma não encontrada no banco interno. Informe um link oficial ou utilize texto/arquivo.','error');
                setLoading(true,'Buscando o texto da norma pela cascata de proxies...');
                try{raw=await fetchLawText(law);}catch(e){setLoading(false);return toast(e.message,'error');}
            }else if(SOURCE_MODE==='text'){
                raw=$('law-text').value.trim(); nameHint=$('law-text-title').value.trim()||'Texto personalizado';
                if(!raw)return toast('Cole o conteúdo na aba “Colar Texto Extraído”.','error');
            }else{
                raw=$('law-file-preview').value.trim(); nameHint=$('law-file-title').value.trim()||LAW_FILE_NAME||'Arquivo personalizado';
                if(!raw)return toast('Envie um PDF, DOCX, TXT ou imagem e revise a pré-visualização.','error');
            }
            setLoading(true,'Analisando o material e construindo o guia...');
            try{
                await new Promise(r=>setTimeout(r,20)); let g=analyzeLawText(raw,nameHint);
                if(filter){const fg=filterBuiltGuide(g,filter);if(fg)g=fg;else toast('O recorte não encontrou correspondências; exibindo o conteúdo completo.');}
                g._baseLawName=g._baseLawName||g.lawName;CUR={key:'custom-'+hash(g.lawName+'|'+raw.slice(0,300)),guide:g,_poolCache:Object.create(null)};store.set('custom:'+CUR.key,JSON.stringify(g));store.set('lastKey',CUR.key);renderGuide(g,true);
                toast('Guia gerado: '+parseArticles(raw).length+' bloco(s) analisado(s).','ok');
            }catch(e){toast('Não foi possível analisar: '+e.message,'error');}finally{setLoading(false);}
        }
        function mutations(s) {
            const out=[], seen=new Set(), add=(text,hint)=>{if(text&&text!==s&&!seen.has(text)){seen.add(text);out.push({text,hint});}};
            const nm=String(s).match(/(\d+)(\s*\([^)]*\))?(\s*)(dias|dia|meses|mês|anos|ano|horas|hora)\b/i);
            if(nm){const alts=NUMALT[nm[4].toLowerCase()]||[];const val=alts.find(x=>x!==+nm[1]);if(val)add(s.replace(nm[0],val+nm[3]+nm[4]),'o texto informa '+nm[1]+' '+nm[4]);}
            const fr=String(s).match(/(?<![\d.\/])(\d)\/(\d)(?![\d\/])/);if(fr&&FRAC[fr[0]])add(s.replace(fr[0],FRAC[fr[0]]),'a fração do texto é '+fr[0]);
            for(const [a,b] of SWAPS){const re=wordRe(a,'i'),m=String(s).match(re);if(m){const rep=/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(m[0])?ucf(b):b;add(String(s).replace(re,rep),'o termo original é “'+m[0]+'”');}if(out.length>=6)break;}
            if(out.length<2)add(String(s).replace(/[.!?]?$/,'')+' em qualquer hipótese, independentemente de requisitos adicionais.','a afirmação acrescenta uma generalização que não consta do trecho-base');
            if(out.length<2)add('Não se aplica a regra de que '+lcSmart(String(s).replace(/[.!?]$/,''))+'.','a afirmação inverte o sentido do trecho-base');
            return out.slice(0,6);
        }
        function sentencesOf(txt) {
            const clean=String(txt||'').replace(/\s+/g,' ').trim(); if(!clean)return [];
            let parts=clean.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9§])/).map(x=>x.trim()).filter(Boolean);
            parts=parts.filter(x=>x.length>=18&&x.length<=520&&!/^(?:Cebraspe|banca|Exemplo|mnemônico|Treino)\b/i.test(x));
            if(!parts.length)parts=[clean.slice(0,520)];
            return parts.slice(0,20);
        }
        function makeMCOptions(correct, seed, corpus) {
            const opts=[], push=x=>{x=String(x||'').trim();if(x&&x!==correct&&!opts.includes(x))opts.push(x);};
            mutations(correct).forEach(x=>push(x.text));
            shuffle(corpus.filter(x=>x!==correct)).forEach(x=>{if(opts.length<4)push(x);});
            const low=lcSmart(correct.replace(/[.!?]$/,''));
            [
                'Não se aplica a regra descrita: '+low+'.',
                'A regra é sempre afastada, sem necessidade de verificar os requisitos legais.',
                'A aplicação depende, em todos os casos, de autorização judicial prévia.',
                'O dispositivo estabelece exceção absoluta e sem ressalvas à regra indicada.'
            ].forEach(push);
            while(opts.length<4)push('A alternativa não reproduz o conteúdo literal do material analisado ('+(opts.length+1)+').');
            return shuffle([{text:correct,correct:true},...opts.slice(0,4).map(text=>({text,correct:false}))]);
        }
        // As questões devem partir de uma proposição verificável, não de títulos,
        // fragmentos ou textos cortados por resumos extrativos.
        function fullQuestionSentences(text) {
            const raw=String(text||'').replace(/\s+/g,' ').trim();
            if(!raw||/[.…]\s*$/.test(raw)&&/…/.test(raw)||raw.includes('…'))return [];
            // Não quebrar após abreviações normativas (Art., Arts., inc., nº etc.).
            const protectedText=raw.replace(/\b(Arts?|incs?|al[sí]neas?|n[º°o]|p[áa]gs?|Drs?)\.(?=\s|\d)/gi,(m)=>m.slice(0,-1)+'∯');
            const chunks=protectedText.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ§0-9])/).map(x=>x.replace(/∯/g,'.').trim());
            const hasVerb=/(?:\b(?:é|são|foi|será|deve|pode|cabe|compete|constitui|configura|consiste|depende|exige|pressupõe|inclui|exclui|veda|proíbe|permite|aplica|ocorre|implica|prevê|estabelece|considera|responde|incorre|sujeita|assegura|garante|incide|ser|estar|ter|haver|existir|punir|cumprir|dispõe|determina|requer|admite|autoriza|impede|resulta|corresponde|caracteriza|compreende|envolve|define|abrange|atinge|alcança|dispensa|restringe|prescreve)\b|\b[a-záéíóúâêôãõç]{4,}(?:am|em|ará|erá|irá|avam|ariam|eriam|iriam|asse|esse|isse)\b)/i;
            return chunks.filter(t=>{
                const v=t.replace(/^\s*[-–•]\s*/,'').trim();
                if(v.length<48||v.length>1500||!hasVerb.test(v))return false;
                if(/(?:[:;,\-–—(/]|\b(?:de|do|da|dos|das|e|ou|para|com|sem|por|mediante|conforme|segundo|sobre|quanto|art\.?|arts\.?|inciso|§))\s*$/i.test(v))return false;
                if(/^(?:art(?:s)?\.?\s*\d+|(?:embriaguez|homicídio|furto|roubo)\s+em\s+serviço\s*\(art\.)\s*$/i.test(v))return false;
                if((v.match(/\(/g)||[]).length!==(v.match(/\)/g)||[]).length)return false;
                return true;
            }).map(t=>/[.!?]$/.test(t)?t:t+'.');
        }
        // Gerador determinístico. Não inventa normas, precedentes ou decisões.
        // Os distratores são comparados à proposição original e a base é indicada no gabarito.
        const EXAMINER_RUBRIC={
          iniciante:{label:'Literalidade e conceitos',focus:'identificação da regra principal'},
          intermediario:{label:'Requisitos e aplicação',focus:'condições, hipóteses e consequências'},
          avancado:{label:'Exceções e distinções',focus:'limites, prazos e qualificadores da norma'}
        };
        function examItemStyle(level,kind,bank,head,assoc=false){
            // O enunciado deve terminar com uma pergunta completa, e não
            // dois-pontos: questionIsComplete rejeita enunciados incompletos.
            if(assoc)return level==='iniciante'?
                'Conforme o trecho-base de '+head+' no material, qual alternativa reproduz corretamente a proposição examinada?':
                level==='intermediario'?
                'Considerando o dispositivo '+head+' e seu conteúdo específico no material, qual associação reproduz corretamente a regra apresentada?':
                'Considerando o texto fornecido e os limites da proposição registrada em '+head+', qual alternativa corresponde com precisão ao trecho-base?';
            if(kind==='MC')return level==='iniciante'?'Sobre '+head+', assinale a alternativa correta:':
                level==='intermediario'?'Considerando os requisitos e efeitos previstos em '+head+', assinale a alternativa correta:':
                'À luz das condições e das exceções de '+head+', identifique a única alternativa compatível com o guia:';
            return level==='iniciante'?'Com fundamento em '+head+', julgue a assertiva: ':
                level==='intermediario'?'Considerando os requisitos legais previstos em '+head+', julgue a assertiva: ':
                'Considerando o alcance e os limites de '+head+', julgue a proposição: ';
        }
        function examSourceQuality(s,level){
            const t=String(s||'').trim();
            if(!fullQuestionSentences(t).length||t.length>1350||t.includes('…'))return false;
            if(level==='iniciante')return true;
            if(level==='intermediario')return /(?:deve|pode|compete|cabe|condição|requisito|pena|sanção|prazo|quando|exige|constitui|prevê|somente|exceto|crime|direito|dever|vedad|permite|proíbe|ocorre)/i.test(t);
            return /(?:salvo|exceto|somente|apenas|desde que|mediante|depende|independe|prazo|mínimo|máximo|até|não|vedad|proibid|competência|ressalvad|quando|crime|pena|sanção|deve|pode|\d+\s*(?:dias|anos|meses|horas|%))/i.test(t);
        }
        function qualifiedQuestionMutations(sentence,level){
            const original=String(sentence||'').trim(),out=[],seen=new Set();
            const add=(pattern,replacement,hint)=>{
                const m=pattern.exec(original);if(!m)return;
                const word=typeof replacement==='function'?replacement(m):replacement;
                const text=original.slice(0,m.index)+word+original.slice(m.index+m[0].length);
                if(seen.has(text)||!fullQuestionSentences(text).length)return;
                seen.add(text);out.push({text,hint,original:m[0],replacement:word});
            };
            // Mudanças em elementos expressos da proposição, sem "não é correto afirmar que".
            add(/\bnão\s+(?:pode|podem|deve|devem)\b/i,m=>m[0].replace(/^não\s+/i,''),'A negação normativa foi suprimida.');
            add(/(?<!\bnão\s)\b(?:pode|podem|deve|devem)\b/i,m=>'não '+m[0],'Foi introduzida uma negação contrária ao trecho-base.');
            add(/\bé\s+vedad[oa]\b/i,'é permitido','A proibição foi trocada por permissão.');
            add(/\bé\s+permitid[oa]\b/i,'é vedado','A permissão foi trocada por proibição.');
            add(/\bobrigatóri[oa]\b/i,'facultativo','O caráter obrigatório foi trocado por facultativo.');
            add(/\bfacultativ[oa]\b/i,'obrigatório','O caráter facultativo foi trocado por obrigatório.');
            add(/\bdepende\s+de\b/i,'independe de','Foi removido um requisito de dependência.');
            add(/\bindepende\s+de\b/i,'depende de','Foi imposto um requisito ausente na regra.');
            add(/(?<!\bnão\s)\b(?:poderá|deverá|será|terá)\b/i,m=>'não '+m[0],'Foi adicionada negação ao comando do texto-base.');
            add(/\b(?:somente|apenas|exclusivamente)\b/i,'inclusive','Uma restrição expressa foi convertida em inclusão.');
            add(/\bsempre\b/i,'nunca','A abrangência temporal ou normativa foi invertida.');
            add(/\bnunca\b/i,'sempre','A vedação temporal ou normativa foi invertida.');
            if(level!=='iniciante')add(/\b(\d{1,3})(\s+(?:dias?|meses?|anos?|horas?))\b/i,m=>String(Number(m[1])+(Number(m[1])<10?1:2))+m[2],'O prazo ou número foi alterado.');
            if(level==='avancado')add(/\b(1\/3|1\/2|2\/3|1\/6)\b/,m=>({'1/3':'1/2','1/2':'2/3','2/3':'1/3','1/6':'1/3'})[m[1]],'A fração legal foi alterada.');
            return out.slice(0,5);
        }
        function questionPool(g,fmt,lvl,requestedCount=5){
            const level=LEVELS_SAFE_LEVEL(lvl),A=g.articlesMapping||{},law=g._baseLawName||g.lawName||'Conteúdo estudado';
            const all=[],used=new Set(),bank=$('q-board')?.value||'Cebraspe';
            const extract=(arr,inc)=>safeArray(arr).forEach(a=>{
                const head=String(a.article||'').trim();if(!head)return;
                const raw=String(a.sourceText||a.plainExplanation||'').replace(/\s+/g,' ').trim();
                // Dispositivos curtos podem conter regras completas com verbos
                // que o extrator estrito não reconhece. Preserve o texto-fonte.
                const selected=fullQuestionSentences(raw);
                if(!selected.length&&raw.length>=48&&raw.length<=1200&&/[.!?]$/.test(raw)&&!raw.includes('…'))selected.push(raw);
                for(const sentence of selected){
                    const key=(law+'|'+head+'|'+sentence).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
                    if(!used.has(key)){used.add(key);all.push({head,sentence,inc,example:a.practicalExample||''});}
                }
            });
            extract(A.highIncidence,'Alta Incidência');extract(A.mediumIncidence,'Média Incidência');extract(A.lowIncidence,'Baixa Incidência');
            // Banca examinadora local: prioriza complexidade, mas não elimina toda
            // a matéria da lei em níveis iniciante/intermediário.
            const permitted=all.slice().sort((a,b)=>{
                const weight=x=>x.inc==='Alta Incidência'?3:x.inc==='Média Incidência'?2:1;
                return weight(b)-weight(a);
            });
            let targets=permitted.filter(x=>examSourceQuality(x.sentence,level));
            // Escalonamento transparente: a falta de trechos complexos não bloqueia a revisão.
            if(targets.length<5)targets=permitted.filter(x=>x.sentence.length>=48&&x.sentence.length<=1200&&!x.sentence.includes('…'));
            const ce=[],mc=[];
            const explanation=(item,mut)=> (mut?'ERRADO. '+mut.hint+' No material: "'+mut.original+'"; na questão: "'+mut.replacement+'". ':
                'CERTO em relação ao trecho usado neste guia. ')+
                'Referência: '+item.head+' — '+law+'. Trecho-base: "'+item.sentence+'". Consulte a lei vigente para confirmar o teor.';
            for(const item of targets){
                const sourceKey='src-'+(hash(law+'|'+item.head+'|'+item.sentence)>>>0).toString(36);
                const base={topic:item.head,subtopic:item.head,incidence:item.inc,lawBasis:item.head+' — '+law,law,difficulty:level,sourceKey,sourceQuote:item.sentence};
                const correct={...base,type:'CE',options:[],statement:examItemStyle(level,'CE',bank,item.head)+item.sentence,
                     answer:'C',coverageId:sourceKey+'|CE|C',explanation:explanation(item,null),easyTip:'Confirme os elementos essenciais na fonte oficial.'};
                ce.push(correct);
                const changes=qualifiedQuestionMutations(item.sentence,level);
                for(const mut of changes.slice(0,level==='iniciante'?1:level==='intermediario'?2:3)){
                    ce.push({...base,type:'CE',options:[],statement:examItemStyle(level,'CE',bank,item.head)+mut.text,
                        answer:'E',coverageId:sourceKey+'|CE|E|'+(hash(mut.text)>>>0).toString(36),explanation:explanation(item,mut),easyTip:'Observe a alteração específica explicada no gabarito.'});
                }
                // Alternativas: combina mudança pontual expressa e associação com dispositivo diverso.
                const choices=[{text:item.head+' — '+item.sentence,correct:true}],seenOpts=new Set([choices[0].text]);
                for(const mut of changes){
                    const choice=item.head+' — '+mut.text;
                    if(!seenOpts.has(choice)){seenOpts.add(choice);choices.push({text:choice,correct:false});}
                    if(choices.length>=requestedCount)break;
                }
                if(choices.length<requestedCount){
                    const otherHeads=new Set();
                    for(const other of all){
                        if(other.head===item.head||otherHeads.has(other.head))continue;
                        otherHeads.add(other.head);
                        // Uma associação propositalmente equivocada entre artigo e proposição.
                        const choice=item.head+' — '+other.sentence;
                        if(!seenOpts.has(choice)){seenOpts.add(choice);choices.push({text:choice,correct:false});}
                        if(choices.length>=requestedCount)break;
                    }
                }
                // Distratores por associação cruzada: outras regras verdadeiras do mesmo guia
                // tornam-se incorretas apenas quando atribuídas ao artigo perguntado.
                // Não modifica o teor da regra nem inventa disposições legais.
                if(choices.length<requestedCount){
                    for(const other of all){
                        if(other.head===item.head||other.sentence===item.sentence)continue;
                        const choice=item.head+' — '+other.sentence;
                        if(!seenOpts.has(choice)){
                            seenOpts.add(choice);
                            choices.push({text:choice,correct:false});
                        }
                        if(choices.length>=requestedCount)break;
                    }
                }
                // Amplia as alternativas por contraposições controladas, sempre
                // associadas a um trecho-base identificável, sem fatos externos.
                if(choices.length<requestedCount){
                    for(const other of all){
                        for(const mut of qualifiedQuestionMutations(other.sentence,level)){
                            const candidate=item.head+' — '+mut.text;
                            if(!seenOpts.has(candidate)){
                                seenOpts.add(candidate);choices.push({text:candidate,correct:false});
                            }
                            if(choices.length>=requestedCount)break;
                        }
                        if(choices.length>=requestedCount)break;
                    }
                }
                // Segundo formato de MC: identificar a única associação ALTERADA.
                // As três associações corretas são extraídas literalmente de
                // dispositivos identificáveis. A incorreta possui uma mutação
                // explícita e rastreável; nunca são inventadas sanções/regras.
                const canonical=[{text:item.head+' — '+item.sentence,correct:false,why:'Associação literal do dispositivo '+item.head+'.'}];
                const referencedHeads=new Set([item.head]);
                for(const other of all){
                    if(referencedHeads.has(other.head)||other.sentence===item.sentence)continue;
                    if(!examSourceQuality(other.sentence,'iniciante'))continue;
                    const label=other.head+' — '+other.sentence;
                    if(canonical.some(x=>x.text===label))continue;
                    referencedHeads.add(other.head);
                    canonical.push({text:label,correct:false,why:'Trecho literal associado a '+other.head+'.'});
                    if(canonical.length>=3)break;
                }
                if(requestedCount===4&&canonical.length===3&&changes.length){
                    const caps=level==='avancado'?2:1;
                    for(const altered of changes.slice(0,caps)){
                        const swapped=item.head+' — '+altered.text;
                        if(canonical.some(x=>x.text===swapped))continue;
                        const arranged=shuffle([...canonical,{text:swapped,correct:true,why:altered.hint+' Texto original: "'+altered.original+'".'}]);
                        const letter='ABCD'[arranged.findIndex(x=>x.correct)];
                        const analysis=arranged.map((choice,i)=>{
                            const label='ABCD'[i];
                            return label+') '+(choice.correct?'INCORRETA. ':'CORRETA. ')+choice.why;
                        });
                        mc.push({...base,type:'MC',coverageId:sourceKey+'|MC|alteracao|'+(hash(altered.text)>>>0).toString(36),
                            statement:'Considerando os dispositivos e respectivos trechos do documento, qual associação contém uma alteração em relação ao texto-fonte?',
                            options:arranged.map(x=>x.text),answer:letter,optionAnalysis:analysis,
                            explanation:'A associação com redação alterada é a alternativa '+letter+'. '+altered.hint+
                                ' No texto de '+item.head+', a expressão correta é "'+altered.original+'". As demais associações são transcrições dos dispositivos indicados.',
                            easyTip:'Compare cada dispositivo com o trecho original e identifique a única modificação.'});
                    }
                }
                // São aceitas 4 ou 5 opções fundamentadas, nunca distratores artificiais.
                // O enunciado associativo identifica a correspondência dispositivo/conteúdo.
                if(choices.length>=requestedCount){
                    const options=shuffle(choices.slice(0,requestedCount)),answer='ABCDE'[options.findIndex(x=>x.correct)];
                    const optionAnalysis=options.map((x,i)=>{
                        const letter='ABCDE'[i];
                        if(x.correct)return letter+') CORRETA. Reproduz a proposição referenciada em '+item.head+'.';
                        const mutation=changes.find(m=>x.text===item.head+' — '+m.text);
                        return letter+') INCORRETA. '+(mutation?mutation.hint+' Trecho original: '+mutation.original+'.':'A proposição foi extraída ou modificada de outro dispositivo e não reproduz a referência específica solicitada.');
                    });
                    mc.push({...base,type:'MC',coverageId:sourceKey+'|MC',statement:examItemStyle(level,'MC',bank,item.head,true),
                        options:options.map(x=>x.text),answer,optionAnalysis,
                        explanation:'Gabarito '+answer+'. '+optionAnalysis.join(' ')+' '+explanation(item,null),
                        easyTip:'Compare a referência legal com a proposição e confira a literalidade da norma.'});
                }
            }
            return fmt==='MC'?mc:ce;
        }
        function trapItems(g) {
            const out=[]; safeArray(g?.trapsAndJurisprudence?.examTraps).forEach((trap,i)=>{
                const raw=String(trap||'').trim();if(!raw)return;
                const colon=raw.indexOf(':'), title=colon>0?raw.slice(0,colon).trim():'Pegadinha '+(i+1), rest=colon>0?raw.slice(colon+1).trim():raw;
                const explicit=rest.match(/(?:Errado|Incorreto|Falso|Duplamente errado)\s*[:—-]?\s*([\s\S]*)$/i);
                const action=rest.match(/^(?:Duplamente errado|Trocar|Incluir|Inverter|Aplicar|Afirmar|Dizer|Considerar)\b[\s\S]*$/i);
                let claim=rest.replace(/^(?:Duplamente errado\s*:?\s*|Trocar\s+|Incluir\s+|Inverter\s+|Aplicar\s+|Afirmar que\s+|Dizer que\s+|Considerar que\s+)/i,'').trim();
                claim=claim.replace(/\s*(?:Errado|Incorreto|Falso)\s*[:—-]?[\s\S]*$/i,'').replace(/[.;:]$/,'').trim();
                const correction=explicit?explicit[1].trim():rest;
                if(!claim)claim='A proposição apresentada em “'+raw+'”';
                out.push({topic:title,statement:'Item de prova: '+claim+'.',answer:'E',explanation:(action?'A pegadinha descreve uma troca, inclusão, inversão ou aplicação indevida. ':'Atenção à literalidade. ')+(correction?correction:'A proposição não deve ser presumida correta; confronte-a com a regra do guia.')});
            });
            return out;
        }
        function setBank(v) { BANK=v; if(CUR.guide)rerenderPreservingStudyState(); }
        function bankTags(item){
            const e=((item.plainExplanation||'')+' '+(item.practicalExample||'')).toLowerCase();
            const tokens=String(item.article||'').match(/art(?:s)?\.?\s*\d+/gi)||[];
            const historical=Array.isArray(IMPORTED_QUESTIONS)?IMPORTED_QUESTIONS.filter(q=>{
                const bank=String(q.examRef||q.bank||q.board||'').toLowerCase();
                const basis=(String(q.lawBasis||'')+' '+String(q.topic||'')).toLowerCase();
                return tokens.some(t=>basis.includes(t.toLowerCase()))&&/(cebraspe|cespe|fgv|aocp|idecan|vunesp)/.test(bank);
            }):[];
            return {
                c:/(somente|apenas|exceto|nunca|sempre|exclusivamente|salvo|independe|errado|\d+\s*(dias|anos|meses|horas))/i.test(e),
                f:/(caso|imagine|guarnição|abordagem|soldado|policial|situação|quando)/i.test((item.practicalExample||'').toLowerCase()),
                documented:historical.length
            };
        }
        function captureStudyUI() {
            const search=$('guide-search')?.value||'';
            const revealed=[...document.querySelectorAll('#printable-area .cloze-mask.on')].map((el,i)=>({text:el.textContent,index:i}));
            return {search,revealed};
        }
        function restoreStudyUI(state) {
            if(!state)return;const input=$('guide-search');if(input){input.value=state.search;filterGuide(state.search);}
            const spans=[...document.querySelectorAll('#printable-area .cloze-mask')];state.revealed.forEach(r=>{if(spans[r.index]&&spans[r.index].textContent===r.text)spans[r.index].classList.add('on');});
        }
        function rerenderPreservingStudyState(){const st=captureStudyUI();renderGuide(CUR.guide);restoreStudyUI(st);}
        function glossaryHtml(g) {
            const text=flatGuideText(g).toLowerCase(), found=Object.entries(STUDY_GLOSSARY).filter(([term])=>new RegExp('(?<![a-zà-ÿ])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-zà-ÿ])','i').test(text));
            return found.length?'<h3>Mini-Glossário Rápido</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-2">'+found.map(([term,def])=>'<div class="g-card"><b>'+esc(term)+'</b><p>'+esc(def)+'</p></div>').join('')+'</div>':'';
        }
        function getVisibleArticleRows(g) {
            const A=g.articlesMapping||{}, out=[];safeArray(A.highIncidence).forEach(x=>out.push({...x,incidence:'Alta'}));
            if(LEVEL!=='iniciante')safeArray(A.mediumIncidence).forEach(x=>out.push({...x,incidence:'Média'}));
            if(LEVEL==='avancado')safeArray(A.lowIncidence).forEach(x=>out.push({...x,incidence:'Baixa'}));
            if(LEVEL==='intermediario'||LEVEL==='avancado'){const bank=effBank();if(bank==='cebraspe'||bank==='fgv'){const key=bank==='cebraspe'?'c':'f';out.sort((a,b)=>(bankTags(b).documented-bankTags(a).documented)||Number(bankTags(b)[key])-Number(bankTags(a)[key]));}}
            return out;
        }
        function formatGuideHtml(g, interactive) {
            const S=g.executiveSummary||{}, X=g.structuralXRay||{}, A=g.articlesMapping||{}, T=g.trapsAndJurisprudence||{}, E=safeArray(g.essayRepertoire), rows=getVisibleArticleRows(g), done=studied(), eb=effBank();
            const wrap=(title,body)=>'<h2>'+title+'</h2>'+body;
            const concepts=safeArray(S.keyConcepts).slice(0,LEVEL==='iniciante'?4:99);
            const intro='<div class="pmdf-report-heading"><div class="pmdf-report-emblem" aria-hidden="true">⚖</div><div class="pmdf-report-heading-copy"><span class="pmdf-report-kicker">MÉTODO PMDF · CADERNO ESTRATÉGICO</span><h1>'+esc(g.lawName)+'</h1><p>'+esc(({full:'Guia completo',bullets:'Resumo esquematizado',table:'Quadro sinótico',mind:'Mapa mental',flash:'Flashcards',traps:'Pegadinhas e questões'})[SUMMARY_FORMAT]||'Caderno de estudo')+' · Nível '+esc(LEVELS[LEVEL].label)+'</p></div></div><p class="g-banner">'+LEVELS[LEVEL].road+'</p>';
            const executive=LEVEL==='iniciante'?'<ol class="list-decimal pl-5">'+[S.centralObjective,...concepts.slice(0,3)].map(x=>'<li>'+esc(firstSentences(x,260))+'</li>').join('')+'</ol>':'<p>'+esc(S.centralObjective||'')+'</p><ul>'+concepts.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
            const glossary=LEVEL==='iniciante'?glossaryHtml(g):'';
            const articleCard=(a,i)=>{const tags=bankTags(a),hl=interactive&&((eb==='cebraspe'&&tags.c)||(eb==='fgv'&&tags.f));const id=(CUR.key||'x')+'|'+String(a.article).slice(0,40),noteKey='note:'+id,note=store.get(noteKey)||'';let noteId=-1;if(interactive)noteId=NOTE_IDS.push(noteKey)-1;
                const checkbox=interactive?'<input type="checkbox" class="no-print mr-2 accent-[#D4AF37]" data-id="'+esc(id)+'" aria-label="Marcar '+esc(a.article)+' como estudado" '+(done.includes(id)?'checked':'')+' data-pmdf-onchange="toggleStudied(this)">':'';
                return '<div class="g-card" data-incidence="'+a.incidence+'" style="'+(hl?'border-left:4px solid #D4AF37':'')+'">'+(hl?'<span class="g-tag">⭐ Afinidade temática com a banca (estimativa)</span>':'')+(tags.documented?'<span class="g-tag">📚 '+tags.documented+' referência(s) em provas importadas</span>':'')+'<p>'+checkbox+'<b>'+esc(a.article)+'</b> <span class="g-tag">'+a.incidence+' incidência</span></p><p>'+esc(a.plainExplanation)+'</p><p class="g-ex"><b>Aplicação:</b> '+esc(a.practicalExample)+'</p>'+(note?'<p class="g-ex"><b>📝 Nota:</b> '+esc(note)+'</p>':'')+(interactive?'<button class="no-print g-tag" data-pmdf-special="edit-note" data-pmdf-value="'+noteId+'">📝 Nota</button>':'')+'</div>';};
            const compareRows=rows.slice(0,8).map(a=>'<tr><td>'+esc(a.article)+'</td><td>'+esc(firstSentences(a.plainExplanation,230))+'</td><td>'+esc(uniq(a.plainExplanation.match(PRAZO)||[]).join('; ')||'Não identificado no trecho')+'</td><td>'+esc(uniq(a.plainExplanation.match(RESTR)||[]).join('; ')||'Não identificado no trecho')+'</td></tr>').join('');
            let body='';
            if(SUMMARY_FORMAT==='full'){
                const sec=(title,arr)=>safeArray(arr).length?'<h3>'+title+'</h3>'+safeArray(arr).map(x=>'<div class="g-card"><b>'+esc(x.title)+'</b><p>'+esc(x.reason)+'</p></div>').join(''):'';
                body=wrap('1. Resumo Executivo',executive+glossary)+wrap('2. Raio-X Estrutural',sec('Prioridade Máxima',X.highPriority)+sec('Prioridade Secundária',X.secondaryPriority)+(LEVEL==='iniciante'?'':sec('Zonas de menor incidência',X.deadZones)))+wrap('3. Mapeamento de Dispositivos',rows.map(articleCard).join(''));
                if(LEVEL==='intermediario')body+=wrap('4. Comparativos — Distinções de Prova','<p class="text-xs">Comparação automática dos dispositivos efetivamente identificados no material. Confira o texto integral para validar eventuais distinções.</p><div style="overflow-x:auto"><table><thead><tr><th>Dispositivo</th><th>Regra central</th><th>Prazos/quantitativos</th><th>Termos restritivos</th></tr></thead><tbody>'+compareRows+'</tbody></table></div>');
                body+=wrap('5. Pegadinhas e Jurisprudência','<h3>Pegadinhas da Banca</h3><ul>'+safeArray(T.examTraps).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+(LEVEL==='avancado'?'<h3>Jurisprudência STF/STJ</h3><ul>'+safeArray(T.jurisprudence).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':''))+wrap('6. Repertório para Redação',E.map(x=>'<div class="g-card"><b>'+esc(x.legalDevice)+'</b><p>Temas: '+esc(x.themes)+'</p><p class="g-ex">'+esc(x.modelSentence)+'</p></div>').join(''));
            }else if(SUMMARY_FORMAT==='bullets'){
                body=wrap('Resumo Esquematizado', '<ul><li><b>Regra geral:</b> '+esc(firstSentences(S.centralObjective,300))+'</li>'+rows.map(a=>'<li><b>'+esc(a.article)+':</b> '+esc(firstSentences(a.plainExplanation,190))+' <span class="g-tag">'+a.incidence+'</span></li>').join('')+'</ul>')+wrap('Prazos, exceções e palavras-chave',rows.map(a=>'<div class="g-card"><b>'+esc(a.article)+'</b><ul><li><b>Prazos/quantitativos:</b> '+esc(uniq(a.plainExplanation.match(PRAZO)||[]).join(', ')||'Não identificados no bloco')+'</li><li><b>Exceções/termos:</b> '+esc(uniq(a.plainExplanation.match(RESTR)||[]).join(', ')||'Conferir no texto-fonte')+'</li></ul></div>').join(''));
            }else if(SUMMARY_FORMAT==='table'){
                body=wrap('Quadro Sinótico — Regra, prazo, sanção e exceções','<div style="overflow-x:auto"><table><thead><tr><th>Dispositivo/Tópico</th><th>Regra Central / Conduta</th><th>Prazos / Quantitativos / Sanções</th><th>Exceções e Termos Restritivos</th></tr></thead><tbody>'+rows.map(a=>'<tr><td>'+esc(a.article)+'</td><td>'+esc(firstSentences(a.plainExplanation,280))+'</td><td>'+esc([...(a.plainExplanation.match(PRAZO)||[]),...(a.plainExplanation.match(PENA)||[])].join('; ')||'—')+'</td><td>'+esc(uniq(a.plainExplanation.match(RESTR)||[]).join('; ')||'—')+'</td></tr>').join('')+'</tbody></table></div>');
            }else if(SUMMARY_FORMAT==='mind'){
                body=wrap('Mapa Mental Visual — Infográfico Editorial',pmdfMindHtml(g,rows)+
                    (interactive?'<div class="pmdf-mind-actions no-print"><button type="button" data-pmdf-onclick="copyText(pmdfMindPrompt(CUR.guide))" class="'+BTN+'">📋 Copiar prompt do mapa mental</button><button type="button" data-pmdf-onclick="openMindMap()" class="'+BTN+'">Abrir mapa ampliado</button></div>':''));
            }else if(SUMMARY_FORMAT==='flash'){
                const cards=buildStudyCards(g), cardHtml=cards.slice(0,interactive?90:150).map((c,i)=>interactive?'<button type="button" data-pmdf-onclick="flipStudyCard(this)" class="study-card text-left" data-card-id="'+esc(c.id)+'"><span class="g-tag">Card '+(i+1)+' · '+esc(c.kind||'Regra')+' · Toque para virar</span><span class="front"><b>FRENTE</b><p>'+esc(c.front)+'</p></span><span class="back"><b>VERSO / FUNDAMENTO</b><p>'+esc(c.back)+'</p><span class="g-tag">Caixa Leitner: '+getCardBox(c.id).box+'</span></span></button>':'<div class="g-card"><b>Frente:</b><p>'+esc(c.front)+'</p><b>Verso:</b><p>'+esc(c.back)+'</p></div>').join('');
                body=wrap('Flashcards de Estudo Ativo','<p>Questões de recuperação ativa e lacunas com fundamento rastreável. Foram criados '+cards.length+' cartões; aqui aparecem os primeiros '+Math.min(cards.length,interactive?90:150)+'. Para revisar todos, use a aba Flashcards.</p>'+(interactive?'<div class="flex flex-wrap gap-2 no-print mb-3"><button data-pmdf-onclick="startLeitner()" class="'+BTN+'">▶ Iniciar sessão Leitner</button></div>':'')+'<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">'+cardHtml+'</div>');
            }else{
                const traps=safeArray(T.examTraps), questions=getCachedPool(g,boardFmt(),LEVEL).slice(0,20);
                body=wrap('Fichamento de Pegadinhas & Questões',traps.map((t,i)=>'<div class="g-card"><b>Pegadinha '+(i+1)+'</b><p>'+esc(t)+'</p></div>').join('')+'<h3>Assertivas Certo/Errado comentadas</h3>'+questions.map((q,i)=>'<div class="g-card"><b>'+ (i+1)+'. '+esc(q.answer==='C'?'CERTO':'ERRADO')+'</b><p>'+esc(q.statement)+'</p><p class="g-ex">'+esc(q.explanation)+'</p></div>').join(''));
            }
            const tools=interactive?'<div class="no-print flex flex-wrap gap-2 mt-3"><button data-pmdf-onclick="openFlash()" class="'+BTN+'">🃏 Revisão de flashcards</button><button data-pmdf-onclick="openErrors()" class="'+BTN+'">📕 Caderno de Erros</button><button data-pmdf-onclick="openMindMap()" class="'+BTN+'">🌳 Mapa mental</button><button data-pmdf-onclick="openPanel()" class="'+BTN+'">📊 Painel do Edital &amp; Backup</button><button data-pmdf-onclick="toggleCloze()" class="'+BTN+'">🙈 Modo Lacunas</button><input type="search" id="guide-search" data-pmdf-oninput="filterGuide(this.value)" placeholder="Buscar neste guia..." class="px-3 py-2 rounded-xl bg-[#0E1B33] border border-[#1E2E4F] text-xs text-slate-200 w-64"><button type="button" data-pmdf-onclick="clearGuideOptions()" class="'+BTN+'">↺ Limpar filtros do guia</button><button data-pmdf-onclick="searchAll()" class="'+BTN+'">🔎 Busca global</button>'+(LEVEL!=='iniciante'?'<select aria-label="Filtrar guia por banca" data-pmdf-onchange="setBank(this.value)" class="px-2 py-2 rounded-xl bg-[#0E1B33] border border-[#1E2E4F] text-xs text-slate-200"><option value="auto" '+(BANK==='auto'?'selected':'')+'>Conforme a banca</option><option value="todas" '+(BANK==='todas'?'selected':'')+'>Todas</option><option value="cebraspe" '+(BANK==='cebraspe'?'selected':'')+'>Cebraspe</option><option value="fgv" '+(BANK==='fgv'?'selected':'')+'>FGV/AOCP</option></select>':'')+'</div>':'';
            return tools+(interactive?'<p id="g-progress" class="no-print mt-2"></p>':'')+
                '<div class="pmdf-report pmdf-report-'+SUMMARY_FORMAT+'">'+
                intro+
                body+'<footer class="pmdf-report-footer"><span>⚖ MÉTODO PMDF</span><span>Material didático · Confira a norma oficial vigente</span></footer></div>'+
                '';
        }
        // A função pública de flashcards utiliza o novo motor local de alta
        // cobertura. O método anterior permanece acessível como modo clássico.
        function buildStudyCards(g){
            const engine=window.PMDFNeuralFlashcards;
            if(engine?.build){
                try{return engine.build(g,{level:LEVEL}).cards;}
                catch(e){console.warn('Flashcards: usando compatibilidade clássica após erro do motor.',e);}
            }
            return buildStudyCardsLegacy(g);
        }
        function buildStudyCardsLegacy(g){
            // Flashcards baseados apenas em afirmações efetivamente presentes na fonte.
            // Evita perguntas vagas, "pegadinhas" sem resposta e truncamento de premissas.
            if(!g)return [];
            const level=LEVELS_SAFE_LEVEL(LEVEL),law=String(g.lawName||'Material de estudo');
            const clean=v=>String(v||'').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim();
            const norm=v=>clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            const topicOf=art=>clean(art.split(/\s+[—–-]\s+/).slice(1).join(' — '))||'o conteúdo do dispositivo';
            const A=g.articlesMapping||{},sources=[
                ...safeArray(A.highIncidence).map(a=>({...a,_priority:'Alta'})),
                ...safeArray(A.mediumIncidence).map(a=>({...a,_priority:'Média'})),
                ...safeArray(A.lowIncidence).map(a=>({...a,_priority:'Baixa'}))
            ];
            const cards=[],seen=new Set(),sourceSeen=new Set();
            const weak=/^(?:estudar|conferir|verificar|aprofundar|comparar com|identificar|banca pode|pode ser cobrado|a lei (?:trata|prev[eê]|disciplina)|o diploma (?:trata|disciplina)|o regulamento (?:trata|prev[eê]))\b/i;
            const add=(art,source,kind,front,back,priority)=>{
                const f=clean(front),answer=clean(back),basis=clean(source);
                if(f.length<38||f.length>750||answer.length<26||answer.length>2300||
                    basis.length<35||basis.length>1500||/…|\[.*?\]|\bundefined\b|\bnull\b/i.test(f+answer))return;
                if(norm(f)===norm(answer)||!/[?：:]$/.test(f)&&!f.includes('_____'))return;
                const sig=norm(law+'|'+art+'|'+kind+'|'+f+'|'+answer);
                if(seen.has(sig))return;
                seen.add(sig);
                const id='anki-v2-'+(hash(sig)>>>0).toString(36);
                cards.push({id,front:f,back:answer,kind,article:art,source:basis,
                    priority,difficulty:level});
            };
            for(const a of sources.slice(0,1200)){
                const art=clean(a.article||a.title||'Tópico');
                const original=clean(a.sourceText),resumo=clean(a.plainExplanation);
                // O artigo integral pode exceder o tamanho seguro do cartão.
                // Prioriza o texto completo verificável e, se for longo demais,
                // utiliza a explicação curta já presente no mesmo dispositivo.
                const source=original.length>=45&&original.length<=1500&&!original.includes('…')?original:resumo;
                if(!art||source.length<45||source.length>1500||source.includes('…')||weak.test(source))continue;
                const dedupe=norm(art+'|'+source);
                if(sourceSeen.has(dedupe))continue;sourceSeen.add(dedupe);
                const topic=topicOf(art),priority=a._priority;
                const ruleBack='Resposta segundo o material:\n'+source+'\n\nFundamento: '+art+' — '+law+'.';
                add(art,source,'Regra principal',
                    'Segundo '+art+', qual é a regra central sobre '+topic+'?',ruleBack,priority);
                // Cartões de preenchimento: ocultam elemento expresso no texto, nunca inventam conclusão.
                const targets=[];
                const pats=[
                    {kind:'Prazo e quantidade',regex:/\b\d+(?:[.,]\d+)?\s*(?:dias?|meses?|anos?|horas?|minutos?|%|sal[áa]rios?\s+m[íi]nimos?)\b/gi},
                    {kind:'Proibição e requisito',regex:/\b(?:não\s+(?:pode|podem|deve|devem|se\s+admite)|vedad[oa]s?|proibid[oa]s?|obrigat[óo]ri[oa]s?|dever[áa]o?|somente|apenas|exclusivamente|desde\s+que|salvo|exceto|mediante|independe|prescinde)\b/gi}
                ];
                for(const spec of pats){
                    let m,matched=0;const regex=new RegExp(spec.regex.source,spec.regex.flags);
                    while((m=regex.exec(source))&&matched<2&&targets.length<4){
                        matched++;
                        const phrase=m[0],cloze=source.slice(0,m.index)+'_____'+source.slice(m.index+phrase.length);
                        if(phrase.length<3||cloze===source)continue;
                        if(targets.some(t=>t.pos===m.index))continue;
                        targets.push({kind:spec.kind,phrase,cloze,pos:m.index});
                    }
                }
                for(const t of targets.slice(0,level==='iniciante'?1:level==='intermediario'?2:3)){
                    const front='Complete a expressão suprimida em '+art+':\n'+t.cloze;
                    const back='Expressão correta: '+t.phrase+'.\n\nTrecho original: '+source+'\n\nFundamento: '+art+'.';
                    add(art,source,t.kind,front,back,priority);
                }
                // Perguntas contextuais somente quando o documento fornece uma resposta expressa.
                // Exemplos vagos ("diferenciar", "conferir") nunca geram casos com solução inventada.
                const example=clean(a.practicalExample);
                if(level==='avancado'&&example.length>=60&&example.length<=420&&
                    /^(?:se |quando |caso |na hipótese |diante de |em situação)/i.test(example)&&
                    !/\b(?:estudar|diferenciar|conferir|verificar|identificar)\b/i.test(example)){
                    add(art,source,'Aplicação contextual',
                        'Considere o contexto: '+example+'\nQual regra de '+art+' deve ser consultada para analisar a situação?',
                        'Regra expressa no material:\n'+source+'\n\nO exemplo é apenas ilustrativo; confira os requisitos legais no texto oficial.',priority);
                }
                if(cards.length>=2200)break;
            }
            // Aprendizado relacional: compare dois dispositivos distintos sem forjar casos.
            if(level==='avancado'&&sources.length>1){
                const pool=sources.filter(a=>clean(a.sourceText||a.plainExplanation).length>=45&&
                    !weak.test(clean(a.sourceText||a.plainExplanation)));
                for(let i=0;i+1<pool.length&&i<150;i++){
                    const left=pool[i],right=pool[i+1],art1=clean(left.article),art2=clean(right.article);
                    const rule1=clean(left.sourceText||left.plainExplanation),rule2=clean(right.sourceText||right.plainExplanation);
                    if(art1===art2||rule1.length>340||rule2.length>340||norm(rule1)===norm(rule2))continue;
                    add(art1+' / '+art2,rule1+'\n'+rule2,'Comparação entre artigos',
                        'Compare '+art1+' e '+art2+': qual proposição específica aparece em cada dispositivo?',
                        art1+': '+rule1+'\n\n'+art2+': '+rule2+'\n\nAmbas as informações são extraídas do material.',left._priority||'Média');
                }
            }
            const order={Alta:0,Média:1,Baixa:2};
            return cards.sort((x,y)=>(order[x.priority]??3)-(order[y.priority]??3));
        }
        function flipStudyCard(el){el.classList.toggle('flipped');}
        function startLeitner(){
            if(!CUR.guide)return toast('Carregue um guia antes de iniciar a sessão Leitner.','error');
            const cards=buildStudyCards(CUR.guide),due=cards.filter(card=>{const state=getCardBox(card.id);return !state.due||Date.now()>=state.due;});
            const session=due.length?due:cards;
            openModal('🃏 Sessão Leitner',session.slice(0,20).map(card=>`<div class="g-card"><b>${esc(card.front)}</b><details><summary>Revelar resposta</summary><p>${esc(card.back)}</p></details><div class="flex gap-2 mt-2"><button class="${BTN}" data-pmdf-special="leitner-again" data-pmdf-card-id="${esc(card.id)}">✕ Rever</button><button class="${BTN}" data-pmdf-special="leitner-good" data-pmdf-card-id="${esc(card.id)}">✓ Sei</button><span class="g-tag">Caixa ${getCardBox(card.id).box}</span></div></div>`).join('')||'<p>Sem cartões.</p>');
        }
        function rateLeitner(id,known,el){
            const state=setCardBox(id,!!known);
            if(el){const card=el.closest('.g-card');if(card){card.style.opacity='.45';card.querySelectorAll('button').forEach(button=>button.disabled=true);}}
            toast(known?'Cartão avançou na caixa Leitner '+state.box+'.':'Cartão retornou à revisão inicial.','ok');
        }
        function guideHtml(g, interactive) { return formatGuideHtml(g,interactive); }
        // Regiões com rolagem própria precisam permitir acesso por teclado (WCAG 2.1.1).
        function pmdfFocusScrollableRegions(root=document) {
            if(typeof getComputedStyle!=='function'||!root?.querySelectorAll)return;
            for(const el of root.querySelectorAll('div,pre,section,article')) {
                if(el.tabIndex>=0||el.hasAttribute('tabindex'))continue;
                const style=getComputedStyle(el);
                const vertical=/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+1;
                const horizontal=/auto|scroll/.test(style.overflowX)&&el.scrollWidth>el.clientWidth+1;
                if(!vertical&&!horizontal)continue;
                const focusable=el.querySelector('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])');
                if(!focusable)el.setAttribute('tabindex','0');
            }
        }
        function renderGuide(g,resetPractice=false){
            if(!g)return;
            if(resetPractice){Q_STATE=null;ANKI_STATE=null;['q-panel','anki-panel'].forEach(id=>$(id)?.classList.add('hidden'));}CUR.guide=g;CUR._poolCache=CUR._poolCache||Object.create(null);NOTE_IDS=[];
            if(CUR.key)store.set('lastKey',CUR.key);markShortcut(CUR.key);
            $('printable-area').innerHTML=pmdfSafeHtml(guideHtml(g,true),true);
            pmdfFocusScrollableRegions($('printable-area'));
            if (g.officialSource && typeof g.officialSource === 'string') {
                try {
                    const ref = new URL(g.officialSource);
                    if (ref.protocol === 'https:' && (ref.hostname === 'www.planalto.gov.br' || ref.hostname === 'planalto.gov.br')) {
                        const notice=document.createElement('div');
                        notice.className='g-banner';
                        const note=document.createElement('span');
                        note.textContent='Guia pedagógico resumido. Consulte a redação legal atual e eventuais alterações: ';
                        const link=document.createElement('a');
                        link.href=ref.href;link.target='_blank';link.rel='noopener noreferrer';
                        link.textContent='abrir norma oficial no Planalto';
                        link.style.textDecoration='underline';link.style.fontWeight='700';
                        notice.append(note,link);
                        $('printable-area').prepend(notice);
                    }
                } catch (e) { /* Fonte inválida não interrompe o estudo. */ }
            }
            $('current-doc-title').textContent='Método PMDF — '+g.lawName+' · '+LEVELS[LEVEL].label+' · '+({full:'Por Extenso',bullets:'Esquematizado',table:'Quadro Sinótico',mind:'Mapa Mental',flash:'Flashcards',traps:'Pegadinhas'}[SUMMARY_FORMAT]);
            ['summary-format-config','summary-format-toolbar'].forEach(id=>{if($(id))$(id).value=SUMMARY_FORMAT;});
            updateProgress();applyCloze();
            if(window.lucide)lucide.createIcons();
        }
        function editNote(i){const k=NOTE_IDS[i];if(!k)return;const v=prompt('Sua anotação para este dispositivo (vazio apaga):',store.get(k)||'');if(v===null)return;store.set(k,v.trim());if(!v.trim()){store.del(k)}rerenderPreservingStudyState();}
        function searchAll(){
            const query=String($('guide-search')?.value||'').toLowerCase().trim();if(query.length<2)return toast('Digite ao menos 2 caracteres na busca.');
            const guides=Object.entries(BUILTIN_PMDF_GUIDES).map(([key,guide])=>({key,guide}));
            if(CUR.guide&&!guides.some(item=>item.guide===CUR.guide))guides.push({key:CUR.key||'personalizada',guide:CUR.guide});
            const fields=[['executiveSummary','Resumo Executivo'],['structuralXRay','Raio-X Estrutural'],['articlesMapping','Mapeamento de Dispositivos'],['trapsAndJurisprudence','Pegadinhas e Jurisprudência'],['essayRepertoire','Repertório para Redação']],hits=[];
            const walk=(value,path,callback)=>{if(typeof value==='string'){callback(path,value);return;}if(Array.isArray(value)){value.forEach((item,index)=>walk(item,path+' · '+(index+1),callback));return;}if(value&&typeof value==='object')Object.entries(value).forEach(([key,child])=>walk(child,path+' · '+key,callback));};
            guides.forEach(({guide})=>fields.forEach(([field,label])=>walk(guide[field],label,(section,value)=>{
                const clean=value.replace(/\s+/g,' ').trim(),lower=clean.toLowerCase(),index=lower.indexOf(query);if(index<0)return;
                const start=Math.max(0,index-95),end=Math.min(clean.length,index+query.length+185),excerpt=(start?'…':'')+clean.slice(start,end)+(end<clean.length?'…':'');
                hits.push({law:guide.lawName,section,excerpt});
            })));
            openModal('🔎 Busca global nas '+Object.keys(BUILTIN_PMDF_GUIDES).length+' leis',hits.length?`<p class="text-xs mb-2">${hits.length} ocorrência(s) encontradas:</p><div class="space-y-2">${hits.slice(0,100).map(hit=>`<div class="g-card"><b>${esc(hit.law)}</b><p class="g-tag">${esc(hit.section)}</p><p>${esc(hit.excerpt)}</p></div>`).join('')}</div>`:'<p>Nenhum resultado encontrado.</p>');
        }
        function toggleStudied(el){const a=studied(),i=a.indexOf(el.dataset.id);i<0?a.push(el.dataset.id):a.splice(i,1);store.set('st:'+CUR.key,JSON.stringify(a));updateProgress();}
        function ltCheck(text){return new Promise(async resolve=>{const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),10000);try{const r=await fetch('https://api.languagetool.org/v2/check',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({text,language:'pt-BR'}),signal:ctl.signal});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json(),errs=[];(d.matches||[]).forEach(m=>{const it=m.rule&&m.rule.issueType,cat=m.rule&&m.rule.category&&m.rule.category.id;if(!(['misspelling','grammar','duplication'].includes(it)||['TYPOS','GRAMMAR','CONFUSED_WORDS','CASING'].includes(cat)))return;const w=text.substr(m.offset,m.length),rep=m.replacements&&m.replacements[0]?m.replacements[0].value:'';if(it==='misspelling'&&(/^[A-ZÀ-Ý0-9\-/]{2,}$/.test(w)||(/^[A-ZÀ-Ý]/.test(w)&&!rep)))return;errs.push({off:m.offset,len:m.length,rep,orig:('…'+text.slice(Math.max(0,m.offset-25),m.offset+m.length+25)+'…').replace(/\s+/g,' '),type:(m.rule.category&&m.rule.category.name)||'Gramática',fix:rep||m.message});});resolve(errs);}catch(e){const local=localErrors(text);local._source='local';resolve(local);}finally{clearTimeout(to);}});}
        function essayLive(){
            const text=$('essay-text').value,words=(text.match(/\S+/g)||[]).length,paragraphs=text.split(/\n+/).filter(part=>part.trim()).length;
            const last=text.trim().split(/\n+/).pop()||'',body=text.trim().slice(0,text.trim().length-last.length),fp=hasFirstPerson(text),bad=/(?<![A-Za-zÀ-ÿ])(portanto|por conseguinte)(?![A-Za-zÀ-ÿ])/i.test(body);
            const norms=((text.match(/(?<![A-Za-zÀ-ÿ])(Lei|Decreto|Portaria|Decreto-Lei)(?![A-Za-zÀ-ÿ])[^.;\n]{0,35}?\d|Constituição|CF\/?88|Pacto de San José|Convenção/gi)||[]).length);
            const chips=[[words+' palavras (~'+getEssayLineCount(text)+' linhas)',words>=250&&words<=450],[paragraphs+' parágrafo(s)',paragraphs===4],[fp?'1ª pessoa detectada':'Sem 1ª pessoa',!fp],[bad?'Conectivo conclusivo fora da conclusão':'Conectivos conclusivos OK',!bad],[norms+' norma(s) citada(s)',norms>0]];
            $('essay-live').innerHTML=text.trim()?chips.map(([label,ok])=>'<span class="px-2 py-1 rounded-lg border '+(ok?'border-emerald-500/40 text-emerald-300 bg-emerald-500/10':'border-[#D4AF37]/40 text-[#E5C158] bg-[#D4AF37]/10')+'">'+esc(label)+'</span>').join(''):'';
            saveEssayDraft();
        }
        // End of production refactor.

        // ---------- Aparência: preferência local sem scripts externos ----------
        function initTheme() {
            let theme = 'dark';
            try { theme = localStorage.getItem('pmdf:theme') === 'light' ? 'light' : 'dark'; } catch (e) {}
            applyTheme(theme);
        }
        function applyTheme(theme) {
            const light = theme === 'light';
            document.body.dataset.theme = light ? 'light' : 'dark';
            document.documentElement.style.colorScheme = light ? 'light' : 'dark';
            const browserTheme = $('pmdf-theme-color');
            if (browserTheme) browserTheme.setAttribute('content', light ? '#f6f8fc' : '#071020');
            const button = $('theme-toggle');
            if (button) button.setAttribute('aria-pressed', String(light));
            if ($('theme-symbol')) $('theme-symbol').textContent = light ? '☾' : '☀';
            if ($('theme-label')) $('theme-label').textContent = light ? 'Tema escuro' : 'Tema claro';
            try { localStorage.setItem('pmdf:theme', light ? 'light' : 'dark'); } catch (e) {}
        }
        function toggleTheme() { applyTheme(document.body.dataset.theme === 'light' ? 'dark' : 'light'); }

        // ---------- Abas e inicialização ----------
        // UI: navegação acessível sem mudança nas rotinas de estudo.
        function pmdfTabKeydown(e){
            if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
            const buttons=Array.from(document.querySelectorAll('nav.pmdf-app-tabs [role="tab"]'));
            const i=buttons.indexOf(document.activeElement);if(i<0)return;
            e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
            buttons[n].click();buttons[n].focus();
        }
        function pmdfFocusPrimary(){
            const ids={leis:'generate-btn',questoes:'q-generate-button',anki:'anki-start',resultados:'results-topic',redacao:'essay-theme'};
            const el=$(ids[TAB]||'generate-btn');if(!el)return;
            el.scrollIntoView({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth'});
            el.focus({preventScroll:true});
        }
        function showTab(t) {
            TAB = t;
            if(APP_STARTED&&!SESSION_RESTORING)saveStudySession();if(t==='resultados')setTimeout(renderResults,0);
            ['leis', 'questoes', 'anki', 'redacao','resultados'].forEach(k => { $('tab-' + k).classList.toggle('hidden', k !== t);$('tab-btn-'+k).setAttribute('role','tab');$('tab-btn-'+k).setAttribute('aria-selected',String(k===t));
                $('tab-btn-'+k).setAttribute('tabindex',k===t?'0':'-1');
                $('pmdf-context-'+k)?.classList.toggle('hidden',k!==t);
                $('tab-btn-' + k).className = 'px-5 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 flex items-center gap-2 transition ' + (k === t ? 'bg-[#0A1426] text-[#E5C158] border-[#D4AF37]/40' : 'bg-[#040912] text-slate-400 border-[#172642] hover:text-slate-200'); });
            const menu=document.querySelector('.pmdf-account-menu');if(menu)menu.open=false;
        }


        // Histórico privado de correções, limitado para não esgotar o armazenamento.
        function saveEssayCorrectionHistory(){
            try{const draft={theme:$('essay-theme').value,lines:$('essay-lines').value,motiv:$('essay-motiv').value,text:$('essay-text').value};
                const h=jget('essay:history',[]);const gradeMatch=ESSAY_MD.match(/NPD \(Nota Final\):\s*([0-9]+[.,][0-9]+)/i);const grade=gradeMatch?Number(gradeMatch[1].replace(',','.')):null;h.unshift({date:new Date().toISOString(),draft,grade,result:String(ESSAY_MD||'').slice(0,26000)});
                const prev=jget('essay:totals',null);
                const historical=(prev&&Number.isFinite(prev.count)&&Number.isFinite(prev.sum))?prev:{count:0,sum:0};
                // Histórico antigo é migrado quando ainda não havia acumulador.
                if(!prev){for(const older of h.slice(1)){const m=String(older.result||'').match(/NPD \(Nota Final\):\s*([0-9]+[.,][0-9]+)/i);const v=m?Number(m[1].replace(',','.')):NaN;if(Number.isFinite(v)&&v>=0&&v<=20){historical.count++;historical.sum+=v;}}}
                if(Number.isFinite(grade)&&grade!==null){historical.count++;historical.sum+=grade;}
                store.set('essay:totals',JSON.stringify(historical));
                store.set('essay:history',JSON.stringify(h.slice(0,10)));saveEssayDraft();saveStudySession();}
            catch(e){toast('Correção exibida, mas não foi possível salvar o histórico. Faça backup.', 'error');}
        }
        function showEssayHistory(){const hist=jget('essay:history',[]);
            openModal('📚 Redações corrigidas',hist.length?hist.map((h,i)=>'<div class="g-card"><p><b>'+esc(h.draft?.theme||'Redação')+'</b> · '+esc((h.date||'').slice(0,10))+'</p><button type="button" class="rounded-xl bg-[#D4AF37] text-[#050B16] px-3 py-2 font-bold" data-pmdf-special="essay-history" data-pmdf-value="'+i+'">Abrir correção</button></div>').join(''):'<p>Ainda não há correções salvas.</p>');}
        function openEssayHistory(i){const h=jget('essay:history',[])[i];if(!h)return;for(const [id,key] of [['essay-theme','theme'],['essay-lines','lines'],['essay-motiv','motiv'],['essay-text','text']])$(id).value=h.draft?.[key]||'';
            ESSAY_MD=h.result||'';$('essay-out').innerHTML=pmdfSafeHtml(md(ESSAY_MD));$('essay-result').classList.remove('hidden');closeModal();showTab('redacao');saveStudySession();}
        function restoreEssayLastResult(){const h=jget('essay:history',[])[0];if(h?.result){ESSAY_MD=h.result;$('essay-out').innerHTML=pmdfSafeHtml(md(ESSAY_MD));$('essay-result').classList.remove('hidden');}}
        // ==================== Abas de prática integradas ao conteúdo selecionado ====================
        const pickStudyGuides = kind => {
            const selected=$(kind+'-source')?.value || 'current';
            if(selected==='all')return Object.values(BUILTIN_PMDF_GUIDES);
            return CUR.guide ? [CUR.guide] : [];
        };
        function clearGuideOptions(){BANK='auto';if(CUR.guide)rerenderPreservingStudyState();clearGuideSearch();toast('Filtros do guia limpos.','ok');}
        function clearGuideSearch(){const el=$('guide-search');if(el){el.value='';filterGuide('');}}
        function clearMainFilters(){
            $('filter-input').value='';$('role-select').selectedIndex=1;$('board-select').selectedIndex=0;
            setLevel('intermediario');setSummaryFormat('full');
            const search=$('guide-search');if(search){search.value='';filterGuide('');}
            toast('Filtros do mapeador limpos.','ok');
        }
        function clearQuestionFilters(){
            stopQuestionAI();setQuestionEngine('local');
            $('q-source').value='current';$('q-format').value='CE';$('q-level').value='intermediario';$('q-board').value='Cebraspe';if($('q-batch'))$('q-batch').value='30';
            $('q-status').textContent='Filtros limpos.';$('q-panel').classList.add('hidden');Q_STATE=null;
        }
        function clearAnkiFilters(){
            stopAnkiGeneration();
            $('anki-source').value='current';$('anki-mode').value='due';
            if($('anki-generation-mode'))$('anki-generation-mode').value='advanced';
            if($('anki-batch-size'))$('anki-batch-size').value='50';
            $('anki-status').textContent='Filtros limpos.';$('anki-panel').classList.add('hidden');ANKI_STATE=null;
        }
        function questionIsComplete(q){
            if(!q||typeof q.statement!=='string'||q.statement.length<55||q.statement.includes('…'))return false;
            const text=q.statement.trim();
            if(/(?:[:;,\-–—(/]|\b(?:art\.?|arts\.?|inciso|de|do|da|dos|das|e|ou|para|com|sem|por|mediante|segundo|conforme|sobre))\s*$/i.test(text))return false;
            if((text.match(/\(/g)||[]).length!==(text.match(/\)/g)||[]).length)return false;
            if(q.type==='MC'&&(!Array.isArray(q.options)||q.options.some(o=>!o||String(o).includes('…'))||!q.options.length))return false;
            return true;
        }
        function uniqueQuestions(qs){
            const used=new Set();return qs.filter(q=>{
                const sig=q.coverageId||q.type+'|'+q.statement.trim()+'|'+(q.type==='MC'?String(q.lawBasis||'')+'|'+(q.options||[]).slice().sort().join('¦'):'');if(used.has(sig))return false;used.add(sig);return true;
            });
        }
        function toFour(q){
            if(q.type!=='MC'||!Array.isArray(q.options)||q.options.length!==5)return q;
            const correct='ABCDE'.indexOf(q.answer),discard=q.options.findIndex((_,idx)=>idx!==correct);
            const options=q.options.filter((_,idx)=>idx!==discard),answer='ABCD'[correct-(discard<correct?1:0)];
            return {...q,options,answer};
        }
        let Q_STATE=null;


        // Integração com motor neural local, preservando gerador tradicional.
        let QUESTION_ENGINE='local',SAFE_FALLBACK_ACTIVE=false;
        function setQuestionEngine(mode){
            if(!['local','neural'].includes(mode))return;
            if(QUESTION_ENGINE!==mode)stopQuestionAI();
            QUESTION_ENGINE=mode;
            for(const item of ['local','neural']){const button=$('q-engine-'+item);
                if(button){button.classList.toggle('active',mode===item);button.setAttribute('aria-pressed',String(mode===item));}}
            $('q-neural-settings')?.classList.toggle('hidden',mode!=='neural');
            $('q-local-settings')?.classList.toggle('hidden',mode==='neural');
            $('q-neural-save')?.classList.toggle('hidden',mode!=='neural');
            $('q-neural-json')?.classList.toggle('hidden',mode!=='neural');
            if(mode==='local'&&$('q-format')?.value==='MIX')$('q-format').value='CE';
            if($('q-generate-button'))$('q-generate-button').textContent=mode==='neural'?'Gerar com motor neural':'Gerar e iniciar questões';
            if($('q-next-button'))$('q-next-button').textContent=mode==='neural'?'Próximo lote neural':'Próximo lote inédito';
            updateNeuralFormatUI();refreshQuestionStudio();
        }
        function updateNeuralFormatUI(){
            const mixed=$('q-format')?.querySelector('option[value="MIX"]');
            if(mixed)mixed.disabled=QUESTION_ENGINE!=='neural';
            if(QUESTION_ENGINE==='local'&&$('q-format')?.value==='MIX')$('q-format').value='CE';
            $('q-neural-command-wrap')?.classList.toggle('hidden',QUESTION_ENGINE!=='neural'||$('q-format')?.value!=='MC');
        }
        function refreshQuestionStudio(){
            const selected=$('q-source')?.value,el=$('q-document-indicator');
            if(el)el.textContent=selected==='imported'?'Provas importadas: utilize o modo Tradicional':
                selected==='all'?'Catálogo inteiro (guias didáticos, não leis integrais)':
                CUR.guide?'Fonte: '+CUR.guide.lawName:'Nenhum documento selecionado';
        }
        function stopQuestionAI(){window.PMDFNeuralQuestions?.stop?.();}
        function startNeuralQuestions(more=false){
            if(!window.PMDFNeuralQuestions)return toast('Motor neural não carregado. Recarregue a página.','error');
            return window.PMDFNeuralQuestions.start(Boolean(more));
        }
        function saveNeuralQuestions(){return window.PMDFNeuralQuestions?.save?.();}
        function exportNeuralQuestions(){return window.PMDFNeuralQuestions?.json?.();}
                function questionUseSource(text,title){
            if(window.PMDFNeuralQuestions?.status?.().running)throw Error('Interrompa a geração antes de trocar o material.');
            const raw=String(text||'').trim();
            if(raw.length<60)throw Error('Forneça ao menos 60 caracteres de texto legível.');
            const g=analyzeLawText(raw,String(title||'Material personalizado').slice(0,160));
            g._baseLawName=g.lawName;
            const key='custom-'+hash(g.lawName+'|'+raw);
            CUR={key,guide:g,_poolCache:Object.create(null)};
            $('q-source').value='current';
            if(!store.set('custom:'+key,JSON.stringify(g)))toast('O documento excede o espaço de armazenamento; mantenha o arquivo original.','error');
            renderGuide(g,true);refreshQuestionStudio();
            $('q-status').textContent='Material analisado: '+g.lawName+'.';
            return g;
        }
        function questionUseText(){
            try{
                const g=questionUseSource($('q-inline-text')?.value,$('q-inline-title')?.value||'Texto personalizado');
                toast('Texto analisado: '+g.lawName,'ok');
            }catch(e){toast('Falha na análise: '+e.message,'error');}
        }
        async function questionUploadFile(input){
            const f=input?.files?.[0];if(!f)return;
            if(f.size>50*1024*1024){toast('Documento maior que 50 MB. Divida o conteúdo para preservar a memória do aparelho.','error');input.value='';return;}
            if(!/\.(pdf|docx|txt)$/i.test(f.name)){toast('Formato permitido: PDF, DOCX ou TXT.','error');input.value='';return;}
            $('q-status').textContent='Extraindo texto de '+f.name+'...';
            try{
                const t=await readFileText(f);questionUseSource(t,f.name);
                toast('Documento extraído e pronto para gerar questões.','ok');
            }catch(e){$('q-status').textContent='Falha ao analisar documento.';toast(e.message,'error');}
            finally{input.value='';}
        }
        window.PMDFNeuralQuestionHost={
            el:id=>$(id),toast:(message,kind)=>toast(message,kind),hash,store,
            guides:()=>pickStudyGuides('q'),
            sourceUnits:guides=>guides.flatMap(g=>['highIncidence','mediumIncidence','lowIncidence'].flatMap(group=>
                safeArray(g.articlesMapping?.[group]).map(a=>({law:g.lawName,article:String(a.article||'Tópico'),
                text:String(a.sourceText||a.plainExplanation||'')})))),
            auth:()=>AUTH_USER,
            // Reaproveita o elaborador por banca e nível já auditado no site.
            // Intercala C/E e múltipla escolha; preserva cota por assunto para
            // que selecionar TODO o catálogo não exclua as últimas disciplinas.
            referenceQuestions:(guides,level)=>{
                const result=[];
                const perGuide=guides.length>1?Math.max(24,Math.floor(1300/guides.length)):500;
                for(const guide of guides){
                    const ce=questionPool(guide,'CE',level);
                    const mc=questionPool(guide,'MC',level,5);
                    let taken=0;
                    for(let i=0;i<Math.max(ce.length,mc.length)&&taken<perGuide;i++){
                        if(ce[i]&&taken<perGuide){result.push(ce[i]);taken++;}
                        if(mc[i]&&taken<perGuide){result.push(mc[i]);taken++;}
                    }
                }
                return result.slice(0,1500);
            },
            setQuestions:(items,{model,key,total,target})=>{
                Q_STATE={items:items.slice(),engine:'neural',modelId:model,index:0,hits:0,wrong:0,blank:0,
                    pending:0,answered:false,questionStart:Date.now(),
                    coverage:{total:Math.max(target,total),shown:total,remaining:Math.max(0,target-total),cycleKey:key}};
                saveStudySession();$('q-panel').classList.remove('hidden');drawQuestions();
                $('q-status').textContent='Motor neural local · '+items.length+' questões geradas sem API externa.';
                $('q-coverage').textContent='Cobertura: '+total+' de '+target+' questões disponíveis.';
            },
            persist:async rows=>{
                if(!AUTH_USER)throw Error('Faça login antes de salvar.');
                const token=await sbToken();
                const response=await fetch(SB_URL+'/rest/v1/questoes?on_conflict=hash_unico',{
                    method:'POST',headers:{...sbHeaders(token),Prefer:'resolution=merge-duplicates,return=minimal'},
                    body:JSON.stringify(rows)});
                if(!response.ok){const data=await response.json().catch(()=>({}));
                    throw Error(data.message||data.error||('HTTP '+response.status));}
                return true;
            }
        };
        function questionCoverageId(q){
            return q.coverageId || q.type+'|'+(q.law||'')+'|'+(q.lawBasis||'')+'|'+String(q.statement||'').trim();
        }
        function questionCycleKey(guides,fmt,lvl,imported){
            const sources=imported ? [...new Set(IMPORTED_QUESTIONS.map(q=>q.law||'Prova'))].sort().join('|')
                : guides.map(g=>g._baseLawName||g.lawName||'Material').sort().join('|');
            // A fonte, não o último guia aberto, determina a identidade do ciclo.
            // O hash do conteúdo impede utilizar histórico de uma edição antiga
            // de lei como se as questões novas já tivessem sido apresentadas.
            const sourceId=imported?'importadas':(guides.length===1&&CUR.guide===guides[0]&&CUR.key?CUR.key:sources);
            const sourceDigest=imported?hash(IMPORTED_QUESTIONS.map(q=>q.law+'|'+q.statement+'|'+q.answer).join('¦')):
                hash(guides.map(g=>['highIncidence','mediumIncidence','lowIncidence'].map(group=>
                    safeArray(g.articlesMapping?.[group]).map(a=>(hash(String(a.article||'')+'|'+String(a.sourceText||a.plainExplanation||''))>>>0).toString(36)).join(',')).join(';')).join('§'));
            const fingerprint=sourceId+'|'+sources+'|'+sourceDigest+'|'+fmt+'|'+lvl+'|'+($('q-board')?.value||'');
            return 'q:coverage:v3:'+(hash(fingerprint)>>>0).toString(36);
        }
        function resetQuestionCycle(){
            if(QUESTION_ENGINE==='neural')return window.PMDFNeuralQuestions?.reset?.();
            const imported=$('q-source').value==='imported',guides=imported?[]:pickStudyGuides('q');
            const fmt=$('q-format').value==='MC'?'MC':'CE',lvl=LEVELS_SAFE_LEVEL($('q-level').value);
            store.del(questionCycleKey(guides,fmt,lvl,imported));
            if($('q-coverage'))$('q-coverage').textContent='Cobertura reiniciada para esta fonte, formato e nível.';
            toast('Histórico de lotes reiniciado; suas estatísticas foram mantidas.','ok');
        }
        async function startQuestions(nextBatch=false){
            if(QUESTION_ENGINE==='neural'&&!SAFE_FALLBACK_ACTIVE)return startNeuralQuestions(nextBatch);
            if(!AUTH_USER)return toast('Faça login para gerar questões.','error');
            const imported=$('q-source').value==='imported';
            let guides=imported?[]:pickStudyGuides('q');
            if(SAFE_FALLBACK_ACTIVE&&$('q-source')?.value==='all'&&guides.length){
                const cursor=Math.max(0,Number(store.get('q:adaptive:all:cursor'))||0);
                guides=[guides[cursor%guides.length]];
                store.set('q:adaptive:all:cursor',String(cursor+1));
            }
            if(!imported&&!guides.length)return toast('Selecione uma norma ou envie conteúdo para gerar questões.','error');
            const fmt=$('q-format').value;
            const lvl=LEVELS_SAFE_LEVEL($('q-level').value);
            const baseFmt=fmt==='CE'?'CE':'MC';
            let pool=[];
            try{
                if(imported){
                    pool=IMPORTED_QUESTIONS.filter(q=>q.type===baseFmt).map(q=>({...q}));
                }else{
                    for(const g of guides){
                        const five=questionPool(g,baseFmt,lvl,5);
                        const four=baseFmt==='MC'?questionPool(g,baseFmt,lvl,4):[];
                        const keys=new Set(five.map(questionCoverageId));
                        pool.push(...five.map(q=>({...q,law:g.lawName})));
                        for(const q of four){
                            const id=questionCoverageId(q);
                            if(!keys.has(id)){pool.push({...q,law:g.lawName});keys.add(id);}
                        }
                    }
                }
                pool=uniqueQuestions(pool.filter(questionIsComplete).filter(q=>
                    baseFmt!=='MC'||(Array.isArray(q.options)&&[4,5].includes(q.options.length)&&
                    new Set(q.options.map(x=>String(x).trim())).size===q.options.length&&
                    (imported||'ABCDE'.slice(0,q.options.length).includes(q.answer))
                )));
            }catch(e){return toast('Falha ao preparar questões: '+e.message,'error');}
            if(!pool.length)return toast('Não foram encontrados itens completos e verificáveis neste material. Amplie a fonte ou escolha outra norma.','error');
            const key=questionCycleKey(guides,baseFmt,lvl,imported),stored=jget(key,[]);
            const done=new Set(Array.isArray(stored)?stored.filter(x=>typeof x==='string'):[]);
            let unseen=shuffle(pool.filter(q=>!done.has(questionCoverageId(q))));
            let reviewRound=false;
            if(!unseen.length){
                if(SAFE_FALLBACK_ACTIVE){
                    // A ausência de inéditas não impede estudar. Recomeça uma
                    // rodada claramente identificada como REVISÃO, sem fingir
                    // que o motor determinístico criou questões novas.
                    reviewRound=true;
                    done.clear();
                    unseen=shuffle(pool);
                }else{
                    if($('q-coverage'))$('q-coverage').textContent='Cobertura esgotada: '+pool.length+' questões distintas já apresentadas. Reinicie para revisar.';
                    return toast('Todos os itens deste recorte já foram apresentados. Use “Reiniciar cobertura” para revisar.','ok');
                }
            }
            const configured=Number($('q-batch')?.value??30);
            const limit=configured===0?unseen.length:Math.min(Math.max(1,configured),unseen.length);
            const selected=unseen.slice(0,limit);
            selected.forEach(q=>done.add(questionCoverageId(q)));
            const coverageSaved=store.set(key,JSON.stringify([...done]));
            if(!coverageSaved)toast('Armazenamento local cheio: este lote não poderá ser recuperado após fechar a página.','error');
            Q_STATE={items:selected,engine:'local',review:reviewRound,index:0,hits:0,wrong:0,blank:0,pending:0,answered:false,questionStart:Date.now(),
                coverage:{total:pool.length,shown:pool.length-unseen.length+selected.length,remaining:unseen.length-selected.length,cycleKey:key}};
            saveStudySession();
            $('q-status').textContent=(reviewRound?'Rodada de revisão de questões já apresentadas. ':'Fonte: '+(imported?'Provas importadas':guides.length===1?guides[0].lawName:guides.length+' leis')+' · ')+
                'Nível: '+LEVELS[lvl].label+' · Critério: '+EXAMINER_RUBRIC[lvl].label+' · Lote: '+selected.length+' questões.';
            if($('q-coverage'))$('q-coverage').textContent=(reviewRound?'Revisão (não são questões inéditas): ':'Cobertura: ')+
                Q_STATE.coverage.shown+' de '+pool.length+' itens verificáveis no material · '+Q_STATE.coverage.remaining+' itens restantes no ciclo.';
            $('q-panel').classList.remove('hidden');
            drawQuestions();
        }
        function drawQuestions(){
            const el=$('q-panel'),s=Q_STATE;if(!el||!s)return;
            if(s.index>=s.items.length){
                const pct=Math.round(s.hits/Math.max(1,s.items.length-(s.pending||0))*100);saveStudySession();
                el.innerHTML='<h3 class="text-lg font-bold text-[#E5C158]">Simulado concluído</h3><p class="mt-2 text-slate-100">'+s.hits+' acertos de '+s.items.length+' questões ('+pct+'%). '+s.wrong+' erros · '+s.blank+' em branco · '+(s.pending||0)+' aguardando gabarito.</p><p class="mt-2 text-xs text-[#E5C158]">'+(s.coverage?s.coverage.shown+' de '+s.coverage.total+' itens gerados · '+s.coverage.remaining+' pendentes':'')+'</p><button type="button" id="q-result-prev" class="mt-4 px-4 py-2 rounded-xl border border-[#334155] text-slate-100" data-pmdf-onclick="previousQuestion()">← Rever última questão</button> <button class="mt-4 px-4 py-2 rounded-xl bg-[#D4AF37] text-[#050B16] font-bold" data-pmdf-onclick="startQuestions(true)">'+(s.engine==='neural'?'Gerar mais com motor neural':s.engine==='adaptive'?'Próximo lote (modo seguro)':'Próximo lote inédito')+'</button> <button class="mt-4 px-4 py-2 rounded-xl border border-[#334155] text-slate-100" data-pmdf-onclick="resetQuestionCycle();startQuestions()">Reiniciar ciclo</button>';
                return;
            }
            const q=s.items[s.index],mc=q.type==='MC',choices=mc?q.options:['Certo','Errado'];
            el.innerHTML='<div class="study-progress-meter" aria-label="Progresso das questões"><span style="width:'+Math.round(s.index/s.items.length*100)+'%"></span></div><p class="text-xs text-slate-400">✅ '+s.hits+' acertos · ❌ '+s.wrong+' erros · ◻ '+s.blank+' brancas · '+(s.pending||0)+' sem gabarito</p><p class="text-sm text-[#E5C158] font-semibold mb-2">Questão '+(s.index+1)+' de '+s.items.length+'</p><p class="text-xs text-slate-400 mb-3">'+esc(q.law||'Material de estudo')+' · '+esc(q.topic||'Geral')+'</p>'+(q.origin==='neural-local'?'<p class="text-xs mb-3 text-[#E5C158]">Motor neural local · confira a fonte e a vigência</p>':q.origin==='webllm-local'?'<p class="text-xs mb-3 text-[#E5C158]">Questão de IA local de sessão anterior</p>':'')+'<p class="text-base text-slate-100 leading-relaxed font-semibold mb-4">'+esc(q.statement)+'</p>'+
                '<div id="q-alternatives" class="grid gap-2">'+choices.map((choice,j)=>'<button type="button" data-choice="'+(mc?'ABCDE'[j]:'CE'[j])+'" data-pmdf-onclick="answerQuestion(this.dataset.choice)" class="q-choice text-left px-4 py-3 rounded-xl border border-[#334155] bg-[#0E1B33] text-slate-100 hover:border-[#D4AF37]">'+(mc?'ABCDE'[j]+') ':'')+esc(choice)+'</button>').join('')+'</div><div class="pmdf-study-nav"><button type="button" id="q-blank" data-pmdf-onclick="answerQuestion(null)" class="qstudio-secondary">Deixar em branco</button>'+
                 '<div class="pmdf-study-nav-pair"><button type="button" id="q-nav-prev" data-pmdf-onclick="previousQuestion()" '+(s.index===0?'disabled':'')+' class="qstudio-secondary">← Anterior</button>'+
                 '<button type="button" id="q-nav-next" data-pmdf-onclick="nextQuestion()" disabled class="qstudio-primary">'+(s.index+1===s.items.length?'Ver resultado':'Próxima →')+'</button></div></div>'+
                 '<div id="q-feedback" role="status" aria-live="polite"></div>';
            const previous=s.responses?.[s.index];
            if(previous){
                s.answered=true;
                document.querySelectorAll('#q-alternatives button').forEach(btn=>{
                    btn.disabled=true;
                    if(btn.dataset.choice===q.answer)btn.classList.add('border-emerald-500');
                    if(previous.choice===btn.dataset.choice&&previous.choice!==q.answer)btn.classList.add('border-red-500');
                });
                $('q-blank').disabled=true;
                $('q-feedback').innerHTML=pmdfSafeHtml(previous.feedback||'');
                $('q-nav-next').disabled=false;
            }else{s.answered=false;if(!s.questionStart)s.questionStart=Date.now();}
        }
        function answerQuestion(answer){
            const s=Q_STATE;if(!s||s.answered)return;
            const q=s.items[s.index];const elapsedSec=Math.min(86400,Math.max(0,(Date.now()-(s.questionStart||Date.now()))/1000));s.answered=true;
            const blank=answer===null,correct=!blank&&answer===q.answer;
            if(q.origin==='neural-local'&&!blank&&q.sourceQuote){
                try{window.PMDFNeuralQuestions?.testModel?.().aprenderComFeedback(q.sourceQuote,correct?0.40:0.90,correct?0.35:0.90);}catch(e){}
            }
            const hasKey=!!q.answer; if(blank)s.blank++;else if(!hasKey)s.pending=(s.pending||0)+1;else if(correct)s.hits++;else s.wrong++;
            document.querySelectorAll('#q-alternatives button').forEach(btn=>{btn.disabled=true;if(btn.dataset.choice===q.answer)btn.classList.add('border-emerald-500');if(btn.dataset.choice===answer&&!correct)btn.classList.add('border-red-500');});
            $('q-blank').disabled=true; if(!blank&&hasKey)recordQuestionResult(q,answer===q.answer,elapsedSec);saveStudySession();showQuestionTotals();
            if(!blank && hasKey){
                const law=q.law||'Material';const stats=jget('sim:stats',{});stats[law]=stats[law]||{a:0,c:0};stats[law].a++;if(correct)stats[law].c++;store.set('sim:stats',JSON.stringify(stats));
                const errors=jget('sim:errs',[]);const idx=errors.findIndex(e=>e.statement===q.statement);
                if(correct&&idx>=0)errors.splice(idx,1);else if(!correct){if(idx>=0)errors[idx].n++;else errors.push({...q,n:1,law});}
                store.set('sim:errs',JSON.stringify(errors));
            }
            const gab=!hasKey?'Não disponível: importe o gabarito oficial':q.type==='MC'?q.answer+') '+(q.options['ABCDE'.indexOf(q.answer)]||''):q.answer==='C'?'Certo':'Errado';
            const aiEvidence=['webllm-local','neural-local'].includes(q.origin)?'<p class="mt-2"><strong>Trecho literal:</strong> '+esc(q.sourceQuote||'Não disponível')+'</p>':'';
            const aiDistractors=['webllm-local','neural-local'].includes(q.origin)&&Array.isArray(q.optionAnalysis)&&q.optionAnalysis.length?'<div class="mt-2"><strong>Justificativa das alternativas:</strong><ul class="list-disc ml-5">'+q.optionAnalysis.map((v,i)=>'<li>'+esc('ABCDE'[i]+') '+v)+'</li>').join('')+'</ul></div>':'';
            $('q-feedback').innerHTML='<div class="g-card mt-4"><p class="font-bold '+(correct?'text-emerald-300':'text-[#E5C158]')+'">'+(blank?'Em branco':!hasKey?'Resposta registrada — aguardando gabarito':correct?'✅ Acertou':'❌ Errou')+' · Gabarito: '+esc(gab)+'</p><p><strong>Comentário:</strong> '+esc(q.explanation||'Confira o trecho-fonte.')+'</p><p><strong>Fundamento:</strong> '+esc(q.lawBasis||'Conteúdo estudado')+'</p>'+aiEvidence+aiDistractors+(q.easyTip?'<p><strong>Dica:</strong> '+esc(q.easyTip)+'</p>':'')+'</div>';
            s.responses=s.responses||{};
            s.responses[s.index]={choice:answer,feedback:$('q-feedback').innerHTML};
            $('q-nav-next').disabled=false;
            saveStudySession();
        }
        function previousQuestion(){
            if(!Q_STATE||Q_STATE.index<=0)return;
            Q_STATE.index--;Q_STATE.questionStart=Date.now();saveStudySession();drawQuestions();
        }
        function nextQuestion(){
            if(!Q_STATE||!Q_STATE.answered)return;
            Q_STATE.index++;Q_STATE.answered=false;Q_STATE.questionStart=Date.now();
            saveStudySession();drawQuestions();
        }
        function showQuestionTotals(){ const st=jget('sim:stats',{}),a=Object.values(st).reduce((n,x)=>n+(x.a||0),0),c=Object.values(st).reduce((n,x)=>n+(x.c||0),0);
            const el=$('question-progress-summary');if(el)el.textContent='Histórico no dispositivo: '+a+' respondidas · '+c+' certas · '+(a-c)+' erradas'; }
        let ANKI_STATE=null,ANKI_BANK=[],ANKI_GENERATION=0;
        function stopAnkiGeneration(){
            ANKI_GENERATION++;
            $('anki-generation-status').textContent='Geração interrompida. A revisão anterior foi preservada.';
            $('anki-start').disabled=false;
            $('anki-stop')?.classList.add('hidden');
        }
        function exportAnkiCards(format='csv'){
            const cards=ANKI_BANK.length?ANKI_BANK:(ANKI_STATE?.cards||[]);
            if(!cards.length)return toast('Gere ou abra um baralho antes de exportar.','error');
            const tab=format==='tsv',sep=tab?'\t':';',ext=tab?'tsv':'csv';
            const quote=v=>{
                // Desarma fórmulas em planilhas sem modificar o texto de estudo exibido.
                let s=String(v??'').replace(/\r\n?/g,'\n');
                if(/^[\s]*[=+@]/.test(s))s="'"+s;
                return '"'+s.replace(/"/g,'""')+'"';
            };
            const rows=[['Frente','Verso','Extra','Tags']];
            for(const c of cards)rows.push([c.cloze||c.front,c.back,
                (c.extra||c.source||'')+'\nReferência: '+(c.reference||c.article||'')+'\nAlerta: '+(c.warning||'Confira o trecho-fonte.'),c.tags||'#MetodoPMDF']);
            const output='\uFEFF'+rows.map(row=>row.map(quote).join(sep)).join('\r\n');
            const url=URL.createObjectURL(new Blob([output],{type:tab?'text/tab-separated-values;charset=utf-8':'text/csv;charset=utf-8'}));
            const link=document.createElement('a');link.href=url;link.download='pmdf-flashcards-'+cards.length+'-'+Date.now()+'.'+ext;
            link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
            toast(cards.length+' flashcards exportados. Para lacunas, escolha o tipo Cloze no Anki.','ok');
        }
        function exportAnkiDeck(type='cloze'){
            const all=ANKI_BANK.length?ANKI_BANK:(ANKI_STATE?.cards||[]);
            const cloze=type==='cloze',cards=all.filter(c=>cloze?!!c.cloze:!c.cloze);
            if(!cards.length)return toast('Não existem cartões deste tipo no banco atual.','error');
            const header=['#separator:Tab','#html:false','#notetype:'+(cloze?'Cloze':'Basic'),
                '#deck:Método PMDF::Flashcards','#tags column:3',
                '#columns:'+(cloze?'Text\tExtra\tTags':'Front\tBack\tTags')];
            const field=v=>'"'+String(v??'').replace(/\r?\n/g,' ').replace(/"/g,'""')+'"';
            const rows=cards.map(c=>{
                const extra=(c.extra||c.source||'')+' | Fonte: '+(c.reference||c.article||'')+
                    ' | '+(c.warning||'Confira a redação vigente.');
                return (cloze?[c.cloze,extra,c.tags||'#Cloze']:
                    [c.front,c.back+' | '+extra,c.tags||'#MetodoPMDF']).map(field).join('\t');
            });
            const txt='\uFEFF'+header.join('\n')+'\n'+rows.join('\n')+'\n';
            const url=URL.createObjectURL(new Blob([txt],{type:'text/plain;charset=utf-8'}));
            const link=document.createElement('a');link.href=url;
            link.download='pmdf-anki-'+(cloze?'cloze':'basic')+'-'+cards.length+'.txt';
            link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
            toast(cards.length+' notas '+(cloze?'Cloze':'Basic')+' prontas para importar no Anki.','ok');
        }
        function startAnki(){
            const guides=pickStudyGuides('anki');
            if($('anki-generation-mode')?.value!=='classic'&&window.PMDFNeuralFlashcards?.buildAsync)
                return startAnkiAdvanced(guides);
            return startAnkiLegacy();
        }
        async function startAnkiAdvanced(guides){
            if(!guides.length)return toast('Selecione um guia ou envie um documento para gerar flashcards.','error');
            const token=++ANKI_GENERATION,decks=[],reports=[],button=$('anki-start'),status=$('anki-generation-status');
            button.disabled=true;$('anki-stop')?.classList.remove('hidden');
            status.textContent='Lendo as unidades de conhecimento e gerando cartões atômicos...';
            try{
                for(let index=0;index<guides.length;index++){
                    if(token!==ANKI_GENERATION)return;
                    const guide=guides[index];
                    const result=await window.PMDFNeuralFlashcards.buildAsync(guide,{level:LEVEL,
                        cancelled:()=>token!==ANKI_GENERATION,
                        onProgress:(done,total,count)=>{if(token===ANKI_GENERATION)
                            status.textContent='Fonte '+(index+1)+'/'+guides.length+' · '+done+'/'+total+
                            ' dispositivos · '+count+' cartões identificados';}});
                    if(token!==ANKI_GENERATION||result.cancelled)return;
                    let deck=result.cards;
                    // Não ressuscitar cartões genéricos quando a fonte não contém fato testável.
                    decks.push(deck.map(card=>({...card,law:guide.lawName})));
                    reports.push(result.report);
                    if(index%4===3)await new Promise(resolve=>setTimeout(resolve,0));
                }
                if(token!==ANKI_GENERATION)return;
                // Rodada justa entre todas as disciplinas, sem concentrar o primeiro lote.
                const all=[],max=Math.max(0,...decks.map(deck=>deck.length));
                for(let i=0;i<max;i++)for(const deck of decks)if(deck[i])all.push(deck[i]);
                const bank=[...new Map(all.map(c=>[c.id,c])).values()];
                if(!bank.length)throw Error('O material não contém unidades legíveis suficientes para cartões verificáveis.');
                ANKI_BANK=bank;
                const sourceUnits=reports.reduce((n,r)=>n+(r?.sourceUnits||0),0);
                const modes={'Básico (P&R)':0,'Cloze (Lacuna)':0,'Gatilho de Banca':0};
                const levels={'Fácil':0,'Médio':0,'Difícil':0};
                for(const c of bank){
                    const kind=c.modality||'Básico (P&R)';modes[kind]=(modes[kind]||0)+1;
                    const difficulty=c.difficulty||'Médio';levels[difficulty]=(levels[difficulty]||0)+1;
                }
                const uniqueTopics=new Set(bank.map(c=>c.law+'|'+(c.reference||c.article))).size;
                let cards=bank.slice(),mode=$('anki-mode').value;
                if(mode==='due'){
                    cards=cards.filter(c=>{const state=getCardBox(c.id);return !state.due||Date.now()>=state.due;});
                    cards.sort((a,b)=>getCardBox(a.id).due-getCardBox(b.id).due);
                }
                const available=cards.length,requested=$('anki-batch-size')?.value||'50';
                const limit=requested==='all'?available:Math.max(1,Number(requested)||50);
                if(mode==='all'&&cards.length){
                    const key='anki:batch:v4:'+(hash(bank.map(c=>c.id).join('¦')+'|'+LEVEL)>>>0).toString(36);
                    let cursor=Math.max(0,Number(store.get(key))||0);
                    if(cursor>=cards.length)cursor=0;
                    const selected=cards.slice(cursor,cursor+limit);
                    store.set(key,String(cursor+selected.length));
                    cards=selected;
                }else cards=cards.slice(0,limit);
                ANKI_STATE={cards,index:0,seen:0,back:false,graded:null,correct:0,wrong:0,ratings:{}};
                saveStudySession();$('anki-panel').classList.remove('hidden');
                $('anki-status').textContent='Motor neural local · banco de '+bank.length+' cartões válidos · '+
                    cards.length+' neste lote · '+available+' elegíveis para revisão.';
                status.textContent='Cobertura: '+uniqueTopics+' tópicos · '+sourceUnits+
                    ' unidades processadas · '+bank.length+' cartões distintos extraídos.';
                $('anki-coverage').textContent='Banco: '+bank.length+' cartões de '+uniqueTopics+
                    ' tópicos · '+sourceUnits+' unidades de texto. Modalidades: básico '+(modes['Básico (P&R)']||0)+
                    ', lacunas '+(modes['Cloze (Lacuna)']||0)+', julgamento '+(modes['Gatilho de Banca']||0)+
                    '. Dificuldade: fácil '+levels['Fácil']+', média '+levels['Médio']+', difícil '+
                    levels['Difícil']+'. Conteúdo não legível ou sem fato verificável pode ficar de fora.';
                if($('anki-coverage-details'))$('anki-coverage-details').open=true;
                if(!cards.length)$('anki-panel').innerHTML='<div class="g-card"><h3 class="font-bold text-[#E5C158]">Nenhum cartão vencido</h3><p class="mt-2">Você está em dia. Altere para Todos (treino livre) se desejar continuar.</p></div>';
                else drawAnki();
                return {count:cards.length,bank:bank.length};
            }catch(e){
                status.textContent='Erro na geração: '+String(e.message||e);
                toast('Não foi possível gerar os flashcards: '+String(e.message||e),'error');
            }finally{
                if(token===ANKI_GENERATION){button.disabled=false;$('anki-stop')?.classList.add('hidden');}
            }
        }
        function startAnkiLegacy(){
            const guides=pickStudyGuides('anki');
            if(!guides.length)return toast('Selecione um guia ou envie um conteúdo antes de revisar.','error');
            // Intercala os materiais antes de formar os lotes: ao estudar todas as
            // leis, a revisão não fica concentrada apenas nas primeiras normas.
            const decks=guides.map(g=>buildStudyCardsLegacy(g).map(card=>({...card,law:g.lawName})));
            let cards=[];
            const max=Math.max(0,...decks.map(deck=>deck.length));
            for(let i=0;i<max;i++)for(const deck of decks)if(deck[i])cards.push(deck[i]);
            cards=[...new Map(cards.map(c=>[c.id,c])).values()];
            ANKI_BANK=cards.slice();
            const mode=$('anki-mode').value;
            if(mode==='due'){
                cards=cards.filter(c=>{const state=getCardBox(c.id);return !state.due||Date.now()>=state.due;});
                cards.sort((x,y)=>getCardBox(x.id).due-getCardBox(y.id).due);
            }
            const available=cards.length;
            const requested=$('anki-batch-size')?.value||'50';
            const limit=requested==='all'?available:Math.max(1,Math.min(200,Number(requested)||50));
            // Treino livre percorre todo o conjunto em lotes consecutivos.
            // A ordem é estável entre sessões, mesmo depois de avaliar cartões.
            if(mode==='all'&&cards.length){
                const cycleKey='anki:batch:v3:'+(hash(cards.map(c=>c.id).join('¦')+'|'+LEVEL)>>>0).toString(36);
                let cursor=Math.max(0,Number(store.get(cycleKey))||0);
                if(cursor>=cards.length)cursor=0;
                const batch=cards.slice(cursor,cursor+limit);
                store.set(cycleKey,String(cursor+batch.length));
                cards=batch;
            }else cards=cards.slice(0,limit);
            ANKI_STATE={cards,index:0,seen:0,back:false,graded:null,correct:0,wrong:0,ratings:{}};
            saveStudySession();$('anki-panel').classList.remove('hidden');
            $('anki-status').textContent='Revisão pronta · '+cards.length+' cartões neste lote, de '+available+
                ' elegíveis · '+LEVELS[LEVEL].label+'. Avalie a recordação para programar as próximas revisões.';
            if(!cards.length){
                $('anki-panel').innerHTML='<div class="g-card"><h3 class="font-bold text-[#E5C158]">Nenhum cartão vencido</h3><p class="mt-2 text-slate-300">Você está em dia. Se quiser continuar praticando, selecione “Todos (treino livre)”.</p></div>';
                return;
            }
            drawAnki();
        }
        function renderAnkiStatement(c,showAnswer){
            if(!c?.cloze)return esc(showAnswer?c.back:c.front);
            const raw=String(c.cloze),pivot=raw.indexOf(' · '),text=pivot>=0?raw.slice(pivot+3):raw;
            const cloze=/\{\{c1::([^}:]+)(?:::[^}]+)?\}\}/.exec(text);
            if(!cloze)return esc(showAnswer?c.back:c.front);
            const term=showAnswer?
                '<mark class="anki-blank-revealed">'+esc(cloze[1])+'</mark>':
                '<span class="anki-blank-masked" aria-label="lacuna oculta">[&nbsp;…&nbsp;]</span>';
            return esc(text.slice(0,cloze.index))+term+esc(text.slice(cloze.index+cloze[0].length));
        }
        function drawAnki(){
            const el=$('anki-panel'),s=ANKI_STATE;if(!el||!s)return;
            if(s.index>=s.cards.length){
                el.innerHTML='<div class="anki-finish"><h3 class="text-xl font-bold text-[#E5C158]">Sessão percorrida</h3>'+
                    '<p class="mt-2">Você avaliou '+s.seen+' cartões. '+(s.correct||0)+' lembrados · '+(s.wrong||0)+' para reforçar. Cartões pulados não foram avaliados.</p>'+
                    '<div class="pmdf-study-nav"><button type="button" id="anki-nav-prev" data-pmdf-onclick="previousAnki()" class="qstudio-secondary">← Rever último cartão</button>'+
                    '<button type="button" class="qstudio-primary" data-pmdf-onclick="startAnki()">Nova revisão</button></div></div>';
                return;
            }
            const c=s.cards[s.index],state=getCardBox(c.id),percent=Math.round(s.index/Math.max(1,s.cards.length)*100);
            const evaluated=Object.prototype.hasOwnProperty.call(s.ratings||{},s.index);
            const name=esc(c.kind||'Conceito essencial'),law=esc(c.law||''),article=esc(c.article||'');
            const focus=s.back?'VERSO · RESPOSTA':'FRENTE · RECUPERAÇÃO ATIVA';
            el.innerHTML='<div class="study-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="'+s.cards.length+
                '" aria-valuenow="'+s.index+'" aria-label="Progresso da revisão"><span style="width:'+percent+'%"></span></div>'+
                '<div class="anki-meta"><span>Cartão '+(s.index+1)+' de '+s.cards.length+'</span>'+
                '<span>'+esc(LEVELS[LEVEL].label)+'</span><span>Caixa Leitner '+state.box+'</span></div>'+
                '<div class="anki-tags"><span>'+name+'</span><span>'+article+'</span>'+
                    (c.modality?'<span>'+esc(c.modality)+'</span>':'')+
                    (c.difficulty?'<span>'+esc(c.difficulty)+'</span>':'')+'</div>'+
                '<p class="anki-law">'+law+'</p>'+
                '<div class="anki-study-surface"><p class="anki-kicker">'+focus+'</p>'+
                (s.back?'<p class="anki-answer-caption">NÚCLEO DA RESPOSTA</p>':'')+
                '<p class="anki-question '+(c.cloze?'anki-question-cloze':'')+'">'+
                    (s.back?'<strong class="anki-short-answer">'+esc(c.back)+'</strong>':
                        renderAnkiStatement(c,false))+'</p>'+
                (s.back&&c.cloze?'<p class="anki-restored">'+renderAnkiStatement(c,true)+'</p>':'')+
                (!s.back&&c.hint?'<p class="anki-card-hint">Pista: '+esc(c.hint)+'</p>':'')+
                '</div>'+
                (s.back?'<div class="anki-proof"><b>Fundamento rastreável / Extra</b>'+
                    '<p class="anki-source-note">Fonte: '+law+' · '+article+
                    '. '+esc(c.scope||'Conteúdo do material selecionado')+'.</p>'+
                    (c.tip?'<div class="anki-learn-aid"><strong>💡 Dica para a prova</strong><p>'+esc(c.tip)+'</p></div>':'')+
                    (c.pitfall?'<div class="anki-learn-aid anki-exam-trap"><strong>🎯 Pegadinha da banca</strong><p>'+esc(c.pitfall)+'</p></div>':'')+
                    (c.application?'<div class="anki-learn-aid"><strong>🧭 Aplicação prática</strong><p>'+esc(c.application)+'</p></div>':'')+
                    '<details class="anki-evidence-details"><summary>Consultar texto-base e alerta de banca</summary>'+
                    '<p class="anki-evidence-text">'+esc(c.extra||c.source||c.back)+'</p>'+
                    (c.warning?'<p class="anki-source-note"><strong>Alerta:</strong> '+esc(c.warning)+'</p>':'')+
                    (c.tags?'<p class="anki-source-note">Tags: '+esc(c.tags)+'</p>':'')+
                    '</details></div>':
                    '<p class="anki-hint">Recupere somente a lacuna ou o conceito essencial. Revele a resposta para conferir.</p>')+
                '<div class="anki-study-controls"><div class="anki-actions '+(s.back&&!evaluated?'anki-grade-choices':'')+'">'+(!s.back?
                    '<button type="button" class="qstudio-primary" data-pmdf-onclick="revealAnki()">Revelar resposta</button>':
                    evaluated?'<span class="anki-reviewed-hint">Já avaliado como '+esc(s.ratings[s.index])+'. Voltar não altera sua nota.</span>':
                    '<button type="button" class="qstudio-secondary" data-pmdf-onclick="gradeAnki(false)">Errei <small>Rever</small></button>'+
                    '<button type="button" class="qstudio-secondary" data-pmdf-onclick="gradeAnkiRating(\'hard\')">Difícil <small>12 h</small></button>'+
                    '<button type="button" class="qstudio-primary" data-pmdf-onclick="gradeAnki(true)">Bom <small>Avançar</small></button>'+
                    '<button type="button" class="qstudio-primary" data-pmdf-onclick="gradeAnkiRating(\'easy\')">Fácil <small>Avançar +2</small></button>')+
                '</div><div class="anki-nav-pair"><button type="button" id="anki-nav-prev" data-pmdf-onclick="previousAnki()" '+(s.index===0?'disabled':'')+' class="qstudio-secondary">← Anterior</button>'+
                '<button type="button" id="anki-nav-next" data-pmdf-onclick="nextAnki()" class="qstudio-secondary" title="Avançar sem nota; não registra acerto ou erro">Próximo →</button></div></div>';
        }
        function revealAnki(){if(!ANKI_STATE||ANKI_STATE.back)return;ANKI_STATE.back=true;saveStudySession();drawAnki();}
        function gradeAnki(known){return gradeAnkiRating(known?'good':'again');}
        function gradeAnkiRating(rating){
            const session=ANKI_STATE;
            if(!session||!session.back||session.index>=session.cards.length||
                !['again','hard','good','easy'].includes(rating)||
                Object.prototype.hasOwnProperty.call(session.ratings||{},session.index))return;
            session.ratings=session.ratings||{};
            session.ratings[session.index]=rating;
            const card=session.cards[session.index];
            if(rating==='again'||rating==='good')setCardBox(card.id,rating==='good');
            else{
                const current=getCardBox(card.id).box,
                    next=rating==='easy'?Math.min(4,current+2):current,
                    due=Date.now()+(rating==='hard'?12*60*60*1000:[0,1,3,7,14][next]*86400000);
                store.set('fc:'+card.id,String(next));
                store.set('leitner:'+card.id,String(next));
                store.set('leitnerDue:'+card.id,String(due));
            }
            if(rating==='again')session.wrong=(session.wrong||0)+1;
            else session.correct=(session.correct||0)+1;
            session.index++;session.seen++;
            session.back=Object.prototype.hasOwnProperty.call(session.ratings,session.index);
            session.graded=rating!=='again';
            saveStudySession();drawAnki();
        }
        function previousAnki(){
            if(!ANKI_STATE||ANKI_STATE.index<=0)return;
            ANKI_STATE.index--;
            ANKI_STATE.back=Object.prototype.hasOwnProperty.call(ANKI_STATE.ratings||{},ANKI_STATE.index);
            saveStudySession();drawAnki();
        }
        function nextAnki(){
            // Pular cartão não equivale a lembrar ou errar e não altera o agendamento.
            if(!ANKI_STATE||ANKI_STATE.index>=ANKI_STATE.cards.length)return;
            ANKI_STATE.index++;
            ANKI_STATE.back=Object.prototype.hasOwnProperty.call(ANKI_STATE.ratings||{},ANKI_STATE.index);
            saveStudySession();drawAnki();
        }
                // Catálogo complementar: 11 normas com referências oficiais e guias pedagógicos.
        const EXTRA_LAW_URLS = {"jecrim":"https://www.planalto.gov.br/ccivil_03/leis/l9099.htm","orcrim":"https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm","genocidio":"https://www.planalto.gov.br/ccivil_03/leis/l2889.htm","racismo":"https://www.planalto.gov.br/ccivil_03/leis/l7716.htm","eca":"https://www.planalto.gov.br/ccivil_03/leis/l8069.htm","improbidade":"https://www.planalto.gov.br/ccivil_03/leis/l8429.htm","temporaria":"https://www.planalto.gov.br/ccivil_03/leis/l7960.htm","jef":"https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10259.htm","r200":"https://www.planalto.gov.br/ccivil_03/decreto/d88777compilado.htm","d10443":"https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10443.htm","l14751":"https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14751.htm"};
        Object.assign(BUILTIN_PMDF_GUIDES, {"jecrim":{"lawName":"Lei nº 9.099/1995 — Juizados Especiais Criminais","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l9099.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Regulamenta os Juizados Especiais Cíveis e Criminais estaduais e distritais. Para o policial, os temas centrais são menor potencial ofensivo, termo circunstanciado, composição civil e transação penal. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 2º — Critérios do processo: Oralidade, simplicidade, informalidade, economia processual e celeridade orientam os juizados.","Art. 61 — Menor potencial ofensivo: Abrange contravenções penais e crimes a que a lei comine pena máxima não superior a 2 anos, cumulada ou não com multa, ressalvadas regras especiais aplicáveis.","Art. 69 — Termo circunstanciado: A autoridade policial que tomar conhecimento da ocorrência lavrará termo circunstanciado e o encaminhará imediatamente ao Juizado, com autor do fato e vítima e requisitando os exames necessários.","Art. 72 — Audiência preliminar: Na audiência preliminar, esclarecem-se possibilidades de composição dos danos e de aceitação da proposta de aplicação imediata de pena não privativa de liberdade.","Art. 76 — Transação penal: O Ministério Público pode propor aplicação imediata de pena restritiva de direitos ou multa nas hipóteses legais, sujeita ao controle judicial."]},"structuralXRay":{"highPriority":[{"title":"Art. 2º — Critérios do processo","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 61 — Menor potencial ofensivo","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 69 — Termo circunstanciado","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 72 — Audiência preliminar","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 76 — Transação penal","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 89 — Suspensão condicional do processo","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 2º — Critérios do processo","plainExplanation":"Oralidade, simplicidade, informalidade, economia processual e celeridade orientam os juizados.","practicalExample":"No registro de infração de menor potencial ofensivo, os atos priorizam simplicidade e celeridade."},{"article":"Art. 61 — Menor potencial ofensivo","plainExplanation":"Abrange contravenções penais e crimes a que a lei comine pena máxima não superior a 2 anos, cumulada ou não com multa, ressalvadas regras especiais aplicáveis.","practicalExample":"A classificação depende da pena máxima abstratamente cominada, e não da pena provável."},{"article":"Art. 69 — Termo circunstanciado","plainExplanation":"A autoridade policial que tomar conhecimento da ocorrência lavrará termo circunstanciado e o encaminhará imediatamente ao Juizado, com autor do fato e vítima e requisitando os exames necessários.","practicalExample":"O termo circunstanciado não é sinônimo de inquérito policial tradicional."},{"article":"Art. 72 — Audiência preliminar","plainExplanation":"Na audiência preliminar, esclarecem-se possibilidades de composição dos danos e de aceitação da proposta de aplicação imediata de pena não privativa de liberdade.","practicalExample":"O procedimento busca solução consensual nas hipóteses legais."}],"mediumIncidence":[{"article":"Art. 76 — Transação penal","plainExplanation":"O Ministério Público pode propor aplicação imediata de pena restritiva de direitos ou multa nas hipóteses legais, sujeita ao controle judicial.","practicalExample":"Transação penal não significa automaticamente condenação criminal."},{"article":"Art. 89 — Suspensão condicional do processo","plainExplanation":"Para crimes em que a pena mínima cominada seja igual ou inferior a 1 ano, pode haver proposta de suspensão do processo, preenchidos os requisitos legais.","practicalExample":"Diferenciar pena máxima (art. 61) de pena mínima (art. 89)."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Confundir pena máxima de 2 anos do art. 61 com pena mínima de 1 ano do art. 89.","Considerar o termo circunstanciado o mesmo que inquérito policial."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 9.099/1995 — Juizados Especiais Criminais","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 9.099/1995 — Juizados Especiais Criminais deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"orcrim":{"lawName":"Lei nº 12.850/2013 — Organização criminosa","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12850.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Define organização criminosa e disciplina investigação, meios de obtenção de provas e crimes correlatos. A lei recebeu alterações posteriores; consultar a versão consolidada para a redação vigente. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º, § 1º — Conceito: Organização criminosa envolve associação de quatro ou mais pessoas, estruturalmente ordenada e com divisão de tarefas, ainda que informal, visando vantagem mediante infrações com pena máxima superior a quatro anos ou de caráter transnacional.","Art. 2º — Integrar organização criminosa: Promover, constituir, financiar ou integrar organização criminosa é crime com pena específica, sem afastar sanções por demais infrações cometidas.","Art. 3º — Meios de obtenção da prova: A lei prevê colaboração premiada, ação controlada, infiltração de agentes, captação ambiental e outras técnicas, sob condições e controles específicos.","Art. 4º — Colaboração premiada: A colaboração depende de voluntariedade e resultados efetivos; os benefícios são avaliados nos termos legais e com controle judicial.","Art. 8º — Ação controlada: Consiste em retardar a intervenção policial ou administrativa relativa à ação praticada por organização criminosa ou a ela vinculada, mantendo acompanhamento para momento mais eficaz de formação de provas e obtenção de informações."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º, § 1º — Conceito","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Integrar organização criminosa","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 3º — Meios de obtenção da prova","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 4º — Colaboração premiada","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 8º — Ação controlada","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 10 — Infiltração de agentes","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º, § 1º — Conceito","plainExplanation":"Organização criminosa envolve associação de quatro ou mais pessoas, estruturalmente ordenada e com divisão de tarefas, ainda que informal, visando vantagem mediante infrações com pena máxima superior a quatro anos ou de caráter transnacional.","practicalExample":"Diferenciar o requisito de quatro integrantes da hipótese de associação criminosa do Código Penal."},{"article":"Art. 2º — Integrar organização criminosa","plainExplanation":"Promover, constituir, financiar ou integrar organização criminosa é crime com pena específica, sem afastar sanções por demais infrações cometidas.","practicalExample":"O agente pode responder pelo delito associativo e pelos crimes praticados, conforme o caso."},{"article":"Art. 3º — Meios de obtenção da prova","plainExplanation":"A lei prevê colaboração premiada, ação controlada, infiltração de agentes, captação ambiental e outras técnicas, sob condições e controles específicos.","practicalExample":"A adoção de técnica invasiva exige observar requisitos e autorizações legalmente previstos."},{"article":"Art. 4º — Colaboração premiada","plainExplanation":"A colaboração depende de voluntariedade e resultados efetivos; os benefícios são avaliados nos termos legais e com controle judicial.","practicalExample":"Não equiparar mera delação sem requisitos à colaboração premiada válida."}],"mediumIncidence":[{"article":"Art. 8º — Ação controlada","plainExplanation":"Consiste em retardar a intervenção policial ou administrativa relativa à ação praticada por organização criminosa ou a ela vinculada, mantendo acompanhamento para momento mais eficaz de formação de provas e obtenção de informações.","practicalExample":"O retardamento não autoriza atuação sem as comunicações e cautelas legais."},{"article":"Art. 10 — Infiltração de agentes","plainExplanation":"Infiltração de policiais em tarefas de investigação tem regime legal próprio e depende de autorização judicial circunstanciada, motivada e sigilosa.","practicalExample":"Não confundir infiltração com simples ação disfarçada sem o procedimento legal."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Não confundir organização criminosa com associação criminosa simples.","Cuidado com alterações legislativas recentes no art. 2º e em dispositivos posteriores."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 12.850/2013 — Organização criminosa","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 12.850/2013 — Organização criminosa deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"genocidio":{"lawName":"Lei nº 2.889/1956 — Crime de genocídio","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l2889.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Define e pune o genocídio, voltado à destruição, no todo ou em parte, de grupo nacional, étnico, racial ou religioso. Exige finalidade específica prevista na norma. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º, caput — Finalidade especial: Genocídio exige intenção de destruir, no todo ou em parte, grupo nacional, étnico, racial ou religioso, por uma das condutas previstas em lei.","Art. 1º, alínea a — Matar membros do grupo: Matar integrantes do grupo com a finalidade específica de destruição é uma das condutas tipificadas.","Art. 1º, alínea b — Lesão grave: Causar lesão grave à integridade física ou mental dos membros do grupo, com o fim de destruição, é uma das modalidades.","Art. 1º, alínea c — Condições de existência: Submeter intencionalmente o grupo a condições de existência capazes de ocasionar destruição física total ou parcial integra o rol legal.","Art. 1º, alíneas d/e — Nascimentos e crianças: Adoção de medidas para impedir nascimentos no grupo e transferência forçada de crianças também são modalidades legalmente previstas."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º, caput — Finalidade especial","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 1º, alínea a — Matar membros do grupo","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 1º, alínea b — Lesão grave","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 1º, alínea c — Condições de existência","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 1º, alíneas d/e — Nascimentos e crianças","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Arts. 2º e 3º — Incitação e associação","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º, caput — Finalidade especial","plainExplanation":"Genocídio exige intenção de destruir, no todo ou em parte, grupo nacional, étnico, racial ou religioso, por uma das condutas previstas em lei.","practicalExample":"Uma violência individual não configura automaticamente genocídio sem o fim especial exigido."},{"article":"Art. 1º, alínea a — Matar membros do grupo","plainExplanation":"Matar integrantes do grupo com a finalidade específica de destruição é uma das condutas tipificadas.","practicalExample":"Identificar separadamente a conduta e o dolo especial."},{"article":"Art. 1º, alínea b — Lesão grave","plainExplanation":"Causar lesão grave à integridade física ou mental dos membros do grupo, com o fim de destruição, é uma das modalidades.","practicalExample":"A espécie de dano e a intenção especial são elementos relevantes."},{"article":"Art. 1º, alínea c — Condições de existência","plainExplanation":"Submeter intencionalmente o grupo a condições de existência capazes de ocasionar destruição física total ou parcial integra o rol legal.","practicalExample":"Não restringir o crime apenas à prática de homicídios."}],"mediumIncidence":[{"article":"Art. 1º, alíneas d/e — Nascimentos e crianças","plainExplanation":"Adoção de medidas para impedir nascimentos no grupo e transferência forçada de crianças também são modalidades legalmente previstas.","practicalExample":"O tipo penal alcança condutas além da violência física direta."},{"article":"Arts. 2º e 3º — Incitação e associação","plainExplanation":"A lei disciplina condutas relacionadas à incitação direta e pública e à associação para prática de genocídio, nas condições legais.","practicalExample":"Distinguir autoria do genocídio e tipos conexos, consultando a redação legal."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["A finalidade específica de destruição de grupo é indispensável.","A enumeração legal não equivale a qualquer grupo definido arbitrariamente."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 2.889/1956 — Crime de genocídio","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 2.889/1956 — Crime de genocídio deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"racismo":{"lawName":"Lei nº 7.716/1989 — Crimes de racismo","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l7716.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Define crimes resultantes de discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional e contém tipo específico de injúria racial após a Lei 14.532/2023. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º — Âmbito de proteção: A lei abrange discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional.","Art. 2º-A — Injúria racial: Injuriar alguém, ofendendo-lhe dignidade ou decoro em razão de raça, cor, etnia ou procedência nacional é crime tipificado nesta lei.","Art. 3º — Acesso a cargo público: Impedir ou obstar acesso de pessoa habilitada a cargo da Administração, nas condições previstas em lei, é conduta punida.","Art. 4º — Relações de trabalho: O texto tipifica condutas discriminatórias relacionadas a emprego e trabalho, conforme hipóteses específicas.","Art. 5º — Estabelecimento comercial: Recusar ou impedir acesso a estabelecimento comercial, negando-se a servir, atender ou receber cliente ou comprador, nas hipóteses legais, é crime."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º — Âmbito de proteção","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º-A — Injúria racial","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 3º — Acesso a cargo público","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 4º — Relações de trabalho","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 5º — Estabelecimento comercial","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 20 — Prática ou incitação","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º — Âmbito de proteção","plainExplanation":"A lei abrange discriminação ou preconceito de raça, cor, etnia, religião ou procedência nacional.","practicalExample":"O enquadramento depende da conduta tipificada e do motivo discriminatório."},{"article":"Art. 2º-A — Injúria racial","plainExplanation":"Injuriar alguém, ofendendo-lhe dignidade ou decoro em razão de raça, cor, etnia ou procedência nacional é crime tipificado nesta lei.","practicalExample":"Distinguir tipo de injúria racial de outras figuras legais e de mera crítica."},{"article":"Art. 3º — Acesso a cargo público","plainExplanation":"Impedir ou obstar acesso de pessoa habilitada a cargo da Administração, nas condições previstas em lei, é conduta punida.","practicalExample":"Concurso público não pode ter barreira discriminatória proibida."},{"article":"Art. 4º — Relações de trabalho","plainExplanation":"O texto tipifica condutas discriminatórias relacionadas a emprego e trabalho, conforme hipóteses específicas.","practicalExample":"A negativa de contratação discriminatória pode configurar crime legalmente descrito."}],"mediumIncidence":[{"article":"Art. 5º — Estabelecimento comercial","plainExplanation":"Recusar ou impedir acesso a estabelecimento comercial, negando-se a servir, atender ou receber cliente ou comprador, nas hipóteses legais, é crime.","practicalExample":"A recusa baseada nos elementos protegidos demanda a apuração prevista em lei."},{"article":"Art. 20 — Prática ou incitação","plainExplanation":"Praticar, induzir ou incitar discriminação ou preconceito nos termos da lei constitui tipo penal específico, com variantes e agravantes.","practicalExample":"Publicação discriminatória pode exigir exame do tipo e dos meios utilizados."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["A injúria racial foi inserida na Lei 7.716/1989 pela Lei 14.532/2023.","Não confundir o rol do art. 1º com qualquer motivo de discriminação fora do tipo penal."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 7.716/1989 — Crimes de racismo","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 7.716/1989 — Crimes de racismo deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"eca":{"lawName":"Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l8069.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Institui a proteção integral à criança e ao adolescente; disciplina direitos, medidas protetivas, ato infracional e garantias no atendimento. Possui alterações legislativas frequentes. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Arts. 1º e 2º — Proteção integral e faixas etárias: Criança é a pessoa até doze anos incompletos; adolescente é aquela entre doze e dezoito anos. Aplicações excepcionais podem alcançar dezoito a vinte e um anos nos casos expressos.","Art. 4º — Prioridade absoluta: Família, comunidade, sociedade e poder público têm dever de assegurar com absoluta prioridade os direitos da criança e do adolescente.","Art. 103 — Ato infracional: Considera-se ato infracional a conduta descrita como crime ou contravenção penal.","Art. 104 — Inimputabilidade penal: Menores de dezoito anos são penalmente inimputáveis e estão sujeitos às medidas previstas no Estatuto.","Art. 106 — Privação de liberdade: Nenhum adolescente será privado de sua liberdade senão em flagrante de ato infracional ou por ordem escrita e fundamentada da autoridade judiciária competente."]},"structuralXRay":{"highPriority":[{"title":"Arts. 1º e 2º — Proteção integral e faixas etárias","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 4º — Prioridade absoluta","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 103 — Ato infracional","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 104 — Inimputabilidade penal","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 106 — Privação de liberdade","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 112 — Medidas socioeducativas","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Arts. 1º e 2º — Proteção integral e faixas etárias","plainExplanation":"Criança é a pessoa até doze anos incompletos; adolescente é aquela entre doze e dezoito anos. Aplicações excepcionais podem alcançar dezoito a vinte e um anos nos casos expressos.","practicalExample":"A faixa etária é aferida conforme os dispositivos legais pertinentes."},{"article":"Art. 4º — Prioridade absoluta","plainExplanation":"Família, comunidade, sociedade e poder público têm dever de assegurar com absoluta prioridade os direitos da criança e do adolescente.","practicalExample":"Atendimento policial deve considerar a proteção integral e prioridade legal."},{"article":"Art. 103 — Ato infracional","plainExplanation":"Considera-se ato infracional a conduta descrita como crime ou contravenção penal.","practicalExample":"Ato infracional não significa automaticamente imposição de pena criminal de adulto."},{"article":"Art. 104 — Inimputabilidade penal","plainExplanation":"Menores de dezoito anos são penalmente inimputáveis e estão sujeitos às medidas previstas no Estatuto.","practicalExample":"Adolescente em conflito com a lei segue procedimento e garantias próprios."}],"mediumIncidence":[{"article":"Art. 106 — Privação de liberdade","plainExplanation":"Nenhum adolescente será privado de sua liberdade senão em flagrante de ato infracional ou por ordem escrita e fundamentada da autoridade judiciária competente.","practicalExample":"A apreensão deve observar hipótese legal e direitos do adolescente."},{"article":"Art. 112 — Medidas socioeducativas","plainExplanation":"Para ato infracional, a autoridade competente pode aplicar medidas como advertência, obrigação de reparar dano, prestação de serviços, liberdade assistida, semiliberdade e internação, conforme requisitos.","practicalExample":"Medida socioeducativa não se confunde com pena aplicada a adulto."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["A proteção integral não elimina garantias processuais do adolescente.","Distinguir criança, adolescente e faixa excepcional de aplicação do Estatuto."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 8.069/1990 — Estatuto da Criança e do Adolescente deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"improbidade":{"lawName":"Lei nº 8.429/1992 — Improbidade Administrativa (Lei nº 14.230/2021)","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l8429.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Disciplina atos de improbidade e respectivas sanções. A Lei 14.230/2021 alterou substancialmente a disciplina, inclusive ao exigir dolo para os tipos dos arts. 9º, 10 e 11. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º, §§ 1º a 3º — Dolo: Atos de improbidade são condutas dolosas tipificadas nos arts. 9º, 10 e 11; a mera voluntariedade do agente não substitui o dolo exigido.","Art. 9º — Enriquecimento ilícito: Tipifica atos de improbidade que importam enriquecimento ilícito mediante obtenção de vantagem patrimonial indevida, nos termos legais.","Art. 10 — Dano ao erário: Trata dos atos dolosos de improbidade que causam efetiva e comprovadamente perda patrimonial ao erário, no âmbito dos tipos previstos.","Art. 11 — Princípios da Administração: A lei tipifica hipóteses específicas de violação dolosa a princípios administrativos; não é cláusula irrestrita para toda ilegalidade.","Art. 12 — Sanções: As sanções variam conforme a espécie de ato, obedecendo aos parâmetros e critérios definidos em lei."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º, §§ 1º a 3º — Dolo","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 9º — Enriquecimento ilícito","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 10 — Dano ao erário","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 11 — Princípios da Administração","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 12 — Sanções","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Arts. 17 e 17-B — Ação e acordo","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º, §§ 1º a 3º — Dolo","plainExplanation":"Atos de improbidade são condutas dolosas tipificadas nos arts. 9º, 10 e 11; a mera voluntariedade do agente não substitui o dolo exigido.","practicalExample":"Erro administrativo sem dolo não deve ser automaticamente rotulado de improbidade."},{"article":"Art. 9º — Enriquecimento ilícito","plainExplanation":"Tipifica atos de improbidade que importam enriquecimento ilícito mediante obtenção de vantagem patrimonial indevida, nos termos legais.","practicalExample":"Recebimento de vantagem indevida deve ser enquadrado na hipótese específica."},{"article":"Art. 10 — Dano ao erário","plainExplanation":"Trata dos atos dolosos de improbidade que causam efetiva e comprovadamente perda patrimonial ao erário, no âmbito dos tipos previstos.","practicalExample":"Analisar dolo e dano efetivo conforme redação vigente."},{"article":"Art. 11 — Princípios da Administração","plainExplanation":"A lei tipifica hipóteses específicas de violação dolosa a princípios administrativos; não é cláusula irrestrita para toda ilegalidade.","practicalExample":"A indicação do tipo legal específico é essencial."}],"mediumIncidence":[{"article":"Art. 12 — Sanções","plainExplanation":"As sanções variam conforme a espécie de ato, obedecendo aos parâmetros e critérios definidos em lei.","practicalExample":"Não aplicar automaticamente a mesma sanção a qualquer classe de improbidade."},{"article":"Arts. 17 e 17-B — Ação e acordo","plainExplanation":"A disciplina processual e a possibilidade de acordo de não persecução civil possuem requisitos e procedimento legais.","practicalExample":"O procedimento exige observância do texto atualizado e da jurisprudência aplicável."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Improbidade não se presume de qualquer irregularidade: observar dolo e tipicidade.","Consultar efeitos temporais da Lei 14.230/2021 e entendimento vinculante do STF."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 8.429/1992 — Improbidade Administrativa (Lei nº 14.230/2021)","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 8.429/1992 — Improbidade Administrativa (Lei nº 14.230/2021) deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"temporaria":{"lawName":"Lei nº 7.960/1989 — Prisão Temporária","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/l7960.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Regula a prisão temporária na investigação criminal, com hipóteses legais taxativas, requisitos, prazos e controle judicial. Deve ser estudada conjuntamente com a jurisprudência constitucional aplicável. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º — Hipóteses legais: A prisão temporária tem hipóteses legais, como imprescindibilidade às investigações e situações tipificadas; a aplicação requer análise cumulativa conforme interpretação constitucional.","Art. 2º — Decretação judicial: É decretada pelo juiz, em face da representação da autoridade policial ou de requerimento do Ministério Público.","Art. 2º — Prazo ordinário: A lei prevê prazo de 5 dias, prorrogável por igual período em caso de extrema e comprovada necessidade, ressalvados regimes especiais.","Art. 2º, § 1º — Manifestação do MP: Na hipótese de representação da autoridade policial, o juiz ouvirá o Ministério Público antes da decisão.","Art. 2º, § 2º — Fundamentação: O despacho que decreta a prisão temporária deve ser fundamentado e prolatado dentro do prazo legal indicado."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º — Hipóteses legais","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Decretação judicial","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Prazo ordinário","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 2º, § 1º — Manifestação do MP","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 2º, § 2º — Fundamentação","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 2º, § 7º — Liberdade após o prazo","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º — Hipóteses legais","plainExplanation":"A prisão temporária tem hipóteses legais, como imprescindibilidade às investigações e situações tipificadas; a aplicação requer análise cumulativa conforme interpretação constitucional.","practicalExample":"Prisão temporária não pode ser usada como punição antecipada."},{"article":"Art. 2º — Decretação judicial","plainExplanation":"É decretada pelo juiz, em face da representação da autoridade policial ou de requerimento do Ministério Público.","practicalExample":"A autoridade policial representa; não decreta prisão temporária."},{"article":"Art. 2º — Prazo ordinário","plainExplanation":"A lei prevê prazo de 5 dias, prorrogável por igual período em caso de extrema e comprovada necessidade, ressalvados regimes especiais.","practicalExample":"Distinguir o prazo ordinário do prazo especial previsto na Lei de Crimes Hediondos."},{"article":"Art. 2º, § 1º — Manifestação do MP","plainExplanation":"Na hipótese de representação da autoridade policial, o juiz ouvirá o Ministério Público antes da decisão.","practicalExample":"A manifestação do Ministério Público integra o procedimento legal."}],"mediumIncidence":[{"article":"Art. 2º, § 2º — Fundamentação","plainExplanation":"O despacho que decreta a prisão temporária deve ser fundamentado e prolatado dentro do prazo legal indicado.","practicalExample":"Decisão judicial sem motivação adequada é incompatível com as garantias processuais."},{"article":"Art. 2º, § 7º — Liberdade após o prazo","plainExplanation":"Decorrido o prazo do mandado, o preso deverá ser libertado sem nova ordem judicial, salvo se comunicada prorrogação da prisão temporária ou decretação de prisão preventiva.","practicalExample":"A manutenção automática da custódia após o prazo não é válida."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["A prisão temporária não é medida automática por gravidade abstrata.","Há prazo especial para crimes hediondos e equiparados previsto em lei específica."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 7.960/1989 — Prisão Temporária","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 7.960/1989 — Prisão Temporária deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"jef":{"lawName":"Lei nº 10.259/2001 — Juizados Especiais Federais","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10259.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Institui Juizados Especiais Cíveis e Criminais no âmbito federal e determina aplicação subsidiária da Lei 9.099/1995 quando compatível. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º — Instituição e subsidiariedade: São instituídos os Juizados Especiais Cíveis e Criminais da Justiça Federal; aplica-se a Lei 9.099/1995 no que não conflitar.","Art. 2º — Competência criminal: O Juizado Especial Federal Criminal processa e julga infrações de menor potencial ofensivo de competência da Justiça Federal, observadas conexão e continência.","Art. 3º — Competência cível: O JEF Cível processa, concilia e julga causas federais até sessenta salários mínimos e executa suas sentenças, ressalvadas exclusões legais.","Art. 3º, § 1º — Exclusões: A lei exclui determinadas matérias da competência do JEF Cível, como mandado de segurança, desapropriação, ações populares e execuções fiscais.","Art. 6º — Legitimados: O dispositivo lista quem pode ser parte no JEF Cível, observados limites específicos."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º — Instituição e subsidiariedade","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Competência criminal","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 3º — Competência cível","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 3º, § 1º — Exclusões","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 6º — Legitimados","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 10 — Representação","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º — Instituição e subsidiariedade","plainExplanation":"São instituídos os Juizados Especiais Cíveis e Criminais da Justiça Federal; aplica-se a Lei 9.099/1995 no que não conflitar.","practicalExample":"Questão pode cobrar a aplicação subsidiária de regras dos juizados estaduais."},{"article":"Art. 2º — Competência criminal","plainExplanation":"O Juizado Especial Federal Criminal processa e julga infrações de menor potencial ofensivo de competência da Justiça Federal, observadas conexão e continência.","practicalExample":"Competência federal é pressuposto; não basta a pena do delito."},{"article":"Art. 3º — Competência cível","plainExplanation":"O JEF Cível processa, concilia e julga causas federais até sessenta salários mínimos e executa suas sentenças, ressalvadas exclusões legais.","practicalExample":"Nem toda causa até sessenta salários mínimos pode ser proposta no JEF."},{"article":"Art. 3º, § 1º — Exclusões","plainExplanation":"A lei exclui determinadas matérias da competência do JEF Cível, como mandado de segurança, desapropriação, ações populares e execuções fiscais.","practicalExample":"Aferir matéria e não apenas valor econômico."}],"mediumIncidence":[{"article":"Art. 6º — Legitimados","plainExplanation":"O dispositivo lista quem pode ser parte no JEF Cível, observados limites específicos.","practicalExample":"Verificar legitimidade legal da pessoa jurídica no polo adequado."},{"article":"Art. 10 — Representação","plainExplanation":"As partes podem designar representantes para causa, nos termos legais.","practicalExample":"Representação processual tem regime próprio da justiça federal especial."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Não confundir limites e exclusões do JEF Cível com a competência criminal.","Lei 9.099/1995 aplica-se subsidiariamente quando compatível."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 10.259/2001 — Juizados Especiais Federais","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 10.259/2001 — Juizados Especiais Federais deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"r200":{"lawName":"Decreto nº 88.777/1983 — Regulamento R-200","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/decreto/d88777compilado.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Aprova o regulamento para as polícias militares e corpos de bombeiros militares. Ler em conjunto com a Constituição e a Lei 14.751/2023; identificar dispositivos superados ou parcialmente revogados. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º do Decreto — Aprovação: O decreto aprova o Regulamento para as Polícias Militares e Corpos de Bombeiros Militares (R-200).","R-200 — Conceitos e organização: O regulamento contém definições institucionais e regras de estrutura das corporações militares estaduais e distritais.","R-200 — Coordenação e controle: O R-200 trata da coordenação e do controle em relações institucionais sob o regime normativo de sua edição.","R-200 — Organização e efetivos: O regulamento trata de aspectos organizacionais e efetivos, segundo remissões à legislação aplicável.","R-200 — Emprego operacional: Há regras sobre emprego e missões, sujeitas às competências constitucionais e às normas atuais."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º do Decreto — Aprovação","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"R-200 — Conceitos e organização","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"R-200 — Coordenação e controle","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"R-200 — Organização e efetivos","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"R-200 — Emprego operacional","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"R-200 — Hierarquia normativa","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º do Decreto — Aprovação","plainExplanation":"O decreto aprova o Regulamento para as Polícias Militares e Corpos de Bombeiros Militares (R-200).","practicalExample":"Diferenciar o texto do decreto das disposições integrantes do regulamento anexo."},{"article":"R-200 — Conceitos e organização","plainExplanation":"O regulamento contém definições institucionais e regras de estrutura das corporações militares estaduais e distritais.","practicalExample":"Comparar conceitos regulamentares com a Constituição Federal de 1988."},{"article":"R-200 — Coordenação e controle","plainExplanation":"O R-200 trata da coordenação e do controle em relações institucionais sob o regime normativo de sua edição.","practicalExample":"Avaliar recepção constitucional e alterações posteriores."},{"article":"R-200 — Organização e efetivos","plainExplanation":"O regulamento trata de aspectos organizacionais e efetivos, segundo remissões à legislação aplicável.","practicalExample":"Questões históricas devem ser conferidas com a redação consolidada."}],"mediumIncidence":[{"article":"R-200 — Emprego operacional","plainExplanation":"Há regras sobre emprego e missões, sujeitas às competências constitucionais e às normas atuais.","practicalExample":"A atuação ostensiva da PM deve respeitar o art. 144 da CF."},{"article":"R-200 — Hierarquia normativa","plainExplanation":"Decreto regulamentar não pode contrariar a Constituição ou lei posterior.","practicalExample":"Diante de conflito, identificar prevalência da norma superior e validade temporal."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["R-200 foi editado antes da Constituição de 1988.","Conferir coexistência com Lei 14.751/2023 e outros atos posteriores."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Decreto nº 88.777/1983 — Regulamento R-200","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Decreto nº 88.777/1983 — Regulamento R-200 deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"d10443":{"lawName":"Decreto nº 10.443/2020 — Organização básica da PMDF","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/decreto/d10443.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Dispõe sobre a organização básica da Polícia Militar do Distrito Federal e seus órgãos, competências e estrutura, à luz da Lei 6.450/1977 e das alterações normativas pertinentes. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º — Objeto: Estabelece normas de organização básica da Polícia Militar do Distrito Federal.","Art. 2º — Competência da PMDF: A PMDF, instituição permanente baseada em hierarquia e disciplina e subordinada ao Governador do DF, exerce polícia ostensiva e preservação da ordem pública.","Art. 2º, parágrafo único — Atribuições: Explicita atribuições da PMDF, inclusive planejamento e execução da polícia ostensiva e preservação da ordem, nos termos da norma.","Decreto — Órgãos de direção: O diploma organiza os órgãos de direção superior, geral e setorial segundo a redação normativa.","Decreto — Órgãos de apoio: As estruturas de apoio exercem funções instrumentais e logísticas previstas."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º — Objeto","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Competência da PMDF","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º, parágrafo único — Atribuições","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Decreto — Órgãos de direção","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Decreto — Órgãos de apoio","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Decreto — Órgãos de execução","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º — Objeto","plainExplanation":"Estabelece normas de organização básica da Polícia Militar do Distrito Federal.","practicalExample":"Diferenciar disciplina organizacional de tipificação penal."},{"article":"Art. 2º — Competência da PMDF","plainExplanation":"A PMDF, instituição permanente baseada em hierarquia e disciplina e subordinada ao Governador do DF, exerce polícia ostensiva e preservação da ordem pública.","practicalExample":"Operação policial deve ter conexão com as competências legais."},{"article":"Art. 2º, parágrafo único — Atribuições","plainExplanation":"Explicita atribuições da PMDF, inclusive planejamento e execução da polícia ostensiva e preservação da ordem, nos termos da norma.","practicalExample":"Cobrança frequente pode inverter verbo de missão ou excluir atribuição."},{"article":"Decreto — Órgãos de direção","plainExplanation":"O diploma organiza os órgãos de direção superior, geral e setorial segundo a redação normativa.","practicalExample":"Conferir nomes e subordinação no texto vigente."}],"mediumIncidence":[{"article":"Decreto — Órgãos de apoio","plainExplanation":"As estruturas de apoio exercem funções instrumentais e logísticas previstas.","practicalExample":"Distinguir atividade de apoio e atividade operacional."},{"article":"Decreto — Órgãos de execução","plainExplanation":"Dispõe sobre órgãos responsáveis pelo cumprimento de missões institucionais.","practicalExample":"Identificar vínculo hierárquico e atribuição de cada unidade."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Conferir a organização da PMDF nas alterações e atos vigentes.","Não atribuir ao decreto competência que pertença a lei ou Constituição."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Decreto nº 10.443/2020 — Organização básica da PMDF","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Decreto nº 10.443/2020 — Organização básica da PMDF deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]},"l14751":{"lawName":"Lei nº 14.751/2023 — Lei Orgânica Nacional PM/CBM","targetRole":"CFP / Soldado PMDF (Curso de Formação de Praças)","examBoard":"Cebraspe","officialSource":"https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14751.htm","contentScope":"síntese pedagógica; não é texto integral da norma","executiveSummary":{"centralObjective":"Institui normas gerais nacionais para polícias militares e corpos de bombeiros militares, princípios, diretrizes, organização e regime institucional, alterando a Lei 13.675/2018 e revogando dispositivos do DL 667/1969. Guia temático resumido, sujeito a alteração normativa: sempre cotejar os dispositivos com a fonte oficial.","keyConcepts":["Art. 1º — Instituição: Institui a Lei Orgânica Nacional das Polícias Militares e dos Corpos de Bombeiros Militares dos Estados, do Distrito Federal e dos Territórios.","Art. 2º — Natureza institucional: As corporações são instituições militares permanentes, exclusivas e típicas de Estado, forças auxiliares e reserva do Exército, organizadas com base em hierarquia e disciplina.","Art. 2º, § 1º — Atribuições das PMs: Às polícias militares cabe proteção de direitos fundamentais no âmbito da polícia ostensiva, preservação da ordem pública e polícia judiciária militar nos limites legais.","Art. 3º — Princípios: Elenca princípios como hierarquia, disciplina, proteção dos direitos humanos, legalidade, impessoalidade, publicidade, moralidade, eficiência e proporcionalidade.","Art. 4º — Diretrizes: Estabelece diretrizes de atuação institucional; estudar enunciados à luz da redação atualizada."]},"structuralXRay":{"highPriority":[{"title":"Art. 1º — Instituição","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º — Natureza institucional","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."},{"title":"Art. 2º, § 1º — Atribuições das PMs","reason":"Dispositivo para leitura prioritária e comparação com o texto legal oficial."}],"secondaryPriority":[{"title":"Art. 3º — Princípios","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Art. 4º — Diretrizes","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."},{"title":"Lei — Organização, direitos e deveres","reason":"Aprofundar hipóteses, condições, exceções e remissões legais."}],"deadZones":[]},"articlesMapping":{"highIncidence":[{"article":"Art. 1º — Instituição","plainExplanation":"Institui a Lei Orgânica Nacional das Polícias Militares e dos Corpos de Bombeiros Militares dos Estados, do Distrito Federal e dos Territórios.","practicalExample":"A lei tem alcance nacional, sem eliminar a necessidade de legislação específica compatível."},{"article":"Art. 2º — Natureza institucional","plainExplanation":"As corporações são instituições militares permanentes, exclusivas e típicas de Estado, forças auxiliares e reserva do Exército, organizadas com base em hierarquia e disciplina.","practicalExample":"O comando possui critérios definidos na própria lei."},{"article":"Art. 2º, § 1º — Atribuições das PMs","plainExplanation":"Às polícias militares cabe proteção de direitos fundamentais no âmbito da polícia ostensiva, preservação da ordem pública e polícia judiciária militar nos limites legais.","practicalExample":"Distinguir polícia judiciária militar da investigação policial comum."},{"article":"Art. 3º — Princípios","plainExplanation":"Elenca princípios como hierarquia, disciplina, proteção dos direitos humanos, legalidade, impessoalidade, publicidade, moralidade, eficiência e proporcionalidade.","practicalExample":"A organização militar convive com princípios administrativos e direitos humanos."}],"mediumIncidence":[{"article":"Art. 4º — Diretrizes","plainExplanation":"Estabelece diretrizes de atuação institucional; estudar enunciados à luz da redação atualizada.","practicalExample":"Banca pode exigir distinção entre princípio e diretriz."},{"article":"Lei — Organização, direitos e deveres","plainExplanation":"A lei apresenta regras gerais sobre organização, carreira, direitos, deveres, vedações e prerrogativas, conforme dispositivos próprios.","practicalExample":"Aprofundar com a regulamentação específica do DF e os dispositivos vigentes."}],"lowIncidence":[]},"trapsAndJurisprudence":{"examTraps":["Não confundir lei orgânica nacional com a lei orgânica específica da PMDF.","Conferir revogações parciais do DL 667/1969 e compatibilidade de normas anteriores."],"jurisprudence":["Não há validação automática de jurisprudência em guia estático. Consulte decisões oficiais atuais do STF/STJ e versões compiladas das normas."]},"essayRepertoire":[{"legalDevice":"Lei nº 14.751/2023 — Lei Orgânica Nacional PM/CBM","themes":"Constitucionalidade, legalidade, responsabilidade estatal e atividade policial","modelSentence":"O regime jurídico previsto em Lei nº 14.751/2023 — Lei Orgânica Nacional PM/CBM deve orientar a atuação estatal com observância da legalidade e das garantias fundamentais."}]}});
        // Anotações sobre as novas leis são sínteses didáticas: confira texto consolidado vigente.


        // Leis adicionais: guias de estudo local (não substituem texto consolidado).
        Object.assign(EXTRA_LAW_URLS, {"lai": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm", "interceptacao": "https://www.planalto.gov.br/ccivil_03/leis/l9296.htm"});
        Object.assign(BUILTIN_PMDF_GUIDES, {"lai": {"lawName": "Lei Federal nº 12.527/2011 — Lei de Acesso à Informação (LAI)", "targetRole": "CFP / Soldado PMDF (Curso de Formação de Praças)", "examBoard": "Cebraspe", "officialSource": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm", "contentScope": "síntese pedagógica — cotejar com o texto consolidado oficial", "executiveSummary": {"centralObjective": "Disciplina o acesso a informações públicas e as obrigações de transparência da Administração Pública, assegurando a publicidade como regra e o sigilo como exceção, com proteção de informações pessoais e legalmente sigilosas.", "keyConcepts": ["Art. 1º — Abrangência: A LAI estabelece procedimentos para União, Estados, Distrito Federal e Municípios e alcança entidades públicas previstas na norma.", "Art. 3º — Diretrizes: A publicidade é preceito geral e o sigilo é exceção; deve-se divulgar informação de interesse público independentemente de pedido.", "Art. 8º — Transparência ativa: Os órgãos e entidades públicas devem divulgar informações de interesse coletivo ou geral, independentemente de requerimento.", "Arts. 10 e 11 — Pedido e prazo: Qualquer interessado pode requerer informação sem justificar os motivos. Informação disponível deve ser fornecida imediatamente; se não for possível, aplica-se prazo legal de até 20 dias, prorrogável nos termos da lei.", "Art. 24 — Graus de sigilo: Os graus e prazos máximos previstos são ultrassecreto (25 anos), secreto (15 anos) e reservado (5 anos), contados da produção da informação, observadas regras específicas.", "Art. 31 — Informação pessoal: A lei protege intimidade, vida privada, honra e imagem; hipóteses de restrição ao acesso a dados pessoais não equivalem automaticamente à classificação de sigilo do art. 24.", "Art. 32 — Responsabilização: Recusa indevida, demora deliberada, ocultação ou divulgação indevida de informação podem configurar condutas ilícitas previstas na LAI."]}, "structuralXRay": {"highPriority": [{"title": "Art. 1º — Abrangência", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Art. 3º — Diretrizes", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Art. 8º — Transparência ativa", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Arts. 10 e 11 — Pedido e prazo", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}], "secondaryPriority": [{"title": "Art. 24 — Graus de sigilo", "reason": "Aprofundar condições, exceções e redação vigente."}, {"title": "Art. 31 — Informação pessoal", "reason": "Aprofundar condições, exceções e redação vigente."}, {"title": "Art. 32 — Responsabilização", "reason": "Aprofundar condições, exceções e redação vigente."}], "deadZones": []}, "articlesMapping": {"highIncidence": [{"article": "Art. 1º — Abrangência", "plainExplanation": "A LAI estabelece procedimentos para União, Estados, Distrito Federal e Municípios e alcança entidades públicas previstas na norma.", "practicalExample": "Órgãos públicos do DF devem organizar o atendimento aos pedidos de informações nos termos da lei."}, {"article": "Art. 3º — Diretrizes", "plainExplanation": "A publicidade é preceito geral e o sigilo é exceção; deve-se divulgar informação de interesse público independentemente de pedido.", "practicalExample": "Informações de interesse coletivo devem estar acessíveis ao cidadão."}, {"article": "Art. 8º — Transparência ativa", "plainExplanation": "Os órgãos e entidades públicas devem divulgar informações de interesse coletivo ou geral, independentemente de requerimento.", "practicalExample": "Publicar dados institucionais e despesas em meios oficiais."}, {"article": "Arts. 10 e 11 — Pedido e prazo", "plainExplanation": "Qualquer interessado pode requerer informação sem justificar os motivos. Informação disponível deve ser fornecida imediatamente; se não for possível, aplica-se prazo legal de até 20 dias, prorrogável nos termos da lei.", "practicalExample": "Distinguir fornecimento imediato de resposta sujeita ao prazo legal."}], "mediumIncidence": [{"article": "Art. 24 — Graus de sigilo", "plainExplanation": "Os graus e prazos máximos previstos são ultrassecreto (25 anos), secreto (15 anos) e reservado (5 anos), contados da produção da informação, observadas regras específicas.", "practicalExample": "Conferir os três graus sem confundir sigilo de informações pessoais."}, {"article": "Art. 31 — Informação pessoal", "plainExplanation": "A lei protege intimidade, vida privada, honra e imagem; hipóteses de restrição ao acesso a dados pessoais não equivalem automaticamente à classificação de sigilo do art. 24.", "practicalExample": "Avaliar o fornecimento de dados pessoais sem expor informações protegidas."}, {"article": "Art. 32 — Responsabilização", "plainExplanation": "Recusa indevida, demora deliberada, ocultação ou divulgação indevida de informação podem configurar condutas ilícitas previstas na LAI.", "practicalExample": "O agente deve respeitar os procedimentos e justificar eventual negativa."}], "lowIncidence": []}, "trapsAndJurisprudence": {"examTraps": ["Publicidade é a regra; sigilo exige base legal e motivação.", "Não se exige que o requerente informe os motivos do pedido de acesso.", "Não confundir os prazos de classificação da informação com a proteção dos dados pessoais."], "jurisprudence": ["Os precedentes devem ser consultados nas fontes oficiais do STF/STJ; o guia local não atualiza jurisprudência automaticamente."]}, "essayRepertoire": [{"legalDevice": "Lei Federal nº 12.527/2011 — Lei de Acesso à Informação (LAI)", "themes": "transparência, garantias fundamentais, legalidade e atividade policial", "modelSentence": "A observância de Lei Federal nº 12.527/2011 — Lei de Acesso à Informação (LAI) evidencia a necessidade de atuação estatal fundamentada e compatível com as garantias constitucionais."}]}, "interceptacao": {"lawName": "Lei nº 9.296/1996 — Interceptação de Comunicações", "targetRole": "CFP / Soldado PMDF (Curso de Formação de Praças)", "examBoard": "Cebraspe", "officialSource": "https://www.planalto.gov.br/ccivil_03/leis/l9296.htm", "contentScope": "síntese pedagógica — cotejar com o texto consolidado oficial", "executiveSummary": {"centralObjective": "Regulamenta a interceptação de comunicações para investigação criminal e instrução processual penal, condicionando-a a decisão judicial e a requisitos estritos, com regras de execução, sigilo e crimes relacionados.", "keyConcepts": ["Art. 1º — Autorização judicial: A interceptação de comunicações telefônicas para prova em investigação criminal e instrução processual penal depende de ordem do juiz competente e ocorre sob segredo de justiça.", "Art. 2º — Hipóteses impeditivas: Não se admite interceptação sem indícios razoáveis de autoria ou participação, quando a prova puder ser feita por outros meios disponíveis ou se o fato for punido, no máximo, com detenção.", "Art. 3º — Legitimidade: O juiz pode determinar a interceptação nas hipóteses legais; a autoridade policial pode requerer na investigação criminal e o Ministério Público na investigação ou instrução processual penal.", "Arts. 4º e 5º — Pedido e duração: O pedido deve demonstrar necessidade e meios empregados. O juiz decide no prazo máximo de 24 horas; a execução não poderá exceder 15 dias, renovável por igual tempo se indispensável.", "Art. 6º — Execução: Deferida a medida, a autoridade policial conduz os procedimentos e dá ciência ao Ministério Público, que pode acompanhar a execução.", "Art. 8º-A — Captação ambiental: A lei prevê hipótese própria de captação ambiental, condicionada a autorização judicial e aos requisitos estabelecidos neste artigo, incluído posteriormente.", "Arts. 10 e 10-A — Tipos penais: A lei tipifica hipóteses de interceptação ou captação ilícitas e violação indevida de segredo de justiça, conforme redações atualizadas."]}, "structuralXRay": {"highPriority": [{"title": "Art. 1º — Autorização judicial", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Art. 2º — Hipóteses impeditivas", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Art. 3º — Legitimidade", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}, {"title": "Arts. 4º e 5º — Pedido e duração", "reason": "Regra, requisito ou hipótese essencial para o estudo da norma."}], "secondaryPriority": [{"title": "Art. 6º — Execução", "reason": "Aprofundar condições, exceções e redação vigente."}, {"title": "Art. 8º-A — Captação ambiental", "reason": "Aprofundar condições, exceções e redação vigente."}, {"title": "Arts. 10 e 10-A — Tipos penais", "reason": "Aprofundar condições, exceções e redação vigente."}], "deadZones": []}, "articlesMapping": {"highIncidence": [{"article": "Art. 1º — Autorização judicial", "plainExplanation": "A interceptação de comunicações telefônicas para prova em investigação criminal e instrução processual penal depende de ordem do juiz competente e ocorre sob segredo de justiça.", "practicalExample": "A atuação investigativa deve observar autorização judicial e finalidade legal."}, {"article": "Art. 2º — Hipóteses impeditivas", "plainExplanation": "Não se admite interceptação sem indícios razoáveis de autoria ou participação, quando a prova puder ser feita por outros meios disponíveis ou se o fato for punido, no máximo, com detenção.", "practicalExample": "Diferenciar requisitos de admissibilidade e meios probatórios alternativos."}, {"article": "Art. 3º — Legitimidade", "plainExplanation": "O juiz pode determinar a interceptação nas hipóteses legais; a autoridade policial pode requerer na investigação criminal e o Ministério Público na investigação ou instrução processual penal.", "practicalExample": "Identificar quem pode requerer a interceptação em cada fase."}, {"article": "Arts. 4º e 5º — Pedido e duração", "plainExplanation": "O pedido deve demonstrar necessidade e meios empregados. O juiz decide no prazo máximo de 24 horas; a execução não poderá exceder 15 dias, renovável por igual tempo se indispensável.", "practicalExample": "Atenção à distinção entre prazo para decisão e prazo da diligência."}], "mediumIncidence": [{"article": "Art. 6º — Execução", "plainExplanation": "Deferida a medida, a autoridade policial conduz os procedimentos e dá ciência ao Ministério Público, que pode acompanhar a execução.", "practicalExample": "O resultado deve ser encaminhado ao juiz com registro das operações."}, {"article": "Art. 8º-A — Captação ambiental", "plainExplanation": "A lei prevê hipótese própria de captação ambiental, condicionada a autorização judicial e aos requisitos estabelecidos neste artigo, incluído posteriormente.", "practicalExample": "Não confundir a disciplina da interceptação telefônica com captação ambiental."}, {"article": "Arts. 10 e 10-A — Tipos penais", "plainExplanation": "A lei tipifica hipóteses de interceptação ou captação ilícitas e violação indevida de segredo de justiça, conforme redações atualizadas.", "practicalExample": "Analisar os requisitos específicos de cada tipo penal e a redação vigente."}], "lowIncidence": []}, "trapsAndJurisprudence": {"examTraps": ["Ordem judicial é requisito da interceptação disciplinada no art. 1º.", "Não confundir o prazo judicial para decidir o pedido (24 horas) com a duração inicial da diligência (15 dias).", "A captação ambiental do art. 8º-A possui hipóteses e requisitos específicos."], "jurisprudence": ["Os precedentes devem ser consultados nas fontes oficiais do STF/STJ; o guia local não atualiza jurisprudência automaticamente."]}, "essayRepertoire": [{"legalDevice": "Lei nº 9.296/1996 — Interceptação de Comunicações", "themes": "transparência, garantias fundamentais, legalidade e atividade policial", "modelSentence": "A observância de Lei nº 9.296/1996 — Interceptação de Comunicações evidencia a necessidade de atuação estatal fundamentada e compatível com as garantias constitucionais."}]}});
        MATCH.push(['lai',/l12527|12\.?527|lei de acesso [àa] informa[cç][aã]o|\bLAI\b/i],['interceptacao',/l9296|9\.?296|intercepta[cç][aã]o(?: telef[oô]nica| de comunica[cç][oõ]es)?/i]);
        PANEL_LAWS.push(['lai','Lei de Acesso à Informação (12.527/11)'],['interceptacao','Interceptação de Comunicações (9.296/96)']);

        const STUDY_SESSION_KEY='pmdf:session:v4';
        let APP_STARTED=false,SESSION_RESTORING=false;
        const safeSession=s=>s&&typeof s==='object'&&!Array.isArray(s)&&s.version===4?s:null;
        function readStudySession(){try{return safeSession(JSON.parse(store.get(STUDY_SESSION_KEY)||'null'));}catch(e){return null;}}
        function saveStudySession(){
            if(!APP_STARTED||SESSION_RESTORING||!AUTH_USER)return;
            const s={version:4,updated:new Date().toISOString(),tab:TAB,lawKey:CUR.key||null,
              question:Q_STATE?{...Q_STATE,items:Q_STATE.items}:null,
              anki:ANKI_STATE?{...ANKI_STATE,cards:ANKI_STATE.cards}:null};
            const ok=store.set(STUDY_SESSION_KEY,JSON.stringify(s));
            if(!ok&&!window._studySaveWarning){window._studySaveWarning=true;toast('Armazenamento cheio. Exporte um backup do seu progresso.','error');}
        }
        function refreshWelcome(){const s=readStudySession(),btn=$('welcome-continue'),p=$('welcome-progress');
            btn?.classList.toggle('hidden',!s);if(p)p.textContent=s?('Último acesso: '+new Date(s.updated).toLocaleString('pt-BR')+' · '+({leis:'Leis',questoes:'Questões',anki:'Flashcards',redacao:'Redação',resultados:'Resultados'}[s.tab]||'Estudos')):'Inicie seus estudos gratuitamente; o progresso será salvo automaticamente.';
        }
        function beginStudies(continuePrevious){
            if(!AUTH_USER)return toast('Entre na sua conta para continuar.','error');
            const s=continuePrevious?readStudySession():null;
            SESSION_RESTORING=true;document.body.classList.remove('landing-active');APP_STARTED=true;
            if(s){
                if(s.lawKey&&s.lawKey!==CUR.key){if(BUILTIN_PMDF_GUIDES[s.lawKey])selectAndLoadLaw(s.lawKey);else if(s.lawKey.startsWith('custom-')){const g=jget('custom:'+s.lawKey,null);if(g?.lawName){CUR={key:s.lawKey,guide:g,_poolCache:Object.create(null)};renderGuide(g);}}}
                Q_STATE=s.question?.items?.length?s.question:null;
                if(Q_STATE?.answered){Q_STATE.index=Math.min(Q_STATE.items.length,Q_STATE.index+1);Q_STATE.answered=false;}
                ANKI_STATE=s.anki?.cards?.length?s.anki:null;
                if(Q_STATE){$('q-panel').classList.remove('hidden');Q_STATE.questionStart=Date.now();if(Q_STATE.engine==='neural')setQuestionEngine('neural');if(Q_STATE.items.some(q=>q.origin==='official-import')){$('q-source').value='imported';$('q-format').value=Q_STATE.items[0]?.type==='CE'?'CE':'MC';}drawQuestions();}
                if(ANKI_STATE){$('anki-panel').classList.remove('hidden');drawAnki();}
                restoreEssayLastResult();showTab(['leis','questoes','anki','redacao','resultados'].includes(s.tab)?s.tab:'leis');
            }else{Q_STATE=null;ANKI_STATE=null;$('q-panel')?.classList.add('hidden');$('anki-panel')?.classList.add('hidden');showTab('leis');}
            SESSION_RESTORING=false;saveStudySession();showQuestionTotals();window.scrollTo(0,0);
        }
        function backToHome(){saveStudySession();APP_STARTED=false;document.body.classList.add('landing-active');refreshWelcome();window.scrollTo(0,0);}
        function clearResearchFilters(){
            $('research-board').value='Cebraspe';$('research-topic').value='';$('research-year').value='2024';$('research-results').replaceChildren();$('research-status').textContent='Filtros de pesquisa limpos.';
        }
        const EXAM_DOMAINS={Cebraspe:'cebraspe.org.br',FGV:'conhecimento.fgv.br',FCC:'fcc.org.br',Vunesp:'vunesp.com.br',Iades:'iades.com.br',Idecan:'idecan.org.br',AOCP:'institutoaocp.org.br',Cesgranrio:'cesgranrio.org.br',Quadrix:'quadrix.org.br'};
        const IMPORTED_QUESTIONS=[];
        function updateImportedStatus(msg){const p=$('research-status');if(p)p.textContent=msg;}
        function refreshImportedExamSources(){
            const select=$('exam-answer-source');if(!select)return;
            const prior=select.value;
            const names=[...new Set(IMPORTED_QUESTIONS.map(q=>String(q.law||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
            select.replaceChildren();
            const placeholder=document.createElement('option');placeholder.value='';
            placeholder.textContent=names.length?'Selecione a prova à qual pertence o gabarito':'Importe uma prova primeiro';
            select.appendChild(placeholder);
            for(const name of names){
                const option=document.createElement('option');option.value=name;option.textContent=name;
                select.appendChild(option);
            }
            select.value=names.includes(prior)?prior:names.length===1?names[0]:'';
        }
        function buildExamSearchLinks(board,topic,year){
            const sites=board==='todas'?Object.entries(EXAM_DOMAINS):[[board,EXAM_DOMAINS[board]||'cebraspe.org.br']];
            return [...sites.map(([name,domain])=>({title:'Provas oficiais — '+name,link:'https://www.google.com/search?q='+encodeURIComponent('site:'+domain+' prova gabarito pdf '+topic+' '+year),source:'Pesquisa em domínio oficial'})),
              {title:'PCI Concursos — provas públicas',link:'https://www.google.com/search?q='+encodeURIComponent('site:pciconcursos.com.br/provas/ '+board+' '+topic+' '+year),source:'Repositório de provas'},
              {title:'Qconcursos — consulta no site',link:'https://www.google.com/search?q='+encodeURIComponent('site:qconcursos.com '+board+' '+topic+' '+year),source:'Consulta externa (não copia questões)'},
              {title:'TEC Concursos — consulta no site',link:'https://www.google.com/search?q='+encodeURIComponent('site:tecconcursos.com.br '+board+' '+topic+' '+year),source:'Consulta externa (não copia questões)'}];
        }
        function renderExamLinks(items){const box=$('research-results');box.replaceChildren();for(const item of items.slice(0,30)){
            try{const uri=new URL(item.link);if(!['https:'].includes(uri.protocol))continue;
                const d=document.createElement('div');d.className='g-card';
                const a=document.createElement('a');a.href=uri.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(item.title||'Prova pública').slice(0,170);
                const label=document.createElement('p');label.className='text-xs text-slate-400';label.textContent=item.source||uri.hostname;d.append(a,label);
                if(uri.pathname.toLowerCase().endsWith('.pdf'))a.textContent='Abrir PDF (baixar e importar): '+a.textContent;
                box.appendChild(d);
            }catch(e){} }
            if(!box.childElementCount)box.textContent='Nenhum link público disponível nesta consulta.';
        }
        let SEARCH_BUSY=false,LAST_SEARCH_KEY='',LAST_SEARCH_AT=0;
        async function searchOfficialExams(){
            const board=$('research-board').value,topic=($('research-topic').value.trim()||CUR.guide?.lawName||'legislação policial').slice(0,100);
            const year=Number($('research-year').value);
            if(!Number.isInteger(year)||year<2000||year>new Date().getFullYear()+1)return toast('Informe um ano inicial válido.','error');
            const btn=$('research-btn');btn.disabled=true;
            try{
                renderExamLinks(buildExamSearchLinks(board,topic,year));
                updateImportedStatus('Links de pesquisa exibidos. Abra a fonte, baixe o PDF/TXT e importe o arquivo pelo formulário. O GitHub Pages não dispõe de API de busca própria.');
            }finally{btn.disabled=false;}
        }
        function parseOfficialExam(text,source){
            const clean=String(text||'').replace(/\r/g,'').slice(0,600000);
            const pattern=/(?:^|\n)\s*(?:(?:QUESTÃO|QUESTAO|ITEM)\s*)?(\d{1,4})\s*[.)\-–:]\s*(?=[A-ZÀ-Úa-zà-ú])/gim;
            let matches=[...clean.matchAll(pattern)];if(!matches.length){const fallback=/(?:^|\n)\s*(?:QUESTÃO|QUESTAO|ITEM)\s*(\d{1,4})(?:\s+|$)/gim;matches=[...clean.matchAll(fallback)];}const items=[];
            for(let i=0;i<matches.length&&items.length<500;i++){
                const m=matches[i],next=matches[i+1]?.index??clean.length;
                let block=clean.slice(m.index+m[0].length,next).trim();if(block.length<30||block.length>4500)continue;
                let options=null,answer=null,type='CE';
                const opts=[...block.matchAll(/(?:^|\n)\s*([A-E])[)\.\-]\s+([^\n]+)/g)];
                if(opts.length>=4){type='MC';options=opts.slice(0,5).map(x=>x[2].trim());block=block.slice(0,opts[0].index).trim();}
                const number=Number(m[1]);
                if(block.length<15)continue;
                items.push({type,statement:block.slice(0,1300),options,answer,law:source,topic:'Prova pública · Questão '+number,sourceNumber:number,explanation:'Gabarito oficial ainda não importado. Não há correção automática verificada.',lawBasis:source,origin:'official-import'});
            }
            return uniqueQuestions(items);
        }
        function addOfficialQuestions(items){const seen=new Set(IMPORTED_QUESTIONS.map(q=>q.law+'|'+q.sourceNumber));let added=0;
            for(const q of items){const id=q.law+'|'+q.sourceNumber;if(seen.has(id))continue;IMPORTED_QUESTIONS.push(q);seen.add(id);added++;if(IMPORTED_QUESTIONS.length>=500)break;}
            if(!store.set('exam:imports',JSON.stringify(IMPORTED_QUESTIONS)))toast('Limite de armazenamento atingido. As questões estarão disponíveis nesta sessão, mas não ficarão salvas. Libere espaço e faça backup.', 'error');
            refreshImportedExamSources();
            $('q-source').value='imported';$('q-format').value=IMPORTED_QUESTIONS.some(q=>q.type==='CE')?'CE':'MC';
            updateImportedStatus(added+' questões extraídas do material público. Total nesta sessão: '+IMPORTED_QUESTIONS.length+'. Para corrigir questões reais, importe o gabarito oficial.');return added;
        }
        async function importOfficialExamFile(inp){const f=inp.files?.[0];if(!f)return;updateImportedStatus('Lendo prova: '+f.name);
            try{if(!/\.(pdf|txt)$/i.test(f.name))throw Error('Somente PDF e TXT.');const t=await readFileText(f);const items=parseOfficialExam(t,f.name);if(!items.length)throw Error('Nenhum item foi reconhecido. Confira se o PDF contém questões selecionáveis e numeração “Questão 1” ou “Item 1”.');addOfficialQuestions(items);}
            catch(e){toast('Falha na extração da prova: '+e.message,'error');updateImportedStatus('Falha na importação: '+e.message);}finally{inp.value='';}
        }
        async function importOfficialExamUrl(url){
            updateImportedStatus('Abra e baixe o PDF em outra aba. Depois use “Importar prova (PDF/TXT)” para carregar os itens.');
            try{const u=new URL(url);if(u.protocol==='https:')window.open(u.href,'_blank','noopener,noreferrer');}
            catch(e){toast('Link de prova inválido.','error');}
        }
        async function importOfficialAnswerFile(inp){const f=inp.files?.[0];if(!f)return;
            try{if(!/\.txt$/i.test(f.name)||f.size>500000)throw Error('Use um gabarito em TXT até 500 KB');const txt=await f.text();
                const keys=new Map();for(const row of txt.split(/\r?\n/)){const m=row.match(/^\s*(?:Quest[aã]o|Item)?\s*(\d{1,4})\s*[:.\-;) ]+\s*(A|B|C|D|E|Certo|Errado)\b/i);if(m)keys.set(Number(m[1]),/^(certo)$/i.test(m[2])?'C':/^(errado)$/i.test(m[2])?'E':m[2].toUpperCase());}
                if(!keys.size)throw Error('Nenhum gabarito reconhecido. Use linhas no formato "1 A", "2 C" ou "3 Errado".');
                const selected=$('exam-answer-source')?.value||'';
                if(!selected||!IMPORTED_QUESTIONS.some(q=>q.law===selected))throw Error('Selecione a prova correspondente antes de importar o gabarito. Não é seguro aplicar respostas a todas as provas.');
                let total=0;
                for(const q of IMPORTED_QUESTIONS){
                    if(q.law!==selected)continue;
                    const key=keys.get(q.sourceNumber);
                    if(key&&(q.type==='CE'?['C','E'].includes(key):'ABCDE'.slice(0,q.options?.length||0).includes(key))){
                        q.answer=key;
                        q.explanation='Resposta conforme gabarito informado pelo candidato para '+selected+'. Confirme o número da questão e o documento oficial.';
                        total++;
                    }
                }
                if(!total)throw Error('Nenhum número de questão do gabarito corresponde à prova selecionada. Confira prova, caderno e formato.');
                if(!store.set('exam:imports',JSON.stringify(IMPORTED_QUESTIONS)))toast('Gabarito importado, mas o armazenamento local está cheio. Faça backup antes de sair.','error');
                if(Q_STATE?.items){
                    for(const it of Q_STATE.items){
                        if(it.law!==selected)continue;
                        const updated=IMPORTED_QUESTIONS.find(q=>q.law===selected&&q.sourceNumber===it.sourceNumber);
                        if(updated?.answer){it.answer=updated.answer;it.explanation=updated.explanation;}
                    }
                    saveStudySession();
                }
                updateImportedStatus(total+' respostas vinculadas exclusivamente à prova "'+selected+'". Confirme prova e caderno.');
            }catch(e){toast('Gabarito não importado: '+e.message,'error');}finally{inp.value='';}
        }
        // Cadastro e sessão autenticada. Servidor controla identidade e acesso aos dados.
        let ACCOUNT_MODE='login',AUTH_INITIALIZED=false;
        function toggleAccountPassword(forceHide=false){
            const input=$('account-password'),button=$('account-password-toggle');
            if(!input||!button)return;
            const visible=!forceHide&&input.type==='password';
            input.type=visible?'text':'password';
            button.classList.toggle('is-visible',visible);
            button.setAttribute('aria-pressed',String(visible));
            button.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');
            button.title=visible?'Ocultar senha':'Mostrar senha';
        }
        function switchAccountMode(){
            toggleAccountPassword(true);
            ACCOUNT_MODE=ACCOUNT_MODE==='login'?'register':'login';
            $('account-title').textContent=ACCOUNT_MODE==='register'?'Criar conta gratuita':'Acessar meus estudos';
            $('account-switch').textContent=ACCOUNT_MODE==='register'?'Já tenho uma conta':'Criar conta gratuita';
            $('account-submit').textContent=ACCOUNT_MODE==='register'?'Cadastrar':'Entrar';
            $('account-password').autocomplete=ACCOUNT_MODE==='register'?'new-password':'current-password';$('account-password').minLength=6;
        }
        // Supabase Auth + PostgREST; somente a chave PUBLICÁVEL aparece no frontend.
        const SB_URL='https://wskuhkvgipqwykbnuspk.supabase.co';
        const SB_KEY='sb_publishable_GD37Y7cVTTKo74Vg5_5U1g_lyoqwcvH';
        const SB_SESSION_KEY='pmdf:supabase:session:v1';
        // Identificador interno determinístico: não envia nem utiliza e-mail real.
        // O domínio .invalid é reservado; nunca recebe e-mail de confirmação/recuperação.
        const PMDF_USER_DOMAIN='users.metodopmdf.invalid';
        const normalizeUsername=v=>String(v||'').trim().toLowerCase();
        const usernameIsValid=v=>/^[a-z0-9][a-z0-9._-]{2,23}$/.test(v);
        const usernameToLoginEmail=v=>normalizeUsername(v)+'@'+PMDF_USER_DOMAIN;
        const SB_REDIRECT_URL='https://metodopmdf.github.io/metodo-pmdf/';
        let SB_SESSION=null,SB_REFRESH=null;
        const PMDF_RELEASE='2026-11-02-qa-melhorias';
        const sbHeaders=(token)=>({'apikey':SB_KEY,'Authorization':'Bearer '+(token||SB_KEY),'Content-Type':'application/json'});
        function saveSbSession(session){
            SB_SESSION=session?.access_token?{...session,expires_at:session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600)}:null;
            try{if(SB_SESSION)localStorage.setItem(SB_SESSION_KEY,JSON.stringify(SB_SESSION));else localStorage.removeItem(SB_SESSION_KEY);}catch(e){}
        }
        async function sbCall(path,options={},token){
            const r=await fetch(SB_URL+path,{...options,headers:{...sbHeaders(token),...(options.headers||{})}});
            const data=await r.json().catch(()=>({}));
            if(!r.ok)throw Error(data.msg||data.error_description||data.message||data.error||('Supabase HTTP '+r.status));
            return data;
        }
        async function refreshSbSession(){
            if(SB_REFRESH)return SB_REFRESH;
            SB_REFRESH=(async()=>{
                if(!SB_SESSION?.refresh_token)throw Error('Sessão expirada. Entre novamente.');
                const data=await sbCall('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:SB_SESSION.refresh_token})});
                saveSbSession(data);return SB_SESSION;
            })();
            try{return await SB_REFRESH;}finally{SB_REFRESH=null;}
        }
        async function sbToken(){
            if(!SB_SESSION?.access_token)throw Error('Faça login para sincronizar.');
            if(SB_SESSION.expires_at && Date.now()/1000>SB_SESSION.expires_at-90)await refreshSbSession();
            return SB_SESSION.access_token;
        }
        async function sbAuthed(path,options={}){
            let token=await sbToken();
            try{return await sbCall(path,options,token);}
            catch(e){if(/jwt expired|invalid jwt|token.*expired/i.test(e.message)){await refreshSbSession();return sbCall(path,options,SB_SESSION.access_token);}throw e;}
        }
        function sbUser(user){const internalName=user.user_metadata?.username||(user.email||'').split('@')[0];return {username:user.id,displayName:internalName||'Candidato',email:null};}
        async function accountFetch(endpoint,options={}){
            if(endpoint!=='progresso')throw Error('Rota não suportada.');
            const uid=AUTH_USER?.username;
            if(!uid)throw Error('Entre na sua conta.');
            const base='/rest/v1/pmdf_progress',filter='?user_id=eq.'+encodeURIComponent(uid);
            try{
                if(options.method!=='PUT'){
                    const rows=await sbAuthed(base+filter+'&select=data,updated_at',{method:'GET'});
                    return {ok:true,status:200,json:async()=>({data:rows[0]?.data||{},updated_at:rows[0]?.updated_at||null})};
                }
                // Read/merge/CAS: evita sobrescrever alterações de outro aparelho com um POST cego.
                for(let attempt=0;attempt<4;attempt++){
                    if(AUTH_USER?.username!==uid)throw Error('A conta foi alterada durante a sincronização.');
                    const changed=CLOUD_MUTATION_SERIAL;
                    const rows=await sbAuthed(base+filter+'&select=data,updated_at',{method:'GET'});
                    const row=rows[0]||null;
                    const merged=mergeProgressData(row?.data||{},accountData());
                    const version=new Date(Math.max(Date.now(),Date.parse(row?.updated_at||0)+1||0)).toISOString();
                    const payload={user_id:uid,data:merged.data,updated_at:version};
                    let result;
                    if(row){
                        const query=base+filter+'&updated_at=eq.'+encodeURIComponent(row.updated_at)+'&select=updated_at';
                        result=await sbAuthed(query,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
                    }else{
                        result=await sbAuthed(base+'?on_conflict=user_id&select=updated_at',{
                            method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},
                            body:JSON.stringify(payload)});
                    }
                    if(Array.isArray(result)&&result.length){
                        if(AUTH_USER?.username!==uid)throw Error('A conta foi alterada durante a sincronização.');
                        if(changed===CLOUD_MUTATION_SERIAL)applyProgressSnapshot(merged);
                        else CLOUD_DIRTY=true; // alterações durante a requisição exigem outra gravação.
                        return {ok:true,status:200,json:async()=>({updated_at:result[0].updated_at})};
                    }
                    // Outro dispositivo atualizou a linha; repetir sobre a versão mais recente.
                }
                throw Error('Conflito de sincronização: o servidor foi alterado simultaneamente. O progresso local foi preservado; tente novamente.');
            }catch(e){return {ok:false,status:503,json:async()=>({error:e.message})};}
        }
        async function retryAccountConnection(){
            const b=$('account-retry');b.disabled=true;
            try{await sbCall('/auth/v1/settings');$('account-msg').textContent='Supabase conectado. Entre ou crie sua conta.';cloudStatus('✓ Cadastro online disponível');}
            catch(e){$('account-msg').textContent='Falha na conexão: '+e.message;}
            finally{b.disabled=false;}
        }
        async function finishAccountSignIn(){
            // Cadastro pode ter dado certo mesmo quando a leitura do histórico está temporariamente fora do ar.
            showAccountReady();
            try{await loadRemoteProgress();showAccountReady();cloudStatus('✓ Histórico sincronizado');}
            catch(e){cloudStatus('⚠ Conta conectada, mas o histórico online não pôde ser recuperado. Tente novamente antes de iniciar novos estudos.',true);}
        }
        function showAccountReady(){
            const logged=!!AUTH_USER;
            $('account-form').classList.toggle('hidden',logged);$('account-ready').classList.toggle('hidden',!logged);
            $('welcome-study-actions').hidden=!logged;
            if(logged){$('account-who').textContent=AUTH_USER.displayName||AUTH_USER.username;cloudStatus('✓ Conta conectada');}
            refreshWelcome();
        }
        async function loadRemoteProgress(){
            const r=await accountFetch('progresso',{headers:{Accept:'application/json'}});
            if(!r.ok){const d=await r.json().catch(()=>({}));throw Error(d.error||'Não foi possível recuperar o histórico (HTTP '+r.status+').');}
            const obj=await r.json(),remote=obj.data&&typeof obj.data==='object'?obj.data:{};
            const snapshot=mergeProgressData(remote,accountData());
            const localHadNewer=Object.keys(snapshot.data).some(k=>BACKUP_KEY_RE.test(k)&&snapshot.data[k]!==remote[k]);
            applyProgressSnapshot(snapshot);
            LEVEL=LEVELS_SAFE_LEVEL(store.get('lvl'));paintLevel();
            SUMMARY_FORMAT=SUMMARY_FORMATS.includes(store.get('summaryFormat'))?store.get('summaryFormat'):'full';setSummaryFormat(SUMMARY_FORMAT);
            restoreLastGuide();restoreEssayDraft();restoreEssayLastResult();
            const imported=jget('exam:imports',[]);
            IMPORTED_QUESTIONS.splice(0,IMPORTED_QUESTIONS.length,...(Array.isArray(imported)?imported.slice(0,500):[]));
            refreshImportedExamSources();
            showQuestionTotals();
            if(localHadNewer)scheduleCloudSave();
        }
        async function bootstrapAccount(){
            if(AUTH_INITIALIZED)return;AUTH_INITIALIZED=true;
            const message=$('account-msg');
            try{
                try{saveSbSession(JSON.parse(localStorage.getItem(SB_SESSION_KEY)||'null'));}
                catch(e){saveSbSession(null);}
                if(!SB_SESSION){message.textContent='Cadastro por usuário e senha disponível. Sem confirmação por e-mail.';return;}
                const user=await sbAuthed('/auth/v1/user');AUTH_USER=sbUser(user);
                await finishAccountSignIn();
            }catch(e){saveSbSession(null);AUTH_USER=null;message.textContent='Sessão expirada. Entre com seu usuário e senha.';}
        }
        async function submitAccount(event){
            event.preventDefault();
            const button=$('account-submit'),status=$('account-msg');
            if(button.disabled)return;
            const username=normalizeUsername($('account-name').value),password=$('account-password').value;
            if(!usernameIsValid(username)){status.textContent='Use de 3 a 24 caracteres: letras sem acento, números, ponto, hífen ou sublinhado; comece por letra ou número.';return;}
            if(password.length<6||password.length>72){status.textContent='Informe uma senha de 6 a 72 caracteres.';return;}
            button.disabled=true;status.textContent='Conectando ao cadastro online...';
            const internalEmail=usernameToLoginEmail(username);
            try{
                let result;
                if(ACCOUNT_MODE==='register'){
                    result=await sbCall('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:internalEmail,password,data:{username,display_name:username}})});
                    if(!result.access_token||!result.user)throw Error('O Supabase está exigindo confirmação de e-mail. Desative Confirm email em Authentication → Sign In / Providers → Email e tente novamente. Nenhum e-mail de confirmação pode ser entregue a contas com identificador interno.');
                }else{
                    result=await sbCall('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:internalEmail,password})});
                }
                if(!result.user?.id||!result.access_token)throw Error('Não foi possível obter uma sessão autenticada.');
                saveSbSession(result);AUTH_USER=sbUser(result.user);$('account-password').value='';
                toggleAccountPassword(true);
                await finishAccountSignIn();
            }catch(e){
                let msg=e.message||'Falha no cadastro.';
                if(/invalid email|email address is invalid|email not valid/i.test(msg))msg='O provedor não aceitou o identificador interno sem e-mail. Será necessário configurar autenticação própria no servidor.';
                else if(/user already registered|already been registered/i.test(msg))msg='Este nome de usuário já está cadastrado. Escolha outro ou faça login.';
                else if(/invalid login credentials/i.test(msg))msg='Usuário ou senha incorretos.';
                status.textContent=msg;
            }finally{button.disabled=false;}
        }
        function confirmDeleteAccount(){
            openModal('Excluir meus dados','<p class="text-sm text-slate-200">É possível excluir seu histórico de estudos. A exclusão permanente da conta de autenticação requer um processo administrativo seguro no servidor. Nunca compartilhe sua senha com terceiros.</p><button type="button" data-pmdf-onclick="deleteAccountSubmit()" class="mt-3 rounded-xl bg-rose-800 text-white px-4 py-2 font-bold">Excluir meu histórico online</button>');
        }
        async function deleteAccountSubmit(){
            if(!AUTH_USER)return;
            try{await sbAuthed('/rest/v1/pmdf_progress?user_id=eq.'+encodeURIComponent(AUTH_USER.username),{method:'DELETE'});
                const prefix='pmdf:account:'+AUTH_USER.username+':';for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(prefix))localStorage.removeItem(k);}
                closeModal();toast('Histórico excluído. A conta de login permanece ativa.','ok');
            }catch(e){toast('Erro ao excluir histórico: '+e.message,'error');}
        }
        async function logoutAccount(){
            if(APP_STARTED)backToHome();if(CLOUD_SAVE_TIMER)clearTimeout(CLOUD_SAVE_TIMER);
            if(CLOUD_DIRTY)await flushCloudSave();
            try{if(SB_SESSION)await sbAuthed('/auth/v1/logout',{method:'POST'});}catch(e){}
            saveSbSession(null);AUTH_USER=null;APP_STARTED=false;Q_STATE=null;ANKI_STATE=null;CLOUD_DIRTY=false;IMPORTED_QUESTIONS.length=0;ESSAY_MD='';
            ['essay-theme','essay-lines','essay-motiv','essay-text'].forEach(id=>{if($(id))$(id).value='';});$('essay-result')?.classList.add('hidden');$('essay-out').replaceChildren();$('q-panel')?.classList.add('hidden');$('anki-panel')?.classList.add('hidden');
            document.body.classList.add('landing-active');if(ACCOUNT_MODE!=='login')switchAccountMode();$('account-name').value='';$('account-password').value='';showAccountReady();$('account-msg').textContent='Sessão encerrada. Entre novamente para recuperar seu histórico.';
        }
        // Busca automática: apenas questões com licença compatível e gabarito validado
        // são adicionadas. Provas descobertas sem licença permanecem como referências.
        async function fetchAutoQuestions(){
            const status=$('research-status');
            if(status)status.textContent='Sem API própria: importe uma prova e o gabarito no formulário.';
            return [];
        }
        // Log granular separado para gráficos e histórico; sem inventar pontuação para questões sem gabarito.
        function recordQuestionResult(q,correct,seconds){
            if(!AUTH_USER||!q.answer)return;
            const law=String(q.law||'Material').slice(0,100),topic=String(q.topic||'Geral').slice(0,100);
            const key=law+' • '+topic,secondsSafe=Math.min(86400,Math.round(seconds||0));
            const events=jget('pmdf:results:events',[]),old=Array.isArray(events)?events:[];
            let aggregate=jget('pmdf:results:aggregates',{});if(!aggregate||typeof aggregate!=='object'||Array.isArray(aggregate))aggregate={};
            // Reconstrução inicial de resultados antigos, se existirem.
            if(!Object.keys(aggregate).length&&old.length){for(const e of old){const k=e.law+' • '+e.topic,g=aggregate[k]||{a:0,c:0,seconds:0};g.a++;g.c+=Number(!!e.correct);g.seconds+=Number(e.seconds)||0;aggregate[k]=g;}}
            const row=aggregate[key]||{a:0,c:0,seconds:0};row.a++;row.c+=Number(correct);row.seconds+=secondsSafe;aggregate[key]=row;
            store.set('pmdf:results:aggregates',JSON.stringify(aggregate));
            old.push({date:new Date().toISOString(),law,topic,correct:!!correct,seconds:secondsSafe});
            // 700 eventos para evolução recente; agregados preservam totais históricos.
            store.set('pmdf:results:events',JSON.stringify(old.slice(-700)));
        }
        function resultsAggregates(){const aggregate=jget('pmdf:results:aggregates',{});if(aggregate&&Object.keys(aggregate).length)return aggregate;
            const fallback={};for(const e of resultsEvents()){const k=e.law+' • '+e.topic,r=fallback[k]||{a:0,c:0,seconds:0};r.a++;r.c+=Number(e.correct);r.seconds+=Number(e.seconds)||0;fallback[k]=r;}return fallback;}
        function resultsEvents(){const events=jget('pmdf:results:events',[]);return Array.isArray(events)?events.filter(e=>e&&typeof e.topic==='string'&&typeof e.correct==='boolean'):[];}
        function onResultsTopicChange(){renderResultsChart();}
        function renderResults(){
            const aggregate=resultsAggregates(),select=$('results-topic'),old=select.value;
            const topics=Object.keys(aggregate).sort((a,b)=>a.localeCompare(b,'pt-BR'));
            select.innerHTML='<option value="">Selecione um tema</option><option value="*">Todos os temas</option>'+topics.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
            select.value=topics.includes(old)||old==='*'?old:'';
            const essays=jget('essay:history',[]),saved=jget('essay:totals',null);
            const scores=(Array.isArray(essays)?essays:[]).map(x=>Number(x.grade)).filter(x=>Number.isFinite(x)&&x>0&&x<=20);
            const total=saved?.count>0?Number(saved.count):scores.length,sum=saved?.count>0?Number(saved.sum):scores.reduce((a,b)=>a+b,0);
            const avg=total?(sum/total).toFixed(2).replace('.',','):'—';
            const questions=Object.values(aggregate).reduce((n,e)=>n+(e.a||0),0);
            $('results-overview').textContent='Questões avaliadas (histórico): '+questions+' · Redações avaliadas: '+total+' · Média estimada de redação (0–20): '+avg+'.';
            renderResultsChart();
        }
        function renderResultsChart(){
            const selected=$('results-topic').value,events=resultsEvents().filter(e=>selected==='*'||e.law+' • '+e.topic===selected),aggregate=resultsAggregates(),rows=Object.entries(aggregate).filter(([key])=>selected==='*'||key===selected),chart=$('results-chart'),side=$('results-time'),table=$('results-rows');
            if(!selected){chart.innerHTML='<p class="text-sm text-slate-300">Escolha um tema para visualizar o gráfico de acertos e erros.</p>';side.textContent='Aguardando seleção de tema.';table.textContent='';return;}
            const total=rows.reduce((a,[,g])=>a+g.a,0),ok=rows.reduce((a,[,g])=>a+g.c,0),bad=total-ok,time=rows.reduce((a,[,g])=>a+g.seconds,0);
            side.innerHTML='<p><strong>Tempo total:</strong> '+fmtSeconds(time)+'</p><p><strong>Tempo médio por questão:</strong> '+fmtSeconds(total?time/total:0)+'</p><p><strong>Acertos:</strong> '+ok+'</p><p><strong>Erros:</strong> '+bad+'</p>';
            if(!total){chart.innerHTML='<p class="text-sm text-slate-300">Sem questões respondidas com gabarito para este tema.</p>';table.textContent='';return;}
            const mobile=!!(window.matchMedia&&window.matchMedia('(max-width: 639px)').matches);
            const W=mobile?480:720,H=mobile?350:310,cx=mobile?240:350,cy=148;
            const legendY=mobile?322:284,errorsX=mobile?240:220;
            const col='#D4AF37',badCol='#DC2626',muted='#94a3b8',label=x=>esc(x);
            const group=new Map(rows.map(([key,g])=>[key.split(' • ').slice(1).join(' • ')||key,g]));
            const fraction=ok/total,circumference=2*Math.PI*96;
            const svg='<circle cx="'+cx+'" cy="'+cy+'" r="96" stroke="'+badCol+'" stroke-width="40" fill="none"/>'+
                '<circle cx="'+cx+'" cy="'+cy+'" r="96" stroke="'+col+'" stroke-width="40" fill="none" stroke-dasharray="'+(fraction*circumference)+' '+circumference+'" transform="rotate(-90 '+cx+' '+cy+')" />'+
                '<text x="'+cx+'" y="153" font-size="29" font-weight="bold" text-anchor="middle" fill="'+col+'">'+Math.round(fraction*100)+'%</text>'+
                '<text x="'+cx+'" y="179" font-size="13" text-anchor="middle" fill="'+muted+'">de acertos</text>'+
                '<text x="24" y="'+legendY+'" fill="'+col+'" font-size="16">● Acertos: '+ok+'</text>'+
                '<text x="'+errorsX+'" y="'+legendY+'" fill="'+badCol+'" font-size="16">● Erros: '+bad+'</text>';
            chart.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de rosca de acertos e erros" style="display:block;width:100%;max-height:390px" xmlns="http://www.w3.org/2000/svg">'+svg+'</svg>';
            table.innerHTML='<table class="w-full text-xs text-slate-300 mt-3"><thead><tr><th class="p-2">Tópico</th><th class="p-2">Respondidas</th><th class="p-2">Acertos</th><th class="p-2">Erros</th><th class="p-2">% de acerto</th><th class="p-2">Tempo</th></tr></thead><tbody>'+[...group].sort((a,b)=>b[1].a-a[1].a).slice(0,100).map(([name,g])=>'<tr><td class="p-2">'+label(name)+'</td><td class="p-2">'+g.a+'</td><td class="p-2">'+g.c+'</td><td class="p-2">'+(g.a-g.c)+'</td><td class="p-2">'+Math.round(100*g.c/g.a)+'%</td><td class="p-2">'+fmtSeconds(g.seconds)+'</td></tr>').join('')+'</tbody></table>';
        }

        document.addEventListener('DOMContentLoaded',()=>{
            initTheme();paintLevel();showTab('leis');calcNPD();pomoReset();setSourceMode('url');setSummaryFormat(SUMMARY_FORMAT);setupLawDropzone();
            if($('law-text'))$('law-text').addEventListener('input',countLawText);countLawText();
            ['essay-theme','essay-lines','essay-motiv'].forEach(id=>{const el=$(id);if(el)el.addEventListener('input',saveEssayDraft);});
            restoreEssayDraft();if(window.lucide)lucide.createIcons();restoreLastGuide();
            try{const imported=jget('exam:imports',[]);if(Array.isArray(imported))IMPORTED_QUESTIONS.push(...imported.slice(0,500).filter(q=>q&&['CE','MC'].includes(q.type)&&typeof q.statement==='string'));}catch(e){}
            refreshImportedExamSources();refreshWelcome();showQuestionTotals();updateNeuralFormatUI();void bootstrapAccount();
            document.addEventListener('visibilitychange',()=>{if(document.hidden&&CLOUD_DIRTY)void flushCloudSave();});
            document.addEventListener('keydown',event=>{
                if(event.key==='Tab') return pmdfTrapDialog(event);
                if(event.key==='Escape'){
                    if(!$('prompt-modal')?.classList.contains('hidden')) closePromptModal();
                    else if(!$('gen-modal')?.classList.contains('hidden')) closeModal();
                }
            });
            ['prompt-modal','gen-modal'].forEach(id=>{const modal=$(id);if(modal)modal.addEventListener('click',event=>{if(event.target===modal){if(id==='prompt-modal')closePromptModal();else closeModal();}});});
        });

    

// ---------- Eventos delegados: nenhum handler inline nem eval em tempo de execução. ----------
const PMDF_EVENT_HANDLERS = Object.freeze({
  click: Object.freeze({"toggleAccountPassword()": function(event){ toggleAccountPassword() },
"switchAccountMode()": function(event){ switchAccountMode() },
"retryAccountConnection()": function(event){ retryAccountConnection() },
"logoutAccount()": function(event){ logoutAccount() },
"confirmDeleteAccount()": function(event){ confirmDeleteAccount() },
"beginStudies(false)": function(event){ beginStudies(false) },
"beginStudies(true)": function(event){ beginStudies(true) },
"toggleTheme()": function(event){ toggleTheme() },
"closePromptModal()": function(event){ closePromptModal() },
"showJsonPrompt()": function(event){ showJsonPrompt() },
"toggleExternalJsonInput()": function(event){ toggleExternalJsonInput() },
"importExternalGuide()": function(event){ importExternalGuide() },
"copyPromptFromModal()": function(event){ copyPromptFromModal() },
"closeModal()": function(event){ closeModal() },
"pomoToggle()": function(event){ pomoToggle() },
"pomoReset()": function(event){ pomoReset() },
"backToHome()": function(event){ backToHome() },
"showTab('resultados');renderResults()": function(event){ showTab('resultados');renderResults() },
"showTab('leis')": function(event){ showTab('leis') },
"showTab('questoes')": function(event){ showTab('questoes') },
"showTab('anki')": function(event){ showTab('anki') },
"showTab('redacao')": function(event){ showTab('redacao') },
"pmdfFocusPrimary()": function(event){ pmdfFocusPrimary() },
"selectAndLoadLaw('cf88', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm')": function(event){ selectAndLoadLaw('cf88', 'https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm') },
"selectAndLoadLaw('cpm', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001.htm')": function(event){ selectAndLoadLaw('cpm', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1001.htm') },
"selectAndLoadLaw('cppm', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm')": function(event){ selectAndLoadLaw('cppm', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del1002.htm') },
"selectAndLoadLaw('estatuto', 'https://www.planalto.gov.br/ccivil_03/leis/l7289.htm')": function(event){ selectAndLoadLaw('estatuto', 'https://www.planalto.gov.br/ccivil_03/leis/l7289.htm') },
"selectAndLoadLaw('l12086', 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12086.htm')": function(event){ selectAndLoadLaw('l12086', 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l12086.htm') },
"selectAndLoadLaw('abuso', 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm')": function(event){ selectAndLoadLaw('abuso', 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13869.htm') },
"selectAndLoadLaw('cp', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm')": function(event){ selectAndLoadLaw('cp', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm') },
"selectAndLoadLaw('cpp', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm')": function(event){ selectAndLoadLaw('cpp', 'https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm') },
"selectAndLoadLaw('drogas', 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm')": function(event){ selectAndLoadLaw('drogas', 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11343.htm') },
"selectAndLoadLaw('tortura', 'https://www.planalto.gov.br/ccivil_03/leis/l9455.htm')": function(event){ selectAndLoadLaw('tortura', 'https://www.planalto.gov.br/ccivil_03/leis/l9455.htm') },
"selectAndLoadLaw('armas', 'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm')": function(event){ selectAndLoadLaw('armas', 'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm') },
"selectAndLoadLaw('mariadapenha', 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm')": function(event){ selectAndLoadLaw('mariadapenha', 'https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2006/lei/l11340.htm') },
"selectAndLoadLaw('hediondos', 'https://www.planalto.gov.br/ccivil_03/leis/l8072.htm')": function(event){ selectAndLoadLaw('hediondos', 'https://www.planalto.gov.br/ccivil_03/leis/l8072.htm') },
"selectAndLoadLaw('jecrim')": function(event){ selectAndLoadLaw('jecrim') },
"selectAndLoadLaw('orcrim')": function(event){ selectAndLoadLaw('orcrim') },
"selectAndLoadLaw('genocidio')": function(event){ selectAndLoadLaw('genocidio') },
"selectAndLoadLaw('racismo')": function(event){ selectAndLoadLaw('racismo') },
"selectAndLoadLaw('eca')": function(event){ selectAndLoadLaw('eca') },
"selectAndLoadLaw('improbidade')": function(event){ selectAndLoadLaw('improbidade') },
"selectAndLoadLaw('temporaria')": function(event){ selectAndLoadLaw('temporaria') },
"selectAndLoadLaw('jef')": function(event){ selectAndLoadLaw('jef') },
"selectAndLoadLaw('r200')": function(event){ selectAndLoadLaw('r200') },
"selectAndLoadLaw('d10443')": function(event){ selectAndLoadLaw('d10443') },
"selectAndLoadLaw('l14751')": function(event){ selectAndLoadLaw('l14751') },
"selectAndLoadLaw('lai')": function(event){ selectAndLoadLaw('lai') },
"selectAndLoadLaw('interceptacao')": function(event){ selectAndLoadLaw('interceptacao') },
"setSourceMode('url')": function(event){ setSourceMode('url') },
"setSourceMode('text')": function(event){ setSourceMode('text') },
"setSourceMode('file')": function(event){ setSourceMode('file') },
"clearLawText()": function(event){ clearLawText() },
"clearMainFilters()": function(event){ clearMainFilters() },
"setLevel('iniciante')": function(event){ setLevel('iniciante') },
"setLevel('intermediario')": function(event){ setLevel('intermediario') },
"setLevel('avancado')": function(event){ setLevel('avancado') },
"generateStrategicGuide()": function(event){ generateStrategicGuide() },
"questionUseText()": function(event){ questionUseText() },
"setQuestionEngine('local')": function(event){ setQuestionEngine('local') },
"setQuestionEngine('neural')": function(event){ setQuestionEngine('neural') },
"stopQuestionAI()": function(event){ stopQuestionAI() },
"startQuestions()": function(event){ startQuestions() },
"startQuestions(true)": function(event){ startQuestions(true) },
"saveNeuralQuestions()": function(event){ saveNeuralQuestions() },
"exportNeuralQuestions()": function(event){ exportNeuralQuestions() },
"resetQuestionCycle()": function(event){ resetQuestionCycle() },
"clearQuestionFilters()": function(event){ clearQuestionFilters() },
"openErrors()": function(event){ openErrors() },
"startAnki()": function(event){ startAnki() },
"stopAnkiGeneration()": function(event){ stopAnkiGeneration() },
"clearAnkiFilters()": function(event){ clearAnkiFilters() },
"exportAnkiCards('csv')": function(event){ exportAnkiCards('csv') },
"exportAnkiCards('tsv')": function(event){ exportAnkiCards('tsv') },
"exportAnkiDeck('cloze')": function(event){ exportAnkiDeck('cloze') },
"exportAnkiDeck('basic')": function(event){ exportAnkiDeck('basic') },
"estimateLines()": function(event){ estimateLines() },
"correctEssay()": function(event){ correctEssay() },
"showEssayHistory()": function(event){ showEssayHistory() },
"copyEssayResult()": function(event){ copyEssayResult() },
"exportEssayDoc()": function(event){ exportEssayDoc() },
"exportEssayPdfA4()": function(event){ exportEssayPdfA4() },
"openFlash()": function(event){ openFlash() },
"FC.back=true;drawFlash()": function(event){ FC.back=true;drawFlash() },
"rateFlash(false)": function(event){ rateFlash(false) },
"rateFlash(true)": function(event){ rateFlash(true) },
"startSim()": function(event){ startSim() },
"simAI()": function(event){ simAI() },
"downloadSimDoc()": function(event){ downloadSimDoc() },
"answerSim('C')": function(event){ answerSim('C') },
"answerSim('E')": function(event){ answerSim('E') },
"answerSim('')": function(event){ answerSim('') },
"SIM.i++;drawSim()": function(event){ SIM.i++;drawSim() },
"exportProgress()": function(event){ exportProgress() },
"exportErrorsDoc()": function(event){ exportErrorsDoc() },
"startSim(jget('sim:errs',[]),true)": function(event){ startSim(jget('sim:errs',[]),true) },
"if(confirm('Apagar todo o histórico?')){store.set('sim:stats','{}');store.set('sim:errs','[]');openErrors()}": function(event){ if(confirm('Apagar todo o histórico?')){store.set('sim:stats','{}');store.set('sim:errs','[]');openErrors()} },
"$('prompt-modal-text').textContent=currentPrompt()": function(event){ $('prompt-modal-text').textContent=currentPrompt() },
"$('prompt-modal-text').textContent=scanPrompt()": function(event){ $('prompt-modal-text').textContent=scanPrompt() },
"$('prompt-modal-text').textContent=pmdfMindPrompt(CUR.guide)": function(event){ $('prompt-modal-text').textContent=pmdfMindPrompt(CUR.guide) },
"copyText(pmdfMindPrompt(CUR.guide))": function(event){ copyText(pmdfMindPrompt(CUR.guide)) },
"openMindMap()": function(event){ openMindMap() },
"flipStudyCard(this)": function(event){ flipStudyCard(this) },
"startLeitner()": function(event){ startLeitner() },
"openPanel()": function(event){ openPanel() },
"toggleCloze()": function(event){ toggleCloze() },
"clearGuideOptions()": function(event){ clearGuideOptions() },
"searchAll()": function(event){ searchAll() },
"previousQuestion()": function(event){ previousQuestion() },
"resetQuestionCycle();startQuestions()": function(event){ resetQuestionCycle();startQuestions() },
"answerQuestion(this.dataset.choice)": function(event){ answerQuestion(this.dataset.choice) },
"answerQuestion(null)": function(event){ answerQuestion(null) },
"nextQuestion()": function(event){ nextQuestion() },
"previousAnki()": function(event){ previousAnki() },
"revealAnki()": function(event){ revealAnki() },
"gradeAnki(false)": function(event){ gradeAnki(false) },
"gradeAnkiRating('hard')": function(event){ gradeAnkiRating('hard') },
"gradeAnki(true)": function(event){ gradeAnki(true) },
"gradeAnkiRating('easy')": function(event){ gradeAnkiRating('easy') },
"nextAnki()": function(event){ nextAnki() },
"deleteAccountSubmit()": function(event){ deleteAccountSubmit() }}),
  change: Object.freeze({"importProgress(this)": function(event){ importProgress(this) },
"onLawFile(this)": function(event){ onLawFile(this) },
"refreshCurrentBuiltInLawMetadata()": function(event){ refreshCurrentBuiltInLawMetadata() },
"setSummaryFormat(this.value)": function(event){ setSummaryFormat(this.value) },
"refreshQuestionStudio()": function(event){ refreshQuestionStudio() },
"questionUploadFile(this)": function(event){ questionUploadFile(this) },
"updateNeuralFormatUI()": function(event){ updateNeuralFormatUI() },
"importOfficialExamFile(this)": function(event){ importOfficialExamFile(this) },
"importOfficialAnswerFile(this)": function(event){ importOfficialAnswerFile(this) },
"onResultsTopicChange()": function(event){ onResultsTopicChange() },
"onMotivFile(this)": function(event){ onMotivFile(this) },
"toggleStudied(this)": function(event){ toggleStudied(this) },
"setBank(this.value)": function(event){ setBank(this.value) }}),
  input: Object.freeze({"document.querySelectorAll('.pmdf-more-laws-grid .law-shortcut-btn').forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase('pt-BR').includes(this.value.toLocaleLowerCase('pt-BR').trim()))": function(event){ document.querySelectorAll('.pmdf-more-laws-grid .law-shortcut-btn').forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase('pt-BR').includes(this.value.toLocaleLowerCase('pt-BR').trim())) },
"essayLive()": function(event){ essayLive() },
"calcNPD()": function(event){ calcNPD() },
"filterGuide(this.value)": function(event){ filterGuide(this.value) }}),
  submit: Object.freeze({"submitAccount(event)": function(event){ submitAccount(event) }}),
  keydown: Object.freeze({"pmdfTabKeydown(event)": function(event){ pmdfTabKeydown(event) }}),
  keyup: Object.freeze({})
});
function pmdfDispatchSpecial(action, el, event) {
  switch (action) {
    case 'answer-sim': return answerSim(el.dataset.pmdfValue);
    case 'cut-alt': return cutAlt(Number(el.dataset.pmdfValue));
    case 'select-law': closeModal(); return selectAndLoadLaw(el.dataset.pmdfKey,el.dataset.pmdfUrl);
    case 'leitner-again': return rateLeitner(el.dataset.pmdfCardId,false,el);
    case 'leitner-good': return rateLeitner(el.dataset.pmdfCardId,true,el);
    case 'essay-history': return openEssayHistory(Number(el.dataset.pmdfValue));
    case 'edit-note': return editNote(Number(el.dataset.pmdfValue));
    default: return undefined;
  }
}
for(const type of ['click','change','input','submit','keydown','keyup']) {
  document.addEventListener(type, function(event) {
    const target = event.target?.closest?.('[data-pmdf-on'+type+']'+(type==='click'?', [data-pmdf-special]':''));
    if (!target) return;
    const special = type==='click' ? target.getAttribute('data-pmdf-special') : null;
    const handlerCode = target.getAttribute('data-pmdf-on'+type);
    const handler = PMDF_EVENT_HANDLERS[type]?.[handlerCode];
    try {
      const result = special ? pmdfDispatchSpecial(special,target,event) : handler?.call(target,event);
      if (result === false) event.preventDefault();
    } catch (error) {
      if (typeof toast==='function') toast('Não foi possível concluir esta ação. Tente novamente.','error');
      console.error('[Método PMDF] Falha em ação de interface:',error);
    }
  });
}
