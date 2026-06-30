export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const amoToken = process.env.AMO_ACCESS_TOKEN;
  if (!amoToken) return res.status(200).json({ error: 'no token' });

  try {
    const r = await fetch('https://piknikuz.amocrm.ru/api/v4/contacts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${amoToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ name: 'Vercel Test', custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '998901234567', enum_code: 'WORK' }] }] }]),
    });
    const data = await r.json();
    return res.status(200).json({ httpStatus: r.status, data });
  } catch (e) {
    return res.status(200).json({ error: e.message });
  }
}
