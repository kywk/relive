import type {CSSProperties, ReactElement} from 'react';
export interface TrackPoint {lat: number; lon: number; time?: number; ele?: number;}
export interface ResolvedTrackPoint extends TrackPoint {segment: number; meters: number; progress: number;}
export interface Track {points: ResolvedTrackPoint[]; meters: number; timed: boolean; elapsed: number | null;}
export interface Photo {src: string; url?: string; caption?: string; time?: string; timestamp?: number; lat?: number; lon?: number;}
export interface ResolvedPhoto extends Photo {progress: number | null; matchedBy?: 'time' | 'gps' | null;}
export interface JourneyEvent {title: string; text?: string; progress: number; lat: number; lon: number; kind?: 'event';}
export interface Journey {
  title: string;
  track: Track;
  photos: ResolvedPhoto[];
  events?: JourneyEvent[];
  warnings: string[];
  duration: number;
  stopDuration?: number;
  timezoneOffset?: string;
  renderer?: 'leaflet' | 'maplibre-3d' | 'google-3d';
}
export interface ReliveProps {
  journey: Journey;
  googleMapsApiKey?: string;
  className?: string;
  style?: CSSProperties;
  onReady?: () => void;
  onError?: (error: Error) => void;
}
export function Relive(props: ReliveProps): ReactElement;
export function parseGpx(xml: string): TrackPoint[][];
export function makeTrack(segments: TrackPoint[][]): Track;
export function matchPhoto<T extends Photo>(photo: T, track: Track): T & ResolvedPhoto;
export interface SourceEvent {title: string; text?: string; at?: string; time?: string; progress?: number; lat?: number; lon?: number;}
export interface JourneySource {
  title: string; gpx: string[]; raw: string; photos: Photo[]; events: SourceEvent[];
  renderer: 'leaflet' | 'maplibre-3d' | 'google-3d'; stopDuration: number;
  timezoneOffset: string; duration: number;
}
export function parseBlock(source: string): JourneySource;
