import sqlite3
import bcrypt

db = sqlite3.connect(r'D:\king2046\deploy\n8n\database.sqlite')

# Get user
users = db.execute('SELECT id, email FROM user').fetchall()
print('Users:', users)

uid = users[0][0]
# Hash password
password = 'aibrand2026'
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
db.execute('UPDATE user SET password=? WHERE id=?', (hashed, uid))
db.commit()
print(f'Password set for {users[0][1]}')
db.close()
