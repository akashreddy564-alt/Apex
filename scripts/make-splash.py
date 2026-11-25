"""Draw assets/images/splash-icon.png from the wordmark in lib/peakIntro.ts.

The launch intro picks up from this image frame for frame, so both read the
same shapes. Run from the repo root after changing the wordmark:

    python3 scripts/make-splash.py
"""

import json
import subprocess

from PIL import Image, ImageDraw

FG = (0xF4, 0xF1, 0xEA, 255)
SUPERSAMPLE = 4

shapes = json.loads(
    subprocess.check_output(
        [
            "node",
            "--experimental-strip-types",
            "--no-warnings",
            "--input-type=module",
            "-e",
            "import * as m from './lib/peakIntro.ts';"
            "console.log(JSON.stringify({splash: m.SPLASH, width: m.MARK_WIDTH, height: m.MARK_HEIGHT,"
            "solid: [m.A_SHAPE, m.A_BAR, m.P_OUTER, m.E_SHAPE, ...m.X_BARS], holes: [m.P_HOLE]}))",
        ]
    )
)

size = shapes["splash"]["canvasPx"] * SUPERSAMPLE
unit = shapes["splash"]["markPx"] / shapes["width"] * SUPERSAMPLE
left = (size - shapes["width"] * unit) / 2
top = (size - shapes["height"] * unit) / 2


def place(points):
    return [(left + x * unit, top + y * unit) for x, y in points]


image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)
for poly in shapes["solid"]:
    draw.polygon(place(poly), fill=FG)
for poly in shapes["holes"]:
    draw.polygon(place(poly), fill=(0, 0, 0, 0))

out = image.resize((size // SUPERSAMPLE, size // SUPERSAMPLE), Image.LANCZOS)
out.save("assets/images/splash-icon.png")
print("wrote assets/images/splash-icon.png")
