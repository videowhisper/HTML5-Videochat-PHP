#!/usr/bin/env python3
"""Loopback-only pre-publishing checks. Uses synthetic credentials and temporary storage."""
import http.cookiejar,json,os,pathlib,re,socket,subprocess,tempfile,time,urllib.request,urllib.parse,urllib.error
root=pathlib.Path(__file__).resolve().parent.parent
# Operators may run the shared workspace copy with an explicit source root.
if len(__import__('sys').argv)>1:root=pathlib.Path(__import__('sys').argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='vwh5-check-') as temp:
 with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
 env=dict(os.environ,VWH5_ACCOUNT='local_test',VWH5_TOKEN='local-synthetic-token-never-production',VWH5_SOCKET='http://127.0.0.1:8094',VWH5_STORAGE_DIR=temp+'/state')
 log=open(temp+'/php.log','w');proc=subprocess.Popen(['php','-d','display_errors=0','-S',f'127.0.0.1:{port}','-t',str(root)],env=env,stdout=log,stderr=log)
 base=f'http://127.0.0.1:{port}/';checks=0
 def browser():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 def req(client,path,body=None,raw=False):
  try:r=client.open(urllib.request.Request(base+path,data=body,headers={'Content-Type':'application/x-www-form-urlencoded'} if body else {}));status=r.status;headers=r.headers;data=r.read().decode()
  except urllib.error.HTTPError as e:status=e.code;headers=e.headers;data=e.read().decode()
  return status,headers,data if raw else json.loads(data)
 def post(c,task,proof,extra=None):
  form={'task':task,**{'VideoWhisper['+k+']':str(v) for k,v in proof.items()},**(extra or {})}
  return req(c,'app-call.php',urllib.parse.urlencode(form).encode())
 def proof(c,page):
  status,headers,html=req(c,page,raw=True);assert status==200 and 'no-store' in headers['Cache-Control']
  keys={k:re.search(k+r":\s*(?:'([^']*)'|([0-9]+))",html) for k in ['userID','sessionID','sessionKey','roomID']};assert all(keys.values()),'Missing app bootstrap'
  return {k:m.group(1) or m.group(2) for k,m in keys.items()}
 try:
  for _ in range(50):
   try:urllib.request.urlopen(base,timeout=1).close();break
   except (OSError,urllib.error.HTTPError):time.sleep(.1)
  owner=browser();guest=browser();stranger=browser();entry='recorder.php' if (root/'recorder.php').exists() else ''
  own=proof(owner,entry);invited=proof(guest,entry+'?r='+own['roomID']);checks+=2
  a,h,data=post(owner,'login',own);assert a==200 and data['user']['ID']==int(own['userID']) and data['user']['sessionKey']==own['sessionKey'];assert 'no-store' in h['Cache-Control'];assert 'local-synthetic-token' not in json.dumps(data);checks+=3
  assert post(stranger,'login',own)[0]==403;checks+=1
  wrong=dict(own,roomID='9001' if own['roomID']!='9001' else '9002');assert post(owner,'login',wrong)[0]==403;checks+=1
  wrong=dict(own,sessionKey='wrong');assert post(owner,'login',wrong)[0]==403;checks+=1
  assert post(owner,'tick',own)[0]==200;checks+=1
  if data['config'].get('serverType')=='videowhisper':
   _,_,auth=post(owner,'socket_auth',own);auth=auth['vwsAuth'];assert auth['account']=='local_test' and auth['pin'];checks+=1
   user=data['user']['name']
   def callback(who,token):
    payload=json.dumps({'account':'local_test','token':token,'user':who,'pin':auth['pin']}).encode()
    return json.loads(owner.open(urllib.request.Request(base+'socket-auth.php',data=payload,headers={'Content-Type':'application/json'})).read())
   assert callback(user,env['VWH5_TOKEN'])['login'];assert callback(user+'_play',env['VWH5_TOKEN'])['login'];assert not callback('Another_user',env['VWH5_TOKEN'])['login'];assert not callback(user,'wrong')['login'];checks+=4
   _,_,message=post(owner,'message',own,{'message[text]':'Local smoke message','message[userName]':'Forged name','message[mentionMessage]':'0','message[mentionUser]':''})
   assert message.get('messageNew',{}).get('username')==user;checks+=1
   _,_,tick=post(guest,'tick',invited);assert any(x.get('text')=='Local smoke message' for x in tick['messages']);checks+=1
  assert req(stranger,'uploads/'+own['roomID']+'_sessions',raw=True)[0]==404;checks+=1
  assert (pathlib.Path(temp)/'state').is_dir();checks+=1
  log.flush();issues=re.findall(r'PHP (?:Warning|Deprecated|Fatal error): (.*?) in .*?/([^/ ]+\.php) on line ([0-9]+)',pathlib.Path(temp+'/php.log').read_text());
  if issues: print('PHP diagnostics:', sorted(set((x[1],x[2],x[0][:100]) for x in issues)))
  assert not issues, 'PHP runtime diagnostics need correction'
  print(f'{root.name}: {checks} loopback checks passed (sessions, access, callbacks, chat, private storage)')
 finally:proc.terminate();proc.wait(timeout=5);log.close()
