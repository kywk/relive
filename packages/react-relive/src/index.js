'use client';

import {createElement, useEffect, useRef, useState} from 'react';
export {parseGpx, makeTrack, matchPhoto, parseBlock} from '@kywk/relive';

/** A resolved journey is immutable input; replacing it restarts playback. */
export function Relive({journey, googleMapsApiKey, className, style, onReady, onError}) {
  const host = useRef(null);
  const callbacks = useRef({onReady, onError});
  const [error, setError] = useState(null);
  useEffect(() => { callbacks.current = {onReady, onError}; }, [onReady, onError]);
  useEffect(() => {
    let disposed = false;
    let destroy;
    setError(null);
    // Leaflet touches window at module initialization: never import the player on the server.
    import('@kywk/relive/player').then(({mountPlayer}) => {
      if (disposed) return;
      destroy = mountPlayer(host.current, {...journey, events: journey.events ?? []}, {googleMapsApiKey});
      callbacks.current.onReady?.();
    }).catch(cause => {
      if (disposed) return;
      const failure = cause instanceof Error ? cause : new Error(String(cause));
      setError(failure);
      callbacks.current.onError?.(failure);
    });
    return () => { disposed = true; destroy?.(); };
  }, [journey, googleMapsApiKey]);
  // React owns the wrapper/error; the imperative player owns only its empty child.
  return createElement('div', {className, style},
    createElement('div', {ref: host}),
    error ? createElement('p', {role: 'alert'}, error.message) : null);
}
