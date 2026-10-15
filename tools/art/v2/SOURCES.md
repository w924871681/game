# DeskRescue V2 artwork provenance

All V2 masters were generated for this project with the built-in `image_gen.imagegen` tool from the retained prompts. No third-party downloaded artwork, fonts, brand logos, commercial game assets or audio samples were used. This provenance record does not change the repository's overall license.

| Retained original master | Exact prompt | Runtime use |
| --- | --- | --- |
| `sources/workshop-room.master.png` | `sources/workshop-room.prompt.md` | Independent workshop environment layer |
| `sources/repair-boy-poses.master.png` | `sources/repair-boy-poses.prompt.md` | Four transparent character poses and head/shoulders tutor avatar |
| `sources/trophy.master.png` | `sources/trophy.prompt.md` | Independent final-completion trophy |
| `sources/cloth-glove.master.png` | `sources/cloth-glove.prompt.md` | Independent non-interactive cleaning cue |

The user's V2 production instruction explicitly authorized separate layer extraction and four-quadrant cropping. Original masters remain unchanged. Runtime resampling/crop bounds, source/prompt SHA-256 and output SHA-256 are recorded in `../asset-sources-v2.json`.

Paper, button, workbench, mat, cable anchor, dust and confetti use original project geometry. Their editable SVG sources are in `sources/`; each SVG and PNG is produced from the same drawing primitives. No SVG is invented for the image-generated master artwork.

Run `python tools/art/generate_v2_ui.py` from the project root to reproduce runtime PNGs and geometry SVGs offline. The script reads the retained image masters and never contacts an image API or overwrites the original Day5A art/source manifest. Producing a different AI master is an explicit separate image-generation operation using the corresponding retained prompt.
