import {register} from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement, StrictMode, act} from 'react';
import {renderToString} from 'react-dom/server';
import {JSDOM} from 'jsdom';
register('./player-loader.js', import.meta.url);
const {Relive} = await import('../src/index.js');
const journey = {title:'first', track:{points:[], meters:0, timed:false, elapsed:null}, photos:[], warnings:[], duration:60};

test('SSR import/render never evaluates the browser player', () => {
  assert.equal(globalThis.window, undefined);
  assert.equal(renderToString(createElement(Relive, {journey})), '<div><div></div></div>');
});

test('React StrictMode, prop replacement, callback updates, errors and unmount', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const {createRoot} = await import('react-dom/client');
  const state = globalThis.__reliveTest = {mounts:[], active:0, cleanups:0};
  const root = createRoot(document.getElementById('root'));
  const flush = () => new Promise(resolve => setTimeout(resolve, 20));
  let ready = 0;
  await act(async () => {root.render(createElement(StrictMode, null, createElement(Relive, {journey, onReady:()=>ready++}))); await flush();});
  await act(flush);
  assert.equal(state.active, 1);
  assert.equal(ready, 1);
  assert.equal(document.getElementById('root').textContent, 'first');
  const mounts = state.mounts.length;
  await act(async () => {root.render(createElement(StrictMode, null, createElement(Relive, {journey, onReady:()=>ready+=10})));});
  assert.equal(state.mounts.length, mounts, 'callbacks must not reset playback');
  await act(async () => {root.render(createElement(StrictMode, null, createElement(Relive, {journey:{...journey,title:'second'}, googleMapsApiKey:'public-key',onReady:()=>ready+=10}))); await flush();});
  await act(flush);
  assert.equal(state.active, 1);
  assert.equal(state.cleanups, 1);
  assert.equal(state.mounts.at(-1).options.googleMapsApiKey, 'public-key');
  assert.equal(ready, 11);
  let error;
  await act(async () => {root.render(createElement(Relive, {journey:{...journey,title:'fail'},onError:e=>error=e})); await flush();});
  await act(flush);
  assert.equal(error.message, 'mount failed');
  assert.equal(document.querySelector('[role="alert"]').textContent, 'mount failed');
  await act(async () => root.unmount());
  assert.equal(state.active, 0);
  // Effects scheduled for a removed component must never initialize a late player.
  const secondRoot = createRoot(document.getElementById('root'));
  await act(async () => {secondRoot.render(createElement(Relive, {journey}));});
  await act(async () => secondRoot.unmount());
  await act(flush);
  assert.equal(state.active, 0);
  dom.window.close();
  delete globalThis.window; delete globalThis.document;
});
