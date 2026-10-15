# DeskRescue V2.1 original art and tight-crop derivatives

The full rollout follows the root task's successful real Creator risk-sample Preview. `asset-sources.json` records six `phase: sample` connector images and thirty-one `phase: full` images: twelve other connector images and nineteen device derivatives. Runtime keys remain the existing `ports/...` and `devices/...` identifiers through each record's `bindingKey`.

## Connector sources

All eighteen connector PNGs are original project geometry in `generate_v21.py`, exported together with editable SVGs under `sources/ports/`. They share the accepted sample's upper-left light, dark bevel, neutral metal/shell colors and recessed apertures. Head artwork points right with the cable tail on the left; socket artwork exposes the receiving face with thickness receding right. Runtime cable color continues to come from the existing CableStyle/scene cards and dynamic line renderer.

Power, display and network sample PNG/SVG bytes remain unchanged. Added types are audio, USB, motherboard power, CPU power, SATA and fan. Distinction uses the keyed outline, circular audio aperture, USB tongue, dense two-row motherboard contacts, eight CPU contacts, SATA L-key and single four-contact fan row.

## Nineteen device derivatives

Original PNGs stay in `assets/art/devices/`, original SVGs in `tools/art/sources/devices/`. The new copies live in `assets/art/v21/devices/` and `tools/art/v21/sources/devices/`.

For each device the generator measures alpha greater than 24, expands its content bounds by six pixels, clamps to the original canvas, and performs an integer RGBA crop. Retained pixels are unchanged; runtime device PNGs are not resampled. The matching SVG copy only receives a tighter root width/height/viewBox; all original shape coordinates and editable geometry remain intact. Each manifest record retains original PNG/SVG paths and SHA-256, original size, measured bounds, exact crop rectangle and output size. PNG/SVG crop geometry therefore stays traceable to the existing original artwork.

## Offline reproduction and protection

```powershell
python tools/art/v21/generate_v21.py --phase full
```

`--phase full` emits all 37 runtime PNG/SVG pairs and the full source manifest. `--phase sample` emits the original six-image sample and a sample-scoped manifest; it does not delete full images already present. For the completed full rollout use `--phase full` so the manifest describes all bindings.

The script uses the existing project Canvas and Pillow. It neither calls image generation/network APIs nor installs dependencies, writes Creator `.meta`/Scene/Prefab files, or updates old art manifests. Existing Day5A/V2 source/art plus the accepted six sample PNG/SVG files and sample contact are hashed for protection. Identical output bytes are not rewritten. Contact sheets in `previews/` are art-making references, not Creator Preview evidence.

All new connector geometry and device sources are original DeskRescue project artwork. No third-party downloaded images, fonts, brand logos, emoji or audio were added. This source/provenance record does not change the repository's overall license. Existing V2 image-generated masters and their prompts remain untouched and retain their original provenance in `tools/art/v2/SOURCES.md`.
