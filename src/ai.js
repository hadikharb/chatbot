import { systemPrompt } from "./prompt.js";

export async function askClaude(client, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MODEL || "claude-haiku-5-5",
      max_tokens: 400,
      system: systemPrompt(client),
      messages,
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}
