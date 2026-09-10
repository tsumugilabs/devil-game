const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}},addEventListener(){}});
const graphics=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const context={document:{querySelector:()=>({getContext:()=>graphics,addEventListener(){}}),getElementById:id=>elements[id]??=element(),addEventListener(){}},window:{innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}},requestAnimationFrame(){},Math,Set,console};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
run(`state='ready';level=10;start();x=levels[level].underground.spike-size*4;if((levels[level].underground.spike-x-size)/size!==3||undergroundTrap().floorGrowth!==0)throw Error('Three-tile growth start');route='underground';y=levels[level].underground.floor-size;let previous=0;for(let tick=1;tick<=36;tick++){update(1/120);const trap=undergroundTrap();if(trap.floorGrowth<=previous||trap.ceilingGrowth!==0)throw Error('Smooth floor-first growth');if(tick===18&&Math.abs(trap.floorGrowth-.5)>1e-8)throw Error('Half height at 0.15 seconds');previous=trap.floorGrowth;}if(Math.abs(previous-1)>1e-8)throw Error('Full height at 0.3 seconds');for(const [offset,ceiling] of [[-40,0],[-1,0],[10,.5],[20,1]]){x=levels[level].underground.spike+offset;const trap=undergroundTrap();if(trap.floorGrowth!==1||trap.ceilingGrowth!==ceiling)throw Error('Underground trap emergence order');}start();if(undergroundTrap().floorGrowth||undergroundTrap().ceilingGrowth)throw Error('Trap reset');`);
run(`function solve(n,lead=35,secondJump=true){
 level=n;start();let jumpAt=-1,landingAt=null;
 for(let tick=0;tick<10000&&state==='playing';tick++){
  const l=levels[level];
  if(grounded){
   const spikes=[...l.spikes,...(secondJump&&landingSpike?[landingSpike.x]:[])].sort((a,b)=>a-b);
   const s=spikes.find(a=>a>x-20),h=[...l.holes,...(l.baitHoles||[]).map(b=>b.slice(2)),...(l.escapeGoal?[l.escapeGoal.hole]:[])].sort((a,b)=>a[0]-b[0]).find(a=>a[1]>x);
   if(s&&s-x<lead&&s>x){jump();jumpAt=tick;}
   else if(h&&h[0]-x<35&&h[0]>x){jump();jumpAt=-1;}
  }
  if(jumpAt>=0&&tick-jumpAt===5)release();
  const had=!!landingSpike;update(1/120);if(!had&&landingSpike)landingAt={x,y,tick};
 }
 return {stage:n+1,state,x,y,reason:$('message').textContent,landingAt};
}`);
for(let n=0;n<10;n++){
 let r;for(let lead=30;lead<=55;lead+=5){r=run(`solve(${n},${lead})`);if(['cleared','complete'].includes(r.state))break;}
 console.log(r);assert(['cleared','complete'].includes(r.state),'stage '+(n+1)+' solvable');
}
console.log('First ten stages pass');


// A blind approach cannot jump after the floor disappears, but the flag keeps animating.
for(const n of [8,9]){
 const r=run(`(()=>{level=${n};start();x=levels[level].escapeGoal.start-size-2;update(1/120);update(1/120);const instant={triggered:escapeTriggered,grounded,hole:allHoles().at(-1),position:goalPosition()};jump();for(let i=0;i<85;i++)update(1/120);return {instant,state,goal:goalPosition(),target:levels[level].escapeGoal.end};})()`);
 console.log('blind goal',n+1,r);assert(r.instant.triggered&&!r.instant.grounded&&r.state==='dead');assert.strictEqual(r.goal,r.target);
}
const single=run('solve(9,35,false)');console.log('no second jump',single);assert.strictEqual(single.state,'dead');assert(single.landingAt);
// Different widths still draw both routes and the long death text without altering physics.
run(`function undergroundRun(holdTicks=5,jumpLead=35){state='ready';level=10;start();let jumped=false,jumpAt=-1,entered=false;for(let tick=0;tick<10000&&state==='playing';tick++){if(route==='underground')entered=true;if(route==='underground'&&!jumped&&levels[level].underground.spike-x<jumpLead){jump();jumped=true;jumpAt=tick;}if(jumpAt>=0&&tick-jumpAt===holdTicks)release();update(1/120);if(tick%80===0)draw();}return {state,x,y,route,entered,reason:$('message').textContent};}`);
const low=run('undergroundRun()');console.log('underground short jump',low);assert.strictEqual(low.state,'complete');assert(low.entered);
const high=run('undergroundRun(100)');console.log('underground high jump',high);assert.strictEqual(high.state,'dead');assert(high.entered);assert(high.reason.includes('大きく')); 
const none=run('undergroundRun(0,-100)');console.log('underground no jump',none);assert.strictEqual(none.state,'dead');
// Skipping the first opening stays on the surface. Falling into a later pit is lethal.
const otherPit=run(`(()=>{state='ready';level=10;start();x=790;y=floor-size;vy=0;grounded=false;for(let i=0;i<60&&state==='playing';i++)update(1/120);return {state,route,y};})()`);console.log('later pit',otherPit);assert.strictEqual(otherPit.state,'dead');assert.strictEqual(otherPit.route,'surface');
// A 490 px solid spike strip is longer than the greatest possible jump (<220px).
const wall=run(`(()=>{state='ready';level=10;start();x=4460;y=floor-size-135;vy=0;grounded=false;held=true;for(let i=0;i<150&&state==='playing';i++)update(1/120);return {state,x,route};})()`);console.log('surface wall',wall);assert.strictEqual(wall.state,'dead');assert(wall.x<4700);
run(`state='ready';level=10;start();x=5200;y=floor-size;route='surface';update(1/120);if(state==='complete')throw Error('Surface must never clear');level=9;start();escapeTriggered=true;escapeAge=.3;landingSpike={x:999,height:32};jumpBuffer=.1;start();if(escapeTriggered||escapeAge||landingSpike||jumpBuffer||route!=='surface')throw Error('Incomplete retry reset');`);
run(`state='ready';level=10;start();route='underground';for(const [w,h] of [[390,844],[844,390],[1366,768]]){window.innerWidth=w;window.innerHeight=h;resize();draw();if(sceneHeight!==720||viewHeight<720)throw Error('Underground viewport');}if(!taunts.includes('難易度下げますか？…あ、これ以上簡単なの無かったか'))throw Error('Taunt correction');win();if(!$('message').textContent.includes('全11'))throw Error('Eleven-stage ending');act();if(level!==0)throw Error('Full restart');`);
console.log('All special trap, route, viewport and restart checks pass');

run(`level=0;start();x=935;y=337;vy=200;grounded=false;update(1/120);if(!grounded||y!==338)throw Error('Leading edge landing');start();x=870;y=338;vy=0;grounded=false;update(1/120);if(grounded)throw Error('Solid hole');start();x=932;y=360;vy=200;grounded=false;update(1/120);if(state!=='dead')throw Error('Bank side collision');`);
const buffered=run(`(()=>{level=9;start();escapeTriggered=true;escapeAge=.3;x=2340;y=337;vy=200;grounded=false;jump();update(1/120);return {state,buffer:jumpBuffer,vy,grounded,spike:landingSpike};})()`);console.log('Landing input buffer',buffered);assert(buffered.spike&&!buffered.grounded&&buffered.vy<0);
// The safe entrance is bypassable by a normal jump, with no forced route switch in mid-air.
run(`state='ready';level=10;start();if((levels[10].underground.entry[0]-size/2-x)/levels[10].speed<1.4)throw Error('Entrance approach too short');for(let i=0;i<168;i++)update(1/120);if(route!=='surface'||state!=='playing')throw Error('Unsafe opening runway');if(!levels[4].spikes.includes(540))throw Error('Stage five changed');`);
for(const lead of [35,55,75]){
 for(const holdTicks of [5,100]){
  const entryJump=run(`(()=>{state='ready';level=10;start();while(x<levels[10].underground.entry[0]-${lead})update(1/120);jump();for(let i=0;i<110&&state==='playing';i++){if(i===${holdTicks})release();update(1/120);}return {state,route,x,grounded};})()`);
  assert.strictEqual(entryJump.route,'surface');assert.strictEqual(entryJump.state,'playing');assert(entryJump.grounded);
 }
}
run(`level=10;start();x=5200;y=floor-size;route='surface';update(1/120);if(state!=='playing')throw Error('Surface completion');`);
console.log('Landing regression, buffered jump, entrance bypass and route gate passed');

run(`level=10;start();if(levels[10].length+30<=Math.max(...surfaceTail().map(s=>s.x+34)))throw Error("True goal must lie beyond surface wall");`);
