const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}},addEventListener(){}});
const graphics=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const context={document:{querySelector:()=>({getContext:()=>graphics,addEventListener(){}}),getElementById:id=>elements[id]??=element(),addEventListener(){}},window:{innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}},requestAnimationFrame(){},Math,Set,console};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'),context);
const run=s=>vm.runInContext(s,context);

const validate=require('./validate-taunts.cjs');
const config=JSON.parse(fs.readFileSync(__dirname+'/../dist/taunts.json','utf8'));
const initial=JSON.parse(run('JSON.stringify({random:taunts,reasons})'));
assert.deepStrictEqual(initial.random,config['ランダム']);
assert.deepStrictEqual(initial.reasons,config['罠専用']);
validate(config);
for(const bad of [{...config,'ランダム':[]},{...config,'ランダム':['']},{...config,'罠専用':{}}]){
 assert.throws(()=>validate(bad));
 assert.throws(()=>run('applyTauntConfig('+JSON.stringify(bad)+')'));
}
(async()=>{
 const custom=JSON.parse(JSON.stringify(config));custom['ランダム']=['編集した文句 <b>そのまま表示</b>'];
 for(const key of Object.keys(custom['罠専用']))custom['罠専用'][key]='編集済み：'+key;
 context.fetch=async(url,options)=>{assert.strictEqual(url,'./taunts.json');assert.strictEqual(options.cache,'no-store');return {ok:true,json:async()=>custom};};
 await run('loadTauntConfig()');
 for(let i=0;i<3;i++){run("state='ready';start();die(reasons['通常の穴へ落下']);");assert.strictEqual(elements.title.textContent,custom['ランダム'][0]);assert.strictEqual(elements.message.textContent,custom['罠専用']['通常の穴へ落下']);}
 assert.deepStrictEqual(JSON.parse(run('JSON.stringify(reasons)')),custom['罠専用']);
 context.console={...console,warn(){}};
 for(const response of [{ok:false},{ok:true,json:async()=>{throw Error('bad JSON');}},{ok:true,json:async()=>({'ランダム':[]})}]){
  context.fetch=async()=>response;await run('loadTauntConfig()');assert.strictEqual(run('randomTaunt()'),custom['ランダム'][0]);
 }
 context.fetch=async()=>{throw Error('offline');};await run('loadTauntConfig()');
 run('applyTauntConfig('+JSON.stringify(config)+')');let last;for(let i=0;i<100;i++){const next=run('randomTaunt()');assert.notStrictEqual(next,last);last=next;}
 console.log('Config fetch, edited death text, one-item list, invalid/offline fallback and repeat avoidance passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
