// Vercel Serverless Function for Live Presence
let activeVisitors = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const now = Date.now();

  // Cleanup old sessions (>25s)
  for (const [id, seen] of activeVisitors.entries()) {
    if (now - seen > 25000) {
      activeVisitors.delete(id);
    }
  }

  if (req.method === 'POST') {
    const id = req.body?.id;
    if (id) {
      activeVisitors.set(String(id), now);
    }
  }

  const count = Math.max(1, activeVisitors.size);
  return res.status(200).json({ count });
}
