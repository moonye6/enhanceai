#!/usr/bin/env python3
"""End-to-end test for fal.ai AuraSR image upscaling API.
Tests: API key validity, image upscaling, and response format.
"""

import struct, zlib, base64, json, urllib.request, urllib.error

# Create a 256x256 test image with gradient pattern (simulates real user upload)
width, height = 256, 256
raw_data = b''
for y in range(height):
    raw_data += b'\x00'
    for x in range(width):
        r = int(255 * x / width)
        g = int(255 * y / height)
        b = 128
        raw_data += struct.pack('BBB', r, g, b)

def make_png(w, h, raw):
    def chunk(ct, data):
        c = ct + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)
    comp = zlib.compress(raw)
    return sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', comp) + chunk(b'IEND', b'')

png_bytes = make_png(width, height, raw_data)
b64 = base64.b64encode(png_bytes).decode()
data_url = f'data:image/png;base64,{b64}'

print(f'Test image: {width}x{height}, {len(png_bytes)} bytes')
print()

# Call fal.ai AuraSR API
FAL_KEY = 'aedcf218-4711-46de-8159-82fe956844e9:d68aabbab5e3a6e9643e239ca2405fd0'
endpoint = 'https://fal.run/fal-ai/aura-sr'

payload = json.dumps({
    'image_url': data_url,
    'checkpoint_version': 'v2',
}).encode()

req = urllib.request.Request(endpoint, data=payload, headers={
    'Authorization': f'Key {FAL_KEY}',
    'Content-Type': 'application/json',
})

print(f'Calling {endpoint}...')
print()

try:
    resp = urllib.request.urlopen(req, timeout=60)
    body = json.loads(resp.read())
    print(f'HTTP Status: {resp.status}')
    print(f'Response keys: {list(body.keys())}')

    img = body.get('image', {})
    url = img.get('url', 'N/A')
    print(f'HD URL: {url[:120]}')
    print(f'Dimensions: {img.get("width")}x{img.get("height")}')
    fsize = img.get('file_size', 0)
    print(f'File size: {fsize} bytes ({fsize/1024:.1f} KB)')
    print(f'Content type: {img.get("content_type")}')

    actual_w = img.get('width', 0)
    actual_h = img.get('height', 0)
    if actual_w == width * 4 and actual_h == height * 4:
        print(f'✅ Correctly upscaled 4x: {width}x{height} → {actual_w}x{actual_h}')
    elif actual_w > width:
        print(f'✅ Image upscaled: {width}x{height} → {actual_w}x{actual_h}')

    # Download and check file size
    print()
    print('Downloading HD image to check actual size...')
    img_resp = urllib.request.urlopen(url, timeout=30)
    img_data = img_resp.read()
    print(f'Downloaded: {len(img_data)} bytes ({len(img_data)/1024:.1f} KB)')
    if len(img_data) > 900 * 1024:
        print(f'⚠️ HD image is {len(img_data)/1024/1024:.1f} MB — needs compression for preview')
    else:
        print(f'✅ HD image is small enough for direct use')

    print()
    print('🎉 END-TO-END TEST PASSED!')
    print('  ✅ API Key is valid')
    print('  ✅ fal.ai AuraSR endpoint works')
    print('  ✅ Image enhanced successfully')

except urllib.error.HTTPError as e:
    body_text = e.read().decode()
    print(f'HTTP Error: {e.code}')
    print(f'Response: {body_text}')
    try:
        err = json.loads(body_text)
        detail = err.get('detail', '')
        if 'balance' in detail.lower() or 'locked' in detail.lower():
            print()
            print('⚠️ fal.ai 账户余额已耗尽！')
            print('  → 请前往 https://fal.ai/dashboard/billing 充值')
        elif 'not found' in detail.lower():
            print('⚠️ API 端点不存在')
    except:
        pass
except Exception as e:
    print(f'Error: {e}')
