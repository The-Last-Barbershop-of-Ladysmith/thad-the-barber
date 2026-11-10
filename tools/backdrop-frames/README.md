# backdrop-frames

Builds the home page backdrop images in `thad-the-barber-ui/public/assets/backdrop/` from the wireframe's originals
(`wireframe/site/assets/frames3/cN/NNN.webp` and `keys/kN.webp`, read-only), plus any newer sources in `replacements/`.

- `desktop`: every 2nd source frame (61 per clip, 6 clips) at 1280x720, plus keyframes `k1..k7` at 1920 wide.
- `phone`: the same frames cropped to portrait 405x720, keyframes at 540x960. The crop follows the subject, set per
  keyframe in `settings.py` (`KEY_SUBJECT_CENTERS`) and interpolated across each clip.

Needs Python with Pillow built with AVIF support (Pillow 12 has it) and, for `extract_clip.py`, PyAV (`pip install av`).
Don't run the tools with `python -I`, which hides the user-site packages.

```bash
python build_backdrop.py --variant desktop
python build_backdrop.py --variant phone
python build_backdrop.py --clips 4 5 --keys 5      # only what changed, for both variants
```

A full variant takes about 10 minutes and prints its total size. Targets for a full scroll are 8 MB desktop and 4 MB
phone (the Playwright byte-budget test in `e2e/mocked/backdrop.spec.ts` enforces them). Quality and sizes live in
`settings.py`.

## Replacing a keyframe or clip

`replacements/` is not committed (the generated AVIFs in `public/` are). A file there wins over the wireframe original:

- `replacements/keys/kN.webp`: the new keyframe still.
- `replacements/cN/000..120.webp`: the 121 source frames of clip N (keyframe N to N+1). Cut a generated video into them with
  `python extract_clip.py --video clip.mp4 --clip N`, then rebuild with `--clips N --keys ...`.

Clip N must start on keyframe N and end on keyframe N+1, or the backdrop pops at the ends. Keyframe 5 (gallery) and
clips 4 and 5 are replacements generated in Higgsfield on 2026-11-09 (MiniMax H3, start and end frame, 2K, 5 s).
