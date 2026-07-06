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

  // AMO CRM — to'g'ridan "yangi lead" bo'limiga
  let amoErr, amoC, amoL;
  if (amoToken) {
    try {
      const contactRes = await fetch(`https://${amoSubdomain}.amocrm.ru/api/v4/contacts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${amoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          name,
          custom_fields_values: [{ field_code: 'PHONE', values: [{ value: phone, enum_code: 'WORK' }] }],
        }]),
      });
      const contactData = await contactRes.json();
      const contactId = contactData?._embedded?.contacts?.[0]?.id;
      amoC = { status: contactRes.status, contactId, err: contactData?.detail };

      const leadBody = [{
        name: `${productUz} — ${price}`,
        price: parseInt((price || '').replace(/\D/g, '')) || 0,
        pipeline_id: 10695834,
        status_id: 84285386,
      }];
      if (contactId) leadBody[0]._embedded = { contacts: [{ id: contactId }] };

      const leadRes = await fetch(`https://${amoSubdomain}.amocrm.ru/api/v4/leads`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${amoToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(leadBody),
      });
      const leadData = await leadRes.json();
      const leadId = leadData?._embedded?.leads?.[0]?.id;
      amoL = { status: leadRes.status, leadId, err: leadData?.detail };

      if (leadId) {
        await fetch(`https://${amoSubdomain}.amocrm.ru/api/v4/leads/${leadId}/notes`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${amoToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            note_type: 'common',
            params: { text: `Ism: ${name}\nTelefon: ${phone}\nMahsulot: ${productUz}\nNarx: ${price}\nTil: ${lang}` },
          }]),
        });
      }
    } catch (e) { amoErr = e.message; }
  }

  return res.status(200).json({ success: true, amoErr, amoC, amoL });
}
