# Chatbot Server: Facebook, Instagram and WhatsApp (Arabic, French, Tunisian darija)

One server for all your customers. A customer = one file in `clients/`.

## 1. Run it on your computer (test without Meta)

```bash
npm install
cp .env.example .env        # then fill ANTHROPIC_API_KEY
export $(grep -v '^#' .env | xargs)   # or set the variables your own way
npm run chat -- clients/example.json  # chat with the bot in the terminal
```

Test darija (Latin and Arabic script), French, Arabic, a complaint, a price that is not in the store info.

## 2. Add a customer

1. In Chatbot Studio, fill the customer profile, test it, then copy the JSON from tab 3.
2. Save it as `clients/<customer>.json`.
3. Add the `channels` block (see `clients/example.json`):
   - `facebook.pageId`, `instagram.accountId`, `whatsapp.phoneNumberId`
   - `tokenEnv` = the NAME of an environment variable that holds the token (never put the token itself in the file).
4. Add the tokens as environment variables, for example `ACME_PAGE_TOKEN` and `ACME_WA_TOKEN`.
5. Restart the server (customers are loaded at startup).

Useful fields: `"mode": "log_only"` (the bot writes answers to `logs/` but sends nothing), `"mode": "auto"` (it replies), `"active": false` (switch the customer off), `"enabled": false` on one channel.

## 3. Deploy

Any host that runs Node 18+ 24/7 works (Railway, Render, Fly.io, a VPS). Start command: `npm start`.
Set the variables from `.env.example` in the host's settings. You need a public HTTPS URL, for example `https://your-app.up.railway.app`.
Check `https://your-url/health` shows `ok`.

Note: conversation memory is kept in the server's memory. A restart forgets ongoing conversations (the bot still works). `logs/*.jsonl` need a persistent volume if you want to keep them across deploys.

## 4. Meta setup (once for you, then per customer)

Menus change often, so follow Meta's current docs for each step: developers.facebook.com.

Once:
1. Create a Meta developer app (Business type). Add the products Messenger, Instagram and WhatsApp.
2. Webhook callback URL: `https://your-url/webhook`. Verify token: the value of `META_VERIFY_TOKEN`.
3. Put the app secret in `META_APP_SECRET`. The server rejects any request whose signature does not match.
4. Subscribe webhook fields: Page `messages`, Instagram `messages`, WhatsApp `messages`.
5. Permissions needed for real customers (need Meta app review and business verification): `pages_messaging`, `instagram_basic`, `instagram_manage_messages`, `whatsapp_business_messaging`, `whatsapp_business_management`.

Per customer:
1. They add you (or your Business) as partner/admin in their Meta Business Manager. Never ask for passwords.
2. Link their Instagram professional account to their Facebook Page.
3. Generate a long-lived Page token and a WhatsApp token (a system user token is best). Save them as environment variables.
4. Copy the Page id, Instagram account id and WhatsApp phone number id into the customer file.
5. Subscribe the customer's Page to your app, and add the customer's WhatsApp number to the WhatsApp product.

While the app is in development mode, only people with a role on the app can message the bot. That is fine for your own tests.

## 5. Go live safely

1. `mode: "log_only"` for a few days: read `logs/<customer>.jsonl`, fix the store info.
2. Switch to `mode: "auto"`, one channel at a time (Facebook/Instagram first, WhatsApp second).
3. Check the logs every week for the first month.

## How it behaves

- Replies in the customer's language. Darija follows the customer's `script` setting (`franco`, `arabic`, `match`).
- Uses only the store info. Unknown things are passed to the team.
- If the customer asks for a human or is upset, the bot adds a hand-off and then stays silent in that conversation for 12 hours so the owner can answer from the Page inbox / WhatsApp.
- Ignores echoes of your own messages, duplicate webhook retries, and more than 30 messages per hour from one person.
- Non-text messages get a polite "please write your question".

## Costs and safety

- Model: `claude-haiku-5-5` by default (cheap, fast). Change with `MODEL`. Replies are capped at 400 tokens.
- Set a monthly spend limit in the Anthropic console.
- WhatsApp: Meta may charge for bot replies. Check the current rate card and pass it to the customer at cost.
- Logs contain customers' messages: tell your customers, and delete old logs.
- Never commit `.env`. Keep tokens only in environment variables.

## Honest limits

This code was syntax-checked but not yet run against live Meta accounts. Test it with your own page and number first. Order status, stock and payments are not connected: the bot hands those to a person.
