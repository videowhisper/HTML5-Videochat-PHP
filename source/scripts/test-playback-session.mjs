// Exercise real layout render methods before renewing playback credentials.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const client = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)));
const require = createRequire(resolve(process.env.VW_H5_DEPENDENCIES || client, 'package.json'));
const React = require('react');
const parser = require('@babel/parser');
const babel = require('@babel/core');
const jsx = require('@babel/plugin-transform-react-jsx');
const helper = readFileSync(resolve(client, 'src/services/socketAuth.js'), 'utf8');
const { requestSocketAuth } = await import('data:text/javascript;base64,' + Buffer.from(helper).toString('base64'));
const renderers = new Map();
for (const name of ['PlaybackScreen','PlaybackAudioScreen','Way2Screen','Way2AudioScreen','CollaborationScreen','CollaborationPiPScreen','PiP','Multimedia','Media']) {
  const source = readFileSync(resolve(client, `src/containers/${name}.jsx`), 'utf8');
  const ast = parser.parse(source, {sourceType:'module',plugins:['jsx','classProperties']});
  const imports = ast.program.body.filter(n=>n.type==='ImportDeclaration').flatMap(n=>n.specifiers.map(s=>s.local.name)).filter(n=>n!=='React');
  const declaration = ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
  const method = declaration.body.body.find(n=>n.type==='ClassMethod'&&n.key.name==='render');
  const body = source.slice(method.body.start+1,method.body.end-1);
  const code = babel.transformSync(`function render(){${body}}`,{plugins:[jsx],babelrc:false,configFile:false}).code;
  // Child components are left as element types, then their actual renders expand below.
  renderers.set(name,new Function('React',...imports,`${code};return render;`)(React,...imports));
}
function videos(node, output=[]) {
  if(Array.isArray(node))node.forEach(child=>videos(child,output));
  else if(React.isValidElement(node)) {
    if(node.type==='Video')output.push(node.props);
    else if(renderers.has(node.type))videos(renderers.get(node.type).call({props:node.props,state:{}}),output);
    else videos(node.props.children,output);
  }
  return output;
}
const originalFetch=global.fetch;let checks=0;
try {
 for(const actor of [{ID:0,name:'Guest'},{ID:17,name:'Member'}]) {
  for(const screen of ['PlaybackScreen','PlaybackAudioScreen','Way2Screen','Way2AudioScreen','CollaborationScreen','CollaborationPiPScreen']) {
   for(const type of screen.startsWith('Collaboration')?['user','stream','video']:['stream']) {
    const user={...actor,sessionID:71,sessionKey:'synthetic-session-key'};
    const props={user,config:{serverURL:'https://site.example/app',nonce:'session-nonce'},room:{ID:8,streamUID:99,users:{99:{userName:'Publisher',meta:{external:false}}}},appState:{username:actor.name,media:{Main:{type,userID:99}}}};
    Object.defineProperty(props.config,'vwsToken',{get(){throw Error('Account token read');}});
    const children=videos(renderers.get(screen).call({props,state:{}}));
    assert.equal(children.length,1,`${screen}/${type}: expected one live playback panel`);
    assert.equal(children[0].user,user,`${screen}/${type}: playback must receive the session user`);
    let requested=false;
    global.fetch=async(url,options)=>{
      requested=true;assert.equal(url,props.config.serverURL);assert.equal(options.credentials,'same-origin');
      for(const [key,value]of Object.entries({userID:actor.ID,sessionID:71,sessionKey:user.sessionKey,roomID:8,nonce:'session-nonce'}))assert.equal(options.body.get(`VideoWhisper[${key}]`),String(value));
      assert.equal(options.body.get('task'),'socket_auth');
      return{ok:true,json:async()=>({vwsAuth:{account:'test-account',pin:'fresh-peer-pin'}})};
    };
    const auth=await requestSocketAuth(children[0],actor.name+'_play',new AbortController().signal);
    assert(requested);assert.deepEqual(auth,{account:'test-account',user:actor.name+'_play',pin:'fresh-peer-pin'});
    ++checks;
   }
  }
 }
 // Multiple collaboration slots must use their own content and user metadata.
 for(const screen of ['CollaborationScreen','CollaborationPiPScreen']) {
  const user={ID:0,name:'Guest',sessionID:71,sessionKey:'synthetic-session-key'};
  const props={user,config:{},room:{streamUID:99,users:{99:{userName:'External',hls:'https://example.invalid/hls',meta:{external:true}},100:{userName:'Live',meta:{external:false}}}},appState:{media:{Main:{type:'user',userID:100,stream:'live-selected?key=1'},Other:{type:'stream',stream:'other-stream'}}}};
  const children=videos(renderers.get(screen).call({props,state:{}}));
  assert.equal(children.length,2,`${screen}: slot user must determine WebRTC versus HLS`);
  assert.equal(children[0].content.stream,'live-selected?key=1');assert.equal(children[1].content.stream,'other-stream');
  ++checks;
 }
 console.log(`Playback layout/session checks passed: ${checks}`);
} finally {global.fetch=originalFetch;}
