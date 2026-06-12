import sqlite3, uuid, secrets

db = sqlite3.connect(r'D:\king2046\deploy\n8n\database.sqlite')

# Check for existing users
users = db.execute('SELECT id, email, firstName, roleSlug FROM user').fetchall()
print('Users:', users)

# Create user if none exists
if not users:
    uid = str(uuid.uuid4())
    db.execute(
        "INSERT INTO user (id, email, firstName, lastName, password, roleSlug) VALUES (?,?,?,?,?,?)",
        (uid, 'admin@aibrand.ai', 'Admin', 'AI', '', 'global:owner')
    )
    db.commit()
    print(f'Created user: {uid}')
    uid_to_use = uid
else:
    uid_to_use = users[0][0]
    print(f'Using existing user: {uid_to_use}')

# Check existing API keys
keys = db.execute('SELECT id, label FROM user_api_keys WHERE userId=?', (uid_to_use,)).fetchall()
print('Existing API keys:', keys)

# Create API key
api_key = secrets.token_hex(24)
key_id = str(uuid.uuid4())
db.execute(
    "INSERT INTO user_api_keys (id, userId, apiKey, label) VALUES (?,?,?,?)",
    (key_id, uid_to_use, api_key, 'Claude Automation')
)
db.commit()
print(f'Created API Key: {api_key}')
print(f'Key ID: {key_id}')
db.close()
