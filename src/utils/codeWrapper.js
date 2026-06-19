/**
 * Automatically wraps user-submitted code in standard I/O harness
 * so the backend execution engine (which runs bare nodes/python processes)
 * can run it successfully and match standard I/O assertions.
 */
export function wrapCodeForBackend(problemSlug, language, userCode) {
  const lang = language.toLowerCase();
  
  if (problemSlug === "auth-vs-auth") {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  try {
    const parsed = JSON.parse(input);
    const res = handleRequest(parsed);
    console.log(JSON.stringify(res));
  } catch (e) {
    console.log(JSON.stringify({ status: 400 }));
  }
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys, json
input_data = sys.stdin.read().strip()
if input_data:
    try:
        parsed = json.loads(input_data)
        res = handle_request(parsed)
        print(json.dumps(res))
    except Exception:
        print(json.dumps({"status": 400}))`;
    }
  } else if (problemSlug === "two-sum") {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  const lines = input.split('\\n');
  const nums = lines[0].trim().split(/\\s+/).map(Number);
  const target = Number(lines[1]);
  const res = twoSum(nums, target);
  if (res && res.length === 2) {
    console.log(res.join(' '));
  }
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys
input_data = sys.stdin.read().strip()
if input_data:
    lines = input_data.split('\\n')
    nums = list(map(int, lines[0].strip().split()))
    target = int(lines[1].strip())
    res = two_sum(nums, target)
    if len(res) == 2:
        print(f"{res[0]} {res[1]}")`;
    }
  } else if (problemSlug === "vdom-diff") {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  const lines = input.split('\\n');
  try {
    const oldNode = JSON.parse(lines[0]);
    const newNode = JSON.parse(lines[1]);
    const res = diff(oldNode, newNode);
    console.log(JSON.stringify(res));
  } catch (e) {
    console.log("[]");
  }
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys, json
input_data = sys.stdin.read().strip()
if input_data:
    lines = input_data.split('\\n')
    try:
        old_node = json.loads(lines[0])
        new_node = json.loads(lines[1])
        res = diff_vdom(old_node, new_node)
        print(json.dumps(res))
    except Exception:
        print("[]")`;
    }
  } else if (problemSlug === "rate-limiter") {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  const parts = input.split(/\\s+/);
  const userId = parts[0];
  const limit = parseInt(parts[1]) || 5;
  const mockRedis = {
    multi: () => {
      const tx = {
        zremrangebyscore: () => tx,
        zcard: () => tx,
        zadd: () => tx,
        expire: () => tx,
        exec: async () => [null, 2, null, null]
      };
      return tx;
    }
  };
  isRateLimited(mockRedis, userId, limit, 60).then(res => {
    console.log(res ? "true" : "false");
  }).catch(() => {
    console.log("false");
  });
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys
input_data = sys.stdin.read().strip()
if input_data:
    parts = input_data.split()
    user_id = parts[0]
    limit = int(parts[1]) if len(parts) > 1 else 5
    class MockRedis:
        def pipeline(self):
            class Pipeline:
                def zremrangebyscore(self, *args): return self
                def zcard(self, *args): return self
                def zadd(self, *args): return self
                def expire(self, *args): return self
                def execute(self): return [None, 2, None, None]
            return Pipeline()
    mock_redis = MockRedis()
    res = is_rate_limited(mock_redis, user_id, limit, 60)
    print("true" if res else "false")`;
    }
  }
  return userCode;
}
