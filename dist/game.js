'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const levels=[
 {name:'はじめの裏切り',length:1900,speed:235,spikes:[620,1250],hiddenSpikes:[1250],holes:[[820,965,755],[1590,1730,1535]],ceil:[]},
 {name:'高く跳べばいい、とは限らない',length:2200,speed:245,spikes:[640,1280,1640],hiddenSpikes:[1640],holes:[[860,1005,795],[1870,2010,1815]],ceil:[[570,760,180]],fake:1770},
 {name:'足元をご覧ください',length:2300,speed:255,spikes:[520,1770],hiddenSpikes:[520,1770],holes:[[710,850,645],[2010,2150,1955]],baitHoles:[[1120,1210,1290,1430]],spikeModes:{1770:'slide'},ceil:[[430,610,245,'drop']],fake:1900},
 {name:'ゴールはすぐそこ',length:2500,speed:250,spikes:[580,1160,1710,2280],hiddenSpikes:[1710,2280],holes:[[780,920,715],[1990,2140,1925]],spikeModes:{1710:'swap'},ceil:[[1085,1260,245,'drop'],[1420,1600,180,'tooth']],fake:1830},
 {name:'最後まで信用しないで',length:3000,speed:260,spikes:[540,1160,1770,2460,2880],hiddenSpikes:[540,1770,2460,2880],holes:[[740,885,675],[1980,2120,1915],[2660,2800,2605]],baitHoles:[[1380,1470,1550,1690]],spikeModes:{1770:'slide',2880:'swap'},ceil:[[1090,1250,245,'drop'],[2210,2340,180,'tooth'],[2390,2540,245,'drop']],fake:2240},
 {name:'その着地点、予約済みです',length:3300,speed:265,spikes:[520,1110,1740,2250,3040],hiddenSpikes:[520,1740,2250,3040],holes:[[740,885],[1920,2065],[2780,2920]],baitHoles:[[1340,1430,1510,1650]],spikeModes:{1740:'slide',2250:'swap',3040:'slide'},ceil:[[1040,1200,245,'drop'],[2420,2600,180,'tooth']],fake:2660},
 {name:'何もしない勇気',length:2720,speed:255,spikes:[],hiddenSpikes:[],holes:[[2510,2645]],ceil:[],tunnel:[300,2450],temptations:[{at:600,type:'hole'},{at:1000,type:'spike'},{at:1400,type:'hole'},{at:1800,type:'spike'},{at:2200,type:'hole'}],fake:2000},
 {name:'さっきの正解は、もう不正解',length:3800,speed:265,spikes:[1420,2020,2690,3570],hiddenSpikes:[1420,2690,3570],holes:[[1630,1775],[2920,3060]],baitHoles:[[2290,2380,2460,2600]],spikeModes:{2690:'slide',3570:'swap'},ceil:[[1960,2100,245,'drop'],[3180,3350,180,'tooth']],tunnel:[300,1280],temptations:[{at:600,type:'spike'},{at:1000,type:'hole'}],fake:3420}
];
// Familiar routes return with a different ending. Clone nested data so earlier stages stay intact.
const cloneStage=i=>JSON.parse(JSON.stringify(levels[i]));
levels.push({...cloneStage(0),name:'ゴールにも逃げる権利',length:2170,escapeGoal:{start:1930,end:2170,hole:[1882,2030],duration:.3}});
levels.push({...cloneStage(1),name:'着地は終わりではありません',length:2470,escapeGoal:{start:2230,end:2470,hole:[2182,2330],duration:.3,landingTrap:true}});
levels.push({...cloneStage(4),name:'落ちる勇気',length:5060,underground:{entry:[235,267],floor:618,roof:482,pitBottom:434,surfaceGoal:3030,spike:4920}});

let level=0,deaths=0,state='ready',x=100,y=338,vy=0,held=false,grounded=true,elapsed=0,deadTime=0,last=0,acc=0,particles=[];
let viewWidth=1000, viewHeight=480,sceneHeight=480;
let escapeTriggered=false,escapeAge=0,landingSpike=null,jumpBuffer=0,route='surface';
function resize(){sceneHeight=levels[level].underground&&route!=='surface'?720:480;const w=window.innerWidth,h=window.innerHeight,scale=Math.min(w/640,h/sceneHeight),dpr=Math.min(window.devicePixelRatio||1,2);viewWidth=w/scale;viewHeight=h/scale;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);}
window.addEventListener('resize',resize);resize();
const floor=370, size=32;
function load(){escapeTriggered=false;escapeAge=0;landingSpike=null;jumpBuffer=0;route='surface';resize();x=100;y=floor-size;vy=0;held=false;grounded=true;elapsed=0;particles=[];$('stage').textContent=String(level+1).padStart(2,'0')+' / '+String(levels.length).padStart(2,'0');$('name').textContent=levels[level].name;$('progress').style.width='0%';}
function start(){debugTapCount=0;$('debug-toggle').hidden=!debugEnabled;if(state==='complete')level=0;load();state='playing';$('overlay').classList.add('hidden');}
function jump(){if(state!=='playing'||route==='entering')return;if(grounded){vy=-650;grounded=false;jumpBuffer=0;}else if(levels[level].escapeGoal?.landingTrap)jumpBuffer=.14;held=true;}
function release(){held=false;if(vy< -270)vy=-270;}
const taunts=["今のは、床のせい。","知っていれば、余裕。","もう一回だけ。","信じてしまいましたね。","あー、えーっと…きっと、お仕事はできるんですよね？","難易度下げますか？…あ、これ以上簡単なの無かったか","言い忘れてました！ジャンプボタンは鼻の穴の中じゃありません！え？知ってた？知っててそれ？","今のは練習ですよね？ずっと練習していますものね。","その判断力、ここでは使わない縛りですか？","惜しい！……と言う準備だけはしていました。","大丈夫です。トゲの方は無事でした。","今度こそ、と思いました？私も一瞬だけ。","押すボタンは一つなんですけどね。","落ち着いてください。落ちる方はもう十分です。","そこ、さっきも通りましたよね？初対面の反応でしたね。","操作は覚えましたね。判断はこれからですね。"];
let lastTaunt=-1;
let debugEnabled=false,debugTapCount=0,lastDebugTap=-Infinity,debugReturnState='ready';
function randomTaunt(){if(lastTaunt<0){lastTaunt=Math.floor(Math.random()*taunts.length);return taunts[lastTaunt];}const pick=Math.floor(Math.random()*(taunts.length-1));lastTaunt=pick>=lastTaunt?pick+1:pick;return taunts[lastTaunt];}
function die(reason){if(state!=='playing')return;state='dead';held=false;deaths++;deadTime=0;$('deaths').textContent=String(deaths).padStart(3,'0');$('eyebrow').textContent='YOU DIED · '+String(deaths).padStart(3,'0');$('title').textContent=randomTaunt();$('message').textContent=reason;$('action').innerHTML='もう一度 <span>↺</span>';for(let i=0;i<18;i++)particles.push({x:x+16,y:y+16,vx:Math.sin(i*7)*180,vy:Math.cos(i*3)*240,t:0});}
function win(){state=level===levels.length-1?'complete':'cleared';held=false;$('eyebrow').textContent=state==='complete'?'HELL, CONQUERED.':'STAGE CLEAR';$('title').textContent=state==='complete'?'お見事。悪魔も降参です。':'まだ、終わりではありません。';$('message').textContent=state==='complete'?`全${levels.length}ステージを突破。死亡回数：${deaths}回`:'次のステージでは、別の罠が待っています。';$('action').innerHTML=state==='complete'?'最初から遊ぶ <span>↺</span>':'次のステージ <span>→</span>';$('overlay').classList.remove('hidden');}
function act(){if(state==='cleared')level++;start();}
$('action').addEventListener('click',act);$('restart').addEventListener('click',start);

function openDebugSelect(){
 if(!debugEnabled||state==='debug')return;
 debugReturnState=state;state='debug';release();jumpBuffer=0;
 const grid=$('debug-stages');
 if(!grid.children.length){
  levels.forEach((stage,index)=>{
   const button=document.createElement('button');
   button.type='button';button.textContent=String(index+1).padStart(2,'0');
   button.setAttribute('aria-label',String(index+1)+'面：'+stage.name);
   button.addEventListener('click',()=>{
    level=index;state='ready';
    $('debug-panel').hidden=true;$('overlay').classList.remove('debug-select');
    start();canvas.focus();
   });
   grid.appendChild(button);
  });
 }
 [...grid.children].forEach((button,index)=>button.setAttribute('aria-current',String(index===level)));
 $('debug-panel').hidden=false;$('overlay').classList.add('debug-select');$('overlay').classList.remove('hidden');
 $('debug-toggle').hidden=true;grid.children[level].focus();
}
function closeDebugSelect(){
 if(state!=='debug')return;
 state=debugReturnState;$('debug-panel').hidden=true;
 $('overlay').classList.remove('debug-select');$('overlay').classList.toggle('hidden',state==='playing');
 $('debug-toggle').hidden=false;if(state==='playing')canvas.focus();else $('action').focus();
}
$('overlay').addEventListener('click',e=>{
 if(state!=='ready'||debugEnabled||e.button!==0||e.target.closest('button'))return;
 const now=e.timeStamp;
 debugTapCount=now-lastDebugTap<=2000?debugTapCount+1:1;
 lastDebugTap=now;
 if(debugTapCount===20){debugEnabled=true;$('debug-toggle').hidden=false;openDebugSelect();}
});
$('debug-toggle').addEventListener('click',openDebugSelect);
$('debug-close').addEventListener('click',closeDebugSelect);

canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);jump();});canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
window.addEventListener('keydown',e=>{if(state==='debug'){if(e.code==='Escape'){e.preventDefault();closeDebugSelect();}return;}if(['Space','ArrowUp','KeyR'].includes(e.code)){if(e.target.tagName==='BUTTON'&&e.code==='Space')return;e.preventDefault();if(e.repeat)return;if(e.code==='KeyR'){start();return;}if(state==='playing')jump();else if(state!=='dead'||deadTime>.45)act();}});window.addEventListener('keyup',e=>{if(['Space','ArrowUp'].includes(e.code))release();});window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{last=0;acc=0;release();});

// Trap geometry is shared by physics and rendering; progress is deterministic.
const clamp01=n=>Math.max(0,Math.min(1,n));
function holeShape(h){
 const age=Math.max(0,(x-(h[0]-220))/levels[level].speed);
 const accelerated=level>=1&&level!==8;
 const growth=accelerated?(age<.60?.16*age/.60:.16+.84*clamp01((age-.60)/.18)):clamp01(age/.80);
 const center=(h[0]+h[1])/2,width=(h[1]-h[0])*growth;
 return [center-width/2,center+width/2];
}
function spikeShape(base){
 const hidden=(levels[level].hiddenSpikes||[]).includes(base);
 if(!hidden)return {x:base,height:32,moving:false};
 const moving=level>=2&&level!==8&&level!==9;
 const age=Math.max(0,(x-(base-(moving?360:200)))/levels[level].speed);
 const height=32*clamp01(age/.50);
 const travel=moving?clamp01((age-.80)/.22):1;
 return {x:base+(moving?110*(1-travel):0),height,moving:moving&&travel>0&&travel<1};
}

function baitShapes(b){
 const [a,end,next,nextEnd]=b;
 const opening=clamp01((x-(a-240))/110);
 const closing=1-clamp01((x-(a-95))/55);
 const width=(end-a)*opening*closing;
 const targetWidth=(nextEnd-next)*clamp01((x-(a-40))/140);
 return [[(a+end-width)/2,(a+end+width)/2],[(next+nextEnd-targetWidth)/2,(next+nextEnd+targetWidth)/2]];
}
function temptationLift(t){return clamp01((x-(t.at-360))/100)*(1-clamp01((x-(t.at-105))/65));}
function temptationHoles(){return (levels[level].temptations||[]).filter(t=>t.type==='hole').map(t=>{const width=130*temptationLift(t);return [t.at+65-width/2,t.at+65+width/2];});}
function allCeilings(){
 const l=levels[level],out=[...l.ceil];
 if(!l.tunnel)return out;
 let left=l.tunnel[0];
 for(const t of l.temptations){
  const start=t.at-160,end=t.at+160;
  if(start>left)out.push([left,start,328,'tunnel']);
  out.push([start,end,328-148*temptationLift(t),'tunnel']);
  left=end;
 }
 if(left<l.tunnel[1])out.push([left,l.tunnel[1],328,'tunnel']);
 return out;
}
function allHoles(){
 const l=levels[level],holes=[...l.holes.map(holeShape),...temptationHoles(),...(l.baitHoles||[]).flatMap(baitShapes)];
 if(l.escapeGoal&&escapeTriggered)holes.push(l.escapeGoal.hole);
 if(l.underground)holes.push(l.underground.entry);
 return holes.filter(h=>h[1]-h[0]>.01);
}
function surfaceTail(){
 if(!levels[level].underground)return [];
 const positions=[3190,3390,3590,3770,3930,4070,4190,4290,4360];
 for(let px=4410;px<4900;px+=26)positions.push(px);
 return positions.map(px=>({x:px,height:32,moving:false}));
}
function goalPosition(){const g=levels[level].escapeGoal;return g?g.start+(g.end-g.start)*clamp01(escapeAge/g.duration):levels[level].length+30;}

function allSpikes(){
 const l=levels[level];
 return [...l.spikes.flatMap(base=>{
  const mode=(l.spikeModes||{})[base];
  if(!mode)return [spikeShape(base)];
  const initial=base-130, growth=clamp01((x-(initial-240))/100);
  if(mode==='slide'){
   const travel=clamp01((x-(initial-70))/100);
   return [{x:initial+130*travel,height:32*growth,moving:travel>0&&travel<1}];
  }
  const retract=clamp01((x-(initial-80))/45);
  const regrow=clamp01((x-(initial+5))/80);
  return [{x:initial,height:32*growth*(1-retract),moving:false},{x:base,height:32*regrow,moving:false}];
 }),...surfaceTail(),...(landingSpike?[landingSpike]:[]),...(l.temptations||[]).filter(t=>t.type==='spike').map(t=>({x:t.at,height:32*temptationLift(t),moving:false}))];
}
function ceilingShape(c){
 if(c[3]!=='drop')return c;
 const age=Math.max(0,(x+size-c[0])/levels[level].speed);
 const bottom=180+(c[2]-180)*clamp01((age-.08)/.28);
 return [c[0],c[1],bottom,c[3]];
}
function fallingTooth(c){
 const sx=c[0]+Math.floor((c[1]-c[0])/48)*24;
 const age=Math.max(0,(x-(sx-85))/levels[level].speed);
 const fallTime=Math.max(0,age-.16);
 return {x:sx,top:c[2]-28+900*fallTime*fallTime,height:28,active:age>.16,warning:age>0&&age<=.16};
}
function toothHits(t){
 const left=Math.max(x+4,t.x),right=Math.min(x+size-4,t.x+24);
 if(left>=right||y+size<=t.top)return false;
 const near=Math.max(left,Math.min(right,t.x+12));
 return y<t.top+t.height*(1-Math.abs(near-t.x-12)/12);
}

function spikeHits(spike,ground=floor){
 const left=Math.max(x+4,spike.x),right=Math.min(x+size-4,spike.x+34);
 if(spike.height<=0||left>=right)return false;
 const nearest=Math.max(left,Math.min(right,spike.x+17));
 const surface=ground-spike.height*(1-Math.abs(nearest-spike.x-17)/17);
 return y+size>surface&&y<ground;
}
function update(dt){
 if(state==='dead'){
  deadTime+=dt;
  // Let the escaping flag finish its 0.3 second movement even during the death animation.
  if(escapeTriggered)escapeAge+=dt;
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=850*dt;p.t+=dt;}
  if(deadTime>.45)$('overlay').classList.remove('hidden');return;
 }
 if(state!=='playing')return;
 const l=levels[level],u=l.underground,previousX=x,previousBottom=y+size,wasGrounded=grounded;
 elapsed+=dt;jumpBuffer=Math.max(0,jumpBuffer-dt);
 if(route!=='entering')x+=l.speed*dt;
 // The one-tile entrance accepts a standing player's center; ordinary pit ledges keep the existing footprint rule.
 if(u&&route==='surface'&&grounded&&previousX+size/2<u.entry[1]&&x+size/2>=u.entry[0]){
  route='entering';x=u.entry[0];grounded=false;held=false;vy=0;resize();
 }
 if(l.escapeGoal){
  if(!escapeTriggered&&x+size>=l.escapeGoal.start){escapeTriggered=true;escapeAge=0;}
  else if(escapeTriggered)escapeAge+=dt;
 }
 vy+=(held&&vy<0?1550:2050)*dt;y+=vy*dt;
 const below=u&&route!=='surface',ground=below?u.floor:floor;
 const openHoles=below?[]:allHoles();
 const supported=px=>!openHoles.some(h=>px>=h[0]&&px+size<=h[1]);
 const crossing=y+size>=ground&&previousBottom<=ground;
 const fraction=crossing?clamp01((ground-previousBottom)/(y+size-previousBottom||1)):1;
 const crossingX=previousX+(x-previousX)*fraction;
 if(vy>=0&&y+size>=ground&&previousBottom<=ground+8&&(supported(x)||crossing&&supported(crossingX))){
  y=ground-size;vy=0;grounded=true;
  if(route==='entering')route='underground';
  if(l.escapeGoal?.landingTrap&&escapeTriggered&&!landingSpike&&!wasGrounded&&x+size>l.escapeGoal.hole[1]){
   landingSpike={x:x+size+18,height:32,moving:false};
  }
  if(jumpBuffer>0){vy=held?-650:-450;grounded=false;jumpBuffer=0;}
 }else grounded=false;
 if(!below&&y+size>floor+8&&y<floor&&openHoles.some(h=>previousX+size<=h[1]&&x+size>h[1])){
  die('届きそうでしたね。届いてはいませんが。');return;
 }
 if(below){
  // The empty tunnel has a solid, harmless roof. Only the last emerging teeth are lethal.
  if(route==='underground'&&x>=u.spike-110){
   const growth=clamp01((x-(u.spike-110))/35);
   for(let px=u.spike-90;px<u.spike+95;px+=24){
    if(toothHits({x:px,top:u.roof,height:30*growth})){die('ここまで来て、大きく跳びましたね。');return;}
   }
  }
  if(route==='underground'&&y<u.roof){y=u.roof;vy=Math.max(0,vy);}
  if(x>=u.spike-40&&spikeHits({x:u.spike,height:32},u.floor)){die('最後の最後まで、油断なさいませんように。');return;}
 }else{
  if(u){
   // Other surface pits end two tiles down in a spike bed; they never connect to the safe tunnel.
   for(const h of openHoles){if(h===u.entry)continue;
    if(x+size-4>h[0]&&x+4<h[1]&&y+size>u.pitBottom-24){die('地下への入口は、そこではありませんでした。');return;}
   }
  }
  if(y>490){die(escapeTriggered?'ゴールが待っているなんて、誰が言いました？':l.fake&&x>l.fake?'ゴールだと、思いました？':'着地点に床があるとは、言っていません。');return;}
  for(const spike of allSpikes()){
   if(spikeHits(spike)){die(landingSpike===spike?'着地、おめでとうございます。次のジャンプは？':level>=2?'待ってくれるトゲだと、思いました？':'生えてくるところ、見えていましたよね。');return;}
  }
  for(const original of allCeilings()){
   const c=ceilingShape(original);
   if(x+size-4>c[0]&&x+4<c[1]&&y<c[2]-28){die(original[3]==='tunnel'?'押さなければ、何も起きなかったのに。':'天井にも、都合というものがあります。');return;}
   for(let sx=c[0];sx<c[1];sx+=24){
    if(original[3]==='tooth'&&sx===fallingTooth(original).x)continue;
    if(toothHits({x:sx,top:c[2]-28,height:28})){die('その高さ、さっきまでは安全でしたね。');return;}
   }
   if(original[3]==='tooth'&&toothHits(fallingTooth(original))){die('全部落ちるとは、言っていません。一つで十分です。');return;}
  }
 }
 const atGoal=l.escapeGoal?escapeTriggered&&escapeAge>=l.escapeGoal.duration&&x+size>=l.escapeGoal.end&&grounded:x>=l.length;
 if(atGoal&&(!u||route==='underground'))win();
 $('progress').style.width=Math.min(100,(x-100)/(l.length-100)*100)+'%';
}

function text(t,a,b,s=16,color='#6c6d69'){ctx.fillStyle=color;ctx.font=`${s}px monospace`;ctx.fillText(t,a,b);}
function draw(){const l=levels[level],cam=Math.max(0,x-210);ctx.fillStyle='#eae8df';ctx.fillRect(0,0,viewWidth,viewHeight);ctx.save();ctx.translate(0,viewHeight-sceneHeight);ctx.strokeStyle='#dad8cf';ctx.lineWidth=1;for(let i=0;i<viewWidth/60+2;i++){const gx=i*60-(cam*.2)%60;ctx.beginPath();ctx.moveTo(gx,sceneHeight-viewHeight);ctx.lineTo(gx,sceneHeight);ctx.stroke();}for(let i=0;i<viewHeight/60+1;i++){ctx.beginPath();ctx.moveTo(0,sceneHeight-i*60);ctx.lineTo(viewWidth,sceneHeight-i*60);ctx.stroke();}
 ctx.save();ctx.translate(-cam,0);ctx.fillStyle='#292c2a';ctx.fillRect(cam,floor,viewWidth,sceneHeight-floor);ctx.fillStyle='#77786f';ctx.fillRect(cam,floor,viewWidth,3);
 const u=l.underground,below=u&&route!=='surface';
 if(below){
  ctx.fillStyle='#d8ddd4';ctx.fillRect(cam,u.roof,viewWidth,u.floor-u.roof);
  ctx.fillStyle='#9baca1';ctx.fillRect(cam,u.floor,viewWidth,3);
  ctx.fillStyle='#eae8df';ctx.fillRect(u.entry[0],floor,u.entry[1]-u.entry[0],u.floor-floor);
 }
 for(const h of allHoles()){
  const entry=u&&h===u.entry,depth=u?(entry&&below?u.floor-floor:u.pitBottom-floor):sceneHeight-floor;
  ctx.fillStyle='#eae8df';ctx.fillRect(h[0],floor,h[1]-h[0],depth);
  ctx.fillStyle='#d8402e';ctx.fillRect(h[0],floor,Math.min(2,(h[1]-h[0])/2),depth);ctx.fillRect(h[1]-Math.min(2,(h[1]-h[0])/2),floor,Math.min(2,(h[1]-h[0])/2),depth);
  if(u&&!entry){
   ctx.save();ctx.beginPath();ctx.rect(h[0],floor,h[1]-h[0],depth);ctx.clip();ctx.fillStyle='#292c2a';
   for(let px=h[0];px<h[1];px+=18){ctx.beginPath();ctx.moveTo(px,u.pitBottom);ctx.lineTo(px+9,u.pitBottom-24);ctx.lineTo(px+18,u.pitBottom);ctx.fill();}ctx.restore();
  }
 }
 if(below&&x>=u.spike-110){
  const growth=clamp01((x-(u.spike-110))/35);ctx.fillStyle='#292c2a';
  for(let px=u.spike-90;px<u.spike+95;px+=24){ctx.beginPath();ctx.moveTo(px,u.roof);ctx.lineTo(px+12,u.roof+30*growth);ctx.lineTo(px+24,u.roof);ctx.fill();}
  if(x>=u.spike-40){ctx.beginPath();ctx.moveTo(u.spike,u.floor);ctx.lineTo(u.spike+17,u.floor-32);ctx.lineTo(u.spike+34,u.floor);ctx.fill();}
 }

 for(const spike of allSpikes()){if(spike.height<=0)continue;
 const sx=spike.x;
 if(spike.moving){ctx.strokeStyle='#d8402e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx+40,floor-8);ctx.lineTo(sx+65,floor-8);ctx.stroke();}
 ctx.fillStyle='#292c2a';ctx.beginPath();ctx.moveTo(sx,floor);ctx.lineTo(sx+17,floor-spike.height);ctx.lineTo(sx+34,floor);ctx.fill();
 }
 for(const original of allCeilings()){
 const c=ceilingShape(original);
 ctx.fillStyle='#30322e';ctx.fillRect(c[0],0,c[1]-c[0],c[2]-28);
 function drawTooth(t){ctx.beginPath();ctx.moveTo(t.x,t.top);ctx.lineTo(t.x+12,t.top+t.height);ctx.lineTo(t.x+24,t.top);ctx.fill();}
 for(let sx=c[0];sx<c[1];sx+=24){if(original[3]==='tooth'&&sx===fallingTooth(original).x)continue;drawTooth({x:sx,top:c[2]-28,height:28});}
 if(original[3]==='tooth'){const t=fallingTooth(original);ctx.fillStyle=t.warning?'#d8402e':'#30322e';drawTooth(t);}
 }
 function flag(px,fake,ground=floor){ctx.fillStyle='#d8402e';ctx.fillRect(px,ground-120,3,120);ctx.fillRect(px+3,ground-120,60,32);if(!fake)text('GOAL',px+10,ground-99,15,'#fff');}
 if(l.fake)flag(l.fake,true);
 if(u){flag(u.surfaceGoal,true);if(below)flag(l.length+30,false,u.floor);}
 else flag(goalPosition(),false);

 if(state!=='dead'){ctx.fillStyle='#d8402e';ctx.fillRect(x,y,size,size);ctx.fillRect(x+3,y-7,6,9);ctx.fillRect(x+23,y-7,6,9);ctx.fillStyle='#fff';ctx.fillRect(x+17,y+8,5,6);ctx.fillRect(x+26,y+8,5,6);ctx.fillStyle='#292c2a';ctx.fillRect(x+21,y+23,9,3);if(grounded){const step=Math.sin(elapsed*25)*3;ctx.fillStyle='#d8402e';ctx.fillRect(x+3,y+size,8,step+4);ctx.fillRect(x+21,y+size,8,4-step);}}else{ctx.fillStyle='#d8402e';for(const p of particles)ctx.fillRect(p.x,p.y,7,7);}ctx.restore();ctx.restore();}
function frame(t){if(!last)last=t;acc+=Math.min((t-last)/1000,.05);last=t;while(acc>=1/120){update(1/120);acc-=1/120;}draw();requestAnimationFrame(frame);}load();requestAnimationFrame(frame);
