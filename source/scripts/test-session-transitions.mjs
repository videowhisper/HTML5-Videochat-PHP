import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const client=resolve(process.argv[2]||fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(resolve(process.env.VW_H5_DEPENDENCIES||client,'package.json'));
const parser=require('@babel/parser'),babel=require('@babel/core'),jsx=require('@babel/plugin-transform-react-jsx'),React=require('react');
const services=await import('data:text/javascript;base64,'+Buffer.from(readFileSync(resolve(client,'src/services/socketAuth.js'))).toString('base64'));
let checks=0;const check=(ok,label)=>{assert(ok,label);++checks;};
function method(component,name,io){
 const source=readFileSync(resolve(client,`src/components/${component}.jsx`),'utf8');
 const ast=parser.parse(source,{sourceType:'module',plugins:['jsx','classProperties']});
 const cls=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
 const node=cls.body.body.find(n=>n.type==='ClassMethod'&&n.key.name===name);assert(node,`${component}.${name}`);
 const params=node.params.map(n=>source.slice(n.start,n.end)).join(',');
 const code=babel.transformSync(`${node.async?'async ':''}function run(${params})${source.slice(node.body.start,node.body.end)}`,{plugins:[jsx],babelrc:false,configFile:false}).code;
 return new Function('React','io',...Object.keys(services),`${code};return run;`)(React,io,...Object.values(services));
}
function props(){return{user:{ID:7,name:'SessionPeer',sessionID:70,sessionKey:'session-key'},room:{ID:8,privateUID:11,streamBroadcast:'publish?key=1',streamPlayback:'default?key=1'},config:{serverURL:'https://site.example/app',vwsSocket:'wss://socket.example',nonce:'nonce',videoAutoPlay:'1'},appState:{username:'OldDisplayName'},serverUpdate(){},appStateUpdate(){}};}
const originalFetch=global.fetch;
try{
 for(const component of ['Camera','Video']){
  let sockets=[];
  function Socket(url,options){this.auth=options.auth;this.events={};this.on=(n,f)=>{this.events[n]=f;return this;};this.emit=(...args)=>{this.sent=args;};this.connect=()=>{this.connected=true;this.events.connect?.();};this.disconnect=()=>{this.disconnected=true;this.connected=false;};this.removeAllListeners=()=>{this.events={};};sockets.push(this);}
  function context(){return{props:props(),_isMounted:true,state:{connected:false,connecting:true},audioInterface:true,localStream:{getAudioTracks:()=>[]},streamInfo:{streamName:'default?key=1'},vwsPeers:[],serverVideowhisper:true,txt:s=>s,timerStop(){},stopSnapshots(){},remoteVideo:{current:{srcObject:{},src:''}},setState(s){this.state={...this.state,...s};},streamInfoReset(){this.resets=(this.resets||0)+1;},startStreamPlay(){++this.resumed;},startPublisher(){++this.resumed;},resumed:0};}
  const connect=method(component,'vwsConnect',Socket),ready=method(component,'vwsConnectReady',Socket);
  const c=context();c.vwsConnectReady=ready;
  global.fetch=async()=>({ok:true,json:async()=>({vwsAuth:{account:'account',pin:'pin'}})});
  await connect.call(c);
  check(c.vwsSocket.auth.user==='SessionPeer'+(component==='Video'?'_play':''),`${component}: session name wins over stale display name`);
  check(c.vwsSocket.sent[1]===c.vwsSocket.auth.user,`${component}: authenticated and signaled peer identities agree`);
  if(component==='Video') {
   c.state.available=true;
   const log=console.log,error=console.error;console.log=()=>{};console.error=()=>{};
   try{for(const event of ['connect_failed','connect_error','uniquenessError','subscribeError']){
    c.vwsRetryBlocked=false;c.vwsSocket.events[event]({message:'Synthetic authentication rejection'});
    method('Video','componentDidUpdate',Socket).call(c,c.props,{});
    assert(c.vwsRetryBlocked&&c.resumed===0,event+' must not start an automatic auth loop');
   }}finally{console.log=log;console.error=error;}
   ++checks;
  }

  // Resolve both successful and failed requests after a session/room handoff.
  for(const failed of [false,true]){
   const pending=context();let complete;global.fetch=()=>new Promise(r=>{complete=r;});let readyCount=0;pending.vwsConnectReady=()=>{++readyCount;};
   const running=connect.call(pending);const old=pending.vwsAuthRequest;
   pending.props={...pending.props,user:{...pending.props.user,sessionID:71,sessionKey:'next-key'},room:{...pending.props.room,privateUID:12}};
   complete({ok:!failed,json:async()=>failed?{error:'old session'}:{vwsAuth:{account:'account',pin:'old-pin'}}});await running;
   check(!readyCount&&!pending.state.statusInfo,`${component}: stale ${failed?'error':'success'} cannot affect the new private session`);
  }
  // An actual component update aborts old renewal, closes its socket and resumes once.
  for(const mutation of [
    p=>({...p,room:{...p.room,ID:9}}),
    p=>({...p,room:{...p.room,privateUID:22}}),
    p=>({...p,user:{...p.user,sessionID:71,sessionKey:'next-key'}}),
    p=>({...p,user:{...p.user,name:'NewPeer'}}),
    p=>({...p,config:{...p.config,vwsSocket:'wss://next.example'}}),
    p=>({...p,config:{...p.config,serverURL:'https://next.example/app'}}),
  ]) {
   const change=context(),previous=change.props;change.props=mutation(previous);
   change.state.connected=true;change.vwsPublish=true;change.vwsAuthRequest=new AbortController();const oldRequest=change.vwsAuthRequest;
   const oldSocket=new Socket('old',{auth:{}});change.vwsSocket=oldSocket;
   if(component==='Video')change.stopStreamPlay=method(component,'stopStreamPlay',Socket);
   else change.stopPublisher=method(component,'stopPublisher',Socket);
   method(component,'componentDidUpdate',Socket).call(change,previous,{});
   check(oldRequest.signal.aborted&&oldSocket.disconnected&&change.vwsSocket===null&&change.resumed===1,`${component}: session/room/provider handoff replaces pending auth and socket`);
   if(component==='Video')check(change.remoteVideo.current.srcObject===null,`Video: old private media is cleared`);
  }
  // Stopping a pending request must also reject late success, even if fetch ignores abort.
  const stopped=context();let complete;global.fetch=()=>new Promise(r=>{complete=r;});let started=0;stopped.vwsConnectReady=()=>{++started;};const running=connect.call(stopped);
  method(component,component==='Video'?'stopStreamPlay':'stopPublisher',Socket).call(stopped);
  complete({ok:true,json:async()=>({vwsAuth:{account:'account',pin:'late'}})});await running;
  check(started===0,`${component}: stopped request cannot reconnect`);
 }
 check(services.socketStreamName('plain-stream')==='plain-stream','Plain stream names are preserved');
 check(services.socketStreamName('stream?key=secret')==='stream','Only the query of the selected stream is removed');
 const selected=props();selected.content={stream:'long-collaboration-stream?key=2'};
 check(services.playbackStream(selected)===selected.content.stream,'Selected collaboration stream has priority');
 // Real ready method must derive its channel from selected content, not default length.
 let created;function Socket(){created=this;this.on=()=>this;this.connect=()=>{};}
 const c={props:selected,streamInfo:{},vwsSocket:null};method('Video','vwsConnectReady',Socket).call(c,{user:'SessionPeer_play',account:'account',pin:'pin'});
 check(c.vwsChannel==='long-collaboration-stream','Collaboration channel is not truncated at the default stream query index');
 // Preserve signatures for the separate Wowza path; normalization belongs only to Socket.IO.
 check(services.playbackStream(props())==='default?key=1','Raw playback stream retains its legacy query');
 const unchanged=props();check(services.socketSessionKey(unchanged)===services.socketSessionKey({...unchanged,config:{...unchanged.config,nonce:'renewed-nonce'}}),'Nonce refresh alone does not interrupt established media');
 const failed={props:props(),state:{available:true,connected:false,connecting:false},vwsRetryBlocked:true,resumed:0,startStreamPlay(){++this.resumed;}};
 method('Video','componentDidUpdate',Socket).call(failed,failed.props,{});
 check(failed.resumed===0,'Rejected renewal does not start an automatic authentication retry loop');
 failed.props.config.serverType='videowhisper';failed.vwsConnect=()=>{++failed.resumed;};failed.timerStart=()=>{};
 method('Video','startStreamPlay',Socket).call(failed);
 check(!failed.vwsRetryBlocked&&failed.resumed===1,'Explicit playback retry can request fresh authentication');
 // Newly available PHP metadata must schedule the update that starts playback.
 const available={props:props(),state:{available:false},streamInfo:{streamName:'default?key=1'},setState(value){this.scheduled=value;}};
 available.props.room.streamUID=99;available.props.room.users={99:{sdate:100,meta:{connected:true,connectedUpdate:101}}};
 method('Video','detectStreamChange',Socket).call(available);
 check(available.scheduled?.available===true,'A broadcaster becoming available schedules a playback update');
 // A fast publish must remain online after the initial camera-status reset.
 const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const events=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{enumerateDevices:async()=>[]}}});
 try {
  const camera={props:{config:{cameraAutoBroadcast:'1'},appState:{external:false},serverUpdate:value=>events.push(value.connected),appStateUpdate(){}},state:{},resolutionHeight:360,
   updateBitrates(){},bitrateOptions(){return[];},setState(value){Object.assign(this.state,value);},txt:value=>value,
   gotDevicesPublish(){this.props.serverUpdate({task:'media',connected:true});},handleError(error){throw error;}};
  method('Camera','interfaceReady',Socket).call(camera);
  await new Promise(resolve=>setTimeout(resolve,600));
  check(events.length===2&&events[0]===false&&events[1]===true,'Initial camera reset cannot overwrite a fast successful publish');
 } finally {if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;}
 // Check all real JSX boundaries, not a manually assembled Video-only props object.
 const sensitive=new Set(['Camera','Video','Media','Multimedia','PiP','Recorder','Uploads','Files']);let boundaries=0;
 function visit(n){if(!n||typeof n!=='object')return;if(n.type==='JSXOpeningElement'&&sensitive.has(n.name.name)){const fields=new Set(n.attributes.filter(a=>a.type==='JSXAttribute').map(a=>a.name.name));for(const field of ['user','room','config'])assert(fields.has(field),`${n.name.name} missing ${field}`);++boundaries;}for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);}}
 for(const dir of ['components','containers'])for(const file of readdirSync(resolve(client,'src',dir)).filter(f=>/\.(jsx|js)$/.test(f)))visit(parser.parse(readFileSync(resolve(client,'src',dir,file),'utf8'),{sourceType:'module',plugins:['jsx','classProperties']}));
 check(boundaries>=20,'All session-bearing JSX boundaries were inspected');
 console.log(`Session transition checks passed: ${checks}; prop boundaries checked: ${boundaries}`);
}finally{global.fetch=originalFetch;}
