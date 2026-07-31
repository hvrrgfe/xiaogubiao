#!/usr/bin/env python3
"""生成小目标 App 图标（小胖鸭圆角图标）"""
import os
from PIL import Image, ImageDraw

SIZES = [180, 192, 512]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
os.makedirs(OUT, exist_ok=True)

def draw_duck_icon(size):
    """在纯色圆角背景上画一只小胖鸭"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / 512.0  # 缩放因子

    # 圆角背景（暖木色渐变模拟：浅到深分带）
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bg)
    r = int(110 * s)
    bd.rounded_rectangle([0, 0, size, size], radius=r, fill=(196, 154, 108, 255))
    # 顶部浅色带（手账感）
    bd.rounded_rectangle([0, 0, size, int(size * 0.5)], radius=r, fill=(214, 178, 132, 255))
    # 底部略深
    bd.rounded_rectangle([0, int(size * 0.55), size, size], radius=r, fill=(180, 138, 94, 255))
    img = bg

    d = ImageDraw.Draw(img)
    cx, cy = size * 0.5, size * 0.52

    # 身体（椭圆，黄色）
    body_w, body_h = size * 0.62, size * 0.42
    d.ellipse([cx - body_w/2, cy - body_h/2, cx + body_w/2, cy + body_h/2], fill=(240, 214, 122, 255))
    # 身体高光
    d.ellipse([cx - body_w*0.28, cy - body_h*0.4, cx + body_w*0.1, cy - body_h*0.05], fill=(251, 240, 200, 200))

    # 翅膀（左）
    d.ellipse([cx - body_w*0.52, cy - body_h*0.1, cx - body_w*0.18, cy + body_h*0.32], fill=(232, 201, 110, 255))
    # 翅膀（右）
    d.ellipse([cx + body_w*0.18, cy - body_h*0.1, cx + body_w*0.52, cy + body_h*0.32], fill=(232, 201, 110, 255))

    # 头（圆，黄色，覆盖身体上部）
    head_r = size * 0.2
    d.ellipse([cx - head_r, cy - size*0.30 - head_r, cx + head_r, cy - size*0.30 + head_r], fill=(244, 220, 140, 255))
    # 头高光
    hr = size * 0.07
    d.ellipse([cx - size*0.12, cy - size*0.42, cx - size*0.12 + hr*2, cy - size*0.42 + hr*1.5], fill=(253, 246, 216, 200))

    # 腮红
    d.ellipse([cx - head_r*0.72, cy - size*0.25, cx - head_r*0.30, cy - size*0.18], fill=(248, 176, 160, 180))
    d.ellipse([cx + head_r*0.30, cy - size*0.25, cx + head_r*0.72, cy - size*0.18], fill=(248, 176, 160, 180))

    # 眼睛
    eye_r = size * 0.028
    eye_y = cy - size*0.285
    d.ellipse([cx - head_r*0.42 - eye_r, eye_y - eye_r, cx - head_r*0.42 + eye_r, eye_y + eye_r], fill=(74, 64, 54, 255))
    d.ellipse([cx + head_r*0.42 - eye_r, eye_y - eye_r, cx + head_r*0.42 + eye_r, eye_y + eye_r], fill=(74, 64, 54, 255))
    # 高光
    d.ellipse([cx - head_r*0.42 - eye_r*0.4, eye_y - eye_r*0.5, cx - head_r*0.42, eye_y - eye_r*0.1], fill=(255, 255, 255, 230))
    d.ellipse([cx + head_r*0.42 - eye_r*0.4, eye_y - eye_r*0.5, cx + head_r*0.42, eye_y - eye_r*0.1], fill=(255, 255, 255, 230))

    # 嘴巴（橙色小扁嘴）
    mouth_y = cy - size*0.20
    d.polygon([(cx - size*0.05, mouth_y), (cx + size*0.05, mouth_y), (cx, mouth_y + size*0.05)], fill=(240, 138, 60, 255))

    return img

for s in SIZES:
    icon = draw_duck_icon(s)
    icon.save(os.path.join(OUT, f'app-icon-{s}.png'))
    print(f'✓ app-icon-{s}.png')

print('完成')
