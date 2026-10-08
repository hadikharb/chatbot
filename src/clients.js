import fs from "node:fs";
import path from "node:path";

const dir = path.resolve("clients");
export const byPage = new Map(); // Facebook Page id -> client
export const byIg = new Map(); // Instagram account id -> client
export const byWa = new Map(); // WhatsApp phone_number_id -> client

export function loadClients() {
  byPage.clear(); byIg.clear(); byWa.clear();
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json") || f.startsWith("_")) continue;
    const c = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    c.id = f.replace(/\.json$/, "");
    if (c.active === false) continue;
    const ch = c.channels || {};
    if (ch.facebook?.pageId) byPage.set(String(ch.facebook.pageId), c);
    if (ch.instagram?.accountId) byIg.set(String(ch.instagram.accountId), c);
    if (ch.whatsapp?.phoneNumberId) byWa.set(String(ch.whatsapp.phoneNumberId), c);
    n++;
  }
  console.log(`Loaded ${n} customer(s).`);
}

export function token(client, channel) {
  const ch = client.channels?.[channel === "instagram" ? "facebook" : channel];
  const t = ch?.tokenEnv && process.env[ch.tokenEnv];
  if (!t) throw new Error(`Missing token env for ${client.id}/${channel} (${ch?.tokenEnv})`);
  return t;
}
