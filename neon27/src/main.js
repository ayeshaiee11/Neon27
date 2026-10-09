import './styles.css';

const W=960,H=540,GY=440,PX=250,LEVEL=22000,TW=1600,$=s=>document.querySelector(s),cv=$('#cv'),c=cv.getContext('2d'),st=$('#stage');
const rnd=(a,b)=>a+Math.random()*(b-a);let R=1;
function resize(){const s=Math.min(innerWidth/W,innerHeight/H);st.style.setProperty('--s',s);R=Math.max(1,Math.min(2,(devicePixelRatio||1)*s));cv.width=W*R;cv.height=H*R}
addEventListener('resize',resize);resize();
if('ontouchstart' in window||matchMedia('(pointer:coarse)').matches)st.classList.add('tc');
// ---------- save / skins / achievements
let S={best:0,chips:0,wins:0,unlocked:['cyan'],skin:'cyan',ach:[]};
try{Object.assign(S,JSON.parse(localStorage.getItem('nad')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('nad',JSON.stringify(S))}catch(e){}};
const SK={cyan:{n:'VOLT',c:'#00f0ff',a:'#ff2bd6',req:'Default'},mag:{n:'VIPER',c:'#ff2bd6',a:'#00f0ff',req:'Escape the grid'},gold:{n:'AURUM',c:'#ffd23a',a:'#ff2a55',req:'Find 3 hidden chips'},ghost:{n:'GHOST',c:'#e8e0ff',a:'#9b5cff',req:'Score 5000'}};
const RULES={mag:()=>S.wins>=1,gold:()=>S.chips>=3,ghost:()=>S.best>=5000};
const ACH=[['UNTOUCHABLE',(g,w)=>w&&g.hits==0],['OVERDRIVER',g=>g.odu>=2],['SHARD HOARDER',g=>g.shards>=120],['DRONE HUNTER',g=>g.kills>=5],['DATA THIEF',g=>g.chips>=1],['COMBO KING',g=>g.maxm>=5],['ESCAPE ARTIST',(g,w)=>w]];
function renderSkins(){const el=$('#skins');el.innerHTML='';for(const k in SK){const s=SK[k],u=S.unlocked.includes(k),b=document.createElement('button');b.className='sk'+(S.skin==k?' on':'')+(u?'':' lock');b.style.setProperty('--c',s.c);b.innerHTML=`<i></i>${s.n}<small>${u?'UNLOCKED':'🔒 '+s.req}</small>`;b.onclick=()=>{if(!u)return;S.skin=k;save();renderSkins();SFX.ui()};el.appendChild(b)}$('#best').textContent='BEST '+S.best}
// ---------- account / API
const TK='nad_token';let ME=null,authMode='login';
const tok=v=>{try{return v===undefined?localStorage.getItem(TK):v?localStorage.setItem(TK,v):localStorage.removeItem(TK)}catch(e){}};
async function api(p,o={}){const h={'Content-Type':'application/json'},t=tok();if(t)h.Authorization='Bearer '+t;
 const r=await fetch('/api'+p,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).catch(()=>{throw new Error('Server offline')});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Server error');return j}
function logout(){tok('');ME=null;renderAcct();if(state=='paused'||state=='end')toTitle();SFX.ui()}
function renderAcct(){document.querySelectorAll('.lo').forEach(b=>b.classList.toggle('hid',!ME));$('#who').textContent=ME?'◉ '+ME.username.toUpperCase()+' · '+ME.wins+' WINS':'◉ GUEST';$('#blogin').classList.toggle('hid',!!ME);$('#blogout').classList.toggle('hid',!ME)}
async function loadMe(){if(!tok())return;try{ME=(await api('/me')).user}catch(e){if(e.message!='Server offline')tok('')}renderAcct()}
function authUI(mode){authMode=mode;const l=mode=='login';$('#asub').textContent=l?'LOGIN':'REGISTER';$('#asw').textContent=l?'NEW RUNNER':'HAVE AN ID';$('#ae').textContent='';$('#ap').autocomplete=l?'current-password':'new-password'}
async function doAuth(){const e=$('#ae');e.textContent='';try{const r=await api('/'+authMode,{method:'POST',body:{username:$('#au').value.trim(),password:$('#ap').value}});tok(r.token);ME=r.user;$('#ap').value='';renderAcct();SFX.chip();show('title')}catch(x){e.textContent=x.message.toUpperCase()}}
async function showBoard(){show('board');const ol=$('#bl');ol.innerHTML='<li>LOADING…</li>';try{const rows=await api('/leaderboard');ol.innerHTML='';if(!rows.length)ol.innerHTML='<li>NO RUNNERS YET — BE FIRST</li>';rows.forEach((r,i)=>{const li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('span'),s=document.createElement('small');a.textContent=(i+1)+'. '+r.username;s.textContent=' '+r.wins+'W ';b.append(s,String(r.best_score));li.append(a,b);ol.append(li)})}catch(e){ol.innerHTML='<li>'+e.message.toUpperCase()+'</li>'}}
async function showBadges(){show('bdg');const bg=$('#bg');bg.textContent='';try{const cat=await api('/badges'),mine=ME?(await api('/me')).badges:[],got=new Set(mine.map(b=>b.code)),all=[...mine,...cat.filter(b=>!got.has(b.code))];
 all.forEach(b=>{const d=document.createElement('div'),i=document.createElement('i'),n=document.createElement('span'),s=document.createElement('small');d.className='bd '+(got.has(b.code)?'got':'lock');i.textContent=b.icon;n.textContent=b.name;s.textContent=b.descr||b.desc;d.append(i,n,s);bg.append(d)});if(!ME)bg.insertAdjacentHTML('afterbegin','<div class="bd" style="grid-column:1/-1">LOG IN TO START COLLECTING</div>')}catch(e){bg.textContent=e.message}}
function badgeReveal(list){if(state!='end')return;const o=document.createElement('div');o.className='bpop';list.forEach((b,i)=>{const d=document.createElement('div'),ic=document.createElement('i'),t=document.createElement('b'),n=document.createElement('strong'),s=document.createElement('small');d.className='bcard';d.style.animationDelay=i*.25+'s';ic.textContent=b.icon;t.textContent='BADGE UNLOCKED';n.textContent=b.name;s.textContent=b.descr;d.append(ic,t,n,s);o.append(d)});
 const ok=document.createElement('button');ok.className='b';ok.textContent='CLAIM';ok.onclick=()=>o.remove();o.append(ok);$('#end').append(o);SFX.chip();flash=.5;glitch=.5}
async function submitRun(win,fin){const g=G,ea=$('#ea');if(!ME){ea.insertAdjacentHTML('beforeend','<span class="ac">LOG IN FROM THE MENU TO SAVE RUNS &amp; EARN BADGES</span>');return}
 try{const r=await api('/runs',{method:'POST',body:{won:win,score:fin,time:Math.round(g.t),hits:g.hits,shards:g.shards,kills:g.kills,odu:g.odu,chips:g.chips}});ME=r.user;renderAcct();ea.insertAdjacentHTML('beforeend','<span class="ac">RUN SAVED TO YOUR RUNNER ID</span>');if(r.newBadges.length)badgeReveal(r.newBadges)}catch(e){ea.insertAdjacentHTML('beforeend','<span class="ac">RUN NOT SAVED: '+e.message.toUpperCase()+'</span>')}}
// ---------- audio
let AC,mg,mu,sf,muted=false,vol=.7,nextT=0,step=0;
function initAudio(){if(AC){if(AC.state=='suspended')AC.resume();return}try{AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.connect(AC.destination);mu=AC.createGain();mu.gain.value=.5;mu.connect(mg);sf=AC.createGain();sf.gain.value=.7;sf.connect(mg);setVol();nextT=AC.currentTime+.1;setInterval(sched,40)}catch(e){}}
function setVol(){if(mg)mg.gain.value=muted?0:vol*.8;$('#bm').textContent=muted?'🔇':'🔊'}
const mf=m=>440*Math.pow(2,(m-69)/12);
function tone(f,d,type='square',v=.15,sl=0,t=0){if(!AC)return;t=t||AC.currentTime;const o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+sl),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(sf);o.start(t);o.stop(t+d+.02)}
function noise(d,v,hp,dest,t){if(!AC)return;t=t||AC.currentTime;const n=AC.sampleRate*d|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=Math.random()*2-1;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=b;f.type='highpass';f.frequency.value=hp;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(gn);gn.connect(dest||sf);s.start(t)}
function note(f,d,type,v,t,cut){const o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.value=f;let n=o;if(cut){const bf=AC.createBiquadFilter();bf.frequency.value=cut;o.connect(bf);n=bf}gn.gain.setValueAtTime(.0001,t);gn.gain.linearRampToValueAtTime(v,t+.01);gn.gain.exponentialRampToValueAtTime(.001,t+d);n.connect(gn);gn.connect(mu);o.start(t);o.stop(t+d+.05)}
const ROOT=[45,41,36,43],CH=[[0,3,7],[0,4,7],[0,4,7],[0,4,7]];
function sched(){if(!AC||AC.state!='running')return;const pl=state=='play'&&G,od=pl&&G.od>0,ch=pl&&G.chase,spb=60/(od?142:ch?122:104)/4;
 while(nextT<AC.currentTime+.15){const bar=(step>>4)&3,s=step&15,r=ROOT[bar],t=nextT;
  if(s%2==0||s==7||s==15)note(mf(r-12+(s%8==6?12:0)),spb*1.7,'sawtooth',.2,t,od?2200:650);
  if(s%4==0){const o=AC.createOscillator(),gn=AC.createGain();o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(40,t+.14);gn.gain.setValueAtTime(.7,t);gn.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(gn);gn.connect(mu);o.start(t);o.stop(t+.22)}
  if(s%4==2||(od&&s%2==1))noise(.05,.12,7000,mu,t);if(s==4||s==12)noise(.12,.2,2500,mu,t);
  const ar=CH[bar][s%3]+(s&8?12:0)+(s%5==0?12:0);note(mf(r+24+ar),spb*.9,'square',pl?(od?.09:.045):.035,t,od?4000:1800);
  if(s==0)CH[bar].forEach(i=>note(mf(r+12+i),spb*15,'sawtooth',.035,t,900));
  step++;nextT+=spb}}
const SFX={ui:()=>tone(660,.06,'square',.08),jump:n=>{tone(n?300:420,.18,'square',.12,n?420:600)},slide:()=>{noise(.25,.1,1500);tone(200,.2,'sawtooth',.06,-120)},dash:()=>{noise(.22,.18,800);tone(140,.25,'sawtooth',.14,600)},
 shard:n=>{const f=880*Math.pow(1.06,Math.min(n,12));tone(f,.09,'triangle',.14);tone(f*1.5,.12,'sine',.08)},chip:()=>[0,.08,.16,.26].forEach((d,i)=>tone(700*Math.pow(1.26,i),.2,'triangle',.15,0,AC&&AC.currentTime+d)),
 pu:()=>[0,.07,.14].forEach((d,i)=>tone(400*Math.pow(1.5,i),.18,'square',.1,0,AC&&AC.currentTime+d)),hit:()=>{noise(.4,.3,200);tone(120,.35,'sawtooth',.25,-90)},kill:()=>{noise(.3,.2,1000);tone(500,.2,'square',.12,-350)},
 od:()=>{tone(80,1,'sawtooth',.25,900);tone(200,.9,'square',.1,1500);noise(.9,.22,500)},odend:()=>tone(900,.5,'sawtooth',.14,-800),ready:()=>{tone(1000,.1,'square',.1);tone(1500,.25,'square',.1)},
 alarm:()=>{for(let i=0;i<4;i++)tone(i%2?500:760,.22,'sawtooth',.14,0,AC&&AC.currentTime+i*.25)},die:()=>{tone(300,1,'sawtooth',.3,-260);noise(.9,.3,300)},win:()=>[0,3,7,12,16].forEach((k,i)=>tone(mf(60+k),.4,'triangle',.18,0,AC&&AC.currentTime+i*.1))};
for(const k in SFX){const f=SFX[k];SFX[k]=(...a)=>{try{if(AC&&!muted)f(...a)}catch(e){}}}
// ---------- state
let state='title',G,T=0,shake=0,glitch=0,flash=0,MIR=0,lastF='';
const keys={},tch={};
const ST=s=>{state=s;st.dataset.s=s};
function show(id){document.querySelectorAll('.scr').forEach(e=>e.classList.add('hid'));if(id)$('#'+id).classList.remove('hid')}
const mult=()=>Math.min(8,1+(G.combo/6|0)),score=()=>G.sc+(G.x/10|0);
function newGame(){return{x:0,y:GY,vy:0,onG:1,jumps:2,sl:0,slp:0,dash:0,dcd:0,jb:0,hp:3,inv:0,sc:0,shards:0,combo:0,ct:0,maxm:1,od:0,odm:0,odu:0,slow:0,shield:0,boost:0,kills:0,chips:0,hits:0,t:0,speed:340,ents:[],gaps:[],plats:[],gen:700,trail:[],parts:[],rings:[],pops:[],wall:520,chase:0,warn:0,over:0,win:0,chipN:0,odt:0,scarf:Array.from({length:9},()=>[0,0])}}
const pop=(t,col,x,y)=>G.pops.push({x:x??G.x,y:y??G.y-90,t,c:col,l:1});
function burst(x,y,col,n=14,sp=260){for(let i=0;i<n&&G.parts.length<350;i++){const a=Math.random()*6.28,v=rnd(.2,1)*sp;G.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,l:1,c:col,s:rnd(1.5,3.5)})}}
const ring=(col,v=600)=>G.rings.push({x:G.x,y:G.y-30,r:8,l:1,c:col,v});
function chunk(){const g=G,cx=g.gen,d=cx/LEVEL,E=o=>g.ents.push(o);let len=rnd(520,700)-d*90;
 const sh=(x,y,n,arc=0)=>{for(let i=0;i<n;i++)E({t:'shard',x:x+i*34,y:y-(arc?Math.sin(i/Math.max(1,n-1)*Math.PI)*arc:0)})};
 const th=[.19,.49,.79][g.chipN];if(th&&cx>LEVEL*th){g.chipN++;g.plats.push({x:cx+120,y:GY-125,w:180});E({t:'chip',x:cx+210,y:GY-235});sh(cx+130,GY-155,5);g.gen+=len;return}
 const r=Math.random(),x0=cx+180;
 if(cx<900)sh(x0,GY-30,6);
 else if(r<.18){const w=140+d*140;g.gaps.push([x0,x0+w]);sh(x0-20,GY-40,Math.ceil(w/34)+2,120);len+=w*.4}
 else if(r<.36){const n=1+(Math.random()<d?1:0)+(d>.6&&Math.random()<.4?1:0);for(let i=0;i<n;i++)E({t:'bar',x:x0+i*190,y:GY-50,w:34,h:50});sh(x0-30,GY-60,n==1?5:9,100);len+=n*150}
 else if(r<.5){E({t:'las',x:x0,y:0,w:16,h:GY-40});sh(x0-60,GY-18,6);if(d>.5&&Math.random()<.5){E({t:'las',x:x0+280,y:0,w:16,h:GY-40});len+=180}}
 else if(r<.62){g.plats.push({x:x0,y:GY-120,w:240});sh(x0+10,GY-150,6);if(Math.random()<.5)E({t:'bar',x:x0+300,y:GY-50,w:34,h:50})}
 else if(r<.86||(g.chase&&r<.95)){const n=1+(d*2.2|0)+(g.chase?1:0);for(let i=0;i<n;i++){const y=GY-rnd(90,190);E({t:'dr',x:x0+i*140+rnd(0,80),y,by:y,ph:rnd(0,6),ch:0})}sh(x0,GY-110,4)}
 else{E({t:'pu',k:['slow','shield','boost'][rnd(0,3)|0],x:x0,y:GY-70});sh(x0+60,GY-40,5)}
 g.gen+=len}
function addCombo(){G.combo++;G.ct=2.4;G.maxm=Math.max(G.maxm,mult())}
function meter(n){if(G.od>0)return;const was=G.odm<100;G.odm=Math.min(100,G.odm+n);if(was&&G.odm>=100){SFX.ready();pop('OVERDRIVE READY','#ff2bd6')}}
function hurt(){const g=G;if(g.inv>0||g.dash>0||g.od>0||g.win)return;if(g.shield>0){g.shield=0;g.inv=.9;ring('#0ff');SFX.hit();shake=8;pop('SHIELD DOWN','#0ff');return}
 g.hp--;g.hits++;g.combo=0;g.inv=1.3;shake=18;glitch=.35;SFX.hit();burst(g.x,g.y-30,'#ff2a55',20);if(g.chase)g.wall-=110;if(g.hp<=0)end(false)}
function kill(e){const g=G;e.dead=1;g.kills++;addCombo();g.sc+=150*mult();meter(12);burst(e.x,e.y,'#ffd23a',22,330);G.rings.push({x:e.x,y:e.y,r:5,l:1,c:'#ffd23a',v:350});SFX.kill();shake=Math.max(shake,8);pop('+'+150*mult(),'#ffd23a',e.x,e.y-20)}
function end(win){const g=G;if(g.over>0||g.win>0)return;if(win){g.win=1.8;flash=1;SFX.win();for(let i=0;i<5;i++)burst(g.x+rnd(0,300),g.y-rnd(40,200),['#0ff','#f2d','#ff5'][i%3],25,400)}else{g.over=1.4;shake=26;glitch=.9;SFX.die();burst(g.x,g.y-30,'#ff2a55',50,500)}}
function act(a){if(state!='play'||G.over>0)return;const g=G;
 if(a=='jump')g.jb=.13;else if(a=='slide')g.slp=1;
 else if(a=='dash'){if(g.dcd<=0){g.dash=.22;g.dcd=1.1;SFX.dash();shake=6;ring('#fff',500)}}
 else if(a=='od'&&g.odm>=100&&g.od<=0){g.od=6.5;g.odu++;flash=1;shake=28;glitch=.7;g.odt=1.5;SFX.od();ring('#0ff',700);ring('#ff2bd6',950);ring('#fff',1200);burst(g.x,g.y-30,'#fff',40,520);g.ents.forEach(e=>{if(e.t=='dr'&&Math.abs(e.x-g.x)<550)kill(e)})}}
function update(rt){const g=G,d=Math.min(1,g.x/LEVEL);let ts=1;if(g.od>0||g.slow>0)ts=(g.od>0&&g.slow>0)?.45:.55;if(g.over>0||g.win>0)ts=.4;const dt=rt*ts;g.t+=rt;
 g.odt=Math.max(0,g.odt-rt);g.warn=Math.max(0,g.warn-rt);parts(dt);
 if(g.over>0){g.over-=rt;if(g.over<=0)showEnd(false);return}
 const fin=g.win>0;if(fin){g.win-=rt;if(g.win<=0){showEnd(true);return}}
 g.inv-=rt;g.dcd-=rt;g.dash-=rt;g.ct-=rt;g.jb-=rt;g.sl-=rt;g.slow-=rt;g.boost-=rt;g.shield-=rt;if(g.ct<=0)g.combo=0;
 if(g.od>0){g.od-=rt;g.odm=Math.max(0,g.od/6.5*100);if(g.od<=0){g.od=0;g.odm=0;glitch=.3;SFX.odend()}}
 const dn=keys.ArrowDown||keys.KeyS||tch.slide;
 if(g.slp){g.slp=0;if(g.onG){if(g.sl<=0)SFX.slide();g.sl=.55}else g.vy=Math.max(g.vy,1000)}if(dn&&g.onG&&g.sl<.15)g.sl=.15;
 if(g.jb>0&&g.jumps>0){g.jb=0;g.vy=g.jumps==2?-800:-720;SFX.jump(g.jumps==2);g.jumps--;g.onG=0;g.sl=0;burst(g.x,g.y,'#8ff',8,160)}
 let sp=330+d*230;if(g.boost>0)sp*=1.4;if(g.od>0)sp*=2.5;if(g.dash>0)sp*=2.2;if(fin)sp=450;g.speed=sp;g.x+=sp*dt;
 if(!fin&&!g.chase&&g.x>LEVEL*.66){g.chase=1;g.warn=3.2;g.wall=520;SFX.alarm();glitch=.6;shake=12}
 if(g.chase&&!fin){g.wall-=14*dt;if(g.boost>0||g.od>0||g.dash>0)g.wall+=60*dt;g.wall=Math.min(g.wall,520);if(g.wall<=0)end(false)}
 if(!fin)while(g.gen<Math.min(g.x+1700,LEVEL-300))chunk();
 const py=g.y;if(g.dash>0)g.vy=0;else g.vy+=2300*dt;g.y+=g.vy*dt;
 const inGap=g.gaps.some(a=>g.x>a[0]+12&&g.x<a[1]-12);let land=0;
 for(const p of g.plats)if(g.vy>=0&&g.x+12>p.x&&g.x-12<p.x+p.w&&py<=p.y+2&&g.y>=p.y){g.y=p.y;land=1}
 if(!inGap&&g.y>=GY&&py<=GY+2){g.y=GY;land=1}
 if(land){if(!g.onG){burst(g.x,g.y,'#99f',6,120)}g.onG=1;g.vy=0;g.jumps=2}else g.onG=0;
 if(g.y>GY+90&&!fin){const gp=g.gaps.find(a=>g.x>a[0]-30&&g.x<a[1]+60);if(gp)g.x=gp[1]+40;g.y=GY;g.vy=0;g.onG=1;g.jumps=2;g.hp--;g.hits++;g.combo=0;g.inv=1.6;shake=18;glitch=.4;SFX.hit();if(g.chase)g.wall-=110;if(g.hp<=0)end(false)}
 if(g.od>0||g.dash>0)g.trail.push({x:g.x,y:g.y,h:g.sl>0?28:60,l:.4});g.trail.forEach(t=>t.l-=rt);g.trail=g.trail.filter(t=>t.l>0);
 const h=g.sl>0?28:60,cy=g.y-h/2;
 for(const e of g.ents){if(e.dead)continue;const dx=e.x-g.x;if(dx>900)continue;
  if(e.t=='shard'||e.t=='chip'||e.t=='pu'){if(g.od>0&&e.t=='shard'&&Math.abs(dx)<240){e.x+=(g.x-e.x)*Math.min(1,dt*9);e.y+=(cy-e.y)*Math.min(1,dt*9)}
   const r=e.t=='shard'?16:24;if(Math.abs(e.x-g.x)<r+10&&Math.abs(e.y-cy)<r+h/2){e.dead=1;
    if(e.t=='shard'){g.shards++;addCombo();g.sc+=10*mult();meter(3.5);if(g.chase)g.wall=Math.min(520,g.wall+7);SFX.shard(g.combo);burst(e.x,e.y,'#0ff',4,120)}
    else if(e.t=='chip'){g.chips++;g.sc+=500;SFX.chip();pop('DATA CHIP FOUND!','#ffd23a');burst(e.x,e.y,'#ffd23a',30,300);ring('#ffd23a')}
    else{if(e.k=='slow')g.slow=5;else if(e.k=='shield')g.shield=14;else g.boost=4.5;SFX.pu();pop(e.k.toUpperCase(),'#fff');ring('#fff',400)}}}
  else if(e.t=='bar'||e.t=='las'){if(!fin&&g.x+13>e.x&&g.x-13<e.x+e.w&&g.y>e.y&&g.y-h<e.y+e.h){if(g.dash>0||g.od>0){e.dead=1;g.sc+=50*mult();addCombo();burst(e.x,e.t=='las'?GY-60:e.y+20,'#ff2a55',20,300);SFX.kill();shake=Math.max(shake,6)}else{e.dead=1;burst(e.x,e.y+20,'#ff2a55',12);hurt()}}}
  else if(e.t=='dr'){e.ph+=dt*2;if(!e.ch&&Math.abs(dx)<520&&dx>-100){e.ch=1;tone(900,.1,'square',.06)}
   if(e.ch){e.y+=(g.y-30-e.y)*Math.min(1,dt*1.7);e.x-=(100+d*60)*dt}else{e.y=e.by+Math.sin(e.ph)*45;e.x+=Math.sin(e.ph*.5)*30*dt}
   if(!fin&&Math.abs(e.x-g.x)<30&&Math.abs(e.y-cy)<h/2+14){if(g.dash>0||g.od>0)kill(e);else{e.dead=1;burst(e.x,e.y,'#ff2a55',16);hurt()}}}}
 g.ents=g.ents.filter(e=>!e.dead&&e.x>g.x-400);g.plats=g.plats.filter(p=>p.x+p.w>g.x-400);g.gaps=g.gaps.filter(a=>a[1]>g.x-400);
 if(!fin&&g.x>=LEVEL+40)end(true)}
function parts(dt){const g=G;for(const p of g.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=500*dt;p.l-=dt*1.6}g.parts=g.parts.filter(p=>p.l>0);
 for(const r of g.rings){r.r+=r.v*dt;r.l-=dt*1.8}g.rings=g.rings.filter(r=>r.l>0);for(const p of g.pops){p.y-=40*dt;p.l-=dt*1.1}g.pops=g.pops.filter(p=>p.l>0)}
function showEnd(win){const g=G;ST('end');const fin=score()+(win?1000+g.hp*500:0),nb=fin>S.best;if(nb)S.best=fin;if(win)S.wins++;S.chips+=g.chips;
 const won=ACH.filter(a=>a[1](g,win)).map(a=>a[0]),na=won.filter(n=>!S.ach.includes(n));S.ach.push(...na);
 const nu=[];for(const k in RULES)if(!S.unlocked.includes(k)&&RULES[k]()){S.unlocked.push(k);nu.push(SK[k].n)}save();
 const t=$('#et');t.textContent=t.dataset.t=win?'ESCAPED THE GRID':'SIGNAL LOST';
 $('#es').innerHTML=`<big>${fin}</big>${nb?'<b style="color:#ffd23a">★ NEW BEST ★</b><br>':'BEST '+S.best+'<br>'}SHARDS ${g.shards} · DRONES ${g.kills} · CHIPS ${g.chips}/3 · DISTANCE ${Math.min(100,g.x/LEVEL*100|0)}%${win?` · BONUS +${1000+g.hp*500}`:''}`;
 $('#ea').innerHTML=won.map(n=>`<span class="ac${na.includes(n)?' n':''}">✓ ${n}</span>`).join('')+nu.map(n=>`<span class="ac n">🔓 SKIN: ${n}</span>`).join('');
 $('#br').textContent=win?'PLAY AGAIN':'RETRY';show('end');glitch=.5;renderSkins();submitRun(win,fin)}
// ---------- flow
function run(){G=newGame();ST('play');show('');glitch=.6;flash=.6;pop('RUN','#0ff',G.x+60,G.y-120);cv.style.filter=''}
function start(){initAudio();SFX.ui();ST('loading');show('load');glitch=1;const L=['> BYPASSING SENTINEL FIREWALL...','> SPOOFING RETINA ID.......OK','> LOADING DISTRICT 27: AFTER DARK','> HUNTER-KILLER DRONES: ARMED','> GOOD LUCK, RUNNER.'];$('#lt').innerHTML=L.map((l,i)=>`<div style="opacity:0;animation:ld2 .1s ${i*.28}s forwards">${l}</div>`).join('')+'<style>@keyframes ld2{to{opacity:1}}</style>';$('#lb').innerHTML='<i></i>';setTimeout(()=>{if(state=='loading')run()},1500)}
function toTitle(){G=newGame();ST('title');show('title');renderSkins();cv.style.filter=''}
function pause(on){if(on&&state=='play'){ST('paused');show('pause')}else if(!on&&state=='paused'){ST('play');show('');last=performance.now()}}
$('#go').onclick=start;$('#br').onclick=run;$('#bmn').onclick=toTitle;$('#pm').onclick=toTitle;$('#rs').onclick=()=>pause(false);$('#bp').onclick=()=>pause(state=='play');
const tm=()=>{muted=!muted;initAudio();setVol();SFX.ui()};$('#bm').onclick=tm;$('#vol').oninput=e=>{vol=e.target.value/100;setVol()};
addEventListener('keydown',e=>{const k=e.code;if(e.target.tagName=='INPUT'){if(e.code=='Enter')doAuth();return}if(['Space','ArrowUp','ArrowDown'].includes(k))e.preventDefault();if(e.repeat)return;keys[k]=1;initAudio();
 if(k=='KeyM')tm();else if(state=='title'&&!$('#title').classList.contains('hid')&&(k=='Enter'||k=='Space'))start();else if(state=='end'&&(k=='Enter'||k=='KeyR'||k=='Space'))run();
 else if(state=='play'){if(['Space','ArrowUp','KeyW'].includes(k))act('jump');else if(['ArrowDown','KeyS'].includes(k))act('slide');else if(['ShiftLeft','ShiftRight','KeyX','KeyK'].includes(k))act('dash');else if(['KeyE','KeyF','KeyQ'].includes(k))act('od');else if(k=='KeyP'||k=='Escape')pause(true)}else if(state=='paused'&&(k=='KeyP'||k=='Escape'))pause(false)});
addEventListener('keyup',e=>{keys[e.code]=0;if(state=='play'&&['Space','ArrowUp','KeyW'].includes(e.code)&&G.vy<-260)G.vy*=.55});
addEventListener('pointerdown',initAudio);addEventListener('blur',()=>pause(true));
document.querySelectorAll('#touch button').forEach(b=>{const a=b.dataset.a;b.addEventListener('pointerdown',e=>{e.preventDefault();if(a=='slide')tch.slide=1;act(a)});const up=()=>{if(a=='slide')tch.slide=0;if(a=='jump'&&state=='play'&&G.vy<-260)G.vy*=.55};['pointerup','pointercancel','pointerleave'].forEach(v=>b.addEventListener(v,up))});
// ---------- rendering assets
function mkTile(seed,minH,maxH,minW,maxW,base,glow,win){const cn=document.createElement('canvas');cn.width=TW;cn.height=H;const x=cn.getContext('2d');let rs=seed;const Q=()=>(rs=(rs*16807)%2147483647)/2147483647;let px=0;
 while(px<TW){let w=minW+Q()*(maxW-minW);if(TW-px<minW+20)w=TW-px;const h=minH+Q()*(maxH-minH),by=GY-h,col=glow[Q()*glow.length|0];x.fillStyle=base;x.fillRect(px,by,w,h);
  const gr=x.createLinearGradient(0,by,0,GY);gr.addColorStop(0,col+'44');gr.addColorStop(.5,'#0000');x.fillStyle=gr;x.fillRect(px,by,w,h);
  x.fillStyle=col;x.shadowColor=col;x.shadowBlur=12;x.fillRect(px,by,w,2);x.fillRect(px,by,1.5,h);x.shadowBlur=0;
  for(let wy=by+10;wy<GY-6;wy+=11)for(let wx=px+6;wx<px+w-6;wx+=9)if(Q()<win){x.globalAlpha=.25+Q()*.6;x.fillStyle=Q()<.6?col:'#ffe9fb';x.fillRect(wx,wy,4,5)}
  x.globalAlpha=1;if(Q()<.35){x.fillStyle=col;x.fillRect(px+w/2,by-26,2,26);x.fillRect(px+w/2-2,by-28,6,3)}px+=w+Q()*6}return cn}
const TL=[[.12,mkTile(7,190,340,60,130,'#0c0722',['#9b5cff','#ff2bd6'],.18)],[.28,mkTile(11,140,270,50,110,'#090519',['#00f0ff','#ff2bd6','#9b5cff'],.25)],[.5,mkTile(19,70,190,50,100,'#06020f',['#00f0ff','#ff2bd6'],.3)]];
const VIG=(()=>{const v=document.createElement('canvas');v.width=W;v.height=H;const x=v.getContext('2d'),g=x.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.65);g.addColorStop(0,'#0000');g.addColorStop(1,'#000000cc');x.fillStyle=g;x.fillRect(0,0,W,H);return v})();
const SCAN=(()=>{const v=document.createElement('canvas');v.width=4;v.height=3;const x=v.getContext('2d');x.fillStyle='#00000030';x.fillRect(0,2,4,1);return c.createPattern(v,'repeat')})();
const rain=Array.from({length:130},()=>({x:rnd(0,W+200),y:rnd(0,H),sp:rnd(800,1200),ey:rnd(GY+6,H-4),l:rnd(10,22)})),rip=[],motes=Array.from({length:40},()=>({x:rnd(0,W),y:rnd(0,GY),v:rnd(5,25),c:Math.random()<.5?'#0ff':'#f2d'}));
const BB=['NEO·TOKYO','SENTINEL SEES ALL','AFTER DARK','OBEY ▲ OBEY','DREAM™','NO EXIT'];
const gl=(col,b)=>{c.shadowColor=col;c.shadowBlur=MIR?0:b};
function txt(s,x,y,f,col,al='left',gc){c.font=f;c.textAlign=al;c.fillStyle=col;c.shadowColor=gc||col;c.shadowBlur=10;c.fillText(s,x,y);c.shadowBlur=0}
function hex(x,y,r,col){c.beginPath();for(let i=0;i<6;i++)c.lineTo(x+Math.cos(i*1.047)*r,y+Math.sin(i*1.047)*r);c.closePath();c.fillStyle=col;c.shadowColor=col;c.shadowBlur=10;c.fill();c.shadowBlur=0}
// ---------- draw
function bg(cam,od,ch){const g=G;let gr=c.createLinearGradient(0,0,0,GY);gr.addColorStop(0,'#02010a');gr.addColorStop(.6,'#13052e');gr.addColorStop(1,od?'#6a0a6a':ch?'#4a0a22':'#3a0c5c');c.fillStyle=gr;c.fillRect(0,0,W,GY+2);
 c.fillStyle='#fff';for(let i=0;i<40;i++){c.globalAlpha=.2+.5*Math.abs(Math.sin(T+i));c.fillRect((i*97+13)%W,(i*53)%260,1.5,1.5)}c.globalAlpha=1;
 const sx=W*.66-cam*.02%40;c.save();c.beginPath();c.arc(sx,GY-150,95,0,6.3);c.clip();gr=c.createLinearGradient(0,GY-245,0,GY-55);gr.addColorStop(0,'#ffd23a');gr.addColorStop(.5,'#ff2bd6');gr.addColorStop(1,'#6a1bff');c.fillStyle=gr;c.fillRect(sx-100,GY-250,200,200);c.fillStyle='#13052e';for(let i=0;i<8;i++)c.fillRect(sx-100,GY-110+i*i*1.6+i*6,200,2+i*.9);c.restore();
 for(const[f,t]of TL){const ox=-(((cam*f)%TW)+TW)%TW;c.drawImage(t,ox,0);c.drawImage(t,ox+TW,0);if(f==.28)bills(cam)}
 gr=c.createLinearGradient(0,GY,0,H);gr.addColorStop(0,'#1a0838');gr.addColorStop(1,'#05020d');c.fillStyle=gr;c.fillRect(0,GY,W,H-GY);
 c.save();c.beginPath();c.rect(0,GY,W,H-GY);c.clip();c.globalAlpha=.22;c.translate(0,2*GY);c.scale(1,-1);const t=TL[2],ox=-(((cam*t[0])%TW)+TW)%TW;c.drawImage(t[1],ox,0);c.drawImage(t[1],ox+TW,0);c.restore();
 c.strokeStyle='#9b5cff55';c.lineWidth=1;c.beginPath();for(let k=0;k<18;k++){const xt=(((k*70-cam)%1260)+1260)%1260-150;c.moveTo(xt,GY);c.lineTo(W/2+(xt-W/2)*3.2,H)}for(let k=0;k<7;k++){const u=((cam/1200+k/7)%1+1)%1,y=GY+u*u*(H-GY);c.moveTo(0,y);c.lineTo(W,y)}c.stroke();
 for(const a of g.gaps){const x0=PX+a[0]-g.x,x1=PX+a[1]-g.x;if(x1<0||x0>W)continue;gr=c.createLinearGradient(0,GY,0,H);gr.addColorStop(0,'#000');gr.addColorStop(1,'#ff2bd655');c.fillStyle=gr;c.fillRect(x0,GY,x1-x0,H-GY);c.fillStyle='#ff2a55';c.shadowColor='#ff2a55';c.shadowBlur=14;c.fillRect(x0-2,GY,3,H-GY);c.fillRect(x1-1,GY,3,H-GY);c.shadowBlur=0;txt('▼ ▼ ▼',(x0+x1)/2,GY+40+Math.sin(T*6)*4,'700 14px Orbitron','#ff2a5588','center')}
 c.fillStyle=od?'#fff':'#00f0ff';c.shadowColor=c.fillStyle;c.shadowBlur=16;for(let x=0;x<W;){const a=g.gaps.find(a=>PX+a[1]-g.x>x&&PX+a[0]-g.x<x+8);if(!a)c.fillRect(x,GY,8,2);x+=8}c.shadowBlur=0}
function bills(cam){for(let k=0;k<6;k++){const x=(((k*420-cam*.35)%2520)+2520)%2520-200,y=70+(k%3)*40,col=k%2?'#ff2bd6':'#00f0ff';c.globalAlpha=.55+.3*Math.sin(T*3+k)+(Math.random()<.03?-.3:0);c.strokeStyle=col;c.shadowColor=col;c.shadowBlur=10;c.lineWidth=2;c.strokeRect(x,y,150,52);c.shadowBlur=0;c.fillStyle=col+'22';c.fillRect(x,y,150,52);txt(BB[k],x+75,y+31,'700 13px Orbitron,sans-serif',col,'center');c.globalAlpha=1}}
function drawE(e,od){const g=G,x=PX+e.x-g.x;if(x<-60||x>W+60)return;c.save();
 if(e.t=='shard'){const s=Math.cos(T*4+e.x*.01);c.translate(x,e.y);gl('#00f0ff',14);c.fillStyle=od?'#fff':'#5ff';c.beginPath();c.moveTo(0,-11);c.lineTo(8*s,0);c.lineTo(0,11);c.lineTo(-8*s,0);c.fill()}
 else if(e.t=='chip'){c.translate(x,e.y+Math.sin(T*3)*4);gl('#ffd23a',22);c.strokeStyle='#ffd23a';c.lineWidth=3;c.fillStyle='#ffd23a55';c.beginPath();for(let i=0;i<6;i++)c.lineTo(Math.cos(i*1.047+T)*16,Math.sin(i*1.047+T)*16);c.closePath();c.fill();c.stroke();c.globalAlpha=.4+.4*Math.sin(T*8);c.fillStyle='#fff';c.fillRect(-1,-26,2,52);c.fillRect(-26,-1,52,2)}
 else if(e.t=='pu'){const col={slow:'#9b5cff',shield:'#00f0ff',boost:'#ffd23a'}[e.k];c.translate(x,e.y+Math.sin(T*3+e.x)*5);gl(col,20);c.strokeStyle=col;c.lineWidth=3;c.fillStyle=col+'33';c.beginPath();c.arc(0,0,17,0,6.3);c.fill();c.stroke();txt({slow:'⏱',shield:'◈',boost:'»'}[e.k],0,6,'700 17px sans-serif',col,'center');txt(e.k.toUpperCase(),0,32,'700 9px Orbitron',col,'center')}
 else if(e.t=='bar'){gl(od?'#fff':'#ff2a55',od?26:12);c.fillStyle='#1a0612';c.fillRect(x,e.y,e.w,e.h);c.strokeStyle=od?'#fff':'#ff2a55';c.lineWidth=2.5;c.strokeRect(x,e.y,e.w,e.h);c.beginPath();for(let i=0;i<4;i++){c.moveTo(x,e.y+i*14);c.lineTo(x+e.w,e.y+i*14-14)}c.stroke()}
 else if(e.t=='las'){const col=od?'#fff':'#ff2a55';gl(col,od?30:18);const gr=c.createLinearGradient(0,0,0,e.h);gr.addColorStop(0,'#ff2a5500');gr.addColorStop(1,'#ff2a5588');c.fillStyle=gr;c.fillRect(x-14,0,e.w+28,e.h);c.fillStyle=col;c.globalAlpha=.6+.4*Math.random();c.fillRect(x+e.w/2-1.5,0,3,e.h);c.globalAlpha=1;c.fillRect(x-4,e.h,e.w+8,7);txt('▼',x+e.w/2,e.h+28,'700 14px sans-serif',col,'center')}
 else if(e.t=='dr'){c.translate(x,e.y);c.rotate(Math.sin(e.ph)*.15);const col=e.ch?'#ff2a55':'#9b5cff';gl(od?'#fff':col,od?26:12);c.fillStyle='#14061f';c.strokeStyle=od?'#fff':col;c.lineWidth=2;c.beginPath();c.ellipse(0,0,19,9,0,0,6.3);c.fill();c.stroke();const rw=Math.abs(Math.cos(T*30))*16+4;c.beginPath();c.moveTo(-rw-12,-12);c.lineTo(rw-12,-12);c.moveTo(-rw+12,-12);c.lineTo(rw+12,-12);c.moveTo(-12,-9);c.lineTo(-12,-12);c.moveTo(12,-9);c.lineTo(12,-12);c.stroke();c.fillStyle=e.ch?'#ff2a55':'#ffd23a';c.beginPath();c.arc(0,1,3+Math.sin(T*10)*(e.ch?1.5:.5),0,6.3);c.fill()}
 c.restore()}
function drawP(){const g=G,col=SK[S.skin],sl=g.sl>0,run=g.t*(12+g.speed*.01),air=!g.onG;c.save();c.translate(PX,g.y);if(g.inv>0&&((g.t*20|0)%2)&&!g.win)c.globalAlpha=.4;
 gl(col.c,16);c.strokeStyle=col.c;c.lineWidth=5;c.lineCap='round';c.lineJoin='round';const ph=Math.sin(run);
 if(sl){c.beginPath();c.moveTo(-16,-10);c.lineTo(12,-12);c.moveTo(-16,-10);c.lineTo(-30,-3);c.moveTo(0,-11);c.lineTo(14,-4);c.stroke();c.fillStyle='#0a0418';c.beginPath();c.arc(18,-14,7,0,6.3);c.fill();c.stroke()}
 else{c.beginPath();c.moveTo(0,-26);c.lineTo(2,-46);for(const s of[1,-1]){const fx=air?s*8:ph*s*16,fy=air?-6:-3-Math.max(0,Math.cos(run)*s)*8;c.moveTo(0,-26);c.lineTo(fx*.5+(air?8:0),-14);c.lineTo(fx+(air?-4:0),fy)}c.moveTo(1,-42);c.lineTo(air?10:-ph*12,-32);c.lineTo(air?16:-ph*18,-28);c.stroke();
  c.fillStyle='#0a0418';c.beginPath();c.arc(4,-54,7,0,6.3);c.fill();c.stroke();c.strokeStyle=col.a;c.lineWidth=3;c.shadowColor=col.a;c.beginPath();c.moveTo(5,-55);c.lineTo(11,-55);c.stroke()}
 const sc=g.scarf;let pr=[sl?10:-2,sl?-18:-52];c.strokeStyle=col.a;c.lineWidth=3;gl(col.a,12);c.beginPath();c.moveTo(pr[0],pr[1]);for(let i=0;i<9;i++){const tx=pr[0]-8-g.speed*.012,ty=pr[1]+Math.sin(g.t*12+i)*2.5-g.vy*.006;sc[i][0]+=(tx-sc[i][0])*.45;sc[i][1]+=(ty-sc[i][1])*.45;pr=sc[i];c.lineTo(pr[0],pr[1])}c.stroke();
 if(g.shield>0){c.strokeStyle='#0ff';c.lineWidth=2;c.shadowColor='#0ff';c.fillStyle='#00f0ff14';c.beginPath();c.arc(0,-30,40+Math.sin(T*8)*2,0,6.3);c.fill();c.stroke()}c.restore()}
function world(){const g=G,od=state=='play'&&g.od>0;
 for(const p of g.plats){const x=PX+p.x-g.x;if(x>W+20||x+p.w<-20)continue;gl('#00f0ff',12);c.fillStyle='#0c0620';c.fillRect(x,p.y,p.w,10);c.fillStyle=od?'#fff':'#00f0ff';c.fillRect(x,p.y,p.w,2);c.shadowBlur=0;c.fillStyle='#00f0ff12';c.fillRect(x+6,p.y+10,p.w-12,50)}
 const fx=PX+LEVEL-g.x;if(fx<W+150){gl('#ff2bd6',20);c.fillStyle='#00f0ff';c.fillRect(fx,GY-190,10,190);c.fillRect(fx+110,GY-190,10,190);c.fillStyle='#ff2bd6';c.fillRect(fx,GY-190,120,8);c.shadowBlur=0;const gr=c.createLinearGradient(fx,0,fx+120,0);gr.addColorStop(0,'#00f0ff55');gr.addColorStop(1,'#ff2bd655');c.fillStyle=gr;c.fillRect(fx+10,GY-182,100,182);if(!MIR)txt('EXIT GRID',fx+60,GY-205,'900 14px Orbitron','#fff','center')}
 if(!MIR)for(const e of g.ents)if(e.t=='dr'&&e.ch){const x=PX+e.x-g.x;if(x>0&&x<W){c.strokeStyle='#ff2a5555';c.setLineDash([5,7]);c.lineWidth=1.5;c.beginPath();c.moveTo(x,e.y);c.lineTo(PX,g.y-30);c.stroke();c.setLineDash([])}}
 c.globalCompositeOperation='lighter';for(const t of g.trail){const x=PX+t.x-g.x;c.strokeStyle=`hsl(${(T*300+t.x*.3)%360},100%,60%)`;c.globalAlpha=Math.min(1,t.l*2.2);c.lineWidth=10;c.lineCap='round';gl(c.strokeStyle,MIR?0:14);c.beginPath();c.moveTo(x,t.y-4);c.lineTo(x,t.y-t.h);c.stroke()}c.globalAlpha=1;c.globalCompositeOperation='source-over';
 for(const e of g.ents)drawE(e,od);drawP()}
function draw(rt){const g=G,pl=state=='play'||state=='paused'||state=='end',od=state=='play'&&g.od>0;c.setTransform(R,0,0,R,0,0);
 shake=Math.max(0,shake-rt*40);glitch=Math.max(0,glitch-rt*1.4);flash=Math.max(0,flash-rt*2.2);
 const f=od?`hue-rotate(${Math.sin(T*2.5)*35|0}deg) saturate(1.8) contrast(1.15)`:'none';if(f!=lastF||od){cv.style.filter=f;lastF=f}
 const cam=g.x-PX;c.save();if(shake>0)c.translate(rnd(-shake,shake)*.5,rnd(-shake,shake)*.5);if(od){const z=1+.02*Math.sin(T*6);c.translate(W/2,H/2);c.scale(z,z);c.translate(-W/2,-H/2)}
 bg(cam,od,g.chase);
 MIR=1;c.save();c.beginPath();c.rect(0,GY,W,H-GY);c.clip();c.translate(0,2*GY);c.scale(1,-1);c.globalAlpha=.2;world();c.restore();MIR=0;c.globalAlpha=1;world();
 c.globalCompositeOperation='lighter';for(const p of g.parts){c.globalAlpha=Math.max(0,p.l);c.fillStyle=p.c;c.fillRect(PX+p.x-g.x,p.y,p.s,p.s)}for(const r of g.rings){c.globalAlpha=Math.max(0,r.l);c.strokeStyle=r.c;c.lineWidth=4*r.l;c.shadowColor=r.c;c.shadowBlur=14;c.beginPath();c.arc(PX+r.x-g.x,r.y,r.r,0,6.3);c.stroke()}c.shadowBlur=0;c.globalAlpha=1;c.globalCompositeOperation='source-over';
 for(const p of g.pops){c.globalAlpha=Math.max(0,p.l);txt(p.t,PX+p.x-g.x,p.y,'900 18px Orbitron','#fff','center',p.c)}c.globalAlpha=1;
 if(state=='play'&&g.chase){const wx=PX-g.wall;let gr=c.createLinearGradient(wx-220,0,wx,0);gr.addColorStop(0,'#ff2a5500');gr.addColorStop(1,'#ff2a55cc');c.fillStyle=gr;c.fillRect(wx-220,0,220,H);c.fillStyle='#2a0008dd';c.fillRect(0,0,wx,H);c.fillStyle='#ff2a55';for(let i=0;i<6;i++)c.fillRect(wx-rnd(0,40),rnd(0,H),rnd(10,60),2)}
 const ar=c.createLinearGradient(0,GY-60,0,GY+40);ar.addColorStop(0,'#7a32d000');ar.addColorStop(.6,'#7a32d033');ar.addColorStop(1,'#7a32d000');c.fillStyle=ar;c.fillRect(0,GY-60,W,100);
 c.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const x=(((i*400-cam*.2+T*20)%1300)+1300)%1300-200,rg=c.createRadialGradient(x,GY-10,0,x,GY-10,260);rg.addColorStop(0,'#9b5cff1c');rg.addColorStop(1,'#0000');c.fillStyle=rg;c.fillRect(x-260,GY-270,520,520)}
 for(const m of motes){m.x-=m.v*rt+(g.speed||300)*rt*.05;m.y+=Math.sin(T+m.v)*.3;if(m.x<0)m.x=W;c.fillStyle=m.c;c.globalAlpha=.5;c.fillRect(m.x,m.y,2,2)}c.globalAlpha=1;c.globalCompositeOperation='source-over';
 c.strokeStyle='#a0c8ff55';c.lineWidth=1;c.beginPath();for(const d of rain){d.y+=d.sp*rt;d.x-=d.sp*.18*rt;if(d.y>=d.ey){if(rip.length<60)rip.push({x:d.x,y:d.ey,l:.35});d.y=-20;d.x=rnd(0,W+200);d.ey=rnd(GY+6,H-4)}c.moveTo(d.x,d.y);c.lineTo(d.x+d.l*.18,d.y+d.l)}c.stroke();
 c.strokeStyle='#8ff';for(const r of rip){r.l-=rt;c.globalAlpha=Math.max(0,r.l*1.5);c.beginPath();c.ellipse(r.x,r.y,(.35-r.l)*40,(.35-r.l)*8,0,0,6.3);c.stroke()}c.globalAlpha=1;for(let i=rip.length-1;i>=0;i--)if(rip[i].l<=0)rip.splice(i,1);
 if(od){c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,0,170,${.1+.06*Math.sin(T*8)})`;c.fillRect(0,0,W,H);for(let i=0;i<14;i++){c.fillStyle=i%2?'#0ff5':'#f2d5';const y=(i*97+T*50)%H,x=((-T*2400-i*300)%1200+1200)%1200;c.fillRect(x,y,rnd(120,300),1.5)}c.globalCompositeOperation='source-over'}
 c.restore();
 c.drawImage(VIG,0,0);c.fillStyle=SCAN;c.fillRect(0,0,W,H);
 if(pl&&state!='end')hud();else if(state=='end'){c.fillStyle='#05020d88';c.fillRect(0,0,W,H)}
 if(flash>0){c.fillStyle=`rgba(255,255,255,${Math.min(1,flash)*.8})`;c.fillRect(0,0,W,H)}
 if(glitch>0){for(let i=0;i<9;i++){const sy=rnd(0,H),sh=rnd(6,45),o=(Math.random()-.5)*90*glitch;c.drawImage(cv,0,sy*R,W*R,sh*R,o,sy,W,sh)}c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,0,200,${glitch*.15})`;c.fillRect(0,rnd(0,H),W,rnd(2,30));c.fillStyle=`rgba(0,255,255,${glitch*.15})`;c.fillRect(0,rnd(0,H),W,rnd(2,30));c.globalCompositeOperation='source-over'}}
function hud(){const g=G;for(let i=0;i<3;i++)hex(34+i*30,36,11,i<g.hp?'#ff2a55':'#ff2a5530');
 txt(String(score()).padStart(6,'0'),20,80,'900 28px Orbitron,sans-serif','#fff','left','#00f0ff');if(g.combo>1)txt('x'+mult()+'  COMBO '+g.combo,20,104,'700 17px Rajdhani,sans-serif','#ff2bd6');
 let ry=124;const row=(l,f,col)=>{txt(l,20,ry+8,'700 10px Orbitron',col);c.fillStyle='#fff2';c.fillRect(70,ry,70,6);c.fillStyle=col;c.fillRect(70,ry,70*Math.max(0,Math.min(1,f)),6);ry+=16};
 if(g.slow>0)row('SLOW',g.slow/5,'#9b5cff');if(g.boost>0)row('BOOST',g.boost/4.5,'#ffd23a');if(g.shield>0)row('SHIELD',g.shield/14,'#0ff');if(g.dcd>0)row('DASH',1-g.dcd/1.1,'#fff');
 const p=Math.min(1,g.x/LEVEL),gr=c.createLinearGradient(300,0,660,0);gr.addColorStop(0,'#0ff');gr.addColorStop(1,'#f2d');c.fillStyle='#0008';c.fillRect(300,22,360,8);c.fillStyle=gr;c.fillRect(300,22,360*p,8);c.fillStyle='#fff';c.fillRect(298+360*p,17,4,18);
 txt(g.chase?'!! SENTINEL CHASE !!':'DISTANCE '+(p*100|0)+'%',480,50,'700 12px Orbitron',g.chase&&(T*4|0)%2?'#ff2a55':'#9ff','center');txt('BEST '+S.best,W-56,26,'700 13px Orbitron','#9ab','right');
 const ox=300,oy=H-34;c.fillStyle='#0009';c.fillRect(ox,oy,360,12);if(g.od>0){const og=c.createLinearGradient(ox,0,ox+360,0);for(let i=0;i<=4;i++)og.addColorStop(i/4,`hsl(${(T*400+i*70)%360},100%,60%)`);c.fillStyle=og}else c.fillStyle=g.odm>=100?`hsl(${(T*300)%360},100%,60%)`:'#ff2bd6';c.shadowColor='#f2d';c.shadowBlur=g.odm>=100?18:6;c.fillRect(ox,oy,3.6*g.odm,12);c.shadowBlur=0;c.strokeStyle='#ff2bd6';c.lineWidth=1.5;c.strokeRect(ox,oy,360,12);
 txt(g.od>0?'◢ NEON OVERDRIVE ◣':g.odm>=100?(st.classList.contains('tc')?'TAP OVERDRIVE':'▲ OVERDRIVE READY — PRESS E'):'OVERDRIVE '+(g.odm|0)+'%',480,oy-7,'700 12px Orbitron',g.odm>=100&&!g.od&&(T*6|0)%2?'#fff':'#ff9ef0','center');
 if(g.odt>0){c.globalAlpha=Math.min(1,g.odt);txt('NEON OVERDRIVE',480,220,`900 ${44+(1.5-g.odt)*24}px Orbitron`,'#fff','center','#f2d');c.globalAlpha=1}
 if(g.warn>0){c.strokeStyle=`rgba(255,42,85,${.4+.4*Math.sin(T*14)})`;c.lineWidth=10;c.strokeRect(5,5,W-10,H-10);txt('⚠ SENTINEL AI LOCKED ON — RUN ⚠',480,160,'900 22px Orbitron',(T*8|0)%2?'#ff2a55':'#fff','center','#ff2a55')}
 if(g.chase&&g.wall<300){c.fillStyle=`rgba(255,0,40,${(1-g.wall/300)*.25})`;c.fillRect(0,0,W,H)}}
// ---------- loop
let last=performance.now();
function loop(now){requestAnimationFrame(loop);const rt=Math.min(.05,(now-last)/1000);last=now;T+=rt;
 if(state=='play')update(rt);else if(state=='title'||state=='loading'){G.x+=300*rt;G.t+=rt;G.speed=360}
 draw(rt)}
$('#blogin').onclick=()=>{authUI('login');show('auth');$('#au').focus()};
$('#blogout').onclick=logout;document.querySelectorAll('.lo').forEach(b=>b.onclick=logout);
$('#bboard').onclick=showBoard;$('#bbadge').onclick=showBadges;$('#asub').onclick=doAuth;
$('#asw').onclick=()=>authUI(authMode=='login'?'register':'login');
document.querySelectorAll('.back').forEach(b=>b.onclick=()=>show('title'));
G=newGame();renderSkins();loadMe();$('#bm').textContent='🔊';requestAnimationFrame(loop);
