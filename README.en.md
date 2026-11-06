# Relive — Journey replay for Obsidian, React, and Docusaurus

[繁體中文](README.md) | **English**

## Overview

Relive replays GPX journeys with time- and GPS-matched photos in Obsidian. Add a `relive` Markdown code block to a note, choose a GPX file, and optionally add photos and timeline events. It supports playback, seeking, photo stops, Leaflet 2D maps, and bundled MapLibre 3D terrain. Install `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release in your vault's `.obsidian/plugins/relive/` directory, then enable Relive.

**Network and privacy:** OpenStreetMap provides 2D tiles; OpenFreeMap provides vector maps and buildings; Mapterhorn provides terrain. These services receive map-area requests. Remote GPX or photo URLs authored in a note are fetched from those URLs. Local GPX parsing and photo matching run on your device; Relive does not upload vault contents or collect analytics. The plugin does not load executable code from remote services. Google Maps JavaScript API is available only in the separate website/React integration, requires your own key and billing, and is excluded from the Obsidian build.

Code is MIT licensed. Map and photo attribution remains visible. This is the English guide; the [Traditional Chinese guide](README.md) covers the same features.

Place a `relive` fenced code block in a note to play GPX tracks and display photos with Leaflet. Features include 2D maps, play/pause, seeking, playback speed, camera follow, photo thumbnails, and location hints. MapLibre 3D terrain requires no API key; website and React integrations can optionally use Google photorealistic 3D. Video export is not yet available.

## Official demo and GitHub Pages

[Open the Relive demo](https://kywk.github.io/relive/): real photographs of Kyoto's Kamo River, a playable demonstration route, Markdown examples, and installation instructions. Photos use CC BY 4.0 or CC0; full attribution appears in the website footer. The route and timing are arranged for demonstration.

Run `npm run pages:dev` to preview, or `npm run pages:build` to build into `site/dist`. Pushes to main deploy automatically through `.github/workflows/pages.yml`; pull requests only build. See the [website maintenance guide](site/README.md) (Traditional Chinese). This workflow does not publish to npm or Obsidian Community.

The website offers a Traditional Chinese / English selector and remembers your choice. Share a specific language with `?lang=zh-Hant` or `?lang=en`.

## Standalone React package

`@kywk/react-relive` provides `<Relive journey={journey} />` for Vite, Next.js, or other React hosts, without Docusaurus. It uses the same player for playback, photos/events, and 2D/3D maps. The application supplies React 19.x.

```jsx
import {Relive, makeTrack, parseGpx} from '@kywk/react-relive';
import '@kywk/react-relive/styles.css';

const journey = {
  title: 'Demo walk', duration: 30, stopDuration: 3,
  timezoneOffset: '+08:00', renderer: 'leaflet',
  track: makeTrack(parseGpx(`<gpx version="1.1" creator="demo"><trk><trkseg>
    <trkpt lat="25.05" lon="121.50"><time>2026-10-30T00:00:00Z</time></trkpt>
    <trkpt lat="25.06" lon="121.51"><time>2026-10-30T00:10:00Z</time></trkpt>
  </trkseg></trk></gpx>`)),
  photos: [], events: [], warnings: [],
};

export default function App() {
  return <Relive journey={journey} />;
}
```

The stylesheet entry includes Leaflet, MapLibre, and Relive CSS. The component loads the map only in a browser effect and cleans up the player on unmount. Replacing `journey` with another object rebuilds the player and resets progress, so keep the data in state, `useMemo`, or a module constant. The component receives parsed data; it does not scan a vault, fetch attachments for the application, or parse EXIF.

Set `locale: 'en'` in `journey` for English player controls. Use `locale: 'zh-Hant'`, or omit the field, for Traditional Chinese.

Run `npm run react:demo` for local development and `npm run react:build` to validate the standalone Vite example. Before publishing to npm, use `npm run release:pack` and `npm run react:release:pack` to produce and validate both dependent tarballs. See the [React integration guide](docs/react.md) (Traditional Chinese) for installation, SSR, photo matching, and the data contract. `@kywk/relive@0.2.2` and `@kywk/react-relive@0.1.2` are published and can be installed directly from npm.

## GPX Slim CLI

The independently published GPX slimming tool lives in [`packages/gpx-slim`](./packages/gpx-slim/README.md). It supports removing redundant stationary/low-speed points, three simplification presets, and a target point-removal percentage. It requires Node.js 22+.

```sh
npm --prefix packages/gpx-slim ci
node packages/gpx-slim/bin/gpx-slim.js ride.gpx --analyze
node packages/gpx-slim/bin/gpx-slim.js ride.gpx --preset balanced --reduction 70
npm --prefix packages/gpx-slim test
```

The package has its own `package.json` and lockfile. It can be packed independently in its subdirectory, published to npm, and run through `npx`; building Relive first is unnecessary.

## Development and preview

Requires Node.js 20.19+; the currently validated environment uses Node.js 22.

```sh
npm ci
npm test
npm run build
npm run demo
```

`npm run demo` starts the standalone map preview. `npm run site:build` builds the two-page Docusaurus example; `npm run site:serve` previews it at `/journeys/`. Example tracks and illustrations are synthetic test data.

## Markdown format

````markdown
```relive
title: Riverside morning ride
duration: 60
timezoneOffset: '+08:00'
photos:
  - '[[assets/IMG_001.jpg]]'
  - '![Riverbank](./assets/IMG_002.jpg)'
  - https://example.com/photo.jpg
  - src: ./assets/no-exif.jpg
    time: '2026-10-29T07:05:00+08:00'
    caption: Morning by the river
  - src: ./assets/gps-only.jpg
    lat: 25.057
    lon: 121.507
gpx:
  - ./assets/morning.gpx
```
````

Plain string links, quoted Obsidian `[[wikilink]]` / `![[embed]]` links, and Markdown images/links are supported. Wikilinks in YAML **must be quoted**. `photos` and `gpx` accept lists; `gpx` also accepts a single string. Photo objects use `src` (`url` is also accepted) and may include `time`, `lat`, `lon`, and `caption`.

For inline XML, use a YAML multiline string (`raw: |`) and indent every XML line by two spaces:

````markdown
```relive
title: A short journey
raw: |
  <gpx version="1.1" creator="Relive">
    <trk><trkseg>
      <trkpt lat="25.05" lon="121.50"><time>2026-10-29T00:00:00Z</time></trkpt>
      <trkpt lat="25.06" lon="121.51"><time>2026-10-29T00:10:00Z</time></trkpt>
    </trkseg></trk>
  </gpx>
```
````

You may supply both `raw` and `gpx`. Relive loads raw data first, then GPX files in list order, drawing each segment separately. Arrange files in journey order.

## How photos are matched

1. A manual `time` takes precedence over EXIF `DateTimeOriginal` / `CreateDate`. When the time falls within the track's range, Relive interpolates the location by time and aligns playback progress.
2. If no usable time exists, the time is outside the track's range, or GPX timestamps are incomplete, manual/EXIF GPS coordinates are matched to the nearest **track point**. There is currently no distance limit; a photo far from the route may still match an endpoint.
3. If neither is available, the photo remains in the thumbnail strip with a hint. Relive does not guess its position on the track.

When EXIF does not specify a timezone, the block's `timezoneOffset` is used. The default is Taiwan's `+08:00`, independent of the machine's timezone. EXIF `OffsetTimeOriginal`, when present, takes precedence; a timezone explicitly included in a manual ISO timestamp has the highest priority. GPX timestamps should use ISO 8601 with a timezone.

Complete, monotonically increasing GPX timestamps produce time-based playback; otherwise playback uses distance. `duration` is the replay length in seconds (1–3600), defaulting to 60. Photos and events appear at their map coordinates when progress reaches them. By default, playback stops for 3 seconds, closes the popup, and continues along the GPX track. Playback starts only through user interaction.

## Installing the Obsidian plugin

The recommended method is to select **Add to Obsidian** on [Obsidian Community](https://community.obsidian.md/plugins/relive), then install and enable Relive in Obsidian. Version 0.2.2 has passed automated review, including artifact signatures and comparison against a source rebuild.

For manual installation, download all three attachments from the same version of [Release 0.2.2](https://github.com/kywk/relive/releases/tag/0.2.2). Developers can run `npm run build` and use the files in `dist/obsidian/`. Place them here:

```text
<vault>/.obsidian/plugins/relive/
  main.js
  manifest.json
  styles.css
```

Reload Obsidian and enable Relive. The Markdown code block processor supports Reading view and blocks displayed in Live Preview. Vault assets use Obsidian's link resolver with its standard wikilink search rules. Remote GPX/EXIF data is read through `requestUrl`; displayed photos are still loaded by the browser from their source URL. If an image host blocks embedding, save the image in your vault.

The plugin build includes Leaflet, parsers, and CSS; no npm dependencies need to be installed in the vault. Maps and animations are released when you leave the note.

## Docusaurus integration

Use `createReliveIntegration` to let a website read the original notes and attachments directly from a shared vault. A complete runnable example is in `examples/shared-vault/`; all its content is synthetic.

```js
const createReliveIntegration = require('@kywk/relive/integration');
const relive = createReliveIntegration({
  vaultRoot: __dirname,
  assetRoots: ['media'], // Explicitly list public attachment directories for your vault
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
});

// Add to the existing Docusaurus config; do not replace it:
// plugins: [...existingPlugins, relive.plugin]
// Each docs / blog / album remarkPlugins: [...existingRemarkPlugins, relive.remark]
```

The package is published on npm: run `npm install @kywk/relive`. For local development, you may use `require('/local/relive/src/integration.cjs')`, but do not commit such absolute paths for website CI. Before production deployment, the package must be published to a registry accessible by CI, with its version and lockfile included in the website project. Installation does not rewrite vault notes.

### GPX slimming during website builds

Enable `gpxSlim` in the website integration settings:

```js
const relive = createReliveIntegration({
  vaultRoot: __dirname,
  assetRoots: ['media'],
  gpxSlim: {preset: 'gentle'}, // Recommended from website measurements; optionally add targetReduction: 70
});
```

Measurements suggest explicitly using `gentle` for websites, initially without a target removal percentage. Omitting the setting keeps the full track; `true` still uses balanced. GPS-only photos may shift in playback time at stops or revisited locations. Disable slimming when exact ordering matters. See the [GPX Slim browser performance report](docs/gpx-slim-performance.md) (Traditional Chinese) for full data and limitations.

`preset` accepts `gentle`, `balanced`, or `aggressive`. `targetReduction` is the target percentage of track points to remove (0–100), not a file-size compression ratio or a percentage to keep. Without a target, simplification follows the preset. Required points and error limits may prevent reaching the target. `gpxSlim: true` uses balanced; omission or false preserves the full track. The same settings apply when using remarkRelive directly. Unknown parameters or invalid settings fail the build.

Slimming runs during Docusaurus's remark build stage: read GPX XML → simplify with the shared GPX Slim core → parse and produce the embedded website track. Local GPX, inline raw data, and explicitly permitted remote GPX are supported. File access remains restricted by assetRoots; original vault files and Obsidian loading remain unchanged. This does not compress GPX after a browser download and does not generate a separate downloadable slimmed GPX attachment. Original files you place in Docusaurus static are copied normally and are not processed by this feature.

Build logs report point counts and XML bytes before and after processing for each source, plus warnings when a target is not reached. The same report is available in the compiled VFile's `data.reliveGpxSlim`. XML byte reduction is not the same as the reduction in final HTML/JavaScript or HTTP-compressed transfer size. Docusaurus incremental builds may reuse cached data; clear the cache after changing attachments.

Fewer points reduce track data size, initialization work, and map-coordinate storage. Playback already updates in 256-point chunks, so playback performance does not improve in direct proportion to the removal rate. Photo, basemap, and Google 3D imagery costs remain unchanged. Slimming changes curve detail, distance/elevation statistics, and time interpolation. GPS photos match remaining points, so their playback progress may change. Timestamped photos/events still use the preserved start/end times, but their positions are not guaranteed to match the original track exactly. Disable this feature for pages requiring exact original records.

The website npm tarball includes the CLI's shared core source and LICENSE, using the root package's saxes runtime dependency. It does not run npx or require the CLI package to be published first. The slimming core is used only for website builds and is not included in the Obsidian or player bundle.

### Mapping to your shared vault

In the existing `~/Dropbox/obsidian` setup, the vault root is also the Docusaurus project:

- Docs has three collections: `backpacker`, `lifehacker`, and `moco`.
- Blogs use `blog.life` and `blog.news`; albums use `docusaurus-plugin-album` to read `blog.album`.
- Add `relive.remark` after wiki links and StoryMap in the existing `createRemarkPlugins`. Also add it after wiki links in `createBlogRemarkPlugins` so blogs and albums are supported.
- Preserve `markdown.format: 'detect'`, the existing `parseFrontMatter` / `deriveSlug`, and `contentLinkIndex`. Relive does not change article slugs, ordinary wiki links, or collection publication scope.
- Keep StoryMap and add `relive.plugin` only once. The plugin supports Docusaurus Webpack/Rspack and resolves the website's Leaflet to avoid loading different instances on the same page.

StoryMap 0.5.1's client entry mounts automatically on import; coexistence testing found that it may modify the page before React hydration. The example `story-map-client.js` demonstrates dynamic loading after `onRouteDidUpdate`. On a real website, point the existing `plugins/story-map-client` at the same deferred-loading adapter; do not register both the original entry and the adapter.

`assetRoots` is the allowlist of attachments Relive may read; it is separate from docs exclude settings. Include only directories intended for publication, not the entire vault. Private directories ignored by the website must not be added to this allowlist. The example uses a separate `media/` directory; a real website can use attachment directories within public notes.

### Paths, images, and builds

Assets are resolved relative to the article first, then relative to the vault root. `/media/ride.gpx` refers to the vault root, not the website root. Short names such as `[[ride.gpx]]` can be searched within the specified `assetRoots`. Multiple files with the same name require a full path rather than an arbitrary choice. Files outside the vault or allowlist are forbidden, including symlinks whose real locations fall outside those boundaries.

The build reads GPX and local image EXIF and embeds track data in the page. The Docusaurus bundler handles local photo URLs, hashes, `baseUrl`, and small-image inlining, without writing generated files into the vault's `static/`. Navigation cleans up the player. Pages without Relive do not load its maps or styles, and SSR does not execute Leaflet.

Remote photo URLs are preserved by default, without fetching EXIF during the build. Add `time` or `lat` / `lon` in the block, or save the photo as a local attachment to read EXIF. Remote GPX is forbidden by default; pass `allowRemote: true` when needed. Missing photos produce warnings; missing GPX fails the build and identifies the article. Images are published as original files, including existing EXIF. In bundle mode, use JPEG, PNG, WebP, GIF, or AVIF; convert HEIC first.

If you change only GPX or photo EXIF during development, clear the Docusaurus cache and rebuild to update embedded data; live reparsing of these attachments is not yet supported. The older direct `remark` integration's `assetMode: 'static'` remains available, requiring explicit `staticDir` and `baseUrl`. New websites should use the integration entry's bundle mode.

```sh
npm run vault:build
npm run vault:serve
# Open /vault/backpacker/ride/ to test docs + StoryMap + Relive
# /vault/life/2026/10/29/ride/ and /vault/news/2026/10/29/ride/ test blogs
# /vault/album/ tests albums; /vault/moco/plain/ is an ordinary note without maps
```

## Code structure

- `src/core.js`: shared YAML, GPX, distance/time progress, and photo matching.
- `src/load.js`: EXIF and host-provided asset readers.
- `src/player.js`: shared player, returning a cleanup function.
- `packages/react-relive`: standalone React component, types, and complete stylesheet entry; no Docusaurus dependency.
- `examples/react`: standalone Vite/React example.
- `src/obsidian.ts`: Obsidian code blocks and vault adapter.
- `src/remark.js`: Docusaurus MDX AST and static asset handling.
- `src/docusaurus.cjs`, `src/client.js`: website client loading and navigation lifecycle.
- `test/`: parsing, matching, asset boundary, and MDX compilation tests.

The structure follows a similar separation to StoryMap: data processing, player, and host adapters are distinct. React, Obsidian, and Docusaurus share the player without depending on StoryMap's private modules.

## Limitations and future work

Version 0.2.2 is published. Google 3D requires a user-supplied API key and has not yet been validated with a real key. Video/music export, elevation charts, live refresh after vault asset changes, offline maps, and a publishing wizard are not implemented. Extremely large GPX tracks may draw slowly per frame; map rendering across the international date line has not yet been adjusted for world wrapping. Maps use public OpenStreetMap tiles and require network access. For production traffic, review the tile service's usage policy and plan provider configuration.

References: [Obsidian Markdown post processing](https://github.com/obsidianmd/obsidian-developer-docs/blob/main/en/Plugins/Editor/Markdown%20post%20processing.md), [Docusaurus MDX plugins](https://docusaurus.io/docs/markdown-features/plugins), [Docusaurus client modules](https://docusaurus.io/docs/advanced/client), [Leaflet API](https://leafletjs.com/reference.html).

## Timeline and custom events

The timeline below the player shows the start, end, and intermediate times. Drag it or use the keyboard's left/right arrows to seek. Selecting a photo dot or event diamond pauses and jumps to that position. Times use `timezoneOffset`, still defaulting to `+08:00`. Without complete GPX timestamps, the timeline shows replay elapsed time, not fabricated capture times.

Photos and events appear in popups anchored to map coordinates; only thumbnails and event shortcuts remain below. Photos without location data are marked as unlocated and displayed at the current playback position, without treating them as matched.

```yaml
events:
  - at: '00:02:00'
    title: First bridge
    text: Stop for water.
  - time: '2026-10-29T07:08:00+08:00'
    title: Turnaround point
    text: A view across the riverbank.
  - progress: 0.9
    title: Almost there
    lat: 25.068
    lon: 121.513
```

Each event requires `title` and exactly one of `at` (HH:MM:SS elapsed from the GPX start), `time` (absolute date/time), or `progress` (0–1). Optional fields are `text` and paired `lat` / `lon`; without coordinates, the location is interpolated from the track. `at` and `time` require complete, monotonic GPX timestamps and report errors outside the range. Text is displayed as plain text, never executed as HTML.

## MapLibre 3D without an API key

The player's map selector switches between Leaflet 2D and MapLibre 3D, preserving timeline progress and pausing playback. The default is 2D; the MapLibre engine downloads only when 3D is selected. You can also configure automatic loading in the block:

```yaml
renderer: maplibre-3d
```

MapLibre uses [OpenFreeMap](https://openfreemap.org/) vector basemaps/building outlines and [Mapterhorn](https://mapterhorn.com/) terrain, without registration, an API key, or Google billing. Rotate, tilt, zoom, play the track, and select photos. Terrain uses a true-height factor of 1. The basemap follows the website's light/dark mode or Obsidian theme; photos retain their original colors. Roads and buildings are map data, not Google-style photorealistic city imagery.

Network access and WebGL are required. Coverage, accuracy, and public-service availability depend on the providers; attribution remains in the upper-right corner. Initialization failures, timeouts, and WebGL/tile errors fall back to 2D. Selecting 2D while loading cancels the attempt. The player processes GPX and photos locally without uploading them to basemap services; those services still receive tile requests for the visible area.

Websites and Docusaurus defer loading 3D JavaScript. For the single-file Obsidian plugin, MapLibre code and its worker are bundled in `main.js`, with styles in `styles.css`; no executable code is downloaded from a CDN at runtime. The build script packages the MapLibre 6.4.1 worker as a self-contained program launched through a local Blob URL, compatible with Vite, Webpack, and the single-file Obsidian build. Website CSP must permit `worker-src blob:`.

Custom websites using `@kywk/relive/player` directly must load `maplibre-gl/dist/maplibre-gl.css` alongside Leaflet and Relive styles. The Docusaurus plugin and Obsidian build handle this automatically.

Validation covers Chromium desktop/tablet/mobile viewports, published Docusaurus pages, playback/photos/zoom/theme switching, preservation of 2D progress, provider failures, and load cancellation. Unit tests cover segments, rewinding, incremental updates, and WebGL errors. The single-file Obsidian build passes; actual Electron and mobile hardware remain to be validated.

## Optional Google photorealistic 3D

Google Maps JavaScript API's `Map3DElement`, `Polyline3DElement`, and `PopoverElement` integrate Google's satellite/photorealistic 3D maps with tilted views, track lines, camera follow, and map dialogs. This uses Google's official embedded 3D API, not a Google Earth webpage in an iframe. Available imagery and building detail vary by region.

1. Enable billing and Maps JavaScript API in a Google Cloud project, then create a key suitable for the environment.
2. Since 0.2.1, the Obsidian version does not offer Google 3D or load Google's remote code. Use MapLibre 3D or 2D instead.
3. For Docusaurus, configure the plugin as below. This is a browser-side key included in the client bundle; set API and website-origin restrictions.

```js
plugins: [[path.resolve('../src/docusaurus.cjs'), {
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
}]],
```

After configuring a key, Google code loads only when you select Google 3D in the map selector. Alternatively, add `renderer: google-3d` to a `relive` block to attempt loading on open. API keys do not belong in Markdown blocks. Missing keys or load failures keep Leaflet 2D; returning to 2D preserves progress. Google 3D is website-only. Restrict the key to the real website's origins; do not disable key restrictions for testing.

The no-key message, shared timeline, and website build have been validated. No user key was provided, so loading Google imagery and billing remain unverified. Official references: [3D Overview](https://developers.google.com/maps/documentation/javascript/3d/overview), [3D shapes](https://developers.google.com/maps/documentation/javascript/3d/shapes-lines), [Popover API](https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw#PopoverElement).

## Player appearance and photo gallery

The timeline and playback controls overlay the map's bottom edge in a video-player layout: event markers, a seek bar, time ticks, and play/speed/follow controls. A fixed dark gradient keeps text readable over any map background; the accent color follows the theme. Leaflet attribution sits in the upper-right corner; Google 3D retains room for its native attribution at the bottom.

The photo gallery below can be collapsed or expanded. A thumbnail-size slider adjusts thumbnails from 72–220px. Larger collections scroll horizontally; selecting a thumbnail still jumps to its time and opens a map popup.

CSS prefers Obsidian's `--background-primary`, `--background-secondary`, `--text-normal`, `--text-muted`, `--interactive-accent`, `--background-modifier-border`, `--font-interface`, and border-radius variables rather than hard-coded light/dark palettes. Routes, popups, thumbnails, and panels update immediately with these variables. Docusaurus `--ifm-*` variables provide fallbacks; ordinary webpages use neutral defaults. CSS does not force color inversion on basemap imagery.

## GPX master timeline and event stops

The route is drawn from all GPX track points in their original order, with playback positions interpolated between adjacent points. Photos/places only provide stop events; they do not participate in connecting or rewriting the route. GPX start/end times define the timeline range. With incomplete timestamps, movement still follows all GPX points and cumulative distance, showing replay elapsed time rather than inventing real timestamps.

```yaml
duration: 60
stopDuration: 3
```

`duration` is the compressed time in seconds to travel the complete GPX track, excluding stops. `stopDuration` is the real-time stop length for each event group (0–60, default 3; 0 disables stops), unaffected by playback speed. At an event, position and the GPX clock stop together. Once the dialog finishes, it closes and playback resumes automatically. Photos and places at the same time are grouped into a single stop.

Manual pause freezes the stop countdown; play resumes it. Seeking cancels the current stop; rewinding allows events ahead to trigger again. Selecting thumbnails/places stays manually paused so the map does not move unexpectedly while you read. High playback speed or dropped frames do not skip intermediate events. Playback ends only after the endpoint event is shown.

The timeline and controls fade out 2 seconds after the mouse leaves the map player and reappear immediately on return. They stay visible while dragging or while keyboard focus is inside the controls. Touch interaction does not use the mouse-leave timer.

## Performance and measurement

Second evaluation on 2026-10-30: CPU time in the synthetic GPS-matching benchmark fell by 57.1%. The official website defers React, journey data, and map styles until the player is nearby, reducing mobile initial JavaScript from 149KB to 4KB (excluding photos; not total page traffic). Scores, load conditions, and raw data are in the performance report below.

Real Leaflet and data-processing benchmarks cover 100,000-point GPX tracks. The player uses chunked updates that retain all points, a single camera pan, smaller browser dependencies, and deduplicated DOM updates during stops. See the [performance report](docs/performance.md) (Traditional Chinese) for methodology, before/after data, rerun commands, and limitations.

## Release CI/CD

Maintainer: GitHub and npm account `kywk`. Repository: [kywk/relive](https://github.com/kywk/relive). The current stable version is [GitHub Release 0.2.2](https://github.com/kywk/relive/releases/tag/0.2.2). Release attachments and npm packages are published, and Obsidian Community lists the plugin; see the [Community page](https://community.obsidian.md/plugins/relive) for the latest reviewed version. The project and CLI are MIT licensed.

| Product | Installation identifier | Release tag | Workflow |
| --- | --- | --- | --- |
| GitHub Release / Obsidian package | Plugin ID `relive`, plus three npm tarballs | `0.2.2` | `release-obsidian.yml` |
| Docusaurus / shared library | `@kywk/relive` | `npm-v0.2.2` | `release-npm.yml` |
| React component | `@kywk/react-relive` | `react-relive-v0.1.2` | `release-react.yml` |
| GPX Slim CLI | `@kywk/gpx-slim`, command `gpx-slim` | `gpx-slim-v0.2.0` | `release-gpx-slim.yml` |

The GitHub release workflow also builds the website and tests all three tarballs, attaching SHA256SUMS and artifact attestations. It uses `docs/releases/<version>.md` as release notes; prepare that file before creating a new version tag. This workflow does not run npm publish or submit to Community.

Obsidian downloads `main.js`, `manifest.json`, and `styles.css` from GitHub Releases, not npm. The root package provides the website library; the CLI in `packages/gpx-slim` retains its own lockfile and independent version.

### Pre-release validation

Run from the repository root:

```sh
npm ci
npm --prefix packages/gpx-slim ci
npm test
npm run build
node scripts/check-release.mjs check --assets
npm run site:build
npm run vault:build
npm run release:pack
npm run gpx:release:check
npm run gpx:release:pack
npm run react:test
npm run react:build
npm run react:release:pack
```

Website artifacts go to `.release/docusaurus/`; CLI artifacts go to `.release/gpx-slim/`. Neither clears the other's output. The website tarball is installed in an isolated consumer to validate ESM/CommonJS entries. The CLI runs prepack tests, then uses offline npx with an empty cache to validate analysis, actual slimming, and refusal to overwrite files. Workflows publish the validated tarball. CI additionally validates the CLI on Node 22/24 and preserves `gpx-slim-node-*` and Obsidian artifacts.

The React package maintains an independent version in `packages/react-relive`, with artifacts in `.release/react/`. It depends on `@kywk/relive`; publish the shared library before the React package for the first release. `release-react.yml` uses its own tag and npm trusted publisher. Obsidian tags do not publish it automatically.

### Publication status and remaining setup

As of 2026-11-05, Obsidian/shared package 0.2.2, React 0.1.2, and GPX Slim 0.1.0 are published. Community review of 0.2.2 is complete, and GitHub Release, CI, and demo deployment succeeded. Installation from the actual registry, React SSR, and CLI execution have been validated.

GPX Slim 0.2.0 was published on 2026-11-06 with `--gps-only` / `gpsOnly`. Its Trusted Publisher is configured for `kywk/relive`, workflow `release-gpx-slim.yml`, without an environment restriction. GitHub Actions OIDC publication with provenance succeeded; fresh-cache public npx checks passed for both the exact version and latest.

Trusted Publishers for `@kywk/relive` and `@kywk/react-relive` were also created and read back on 2026-11-06, restricted to `kywk/relive` workflows `release-npm.yml` and `release-react.yml`, respectively, with no environment specified and publication allowed. Both workflows passed isolated Node 24/npm 12.2.0 clean installation, tests, build, and tarball validation. No new versions of these two packages were published in this setup task, so their actual OIDC publication remains unverified.

Under [npm configuration expiry rules](https://docs.npmjs.com/trusted-publishers/#trusted-publisher-configuration-expiry), a new Publisher must complete its first successful publication within two days; otherwise it expires and must be deleted and recreated. Earlier releases used locally validated tarballs and interactive 2FA. The following steps explain configuration; workflow existence alone does not establish a successful OIDC publication.

1. Create the public `kywk/relive` repository and commit source, LICENSE, manifest, versions, and package lockfiles. Confirm that GitHub Actions passes.
2. Sign in to npm as `kywk` and confirm publication rights for each scoped package name. Follow the [official npm Trusted Publishing process](https://docs.npmjs.com/trusted-publishers/) for the initial publication/package creation. If the first publication must be local, use the validated tarball and complete npm's login/2FA requirements.
3. Configure each npm package's own GitHub trusted publisher: owner `kywk`, repository `relive`; bind `@kywk/relive` to `release-npm.yml`, `@kywk/gpx-slim` to `release-gpx-slim.yml`, and `@kywk/react-relive` to `release-react.yml`, allowing publication. Existing workflows do not specify an environment, so leave that field empty. They use GitHub-hosted runners, Node 24, npm 12.2.0, and OIDC, without a long-lived npm token.
4. Push each product's corresponding tag. If the first npm version was published manually, increment the version for subsequent tags rather than attempting to republish it. Obsidian tags must be plain `x.y.z`.
5. After a successful GitHub Release, follow the [official Obsidian submission process](https://docs.obsidian.md/Plugins/Releasing/Submit%20your%20plugin): sign in to the Community directory, connect GitHub, submit the plugin, and address review results. Successful CI does not mean Community publication is complete.

### Future releases

Keep the root package and Obsidian versions aligned: update root `package.json`, `package-lock.json`, and `manifest.json`, and add the version/minimum Obsidian version mapping to `versions.json`. For the CLI, update only its subpackage's package file and lockfile. Validate before committing and tagging; keep existing versions and tags unchanged. The Obsidian workflow supports manually rerunning an existing tag, comparing existing attachments without overwriting them.

Usage after publication:

```sh
npm install @kywk/relive
npx @kywk/gpx-slim ride.gpx --analyze
npx @kywk/gpx-slim ride.gpx --preset balanced --reduction 70
```

Before official publication, validate the local CLI tarball directly:

```sh
npx --offline --yes --package ./.release/gpx-slim/kywk-gpx-slim-0.2.0.tgz gpx-slim --help
```
