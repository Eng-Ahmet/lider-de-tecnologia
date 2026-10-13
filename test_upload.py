import urllib.request
import json

login_data = json.dumps({'email': 'vecino@malaga.es', 'password': 'Vecino123!'}).encode('utf-8')
req = urllib.request.Request('http://localhost:3880/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
token = json.loads(res.read())['token']
print("Auth token obtained.")

boundary = '----WebKitFormBoundaryXYZ123'
parts = [
    f'--{boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nBache con foto test\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nDescripcion de prueba con foto adjunta\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="category"\r\n\r\npothole\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="priority"\r\n\r\nHigh\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="address"\r\n\r\nCalle Larios 10, Malaga\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="neighborhood"\r\n\r\nMalaga Centro\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n36.71982\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n-4.42139\r\n',
    f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="bache.jpg"\r\nContent-Type: image/jpeg\r\n\r\n[JPEG_DUMMY_DATA]\r\n',
    f'--{boundary}--\r\n'
]
body = "".join(parts).encode('utf-8')

req2 = urllib.request.Request('http://localhost:3880/api/reports', data=body, headers={
    'Content-Type': f'multipart/form-data; boundary={boundary}',
    'Authorization': f'Bearer {token}'
})

try:
    res2 = urllib.request.urlopen(req2, timeout=10)
    print("Upload status:", res2.status)
    print("Response:", res2.read().decode('utf-8')[:200])
except Exception as e:
    print("Error during upload:", e)
    if hasattr(e, 'read'):
        print("Server error body:", e.read().decode('utf-8'))
