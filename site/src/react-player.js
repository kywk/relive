// Separate host imports let Vite share Leaflet CSS with the optional hero.
import 'leaflet/dist/leaflet.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import '@kywk/relive/styles.css';
import sourceJourney from '../generated/journey.json';
import {createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {Relive} from '@kywk/react-relive';
import {locale} from './i18n.js';

const captions = ['Setting off along the river', 'Stopping to watch the birds', 'Egrets in the shallows', 'Stepping stones across the river'];

// Resolve after the lazy player mounts so external photo buttons can seek safely.
export function mountReactPlayer(host) {
  const journey = {...sourceJourney, locale,
    title: locale === 'en' ? 'Kyoto · A walk along the Kamo River' : sourceJourney.title,
    photos: sourceJourney.photos.map((photo, index) => ({...photo,
      caption: locale === 'en' ? captions[index] ?? photo.caption : photo.caption,
      url: import.meta.env.BASE_URL + photo.url})),
  };
  const root = createRoot(host);
  return new Promise((resolve, reject) => {
    let disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      root.unmount();
    };
    // A bfcache entry resumes this same document and its resolved loader promise.
    const onPageHide = event => { if (!event.persisted) dispose(); };
    window.addEventListener('pagehide', onPageHide);
    root.render(createElement(Relive, {
      journey,
      onReady: () => resolve(dispose),
      onError: error => {
        dispose();
        reject(error);
      },
    }));
  });
}
