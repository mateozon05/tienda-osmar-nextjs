from PIL import Image
import numpy as np

src = r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs\public\logo-osmar.jpg"
dst = r"C:\Users\MATEOZON\Desktop\DO\TIENDA WEB\tienda-osmar-nextjs\public\logo-osmar.png"

img = Image.open(src).convert("RGBA")
data = np.array(img)

r, g, b = data[:,:,0], data[:,:,1], data[:,:,2]

# Pixels blancos/casi blancos → transparentes
white_mask = (r > 230) & (g > 230) & (b > 230)
data[white_mask, 3] = 0

result = Image.fromarray(data)
result.save(dst)
print(f"✅ Guardado {dst} — {result.size[0]}x{result.size[1]}px, fondo removido")
