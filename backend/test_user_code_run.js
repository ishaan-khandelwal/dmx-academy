const http = require('http');

const userCode = `
def reverse_integer(x):
    sign = -1 if x < 0 else 1
    num = abs(x)
    rev = 0
    
    while num > 0:
        digit = num % 10
        rev = rev * 10 + digit
        num = num // 10
        
    rev = sign * rev
    if rev < -2**31 or rev > 2**31 - 1:
        return 0
    return rev

val = int(input())
print(reverse_integer(val))
`;

// Simulate code wrapper (since frontend wraps it before sending)
const { wrapCodeForBackend } = require('../src/utils/codeWrapper');
const wrappedCode = wrapCodeForBackend('reverse-string', 'python', userCode);

const body = JSON.stringify({
  language: "PYTHON",
  code: wrappedCode,
  input: "123"
});

const req = http.request({
  hostname: '127.0.0.1',
  port: 5001,
  path: '/api/submissions/run',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-bypass-auth': 'true',
    'x-bypass-role': 'USER',
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("STATUS CODE:", res.statusCode);
    console.log("RESPONSE BODY:", data);
  });
});

req.on('error', (e) => {
  console.error("HTTP ERROR:", e);
});

req.write(body);
req.end();
