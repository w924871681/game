# Day 5B original layered artwork

All fifteen runtime PNGs and their editable SVGs are original DeskRescue geometry.
The six user-supplied design posters were visually reviewed for device silhouette,
cream/mint palette and broad composition; no poster pixels, lettering or finished
screen were cropped or copied into a runtime texture. No downloaded images,
fonts, audio, brand logos or third-party art packs are used.

`generate_day5b.py` reuses the project's original offline Canvas primitives and
Pillow antialiasing. `asset-sources.json` records stable keys, dimensions, exact PNG
and SVG SHA-256 and paths. It does not change the repository's license.

```powershell
python tools/art/day5b/generate_day5b.py
python tools/art/day5b/generate_day5b.py --verify
```

The second command only compares deterministic output bytes. Neither command
changes older assets or Creator Scene/Prefab/meta serialization. Creator imports
the PNGs and creates all required `.meta` files through the real Editor.

Six recognizable equipment bodies are separate from joystick, paper, keycap,
screw, rotating fan blades/cover, route handle and slider thumb layers. Device
labels, faults, real-time readings, waveforms, rings, routes and success indicators
are native Cocos UI/Graphics driven by the controllers, never baked fake progress.
This is an original playable 2D chibi interpretation; it does not claim the
references' photorealistic 3D material quality.
