// Defensive build-tool regressions. Uses only synthetic, ephemeral local keys.
const assert = require('node:assert/strict');
const https = require('node:https');
const forge = require('node-forge');
const selfsigned = require('selfsigned');

(async () => {
 const version = require('node-forge/package.json').version.split('.').map(Number);
 assert(version[0] > 1 || version[0] === 1 && (version[1] > 4 || version[1] === 4 && version[2] >= 3), 'Use node-forge 1.4.3 or newer');
 const digest = forge.md.sha256.create().update('VideoWhisper canonical DigestInfo regression').digest().getBytes();
 const pair = forge.pki.rsa.generateKeyPair({bits:1024,e:65537});
 // e=1 makes the synthetic encoded block its own signature, as in upstream tests.
 const key = forge.pki.setRsaPublicKey(pair.publicKey.n, new forge.jsbn.BigInteger('1',10));
 const length = Math.ceil(key.n.bitLength()/8);
 const block = value => '\x00\x01'+'\xff'.repeat(length-value.length-3)+'\x00'+value;
 const bytes = value => Buffer.from(value,'hex').toString('binary');
 const canonical = [
  bytes('3031300d060960864801650304020105000420')+digest,
  bytes('302f300b06096086480165030402010420')+digest,
 ];
 const noncanonical = [
  bytes('3033300f06096086480165030402010502beef0420')+digest,
  bytes('308131300d060960864801650304020105000420')+digest,
  bytes('3080300d060960864801650304020105000420')+digest+'\x00\x00',
 ];
 for(const value of canonical) assert.equal(key.verify(digest,block(value)),true,'Canonical DER remains valid');
 for(const value of noncanonical) {
  let rejected=false;
  try {rejected=key.verify(digest,block(value))===false;} catch {rejected=true;}
  assert(rejected,'Non-canonical DigestInfo must not verify');
 }
 const cert = selfsigned.generate([{name:'commonName',value:'localhost'}],{days:1,keySize:2048,algorithm:'sha256'});
 const parsed = forge.pki.certificateFromPem(cert.cert);
 assert.equal(parsed.verify(parsed),true,'Legacy selfsigned API remains compatible');
 const server=https.createServer({key:cert.private,cert:cert.cert},(_request,response)=>response.end('ok'));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try {
  const value=await new Promise((resolve,reject)=>{
   https.get({host:'127.0.0.1',port:server.address().port,servername:'localhost',ca:cert.cert},response=>{
    let data='';response.on('data',chunk=>data+=chunk);response.on('end',()=>resolve(data));
   }).on('error',reject);
  });
  assert.equal(value,'ok','HTTPS dev certificate works with explicit local CA validation');
 } finally {await new Promise(resolve=>server.close(resolve));}
 console.log('Forge dependency: canonical DER accepted, three malformed encodings rejected, selfsigned certificate and verified loopback HTTPS passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
