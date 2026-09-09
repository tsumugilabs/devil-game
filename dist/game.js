'use strict';
const canvas=document.querySelector('#game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
const levels=[
 {name:'はじめの裏切り',length:1900,speed:235,spikes:[620,1250],hiddenSpikes:[1250],holes:[[820,965,755],[1590,1730,1535]],ceil:[]},
 {name:'高く跳べばいい、とは限らない',length:2200,speed:245,spikes:[640,1280,1640],hiddenSpikes:[1640],holes:[[860,1005,795],[1870,2010,1815]],ceil:[[570,760,180]],fake:1770},
 {name:'足元をご覧ください',length:2300,speed:255,spikes:[520,1770],hiddenSpikes:[520,1770],holes:[[710,850,645],[2010,2150,1955]],baitHoles:[[1120,1210,1290,1430]],spikeModes:{1770:'slide'},ceil:[[430,610,245,'drop']],fake:1900},
 {name:'ゴールはすぐそこ',length:2500,speed:250,spikes:[580,1160,1710,2280],hiddenSpikes:[1710,2280],holes:[[780,920,715],[1990,2140,1925]],spikeModes:{1710:'swap'},ceil:[[1085,1260,245,'drop'],[1420,1600,180,'tooth']],fake:1830},
 {name:'最後まで信用しないで',length:3000,speed:260,spikes:[540,1160,1770,2460,2880],hiddenSpikes:[540,1770,2460,2880],holes:[[740,885,675],[1980,2120,1915],[2660,2800,2605]],baitHoles:[[1380,1470,1550,1690]],spikeModes:{1770:'slide',2880:'swap'},ceil:[[1090,1250,245,'drop'],[2210,2340,180,'tooth'],[2390,2540,245,'drop']],fake:2240}
];
let level=0,deaths=0,state='ready',x=100,y=338,vy=0,held=false,grounded=true,elapsed=0,deadTime=0,last=0,acc=0,particles=[];
let viewWidth=1000, viewHeight=480;
function resize(){const w=window.innerWidth,h=window.innerHeight,scale=Math.min(w/640,h/480),dpr=Math.min(window.devicePixelRatio||1,2);viewWidth=w/scale;viewHeight=h/scale;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);}
window.addEventListener('resize',resize);resize();
const floor=370, size=32;
function load(){x=100;y=floor-size;vy=0;held=false;grounded=true;elapsed=0;particles=[];$('stage').textContent=String(level+1).padStart(2,'0')+' / 05';$('name').textContent=levels[level].name;$('progress').style.width='0%';}
function start(){if(state==='complete')level=0;load();state='playing';$('overlay').classList.add('hidden');}
function jump(){if(state!=='playing')return;if(grounded){vy=-650;grounded=false;}held=true;}
function release(){held=false;if(vy< -270)vy=-270;}
function die(reason){if(state!=='playing')return;state='dead';held=false;deaths++;deadTime=0;$('deaths').textContent=String(deaths).padStart(3,'0');$('eyebrow').textContent='YOU DIED · '+String(deaths).padStart(3,'0');$('title').textContent=['今のは、床のせい。','知っていれば、余裕。','もう一回だけ。','信じてしまいましたね。'][deaths%4];$('message').textContent=reason;$('action').innerHTML='もう一度 <span>↺</span>';for(let i=0;i<18;i++)particles.push({x:x+16,y:y+16,vx:Math.sin(i*7)*180,vy:Math.cos(i*3)*240,t:0});}
function win(){state=level===4?'complete':'cleared';held=false;$('eyebrow').textContent=state==='complete'?'HELL, CONQUERED.':'STAGE CLEAR';$('title').textContent=state==='complete'?'お見事。悪魔も降参です。':'まだ、終わりではありません。';$('message').textContent=state==='complete'?`全5ステージを突破。死亡回数：${deaths}回`:'次のステージでは、別の罠が待っています。';$('action').innerHTML=state==='complete'?'最初から遊ぶ <span>↺</span>':'次のステージ <span>→</span>';$('overlay').classList.remove('hidden');}
function act(){if(state==='cleared')level++;start();}
$('action').addEventListener('click',act);$('restart').addEventListener('click',start);
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);jump();});canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','KeyR'].includes(e.code)){if(e.target.tagName==='BUTTON'&&e.code==='Space')return;e.preventDefault();if(e.repeat)return;if(e.code==='KeyR'){start();return;}if(state==='playing')jump();else if(state!=='dead'||deadTime>.45)act();}});window.addEventListener('keyup',e=>{if(['Space','ArrowUp'].includes(e.code))release();});window.addEventListener('blur',release);document.addEventListener('visibilitychange',()=>{last=0;acc=0;release();});

// Trap geometry is shared by physics and rendering; progress is deterministic.
const clamp01=n=>Math.max(0,Math.min(1,n));
function holeShape(h){
 const age=Math.max(0,(x-(h[0]-220))/levels[level].speed);
 const accelerated=level>=1;
 const growth=accelerated?(age<.60?.16*age/.60:.16+.84*clamp01((age-.60)/.18)):clamp01(age/.80);
 const center=(h[0]+h[1])/2,width=(h[1]-h[0])*growth;
 return [center-width/2,center+width/2];
}
function spikeShape(base){
 const hidden=(levels[level].hiddenSpikes||[]).includes(base);
 if(!hidden)return {x:base,height:32,moving:false};
 const moving=level>=2;
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
function allHoles(){const l=levels[level];return [...l.holes.map(holeShape),...(l.baitHoles||[]).flatMap(baitShapes)].filter(h=>h[1]-h[0]>.01);}
function allSpikes(){
 const l=levels[level];
 return l.spikes.flatMap(base=>{
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
 });
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

function update(dt){if(state==='dead'){deadTime+=dt;for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=850*dt;p.t+=dt;}if(deadTime>.45)$('overlay').classList.remove('hidden');return;}if(state!=='playing')return;const l=levels[level];elapsed+=dt;const previousX=x;x+=l.speed*dt;const previousBottom=y+size;vy+=(held&&vy<0?1550:2050)*dt;y+=vy*dt;
 const openHoles=allHoles();
 const supported=px=>!openHoles.some(h=>px>=h[0]&&px+size<=h[1]);
 const crossing=y+size>=floor&&previousBottom<=floor;
 const fraction=crossing?Math.max(0,Math.min(1,(floor-previousBottom)/(y+size-previousBottom||1))):1;
 const crossingX=previousX+(x-previousX)*fraction;
 if(vy>=0&&y+size>=floor&&previousBottom<=floor+8&&
    (supported(x)||crossing&&supported(crossingX))){
   y=floor-size;vy=0;grounded=true;
 }else grounded=false;
 // A jump that really is too low hits the bank instead of passing through it.
 if(y+size>floor+8&&y<floor&&openHoles.some(h=>previousX+size<=h[1]&&x+size>h[1])){
   die('届きそうでしたね。届いてはいませんが。');return;
 }
 if(y>490){die(l.fake&&x>l.fake?'ゴールだと、思いました？':'着地点に床があるとは、言っていません。');return;}
 for(const spike of allSpikes()){
 const left=Math.max(x+4,spike.x),right=Math.min(x+size-4,spike.x+34);
 if(spike.height>0&&left<right){
  const nearest=Math.max(left,Math.min(right,spike.x+17));
  const surface=floor-spike.height*(1-Math.abs(nearest-spike.x-17)/17);
  if(y+size>surface&&y<floor){die(level>=2?'待ってくれるトゲだと、思いました？':'生えてくるところ、見えていましたよね。');return;}
 }
 }
 for(const original of l.ceil){
 const c=ceilingShape(original);
 if(x+size-4>c[0]&&x+4<c[1]&&y<c[2]-28){die('天井にも、都合というものがあります。');return;}
 for(let sx=c[0];sx<c[1];sx+=24){
  if(original[3]==='tooth'&&sx===fallingTooth(original).x)continue;
  if(toothHits({x:sx,top:c[2]-28,height:28})){die('その高さ、さっきまでは安全でしたね。');return;}
 }
 if(original[3]==='tooth'&&toothHits(fallingTooth(original))){die('全部落ちるとは、言っていません。一つで十分です。');return;}
 }
 if(x>=l.length)win();$('progress').style.width=Math.min(100,(x-100)/(l.length-100)*100)+'%';}
function text(t,a,b,s=16,color='#6c6d69'){ctx.fillStyle=color;ctx.font=`${s}px monospace`;ctx.fillText(t,a,b);}
function draw(){const l=levels[level],cam=Math.max(0,x-210);ctx.fillStyle='#eae8df';ctx.fillRect(0,0,viewWidth,viewHeight);ctx.save();ctx.translate(0,viewHeight-480);ctx.strokeStyle='#dad8cf';ctx.lineWidth=1;for(let i=0;i<viewWidth/60+2;i++){const gx=i*60-(cam*.2)%60;ctx.beginPath();ctx.moveTo(gx,480-viewHeight);ctx.lineTo(gx,480);ctx.stroke();}for(let i=0;i<viewHeight/60+1;i++){ctx.beginPath();ctx.moveTo(0,480-i*60);ctx.lineTo(viewWidth,480-i*60);ctx.stroke();}
 ctx.save();ctx.translate(-cam,0);ctx.fillStyle='#292c2a';ctx.fillRect(cam,floor,viewWidth,110);ctx.fillStyle='#77786f';ctx.fillRect(cam,floor,viewWidth,3);
 for(const h of allHoles()){
 if(h[1]-h[0]>.01){ctx.fillStyle='#eae8df';ctx.fillRect(h[0],floor,h[1]-h[0],110);ctx.fillStyle='#d8402e';ctx.fillRect(h[0],floor,Math.min(2,(h[1]-h[0])/2),110);ctx.fillRect(h[1]-Math.min(2,(h[1]-h[0])/2),floor,Math.min(2,(h[1]-h[0])/2),110);}
 }
 for(const spike of allSpikes()){if(spike.height<=0)continue;
 const sx=spike.x;
 if(spike.moving){ctx.strokeStyle='#d8402e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx+40,floor-8);ctx.lineTo(sx+65,floor-8);ctx.stroke();}
 ctx.fillStyle='#292c2a';ctx.beginPath();ctx.moveTo(sx,floor);ctx.lineTo(sx+17,floor-spike.height);ctx.lineTo(sx+34,floor);ctx.fill();
 }
 for(const original of l.ceil){
 const c=ceilingShape(original);
 ctx.fillStyle='#30322e';ctx.fillRect(c[0],0,c[1]-c[0],c[2]-28);
 function drawTooth(t){ctx.beginPath();ctx.moveTo(t.x,t.top);ctx.lineTo(t.x+12,t.top+t.height);ctx.lineTo(t.x+24,t.top);ctx.fill();}
 for(let sx=c[0];sx<c[1];sx+=24){if(original[3]==='tooth'&&sx===fallingTooth(original).x)continue;drawTooth({x:sx,top:c[2]-28,height:28});}
 if(original[3]==='tooth'){const t=fallingTooth(original);ctx.fillStyle=t.warning?'#d8402e':'#30322e';drawTooth(t);}
 }
 function flag(px,fake){ctx.fillStyle='#d8402e';ctx.fillRect(px,floor-120,3,120);ctx.fillRect(px+3,floor-120,60,32);text('GOAL',px+10,floor-99,15,'#fff');}if(l.fake)flag(l.fake,true);flag(l.length+30,false);
 if(state!=='dead'){ctx.fillStyle='#d8402e';ctx.fillRect(x,y,size,size);ctx.fillRect(x+3,y-7,6,9);ctx.fillRect(x+23,y-7,6,9);ctx.fillStyle='#fff';ctx.fillRect(x+17,y+8,5,6);ctx.fillRect(x+26,y+8,5,6);ctx.fillStyle='#292c2a';ctx.fillRect(x+21,y+23,9,3);if(grounded){const step=Math.sin(elapsed*25)*3;ctx.fillStyle='#d8402e';ctx.fillRect(x+3,y+size,8,step+4);ctx.fillRect(x+21,y+size,8,4-step);}}else{ctx.fillStyle='#d8402e';for(const p of particles)ctx.fillRect(p.x,p.y,7,7);}ctx.restore();ctx.restore();}
function frame(t){if(!last)last=t;acc+=Math.min((t-last)/1000,.05);last=t;while(acc>=1/120){update(1/120);acc-=1/120;}draw();requestAnimationFrame(frame);}load();requestAnimationFrame(frame);
