const G = () => `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v23.0"}`;

async function post(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Meta ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

// Facebook Messenger and Instagram DMs both go through the Page.
export const sendPageMessage = (pageId, token, recipientId, text) =>
  post(`${G()}/${pageId}/messages`, token, {
    recipient: { id: recipientId },
    messaging_type: "RESPONSE",
    message: { text: text.slice(0, 1900) },
  });

export const sendWhatsApp = (phoneNumberId, token, to, text) =>
  post(`${G()}/${phoneNumberId}/messages`, token, {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text.slice(0, 4000) },
  });
