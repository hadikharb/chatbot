import express from "express";
import crypto from "node:crypto";
import { loadClients, byPage, byIg, byWa } from "./clients.js";
import { handleIncoming } from "./bot.js";

loadClients();
const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.raw = buf; } }));

app.get("/health", (_req, res) => res.send("ok"));

// Meta webhook verification
app.get("/webhook", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === process.env.META_VERIFY_TOKEN)
    return res.status(200).send(req.query["hub.challenge"]);
  res.sendStatus(403);
});

function validSignature(req) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return process.env.ALLOW_UNSIGNED === "1";
  const sig = req.get("x-hub-signature-256") || "";
  const exp = "sha256=" + crypto.createHmac("sha256", secret).update(req.raw || "").digest("hex");
  return sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
}

app.post("/webhook", (req, res) => {
  if (!validSignature(req)) return res.sendStatus(401);
  res.sendStatus(200); // answer Meta immediately, work in background
  try {
    const body = req.body || {};
    for (const entry of body.entry || []) {
      if (body.object === "page" || body.object === "instagram") {
        const channel = body.object === "page" ? "facebook" : "instagram";
        const client = (channel === "facebook" ? byPage : byIg).get(String(entry.id));
        if (!client) { console.warn(`No customer for ${channel} id ${entry.id}`); continue; }
        if (client.channels?.[channel]?.enabled === false) continue;
        for (const ev of entry.messaging || []) {
          const m = ev.message;
          if (!m || m.is_echo) continue;
          handleIncoming({ client, channel, sender: ev.sender.id, id: m.mid, text: m.text ?? null });
        }
      } else if (body.object === "whatsapp_business_account") {
        for (const ch of entry.changes || []) {
          const v = ch.value || {};
          const client = byWa.get(String(v.metadata?.phone_number_id));
          if (!client) { console.warn(`No customer for WhatsApp number ${v.metadata?.phone_number_id}`); continue; }
          if (client.channels?.whatsapp?.enabled === false) continue;
          for (const m of v.messages || [])
            handleIncoming({ client, channel: "whatsapp", sender: m.from, id: m.id, text: m.type === "text" ? m.text.body : null });
        }
      }
    }
  } catch (e) { console.error("webhook error", e); }
});

app.listen(process.env.PORT || 3000, () => console.log("Bot server running"));
