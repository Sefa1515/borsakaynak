import os
import random
from PIL import Image, ImageDraw, ImageFont

output_dir = r"c:\Users\P1 GEN 6 TOUCH\Documents\borsa\logolar_png_40"
os.makedirs(output_dir, exist_ok=True)

# Define 20 basic emblem draw functions and parameterize them to generate 40 unique icons!
def draw_emblem(d, idx, g, w, lg):
    # Parameterized drawing logic to ensure 40 completely unique icons
    offset_x = 20
    offset_y = 15
    
    # Clean shapes based on index (1 to 40)
    if idx == 1:
        d.arc([20, 25, 70, 75], start=0, end=360, fill=g, width=3)
        d.line([(28, 55), (38, 42), (48, 48), (60, 32)], fill=lg, width=3, joint="round")
    elif idx == 2:
        d.polygon([(45, 20), (65, 28), (65, 55), (45, 75), (25, 55), (25, 28)], outline=g, width=3)
        d.line([(35, 45), (45, 35), (55, 45)], fill=w, width=3)
    elif idx == 3:
        d.polygon([(45, 22), (62, 32), (62, 52), (45, 62), (28, 52), (28, 32)], outline=g, width=2)
        d.polygon([(45, 28), (57, 35), (57, 49), (45, 56), (33, 49), (33, 35)], fill=lg)
    elif idx == 4:
        d.line([(35, 25), (35, 65)], fill=w, width=2)
        d.rectangle([31, 35, 39, 55], fill=(0, 181, 110, 255))
        d.line([(55, 15), (55, 55)], fill=w, width=2)
        d.rectangle([51, 20, 59, 45], fill=g)
    elif idx == 5:
        d.arc([20, 20, 70, 70], start=30, end=150, fill=g, width=4)
        d.line([(23, 35), (28, 55), (45, 62), (62, 55), (67, 35)], fill=w, width=3)
    elif idx == 6:
        d.arc([20, 35, 50, 65], start=0, end=360, fill=g, width=3)
        d.arc([40, 35, 70, 65], start=0, end=360, fill=lg, width=3)
    elif idx == 7:
        d.arc([20, 35, 70, 75], start=180, end=360, fill=g, width=3)
        d.line([(45, 45), (45, 25)], fill=w, width=3)
        d.line([(32, 48), (20, 32)], fill=lg, width=3)
        d.line([(58, 48), (70, 32)], fill=lg, width=3)
    elif idx == 8:
        d.polygon([(45, 22), (65, 40), (45, 68), (25, 40)], outline=g, width=3)
        d.line([(25, 40), (65, 40)], fill=w, width=2)
    elif idx == 9:
        d.line([(25, 58), (45, 38), (65, 58)], fill=g, width=4)
        d.line([(25, 46), (45, 26), (65, 46)], fill=lg, width=4)
        d.line([(25, 34), (45, 14), (65, 34)], fill=w, width=4)
    elif idx == 10:
        points = [(45, 18), (52, 35), (70, 35), (56, 45), (61, 62), (45, 52), (29, 62), (34, 45), (20, 35), (38, 35)]
        d.polygon(points, outline=g, width=2)
    elif idx == 11:
        d.arc([22, 22, 68, 68], start=45, end=315, fill=g, width=3)
        d.polygon([(52, 22), (62, 12), (68, 26)], fill=g)
    elif idx == 12:
        d.line([(30, 20), (30, 70)], fill=g, width=4)
        d.arc([30, 20, 55, 45], start=-90, end=90, fill=g, width=3)
        d.arc([30, 45, 55, 70], start=-90, end=90, fill=g, width=3)
        d.line([(45, 45), (60, 20)], fill=w, width=3)
        d.line([(45, 45), (60, 70)], fill=w, width=3)
    elif idx == 13:
        d.ellipse([20, 20, 70, 70], outline=g, width=2)
        d.ellipse([30, 30, 60, 60], outline=w, width=2)
        d.ellipse([40, 40, 50, 50], fill=lg)
    elif idx == 14:
        d.polygon([(25, 65), (30, 35), (45, 50), (60, 35), (65, 65)], outline=g, width=3)
        d.ellipse([27, 30, 33, 36], fill=w)
        d.ellipse([42, 45, 48, 51], fill=w)
        d.ellipse([57, 30, 63, 36], fill=w)
    elif idx == 15:
        d.rectangle([25, 25, 42, 42], outline=g, width=2)
        d.rectangle([48, 48, 65, 65], outline=g, width=2)
        d.line([(42, 42), (48, 48)], fill=w, width=3)
    elif idx == 16:
        d.polygon([(25, 25), (45, 45), (25, 65)], fill=g)
        d.polygon([(45, 25), (65, 45), (45, 65)], fill=lg)
    elif idx == 17:
        d.arc([20, 25, 70, 75], start=180, end=270, fill=g, width=3)
        d.rectangle([30, 55, 36, 68], fill=lg)
        d.rectangle([42, 42, 48, 68], fill=lg)
        d.rectangle([54, 28, 60, 68], fill=w)
    elif idx == 18:
        d.polygon([(45, 20), (65, 65), (25, 65)], outline=g, width=3)
        d.line([(35, 45), (55, 45)], fill=w, width=2)
    elif idx == 19:
        d.line([(25, 65), (65, 25)], fill=g, width=3)
        d.arc([25, 25, 65, 65], start=0, end=180, fill=w, width=2)
        d.arc([25, 25, 65, 65], start=180, end=360, fill=lg, width=2)
    elif idx == 20:
        d.ellipse([22, 22, 68, 68], outline=g, width=2)
        d.ellipse([34, 22, 56, 68], outline=w, width=2)
        d.line([(22, 45), (68, 45)], fill=lg, width=2)
    elif idx == 21:
        # Crosshairs / Plus Chart
        d.line([(45, 15), (45, 65)], fill=g, width=2)
        d.line([(20, 40), (70, 40)], fill=g, width=2)
        d.ellipse([41, 36, 49, 44], fill=w)
    elif idx == 22:
        # Tech Hexagon Nodes
        d.polygon([(45, 18), (64, 29), (64, 51), (45, 62), (26, 51), (26, 29)], outline=g, width=2)
        d.circle([45, 18], 3, fill=w)
        d.circle([45, 62], 3, fill=lg)
    elif idx == 23:
        # Double Chevrons Left/Right
        d.line([(25, 20), (45, 40), (25, 60)], fill=g, width=4)
        d.line([(40, 20), (60, 40), (40, 60)], fill=lg, width=4)
    elif idx == 24:
        # Golden Crown Shield
        d.polygon([(20, 20), (45, 10), (70, 20), (60, 55), (45, 70), (30, 55)], outline=g, width=2)
        d.line([(35, 30), (45, 20), (55, 30)], fill=w, width=3)
    elif idx == 25:
        # Pie Chart Slice
        d.ellipse([20, 20, 70, 70], outline=g, width=2)
        d.line([(45, 45), (45, 20)], fill=w, width=2)
        d.line([(45, 45), (67, 34)], fill=w, width=2)
    elif idx == 26:
        # Monogram BK Minimalist
        d.text((32, 22), "B", fill=g, font=ImageFont.load_default())
        d.text((50, 42), "K", fill=w, font=ImageFont.load_default())
        d.line([(25, 60), (65, 60)], fill=lg, width=3)
    elif idx == 27:
        # Gold Star Burst
        d.ellipse([30, 30, 60, 60], outline=g, width=1)
        d.polygon([(45, 15), (49, 35), (69, 39), (49, 43), (45, 63), (41, 43), (21, 39), (41, 35)], fill=lg)
    elif idx == 28:
        # Concentric Squares
        d.rectangle([20, 20, 70, 70], outline=g, width=2)
        d.rectangle([32, 32, 58, 58], outline=lg, width=1)
        d.rectangle([44, 44, 46, 46], fill=w)
    elif idx == 29:
        # Triple Candlesticks
        d.rectangle([20, 30, 28, 50], fill=(0, 181, 110, 255))
        d.rectangle([35, 15, 43, 60], fill=g)
        d.rectangle([50, 40, 58, 55], fill=(224, 79, 95, 255))
    elif idx == 30:
        # Compass / Triangle Core
        d.ellipse([20, 20, 70, 70], outline=g, width=2)
        d.polygon([(45, 15), (55, 45), (35, 45)], fill=lg)
    elif idx == 31:
        # Digital Diamond Grid
        d.polygon([(45, 15), (65, 35), (45, 55), (25, 35)], outline=g, width=2)
        d.circle([45, 35], 4, fill=w)
    elif idx == 32:
        # Arching Graph
        d.arc([15, 35, 75, 75], start=180, end=360, fill=g, width=3)
        d.line([(15, 55), (75, 55)], fill=w, width=1)
    elif idx == 33:
        # Double Chevrons Up
        d.line([(25, 45), (45, 25), (65, 45)], fill=g, width=4)
        d.line([(25, 55), (45, 35), (65, 55)], fill=lg, width=4)
    elif idx == 34:
        # Bull Outline Modern
        d.line([(25, 30), (35, 15), (45, 30)], fill=g, width=3)
        d.line([(45, 30), (55, 15), (65, 30)], fill=g, width=3)
        d.ellipse([35, 35, 55, 55], outline=w, width=2)
    elif idx == 35:
        # Leaf Finance
        d.path = [(45, 65), (55, 40), (45, 15), (35, 40), (45, 65)]
        d.polygon(d.path, outline=g, width=2)
    elif idx == 36:
        # Hexagon Grid Nodes
        d.polygon([(45, 20), (60, 30), (60, 50), (45, 60), (30, 50), (30, 30)], outline=g, width=1)
        d.line([(45, 20), (45, 60)], fill=lg, width=1)
    elif idx == 37:
        # Infinity Growth
        d.arc([20, 35, 48, 60], start=0, end=360, fill=g, width=2)
        d.arc([42, 35, 70, 60], start=0, end=360, fill=lg, width=2)
    elif idx == 38:
        # Mountain / Peak
        d.polygon([(45, 20), (65, 60), (25, 60)], outline=g, width=2)
        d.polygon([(45, 35), (55, 60), (35, 60)], fill=lg)
    elif idx == 39:
        # Digital Blocks Matrix
        d.rectangle([20, 20, 35, 35], fill=g)
        d.rectangle([45, 20, 60, 35], fill=w)
        d.rectangle([20, 45, 35, 60], fill=lg)
        d.rectangle([45, 45, 60, 60], fill=g)
    elif idx == 40:
        # Rising Arrow / Steps
        d.line([(20, 60), (32, 60), (32, 45), (44, 45), (44, 30), (60, 30)], fill=g, width=3)
        d.polygon([(56, 22), (68, 30), (56, 38)], fill=lg)

def create_logo_40(idx, font_name, bg_color, text_color, gold_color, sub_color):
    img = Image.new("RGB", (360, 100), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw emblem
    draw_emblem(draw, idx, gold_color, text_color, sub_color)
    
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
        "Courier": "courbd.ttf",
        "Palatino": "pala.ttf",
        "Garamond": "garabd.ttf",
        "Calibri": "calibrib.ttf",
        "Century": "cenmtb.ttf",
        "Franklin": "framdb.ttf"
    }
    
    font_file = font_files.get(font_name, "arialbd.ttf")
    
    try:
        font_path = os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts", font_file)
        font_bold = ImageFont.truetype(font_path, 22)
        font_small = ImageFont.truetype(font_path, 9)
    except Exception as e:
        font_bold = ImageFont.load_default()
        font_small = ImageFont.load_default()
        
    # Draw text "BORSA" and "KAYNAK"
    draw.text((95, 28), "BORSA", fill=text_color, font=font_bold)
    
    # Approximate text width offset for "KAYNAK"
    offset_x = 175
    if font_name in ["Impact", "Franklin"]:
        offset_x = 165
    elif font_name in ["Times", "Georgia", "Garamond"]:
        offset_x = 185
    elif font_name in ["Courier", "Consolas"]:
        offset_x = 195
        
    draw.text((offset_x, 28), "KAYNAK", fill=gold_color, font=font_bold)
    
    # Draw tagline
    draw.text((95, 58), "FINANS & ANALIZ PORTALI", fill=sub_color, font=font_small)
    
    # Save as PNG
    filename = f"logo_{idx}.png"
    img.save(os.path.join(output_dir, filename), "PNG")

# Define 40 distinct styles (Font, Background, Text, Gold, Subtext)
font_options = ["Arial", "Georgia", "Times", "Trebuchet", "Tahoma", "Verdana", "Consolas", "Impact", "SegoeUI", "Courier", 
                "Palatino", "Garamond", "Calibri", "Century", "Franklin"]

bg_options = [
    (8, 18, 30),     # Dark Navy
    (10, 10, 10),    # Pure Black
    (18, 28, 45),    # Muted Blue
    (20, 20, 20),    # Charcoal
    (12, 35, 24),    # Dark Green
    (38, 12, 20),    # Dark Red
    (24, 16, 40)     # Deep Purple
]

gold_options = [
    (200, 169, 107), # Classic Gold
    (218, 165, 32),  # Goldenrod
    (230, 190, 115), # Soft Gold
    (240, 210, 140)  # Light Gold
]

# Generate 40 unique configurations
for idx in range(1, 41):
    font = font_options[(idx - 1) % len(font_options)]
    bg = bg_options[(idx - 1) % len(bg_options)]
    gold = gold_options[(idx - 1) % len(gold_options)]
    text = (255, 255, 255) # Always white text for high contrast
    sub = (140, 150, 165) # Cool gray subtext
    
    create_logo_40(idx, font, bg, text, gold, sub)

print("Generated 40 Beautiful PNG logos with diverse fonts, backgrounds, and icons successfully in:", output_dir)
