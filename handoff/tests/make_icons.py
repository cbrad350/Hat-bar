"""Generate Hat Bar Tally app icons: a cream cowboy hat on a warm brown square."""
import os
from PIL import Image, ImageDraw

S = 1024
BG = (156, 91, 51)       # deep leather brown
HAT = (246, 241, 231)    # warm cream
BAND = (205, 193, 176)    # tan band

img = Image.new("RGB", (S, S), BG)
d = ImageDraw.Draw(img)
cx = S // 2

# Crown: dome over a body
d.ellipse([cx - 200, 250, cx + 200, 570], fill=HAT)
d.rounded_rectangle([cx - 200, 410, cx + 200, 660], radius=48, fill=HAT)

# Brim: one wide ellipse
d.ellipse([cx - 400, 560, cx + 400, 780], fill=HAT)

# Hat band
d.rounded_rectangle([cx - 206, 560, cx + 206, 634], radius=32, fill=BAND)

os.makedirs("/home/user/Hat-bar/icons", exist_ok=True)
for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    img.resize((size, size), Image.LANCZOS).save(f"/home/user/Hat-bar/icons/{name}")
print("icons written")
