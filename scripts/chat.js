// Test a customer profile in the terminal, without Meta:  npm run chat -- clients/example.json
import fs from "node:fs";
import readline from "node:readline/promises";
import { askClaude } from "../src/ai.js";

const file = process.argv[2];
if (!file) { console.error("Usage: npm run chat -- clients/<customer>.json"); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error("Set ANTHROPIC_API_KEY first."); process.exit(1); }
const client = JSON.parse(fs.readFileSync(file, "utf8"));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const history = [];
console.log(client.greet || "Hello", "\n(Ctrl+C to quit)\n");
while (true) {
  const q = (await rl.question("You: ")).trim();
  if (!q) continue;
  history.push({ role: "user", content: q });
  try {
    const a = await askClaude(client, history);
    history.push({ role: "assistant", content: a });
    console.log("Bot:", a.replace("[[HANDOFF]]", "(handoff to human)"), "\n");
  } catch (e) { history.pop(); console.error(e.message); }
}
