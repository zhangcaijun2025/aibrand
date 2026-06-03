// Test IMA create KB with various names
const names = ["Test", "MyKB", "OCWR", "OC Daily", "DailyReport"];
const https = require('https');

function post(name) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      kb_name: name,
      description: "test",
      base_type: "personal"
    });
    const req = https.request({
      hostname: 'ima.qq.com',
      path: '/openapi/wiki/v1/create_knowledge_base',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'ima-openapi-clientid': 'b94c906c0d565356bd5ecf9c14baa70f',
        'ima-openapi-apikey': 'DOVw03KD0l+Hz7c7pxLZ1V99Lsm8DrJdYcQxA8O1d9ln7YXSbvM6WF5e2UpdezUri/nO99v/Rw=='
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ name, response: JSON.parse(body) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const name of names) {
    const r = await post(name);
    console.log(`Name='${r.name}' code=${r.response.code} msg=${r.response.msg}`);
  }
})();
