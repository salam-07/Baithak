"""Derive the supplied logo's shaped lettering. Requires fonttools and uharfbuzz.

The source SVG names AA Sameer Qamri. Its original font is retained in Git;
we read that blob without restoring deleted assets or changing public/logo.svg.
"""
import io
import json
import subprocess
import re
import xml.etree.ElementTree as ET
from fontTools.svgLib.path import parse_path
from pathlib import Path
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

root = Path(__file__).resolve().parents[2]
data = subprocess.check_output(['git', 'show', 'f692e094408ed8673db7460dcd3f93088cbc998f'], cwd=root)
font = TTFont(io.BytesIO(data))
face = hb.Face(data)
hfont = hb.Font(face)
buffer = hb.Buffer()
buffer.add_str('بیٹھک')
buffer.guess_segment_properties()
hb.shape(hfont, buffer)
glyphs = font.getGlyphSet()
order = font.getGlyphOrder()
out = []
x = 0
for info, pos in zip(buffer.glyph_infos, buffer.glyph_positions):
    glyph = glyphs[order[info.codepoint]]
    transform = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)
    pen = SVGPathPen(glyphs)
    glyph.draw(TransformPen(pen, transform))
    bounds = BoundsPen(glyphs)
    glyph.draw(TransformPen(bounds, transform))
    contours = []
    for d in re.findall(r'M[^M]+', pen.getCommands()):
        cb = BoundsPen(None)
        parse_path(d, cb)
        contours.append({'d': d, 'bounds': cb.bounds})
    out.append({'name': order[info.codepoint], 'd': pen.getCommands(), 'bounds': bounds.bounds, 'contours': contours})
    x += pos.x_advance
dest = root / 'frontend/src/components/landing/logo-paths.json'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(out, indent=2), encoding='utf8')
print(json.dumps([{'name': g['name'], 'bounds': g['bounds']} for g in out]))
