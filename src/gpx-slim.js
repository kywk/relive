// Website build only. Share the CLI algorithm without executing a subprocess.
import {compressGpx, PRESETS} from '../packages/gpx-slim/src/index.js';

export function gpxSlimOptions(value) {
  if (value === undefined || value === false) return null;
  if (value === true) return {preset: 'balanced'};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('gpxSlim must be false, true, or an options object');
  for (const key of Object.keys(value)) {
    if (!['preset', 'targetReduction'].includes(key)) throw new Error(`Unknown gpxSlim option: ${key}`);
  }
  const preset = value.preset ?? 'balanced';
  if (!Object.hasOwn(PRESETS, preset)) throw new Error('gpxSlim.preset must be gentle, balanced, or aggressive');
  const targetReduction = value.targetReduction;
  if (targetReduction !== undefined && (typeof targetReduction !== 'number' || !Number.isFinite(targetReduction) || targetReduction < 0 || targetReduction > 100)) throw new Error('gpxSlim.targetReduction must be a number from 0 to 100');
  return {preset, ...(targetReduction === undefined ? {} : {targetReduction})};
}

export function slimGpx(xml, options, file, source) {
  if (!options) return xml;
  const {xml: slimmed, report} = compressGpx(xml, options);
  file.data ??= {};
  file.data.reliveGpxSlim ??= [];
  file.data.reliveGpxSlim.push({source, ...report});
  console.info(`[relive:gpx-slim] ${file.path ?? 'Markdown'} (${source}): ${report.inputPoints} → ${report.outputPoints} points (-${report.pointReductionPercent.toFixed(1)}%); ${report.inputBytes} → ${report.outputBytes} bytes (-${report.byteReductionPercent.toFixed(1)}%)${report.warnings.length ? '; ' + report.warnings.join('; ') : ''}`);
  return slimmed;
}
