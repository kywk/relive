import workerSource from './maplibre-worker-source.js';

let workerUrl;
const configured=new WeakSet();

export function configureMapLibreWorker(api){
  if(configured.has(api))return;
  // The Blob contains only the bundled dependency, never downloaded code.
  // Keep it for the page lifetime because MapLibre may create workers later.
  workerUrl??=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));
  api.setWorkerUrl(workerUrl);
  configured.add(api);
}
