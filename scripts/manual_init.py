"""Create AiToEarn admin user directly"""
import pymongo, json

# Connect to MongoDB (inside docker network, use host port)
client = pymongo.MongoClient("mongodb://admin:password@localhost:27017/admin")
db = client["aitoearn"]

# Create user if not exists
users = db["user"]
existing = users.find_one({"mail": "admin@aitoearn.local"})
if existing:
    print(f"User already exists: {existing.get('name')}")
else:
    from datetime import datetime
    result = users.insert_one({
        "name": "Admin",
        "mail": "admin@aitoearn.local",
        "status": 1,
        "userType": "CREATOR",
        "isDelete": False,
        "score": 0,
        "usedStorage": 0,
        "storage": {"total": 524288000},
        "locale": "zh-CN",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    print(f"User created with id: {result.inserted_id}")

print(f"Total users: {users.count_documents({})}")

# Generate auto-login URL
import jwt, time
token = jwt.encode({
    "mail": "admin@aitoearn.local",
    "name": "Admin",
    "iat": int(time.time()),
    "exp": int(time.time()) + 86400 * 365  # 1 year
}, "change-this-jwt-secret", algorithm="HS256")

print(f"\n🔗 Auto-login URL:")
print(f"http://localhost:8081/zh-CN?token={token}")
print(f"\nOr login manually:")
print(f"  Email: admin@aitoearn.local")
print(f"  (no password set - uses auto-login token)")
