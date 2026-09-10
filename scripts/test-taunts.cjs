const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={};const element=()=>({textContent:'',innerHTML:'',style:{},classList:{add(){},remove(){}},addEventListener(){}});
const graphics=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const context={document:{querySelector:()=>({getContext:()=>graphics,addEventListener(){}}),getElementById:id=>elements[id]??=element(),addEventListener(){}},window:{innerWidth:390,innerHeight:844,devicePixelRatio:2,addEventListener(){}},requestAnimationFrame(){},Math,Set,console};
vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/game.js','utf8'),context);
const run=s=>vm.runInContext(s,context);

const validate=require('./validate-taunts.cjs');
const config=JSON.parse(fs.readFileSync(__dirname+'/../dist/taunts.json','utf8'));
const initial=JSON.parse(run('JSON.stringify({random:taunts,reasons})'));
validate({'ランダム':initial.random,'罠専用':initial.reasons});
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
 run('applyTauntConfig('+JSON.stringify({'ランダム':initial.random,'罠専用':initial.reasons})+')');let last;for(let i=0;i<100;i++){const next=run('randomTaunt()');assert.notStrictEqual(next,last);last=next;}

 const clearConfig={...config,'クリア時':{'各面クリア':{'見出し':'{ステージ}面クリア <b>文字</b>','本文':'死亡{死亡回数}回／全{総ステージ数}面'},'全ステージクリア':{'見出し':'全{総ステージ数}面終了','本文':'{死亡回数}回でした'}}};
 validate(clearConfig);
 run("state='ready';level=4;deaths=23;");
 run('applyTauntConfig('+JSON.stringify(clearConfig)+')');run('win()');
 assert.equal(elements.title.textContent,'5面クリア <b>文字</b>');assert.equal(elements.message.textContent,'死亡23回／全11面');
 run('act()');assert.equal(run('level'),5);assert.equal(run('state'),'playing');
 run('level=10;win()');assert.equal(elements.title.textContent,'全11面終了');assert.equal(elements.message.textContent,'23回でした');
 const changed=JSON.parse(JSON.stringify(clearConfig));changed['クリア時']['全ステージクリア']['本文']='更新後{死亡回数}回';
 run('applyTauntConfig('+JSON.stringify(changed)+')');assert.equal(elements.message.textContent,'更新後23回');
 run('act()');assert.equal(run('level'),0);
 const invalid={...clearConfig,'クリア時':{'各面クリア':{}}};
 assert.throws(()=>validate(invalid));assert.throws(()=>run('applyTauntConfig('+JSON.stringify(invalid)+')'));
 const legacy={...config};delete legacy['クリア時'];run('applyTauntConfig('+JSON.stringify(legacy)+')');run('level=10;win()');assert.equal(elements.title.textContent,'お見事。悪魔も降参です。');

 console.log('Editable clear messages and placeholders passed');
 console.log('Config fetch, edited death text, one-item list, invalid/offline fallback and repeat avoidance passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
