import {createElement} from 'react';
import {Relive, parseGpx, makeTrack, matchPhoto, parseBlock, type Journey} from '../src/index.js';
const track = makeTrack(parseGpx('<gpx/>'));
const photo = matchPhoto({src:'photo.jpg', url:'/photo.jpg', lat:25, lon:121}, track);
const journey: Journey = {title:'Typed journey', track, photos:[photo], warnings:[], duration:60};
createElement(Relive, {journey, onError(error) {console.error(error.message);}, onReady() {}, style:{width:'100%'}});
parseBlock('raw: <gpx/>').photos.map(p => p.src);
// @ts-expect-error Renderer spelling is a public API contract.
createElement(Relive, {journey:{...journey, renderer:'unknown'}});
