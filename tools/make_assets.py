#!/usr/bin/env python3
"""
Генератор картинок для приложения «U613 Задачи». Запускать НЕ нужно: готовые файлы уже лежат в assets/default.w432-s/.
Скрипт оставлен, чтобы можно было пересоздать картинки (другой шрифт, другие размеры). Нужны Pillow, шрифт Inter SemiBold и Noto Color Emoji.

Почему буквы — это картинки. По дизайну текст читается снизу вверх (строка повёрнута на 90° против часовой стрелки), а на часах
нет шрифта Inter и нет надёжного способа повернуть текст. Поэтому каждая буква заранее нарисована шрифтом Inter SemiBold,
повёрнута на 90° и сохранена отдельным PNG (g<размер>_<код буквы в hex>.png). Страница выкладывает буквы одну над другой, как строку.
Рядом создаётся shared/glyphs.js — ширины букв (для подгонки текста под длину колонки).
"""
import json, math, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'default.w432-s')
INTER = os.environ.get('INTER', '/usr/share/fonts/opentype/inter/Inter-SemiBold.otf')
NOTO = os.environ.get('NOTO', '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')

SIZES = [30]                          # один размер шрифта для всех задач (Inter SemiBold, 30 px)
TEXT_RGB = (0xF0, 0xF0, 0xF0)         # цвет текста #F0F0F0
# эмодзи вкладок (e0..e8): 🏠 🍀 🔍 📖 🧬 💀 🤿 🎨 🩸
EMOJI = ['\U0001F3E0', '\U0001F340', '\U0001F50D', '\U0001F4D6', '\U0001F9EC', '\U0001F480',
         '\U0001F93F', '\U0001F3A8', '\U0001FA78']
EMO_SIZE = 38
PAD = 1                               # запас по краям буквы вдоль строки, px


def charset():
    s = []
    s += [chr(c) for c in range(0x0430, 0x0450)]            # а-я (только маленькие)
    s += ['\u0451']                                         # ё
    s += [chr(c) for c in range(ord('a'), ord('z') + 1)]    # a-z (только маленькие)
    s += list('0123456789')
    s += list('+.,-:?!()')
    return s


def build_glyphs():
    chars = charset()
    meta = {'sizes': SIZES, 'lh': {}, 'adv': {}}
    for S in SIZES:
        font = ImageFont.truetype(INTER, S)
        asc, desc = font.getmetrics()
        lh = asc + desc
        meta['lh'][str(S)] = lh
        adv = {}
        for ch in [' '] + chars:
            a = font.getlength(ch)
            adv[ord(ch)] = round(a, 2)
            if ch == ' ':
                continue
            w = math.ceil(a) + 2 * PAD
            im = Image.new('RGBA', (w, lh), TEXT_RGB + (0,))
            d = ImageDraw.Draw(im)
            d.text((PAD, 0), ch, font=font, fill=TEXT_RGB + (255,))
            im = im.rotate(90, expand=True)                  # 90° против часовой: начало буквы внизу, верх буквы слева
            im.save(os.path.join(OUT, 'g%d_%x.png' % (S, ord(ch))), optimize=True)
        meta['adv'][str(S)] = adv
    return meta


def render_emoji(ch, box):
    font = ImageFont.truetype(NOTO, 109)
    big = Image.new('RGBA', (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(big).text((10, 10), ch, font=font, embedded_color=True)
    big = big.crop(big.getbbox())
    s = box / max(big.size)
    return big.resize((max(1, round(big.width * s)), max(1, round(big.height * s))), Image.LANCZOS)


def build_emoji():
    for i, ch in enumerate(EMOJI):
        g = render_emoji(ch, EMO_SIZE)
        im = Image.new('RGBA', (EMO_SIZE, EMO_SIZE), (0, 0, 0, 0))
        im.alpha_composite(g, ((EMO_SIZE - g.width) // 2, (EMO_SIZE - g.height) // 2))
        im = im.rotate(90, expand=True)                       # эмодзи тоже повёрнут на 90° против часовой, вместе со строкой
        im.save(os.path.join(OUT, 'e%d.png' % i), optimize=True)


def build_misc():
    # прозрачная накладка на колонку (ловит нажатия) и подсветка колонки, пока на неё нажимают
    Image.new('RGBA', (72, 514), (255, 255, 255, 1)).save(os.path.join(OUT, 'tz.png'), optimize=True)   # alpha 1 (невидимо): полностью прозрачная картинка ломает сборку
    tp = Image.new('RGBA', (72, 514), (255, 255, 255, 0))
    tp.paste(Image.new('RGBA', (68, 494), (255, 255, 255, 36)), (2, 10))      # подсвечивается только сама карточка, не чёрные поля
    tp.save(os.path.join(OUT, 'tp.png'), optimize=True)
    # иконка приложения 🧩
    ic = Image.new('RGBA', (120, 120), (0, 0, 0, 0))
    m = Image.new('L', (120, 120), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 119, 119), radius=26, fill=255)
    ic.paste(Image.new('RGBA', (120, 120), (0x1C, 0x1C, 0x1C, 255)), (0, 0), m)
    g = render_emoji('\U0001F9E9', 84)
    ic.alpha_composite(g, ((120 - g.width) // 2, (120 - g.height) // 2))
    ic.save(os.path.join(OUT, 'icon.png'), optimize=True)


def write_js(meta):
    lines = ['/**',
             ' * Ширины букв (px) для каждого размера шрифта и высота строки (LH).',
             ' * ЭТОТ ФАЙЛ СОЗДАЁТ tools/make_assets.py, руками не править.',
             ' * ADV[размер][код буквы] — ширина буквы вдоль строки; картинка буквы — g<размер>_<код в hex>.png.',
             ' */',
             'export const SIZES = ' + json.dumps(meta['sizes']),
             'export const PAD = %d' % PAD,
             'export const LH = ' + json.dumps({int(k): v for k, v in meta['lh'].items()}),
             'export const ADV = {']
    for S in SIZES:
        a = meta['adv'][str(S)]
        body = ','.join('%d:%s' % (cp, ('%g' % v)) for cp, v in sorted(a.items()))
        lines.append('  %d: {%s},' % (S, body))
    lines.append('}')
    with open(os.path.join(ROOT, 'shared', 'glyphs.js'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith('g') or f.startswith('e') or f in ('tz.png', 'tp.png', 'icon.png'):
            os.remove(os.path.join(OUT, f))
    meta = build_glyphs()
    build_emoji()
    build_misc()
    write_js(meta)
    print('готово: %d файлов' % len(os.listdir(OUT)))
