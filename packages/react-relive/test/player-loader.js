export function resolve(specifier, context, nextResolve) {
  if (specifier === '@kywk/relive/player') return {url: new URL('./player-double.js', import.meta.url).href, shortCircuit: true};
  return nextResolve(specifier, context);
}
