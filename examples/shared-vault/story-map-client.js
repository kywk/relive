// Start StoryMap only after Docusaurus hydration. Its package entry starts a
// MutationObserver on import, so importing it eagerly can mutate SSR markup.
export async function onRouteDidUpdate() {
  if (typeof document !== 'undefined' && document.querySelector('[data-story-map-config]')) {
    const {mountStoryMaps} = await import('@story-map/remark-story-map/client');
    mountStoryMaps(document);
  }
}
