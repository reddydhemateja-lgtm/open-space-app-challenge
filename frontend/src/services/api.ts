/**
 * API Client for NASA Hotspot Harmonization Backend
 */

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

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchMetadata(): Promise<DatasetMetadata> {
  const res = await fetch(`${API_BASE}/data/metadata`);
  if (!res.ok) throw new Error(`Failed to load dataset metadata: ${res.statusText}`);
  return res.json();
}

export async function fetchDetections(params?: {
  start_date?: string;
  end_date?: string;
  sensor?: string;
  confidence?: string;
  daynight?: string;
  limit?: number;
}): Promise<{ total_count: number; returned_count: number; detections: HarmonizedDetection[] }> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.sensor && params.sensor !== 'ALL') query.set('sensor', params.sensor);
  if (params?.confidence && params.confidence !== 'ALL') query.set('confidence', params.confidence);
  if (params?.daynight && params.daynight !== 'ALL') query.set('daynight', params.daynight);
  if (params?.limit) query.set('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/data/detections?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load detections: ${res.statusText}`);
  return res.json();
}

export async function fetchClusters(params?: {
  start_date?: string;
  end_date?: string;
  overlap_status?: string;
  min_frp?: number;
}): Promise<{ total_clusters: number; clusters: HarmonizedCluster[] }> {
  const query = new URLSearchParams();
  if (params?.start_date) query.set('start_date', params.start_date);
  if (params?.end_date) query.set('end_date', params.end_date);
  if (params?.overlap_status && params.overlap_status !== 'ALL') query.set('overlap_status', params.overlap_status);
  if (params?.min_frp) query.set('min_frp', params.min_frp.toString());

  const res = await fetch(`${API_BASE}/data/clusters?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load clusters: ${res.statusText}`);
  return res.json();
}

export async function fetchDailyCalendar(start_date?: string, end_date?: string): Promise<CalendarDaySummary[]> {
  const query = new URLSearchParams();
  if (start_date) query.set('start_date', start_date);
  if (end_date) query.set('end_date', end_date);

  const res = await fetch(`${API_BASE}/calendar/daily?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load daily calendar: ${res.statusText}`);
  return res.json();
}

export async function fetchMonthlySummary(): Promise<MonthlySummary[]> {
  const res = await fetch(`${API_BASE}/calendar/monthly`);
  if (!res.ok) throw new Error(`Failed to load monthly summary: ${res.statusText}`);
  return res.json();
}

export async function fetchAnomalies(): Promise<AnomalySummary[]> {
  const res = await fetch(`${API_BASE}/calendar/anomalies`);
  if (!res.ok) throw new Error(`Failed to load anomalies: ${res.statusText}`);
  return res.json();
}

export async function fetchComparison(): Promise<SensorComparisonSummary> {
  const res = await fetch(`${API_BASE}/comparison`);
  if (!res.ok) throw new Error(`Failed to load sensor comparison: ${res.statusText}`);
  return res.json();
}

export async function fetchMethodology(): Promise<any> {
  const res = await fetch(`${API_BASE}/methodology`);
  if (!res.ok) throw new Error(`Failed to load methodology: ${res.statusText}`);
  return res.json();
}

export async function uploadCsvFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/data/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errData.detail || 'Upload failed');
  }

  return res.json();
}

export async function resetToDemo(): Promise<any> {
  const res = await fetch(`${API_BASE}/data/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to reset dataset: ${res.statusText}`);
  return res.json();
}

export async function fetchPresets(): Promise<Array<{ id: string; name: string; type: string; description: string }>> {
  const res = await fetch(`${API_BASE}/data/presets`);
  if (!res.ok) throw new Error(`Failed to load presets: ${res.statusText}`);
  return res.json();
}

export async function loadPreset(presetId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/data/load-preset/${presetId}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to load preset');
  }
  return res.json();
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

