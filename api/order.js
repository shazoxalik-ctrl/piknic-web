export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, phone, productUz, productRu, price, lang } = req.body;

  if (!name || !phone || !productUz) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const token = process.env.TG_TOKEN;
  const chatId = process.env.TG_CHAT_ID;

  const text =
    `🛒 Yangi buyurtma!\n\n` +
    `📦 Mahsulot: ${productUz} / ${productRu}\n` +
    `💰 Narx: ${price}\n` +
    `👤 Ism: ${name}\n` +
    `📞 Telefon: ${phone}\n` +
    `🌐 Til: ${lang}`;

  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data = await tgRes.json();
  if (data.ok) return res.status(200).json({ success: true });
  return res.status(500).json({ error: 'Telegram error' });
}
