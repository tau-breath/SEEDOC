#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ICO → Favicon PNG 변환"""
from PIL import Image

ico = Image.open("seedoc.ico")
ico.save("favicon.png", format='PNG')
print("✅ favicon.png 생성 완료!")
