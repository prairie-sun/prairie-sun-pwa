import qrcode

# URL to encode
url = "https://prairie-sun.github.io/prairie-sun-pwa/"

# Generate QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

# Create an image
img = qr.make_image(fill_color="black", back_color="white")

# Save as PNG
img.save("prairie_sun_pwa_qr.png")

print("QR code saved as prairie_sun_pwa_qr.png")
