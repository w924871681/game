"""Audit final polish against the external alpha5 snapshot without changing assets."""
from pathlib import Path
import hashlib, json, sys, zipfile
sys.dont_write_bytecode = True
from verify_v21_preservation import Graph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'docs/validation/day5b/final-polish'
ALLOWED = {
 'README.md','docs/GPT_HANDOFF.md','assets/scenes/Game.scene',
 'assets/scripts/data/Day5BStageDefinition.ts','assets/scripts/data/Day5BOrderCatalog.ts',
 'assets/scripts/data/Day5BStageValidation.ts','assets/scripts/stages/FaultSpotStageController.ts',
 'assets/scripts/stages/GaugeTuneStageController.ts','assets/scripts/stages/GuidedTraceStageController.ts',
 'assets/scripts/visuals/Day5BStageView.ts','assets/scripts/ui/Day5BReviewLauncher.ts',
 'extensions/deskrescue-editor/day5b-main.js','extensions/deskrescue-editor/day5b-scene.js',
 'extensions/deskrescue-editor/day5b-probe.js','tools/verify-day1.cjs','tools/verify-day5b.cjs',
 'tools/test/cc.d.ts','tools/test/day5b-integration.cjs','tools/run_day5b_checks.py',
 'tools/package_day5b_delivery.py','tools/verify_day5b_preservation.py',
}
def sha(b): return hashlib.sha256(b).hexdigest()
def main():
 backup=Path(json.loads((ROOT/'local/day5b-final-baseline.json').read_text('utf-8-sig'))['directory'])
 baseline=json.loads((backup/'baseline.json').read_text('utf-8'))
 bridge=json.loads((OUT/'redaction-bridge.json').read_text('utf-8'))
 redactions={v['path']:v for v in bridge['changes']}
 missing=[]; changed=[]; issues=[]; frozen=0
 with zipfile.ZipFile(backup/'before.zip') as archive:
  if sha((backup/'before.zip').read_bytes())!=baseline['archiveSha256']: issues.append('Backup archive SHA differs')
  if archive.testzip(): issues.append('Backup CRC failed')
  for item in baseline['files']:
   name=item['path']; p=ROOT/name
   if not p.is_file(): missing.append(name); continue
   old=archive.read(name); new=p.read_bytes()
   if sha(old)!=item['sha256']: issues.append('Baseline archive binding differs: '+name)
   if old==new: frozen+=1; continue
   changed.append(name)
   if name in ALLOWED: continue
   r=redactions.get(name)
   if not r or r['originalSha256']!=sha(old) or r['publicSha256']!=sha(new): issues.append('Unexpected alpha5 change: '+name)
  # Every historical and Day5B Prefab plus all original metadata stays byte-identical.
  prefabs=[v for v in baseline['files'] if v['path'].startswith('assets/prefabs/')]
  for item in prefabs:
   if sha((ROOT/item['path']).read_bytes())!=item['sha256']: issues.append('Prefab/meta changed: '+item['path'])
  before=Graph(json.loads(archive.read('assets/scenes/Game.scene')))
  after=Graph(json.loads((ROOT/'assets/scenes/Game.scene').read_bytes()))
  geometry=[]
  for n in before.nodes:
   path=before.node_path(n); current=after.at(path)
   same=before.local(path)==after.local(path)
   geometry.append({'path':path,'unchanged':same})
   if not same or n.get('_id')!=current.get('_id'): issues.append('Scene node identity/geometry differs: '+path)
 uuids={}
 for p in (ROOT/'assets').rglob('*.meta'):
  u=json.loads(p.read_text('utf-8-sig')).get('uuid')
  if not u or u in uuids: issues.append('Missing/duplicate UUID: '+p.relative_to(ROOT).as_posix())
  uuids[u]=p.relative_to(ROOT).as_posix()
 bindings=[]
 for name in ['editor-audit.json','engine-probe.json','checks.json']:
  report=json.loads((OUT/name).read_text('utf-8'))
  if not report.get('ok'): issues.append('Failed evidence: '+name)
  for item in report['sourceBindings']:
   if sha((ROOT/item['path']).read_bytes())!=item['sha256']: issues.append('Stale source binding: '+name+':'+item['path'])
  bindings.append({'report':name,'sourceCount':len(report['sourceBindings']),'ok':report.get('ok')})
 scene=json.loads((ROOT/'assets/scenes/Game.scene').read_bytes())
 qa=[v for v in scene if isinstance(v,dict) and 'qaEnabled' in v]
 if len(qa)!=1 or qa[0]['qaEnabled'] is not False: issues.append('Saved scene QA is not false')
 issues.extend('Missing original: '+n for n in missing)
 result={'ok':not issues,'baselineArchiveSha256':baseline['archiveSha256'],'baselineFiles':len(baseline['files']),
  'unchangedFiles':frozen,'modifiedOriginalFiles':changed,'missingOriginalFiles':missing,
  'allowedPolishPaths':sorted(ALLOWED),'publicRedactionBridge':'redaction-bridge.json',
  'prefabAndMetadataFilesFrozen':len(prefabs),'sceneNodes':geometry,'assetMetadataCount':len(uuids),
  'sourceBindings':bindings,'qaDefaultFalse':len(qa)==1 and qa[0]['qaEnabled'] is False,'issues':issues}
 (OUT/'preservation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({k:v for k,v in result.items() if k not in {'sceneNodes','allowedPolishPaths','modifiedOriginalFiles'}},ensure_ascii=False,indent=2))
 return 0 if result['ok'] else 1
if __name__=='__main__': raise SystemExit(main())
