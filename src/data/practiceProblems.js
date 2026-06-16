// Synapse Academy Practice Problems Dataset
// Contains detailed content for practice zone exercises

export const practiceProblems = [
  {
    id: "auth-vs-auth",
    title: "1. Authentication vs Authorization",
    difficulty: "Easy",
    category: "Security",
    badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    desc: "Understand and document the core security protocols defining user identity verification versus resource permission grants in modern systems.",
    time: "20 min",
    icon: "ShieldAlert",
    tags: ["Security", "OAuth2", "System Design"],
    defaultLanguage: "markdown",
    editorTemplates: {
      markdown: `# Authentication vs Authorization Analysis

### 1. Definitions
*   **Authentication (AuthN):** [Explain who a user is...]
*   **Authorization (AuthR):** [Explain what a user is allowed to do...]

### 2. Scenario Evaluations

*   **Scenario A:** A request reaches a protected API without a valid token.
    *   *System Action:* [Deny request immediately / trigger login redirect]
    *   *Expected HTTP Status Code:* [e.g. 401 Unauthorized]
    *   *Security Rationale:* [Explain why...]

*   **Scenario B:** A logged-in user with role "Member" tries to access an API path \`DELETE /api/v1/users/all\` (admin-only).
    *   *System Action:* [Block action execution]
    *   *Expected HTTP Status Code:* [e.g. 403 Forbidden]
    *   *Security Rationale:* [Explain why...]

### 3. Implementation Best Practices
*   How should we store and verify tokens (JWT vs Session)?
*   How do we structure role checks (RBAC vs ABAC)?
`,
      javascript: `// Mock implementation of a simple Auth middleware
function handleRequest(request) {
    const { token, userRole, path } = request;
    
    // 1. Authenticate (Check token)
    if (!token || token !== "valid-session-jwt") {
        return {
            status: 401,
            body: "Authentication failed: Invalid or missing token"
        };
    }
    
    // 2. Authorize (Check role for restricted paths)
    if (path.startsWith("/admin") && userRole !== "admin") {
        return {
            status: 403,
            body: "Authorization failed: Insufficient permissions"
        };
    }
    
    return {
        status: 200,
        body: "Success: Access granted to " + path
    };
}
`,
      python: `# Security middleware controller simulation
def handle_request(request):
    token = request.get("token")
    user_role = request.get("user_role")
    path = request.get("path")
    
    # 1. Authentication
    if not token or token != "valid-session-jwt":
        return {
            "status": 401,
            "body": "Authentication failed"
        }
        
    # 2. Authorization
    if path.startswith("/admin") and user_role != "admin":
        return {
            "status": 403,
            "body": "Authorization failed"
        }
        
    return {
        "status": 200,
        "body": "Success"
    }
`
    },
    testcases: [
      {
        name: "Test Case 1: Unauthenticated request",
        input: '{\n  "token": null,\n  "userRole": "guest",\n  "path": "/dashboard"\n}',
        expected: '{"status":401}',
        assertion: (codeStr) => {
          // Verify code contains keyword checks
          if (codeStr.includes("401") || codeStr.toLowerCase().includes("unauthorized")) return true;
          return false;
        }
      },
      {
        name: "Test Case 2: Unauthorized request to admin path",
        input: '{\n  "token": "valid-session-jwt",\n  "userRole": "member",\n  "path": "/admin/delete-users"\n}',
        expected: '{"status":403}',
        assertion: (codeStr) => {
          if (codeStr.includes("403") || codeStr.toLowerCase().includes("forbidden")) return true;
          return false;
        }
      }
    ],
    tabs: {
      description: `### 1. Authentication vs Authorization

You are designing the security layer of a backend system. 

Your task is to explain and differentiate the security mechanisms of **Authentication (AuthN)** and **Authorization (AuthR)**, particularly in how they respond to requests targeting secure assets.

#### Visual Scenarios:
*   **Example 1:**
    *   **Scenario:** A request reaches a protected API without a valid token.
    *   **Expected Thinking:**
        *   User identity cannot be verified.
        *   Authentication failed.
        *   The request should not reach business logic.
        *   *Result:* Returns HTTP **401 Unauthorized**.
*   **Example 2:**
    *   **Scenario:** A logged-in user with role \`member\` tries to access an admin-only API.
    *   **Expected Thinking:**
        *   User identity is valid (they are authenticated).
        *   Permission check failed (they do not possess the 'admin' role).
        *   *Result:* Returns HTTP **403 Forbidden**.

#### Requirements:
Fill out the editor template with comprehensive explanations for each scenario, including the proper HTTP status codes, security rationales, and architectural differences between authentication and authorization protocols.`,
      followup: `### Deeper Architecture Questions

1. **Token Revocation (JWT Lifespans):**
   Since JSON Web Tokens (JWTs) are stateless, how would you design a token revocation mechanism (like a user logging out before expiration)? Differentiate between Redis blacklisting and short-lived tokens with refresh tokens stored in secure HttpOnly cookies.

2. **Privilege Escalation:**
   How do you prevent IDOR (Insecure Direct Object References) where an authenticated user changes an query parameter ID (e.g., \`/api/users?id=123\` to \`/api/users?id=124\`) to access data they own but shouldn't view? Explain ownership-based validation.`,
      editorial: `### Editorial: Securing Web APIs

Authentication is verifying **who** you are, while authorization is verifying **what** you have permission to do.

\`\`\`
   [ HTTP Request ] 
          │
          ▼
┌──────────────────┐
│  Authentication  │  (Verify token, resolve user identity)
└─────────┬────────┘
          │ (Success: User ID resolves)
          ▼
┌──────────────────┐
│  Authorization   │  (Verify roles/policies for this endpoint)
└─────────┬────────┘
          │ (Success: Access is allowed)
          ▼
┌──────────────────┐
│  Business Logic  │  (Fetch DB details, return resource)
└──────────────────┘
\`\`\`

#### Key Takeaways:
*   **401 Unauthorized** means "Unauthenticated" (not logged in, or token invalid).
*   **403 Forbidden** means "Unauthorized" (identity is known, but lacks permissions for the action).
*   Always use secure transport protocols (HTTPS) to prevent interception of Bearer tokens.`,
      solution: `### Reference Architectures

#### JavaScript Middleware Example:
\`\`\`javascript
// Express.js authentication & role validation middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // Set authenticated user context
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access forbidden: Insufficient permissions" });
    }
    next();
  };
};
\`\`\``,
      evaluation: `### Evaluation Rubric

Your response will be evaluated against:
1. **Accurate HTTP Status Codes**: Explicit use of **401** for unauthenticated states and **403** for unauthorized actions.
2. **Security Concept Clarity**: Differentiating tokens (identity claims) from access controls (roles/policies).
3. **Storage Analysis**: Analyzing the security trade-offs of storing tokens in LocalStorage (vulnerable to XSS) vs HttpOnly cookies (vulnerable to CSRF, requiring protection tokens).`
    }
  },
  {
    id: "two-sum",
    title: "2. Two Sum Problem",
    difficulty: "Easy",
    category: "Algorithms",
    badgeColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    desc: "Given an array of integers and a target value, find indices of the two elements that sum exactly to the target.",
    time: "15 min",
    icon: "Code",
    tags: ["Arrays", "Hash Map", "Complexity Analysis"],
    defaultLanguage: "javascript",
    editorTemplates: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your optimal O(N) solution here
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
`,
      python: `def two_sum(nums, target):
    # Write your optimal O(N) solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`,
      markdown: `# Algorithmic Analysis: Two Sum

The goal is to find two indices in an array such that their values sum to a specific target.

### 1. Brute Force Approach
*   **Method:** Nested loops comparing each pair.
*   **Time Complexity:** $\\mathcal{O}(N^2)$
*   **Space Complexity:** $\\mathcal{O}(1)$

### 2. Optimal Approach
*   **Method:** Use a Hash Map (Dictionary) to cache values and their indices.
*   **Time Complexity:** $\\mathcal{O}(N)$
*   **Space Complexity:** $\\mathcal{O}(N)$
`
    },
    testcases: [
      {
        name: "Standard test case",
        input: "[2, 7, 11, 15], 9",
        expected: "[0, 1]",
        assertion: (codeStr, runFunc) => {
          if (!runFunc) return false;
          try {
            const res = runFunc([2, 7, 11, 15], 9);
            return Array.isArray(res) && res.includes(0) && res.includes(1);
          } catch { return false; }
        }
      },
      {
        name: "Duplicate values",
        input: "[3, 2, 4], 6",
        expected: "[1, 2]",
        assertion: (codeStr, runFunc) => {
          if (!runFunc) return false;
          try {
            const res = runFunc([3, 2, 4], 6);
            return Array.isArray(res) && res.includes(1) && res.includes(2);
          } catch { return false; }
        }
      },
      {
        name: "Identical elements",
        input: "[3, 3], 6",
        expected: "[0, 1]",
        assertion: (codeStr, runFunc) => {
          if (!runFunc) return false;
          try {
            const res = runFunc([3, 3], 6);
            return Array.isArray(res) && res.includes(0) && res.includes(1);
          } catch { return false; }
        }
      }
    ],
    tabs: {
      description: `### 2. Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to \`target\`*.

You may assume that each input would have ***exactly* one solution**, and you may not use the *same* element twice.

You can return the answer in any order.

#### Examples:
*   **Example 1:**
    *   **Input:** \`nums = [2,7,11,15], target = 9\`
    *   **Output:** \`[0,1]\`
    *   **Explanation:** Because \`nums[0] + nums[1] == 9\`, we return \`[0, 1]\`.
*   **Example 2:**
    *   **Input:** \`nums = [3,2,4], target = 6\`
    *   **Output:** \`[1,2]\`
*   **Example 3:**
    *   **Input:** \`nums = [3,3], target = 6\`
    *   **Output:** \`[0,1]\`

#### Constraints:
*   \`2 <= nums.length <= 10^4\`
*   \`-10^9 <= nums[i] <= 10^9\`
*   \`-10^9 <= target <= 10^9\`
*   **Only one valid answer exists.**`,
      followup: `### Follow-up Challenge

Can you write an algorithm that runs in less than $\\mathcal{O}(N^2)$ time complexity? 

Explain how sorting the array first and using a **two-pointer approach** works, and discuss its time/space trade-offs ($\\mathcal{O}(N \\log N)$ time, $\\mathcal{O}(1)$ space) compared to the Hash Map approach.`,
      editorial: `### Editorial: Two Sum Optimizations

A brute-force solution uses two nested loops, checking if \`nums[i] + nums[j] === target\`. This performs $N(N-1)/2$ comparisons, yielding an $\\mathcal{O}(N^2)$ runtime.

#### Hash Map Solution:
We can resolve this in a single scan. For each element \`nums[i]\`, its target complement is \`target - nums[i]\`.
1. We check if the complement already exists in our Hash Map.
2. If it does, we've found the pair! Return \`[map.get(complement), i]\`.
3. If not, store the current element's index: \`map.set(nums[i], i)\`.

This reduces time complexity to $\\mathcal{O}(N)$ because lookup in a hash table takes $\\mathcal{O}(1)$ average time. Space complexity increases to $\\mathcal{O}(N)$ to store elements in the hash table.`,
      solution: `### Solutions

#### JavaScript:
\`\`\`javascript
function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}
\`\`\`

#### Python:
\`\`\`python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\`\`\``,
      evaluation: `### Evaluation Rubric

1. **Correct Output**: Must return correct indices array for all inputs.
2. **Time Complexity**: Optimal solution must run in $\\mathcal{O}(N)$ complexity. Algorithms with nested loops will fail hidden performance checks.
3. **Space Complexity**: Hash table memory allocated should not exceed $\\mathcal{O}(N)$.`
    }
  },
  {
    id: "vdom-diff",
    title: "3. Virtual DOM Reconciliation Diffing",
    difficulty: "Medium",
    category: "Frontend",
    badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    desc: "Develop a lightweight version of React's Virtual DOM diffing engine to track and patch node modification actions.",
    time: "30 min",
    icon: "Layers",
    tags: ["React", "DOM", "Trees", "Virtual DOM"],
    defaultLanguage: "javascript",
    editorTemplates: {
      javascript: `/**
 * Simple diffing algorithm for VDOM nodes
 * @param {object} oldNode - e.g. { type: 'div', props: { className: 'hero' }, children: [...] }
 * @param {object} newNode
 * @return {array} - list of patch operations: { type: 'REPLACE'|'TEXT'|'PROPS', node: oldNode, newNode }
 */
function diff(oldNode, newNode) {
    const patches = [];
    
    // 1. If nodes are completely different types, replace
    if (!oldNode || !newNode) {
        patches.push({ type: 'REPLACE', newNode });
        return patches;
    }
    
    if (oldNode.type !== newNode.type) {
        patches.push({ type: 'REPLACE', newNode });
        return patches;
    }
    
    // 2. Check text content differences
    if (typeof oldNode === 'string' && oldNode !== newNode) {
        patches.push({ type: 'TEXT', newNode });
        return patches;
    }
    
    // 3. Simple child diffing (recursion)
    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    
    for (let i = 0; i < maxLen; i++) {
        const childPatches = diff(oldChildren[i], newChildren[i]);
        if (childPatches.length > 0) {
            patches.push({ type: 'CHILDREN', index: i, childPatches });
        }
    }
    
    return patches;
}
`,
      python: `def diff_vdom(old_node, new_node):
    # Returns list of patches for differences
    patches = []
    if not old_node or not new_node:
        return [{"type": "REPLACE", "new": new_node}]
        
    if old_node.get("type") != new_node.get("type"):
        return [{"type": "REPLACE", "new": new_node}]
        
    # Recursive children reconciliation
    old_children = old_node.get("children", [])
    new_children = new_node.get("children", [])
    
    for i in range(max(len(old_children), len(new_children))):
        # Comparison logic
        pass
        
    return patches
`,
      markdown: `# Virtual DOM Diffing Architecture

### Tree Diffing Rules
React diffs tree structures in $\\mathcal{O}(N)$ using two main heuristics:
1. Two elements of different types will produce different trees.
2. The developer can hint at which child elements may be stable across different renders with a \`key\` prop.
`
    },
    testcases: [
      {
        name: "Identical nodes diff",
        input: '{"type":"div"}, {"type":"div"}',
        expected: "[]",
        assertion: (codeStr, runFunc) => {
          if (!runFunc) return false;
          try {
            const res = runFunc({ type: "div", children: [] }, { type: "div", children: [] });
            return Array.isArray(res) && res.length === 0;
          } catch { return false; }
        }
      },
      {
        name: "Different node type diff",
        input: '{"type":"div"}, {"type":"span"}',
        expected: '[{"type":"REPLACE"}]',
        assertion: (codeStr, runFunc) => {
          if (!runFunc) return false;
          try {
            const res = runFunc({ type: "div", children: [] }, { type: "span", children: [] });
            return Array.isArray(res) && res.length > 0 && res[0].type === "REPLACE";
          } catch { return false; }
        }
      }
    ],
    tabs: {
      description: `### 3. Virtual DOM Reconciliation Diffing

Reconciling virtual trees is core to frameworks like React. A full comparison of two trees has a time complexity of $\\mathcal{O}(N^3)$, which is too slow for real-time rendering. 

Your objective is to implement a basic \`diff(oldNode, newNode)\` function that compares two virtual elements and outputs a list of patch instructions.

#### VNode Structure:
A Virtual DOM node is defined as:
\`\`\`javascript
{
  type: 'div', // string element name
  props: { className: 'btn' }, // attributes
  children: [ ... ] // array of nested VNodes or strings
}
\`\`\`

#### Operations to Detect:
1. \`REPLACE\`: The tag type changed (e.g. \`div\` to \`span\`), meaning the node must be completely replaced.
2. \`TEXT\`: A string node's content changed.
3. \`PROPS\`: Attributes modified (optional extra credit).
4. \`CHILDREN\`: Recurse into child items and record changes.`,
      followup: `### Follow-up Questions

1. **How does Key-based reconciliation work?**
   If a list is updated by inserting an item at the beginning:
   \`\`\`
   Old list: [A, B, C]
   New list: [D, A, B, C]
   \`\`\`
   Without keys, the diff engine marks A->D, B->A, C->B, and appends C. 
   Explain how assigning keys (e.g., \`key="1"\`) allows the compiler to detect that elements were simply shifted.

2. **React Fiber Scheduling:**
   How does React Fiber prevent page freeze when diffing large lists of 10,000+ nodes? Differentiate between recursive stack rendering and Fiber's linked list fiber node traversal.`,
      editorial: `### Editorial: Understanding VDOM Diffing

React’s reconciliation algorithms rely on two assumptions:
1. Two elements of different types will produce different trees.
2. List child items require stable keys to track shifts.

#### Tree Traversal:
We perform a depth-first traversal (DFS) of both VDOM trees simultaneously, matching node properties and children index-by-index.

\`\`\`
     Old VDOM             New VDOM
    ┌────────┐           ┌────────┐
    │  div   │           │  div   │  <- Same type: keep node, diff children
    └───┬────┘           └───┬────┘
        │                    │
   ┌────┴────┐          ┌────┴────┐
┌──▼──┐   ┌──▼──┐    ┌──▼──┐   ┌──▼──┐
│  h1 │   │  p  │    │  h2 │   │  p  │  <- Tag changed: replace h1 with h2
└─────┘   └─────┘    └─────┘   └─────┘
\`\`\``,
      solution: `### Solutions

#### JavaScript Implementation:
\`\`\`javascript
function diff(oldNode, newNode) {
    const patches = [];
    
    if (!oldNode) {
        patches.push({ type: 'CREATE', newNode });
        return patches;
    }
    if (!newNode) {
        patches.push({ type: 'REMOVE' });
        return patches;
    }
    
    // Replace if tag changed
    if (oldNode.type !== newNode.type) {
        patches.push({ type: 'REPLACE', newNode });
        return patches;
    }
    
    // Check text
    if (typeof oldNode === 'string' && oldNode !== newNode) {
        patches.push({ type: 'TEXT', newNode });
        return patches;
    }
    
    // Check children recursively
    const oldChildren = oldNode.children || [];
    const newChildren = newNode.children || [];
    const maxLen = Math.max(oldChildren.length, newChildren.length);
    
    for (let i = 0; i < maxLen; i++) {
        const childPatches = diff(oldChildren[i], newChildren[i]);
        if (childPatches.length > 0) {
            patches.push({ type: 'CHILDREN', index: i, childPatches });
        }
    }
    
    return patches;
}
\`\`\``,
      evaluation: `### Evaluation Rubric

1. **Tag Change Handling**: Correctly returns a \`REPLACE\` patch if element tag types differ.
2. **Text Validation**: Evaluates leaf string nodes and issues \`TEXT\` instructions.
3. **Tree Recursion**: Iterates children and aggregates sub-patches nested under their parent element.`
    }
  },
  {
    id: "rate-limiter",
    title: "4. Distributed Rate Limiter",
    difficulty: "Hard",
    category: "System Design",
    badgeColor: "text-rose-500 bg-rose-500/10 border-rose-500/20",
    desc: "Architect a resilient API Rate Limiter using redis sliding-window log algorithms to curb excessive traffic spikes.",
    time: "45 min",
    icon: "ShieldAlert",
    tags: ["Redis", "Algorithms", "System Design", "Backend"],
    defaultLanguage: "javascript",
    editorTemplates: {
      javascript: `// Redis sliding-window-log simulation
async function isRateLimited(redis, userId, limit = 100, windowSecs = 60) {
    const now = Date.now();
    const key = \`rate_limit:\${userId}\`;
    
    // Sliding window log implementation
    const minTimestamp = now - (windowSecs * 1000);
    
    // Transactions block
    const tx = redis.multi();
    tx.zremrangebyscore(key, 0, minTimestamp); // Remove old logs
    tx.zcard(key); // Count active requests in window
    tx.zadd(key, now, \`\${now}-\${Math.random()}\`); // Record current request
    tx.expire(key, windowSecs);
    
    const results = await tx.exec();
    const requestCount = results[1]; // Result of zcard
    
    if (requestCount >= limit) {
        return true; // Limit exceeded
    }
    
    return false; // Request allowed
}
`,
      python: `import time
import random

def is_rate_limited(redis, user_id, limit=100, window_secs=60):
    now = int(time.time() * 1000)
    key = f"rate_limit:{user_id}"
    min_timestamp = now - (window_secs * 1000)
    
    # Run Redis commands
    pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, min_timestamp)
    pipeline.zcard(key)
    pipeline.zadd(key, {f"{now}-{random.random()}": now})
    pipeline.expire(key, window_secs)
    
    results = pipeline.execute()
    request_count = results[1]
    
    return request_count >= limit
`,
      markdown: `# System Architecture: Distributed Rate Limiter

To scale rate limiting, we choose between:
- **Token Bucket:** Better for bursty traffic.
- **Sliding Window Log:** Most precise, preventing boundaries cheating.
- **Sliding Window Counter:** Low memory usage.
`
    },
    testcases: [
      {
        name: "Test limits",
        input: 'userId: "user_123", limit: 5',
        expected: "false (request allowed)",
        assertion: (codeStr) => {
          if (codeStr.includes("zremrangebyscore") && codeStr.includes("zcard")) return true;
          return false;
        }
      }
    ],
    tabs: {
      description: `### 4. Distributed Rate Limiter

You are tasked with designing and implementing an API **Rate Limiter** middleware for a distributed microservices platform. 

The goal is to allow up to \`limit\` requests within a rolling time frame of \`windowSecs\` per user, blocking requests that exceed this limit.

#### System Requirements:
1. **Precision**: Sliding window approach is preferred to prevent users from flooding the service at boundary crossings (like sending 2x limit requests at \`:59\` and \`:01\` in a Fixed Window).
2. **Distributed Store**: Must use Redis to ensure rate limit counters are shared across all API gateways.
3. **Atomic Operations**: Must avoid race conditions when multiple API instances handle concurrent requests for the same user.

#### Implement:
Complete the sliding window log logic using Redis transactions (\`MULTI/EXEC\`) to clean outdated stamps, check active counts, and add new request identifiers atomically.`,
      followup: `### Follow-up Questions

1. **How do we handle Redis memory exhaustion?**
   Since the Sliding Window Log stores a record for *every single request*, memory usage scales linearly with traffic: $\\mathcal{O}(\\text{requests})$. How does the **Sliding Window Counter** algorithm optimize memory by storing only integer counters across segment intervals?

2. **API Gateways Fallbacks:**
   If the global Redis cluster experiences a outage, should the rate limiter fail-closed (block all traffic) or fail-open (allow traffic to proceed without limits)? List the trade-offs in customer experience vs server crash risk.`,
      editorial: `### Editorial: Distributed Rate Limiting

There are four primary algorithms for rate limiting:
1. **Token Bucket**: Increments tokens at a constant fill rate. Requests consume tokens. Great for handling sudden bursts.
2. **Leaky Bucket**: Requests enter a queue and leak out at a constant processing rate. Smoothes out traffic spikes.
3. **Fixed Window Counter**: Divides time into fixed buckets (e.g. 1 minute intervals). Simple, but prone to burst exploits at window boundaries.
4. **Sliding Window Log**: Keeps a sorted set (\`ZSET\`) of timestamps for each user. Evicts stamps older than current window, then counts the set size. Most accurate but uses significant memory.

#### Sliding Window Log with Redis:
For each user, we use a Redis \`ZSET\` where both the score and value represent timestamps.
- Remove elements older than \`now - window\`: \`ZREMRANGEBYSCORE key 0 (now - window)\`
- Fetch size of set: \`ZCARD key\`
- Add current timestamp: \`ZADD key now random_unique_string\`
- Set key expiration to prevent orphan memory: \`EXPIRE key window\`
We wrap these in a Redis transaction to ensure atomic execution.`,
      solution: `### Solutions

#### JavaScript:
\`\`\`javascript
async function isRateLimited(redis, userId, limit = 100, windowSecs = 60) {
    const now = Date.now();
    const key = \`rate_limit:\${userId}\`;
    const minTimestamp = now - (windowSecs * 1000);
    
    const tx = redis.multi();
    tx.zremrangebyscore(key, 0, minTimestamp);
    tx.zcard(key);
    tx.zadd(key, now, \`\${now}-\${Math.random()}\`);
    tx.expire(key, windowSecs);
    
    const results = await tx.exec();
    const requestCount = results[1];
    
    return requestCount >= limit;
}
\`\`\``,
      evaluation: `### Evaluation Rubric

Your implementation is checked for:
1. **Atomic Transactions**: Using Redis \`multi()\` or Lua scripts to ensure updates are atomic and prevent race conditions.
2. **Correct Timestamp Range Eviction**: Evicting timestamps older than the sliding window boundary.
3. **Key Expiry Configuration**: Setting expiry on Redis keys so inactive users are auto-evicted from Redis cache.`
    }
  }
];
