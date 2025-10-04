import hashlib

# Take input from the user
text = input("Enter text to hash: ")

# Encode the text to bytes
text_bytes = text.encode('utf-8')

# Generate SHA-256 hash
hash_object = hashlib.sha256(text_bytes)
hash_hex = hash_object.hexdigest()

# Print the result
print(f"SHA-256 hash of '{text}' is:\n{hash_hex}")
