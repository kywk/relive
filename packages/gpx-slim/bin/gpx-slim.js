#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, parse, join } from 'node:path';
import { parseArgs } from 'node:util';
import { compressGpx, parseGpx, PRESETS } from '../src/index.js';

const help = `gpx-slim <input.gpx> [options]
  -p, --preset gentle|balanced|aggressive   Default: balanced
  -r, --reduction <0..100>                 Target percentage of track points removed
  -o, --output <path>                      Default: input.slim.gpx (must not exist)
      --analyze                           Compare all presets without writing GPX
      --dry-run                           Report selected settings without writing
      --strip-extensions                  Remove all GPX extensions (including sensors)
      --json                              Print machine-readable report
  -h, --help                              Show help
Input must be UTF-8. Output never overwrites an existing file. Routes/waypoints retained.
`;
async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    preset: { type: 'string', short: 'p' }, reduction: { type: 'string', short: 'r' },
    output: { type: 'string', short: 'o' }, analyze: { type: 'boolean' },
    'dry-run': { type: 'boolean' }, 'strip-extensions': { type: 'boolean' },
    json: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) { console.log(help); return; }
  if (positionals.length !== 1) throw new Error('Provide one input GPX file. See --help.');
  if (values.analyze && (values.preset !== undefined || values.reduction !== undefined || values.output !== undefined)) throw new Error('--analyze compares presets; do not combine with --preset, --reduction or --output.');
  if (values['dry-run'] && values.output) throw new Error('--dry-run cannot be combined with --output.');
  const input = resolve(positionals[0]);
  const buffer = await readFile(input);
  const xml = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
  const parsed = parseGpx(xml);
  const options = { preset: values.preset, stripExtensions: values['strip-extensions'] };
  if (values.reduction !== undefined) {
    if (!values.reduction.trim()) throw new Error('--reduction requires a number.');
    options.targetReduction = Number(values.reduction);
  }
  const results = values.analyze ? Object.keys(PRESETS).map(preset => compressGpx(parsed, { ...options, preset })) : [compressGpx(parsed, options)];
  let output;
  if (!values.analyze && !values['dry-run']) {
    const path = parse(input);
    output = resolve(values.output ?? join(path.dir, `${path.name}.slim.gpx`));
    if (output === input) throw new Error('Output must differ from input.');
    // The exclusive write also rejects symlinks and hardlinks, including dangling links.
    await writeFile(output, results[0].xml, { flag: 'wx' });
  }
  const reports = results.map(r => ({ input, ...(output ? { output } : {}), ...r.report }));
  if (values.json) console.log(JSON.stringify(values.analyze ? reports : reports[0], null, 2));
  else {
    for (const r of reports) {
      console.log(`${r.preset}: ${r.inputPoints} → ${r.outputPoints} points (-${r.pointReductionPercent.toFixed(1)}%); ${r.inputBytes} → ${r.outputBytes} bytes (-${r.byteReductionPercent.toFixed(1)}%)`);
      console.log(`  Stops: ${r.stops}; stopped: ${r.stopSeconds.toFixed(0)}s; distance change: ${r.distanceChangePercent.toFixed(2)}%`);
      for (const warning of r.warnings) console.log(`  Warning: ${warning}`);
    }
    if (output) console.log(`Saved: ${output}`);
  }
}
main().catch(error => { console.error(`gpx-slim: ${error.message}`); process.exitCode = 1; });
