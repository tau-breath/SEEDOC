#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""HTML에 favicon 추가"""

with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

# favicon 태그 추가
favicon_tag = '  <link rel="icon" type="image/png" href="favicon.png">\n'
html = html.replace('<title>', favicon_tag + '  <title>')

with open("index.html", "w", encoding="utf-8") as f:
    f.write(html)

print("✅ Favicon 추가 완료!")
