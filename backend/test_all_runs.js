const http = require('http');

const userCode = `
def solve(input_data):
    return "hello"
`;

// Simulate code wrapper (since frontend wraps it before sending)
const { wrapCodeForBackend } = require('../src/utils/codeWrapper');
const wrappedCode = wrapCodeForBackend('reverse-string', 'python', userCode);

const body = JSON.stringify({
  language: "PYTHON",
  code: wrappedCode,
  input: "123"
});

function makeRequest(headers) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/submissions/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        statusCode: 0,
        body: e.message
      });
    });

    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log("--- 1. Testing Bypass Auth (x-bypass-auth: true, x-bypass-role: USER) ---");
  const res1 = await makeRequest({
    'x-bypass-auth': 'true',
    'x-bypass-role': 'USER'
  });
  console.log("STATUS:", res1.statusCode);
  console.log("BODY:", res1.body);

  console.log("\n--- 2. Testing Bypass Auth (x-bypass-auth: true, x-bypass-role: ADMIN) ---");
  const res2 = await makeRequest({
    'x-bypass-auth': 'true',
    'x-bypass-role': 'ADMIN'
  });
  console.log("STATUS:", res2.statusCode);
  console.log("BODY:", res2.body);

  console.log("\n--- 3. Testing No Auth Headers ---");
  const res3 = await makeRequest({});
  console.log("STATUS:", res3.statusCode);
  console.log("BODY:", res3.body);

  console.log("\n--- 4. Testing Authorization with Random Bearer Token ---");
  const res4 = await makeRequest({
    'Authorization': 'Bearer randomtokenvalue'
  });
  console.log("STATUS:", res4.statusCode);
  console.log("BODY:", res4.body);

  console.log("\n--- 5. Testing Bypass Auth with Invalid/Unsupported Language ---");
  const invalidBody = JSON.stringify({
    language: "INVALID_LANG",
    code: "print(1)",
    input: ""
  });
  const res5 = await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5001,
      path: '/api/submissions/run',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(invalidBody),
        'x-bypass-auth': 'true',
        'x-bypass-role': 'USER'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: data
        });
      });
    });
    req.write(invalidBody);
    req.end();
  });
  console.log("STATUS:", res5.statusCode);
  console.log("BODY:", res5.body);
}

runTests();
