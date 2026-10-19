"""Read-only comparison with the actual alpha4 baseline; writes only Day5B evidence."""
from pathlib import Path
import sys, json, hashlib, subprocess, zipfile
sys.dont_write_bytecode = True
from verify_v21_preservation import Graph, CORE, INPUT_PATHS

ROOT = Path(__file__).resolve().parents[1]
ALLOWED = {'README.md', 'docs/GPT_HANDOFF.md', 'package.json', 'tools/verify-day1.cjs', 'tools/test/cc.d.ts',
    'assets/scenes/Game.scene', 'assets/scripts/core/LevelManager.ts', 'assets/scripts/stages/StageHost.ts',
    'assets/scripts/ui/PaperOrderHUD.ts', 'extensions/deskrescue-editor/main.js',
    'extensions/deskrescue-editor/scene.js', 'extensions/deskrescue-editor/package.json'}
def sha(data): return hashlib.sha256(data).hexdigest()
def git(*args): return subprocess.check_output(['git','--no-optional-locks',*args],cwd=ROOT).decode('utf-8').strip()
def run():
    baseline=json.loads((ROOT/'docs/validation/day5b/baseline.json').read_text('utf-8'))
    changed=[]; missing=[]; frozen=[]; issues=[]
    for item in baseline['files']:
        file=ROOT/item['path']
        if not file.is_file(): missing.append(item['path']); continue
        data=file.read_bytes()
        if len(data)!=item['bytes'] or sha(data)!=item['sha256']: changed.append(item['path'])
        else: frozen.append(item['path'])
    issues.extend('Unexpected baseline modification: '+n for n in changed if n not in ALLOWED)
    issues.extend('Missing original file: '+n for n in missing)
    if git('rev-parse','HEAD')!=baseline['git']['head']: issues.append('HEAD changed')
    if git('diff','--cached','--name-only'): issues.append('Git index unexpectedly contains staged changes')
    # Read the exact original serialized scene from the verified pre-work backup.
    backup=ROOT.parent/'game-deliverables/day5b-work-20261015T182137644Z/Day5B_before.zip'
    geometry=[]
    with zipfile.ZipFile(backup) as archive:
        for key,name in CORE.items():
            old=Graph(json.loads(archive.read(name))),Graph(json.loads((ROOT/name).read_bytes()))
            for location in INPUT_PATHS[key]:
                a,b=old[0].local(location),old[1].local(location)
                geometry.append({'asset':name,'node':location,'unchanged':a==b})
                if a!=b: issues.append('Original input geometry differs: '+name+':'+location)
        before=Graph(json.loads(archive.read('assets/scenes/Game.scene')))
        after=Graph(json.loads((ROOT/'assets/scenes/Game.scene').read_bytes()))
        for node in before.nodes:
            location=before.node_path(node)
            current=after.at(location)
            for field in ['_id','_name','_active','_layer','_lpos','_lrot','_lscale','_euler']:
                if node.get(field)!=current.get(field): issues.append(f'Original scene node field differs: {location}/{field}')
            children=[before.node_path(before.ref(v)) for v in node.get('_children',[])]
            current_children=[after.node_path(after.ref(v)) for v in current.get('_children',[])]
            if not all(p in current_children for p in children): issues.append('Original child lost: '+location)
    bound=[]
    for name in ['creator-audit.json','engine-probe.json']:
        report=json.loads((ROOT/'docs/validation/day5b'/name).read_text('utf-8'))
        if not report.get('ok'): issues.append('Creator evidence failed: '+name)
        if not report.get('sourceBindings'): issues.append('Creator evidence has no current source bindings: '+name)
        for item in report.get('sourceBindings',[]):
            file=ROOT/item['path']; valid=file.is_file() and sha(file.read_bytes())==item['sha256']
            if not valid: issues.append('Stale Creator source binding: '+name+':'+item['path'])
        bound.append({'report':name,'ok':report.get('ok'),'sources':len(report.get('sourceBindings',[]))})
    uuids={}
    for meta in (ROOT/'assets').rglob('*.meta'):
        data=json.loads(meta.read_text('utf-8-sig')); value=data.get('uuid')
        if value in uuids: issues.append('Duplicate asset UUID: '+str(meta))
        uuids[value]=meta.relative_to(ROOT).as_posix()
    result={'ok':not issues,'baselineFiles':len(baseline['files']),'unchangedOriginalFiles':len(frozen),
        'modifiedOriginalFiles':changed,'missingOriginalFiles':missing,'allowedModificationPaths':sorted(ALLOWED),
        'protectedInputGeometry':geometry,'creatorSourceBindings':bound,'assetMetadataCount':len(uuids),
        'git':{'head':git('rev-parse','HEAD'),'branch':git('branch','--show-current'),'staged':git('diff','--cached','--name-only')},'issues':issues}
    output=ROOT/'docs/validation/day5b/preservation.json'
    output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['protectedInputGeometry','allowedModificationPaths']},ensure_ascii=False,indent=2))
    return 0 if result['ok'] else 1
if __name__=='__main__': raise SystemExit(run())
