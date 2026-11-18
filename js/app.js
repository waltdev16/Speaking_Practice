/* UI rendering, practice flow, timers, audio, and game logic. */
/* ===================== APP ===================== */
const $=s=>document.querySelector(s);
const store={get(k,d){try{const v=localStorage.getItem('tq2_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('tq2_'+k,JSON.stringify(v))}catch(e){}}};
let saved=new Set(store.get('saved',[])), done=new Set(store.get('done',[]));
let cur=0, grp=EX[0].g, hideA=store.get('hide2',true);
const I={
 spk:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
 x:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 play:'<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
 phone:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
 bulb:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
 eye:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>'
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const plain=s=>s.replace(/\[\[([^\]|]+)\|[^\]]+\]\]/g,'$1').replace(/<[^>]+>/g,'');
function mark(s){return (s||'').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,(m,l,k)=>`<span class="w${saved.has(k)?' saved':''}" data-k="${k}" tabindex="0" role="button">${l}</span>`)}
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),1800)}
const pad=n=>String(n).padStart(2,'0');

/* annotate model answers: facts + useful phrases */
const NUMW='one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|forty-eight';
const FACT=new RegExp('(\\b\\d{1,2}:\\d{2}(?:\\s?[ap]\\.m\\.)?|\\b\\d{1,2}\\s?[ap]\\.m\\.|\\b(?:January|February|March|April|May|June|July|August|September|October|November|December) \\d{1,2}\\b|\\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\\b|\\bRoom \\d+\\w?\\b|\\b\\d+(?:\\.\\d+)?\\s?(?:miles|percent)\\b|\\b(?:(?:'+NUMW+')(?:[\\s-]|\\sand\\s)?)+(?:dollars|percent|minutes|hours|business days|people|gigabytes|seats|lines)\\b)','gi');
const PHR=/\b(Actually|I’m afraid|Unfortunately|However|First|Second|Next|Then|Finally|Also|Good news|I’m sorry|Of course|Sure|There are|There’s|as well as|instead|though|Just remember|keep in mind)\b/g;
function annotate(a){return esc(a).replace(FACT,'<mark class="f">$1</mark>').replace(PHR,'<mark class="p">$1</mark>')}

/* speech */
const canSpeak='speechSynthesis' in window; let voice=null, playingBtn=null;
function pickVoice(){try{const v=speechSynthesis.getVoices();voice=v.find(x=>/en-US/i.test(x.lang)&&/Samantha|Google US|Aria|Jenny|Natural/i.test(x.name))||v.find(x=>/en-US/i.test(x.lang))||v.find(x=>/^en/i.test(x.lang))||null}catch(e){}}
if(canSpeak){pickVoice();try{speechSynthesis.onvoiceschanged=pickVoice}catch(e){}}
function speak(text,rate=.95,btn){return new Promise(res=>{let f=false;
 const ok=()=>{if(!f){f=true;if(btn)btn.classList.remove('playing');res()}};
 if(playingBtn)playingBtn.classList.remove('playing');playingBtn=btn||null;if(btn)btn.classList.add('playing');
 if(!canSpeak)return ok();
 try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(plain(text));u.lang='en-US';u.rate=rate;if(voice)u.voice=voice;u.onend=ok;u.onerror=ok;speechSynthesis.speak(u);setTimeout(ok,1500+text.length*85)}catch(e){ok()}})}
const hush=()=>{try{canSpeak&&speechSynthesis.cancel()}catch(e){}if(playingBtn)playingBtn.classList.remove('playing')};

/* picker */
function renderGroups(animate){
 $('#groups').innerHTML=GROUPS.map(([k,l])=>`<button role="tab" data-g="${k}" class="${k===grp?'on':''}" aria-selected="${k===grp}">${l}<small>${EX.filter(e=>e.g===k).length}</small></button>`).join('');
 let n=0;
 $('#exlist').innerHTML=EX.map((e,i)=>e.g!==grp?'':`<button class="ex${i===cur?' on':''}" data-i="${i}" style="--d:${animate?(n++)*50:0}ms${animate?'':';animation:none'}"><div class="no">${pad(i+1)}${done.has(e.id)?'<i>✓ done</i>':''}</div><div class="t">${e.title}</div></button>`).join('');
 $('#progTxt').textContent=`${done.size} / ${EX.length} done`;
 $('#progBar').style.width=(done.size/EX.length*100)+'%';
}
$('#groups').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.g===grp)return;grp=b.dataset.g;renderGroups(true)});
$('#exlist').addEventListener('click',e=>{const b=e.target.closest('.ex');if(b)select(+b.dataset.i)});
function keepVisible(){[$('#exlist .on'),$('#groups .on')].forEach(el=>{if(el){const p=el.parentElement;p.scrollLeft=el.offsetLeft-p.offsetLeft-16}})}
function select(i){
 stopRun();closeCard();cur=i;grp=EX[i].g;qi=0;seen=new Set();
 try{history.replaceState(null,'','#'+EX[i].id)}catch(e){}
 renderGroups(false);renderDoc();renderQA();keepVisible();
 const top=$('#groups').getBoundingClientRect().top;if(top<0)$('#groups').scrollIntoView({behavior:'smooth',block:'start'});
}

/* documents */
function bodyHTML(lines){let h='',list=null;const close=()=>{if(list){h+=`</${list}>`;list=null}};
 lines.forEach(l=>{const m=l.match(/^([-#]) (.*)$/);
  if(m){const t=m[1]==='-'?'ul':'ol';if(list!==t){close();h+=`<${t}>`;list=t}h+=`<li>${mark(m[2])}</li>`}else{close();h+=`<p>${mark(l)}</p>`}});close();return h}
function docHTML(e){
 const d=e.doc;let h='';
 if(e.type==='flyer'){
  h=`<article class="paper flyer dark-doc" style="--fc:${d.color};--acc:${d.acc}"><div class="fl-org">${d.org}</div><h2 class="fl-title">${mark(d.title)}</h2><p class="fl-sub">${mark(d.sub)}</p>
   <div class="fl-facts">${d.facts.map(f=>`<div>${mark(f)}</div>`).join('')}</div>
   <ul class="fl-items">${d.items.map(([a,b,c])=>`<li><div><b>${mark(a)}</b><span>${mark(b)}</span></div>${c?`<em>${mark(c)}</em>`:''}</li>`).join('')}</ul>
   <div class="fl-notes">${d.notes.map(n=>`<p>${mark(n)}</p>`).join('')}</div></article>`;
 }else if(e.type==='schedule'||e.type==='table'){
  h=`<article class="paper ${e.type==='table'?'ptable':'sched'}"><div class="kicker">${mark(d.kicker)}</div><h2>${mark(d.title)}</h2><div class="meta">${d.meta.map(m=>`<span>${mark(m)}</span>`).join('')}</div>
   <table><thead><tr>${d.cols.map(c=>`<th>${mark(c)}</th>`).join('')}</tr></thead><tbody>${d.rows.map(r=>`<tr>${r.map(c=>`<td>${mark(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
   <ul class="notes">${d.notes.map(n=>`<li>${mark(n)}</li>`).join('')}</ul></article>`;
 }else if(e.type==='menu'){
  h=`<article class="paper menu"><h2 class="mn-name">${d.name}</h2><p class="mn-tag">${mark(d.tagline)}</p>
   ${d.sections.map(s=>`<section><h3>${mark(s.h)}</h3>${s.items.map(([n,ds,p])=>`<div class="mn-item"><div class="mn-row"><span>${mark(n)}</span><span class="mn-dots"></span><span class="mn-p">${mark(p)}</span></div>${ds?`<div class="mn-d">${mark(ds)}</div>`:''}</div>`).join('')}</section>`).join('')}
   <div class="mn-notes">${d.notes.map(n=>`<p>${mark(n)}</p>`).join('')}</div></article>`;
 }else if(e.type==='calendar'){
  h=`<article class="paper cal"><div class="kicker">${mark(d.kicker)}</div><h2>${mark(d.title)}</h2><div class="meta">${d.meta.map(m=>`<span>${mark(m)}</span>`).join('')}</div>
   <div class="cal-days">${d.days.map(x=>`<div class="cal-day${x.full?' full':''}"><div class="cal-date"><b>${x.d}</b><span>${x.w}</span></div><ul>${x.items.map(([t,s])=>`<li><code>${t}</code><span>${mark(s)}</span></li>`).join('')}</ul></div>`).join('')}</div>
   <ul class="notes">${d.notes.map(n=>`<li>${mark(n)}</li>`).join('')}</ul></article>`;
 }else if(e.type==='email'){
  h=`<article class="paper email"><div class="em-bar"><i></i>Inbox</div><div class="em-subj">${mark(d.subject)}</div>
   <dl class="em-head"><dt>From</dt><dd>${d.from}</dd><dt>To</dt><dd>${d.to}</dd><dt>Date</dt><dd>${d.date}</dd></dl><div class="em-body">${bodyHTML(d.body)}</div></article>`;
 }else if(e.type==='memo'){
  h=`<article class="paper memo"><div class="mm-title">MEMO</div><dl class="mm-head"><dt>To:</dt><dd>${mark(d.to)}</dd><dt>From:</dt><dd>${d.from}</dd><dt>Date:</dt><dd>${d.date}</dd><dt>Re:</dt><dd>${mark(d.re)}</dd></dl><div class="mm-body">${bodyHTML(d.body)}</div></article>`;
 }
 return h;
}
function renderDoc(){$('#doc').innerHTML=`<div class="swap">${docHTML(EX[cur])}</div>`}

/* Q&A */
function qaShell(inner,showFoot=true){
 const e=EX[cur],gl=GROUPS.find(g=>g[0]===e.g)[1];
 return `<div class="qa-top"><div><div class="lbl">${pad(cur+1)} / ${EX.length} · ${gl}</div><h2>${e.title}</h2></div>
  <div class="tools"><label class="switch"><input type="checkbox" id="hideA" ${hideA?'checked':''}><span class="tr"></span>Hide answers</label>
  <button class="btn black sm" id="startRun">${I.play} Timed practice</button></div></div>
  <div class="caller"><span class="ava">${I.phone}</span><div><div class="who">Incoming call</div><p>${linkQ(e.intro)}</p></div><button class="say" data-say="intro" aria-label="Listen to the caller">${I.spk}</button></div>
  <div id="qbody">${inner}</div>
  ${showFoot?`<div class="qa-foot"><button class="btn sm" id="prev" ${cur===0?'disabled':''}>← Previous</button>
   <button class="btn sm done${done.has(e.id)?' on':''}" id="doneBtn">${done.has(e.id)?'✓ Done':'Mark as done'}</button>
   <button class="btn sm" id="next" ${cur===EX.length-1?'disabled':''}>Next →</button></div>`:''}`;
}
let qi=0, seen=new Set(), t2=0;
const CLOCK='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>';
function qStep(){
 const e=EX[cur],[q,a]=e.qs[qi],m=QM[qi],last=qi===2;
 return `<div class="qsteps">${QM.map((x,i)=>`<button data-qi="${i}" class="${i===qi?'on':''}${seen.has(i)&&i!==qi?' seen':''}"><span>Question ${i+1}</span><small>${x.t} seconds</small></button>`).join('')}</div>
 <div class="qcard${last?' long':''}">
  <div class="qtop"><div class="qhead"><span class="qpill">Q${m.n}</span>Question ${qi+1} of 3 · ${m.type}</div><span class="time">${CLOCK}<b>${m.t}</b>seconds to answer</span></div>
  <div class="qbig"><p>${linkQ(q)}</p><button class="say" data-say="q${qi}" aria-label="Listen to the question">${I.spk}</button></div>
  <div class="tip">${I.bulb}<span>${m.tip}</span></div>
  <div class="speak" id="speak"><button class="btn black sm" id="speakGo">${I.play} Answer now · ${m.t} sec</button><span class="rec"></span><div class="sbar"><i id="sbarI"></i></div><span class="snum" id="snum">${m.t}s</span></div>
  <div class="ans${hideA?' hid':''}"><div class="qhead">Possible answer</div>
   <div class="qtext"><p>${annotate(a)}</p><button class="say" data-say="a${qi}" aria-label="Listen to the possible answer">${I.spk}</button></div>
   <div class="reveal"><span>${I.eye} Show answer</span></div></div>
  <div class="qa-legend"><span><mark class="f">green</mark> facts from the document</span><span><mark class="p">blue</mark> phrases worth copying</span></div>
  <div class="qnav"><button class="btn sm" id="qPrev" ${qi===0?'disabled':''}>← Previous question</button>${last?`<button class="btn green" id="qFinish">Finish ✓</button>`:`<button class="btn black" id="qNext">Next question →</button>`}</div>
 </div>`;
}
function finishView(){
 return `<div class="qcard finish"><div class="chk">✓</div><h3>Set complete!</h3><p>You answered all three questions. Try the timed practice to simulate the real test, or move on to the next document.</p>
  <div class="row"><button class="btn sm" id="again">↺ Start again</button><button class="btn black sm" id="runIt">${I.play} Timed practice</button>${cur<EX.length-1?`<button class="btn green sm" id="nextDoc">Next document →</button>`:''}</div></div>`;
}
function renderQA(){t2++;$('#qa').innerHTML=qaShell(qi>2?finishView():qStep(),false);bindQA()}
function goQ(i){seen.add(qi);qi=i;hush();renderQA();const c=$('.qsteps')||$('.qcard');if(c&&c.getBoundingClientRect().top<0)c.scrollIntoView({behavior:'smooth',block:'start'})}
function speakTimer(){
 const sec=QM[qi].t,my=++t2,sp=$('#speak'),bar=$('#sbarI'),n=$('#snum'),go=$('#speakGo');
 sp.classList.remove('over');sp.classList.add('running');go.innerHTML='↺ Restart';
 const end=performance.now()+sec*1000;
 (function tick(){if(my!==t2||!document.body.contains(bar))return;const left=Math.max(0,end-performance.now());
  bar.style.transform=`scaleX(${left/(sec*1000)})`;n.textContent=Math.ceil(left/1000)+'s';
  if(left>0)return requestAnimationFrame(tick);
  sp.classList.remove('running');sp.classList.add('over');n.textContent='Time’s up!';go.innerHTML=`${I.play} Try again`;
  const a=$('#qa .ans');if(a)a.classList.remove('hid')})();
}
function bindQA(){
 const e=EX[cur];
 $('#qa').querySelectorAll('[data-say]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();const k=b.dataset.say;speak(k==='intro'?e.intro:k[0]==='q'?e.qs[+k[1]][0]:e.qs[+k[1]][1],.95,b)});
 $('#qa').querySelectorAll('.ans').forEach(a=>a.onclick=()=>{if(a.classList.contains('hid'))a.classList.remove('hid')});
 $('#hideA').onchange=ev=>{hideA=ev.target.checked;store.set('hide2',hideA);$('#qa').querySelectorAll('.ans').forEach(a=>a.classList.toggle('hid',hideA))};
 $('#startRun').onclick=startRun;
 $('#qa').querySelectorAll('[data-qi]').forEach(b=>b.onclick=()=>goQ(+b.dataset.qi));
 const on=(id,f)=>{const el=$('#'+id);if(el)el.onclick=f};
 on('speakGo',speakTimer);on('qPrev',()=>goQ(qi-1));on('qNext',()=>goQ(qi+1));
 on('qFinish',()=>{seen.add(2);qi=3;done.add(e.id);store.set('done',[...done]);renderGroups(false);keepVisible();renderQA();toast('Nice work! Set marked as done')});
 on('again',()=>{qi=0;seen.clear();renderQA()});on('runIt',startRun);on('nextDoc',()=>select(cur+1));
}

/* timed practice */
let token=0,skip=false,opt={voice:canSpeak,showQ:true};
function stopRun(){token++;t2++;hush()}
function startRun(){
 stopRun();closeCard();
 $('#qa').innerHTML=qaShell(`<div class="run"><div class="run-intro"><b>How the timed practice works</b><ol><li>You get <b>45 seconds</b> to read the document.</li><li>You hear the caller and each question.</li><li>After <b>3 seconds</b> to prepare, answer out loud: 15, 15 and 30 seconds.</li></ol></div>
  <div class="run-opts">
   <label class="switch"><input type="checkbox" id="oV" ${opt.voice?'checked':''} ${canSpeak?'':'disabled'}><span class="tr"></span>Read the questions aloud${canSpeak?'':' (not available here)'}</label>
   <label class="switch"><input type="checkbox" id="oS" ${opt.showQ?'checked':''}><span class="tr"></span>Show the question text (the real test is audio only)</label></div>
  <div style="display:flex;gap:8px;align-self:flex-start"><button class="btn green" id="go">${I.play} Start</button><button class="btn" id="cancel">Cancel</button></div></div>`,false);
 bindQA();
 $('#oV').onchange=ev=>opt.voice=ev.target.checked;$('#oS').onchange=ev=>opt.showQ=ev.target.checked;
 $('#go').onclick=runExam;$('#cancel').onclick=()=>{stopRun();renderQA()};
}
const STEPS=['Read','Q8','Q9','Q10'];const R=80,C=2*Math.PI*R;
function runView({step,phase,title,q,rec,cls,listen}){
 $('#qbody').innerHTML=`<div class="run"><div class="run-steps">${STEPS.map((s,i)=>`<div class="${i<step?'past':i===step?'cur':''}">${s}</div>`).join('')}</div>
  <div class="run-phase">${rec?'<span class="rec"></span>':''}${phase}</div><div class="run-title">${title}</div>
  ${listen?`<div class="wave"><i></i><i></i><i></i><i></i><i></i></div>`:`<div class="ringc ${cls||''}"><svg width="180" height="180" viewBox="0 0 180 180"><circle class="bg" cx="90" cy="90" r="${R}" fill="none" stroke-width="9"/><circle class="fg" id="arc" cx="90" cy="90" r="${R}" fill="none" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg><div class="num" id="secs"></div></div>`}
  ${q!==undefined?`<div class="run-q${q===null?' audio':''}">${q===null?'Listen carefully. In the real test the question is audio only.':linkQ(q)}</div>`:''}
  <div style="display:flex;gap:8px"><button class="btn sm" id="skipB">Skip →</button><button class="btn sm" id="stopB">Stop</button></div></div>`;
 $('#skipB').onclick=()=>{skip=true;hush()};$('#stopB').onclick=()=>{stopRun();renderQA()};
}
function countdown(sec,my){return new Promise((res,rej)=>{skip=false;const end=performance.now()+sec*1000;
 const tick=()=>{if(my!==token)return rej(0);const left=Math.max(0,end-performance.now());const s=$('#secs'),a=$('#arc');
  if(s)s.textContent=Math.ceil(left/1000);if(a)a.style.strokeDashoffset=C*(1-left/(sec*1000));
  if(left<=0||skip){skip=false;return res()}requestAnimationFrame(tick)};tick()})}
async function say(t,my){skip=false;if(!opt.voice)return;await speak(t);if(my!==token)throw 0}
async function runExam(){
 const my=++token,e=EX[cur],audio=opt.voice&&!opt.showQ;
 try{
  runView({step:0,phase:'Step 1',title:'Read the document'});await countdown(45,my);
  runView({step:1,phase:'Incoming call',title:'Listen to the caller',q:audio?null:plain(e.intro),listen:true});
  if(opt.voice)await say(e.intro,my);else await new Promise((r,j)=>setTimeout(()=>my===token?r():j(0),3500));
  for(let i=0;i<3;i++){
   const qt=audio?null:e.qs[i][0];
   runView({step:i+1,phase:`Question ${QM[i].n}`,title:'Listen',q:qt,listen:true});
   if(opt.voice){await say(e.qs[i][0],my);if(i===2){await new Promise(r=>setTimeout(r,600));if(my!==token)throw 0;await say(e.qs[i][0],my)}}
   else await new Promise((r,j)=>setTimeout(()=>my===token?r():j(0),2500));
   runView({step:i+1,phase:`Question ${QM[i].n}`,title:'Get ready',q:qt,cls:'prep'});await countdown(3,my);
   runView({step:i+1,phase:`Question ${QM[i].n} · speak now`,title:'Answer out loud',q:qt,rec:true,cls:'speak'});await countdown(QM[i].t,my);
  }
  hideA=false;qi=0;renderQA();toast('Finished! Now compare with the possible answers');
 }catch(err){}
}

/* word card */
let card=null,activeW=null;
function openCard(el){
 const k=el.dataset.k,g=G[k];if(!g)return;
 if(activeW===el){closeCard();return}
 closeCard();activeW=el;el.classList.add('active');
 const c=document.createElement('div');c.className='wcard';c.setAttribute('role','dialog');c.setAttribute('aria-label',g[0]);
 const on=saved.has(k);
 c.innerHTML=`<div class="wc-top"><div><div class="wc-word">${g[0]}</div><span class="wc-pos">${g[1]}</span></div><button class="x" aria-label="Close">${I.x}</button></div>
  <div class="wc-es"><small>In Spanish</small><b>${g[2]}</b></div><p class="wc-def">${g[3]}</p><p class="wc-ex">${g[4]}</p>
  <div class="wc-act"><button class="wc-say">${I.spk} Listen</button><button class="wc-save${on?' on':''}">${on?'✓ Saved':'Save word'}</button></div>`;
 document.body.appendChild(c);card=c;
 const r=el.getBoundingClientRect();
 if(innerWidth<640)c.classList.add('sheet');
 else{const cw=c.offsetWidth,ch=c.offsetHeight;
  let left=Math.max(12,Math.min(r.left+r.width/2-cw/2,innerWidth-cw-12));
  const below=r.bottom+ch+18<innerHeight||r.top-ch-18<10;
  c.style.left=(left+scrollX)+'px';c.style.top=((below?r.bottom+12:r.top-ch-12)+scrollY)+'px';
  const ax=Math.max(20,Math.min(cw-20,r.left+r.width/2-left));
  c.style.setProperty('--ax',ax+'px');c.classList.add(below?'below':'above');c.style.transformOrigin=`${ax}px ${below?'0':'100%'}`}
 requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.add('in')));
 c.querySelector('.x').onclick=closeCard;
 c.querySelector('.wc-say').onclick=()=>speak(g[0]+'. '+g[4],.9);
 c.querySelector('.wc-save').onclick=ev=>{toggleSave(k);const b=ev.currentTarget,s=saved.has(k);b.classList.toggle('on',s);b.textContent=s?'✓ Saved':'Save word'};
}
function closeCard(){if(card){const c=card;c.classList.remove('in');setTimeout(()=>c.remove(),220);card=null}if(activeW){activeW.classList.remove('active');activeW=null}}
function toggleSave(k){saved.has(k)?saved.delete(k):saved.add(k);store.set('saved',[...saved]);
 document.querySelectorAll(`.w[data-k="${k}"]`).forEach(w=>w.classList.toggle('saved',saved.has(k)));$('#wcount').textContent=saved.size;
 if(saved.has(k))toast('Word saved');if($('#drawer').classList.contains('on'))renderDrawer()}
document.addEventListener('click',e=>{const w=e.target.closest('.w');if(w){openCard(w);return}if(card&&!e.target.closest('.wcard'))closeCard()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeCard();closeDrawer()}const w=e.target.closest&&e.target.closest('.w');if(w&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openCard(w)}});
addEventListener('resize',()=>{if(card&&!card.classList.contains('sheet'))closeCard()});

/* saved words */
let fi=0;
function renderDrawer(){
 const list=[...saved].filter(k=>G[k]);
 if(!list.length){$('#dbody').innerHTML='<div class="empty">No saved words yet.<br>Click a highlighted word and choose “Save word”.</div>';return}
 fi=Math.min(fi,list.length-1);const g=G[list[fi]];
 $('#dbody').innerHTML=`<div class="flash" id="flash"><div class="flash-in"><div class="face f1"><b>${g[0]}</b><small>Click to flip</small></div><div class="face f2"><b>${g[2]}</b><p>${g[3]}</p></div></div></div>
  <div class="fnav"><button class="btn sm" id="fp">← Prev</button><span>${fi+1} / ${list.length}</span><button class="btn sm" id="fn">Next →</button></div>
  ${list.map(k=>`<div class="witem"><b>${G[k][0]}</b><span>${G[k][2]}</span><button class="say" data-s="${k}" aria-label="Listen">${I.spk}</button><button class="x" data-d="${k}" aria-label="Remove">${I.x}</button></div>`).join('')}`;
 $('#flash').onclick=()=>$('#flash').classList.toggle('flip');
 $('#fp').onclick=()=>{fi=(fi-1+list.length)%list.length;renderDrawer()};$('#fn').onclick=()=>{fi=(fi+1)%list.length;renderDrawer()};
 $('#dbody').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>speak(G[b.dataset.s][0],.85,b));
 $('#dbody').querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>toggleSave(b.dataset.d));
}
function closeDrawer(){$('#drawer').classList.remove('on');$('#scrim').classList.remove('on')}
$('#openWords').onclick=()=>{closeCard();renderDrawer();$('#drawer').classList.add('on');$('#scrim').classList.add('on')};
$('#closeWords').onclick=closeDrawer;$('#scrim').onclick=closeDrawer;

/* init */
$('#wcount').textContent=saved.size;

/* ===== clickable hard words inside questions (A2 support) ===== */
const LINK=[];Object.entries(G).forEach(([k,g])=>(g[5]||[g[0]]).forEach(f=>{if(!/[()]/.test(f))LINK.push([f,k])}));
LINK.sort((a,b)=>b[0].length-a[0].length);
const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const LRE=new RegExp('\\b('+LINK.map(([f])=>reEsc(f).replace(/’/g,"['’]")+'(?:s|es)?').join('|')+')(?![\\w-])','gi');
const LMAP=new Map(LINK.map(([f,k])=>[f.toLowerCase(),k]));
function linkWords(html){return html.replace(LRE,m=>{const l=m.toLowerCase().replace(/'/g,'’');const k=LMAP.get(l)||LMAP.get(l.replace(/es$/,''))||LMAP.get(l.replace(/s$/,''));
 return k?`<span class="w${saved.has(k)?' saved':''}" data-k="${k}" tabindex="0" role="button">${m}</span>`:m})}
const linkQ=s=>linkWords(esc(plain(s)));

/* ===== router: Practice / Mystery Envelope ===== */
function route(){
 const h=(location.hash||'').slice(1),m=h==='mystery';
 $('#home').hidden=m;$('#mystery').hidden=!m;
 document.querySelectorAll('.top nav a').forEach(a=>a.classList.toggle('on',m?a.getAttribute('href')==='#mystery':a.getAttribute('href')==='#practice'&&h!==''));
 closeCard();
 if(m){stopRun();t3++;window.scrollTo(0,0);if(!round)newRound()}
 else{t3++;const i=fromHash();if(i>=0&&i!==cur)select(i);if(h==='practice')setTimeout(()=>$('#practice').scrollIntoView(),30)}
}

/* ===== Mystery Envelope game ===== */
/* ===== key facts each surprise question must mention: [label, other ways to say it...] ===== */
const KEYS={
museum:[[['$15 for adults','15'],['$8 for children','8']],
 [['not included','no','not',"isnt"],['$4 extra','4']],
 [['sign up first','sign up','signup','register','registration']],
 [['robot workshop','robot'],['planet show','planet','planetarium'],['science talk','mars','talk']]],
dentist:[[['Mark Lee','mark'],['8:30','830']],
 [['rescheduled to Thursday','rescheduled','moved','thursday','changed']],
 [['10 a.m.','10'],['available','free','open']],
 [['James Park','james','park'],['2 p.m.','2'],['X-rays / check-up','x ray','xray','x rays','check up','checkup']]],
festival:[[['$35','35'],['$45','45'],['at the gate','gate']],
 [['canceled','cancelled','not happening','no longer']],
 [['not allowed','no','not',"cant",'cannot'],['food trucks','food truck','food']],
 [['Rosa Vega','rosa','vega'],['Daniel Brooks','daniel','brooks'],['3:30','330'],['8 p.m.','8']]],
safety:[[['8 a.m.','8'],['Building C','building c','building']],
 [['mandatory','required','must','have to','need to','not optional']],
 [['provided','included','free',"dont need",'no']],
 [['fire safety','fire','evacuation'],['protective equipment','protective','equipment']]],
ferry:[[['$16','16'],['bike','bikes','bicycle'],['$3 extra','3']],
 [['weekends only','weekend','weekends','saturday','sunday'],['9:30 or 3 p.m.','930','3']],
 [['not allowed','no','not',"cant",'cannot'],['vehicles / cars','vehicle','vehicles','car','cars']],
 [['7 a.m.','7'],['9:30','930'],['arrival times','740','1010']]],
room:[[['Linda Ho','linda'],['client presentation','presentation','client']],
 [['available','free','open'],['canceled','cancelled']],
 [['projector','yes'],['front desk','front desk','desk'],['one day ahead','one day','a day','day ahead','day before']],
 [['11:30 to 1','1130'],['4 to 5','4','5'],['canceled call','canceled','cancelled','free']]]
};

let round=null,solved=new Set(),curCase=-1,caseQ={},t3=0;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function newRound(){round=shuffle([...CASES.keys()]).slice(0,3);solved=new Set();curCase=-1;caseQ={};t3++;$('#case').hidden=true;$('#win').innerHTML='';$('#party').innerHTML='';renderEnvs(true)}
const caseNo=n=>'00'+(n+1);
function renderEnvs(animate,justSolved){
 $('#envs').innerHTML=round.map((ci,n)=>{const isS=solved.has(n)&&n!==justSolved;
  return `<button class="env${isS||n===justSolved?' open':''}${isS?' solved':''}${n===curCase?' open active':''}" data-n="${n}" style="--d:${animate?n*110:0}ms${animate?'':';animation:none'}" aria-label="Open case ${caseNo(n)}">
   <span class="env-back"></span>
   <span class="env-letter"><small>CASE ${caseNo(n)}</small><b>${CASES[ci].title}</b><i></i><i></i><i></i></span>
   <span class="env-front"><span class="env-label">CASE<b>${caseNo(n)}</b></span><span class="stamp">CONFIDENTIAL</span></span>
   <span class="env-flap"></span><span class="seal">?</span><span class="solved-stamp">SOLVED</span></button>`}).join('');
 $('#score').innerHTML=`Cases solved <span class="dots">${[0,1,2].map(n=>`<i class="${solved.has(n)?'on':''}"></i>`).join('')}</span> ${solved.size} / 3`;
 if(justSolved!==undefined)requestAnimationFrame(()=>requestAnimationFrame(()=>{const e=$(`.env[data-n="${justSolved}"]`);if(e)e.classList.add('solved')}));
}
$('#envs').addEventListener('click',e=>{const b=e.target.closest('.env');if(!b)return;openEnvelope(+b.dataset.n,b)});
function openEnvelope(n,el){
 const my=++t3;hush();closeCard();
 document.querySelectorAll('.env.active').forEach(x=>{x.classList.remove('active');if(!solved.has(+x.dataset.n))x.classList.remove('open')});
 curCase=n;el.classList.add('open','active');
 setTimeout(()=>{if(my===t3)showCase(n)},950);
}
function showCase(n){
 const my=++t3,c=CASES[round[n]];
 if(caseQ[n]===undefined)caseQ[n]=Math.floor(Math.random()*c.qs.length);
 $('#case').hidden=false;
 $('#case').innerHTML=`<div class="wrap"><div class="stage">
  <div class="case-head"><div><span class="case-tag"><i></i>CASE ${caseNo(n)} · OPEN</span><h2>${c.title}</h2></div>
   <div class="tools"><button class="btn sm" id="backEnv">← Back to envelopes</button></div></div>
  <div class="readbar" id="readbar"><div class="lbl">Reading time<small>Study the schedule. A surprise question is coming.</small></div><div class="sbar"><i id="rbarI"></i></div><span class="snum" id="rnum">45s</span><button class="btn green sm" id="ready">I’m ready →</button></div>
  <div class="desk"><p class="desk-hint"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11V5a2 2 0 1 1 4 0v6m0-2a2 2 0 1 1 4 0v3m0-1a2 2 0 1 1 4 0v4a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3l-3-5a2 2 0 0 1 3.4-2l1.6 2"/></svg>Click any <span class="tap">highlighted</span> word to see what it means.</p><div class="swap">${docHTML(c)}</div></div>
  <div id="caseQ"><div class="mystery-q"><div class="big">?</div><b>Surprise question</b><p>It will appear when the reading time ends, or when you click “I’m ready”.</p></div></div>
 </div></div>`;
 $('#backEnv').onclick=backToEnvs;
 $('#ready').onclick=()=>revealCase(n);
 setTimeout(()=>$('#case').scrollIntoView({behavior:'smooth',block:'start'}),60);
 const sec=45,end=performance.now()+sec*1000,bar=$('#rbarI'),num=$('#rnum');
 (function tick(){if(my!==t3||!document.body.contains(bar))return;const left=Math.max(0,end-performance.now());
  bar.style.transform=`scaleX(${left/(sec*1000)})`;num.textContent=Math.ceil(left/1000)+'s';
  if(left>0)return requestAnimationFrame(tick);revealCase(n)})();
}
function revealCase(n){
 t3++;const c=CASES[round[n]],[q,a,ty]=c.qs[caseQ[n]],m=QM[ty];
 const rb=$('#readbar');if(rb)rb.remove();
 $('#caseQ').innerHTML=`<div class="flipin">
  <div class="caller" style="margin-top:0"><span class="ava">${I.phone}</span><div><div class="who">Incoming call</div><p>${linkQ(c.intro)}</p></div><button class="say" id="mIntro" aria-label="Listen to the caller">${I.spk}</button></div>
  <div class="qcard${ty===2?' long':''}" style="margin-top:12px">
   <div class="qtop"><div class="qhead"><span class="qpill q">?</span>Surprise question · ${m.type}</div><span class="time">${CLOCK}<b>${m.t}</b>seconds to answer</span></div>
   <div class="qbig"><p>${linkQ(q)}</p><button class="say" id="mSay" aria-label="Listen to the question">${I.spk}</button></div>
   <div class="tip">${I.bulb}<span>${m.tip}</span></div>
   <div class="speak mic" id="mSpeak"><button class="btn black sm" id="mGo">${MIC} Answer now · ${m.t} sec</button><span class="rec"></span><div class="sbar"><i id="mBar"></i></div><span class="snum" id="mNum">${m.t}s</span></div><div class="heard" id="heard"></div><div id="verdict"></div>
   <div class="qnav"><button class="btn sm" id="another">↻ Another question</button><button class="btn green" id="solve" disabled title="Answer the question first">Case solved ✓</button></div>
  </div></div>`;
 $('#mIntro').onclick=ev=>speak(c.intro,.95,ev.currentTarget);
 $('#mSay').onclick=ev=>speak(q,.95,ev.currentTarget);
 $('#another').onclick=()=>{caseQ[n]=(caseQ[n]+1+Math.floor(Math.random()*(c.qs.length-1)))%c.qs.length;hush();revealCase(n)};
 $('#solve').onclick=()=>solveCase(n);
 $('#mGo').onclick=()=>answerCase(n,m.t);
 if(opt.voice&&canSpeak)setTimeout(()=>speak(q,.95,$('#mSay')),450);
}
function backToEnvs(){t3++;hush();closeCard();curCase=-1;$('#case').hidden=true;renderEnvs(false);$('#mystery').scrollIntoView({behavior:'smooth'})}
function solveCase(n){
 t3++;hush();closeCard();const first=!solved.has(n);solved.add(n);curCase=-1;$('#case').hidden=true;
 renderEnvs(false,first?n:undefined);$('#mystery').scrollIntoView({behavior:'smooth'});
 toast(`Case ${caseNo(n)} solved!`);
 if(solved.size===3&&first)setTimeout(party,500);
}
function party(){
 const cols=['#2B8A6A','#7DD3F5','#FFFFFF','#F2C14E'];
 $('#party').innerHTML=Array.from({length:70},()=>`<i style="left:${Math.random()*100}%;background:${cols[Math.floor(Math.random()*4)]};animation-duration:${2+Math.random()*2.5}s;animation-delay:${Math.random()*.8}s;transform:rotate(${Math.random()*360}deg)"></i>`).join('');
 $('#win').innerHTML=`<div class="win"><div><b>All three cases solved!</b><p>Great detective work. Play a new round to get three different envelopes.</p></div><button class="btn" id="again2">↻ New round</button></div>`;
 $('#again2').onclick=newRound;
 setTimeout(()=>{$('#party').innerHTML=''},5500);
}
$('#newRound').onclick=newRound;

/* ===== speak & check: speech recognition where the browser allows it, self-check otherwise ===== */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
const MIC='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>';
const NW={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
function norm(s){
 const t=s.toLowerCase().replace(/[’']/g,'').replace(/a\.\s?m\.?/g,'am').replace(/p\.\s?m\.?/g,'pm').replace(/o\s?clock/g,' ').replace(/[$%]/g,' ').replace(/-/g,' ').replace(/[,;!?.]/g,' | ').replace(/[^a-z0-9:| ]/g,' ');
 const out=[];let num=null,last=null;const flush=()=>{if(num!==null){out.push(String(num));num=null;last=null}};
 for(const w of t.split(/\s+/).filter(Boolean)){
  if(w in NW){const v=NW[w];
   if(num!==null&&(last===100||last===1000)&&v<100){num+=v;last=v}
   else if(num!==null&&last>=20&&last<100&&last%10===0&&v<10){num+=v;last=v}
   else{flush();num=v;last=v}}
  else if(w==='hundred'&&num!==null){num*=100;last=100}
  else if(w==='thousand'&&num!==null){num*=1000;last=1000}
  else if(w==='and'&&(last===100||last===1000)){}
  else if(w==='|'){flush()}
  else{flush();out.push(w)}}
 flush();
 return out.join(' ').replace(/\b(\d{1,2}):(\d{2})\b/g,'$1$2').replace(/\b(\d{1,2}) ([0-5]\d)\b/g,'$1$2').replace(/\b(dollars?|bucks|percent)\b/g,' ').replace(/\s+/g,' ').trim();
}
let A=null;
function answerCase(n,sec){
 if(A&&A.running){A.finish();return}
 hush();const my=++t3,c=CASES[round[n]],keys=KEYS[c.id][caseQ[n]];
 const sp=$('#mSpeak'),go=$('#mGo'),bar=$('#mBar'),num=$('#mNum'),heard=$('#heard'),solve=$('#solve');
 sp.classList.remove('over');sp.classList.add('running');go.innerHTML='■ Stop &amp; check';$('#verdict').innerHTML='';solve.disabled=true;solve.classList.remove('ready');
 const st=A={running:true,text:'',fatal:SR?null:'unsupported',rec:null};
 const show=h=>{heard.classList.add('on');heard.innerHTML=h};
 const noMic=()=>show('<small>Microphone</small><i>The microphone isn’t available here. Keep answering out loud, then check yourself at the end.</i>');
 if(SR){show('<small>We heard</small><span class="listening"><span class="rec"></span>Listening… speak now</span>');
  try{const r=st.rec=new SR();r.lang='en-US';r.continuous=true;r.interimResults=true;let fin='';
   r.onresult=e=>{let it='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=t+' ';else it+=t}st.text=fin+it;show('<small>We heard</small>'+esc(st.text))};
   r.onerror=e=>{if(e.error!=='no-speech'&&e.error!=='aborted')st.fatal=e.error};
   r.onend=()=>{if(st.running&&!st.fatal&&my===t3){try{r.start()}catch(_){}}};
   r.start()}catch(e){st.fatal='unsupported'}}
 let shown=false;if(st.fatal){shown=true;noMic()}
 const end=performance.now()+sec*1000;
 st.finish=()=>{if(!st.running)return;st.running=false;sp.classList.remove('running');sp.classList.add('over');num.textContent='Done';go.innerHTML=`${MIC} Try again`;
  if(st.rec){try{st.rec.stop()}catch(_){}}
  setTimeout(()=>{if(my===t3)verdict(keys,st)},st.rec&&!st.fatal?900:60)};
 (function tick(){
  if(my!==t3||!document.body.contains(bar)){st.running=false;if(st.rec){try{st.rec.abort()}catch(_){}}return}
  if(!st.running)return;
  if(st.fatal&&!shown){shown=true;noMic()}
  const left=Math.max(0,end-performance.now());bar.style.transform=`scaleX(${left/(sec*1000)})`;num.textContent=Math.ceil(left/1000)+'s';
  if(left>0)return requestAnimationFrame(tick);st.finish()})();
}
function verdict(keys,st){
 const v=$('#verdict'),solve=$('#solve');if(!v)return;
 const silent=!st.fatal&&!st.text.trim();
 if(silent){const h=$('#heard');if(h)h.innerHTML='<small>We heard</small><i>(nothing)</i>'}
 if(st.fatal||silent){
  v.innerHTML=`<div class="check self"><h4>${silent?'We couldn’t hear you, so check yourself':'Check yourself'}</h4><p>Did your answer include these key facts? Tick each one you said. ${silent?'If you want automatic checking, make sure the microphone is allowed and press “Try again”.':'For automatic checking, open the page in Chrome or Edge and allow the microphone.'}</p><ul>${keys.map((k,i)=>`<li class="cb" style="--d:${i*80}ms"><label><input type="checkbox" class="kf">${esc(k[0])}</label></li>`).join('')}</ul></div>`;
  const boxes=[...v.querySelectorAll('.kf')],upd=()=>{const all=boxes.every(b=>b.checked);solve.disabled=!all;solve.classList.toggle('ready',all)};boxes.forEach(b=>b.onchange=upd);return}
 const t=' '+norm(st.text)+' ',hits=keys.map(k=>k.some(a=>t.includes(' '+norm(a)+' '))),pass=hits.every(Boolean);
 v.innerHTML=`<div class="check ${pass?'pass':'fail'}"><h4>${pass?'Case cracked! You gave all the key facts.':'Not yet. Some key facts are missing.'}</h4>
  <ul>${keys.map((k,i)=>`<li class="${hits[i]?'ok':'no'}" style="--d:${i*80}ms">${hits[i]?'✓':'✗'} ${esc(k[0])}</li>`).join('')}</ul>${pass?'':'<p style="margin:10px 0 0">Look at the schedule again and press “Try again”.</p>'}</div>`;
 solve.disabled=!pass;solve.classList.toggle('ready',pass);
 if(pass)toast('Correct! You can close the case')
}


const fromHash=()=>EX.findIndex(e=>e.id===(location.hash||'').slice(1));
const h0=fromHash();cur=h0>=0?h0:0;grp=EX[cur].g;
renderGroups(true);renderDoc();renderQA();keepVisible();
if(h0>=0)setTimeout(()=>$('#practice').scrollIntoView(),50);
addEventListener('hashchange',route);
route();
