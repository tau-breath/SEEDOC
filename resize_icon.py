#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Seedoc 아이콘 확대 스크립트
ICO에서 가장 큰 PNG 추출 → 중앙 크롭 → 확대 → ICO 재생성
"""

from PIL import Image
import os

# 경로
ico_path = "seedoc.ico"
output_ico = "seedoc_enlarged.ico"

# 1. ICO 파일 열기
print(f"📂 {ico_path} 읽는 중...")
img = Image.open(ico_path)

# 2. 가장 큰 사이즈 찾기 (보통 256x256)
largest_size = max(img.size)
print(f"✅ 원본 크기: {img.size}")

# 3. 중앙 크롭 (80% 영역) - 여백 제거
width, height = img.size
crop_percent = 0.65  # 65%만 사용 (더 확대)

left = int(width * (1 - crop_percent) / 2)
top = int(height * (1 - crop_percent) / 2)
right = int(width * (1 + crop_percent) / 2)
bottom = int(height * (1 + crop_percent) / 2)

cropped = img.crop((left, top, right, bottom))
print(f"✂️  크롭 완료: {cropped.size}")

# 4. 원본 크기로 확대 (심볼이 더 커짐)
enlarged = cropped.resize((width, height), Image.Resampling.LANCZOS)
print(f"🔍 확대 완료: {enlarged.size}")

# 5. 여러 사이즈로 ICO 생성
sizes = [(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)]
print(f"💾 ICO 저장 중: {output_ico}")

enlarged.save(output_ico, format='ICO', sizes=sizes)
print(f"✨ 완료! {output_ico} 생성됨")

# 6. 미리보기용 PNG도 저장
enlarged.save("seedoc_enlarged.png", format='PNG')
print(f"🖼️  미리보기: seedoc_enlarged.png")
