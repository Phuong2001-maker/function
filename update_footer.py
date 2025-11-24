import pathlib
import re
from pathlib import Path
paths = list(Path('.').rglob('*.html'))
for path in paths:
    text = path.read_text(encoding="utf-8")
    nav_match = re.search(r'<nav class="nav-links".*?</nav>', text, re.S)
    if not nav_match:
        continue
    nav_block = nav_match.group(0)
    anchors = [line.strip() for line in nav_block.splitlines() if line.strip().startswith('<a ')]
    if not anchors:
        continue
    new_block = '\n      <div class="footer-links">\n'
    for anchor in anchors:
        new_block += f'        {anchor}\n'
    new_block += '      </div>'
    text_new = re.sub(r'\n\s*<div class="footer-links">.*?</div>', new_block, text, count=1, flags=re.S)
    if text_new != text:
        path.write_text(text_new, encoding="utf-8")
