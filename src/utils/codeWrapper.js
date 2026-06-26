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
    } else if (lang === "go") {
      return `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

${userCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(input), &parsed); err != nil {
		fmt.Println("{\"status\":400}")
		return
	}

	res := handleRequest(parsed)
	resBytes, _ := json.Marshal(res)
	fmt.Println(string(resBytes))
}
`;
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
    } else if (lang === "go") {
      return `package main

import (
	"fmt"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
)

${userCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	bracketMatch := regexp.MustCompile(\`\\[([^\\]]+)\\]\\s*,\\s*(-?\\d+)\`).FindStringSubmatch(input)
	var nums []int
	var target int
	if len(bracketMatch) >= 3 {
		for _, s := range strings.Split(bracketMatch[1], ",") {
			val, _ := strconv.Atoi(strings.TrimSpace(s))
			nums = append(nums, val)
		}
		target, _ = strconv.Atoi(bracketMatch[2])
	} else {
		lines := strings.Split(input, "\\n")
		for _, s := range strings.Fields(lines[0]) {
			val, _ := strconv.Atoi(s)
			nums = append(nums, val)
		}
		if len(lines) > 1 {
			target, _ = strconv.Atoi(strings.TrimSpace(lines[1]))
		}
	}

	res := twoSum(nums, target)
	if len(res) == 2 {
		fmt.Printf("[%d,%d]\\n", res[0], res[1])
	}
}
`;
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
    } else if (lang === "go") {
      return `package main

import (
	"fmt"
	"io"
	"os"
	"regexp"
	"strconv"
	"strings"
)

${userCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	bracketMatch := regexp.MustCompile(\`\\[([^\\]]+)\\]\\s*,?\\s*(-?\\d+)\`).FindStringSubmatch(input)
	var nums []int
	var target int
	if len(bracketMatch) >= 3 {
		for _, s := range strings.Split(bracketMatch[1], ",") {
			val, _ := strconv.Atoi(strings.TrimSpace(s))
			nums = append(nums, val)
		}
		target, _ = strconv.Atoi(bracketMatch[2])
	} else {
		lines := strings.Split(input, "\\n")
		for _, s := range strings.Fields(lines[0]) {
			val, _ := strconv.Atoi(s)
			nums = append(nums, val)
		}
		if len(lines) > 1 {
			target, _ = strconv.Atoi(strings.TrimSpace(lines[1]))
		}
	}

	res := searchInsert(nums, target)
	fmt.Println(res)
}
`;
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
    } else if (lang === "go") {
      return `package main

import (
	"encoding/json"
	"fmt"
	"io"
	"os"
	"strings"
)

${userCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	lines := strings.Split(input, "\\n")
	if len(lines) >= 2 {
		var oldNode, newNode map[string]interface{}
		_ = json.Unmarshal([]byte(lines[0]), &oldNode)
		_ = json.Unmarshal([]byte(lines[1]), &newNode)
		
		res := diff(oldNode, newNode)
		resBytes, _ := json.Marshal(res)
		fmt.Println(string(resBytes))
	} else {
		fmt.Println("[]")
	}
}
`;
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
    } else if (lang === "go") {
      return `package main

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
)

${userCode}

type MockRedis struct{}

func (r *MockRedis) Exec() []interface{} {
	return []interface{}{nil, 2, nil, nil}
}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	parts := strings.Fields(input)
	userId := parts[0]
	limit := 5
	if len(parts) > 1 {
		limit, _ = strconv.Atoi(parts[1])
	}

	mock := &MockRedis{}
	res := isRateLimited(mock, userId, limit, 60)
	if res {
		fmt.Println("true")
	} else {
		fmt.Println("false")
	}
}
`;
    }
  }

  if (lang === "javascript") {
    // Extract function name at wrap-time from user code (before emitting the wrapper)
    const fnNameMatch = userCode.match(
      /(?:^|\n)\s*(?:var|let|const)\s+(\w+)\s*=\s*(?:async\s*)?function|(?:^|\n)\s*(?:async\s+)?function\s+(\w+)/
    );
    const extractedFnName = fnNameMatch ? (fnNameMatch[1] || fnNameMatch[2]) : null;

    // Build the candidate list — put extracted name first so it wins
    const candidateNames = [
      ...(extractedFnName ? [extractedFnName] : []),
      'solve', 'solution', 'intToRoman', 'romanToInt', 'twoSum', 'maxProfit',
      'isValid', 'search', 'searchInsert', 'lengthOfLongestSubstring',
      'maxSubArray', 'climbStairs', 'minDistance', 'numIslands',
      'reverse', 'isPalindrome', 'myAtoi', 'isMatch',
    ];

    return `${userCode}

// Backend I/O Wrapper (universal)
const _fs = require('fs');
const _rawInput = _fs.readFileSync(0, 'utf-8').trim();

// Try each candidate name directly — works in Node file mode where var is module-scoped
const _candidateNames = ${JSON.stringify(candidateNames)};
let _fn = null;
for (const _name of _candidateNames) {
  try {
    const _candidate = eval(_name);
    if (typeof _candidate === 'function') { _fn = _candidate; break; }
  } catch {}
}

if (_fn) {
  let _parsedInput;
  let _parsedSuccess = false;
  try {
    _parsedInput = JSON.parse(_rawInput);
    _parsedSuccess = true;
  } catch {
    try {
      _parsedInput = JSON.parse("[" + _rawInput + "]");
      _parsedSuccess = true;
    } catch {
      _parsedInput = _rawInput;
    }
  }

  const _expectedArgsCount = _fn.length;
  let _res;
  if (_parsedSuccess && Array.isArray(_parsedInput)) {
    if (_expectedArgsCount === 1) {
      try { _res = _fn(_parsedInput); } catch { _res = _fn(..._parsedInput); }
    } else {
      try { _res = _fn(..._parsedInput); } catch { _res = _fn(_parsedInput); }
    }
  } else {
    try { _res = _fn(_parsedInput); } catch { _res = _fn(_rawInput); }
  }

  if (_res !== undefined) {
    if (Array.isArray(_res)) process.stdout.write(JSON.stringify(_res) + '\\n');
    else if (typeof _res === 'object' && _res !== null) process.stdout.write(JSON.stringify(_res) + '\\n');
    else process.stdout.write(String(_res) + '\\n');
  }
}`;
  }

  if (lang === "python") {
    return `${userCode}

# Backend I/O Wrapper (universal)
import sys, json, inspect
_raw = sys.stdin.read().strip()
_candidate_names = [
    'solve', 'solution', 'int_to_roman', 'intToRoman', 'roman_to_int', 'romanToInt',
    'two_sum', 'twoSum', 'max_profit', 'maxProfit',
    'is_valid', 'isValid', 'search', 'search_insert', 'searchInsert',
    'length_of_longest_substring', 'lengthOfLongestSubstring',
    'max_sub_array', 'climb_stairs', 'min_distance', 'num_islands',
    'reverse', 'is_palindrome', 'my_atoi',
]
_fn = None
for _name in _candidate_names:
    if _name in globals() and callable(globals()[_name]):
        _fn = globals()[_name]; break
if _fn is None:
    import builtins as _builtins
    _builtin_names = set(dir(_builtins))
    _fn = next((v for v in globals().values() if callable(v) and not isinstance(v, type) and getattr(v, '__name__', '') not in _builtin_names and not getattr(v, '__name__', '').startswith('_')), None)
if _fn is not None:
    _parsed = None
    _parsed_success = False
    try:
        _parsed = json.loads(_raw)
        _parsed_success = True
    except Exception:
        try:
            _parsed = json.loads(f"[{_raw}]")
            _parsed_success = True
        except Exception:
            _parsed = _raw

    try:
        _sig = inspect.signature(_fn)
        _params = list(_sig.parameters.values())
        _pos_params = [p for p in _params if p.name != "self" and p.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)]
        _has_var_positional = any(p.kind == inspect.Parameter.VAR_POSITIONAL for p in _params)
        _max_params_count = len(_pos_params)
    except Exception:
        _has_var_positional = True
        _max_params_count = 99

    _res = None
    if _parsed_success and isinstance(_parsed, list):
        if _max_params_count == 1 and not _has_var_positional:
            try:
                _res = _fn(_parsed)
            except TypeError:
                try:
                    _res = _fn(*_parsed)
                except Exception:
                    _res = _fn(_raw)
        else:
            try:
                _res = _fn(*_parsed)
            except TypeError:
                try:
                    _res = _fn(_parsed)
                except Exception:
                    _res = _fn(_raw)
    else:
        try:
            _res = _fn(_parsed)
        except TypeError:
            _res = _fn(_raw)

    if _res is not None:
        if isinstance(_res, (list, tuple)): print(json.dumps(list(_res)))
        elif isinstance(_res, dict): print(json.dumps(_res))
        else: print(str(_res))`;
  }

  // ── Go: dynamic wrapper that parses solution signature and unmarshals stdin ──
  if (lang === "go") {
    // 1. Extract function signature to identify the entry point
    const funcRegex = /func\s+(\w+)\s*\(([^)]*)\)\s*([^{]+)/g;
    let fnName = "";
    let paramsStr = "";
    let retType = "";
    let m;
    while ((m = funcRegex.exec(userCode)) !== null) {
      if (m[1] !== "main") {
        fnName = m[1];
        paramsStr = m[2];
        retType = m[3].trim();
        break;
      }
    }

    // 2. Parse imports from user code to merge them with our required imports
    const imports = new Set(["fmt", "io", "os", "strings", "encoding/json"]);
    
    // Parse single line imports
    const singleImportRegex = /import\s+"([^"]+)"/g;
    let singleMatch;
    while ((singleMatch = singleImportRegex.exec(userCode)) !== null) {
      imports.add(singleMatch[1]);
    }

    // Parse block imports
    const blockImportRegex = /import\s*\(([\s\S]*?)\)/g;
    let blockMatch;
    while ((blockMatch = blockImportRegex.exec(userCode)) !== null) {
      const inner = blockMatch[1];
      const lines = inner.split("\n");
      lines.forEach(line => {
        const lineMatch = line.match(/"([^"]+)"/);
        if (lineMatch) imports.add(lineMatch[1]);
      });
    }

    // 3. Clean user code: strip package declaration, imports, and rename main to user_main
    let cleanedCode = userCode
      .replace(/^\s*package\s+\w+/gm, "")
      .replace(/import\s*\(([\s\S]*?)\)/g, "")
      .replace(/import\s+"[^"]+"/g, "")
      .replace(/\bfunc\s+main\s*\(\s*\)/g, "func user_main()");

    // 4. If no solution function was extracted, output standard fallback
    if (!fnName) {
      const importBlock = Array.from(imports).map(imp => `\t"${imp}"`).join("\n");
      return `package main

import (
${importBlock}
)

${cleanedCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	_ = input
	fmt.Println("Code compiled successfully.")
}
`;
    }

    // 5. Parse parameter types to generate unmarshalling logic
    const params = [];
    if (paramsStr.trim()) {
      const parts = paramsStr.split(",");
      let currentType = "";
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim();
        const tokens = part.split(/\s+/);
        if (tokens.length >= 2) {
          currentType = tokens[tokens.length - 1];
          const names = tokens.slice(0, tokens.length - 1);
          for (const name of names) {
            params.unshift({ name, type: currentType });
          }
        } else if (tokens.length === 1 && tokens[0]) {
          params.unshift({ name: tokens[0], type: currentType });
        }
      }
    }

    // Generate dynamic param unmarshalling lines
    const paramDeclarations = [];
    const paramNames = [];
    params.forEach((param, index) => {
      paramDeclarations.push(`\tvar param${index} ${param.type}`);
      if (params.length === 1 && index === 0) {
        paramDeclarations.push(`\tif err := json.Unmarshal([]byte(input), &param0); err != nil {\n\t\tif len(args) > 0 {\n\t\t\t_ = json.Unmarshal(args[0], &param0)\n\t\t}\n\t}`);
      } else {
        paramDeclarations.push(`\tif len(args) > ${index} {\n\t\t_ = json.Unmarshal(args[${index}], &param${index})\n\t}`);
      }
      paramNames.push(`param${index}`);
    });

    const hasReturn = retType && retType.trim() !== "";
    const callAndPrint = hasReturn 
      ? `\tres := ${fnName}(${paramNames.join(", ")})\n\tresBytes, _ := json.Marshal(res)\n\tfmt.Println(string(resBytes))`
      : `\t${fnName}(${paramNames.join(", ")})`;

    // Build the merged imports block
    const importBlock = Array.from(imports).map(imp => `\t"${imp}"`).join("\n");

    // 6. Generate the complete package main with the dynamic main harness
    return `package main

import (
${importBlock}
)

${cleanedCode}

func main() {
	inputBytes, _ := io.ReadAll(os.Stdin)
	input := strings.TrimSpace(string(inputBytes))
	if input == "" {
		return
	}

	var args []json.RawMessage
	if !strings.HasPrefix(input, "[") {
		input = "[" + input + "]"
	}
	if err := json.Unmarshal([]byte(input), &args); err != nil {
		return
	}

${paramDeclarations.join("\n")}

${callAndPrint}
}
`;
  }

  return userCode;
}
