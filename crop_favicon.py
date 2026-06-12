import os
import sys

try:
    from PIL import Image
except ImportError:
    import subprocess
    print("Pillow library not found. Installing Pillow...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image

def crop_image(img_path, output_path):
    if not os.path.exists(img_path):
        print(f"Error: {img_path} does not exist.")
        return False
    
    img = Image.open(img_path)
    img = img.convert("RGBA")
    
    # Get bounding box of non-transparent content
    bbox = img.getbbox()
    if bbox:
        # Crop to the content bounding box
        cropped_img = img.crop(bbox)
        
        # Make it square to prevent browser distortion
        w, h = cropped_img.size
        max_dim = max(w, h)
        square_img = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
        
        # Paste cropped content centered in the square canvas
        offset_x = (max_dim - w) // 2
        offset_y = (max_dim - h) // 2
        square_img.paste(cropped_img, (offset_x, offset_y))
        
        # Save as PNG
        square_img.save(output_path, "PNG")
        print(f"Successfully cropped {img_path} and saved to {output_path}")
        return True
    else:
        print(f"Warning: No content found in {img_path}")
        return False

# Target files
favicon_path = "public/favicon.png"
app_icon_path = "src/app/icon.png"

# Execute cropping
if crop_image(favicon_path, favicon_path):
    crop_image(favicon_path, app_icon_path)
    print("Favicon files updated successfully!")
