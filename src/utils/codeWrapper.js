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

  if (lang === "java") {
    // If the user code contains its own main entry point and it actually reads from stdin,
    // return it unmodified. Otherwise, if it is just a dummy/test main method, we continue
    // to wrap it.
    if (/\bstatic\s+void\s+main\b/.test(userCode)) {
      const readsInput = /System\.in|Scanner|BufferedReader|InputStreamReader/.test(userCode);
      if (readsInput) {
        return userCode;
      }
    }

    // 1. Identify the user's class name using regex
    const classMatch = userCode.match(/class\s+(\w+)/);
    let className = classMatch ? classMatch[1] : "Solution";
    let processedUserCode = userCode;

    // If the user's class is named Main, rename it to UserSolution to avoid collision
    // with the wrapper's Main class. We must make it package-private (remove public)
    // so it compiles successfully within Main.java.
    if (className === "Main") {
      className = "UserSolution";
      processedUserCode = userCode
        .replace(/\bpublic\s+class\s+Main\b/, "class UserSolution")
        .replace(/\bclass\s+Main\b/, "class UserSolution");
    }

    // 2. Identify the target method signature (excluding main)
    const methodRegex = /(?:public|protected|private|static|\s)+([\w<>[\]]+)\s+(\w+)\s*\(([^)]*)\)/g;
    let methodMatch;
    let returnType = "";
    let methodName = "";
    let paramsStr = "";

    while ((methodMatch = methodRegex.exec(userCode)) !== null) {
      if (methodMatch[2] !== "main") {
        returnType = methodMatch[1];
        methodName = methodMatch[2];
        paramsStr = methodMatch[3];
        break;
      }
    }

    if (!methodName) {
      // If no valid non-main method is found, return the userCode unmodified
      return userCode;
    }

    // 3. Parse parameters
    const params = [];
    if (paramsStr.trim()) {
      paramsStr.split(",").forEach(p => {
        const parts = p.trim().split(/\s+/);
        if (parts.length >= 2) {
          const type = parts.slice(0, -1).join(" ");
          const name = parts[parts.length - 1];
          params.push({ type, name });
        }
      });
    }

    // 4. Generate parameter parsing logic in Java
    const paramDeclarations = [];
    const paramNames = [];

    if (params.length === 1) {
      const type = params[0].type;
      if (type === "String[]") {
        paramDeclarations.push("        String[] param0 = parseStringArray(input);");
      } else if (type === "int[]") {
        paramDeclarations.push("        int[] param0 = parseIntArray(input);");
      } else if (type === "int") {
        paramDeclarations.push("        int param0 = Integer.parseInt(input);");
      } else if (type === "String") {
        paramDeclarations.push("        String param0 = input;");
      } else {
        paramDeclarations.push("        String param0 = input;"); // default fallback
      }
      paramNames.push("param0");
    } else if (params.length > 1) {
      paramDeclarations.push("        String[] lines = input.split(\"\\\\n\");");
      params.forEach((param, index) => {
        const type = param.type;
        const lineIdx = `lines.length > ${index} ? lines[${index}].trim() : ""`;
        if (type === "String[]") {
          paramDeclarations.push(`        String[] param${index} = parseStringArray(${lineIdx});`);
        } else if (type === "int[]") {
          paramDeclarations.push(`        int[] param${index} = parseIntArray(${lineIdx});`);
        } else if (type === "int") {
          paramDeclarations.push(`        int param${index} = ${lineIdx}.isEmpty() ? 0 : Integer.parseInt(${lineIdx});`);
        } else if (type === "String") {
          paramDeclarations.push(`        String param${index} = ${lineIdx};`);
        } else {
          paramDeclarations.push(`        String param${index} = ${lineIdx};`);
        }
        paramNames.push(`param${index}`);
      });
    }

    // 5. Generate return value printing logic in Java
    let invocationAndPrint = "";
    const isStatic = userCode.includes("static " + returnType + " " + methodName) || userCode.includes("static  " + returnType + " " + methodName);
    const solverInstantiation = isStatic ? "" : `        ${className} solver = new ${className}();\n`;
    const invocationTarget = isStatic ? className : "solver";

    if (returnType === "void") {
      invocationAndPrint = `${solverInstantiation}        ${invocationTarget}.${methodName}(${paramNames.join(", ")});`;
    } else if (returnType === "String") {
      invocationAndPrint = `${solverInstantiation}        String res = ${invocationTarget}.${methodName}(${paramNames.join(", ")});\n        System.out.println("\\"" + res + "\\"");`;
    } else if (returnType === "int[]") {
      invocationAndPrint = `${solverInstantiation}        int[] res = ${invocationTarget}.${methodName}(${paramNames.join(", ")});\n        System.out.print("[");\n        for (int i = 0; i < res.length; i++) {\n            System.out.print(res[i] + (i == res.length - 1 ? "" : ","));\n        }\n        System.out.println("]");`;
    } else if (returnType === "String[]") {
      invocationAndPrint = `${solverInstantiation}        String[] res = ${invocationTarget}.${methodName}(${paramNames.join(", ")});\n        System.out.print("[");\n        for (int i = 0; i < res.length; i++) {\n            System.out.print("\\"" + res[i] + "\\"" + (i == res.length - 1 ? "" : ","));\n        }\n        System.out.println("]");`;
    } else {
      invocationAndPrint = `${solverInstantiation}        System.out.println(${invocationTarget}.${methodName}(${paramNames.join(", ")}));`;
    }

    // 6. Assemble the wrapper
    return `${processedUserCode}

// Backend I/O Wrapper (universal)
public class Main {
    public static void main(String[] args) throws Exception {
        java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            sb.append(line).append("\\n");
        }
        String input = sb.toString().trim();
        if (input.isEmpty()) return;

${paramDeclarations.join("\n")}

${invocationAndPrint}
    }

    private static String[] parseStringArray(String input) {
        input = input.trim();
        if (input.startsWith("[")) {
            input = input.substring(1);
        }
        if (input.endsWith("]")) {
            input = input.substring(0, input.length() - 1);
        }
        if (input.isEmpty()) {
            return new String[0];
        }
        String[] parts = input.split(",");
        String[] res = new String[parts.length];
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i].trim();
            if (p.startsWith("\\\"") && p.endsWith("\\\"")) {
                p = p.substring(1, p.length() - 1);
            } else if (p.startsWith("'") && p.endsWith("'")) {
                p = p.substring(1, p.length() - 1);
            }
            res[i] = p;
        }
        return res;
    }

    private static int[] parseIntArray(String input) {
        input = input.trim();
        if (input.startsWith("[")) {
            input = input.substring(1);
        }
        if (input.endsWith("]")) {
            input = input.substring(0, input.length() - 1);
        }
        if (input.isEmpty()) {
            return new int[0];
        }
        String[] parts = input.split("[,\\\\s]+");
        int[] res = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            res[i] = Integer.parseInt(parts[i].trim());
        }
        return res;
    }
}
`;
  }

  if (lang === "cpp" || lang === "c++") {
    // If the user code contains a real main method reading from stdin (e.g. cin >> or getline),
    // we return it unmodified.
    if (/\bint\s+main\b/.test(userCode)) {
      const readsInput = /cin\s*>>|getline|scanf/.test(userCode);
      if (readsInput) {
        return userCode;
      }
    }

    // 1. Identify the user's class name using regex if it is LeetCode class-style
    const classMatch = userCode.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : "";

    // 2. Identify the target method signature (excluding main)
    const methodRegex = /(?:public|protected|private|static|inline|\s)+([\w<>[\]:]+)\s+(\w+)\s*\(([^)]*)\)/g;
    let methodMatch;
    let returnType = "";
    let methodName = "";
    let paramsStr = "";

    while ((methodMatch = methodRegex.exec(userCode)) !== null) {
      const name = methodMatch[2];
      if (name !== "main" && name !== "vector" && name !== "string" && name !== "unordered_map" && name !== "map") {
        returnType = methodMatch[1];
        methodName = name;
        paramsStr = methodMatch[3];
        break;
      }
    }

    if (!methodName) {
      return userCode;
    }

    // Rename user's main to user_main to prevent compilation errors
    let processedUserCode = userCode.replace(/\bint\s+main\b/, "int user_main");

    // 3. Parse parameters
    const params = [];
    if (paramsStr.trim()) {
      paramsStr.split(",").forEach(p => {
        const parts = p.trim().split(/\s+/);
        if (parts.length >= 2) {
          let type = parts.slice(0, -1).join(" ");
          const name = parts[parts.length - 1];
          type = type.replace(/const\s+/, "").replace(/&/, "").trim();
          params.push({ type, name });
        }
      });
    }

    // 4. Generate parameter parsing logic in C++
    const paramDeclarations = [];
    const paramNames = [];

    if (params.length === 1) {
      const type = params[0].type;
      if (type === "vector<int>" || type === "std::vector<int>") {
        paramDeclarations.push("    vector<int> param0 = parseVectorInt(input);");
      } else if (type === "vector<string>" || type === "std::vector<string>") {
        paramDeclarations.push("    vector<string> param0 = parseVectorString(input);");
      } else if (type === "int") {
        paramDeclarations.push("    int param0 = input.empty() ? 0 : stoi(input);");
      } else if (type === "string" || type === "std::string") {
        paramDeclarations.push("    string param0 = input;");
      } else {
        paramDeclarations.push("    string param0 = input;");
      }
      paramNames.push("param0");
    } else if (params.length > 1) {
      paramDeclarations.push("    vector<string> lines;");
      paramDeclarations.push("    string line;");
      paramDeclarations.push("    stringstream ss(input);");
      paramDeclarations.push("    while (getline(ss, line)) {");
      paramDeclarations.push("        lines.push_back(line);");
      paramDeclarations.push("    }");
      
      params.forEach((param, index) => {
        const type = param.type;
        const lineVal = `(lines.size() > ${index} ? lines[${index}] : "")`;
        if (type === "vector<int>" || type === "std::vector<int>") {
          paramDeclarations.push(`    vector<int> param${index} = parseVectorInt(${lineVal});`);
        } else if (type === "vector<string>" || type === "std::vector<string>") {
          paramDeclarations.push(`    vector<string> param${index} = parseVectorString(${lineVal});`);
        } else if (type === "int") {
          paramDeclarations.push(`    int param${index} = ${lineVal}.empty() ? 0 : stoi(${lineVal});`);
        } else if (type === "string" || type === "std::string") {
          paramDeclarations.push(`    string param${index} = ${lineVal};`);
        } else {
          paramDeclarations.push(`    string param${index} = ${lineVal};`);
        }
        paramNames.push(`param${index}`);
      });
    }

    // 5. Generate return value printing logic in C++
    const solverInstantiation = className ? `    ${className} solver;\n` : "";
    const callPrefix = className ? "solver." : "";

    let invocationAndPrint = "";
    if (returnType === "void") {
      invocationAndPrint = `${solverInstantiation}    ${callPrefix}${methodName}(${paramNames.join(", ")});`;
    } else if (returnType === "vector<int>" || returnType === "std::vector<int>") {
      invocationAndPrint = `${solverInstantiation}    vector<int> res = ${callPrefix}${methodName}(${paramNames.join(", ")});\n` +
        `    cout << "[";\n` +
        `    for (size_t i = 0; i < res.size(); i++) {\n` +
        `        cout << res[i] << (i == res.size() - 1 ? "" : ",");\n` +
        `    }\n` +
        `    cout << "]" << endl;`;
    } else if (returnType === "vector<string>" || returnType === "std::vector<string>") {
      invocationAndPrint = `${solverInstantiation}    vector<string> res = ${callPrefix}${methodName}(${paramNames.join(", ")});\n` +
        `    cout << "[";\n` +
        `    for (size_t i = 0; i < res.size(); i++) {\n` +
        `        cout << "\\"" << res[i] << "\\"" << (i == res.size() - 1 ? "" : ",");\n` +
        `    }\n` +
        `    cout << "]" << endl;`;
    } else if (returnType === "bool") {
      invocationAndPrint = `${solverInstantiation}    cout << (${callPrefix}${methodName}(${paramNames.join(", ")}) ? "true" : "false") << endl;`;
    } else if (returnType === "string" || returnType === "std::string") {
      invocationAndPrint = `${solverInstantiation}    cout << "\\"" << ${callPrefix}${methodName}(${paramNames.join(", ")}) << "\\"" << endl;`;
    } else {
      invocationAndPrint = `${solverInstantiation}    cout << ${callPrefix}${methodName}(${paramNames.join(", ")}) << endl;`;
    }


    // 6. Assemble the wrapper
    return `${processedUserCode}

// Backend I/O Wrapper (universal)
#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>

using namespace std;

static vector<int> parseVectorInt(string s) {
    vector<int> res;
    s.erase(remove(s.begin(), s.end(), '['), s.end());
    s.erase(remove(s.begin(), s.end(), ']'), s.end());
    s.erase(remove(s.begin(), s.end(), ' '), s.end());
    if (s.empty()) return res;
    stringstream ss(s);
    string token;
    while (getline(ss, token, ',')) {
        if (!token.empty()) {
            res.push_back(stoi(token));
        }
    }
    return res;
}

static vector<string> parseVectorString(string s) {
    vector<string> res;
    s.erase(remove(s.begin(), s.end(), '['), s.end());
    s.erase(remove(s.begin(), s.end(), ']'), s.end());
    if (s.empty()) return res;
    stringstream ss(s);
    string token;
    while (getline(ss, token, ',')) {
        token.erase(remove(token.begin(), token.end(), '"'), token.end());
        token.erase(remove(token.begin(), token.end(), '\\\''), token.end());
        res.push_back(token);
    }
    return res;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string input;
    string line;
    while (getline(cin, line)) {
        input += line + "\\n";
    }
    if (!input.empty() && input.back() == '\\n') {
        input.pop_back();
    }
    input.erase(0, input.find_first_not_of(" \\t\\r\\n"));
    input.erase(input.find_last_not_of(" \\t\\r\\n") + 1);
    if (input.empty()) return 0;

${paramDeclarations.join("\n")}

${invocationAndPrint}
    return 0;
}
`;
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
    else if (typeof _res === 'string') process.stdout.write(JSON.stringify(_res) + '\\n');
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
        elif isinstance(_res, str): print(json.dumps(_res))
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

    // 2. Parse imports from user code to collect what the user already imports
    const userImports = new Set();

    // Parse single line imports
    const singleImportRegex = /import\s+"([^"]+)"/g;
    let singleMatch;
    while ((singleMatch = singleImportRegex.exec(userCode)) !== null) {
      userImports.add(singleMatch[1]);
    }

    // Parse block imports
    const blockImportRegex = /import\s*\(([\s\S]*?)\)/g;
    let blockMatch;
    while ((blockMatch = blockImportRegex.exec(userCode)) !== null) {
      const inner = blockMatch[1];
      const lines = inner.split("\n");
      lines.forEach(line => {
        const lineMatch = line.match(/"([^"]+)"/);
        if (lineMatch) userImports.add(lineMatch[1]);
      });
    }

    // 3. Check if user has written their own main() function
    const hasOwnMain = /\bfunc\s+main\s*\(\s*\)/.test(userCode);

    // 4. If no solution function was extracted AND user has their own main(),
    //    pass the code through directly — just strip the package declaration
    //    and re-add correct imports. Do NOT rename main or replace it.
    if (!fnName) {
      if (hasOwnMain) {
        // Build only the imports the user actually used (plus their own)
        const onlyUserImports = Array.from(userImports);
        const importBlock = onlyUserImports.length > 0
          ? `import (\n${onlyUserImports.map(imp => `\t"${imp}"`).join("\n")}\n)`
          : "";

        // Strip package + imports from user code, keep everything else intact
        const bareCode = userCode
          .replace(/^\s*package\s+\w+\s*/gm, "")
          .replace(/import\s*\([\s\S]*?\)/g, "")
          .replace(/import\s+"[^"]+"/g, "")
          .trim();

        return `package main\n\n${importBlock}\n\n${bareCode}\n`;
      }

      // No solution function and no main() — unreachable but safe fallback
      return `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("No solution function found.")\n}\n`;
    }

    // 3b. Clean user code: strip package declaration, imports, rename main → user_main
    let cleanedCode = userCode
      .replace(/^\s*package\s+\w+/gm, "")
      .replace(/import\s*\([\s\S]*?\)/g, "")
      .replace(/import\s+"[^"]+"/g, "")
      .replace(/\bfunc\s+main\s*\(\s*\)/g, "func user_main()");

    // For the full harness (solution function found), we DO use encoding/json
    const imports = new Set(["fmt", "io", "os", "strings", "encoding/json", ...userImports]);

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
