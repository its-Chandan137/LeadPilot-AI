import { config } from 'dotenv';
import crypto from 'node:crypto';
config({ path: 'C:\\Users\\Vedhas\\Desktop\\Projects\\LP 2\\LeadPilot-AI\\apps\\agent\\.env' });
const url = process.env.LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://');
const key = process.env.LIVEKIT_API_KEY;
const secret = process.env.LIVEKIT_API_SECRET;
function sign(claims) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function auth(video, room) { return `Bearer ${sign({ iss: key, sub: 'debug', nbf: Math.floor(Date.now()/1000)-5, exp: Math.floor(Date.now()/1000)+120, video, room })}`; }
async function listRooms() {
  const res = await fetch(`${url}/twirp/livekit.RoomService/ListRooms`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth({ roomList: true }) }, body: '{}' });
  return (await res.json()).rooms || [];
}
async function roomDetails(name) {
  const res = await fetch(`${url}/twirp/livekit.RoomService/ListParticipants`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: auth({ roomAdmin: true }, name) }, body: JSON.stringify({ room: name }) });
  return { participants: (await res.json()).participants || [] };
}
let printed = false;
for (let i = 0; i < 40; i++) {
  try {
    const rooms = await listRooms();
    if (rooms.length) {
      for (const r of rooms) {
        const d = await roomDetails(r.name);
        const parts = (d.participants || []).map(p => ({
          identity: p.identity,
          tracks: (p.tracks || []).map(t => ({ sid: t.sid, type: t.type, source: t.source, muted: t.muted, layers: (t.layers||[]).map(l=>({quality:l.quality, bitrate:l.bitrate, ssrc:l.ssrc})), mid: t.mid }))
        }));
        console.log('ROOM', r.name, 'STATE', JSON.stringify(parts));
      }
      printed = true;
    }
  } catch (e) { console.log('ERR', e.message); }
  await new Promise(r => setTimeout(r, 2000));
}
if (!printed) console.log('NO ROOMS OBSERVED');
process.exit(0);
