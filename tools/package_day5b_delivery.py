"""Create a new external, hash-verified complete Day5B project ZIP without Git mutations."""
from pathlib import Path, PurePosixPath
import sys, json, hashlib, subprocess, zipfile, datetime, tempfile, re, argparse
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent/'game-deliverables'
EXCLUDED={'.git','library','temp','tmp','local','profiles','node_modules','build','native','dist','coverage','__pycache__','.cache','.pytest_cache','deliverables'}
EVIDENCE={'docs/validation/day5a-plus/comparisons.zip','docs/validation/day5a-plus/v21/comparisons.zip','docs/validation/day5a-plus/v21/screenshots.zip'}
REQUIRED={'README.md','package.json','tsconfig.json','assets/scenes/Game.scene','assets/scenes/Game.scene.meta','docs/GPT_HANDOFF.md',
 'docs/DAY5B_ARCHITECTURE.md','docs/DAY5B_COCOS_SETUP.md','docs/DAY5B_CREATOR_VALIDATION.md','docs/DAY5B_VISUAL_ASSET_MANIFEST.md','docs/DAY5B_CHANGELOG.md',
 'docs/validation/day5b/checks.json','docs/validation/day5b/creator-audit.json','docs/validation/day5b/engine-probe.json','docs/validation/day5b/preservation.json',
 'docs/validation/day5b/preview-verification.json','docs/validation/day5b/screenshot-inventory.json','tools/verify-day5b.cjs','tools/art/day5b/asset-sources.json'}
for name in ['FaultSpotStage','RotaryControlStage','GuidedTraceStage','GaugeTuneStage','SequenceTestStage']:
    REQUIRED.update({f'assets/prefabs/stages/{name}.prefab',f'assets/prefabs/stages/{name}.prefab.meta'})
def sha(data): return hashlib.sha256(data).hexdigest()
def visible():
    raw=subprocess.check_output(['git','--no-optional-locks','ls-files','-co','--exclude-standard','-z'],cwd=ROOT).decode('utf-8')
    return sorted(set(filter(None,raw.split('\0')))|{n for n in EVIDENCE if (ROOT/n).is_file()})
def collect():
    files=[];excluded=[];issues=[]
    for name in visible():
        rel=PurePosixPath(name);file=ROOT/name
        if rel.is_absolute() or any(p in {'.','..'} for p in rel.parts) or ':' in name or '\\' in name: issues.append('Unsafe relative path: '+name);continue
        if any(p in EXCLUDED for p in rel.parts) or (rel.suffix.lower() in {'.zip','.7z','.rar','.gz','.tar'} and name not in EVIDENCE):excluded.append(name);continue
        if not file.is_file() or file.is_symlink(): issues.append('Missing or linked source: '+name);continue
        if rel.name=='.env' or rel.suffix.lower() in {'.pem','.key','.p12','.pfx','.keystore','.kdbx'}: issues.append('Sensitive file type: '+name);continue
        data=file.read_bytes()
        if re.search(rb'(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)',data):issues.append('Possible credential content: '+name)
        files.append({'path':name,'bytes':len(data),'sha256':sha(data)})
    found={v['path'] for v in files};issues.extend('Missing required delivery file: '+n for n in sorted(REQUIRED-found))
    package=json.loads((ROOT/'package.json').read_text('utf-8'))
    if package['version']!='0.0.5-alpha.5': issues.append('Unexpected project version')
    for name in ['checks.json','creator-audit.json','engine-probe.json','preservation.json','preview-verification.json']:
        p=ROOT/'docs/validation/day5b'/name
        if p.exists() and not json.loads(p.read_text('utf-8')).get('ok'):issues.append('Failed final gate: '+name)
    return files,excluded,issues
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--plan',action='store_true');args=parser.parse_args()
    files,excluded,issues=collect();plan={'ok':not issues,'fileCount':len(files),'sourceBytes':sum(v['bytes'] for v in files),'excluded':excluded,'issues':issues}
    if args.plan or issues: print(json.dumps(plan,ensure_ascii=False,indent=2));return 0 if not issues else 1
    OUT.mkdir(parents=True,exist_ok=True);stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    archive=OUT/f'DeskRescue-Day5B-alpha5-{stamp}.zip'
    manifest={'schemaVersion':1,'version':'0.0.5-alpha.5','files':files,'excluded':excluded,
        'scope':'Current local complete engineering source, assets/meta, scene/Prefab, settings, tests, design and historical evidence; no .git/caches/credentials.'}
    with zipfile.ZipFile(archive,'x',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        z.writestr('DELIVERY_MANIFEST.json',json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        for entry in files:
            data=(ROOT/entry['path']).read_bytes()
            if len(data)!=entry['bytes'] or sha(data)!=entry['sha256']:raise RuntimeError('Source changed while packaging: '+entry['path'])
            z.writestr(entry['path'],data)
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:raise RuntimeError('ZIP CRC failure')
        if len(z.namelist())!=len(files)+1:raise RuntimeError('ZIP entry count mismatch')
        for entry in files:
            data=z.read(entry['path'])
            if len(data)!=entry['bytes'] or sha(data)!=entry['sha256']:raise RuntimeError('Archived bytes mismatch: '+entry['path'])
        # A newly created external extraction directory is retained for user inspection.
        extracted=Path(tempfile.mkdtemp(prefix='DeskRescue-Day5B-verify-',dir=OUT))
        z.extractall(extracted)
    for entry in files:
        data=(extracted/entry['path']).read_bytes()
        if len(data)!=entry['bytes'] or sha(data)!=entry['sha256']:raise RuntimeError('Fresh extraction mismatch: '+entry['path'])
    receipt={'ok':True,'archive':archive.as_posix(),'bytes':archive.stat().st_size,'sha256':sha(archive.read_bytes()),
        'fileCount':len(files),'zipEntries':len(files)+1,'crc':'PASS','archivedSizeAndSha':'PASS','freshExtractionSizeAndSha':'PASS',
        'freshExtraction':extracted.as_posix(),'gitMutationsPerformed':False}
    (archive.with_suffix('.receipt.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (archive.with_suffix('.sha256')).write_text(receipt['sha256']+'  '+archive.name+'\n',encoding='ascii')
    (ROOT/'docs/validation/day5b/delivery-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt,ensure_ascii=False,indent=2));return 0
if __name__=='__main__':raise SystemExit(main())
