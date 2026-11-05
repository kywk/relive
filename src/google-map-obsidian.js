// Obsidian plugins cannot execute a remotely downloaded Google Maps runtime.
// This adapter is substituted at build time; browser packages keep google-map.js.
export const googleMapsSupported = false;
export async function loadGoogleMaps() {
  throw new Error('Obsidian 版不支援需要遠端程式的 Google 3D，請改用 MapLibre 3D 或 2D；Google 3D 僅提供於網站版。');
}
export function createGoogleMap() { throw new Error('Google 3D is unavailable in Obsidian.'); }
