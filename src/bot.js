import fs from "node:fs";
import { askClaude } from "./ai.js";
import { token } from "./clients.js";
import { sendPageMessage, sendWhatsApp } from "./meta.js";

const convos = new Map(); // key -> {history, pausedUntil, hits[], last}
const queues = new Map(); // key -> promise chain (one message at a time per sender)
const seen = new Map(); // message id -> time (dedupe Meta retries)
const HOUR = 3600e3, MAX_PER_HOUR = 30, PAUSE_MS = 12 * HOUR, MAX_TURNS = 12;
const FALLBACK = "Merci d'écrire votre question en texte 🙏 / ba3thli suel mte3ek ktiba men fadhlek 🙏 / يرجى كتابة سؤالك نصيًا";

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of convos) if (now - v.last > 24 * HOUR) convos.delete(k);
  for (const [k, t] of seen) if (now - t > HOUR) seen.delete(k);
}, 10 * 60e3).unref();

function log(client, rec) {
  try {
    fs.mkdirSync("logs", { recursive: true });
    fs.appendFileSync(`logs/${client.id}.jsonl`, JSON.stringify({ t: new Date().toISOString(), ...rec }) + "\n");
  } catch (e) { console.error("log failed", e.message); }
}

async function deliver(client, channel, sender, text) {
  if (channel === "whatsapp")
    return sendWhatsApp(client.channels.whatsapp.phoneNumberId, token(client, "whatsapp"), sender, text);
  return sendPageMessage(client.channels.facebook.pageId, token(client, channel), sender, text);
}

// msg = { client, channel, sender, id, text }  (text === null for non-text messages)
export function handleIncoming(msg) {
  if (msg.id) {
    if (seen.has(msg.id)) return;
    seen.set(msg.id, Date.now());
  }
  const key = `${msg.client.id}:${msg.channel}:${msg.sender}`;
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(() => process_(msg, key)).catch((e) => console.error(`[${key}]`, e.message));
  queues.set(key, next);
  next.finally(() => queues.get(key) === next && queues.delete(key));
}

async function process_(msg, key) {
  const { client, channel, sender } = msg;
  const now = Date.now();
  const c = convos.get(key) || { history: [], pausedUntil: 0, hits: [], last: now };
  convos.set(key, c);
  c.last = now;

  if (c.pausedUntil > now) { log(client, { channel, sender, in: msg.text, skipped: "human-handoff" }); return; }
  c.hits = c.hits.filter((t) => now - t < HOUR);
  if (c.hits.length >= MAX_PER_HOUR) { log(client, { channel, sender, skipped: "rate-limit" }); return; }
  c.hits.push(now);

  let out, handoff = false;
  if (msg.text === null) out = FALLBACK;
  else {
    c.history.push({ role: "user", content: msg.text.slice(0, 1000) });
    c.history = c.history.slice(-MAX_TURNS);
    while (c.history.length && c.history[0].role !== "user") c.history.shift();
    try {
      out = await askClaude(client, c.history);
    } catch (e) {
      c.history.pop();
      throw e;
    }
    if (out.includes("[[HANDOFF]]")) { handoff = true; out = out.replace(/\s*\[\[HANDOFF\]\]\s*/g, "").trim(); c.pausedUntil = now + PAUSE_MS; }
    c.history.push({ role: "assistant", content: out });
  }

  const mode = client.mode || "auto"; // "log_only" = shadow mode: nothing is sent
  log(client, { channel, sender, in: msg.text, out, mode, handoff });
  if (mode === "auto" && out) await deliver(client, channel, sender, out);
}
