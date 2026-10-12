import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const forbidden = ["GEMINI_API_KEY", "GEMINI_LIVE_MODEL"];
async function inspect(path) {
  let count = 0;
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) count += await inspect(file);
    else if (/\.(js|json|map|html)$/.test(entry.name)) {
      const content = await readFile(file, "utf8");
      if (forbidden.some((name) => content.includes(name))) throw new Error("A forbidden cloud AI variable was found in a client artifact.");
      count++;
    }
  }
  return count;
}
console.log(`Checked ${await inspect(".next/static")} client artifacts: forbidden cloud AI variables absent.`);
