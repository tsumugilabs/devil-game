const fs=require('node:fs');
const requiredKeys=["着地で岸に届かない","地下道で高くジャンプ","地下道の最後の地面トゲ","地下道以外の穴へ落下","逃げるゴールの穴","偽ゴールの先で落下","通常の穴へ落下","着地直後のトゲ","動くトゲ","通常のトゲ","低い天井でジャンプ","天井に衝突","天井のトゲ","天井から落ちる一本"];
function validate(config){
 const text=value=>typeof value==='string'&&value.trim().length>0;
 if(!config||!Array.isArray(config['ランダム'])||!config['ランダム'].length||!config['ランダム'].every(text))throw Error('ランダムには空でない文章を1件以上入れてください。');
 if(!config['罠専用']||!requiredKeys.every(key=>text(config['罠専用'][key])))throw Error('罠専用の項目名は残し、右側に空でない文章を入れてください。');
 const clear=config['クリア時'];
 const clearKeys=clear&&Object.prototype.hasOwnProperty.call(clear,'各面クリア')?['各面クリア','全ステージクリア']:Array.from({length:11},(_,i)=>(i+1)+'面');
 if(clear!==undefined&&(!clear||!clearKeys.every(key=>clear[key]&&['見出し','本文'].every(field=>text(clear[key][field])))))throw Error('クリア時は1面〜11面の見出しと本文を残してください。');
 return config;
}
if(require.main===module){
 try{validate(JSON.parse(fs.readFileSync(process.argv[2]||'dist/taunts.json','utf8')));console.log('煽り文句のチェックに合格しました。');}
 catch(error){console.error('煽り文句を確認してください：'+error.message);process.exitCode=1;}
}
module.exports=validate;
