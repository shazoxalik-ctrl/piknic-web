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
  const amoToken = process.env.AMO_ACCESS_TOKEN;
  const amoSubdomain = 'piknikuz';

  const text =
    `🛒 Yangi buyurtma!\n\n` +
    `📦 Mahsulot: ${productUz} / ${productRu}\n` +
    `💰 Narx: ${price}\n` +
    `👤 Ism: ${name}\n` +
    `📞 Telefon: ${phone}\n` +
    `🌐 Til: ${lang}`;

  // Telegram
  const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const tgData = await tgRes.json();
  if (!tgData.ok) return res.status(500).json({ error: 'Telegram error' });

  // AMO CRM — unsorted/forms (web form endpoint)
  if (amoToken) {
    try {
      const amoRes = await fetch(`https://${amoSubdomain}.amocrm.ru/api/v4/leads/unsorted/forms`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${amoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          source_name: 'Piknic sayt',
          source_uid: `order_${Date.now()}`,
          metadata: { form_name: productUz, form_id: 1, form_page: 'https://piknic-landing.vercel.app', form_sent_at: Math.floor(Date.now() / 1000) },
          _embedded: {
            leads: [{
              name: `${productUz} — ${price}`,
              price: parseInt((price || '').replace(/\D/g, '')) || 0,
            }],
            contacts: [{
              name,
              custom_fields_values: [{ field_code: 'PHONE', values: [{ value: phone, enum_code: 'WORK' }] }],
            }],
          },
        }]),
      });
      const amoData = await amoRes.json();
      amoDebug = { status: amoRes.status, body: amoData };
    } catch (e) { /* AMO error doesn't block response */ }
  }

  return res.status(200).json({ success: true });
}
