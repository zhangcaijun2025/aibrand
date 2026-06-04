import os
for root, dirs, files in os.walk('/app/api'):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path) as fh:
                    content = fh.read()
                    if 'public_key' in content.lower() or 'encrypt_password' in content.lower():
                        print(path)
            except:
                pass
