import { config } from 'dotenv';
import crypto from 'node:crypto';
import { Room, AudioSource, AudioFrame, LocalAudioTrack, TrackPublishOptions, TrackSource } from '@livekit/rtc-node';
config({ path: 'C:\\Users\\Vedhas\\Desktop\\Projects\\LP 2\\LeadPilot-AI\\apps\\agent\\.env' });
const url = process.env.LIVEKIT_URL;
const key = process.env.LIVEKIT_API_KEY;
const secret = process.env.LIVEKIT_API_SECRET;
function sign(claims) { const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'); const b = Buffer.from(JSON.stringify(claims)).toString('base64url'); return `${h}.${b}.${crypto.createHmac('sha256', secret).update(`${h}.${b}`).digest('base64url')}`; }
const roomName = 'min-test-' + Date.now();
const token = sign({ iss: key, sub: 'minpub', nbf: Math.floor(Date.now()/1000)-5, exp: Math.floor(Date.now()/1000)+600, video: { roomJoin: true, room: roomName, canPublish: true, canSubscribe: true } });

const SR = 16000;
const source = new AudioSource(SR, 1);
const track = LocalAudioTrack.createAudioTrack('min-audio', source);
const opts = new TrackPublishOptions();
opts.source = TrackSource.SOURCE_MICROPHONE;
opts.dtx = false;
opts.red = false;

const room = new Room();
await room.connect(url, token, { autoSubscribe: true });
console.log('MIN connected', room.name);
const pub = await room.localParticipant.publishTrack(track, opts);
console.log('MIN published', pub?.sid ?? JSON.stringify(pub)?.slice(0,80));
console.log('MIN trackState', { sid: track.sid, muted: track.muted, streamState: track.streamState, hasStart: typeof track.start, kind: track.kind });
try { await track.start?.(); console.log('MIN track.start() called'); } catch (e) { console.log('MIN startErr', e.message); }

// sine wave 440Hz for ~1s, 100ms frames
let total = 0;
for (let i = 0; i < 10; i++) {
  const n = SR / 10; // 100ms
  const buf = new Int16Array(n);
  for (let j = 0; j < n; j++) { buf[j] = Math.round(3000 * Math.sin(2 * Math.PI * 440 * (total + j) / SR)); }
  await source.captureFrame(new AudioFrame(buf, SR, 1, n));
  total += n;
  await new Promise(r => setTimeout(r, 100));
}
await new Promise(r => setTimeout(r, 1500));
// check stats
const pubs = Array.from(room.localParticipant.trackPublications.values());
for (const p of pubs) {
  try { const s = await p.track?.getStats?.();
    let bytes = 0, packets = 0;
    for (const r of (s?.as?.(undefined) ?? s ?? [])) { if (r.type === 'outbound-rtp' || r.kind === 'audio') { bytes = r.bytesSent ?? r.bytes; packets = r.packetsSent ?? r.packets; } }
    console.log('MIN outbound-rtp', { sid: p.trackSid, bytes, packets });
  } catch (e) { console.log('MIN statErr', e.message); }
}
await room.disconnect();
process.exit(0);
