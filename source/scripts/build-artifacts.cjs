const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'build');
const files={};
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else files[path.relative(out,p).split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}}
// Preserve notices for production dependencies, including the vendored Fomantic CSS.
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));
let notices='Third-party notices for the bundled HTML5 Videochat runtime. Project licensing is unchanged.\n';
for(const [relative,info]of Object.entries(lock.packages)){
 if(!relative||info.dev)continue;
 const dir=path.join(root,relative);
 if(!fs.existsSync(dir))continue;
 for(const filename of fs.readdirSync(dir).filter(name=>/^(licen[sc]e|notice|copying)(\.|$)/i.test(name))){
  const p=path.join(dir,filename);if(!fs.statSync(p).isFile())continue;
  notices+='\n\n--- '+relative+' @ '+info.version+' / '+filename+' ---\n'+fs.readFileSync(p,'utf8');
 }
}
const vendor=path.join(root,'THIRD-PARTY-NOTICES.txt');
if(fs.existsSync(vendor))notices+='\n\n--- Existing vendor notices ---\n'+fs.readFileSync(vendor,'utf8');
const script=fs.readdirSync(path.join(out,'static/js')).find(name=>/^main\..*\.chunk\.js$/.test(name));
if(!script)throw Error('Classic app entry missing');
fs.writeFileSync(path.join(out,'static/js',script+'.LICENSE.txt'),notices);
walk(path.join(out,'static'));
fs.writeFileSync(path.join(out,'asset-manifest.json'),JSON.stringify({format:'classic-iife',files},null,2)+'\n');
console.log('Runtime manifest and third-party notices: '+Object.keys(files).length+' files.');
