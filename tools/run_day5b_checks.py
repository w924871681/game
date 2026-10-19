"""Run current Day5B local checks, retaining separate real SDK declaration debt."""
from pathlib import Path
import sys, json, hashlib, subprocess, shutil, datetime, re
from audit_day5b_public import redact_text
sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/validation/day5b/final-polish'
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def sources():
    names=subprocess.check_output(['git','--no-optional-locks','ls-files','-co','--exclude-standard','-z'],cwd=ROOT).decode('utf-8').split('\0')
    return [{'path':n,'sha256':digest(ROOT/n)} for n in sorted(set(names)) if n and (ROOT/n).is_file() and
        ((n.startswith(('assets/scripts/','extensions/','tools/','settings/')) and Path(n).suffix in {'.ts','.js','.cjs','.mjs','.py','.json'}) or n in {'package.json','tsconfig.json'})]
def execute(label,args):
    start=datetime.datetime.now(datetime.timezone.utc).isoformat()
    p=subprocess.run(args,cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    text=p.stdout.decode('utf-8',errors='replace'); file=OUT/(label+'.log')
    if file.exists():
        prior=file.with_name(file.stem+'-prior-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')+'.log')
        prior.write_bytes(file.read_bytes())
    local=ROOT/'local/day5b-final-baseline.json'
    private=Path(json.loads(local.read_text('utf-8'))['directory'])/'raw-checks'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') if local.exists() else ROOT/'local/raw-final-checks'/label
    private.mkdir(parents=True,exist_ok=True);(private/'stdout.log').write_bytes(p.stdout)
    (private/'command.json').write_text(json.dumps({'command':args,'startedAtUtc':start,'exitCode':p.returncode}),encoding='utf-8')
    file.write_text(redact_text(text),encoding='utf-8')
    return {'label':label,'command':[Path(args[0]).name,*args[1:]],'startedAtUtc':start,'exitCode':p.returncode,'log':file.relative_to(ROOT).as_posix(),
        'rawStdoutSha256':hashlib.sha256(p.stdout).hexdigest(),'redactedPublication':True,'rawEvidence':'Preserved in ignored local or external task backup; machine paths redacted in public logs.',
        'sha256':digest(file),'behaviorGroups':[int(v) for v in re.findall(r'(\d+) mock behavior groups passed',text)],
        'sdkDiagnosticsExcluded':[int(v) for v in re.findall(r'SDK DECLARATION LIMITATION: (\d+)',text)],
        'diagnosticLines':len(re.findall(r'error TS\d+:',text))}
def main():
    OUT.mkdir(parents=True,exist_ok=True); before=sources(); node=shutil.which('node'); npm=shutil.which('npm.cmd') or shutil.which('npm')
    if not node or not npm: raise RuntimeError('Existing Node/npm required; installs are not performed')
    runs=[execute('final-tests',[npm,'test']),execute('final-cocos-types',[npm,'run','check:cocos']),
        execute('final-sdk-self',[npm,'run','check:cocos','--','--check-sdk-declarations'])]
    js=[]
    for entry in before:
        if Path(entry['path']).suffix not in {'.js','.cjs','.mjs'}: continue
        p=subprocess.run([node,'--check',entry['path']],cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
        js.append({'path':entry['path'],'exitCode':p.returncode,'output':p.stdout.decode('utf-8',errors='replace')})
    py=[]
    for entry in before:
        if not entry['path'].endswith('.py'): continue
        try: compile((ROOT/entry['path']).read_bytes(),entry['path'],'exec'); py.append({'path':entry['path'],'ok':True})
        except (SyntaxError,ValueError) as error: py.append({'path':entry['path'],'ok':False,'error':str(error)})
    assets=execute('final-original-art',[sys.executable,'-X','utf8','tools/art/day5b/generate_day5b.py','--verify'])
    result={'ok':runs[0]['exitCode']==0 and runs[0]['behaviorGroups']==[293] and runs[1]['exitCode']==0
        and all(v['exitCode']==0 for v in js) and all(v['ok'] for v in py) and assets['exitCode']==0 and before==sources(),
        'scope':'293 finite mock groups (275 retained plus18 final-polish) and real SDK project typing; no Preview or physical touch claims',
        'commands':runs,'javascriptSyntax':js,'pythonSyntax':py,'originalArt':assets,'sourceBindings':before,
        'sourcesUnchangedDuringChecks':before==sources(),'sdkSelfValidation':{'exitCode':runs[2]['exitCode'],'diagnosticLines':runs[2]['diagnosticLines'],
        'status':'KNOWN_SDK_DECLARATION_FAILURE' if runs[2]['exitCode'] else 'PASS','note':'Kept separate from strict project success; SDK is never claimed clean.'}}
    (OUT/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'ok':result['ok'],'commands':runs,'jsFiles':len(js),'pythonFiles':len(py),'sdkSelfValidation':result['sdkSelfValidation']},ensure_ascii=False,indent=2))
    return 0 if result['ok'] else 1
if __name__=='__main__': raise SystemExit(main())
