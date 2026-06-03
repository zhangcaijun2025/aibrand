"""Save auto-login token to docker volume"""
import jwt, time, subprocess

token = jwt.encode(
    {"mail": "admin@aitoearn.local", "name": "Admin",
     "iat": int(time.time()), "exp": int(time.time()) + 86400 * 365},
    "change-this-jwt-secret", algorithm="HS256"
)

# Write using docker run with the volume mounted
cmd = ["docker", "run", "--rm", "-v", "aitoearn_init-data:/data", "busybox",
       "sh", "-c", 
       f"mkdir -p /data/init && echo '{token}' > /data/init/token.txt && echo 'Token saved' && cat /data/init/token.txt"]

result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
print(result.stdout)
if result.stderr:
    print("ERR:", result.stderr[:200])
print(f"Token: {token[:30]}...")
print(f"URL: http://localhost:8081/zh-CN?token={token}")
