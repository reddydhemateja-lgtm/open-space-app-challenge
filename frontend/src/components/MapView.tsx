import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import { HarmonizedDetection, HarmonizedCluster } from '../services/api';
import { Flame, Info, CheckCircle2, AlertCircle, Compass } from 'lucide-react';

interface MapViewProps {
  detections: HarmonizedDetection[];
  clusters: HarmonizedCluster[];
  bounds?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
  viewLayer: 'clusters' | 'raw' | 'both';
  isLoading: boolean;
}

// Helper to auto-fit map bounds when dataset or bounds change
const MapBoundsAdjuster: React.FC<{ bounds?: { min_lat: number; max_lat: number; min_lon: number; max_lon: number } }> = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.min_lat !== bounds.max_lat && bounds.min_lon !== bounds.max_lon) {
      try {
        map.fitBounds([
          [bounds.min_lat, bounds.min_lon],
          [bounds.max_lat, bounds.max_lon]
        ], { padding: [40, 40], maxZoom: 13 });
      } catch (e) {
        // Fallback default
      }
    }
  }, [bounds, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  detections,
  clusters,
  bounds,
  viewLayer,
  isLoading
}) => {
  const center = useMemo<[number, number]>(() => {
    if (bounds && bounds.min_lat && bounds.max_lat) {
      return [(bounds.min_lat + bounds.max_lat) / 2.0, (bounds.min_lon + bounds.max_lon) / 2.0];
    }
    return [40.15, -121.35]; // California fire default
  }, [bounds]);

  return (
    <div className="relative w-full h-[620px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
      
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/70 z-[1000] flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-300">Harmonizing Spatial Hotspots...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        {/* CartoDB Dark Matter Basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={18}
        />

        <MapBoundsAdjuster bounds={bounds} />

        {/* 1. Harmonized Clusters Layer */}
        {(viewLayer === 'clusters' || viewLayer === 'both') && clusters.map((cluster) => {
          let fillColor = '#A855F7'; // Magenta/Purple for Coincident Overpass
          let borderColor = '#D8B4FE';
          let label = 'Coincident Overpass (Validated)';

          if (cluster.overlap_status === 'VIIRS_ONLY') {
            fillColor = '#06B6D4'; // Cyan for VIIRS fine-grain
            borderColor = '#67E8F9';
            label = 'VIIRS Only (375m Fine-Grain)';
          } else if (cluster.overlap_status === 'MODIS_ONLY') {
            fillColor = '#F59E0B'; // Amber for MODIS 1km
            borderColor = '#FCD34D';
            label = 'MODIS Only (1km Footprint)';
          }

          const radius = Math.min(24, Math.max(7, Math.sqrt(cluster.harmonized_fire_pixel_equivalent) * 6));

          return (
            <CircleMarker
              key={cluster.cluster_id}
              center={[cluster.centroid_lat, cluster.centroid_lon]}
              radius={radius}
              pathOptions={{
                color: borderColor,
                fillColor: fillColor,
                fillOpacity: 0.65,
                weight: 2
              }}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.95}>
                <div className="text-xs font-sans">
                  <div className="font-bold text-slate-900">{cluster.cluster_id}</div>
                  <div className="text-slate-700">HFPE: {cluster.harmonized_fire_pixel_equivalent} eq. px</div>
                  <div className="text-slate-700">FRP: {cluster.total_frp_mw} MW</div>
                  <div className="text-purple-700 font-semibold">{cluster.overlap_status}</div>
                </div>
              </Tooltip>

              <Popup className="custom-leaflet-popup">
                <div className="p-1 space-y-2 text-xs font-sans text-slate-800 min-w-[240px]">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-bold text-purple-900 text-sm flex items-center gap-1">
                      <Flame className="w-4 h-4 text-amber-600" />
                      Harmonized Cluster
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-100 text-purple-800">
                      {cluster.time_window}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Date (UTC):</span>
                      <span className="font-semibold text-slate-900">{cluster.acq_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Overlap Status:</span>
                      <span className="font-semibold text-purple-700">{cluster.overlap_status}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Centroid:</span>
                      <span className="font-mono text-slate-800">{cluster.centroid_lat.toFixed(3)}, {cluster.centroid_lon.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">FRP (Total):</span>
                      <span className="font-bold text-red-600">{cluster.total_frp_mw} MW</span>
                    </div>
                  </div>

                  {/* Harmonization Explanation Pill */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-900">
                      <span>Harmonized Fire Pixel Eq:</span>
                      <span className="text-amber-700 font-bold">{cluster.harmonized_fire_pixel_equivalent} eq. km²</span>
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Raw Detections Combined: <span className="font-mono text-slate-800">{cluster.total_raw_detections}</span> (MODIS: {cluster.modis_count}, VIIRS: {cluster.viirs_count})
                    </div>
                    {cluster.overlap_status === 'COINCIDENT_OVERLAP' && (
                      <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Coincident overpass cross-verified! Naive addition prevented.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Satellites: {cluster.satellites_present.join(', ')}</span>
                    <span>Confidence: {cluster.dominant_confidence.toUpperCase()}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 2. Raw Detections Layer (Optional Overlay) */}
        {(viewLayer === 'raw' || viewLayer === 'both') && detections.slice(0, 1500).map((det) => {
          const isModis = det.sensor === 'MODIS';
          const radius = isModis ? 6 : 3;
          const color = isModis ? '#F59E0B' : '#EF4444';

          return (
            <CircleMarker
              key={det.id}
              center={[det.latitude, det.longitude]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 1
              }}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs text-slate-900">
                  <div className="font-bold flex items-center gap-1">
                    <span className={isModis ? 'text-amber-700' : 'text-red-700'}>{det.sensor}</span>
                    <span className="text-slate-500">({det.satellite})</span>
                  </div>
                  <div className="text-[11px] text-slate-600">Time: {det.acq_datetime}</div>
                  <div className="text-[11px] text-slate-600">FRP: <span className="font-semibold text-red-600">{det.frp_mw} MW</span></div>
                  <div className="text-[11px] text-slate-600">Brightness: {det.brightness_k} K</div>
                  <div className="text-[11px] text-slate-600">Pixel Area: {det.pixel_area_km2} km² ({isModis ? '1000m' : '375m'})</div>
                  <div className="text-[10px] font-mono text-slate-500">Raw Conf: {det.confidence_original}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Floating Legend & Scientific Explanation */}
      <div className="absolute bottom-4 left-4 z-[999] bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur max-w-xs text-xs space-y-2">
        <div className="font-bold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
          <Compass className="w-3.5 h-3.5 text-amber-500" />
          <span>Spatial Harmonization Legend</span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-300 inline-block shrink-0 shadow-sm shadow-purple-500/50" />
            <span className="text-slate-300">
              <strong className="text-purple-300">Coincident Overpass:</strong> Both MODIS & VIIRS co-detected fire front
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-500 border border-cyan-300 inline-block shrink-0 shadow-sm shadow-cyan-500/50" />
            <span className="text-slate-300">
              <strong className="text-cyan-300">VIIRS Only:</strong> 375m fine-grain sub-pixel or night detection
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-300 inline-block shrink-0 shadow-sm shadow-amber-500/50" />
            <span className="text-slate-300">
              <strong className="text-amber-300">MODIS Only:</strong> 1km morning pass (Terra) or scan-edge
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
          * Circle size scales proportionally with Harmonized Fire Pixel Equivalent (HFPE).
        </div>
      </div>

      {/* Scientific Sensor Resolution Comparison Badge */}
      <div className="hidden sm:block absolute top-4 right-4 z-[999] bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-xl backdrop-blur text-xs">
        <div className="font-bold text-slate-200 mb-1 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sensor Ground Footprint</span>
        </div>
        <div className="space-y-1 text-[11px] text-slate-300">
          <div className="flex justify-between gap-4">
            <span className="text-amber-400 font-medium">MODIS (1 km):</span>
            <span className="font-mono text-slate-200">1.0 km² nadir</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-red-400 font-medium">VIIRS (375 m):</span>
            <span className="font-mono text-slate-200">0.14 km² nadir</span>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 font-mono">
            Area Ratio: ~7.1x resolution difference
          </div>
        </div>
      </div>

    </div>
  );
};

