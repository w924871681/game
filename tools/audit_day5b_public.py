"""Audit explicit changed/index blobs before a public feature commit. Never stages or commits."""
from pathlib import Path
import argparse, hashlib, json, os, re, subprocess, sys
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/validation/day5b/final-polish'
SECRET=re.compile(rb'(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,})')
ABSOLUTE=re.compile(r'(?i)(?<![\w])[a-z]:[\\/]')
EXCLUDED={'.git','library','temp','profiles','node_modules','build','native','local','tmp','__pycache__'}
def digest(b):return hashlib.sha256(b).hexdigest()
def git(*args):return subprocess.check_output(['git','--no-optional-locks',*args],cwd=ROOT)
def redact_text(text):
    roots=[(ROOT.parent/'game-deliverables','<DELIVERY_ROOT>'),(ROOT,'<PROJECT_ROOT>'),
        (Path(os.environ.get('PROGRAMDATA',''))/'cocos/editors/Creator','<CREATOR_INSTALLS>'),
        (Path(os.environ.get('ProgramFiles',''))/'nodejs','<NODE_RUNTIME>'),(Path.home(),'<USER_HOME>')]
    for p,label in roots:
        variants={p.as_posix(),str(p),str(p).replace('\\','\\\\'),p.as_posix().replace('/','\\')}
        for value in sorted(variants,key=len,reverse=True):
            if len(value)>3:text=text.replace(value,label)
    return text
def changed_names():
    return sorted(set(git('diff','--name-only','-z').decode('utf-8').split('\0'))|set(git('ls-files','--others','--exclude-standard','-z').decode('utf-8').split('\0'))-{''})
def audit(index=False):
    names=git('diff','--cached','--name-only','-z').decode('utf-8').split('\0') if index else changed_names()
    issues=[];files=[]
    for name in sorted(filter(None,names)):
        path=Path(name)
        if any(v in EXCLUDED for v in path.parts) or path.suffix.lower() in {'.zip','.db','.sqlite','.pem','.key','.pfx','.p12','.keystore'}:
            issues.append({'path':name,'kind':'EXCLUDED_PATH'});continue
        if path.parts[0] not in {'assets','docs','extensions','settings','tools'} and name not in {'README.md','package.json','tsconfig.json','.gitignore'}:
            issues.append({'path':name,'kind':'OUTSIDE_ALLOWLIST'});continue
        b=git('show',':'+name) if index else (ROOT/name).read_bytes()
        if SECRET.search(b):issues.append({'path':name,'kind':'CREDENTIAL_STOP'})
        if len(b)>=100_000_000:issues.append({'path':name,'kind':'GITHUB_FILE_SIZE'})
        try:text=b.decode('utf-8')
        except UnicodeDecodeError:text=''
        if ABSOLUTE.search(text):issues.append({'path':name,'kind':'ABSOLUTE_LOCAL_PATH'})
        if re.search(r'(?i)(?:[\\/]Users[\\/]|DESKTOP-[A-Z0-9]{5,}|LAPTOP-[A-Z0-9]{5,})',text):issues.append({'path':name,'kind':'MACHINE_IDENTITY'})
        if index and b!=(ROOT/name).read_bytes():issues.append({'path':name,'kind':'INDEX_WORKTREE_BYTES_DIFFER'})
        # The report excludes its own hash to avoid circular self-binding.
        if name!='docs/validation/day5b/final-polish/public-audit.json':files.append({'path':name,'bytes':len(b),'sha256':digest(b)})
    return {'ok':not issues,'scope':'actual Git index blobs' if index else 'explicit modified and untracked project paths',
        'fileCount':len(files),'bytes':sum(f['bytes'] for f in files),'files':files,'issues':issues,
        'selfHashExcluded':True,'mutationsPerformed':False}
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--index',action='store_true');args=parser.parse_args()
    result=audit(args.index);OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'public-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='files'},ensure_ascii=False,indent=2));return 0 if result['ok'] else 1
if __name__=='__main__':raise SystemExit(main())
