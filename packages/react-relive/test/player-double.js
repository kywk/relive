export function mountPlayer(host, journey, options) {
  const state = globalThis.__reliveTest;
  if (journey.title === 'fail') throw new Error('mount failed');
  state.mounts.push({journey, options});
  host.textContent = journey.title;
  state.active++;
  return () => { state.active--; state.cleanups++; host.replaceChildren(); };
}
