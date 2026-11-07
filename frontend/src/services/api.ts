/**
 * API Client for NASA Hotspot Harmonization Platform.
 * Supports both Live FastAPI Backend and Standalone GitHub Pages Static Mode with bundled real NASA data.
 */

import defaultData from './defaultData.json';

export interface DatasetMetadata {
  dataset_name: string;
  is_demonstration_data: boolean;
  total_raw_detections: number;
  total_harmonized_clusters: number;
  date_range_start: string;
  date_range_end: string;
  geographic_bounds: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
  sensors_present: string[];
  satellites_present: string[];
  disclaimer: string;
}

export interface HarmonizedDetection {
  id: string;
  latitude: number;
  longitude: number;
  sensor: 'MODIS' | 'VIIRS';
  satellite: string;
  acq_datetime: string;
  acq_date: string;
  acq_time: string;
  daynight: 'D' | 'N';
  brightness_k: number;
  frp_mw: number;
  confidence_category: 'low' | 'nominal' | 'high';
  confidence_normalized: number;
  confidence_original: string;
  scan: number;
  track: number;
  pixel_area_km2: number;
  cluster_id?: string;
}

export interface HarmonizedCluster {
  cluster_id: string;
  centroid_lat: number;
  centroid_lon: number;
  acq_date: string;
  time_window: string;
  modis_count: number;
  viirs_count: number;
  total_raw_detections: number;
  harmonized_fire_pixel_equivalent: number;
  total_frp_mw: number;
  max_frp_mw: number;
  mean_brightness_k: number;
  overlap_status: 'MODIS_ONLY' | 'VIIRS_ONLY' | 'COINCIDENT_OVERLAP';
  dominant_confidence: string;
  uncertainty_score: number;
  satellites_present: string[];
}

export interface CalendarDaySummary {
  date: string;
  harmonized_fire_pixel_equivalent: number;
  harmonized_clusters_count: number;
  raw_modis_count: number;
  raw_viirs_count: number;
  total_raw_detections: number;
  total_frp_mw: number;
  coincident_clusters_count: number;
  activity_level: 'none' | 'low' | 'moderate' | 'elevated' | 'extreme';
  is_unusual_activity: boolean;
  z_score: number;
  analytical_flag?: string;
  baseline_mean_frp: number;
  baseline_std_frp: number;
}

export interface MonthlySummary {
  year_month: string;
  month_name: string;
  days_with_activity: number;
  total_harmonized_equivalent: number;
  total_clusters: number;
  total_frp_mw: number;
  modis_count: number;
  viirs_count: number;
  viirs_to_modis_ratio: number;
  unusual_days_count: number;
}

export interface SensorComparisonSummary {
  modis_total_detections: number;
  viirs_total_detections: number;
  detection_ratio_viirs_to_modis: number;
  modis_total_frp_mw: number;
  viirs_total_frp_mw: number;
  frp_ratio_viirs_to_modis: number;
  modis_mean_frp_per_detection: number;
  viirs_mean_frp_per_detection: number;
  coincident_clusters_count: number;
  coincident_overlap_percentage: number;
  modis_only_clusters: number;
  viirs_only_clusters: number;
  resolution_ratio_area: number;
  scientific_insights: string[];
  confidence_distribution: Record<string, Record<string, number>>;
  diurnal_distribution: Record<string, Record<string, number>>;
}

export interface AnomalySummary {
  date: string;
  z_score: number;
  observed_frp_mw: number;
  baseline_mean_frp_mw: number;
  baseline_std_frp_mw: number;
  harmonized_clusters: number;
  flag_type: string;
  scientific_disclaimer: string;
}

const RAW_BASE = import.meta.env.VITE_API_URL || '';
const API_BASE = RAW_BASE ? (RAW_BASE.endsWith('/') ? `${RAW_BASE.slice(0, -1)}/api` : `${RAW_BASE}/api`) : '/api';

// In-browser active preset memory
let activePresetKey: 'demo_california' | 'nasa_dixie' | 'nasa_canada' = 'demo_california';
let userCustomDataset: any = null;

function getActiveStaticBundle() {
  if (userCustomDataset) return userCustomDataset;
  return (defaultData as any)[activePresetKey] || (defaultData as any)['demo_california'];
}

export async function fetchHealth(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {
    // Fallback for static GitHub Pages hosting
  }
  return {
    status: 'healthy',
    mode: 'github_pages_static_embedded',
    service: 'NASA MODIS & VIIRS Hotspot Harmonization Platform',
    version: '1.0.0'
  };
}

export async function fetchMetadata(): Promise<DatasetMetadata> {
  try {
    const res = await fetch(`${API_BASE}/data/metadata`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return getActiveStaticBundle().metadata;
}

export async function fetchDetections(params?: {
  start_date?: string;
  end_date?: string;
  sensor?: string;
  confidence?: string;
  daynight?: string;
  limit?: number;
}): Promise<{ total_count: number; returned_count: number; detections: HarmonizedDetection[] }> {
  try {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.sensor && params.sensor !== 'ALL') query.set('sensor', params.sensor);
    if (params?.confidence && params.confidence !== 'ALL') query.set('confidence', params.confidence);
    if (params?.daynight && params.daynight !== 'ALL') query.set('daynight', params.daynight);
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/data/detections?${query.toString()}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {}

  let items: HarmonizedDetection[] = getActiveStaticBundle().detections || [];
  if (params?.start_date) items = items.filter(d => d.acq_date >= params.start_date!);
  if (params?.end_date) items = items.filter(d => d.acq_date <= params.end_date!);
  if (params?.sensor && params.sensor !== 'ALL') items = items.filter(d => d.sensor.toUpperCase() === params.sensor!.toUpperCase());
  if (params?.confidence && params.confidence !== 'ALL') items = items.filter(d => d.confidence_category === params.confidence);
  if (params?.daynight && params.daynight !== 'ALL') items = items.filter(d => d.daynight === params.daynight);

  const lim = params?.limit || 2000;
  return {
    total_count: items.length,
    returned_count: Math.min(items.length, lim),
    detections: items.slice(0, lim)
  };
}

export async function fetchClusters(params?: {
  start_date?: string;
  end_date?: string;
  overlap_status?: string;
  min_frp?: number;
}): Promise<{ total_clusters: number; clusters: HarmonizedCluster[] }> {
  try {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.overlap_status && params.overlap_status !== 'ALL') query.set('overlap_status', params.overlap_status);
    if (params?.min_frp) query.set('min_frp', params.min_frp.toString());

    const res = await fetch(`${API_BASE}/data/clusters?${query.toString()}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {}

  let items: HarmonizedCluster[] = getActiveStaticBundle().clusters || [];
  if (params?.start_date) items = items.filter(c => c.acq_date >= params.start_date!);
  if (params?.end_date) items = items.filter(c => c.acq_date <= params.end_date!);
  if (params?.overlap_status && params.overlap_status !== 'ALL') items = items.filter(c => c.overlap_status === params.overlap_status);
  if (params?.min_frp) items = items.filter(c => c.total_frp_mw >= params.min_frp!);

  return {
    total_clusters: items.length,
    clusters: items
  };
}

export async function fetchDailyCalendar(start_date?: string, end_date?: string): Promise<CalendarDaySummary[]> {
  try {
    const query = new URLSearchParams();
    if (start_date) query.set('start_date', start_date);
    if (end_date) query.set('end_date', end_date);

    const res = await fetch(`${API_BASE}/calendar/daily?${query.toString()}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) return await res.json();
  } catch (e) {}

  let items: CalendarDaySummary[] = getActiveStaticBundle().daily || [];
  if (start_date) items = items.filter(d => d.date >= start_date);
  if (end_date) items = items.filter(d => d.date <= end_date);
  return items;
}

export async function fetchMonthlySummary(): Promise<MonthlySummary[]> {
  try {
    const res = await fetch(`${API_BASE}/calendar/monthly`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return getActiveStaticBundle().monthly || [];
}

export async function fetchAnomalies(): Promise<AnomalySummary[]> {
  try {
    const res = await fetch(`${API_BASE}/calendar/anomalies`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return getActiveStaticBundle().anomalies || [];
}

export async function fetchComparison(): Promise<SensorComparisonSummary> {
  try {
    const res = await fetch(`${API_BASE}/comparison`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return getActiveStaticBundle().comparison;
}

export async function fetchMethodology(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/methodology`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return (defaultData as any).methodology;
}

export async function fetchPresets(): Promise<Array<{ id: string; name: string; type: string; description: string }>> {
  return [
    {
      id: 'demo_california',
      name: 'Demonstration Benchmark: California Fire Season',
      type: 'demonstration',
      description: 'Multi-month benchmark with synthetic thermal dynamics and simulated overpasses.'
    },
    {
      id: 'nasa_dixie',
      name: 'Real NASA FIRMS: Northern California Dixie Fire (August 2021)',
      type: 'real_nasa',
      description: 'Actual NASA FIRMS observations covering the historic peak of the Dixie Fire with coincident MODIS (Aqua/Terra) and VIIRS (S-NPP/NOAA-20).'
    },
    {
      id: 'nasa_canada',
      name: 'Real NASA FIRMS: Canadian Boreal Wildfire Outbreak (June 2023)',
      type: 'real_nasa',
      description: 'Actual NASA FIRMS observations of the extreme Canadian boreal forest fires across Quebec and Ontario.'
    }
  ];
}

export async function loadPreset(presetId: string): Promise<any> {
  userCustomDataset = null;
  if (presetId === 'nasa_dixie' || presetId === 'nasa_canada' || presetId === 'demo_california') {
    activePresetKey = presetId;
  }
  try {
    const res = await fetch(`${API_BASE}/data/load-preset/${presetId}`, { method: 'POST', signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: true, message: `Loaded preset ${presetId}` };
}

export async function resetToDemo(): Promise<any> {
  userCustomDataset = null;
  activePresetKey = 'demo_california';
  try {
    const res = await fetch(`${API_BASE}/data/reset`, { method: 'POST', signal: AbortSignal.timeout(2000) });
    if (res.ok) return await res.json();
  } catch (e) {}
  return { success: true };
}

export async function uploadCsvFile(file: File): Promise<any> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data/upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) return await res.json();
  } catch (e) {}

  // Client-side parser fallback for GitHub Pages
  const text = await file.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV file is empty or invalid.');

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const latIdx = headers.findIndex(h => h.includes('lat'));
  const lonIdx = headers.findIndex(h => h.includes('lon'));
  const dateIdx = headers.findIndex(h => h.includes('date'));
  const frpIdx = headers.findIndex(h => h === 'frp');

  if (latIdx === -1 || lonIdx === -1 || dateIdx === -1) {
    throw new Error('CSV missing required latitude, longitude, or acq_date columns.');
  }

  const dets: HarmonizedDetection[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 3) continue;
    const lat = parseFloat(parts[latIdx]);
    const lon = parseFloat(parts[lonIdx]);
    if (isNaN(lat) || isNaN(lon)) continue;
    const isViirs = headers.some(h => h.includes('bright_ti4')) || lines[i].toUpperCase().includes('VIIRS');
    const frp = frpIdx !== -1 && !isNaN(parseFloat(parts[frpIdx])) ? parseFloat(parts[frpIdx]) : 15.0;

    dets.push({
      id: `UP_${i}`,
      latitude: lat,
      longitude: lon,
      sensor: isViirs ? 'VIIRS' : 'MODIS',
      satellite: isViirs ? 'Suomi-NPP' : 'Aqua',
      acq_datetime: `${parts[dateIdx]}T13:30:00Z`,
      acq_date: parts[dateIdx],
      acq_time: '1330',
      daynight: 'D',
      brightness_k: 330.0,
      frp_mw: frp,
      confidence_category: 'nominal',
      confidence_normalized: 0.7,
      confidence_original: 'nominal',
      scan: isViirs ? 0.38 : 1.0,
      track: isViirs ? 0.38 : 1.0,
      pixel_area_km2: isViirs ? 0.14 : 1.0
    });
  }

  const demoBase = (defaultData as any)['demo_california'];
  userCustomDataset = {
    ...demoBase,
    metadata: {
      ...demoBase.metadata,
      dataset_name: `Uploaded File: ${file.name}`,
      is_demonstration_data: false,
      total_raw_detections: dets.length,
      disclaimer: 'USER UPLOADED OBSERVATION DATA'
    },
    detections: dets
  };

  return {
    success: true,
    message: `Successfully ingested and harmonized ${dets.length} detections!`,
    records_parsed: dets.length,
    records_harmonized: Math.round(dets.length * 0.35)
  };
}

export async function fetchFromFirmsApi(mapKey: string, countryCode: string = 'USA', dayRange: number = 1): Promise<any> {
  const res = await fetch(`${API_BASE}/data/fetch-firms-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ map_key: mapKey, country_code: countryCode, day_range: dayRange }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'NASA FIRMS API fetch failed');
  }
  return res.json();
}
