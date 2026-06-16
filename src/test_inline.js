const processInline = (str) => {
  const backtickParts = str.split(/`([^`]+)`/g);
  return backtickParts.flatMap((part, i) => {
    if (i % 2 === 1) {
      return { type: 'code', content: part };
    }
    const boldParts = part.split(/\*\*([^*]+)\*\*/g);
    return boldParts.map((sub, j) => {
      if (j % 2 === 1) {
        return { type: 'strong', content: sub };
      }
      return sub;
    });
  });
};

const line = "    *   **Input:** `nums = [2,7,11,15], target = 9`";
const trimmed = line.trim();
const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
console.log("isBullet:", isBullet);
const content = trimmed.replace(/^[\*\-]\s+/, "");
console.log("content passed to processInline:", JSON.stringify(content));
console.log("Result:", JSON.stringify(processInline(content), null, 2));
