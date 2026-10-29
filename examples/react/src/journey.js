import {makeTrack, matchPhoto} from '@kywk/react-relive';

// Synthetic public fixture: no Vault, file-system adapter, or Docusaurus runtime.
const start = Date.parse('2026-10-29T09:00:00+09:00');
const track = makeTrack([Array.from({length: 61}, (_, i) => ({
  lat: 35.0034 + i * 0.00011,
  lon: 135.7717 + Math.sin(i / 12) * 0.0002,
  time: start + i * 10000,
}))]);
const postcard = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><rect width="640" height="420" fill="#e7f0df"/><path d="M180 0 Q400 140 260 420" fill="none" stroke="#4b9ca7" stroke-width="120"/><circle cx="430" cy="90" r="45" fill="#ecc069"/><text x="28" y="380" font-size="24" font-family="sans-serif" fill="#163d40">Relive · synthetic demo</text></svg>');
export const journey = {
  title: '京都鴨川 · React 示範路線',
  duration: 20,
  stopDuration: 2,
  timezoneOffset: '+09:00',
  renderer: 'leaflet',
  track,
  photos: [matchPhoto({url: postcard, caption: '河岸一刻（合成插圖）', timestamp: start + 300000}, track)],
  events: [],
  warnings: [],
};
