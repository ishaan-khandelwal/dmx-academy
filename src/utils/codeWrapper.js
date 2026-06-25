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
  } else if (String(problemSlug).includes("two-sum")) {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  let nums;
  let target;
  const bracketMatch = input.match(/\\[([^\\]]+)\\]\\s*,\\s*(-?\\d+)/);
  if (bracketMatch) {
    nums = bracketMatch[1].split(',').map((item) => Number(item.trim()));
    target = Number(bracketMatch[2]);
  } else {
    const lines = input.split('\\n');
    nums = lines[0].trim().split(/\\s+/).map(Number);
    target = Number(lines[1]);
  }
  const solver = typeof twoSum === 'function' ? twoSum : solution;
  const res = solver(nums, target);
  if (res && res.length === 2) {
    console.log(JSON.stringify(res));
  }
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys
import json
import re
input_data = sys.stdin.read().strip()
if input_data:
    bracket_match = re.search(r"\\[([^\\]]+)\\]\\s*,\\s*(-?\\d+)", input_data)
    if bracket_match:
        nums = [int(item.strip()) for item in bracket_match.group(1).split(",") if item.strip()]
        target = int(bracket_match.group(2))
    else:
        lines = input_data.split('\\n')
        nums = list(map(int, lines[0].strip().split()))
        target = int(lines[1].strip())
    globals()["nums"] = nums
    globals()["target"] = target
    solver = globals().get("two_sum") or globals().get("solution")
    try:
        res = solver(nums, target)
    except TypeError:
        res = solver()
    if len(res) == 2:
        print(json.dumps(res, separators=(",", ":")))`;
    }
  } else if (problemSlug === "search-insert-position") {
    if (lang === "javascript") {
      return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim();
if (input) {
  let nums = [];
  let target = 0;
  const bracketMatch = input.match(/\\[([^\\]]+)\\]\\s*,?\\s*(-?\\d+)/);
  if (bracketMatch) {
    nums = bracketMatch[1].split(',').map((item) => Number(item.trim()));
    target = Number(bracketMatch[2]);
  } else {
    const lines = input.split('\\n');
    nums = lines[0].trim().split(/\\s+/).map(Number);
    target = Number(lines[1]);
  }
  const solver = typeof solution === 'function' ? solution : (typeof searchInsert === 'function' ? searchInsert : solve);
  const res = solver(nums, target);
  if (res !== undefined) {
    console.log(res);
  }
}`;
    } else if (lang === "python") {
      return `${userCode}

# Backend I/O Wrapper
import sys
import json
import re
input_data = sys.stdin.read().strip()
if input_data:
    bracket_match = re.search(r"\\[([^\\]]+)\\]\\s*,?\\s*(-?\\d+)", input_data)
    if bracket_match:
        nums = [int(item.strip()) for item in bracket_match.group(1).split(",") if item.strip()]
        target = int(bracket_match.group(2))
    else:
        lines = input_data.split('\\n')
        nums = list(map(int, lines[0].strip().split()))
        target = int(lines[1].strip())
    solver = globals().get("solution") or globals().get("searchInsert") or globals().get("solve")
    res = solver(nums, target)
    if res is not None:
        print(res)`;
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

  if (lang === "javascript") {
    return `${userCode}

// Backend I/O Wrapper
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');
if (typeof solve === 'function') {
  const res = solve(input);
  if (res !== undefined) {
    if (Array.isArray(res)) {
      console.log(res.join(' '));
    } else if (typeof res === 'object' && res !== null) {
      console.log(JSON.stringify(res));
    } else {
      console.log(String(res));
    }
  }
}`;
  }

  if (lang === "python") {
    return `${userCode}

# Backend I/O Wrapper
import sys, json
input_data = sys.stdin.read()
if 'solve' in globals() and callable(solve):
    res = solve(input_data)
    if res is not None:
        if isinstance(res, (list, tuple)):
            print(" ".join(map(str, res)))
        elif isinstance(res, (dict,)):
            print(json.dumps(res))
        else:
            print(str(res))`;
  }

  return userCode;
}
