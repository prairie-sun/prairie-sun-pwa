import qrcode
from PIL import Image

# URL to encode
url = "https://prairie-sun-pwa.onrender.com"

# Generate QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,  # high error correction
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

# Create QR code image
qr_img = qr.make_image(fill_color="black", back_color="white").convert('RGB')

# Load logo image
logo = Image.open("prairie_sun_logo.jpg")  # replace with your brewery logo path

# Calculate logo size: e.g., 25% of QR code width
qr_width, qr_height = qr_img.size
logo_size = int(qr_width * 0.25)
logo = logo.resize((logo_size, logo_size), Image.ANTIALIAS)

# Calculate position to paste logo (centered)
pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
qr_img.paste(logo, pos, mask=logo if logo.mode=='RGBA' else None)

# Save final QR code
qr_img.save("prairie_sun_qr_logo.png")
print("QR code with logo saved as prairie_sun_qr_logo.png")
