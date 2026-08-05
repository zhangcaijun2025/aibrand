#!/bin/sh
echo "=== 找最新 LTS 版本 ==="
curl -s --max-time 20 https://nodejs.org/dist/index.json -o /tmp/node-index.json 2>&1
python3 -c "
import json
d = json.load(open('/tmp/node-index.json'))
lts = [x for x in d if x.get('lts')]
print('latest LTS:', lts[0]['version'], '| files:', lts[0]['files'][:5])
" 2>&1 || echo "python3 不可用, 用 grep"