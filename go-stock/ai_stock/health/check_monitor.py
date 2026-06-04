import json, urllib.request

d = json.load(urllib.request.urlopen("http://127.0.0.1:3998/api/health"))
print("Services:", len(d["services"]))
for s in d["services"]:
    status = "UP" if s["alive"] else "DOWN"
    print(f'  {status} {s["name"]}')
