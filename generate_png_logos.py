import os
from PIL import Image, ImageDraw, ImageFont

output_dir = r"c:\Users\P1 GEN 6 TOUCH\Documents\borsa\logolar_png"
os.makedirs(output_dir, exist_ok=True)

def create_logo_with_style(idx, draw_func, font_name, bg_color, text_color, gold_color, sub_color):
    # 350x100 image, solid background (RGB)
    img = Image.new("RGB", (350, 100), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw emblem using custom function (passed in)
    draw_func(draw, gold_color, text_color, sub_color)
    
    # System Fonts Mapping on Windows
    font_files = {
        "Arial": "arialbd.ttf",
        "Georgia": "georgiab.ttf",
        "Times": "timesbd.ttf",
        "Trebuchet": "trebucbd.ttf",
        "Tahoma": "tahomabd.ttf",
        "Verdana": "verdanab.ttf",
        "Consolas": "consolab.ttf",
        "Impact": "impact.ttf",
        "SegoeUI": "segoeuib.ttf",
        "Courier": "courbd.ttf"
    }
    
    font_file = font_files.get(font_name, "arialbd.ttf")
    
    try:
        # Load standard Windows fonts
        font_path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", font_file)
        font_bold = ImageFont.truetype(font_path, 21)
        font_small = ImageFont.truetype(font_path, 9)
    except Exception as e:
        # Fallback if font fails
        font_bold = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    # Draw text "BORSA" and "KAYNAK"
    # Adjust spacing depending on font
    draw.text((95, 30), "BORSA", fill=text_color, font=font_bold)
    
    # Approximate text width offset for "KAYNAK"
    offset_x = 175
    if font_name == "Impact":
        offset_x = 165
    elif font_name == "Times" or font_name == "Georgia":
        offset_x = 185
    elif font_name == "Courier":
        offset_x = 195
        
    draw.text((offset_x, 30), "KAYNAK", fill=gold_color, font=font_bold)
    
    # Draw tagline
    draw.text((95, 58), "FINANS & ANALIZ PORTALI", fill=sub_color, font=font_small)
    
    # Save as PNG
    filename = f"logo_{idx}.png"
    img.save(os.path.join(output_dir, filename), "PNG")

# 20 distinct drawing functions for the emblems
drawings = []

# 1. Rising trend line inside a circle
def draw_1(d, g, w, lg):
    d.arc([20, 25, 70, 75], start=0, end=360, fill=g, width=3)
    d.line([(28, 55), (38, 42), (48, 48), (60, 32)], fill=lg, width=3, joint="round")
    d.ellipse([57, 29, 63, 35], fill=w)

# 2. Tech Shield
def draw_2(d, g, w, lg):
    d.polygon([(45, 20), (65, 28), (65, 55), (45, 75), (25, 55), (25, 28)], outline=g, width=3)
    d.line([(35, 45), (45, 35), (55, 45)], fill=w, width=3)

# 3. Double Hexagon
def draw_3(d, g, w, lg):
    d.polygon([(45, 22), (62, 32), (62, 52), (45, 62), (28, 52), (28, 32)], outline=g, width=2)
    d.polygon([(45, 28), (57, 35), (57, 49), (45, 56), (33, 49), (33, 35)], fill=lg)

# 4. Candlesticks
def draw_4(d, g, w, lg):
    d.line([(35, 25), (35, 65)], fill=w, width=2)
    d.rectangle([31, 35, 39, 55], fill=(0, 181, 110, 255))
    d.line([(55, 15), (55, 55)], fill=w, width=2)
    d.rectangle([51, 20, 59, 45], fill=g)

# 5. Bull horns outline
def draw_5(d, g, w, lg):
    d.arc([20, 20, 70, 70], start=30, end=150, fill=g, width=4)
    d.line([(23, 35), (28, 55), (45, 62), (62, 55), (67, 35)], fill=w, width=3)

# 6. Infinite Loop
def draw_6(d, g, w, lg):
    d.arc([20, 35, 50, 65], start=0, end=360, fill=g, width=3)
    d.arc([40, 35, 70, 65], start=0, end=360, fill=lg, width=3)

# 7. Rising Sun Rays
def draw_7(d, g, w, lg):
    d.arc([20, 35, 70, 75], start=180, end=360, fill=g, width=3)
    d.line([(45, 45), (45, 25)], fill=w, width=3)
    d.line([(32, 48), (20, 32)], fill=lg, width=3)
    d.line([(58, 48), (70, 32)], fill=lg, width=3)

# 8. Diamond outline
def draw_8(d, g, w, lg):
    d.polygon([(45, 22), (65, 40), (45, 68), (25, 40)], outline=g, width=3)
    d.line([(25, 40), (65, 40)], fill=w, width=2)

# 9. Triple Chevron
def draw_9(d, g, w, lg):
    d.line([(25, 58), (45, 38), (65, 58)], fill=g, width=4)
    d.line([(25, 46), (45, 26), (65, 46)], fill=lg, width=4)
    d.line([(25, 34), (45, 14), (65, 34)], fill=w, width=4)

# 10. Star Finance
def draw_10(d, g, w, lg):
    points = [(45, 18), (52, 35), (70, 35), (56, 45), (61, 62), (45, 52), (29, 62), (34, 45), (20, 35), (38, 35)]
    d.polygon(points, outline=g, width=2)

# 11. Circular Arrow
def draw_11(d, g, w, lg):
    d.arc([22, 22, 68, 68], start=45, end=315, fill=g, width=3)
    d.polygon([(52, 22), (62, 12), (68, 26)], fill=g)

# 12. Monogram BK Style
def draw_12(d, g, w, lg):
    d.line([(30, 20), (30, 70)], fill=g, width=4)
    d.arc([30, 20, 55, 45], start=-90, end=90, fill=g, width=3)
    d.arc([30, 45, 55, 70], start=-90, end=90, fill=g, width=3)
    d.line([(45, 45), (60, 20)], fill=w, width=3)
    d.line([(45, 45), (60, 70)], fill=w, width=3)

# 13. Target Bullseye
def draw_13(d, g, w, lg):
    d.ellipse([20, 20, 70, 70], outline=g, width=2)
    d.ellipse([30, 30, 60, 60], outline=w, width=2)
    d.ellipse([40, 40, 50, 50], fill=lg)

# 14. Crown
def draw_14(d, g, w, lg):
    d.polygon([(25, 65), (30, 35), (45, 50), (60, 35), (65, 65)], outline=g, width=3)
    d.ellipse([27, 30, 33, 36], fill=w)
    d.ellipse([42, 45, 48, 51], fill=w)
    d.ellipse([57, 30, 63, 36], fill=w)

# 15. Geometric Square Nodes
def draw_15(d, g, w, lg):
    d.rectangle([25, 25, 42, 42], outline=g, width=2)
    d.rectangle([48, 48, 65, 65], outline=g, width=2)
    d.line([(42, 42), (48, 48)], fill=w, width=3)

# 16. Fast Forward Arrow
def draw_16(d, g, w, lg):
    d.polygon([(25, 25), (45, 45), (25, 65)], fill=g)
    d.polygon([(45, 25), (65, 45), (45, 65)], fill=lg)

# 17. Growing Bar Arc
def draw_17(d, g, w, lg):
    d.arc([20, 25, 70, 75], start=180, end=270, fill=g, width=3)
    d.rectangle([30, 55, 36, 68], fill=lg)
    d.rectangle([42, 42, 48, 68], fill=lg)
    d.rectangle([54, 28, 60, 68], fill=w)

# 18. Triangle Peak
def draw_18(d, g, w, lg):
    d.polygon([(45, 20), (65, 65), (25, 65)], outline=g, width=3)
    d.line([(35, 45), (55, 45)], fill=w, width=2)

# 19. Infinity Trend
def draw_19(d, g, w, lg):
    d.line([(25, 65), (65, 25)], fill=g, width=3)
    d.arc([25, 25, 65, 65], start=0, end=180, fill=w, width=2)
    d.arc([25, 25, 65, 65], start=180, end=360, fill=lg, width=2)

# 20. Abstract Globe
def draw_20(d, g, w, lg):
    d.ellipse([22, 22, 68, 68], outline=g, width=2)
    d.ellipse([34, 22, 56, 68], outline=w, width=2)
    d.line([(22, 45), (68, 45)], fill=lg, width=2)

# Register all 20
drawings.extend([draw_1, draw_2, draw_3, draw_4, draw_5, draw_6, draw_7, draw_8, draw_9, draw_10,
                 draw_11, draw_12, draw_13, draw_14, draw_15, draw_16, draw_17, draw_18, draw_19, draw_20])

# Styling combinations for 20 options
styles = [
    # (Font, Background RGB, Text RGB, Gold RGB, Subtext RGB)
    ("Arial", (8, 18, 30), (243, 247, 250), (200, 169, 107), (139, 152, 169)),
    ("Georgia", (11, 22, 35), (255, 255, 255), (214, 181, 122), (158, 172, 189)),
    ("Times", (10, 10, 10), (240, 240, 240), (200, 169, 107), (120, 120, 120)),
    ("Trebuchet", (22, 36, 58), (255, 255, 255), (240, 210, 140), (170, 185, 205)),
    ("Tahoma", (12, 28, 48), (243, 247, 250), (200, 169, 107), (139, 152, 169)),
    ("Verdana", (18, 18, 18), (255, 255, 255), (218, 165, 32), (160, 160, 160)),
    ("Consolas", (15, 25, 35), (230, 240, 250), (220, 195, 135), (140, 155, 170)),
    ("Impact", (8, 18, 30), (255, 255, 255), (200, 169, 107), (139, 152, 169)),
    ("SegoeUI", (9, 21, 38), (243, 247, 250), (214, 181, 122), (139, 152, 169)),
    ("Courier", (16, 24, 40), (255, 255, 255), (200, 169, 107), (120, 130, 150)),
    
    ("Arial", (10, 20, 30), (255, 255, 255), (218, 165, 32), (160, 170, 180)),
    ("Georgia", (8, 18, 30), (243, 247, 250), (200, 169, 107), (139, 152, 169)),
    ("Times", (15, 15, 15), (255, 255, 255), (220, 195, 135), (140, 140, 140)),
    ("Trebuchet", (12, 28, 48), (240, 240, 240), (200, 169, 107), (130, 140, 160)),
    ("Tahoma", (10, 10, 10), (255, 255, 255), (214, 181, 122), (150, 150, 150)),
    ("Verdana", (20, 30, 45), (243, 247, 250), (200, 169, 107), (139, 152, 169)),
    ("Consolas", (8, 18, 30), (255, 255, 255), (220, 195, 135), (139, 152, 169)),
    ("Impact", (12, 28, 48), (243, 247, 250), (214, 181, 122), (139, 152, 169)),
    ("SegoeUI", (15, 15, 15), (255, 255, 255), (200, 169, 107), (140, 140, 140)),
    ("Courier", (8, 18, 30), (243, 247, 250), (200, 169, 107), (139, 152, 169))
]

# Generate
for idx, func in enumerate(drawings):
    style = styles[idx]
    create_logo_with_style(idx + 1, func, style[0], style[1], style[2], style[3], style[4])

print("Generated 20 Beautiful PNG logos with diverse fonts and backgrounds successfully in:", output_dir)
