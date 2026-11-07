import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { SensorComparisonSummary } from '../services/api';
import { Satellite, Eye, Zap, Layers, ShieldAlert, Sparkles, Scale } from 'lucide-react';

interface SensorComparisonProps {
  comparisonData: SensorComparisonSummary | null;
  isLoading: boolean;
}

export const SensorComparison: React.FC<SensorComparisonProps> = ({
  comparisonData,
  isLoading
}) => {
  if (isLoading || !comparisonData) {
    return (
      <div className="h-96 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Computing Sensor Disparity Metrics...</span>
        </div>
      </div>
    );
  }

  // Format Diurnal data for chart
  const diurnalChartData = [
    {
      period: 'Daytime Passes',
      MODIS: comparisonData.diurnal_distribution.MODIS?.Day || 0,
      VIIRS: comparisonData.diurnal_distribution.VIIRS?.Day || 0
    },
    {
      period: 'Nighttime Passes',
      MODIS: comparisonData.diurnal_distribution.MODIS?.Night || 0,
      VIIRS: comparisonData.diurnal_distribution.VIIRS?.Night || 0
    }
  ];

  // Format Confidence data for chart
  const confidenceChartData = [
    {
      level: 'Low Confidence',
      MODIS: comparisonData.confidence_distribution.MODIS?.low || 0,
      VIIRS: comparisonData.confidence_distribution.VIIRS?.low || 0
    },
    {
      level: 'Nominal Confidence',
      MODIS: comparisonData.confidence_distribution.MODIS?.nominal || 0,
      VIIRS: comparisonData.confidence_distribution.VIIRS?.nominal || 0
    },
    {
      level: 'High Confidence',
      MODIS: comparisonData.confidence_distribution.MODIS?.high || 0,
      VIIRS: comparisonData.confidence_distribution.VIIRS?.high || 0
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Cross-Comparison Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Detection Multiplier */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Detection Multiplier</span>
            <Scale className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {comparisonData.detection_ratio_viirs_to_modis}x
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            VIIRS ({comparisonData.viirs_total_detections.toLocaleString()}) vs MODIS ({comparisonData.modis_total_detections.toLocaleString()})
          </div>
        </div>

        {/* Spatial Resolution Area Ratio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Spatial Footprint Ratio</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            7.14x
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            1.0 km² (MODIS) vs 0.14 km² (VIIRS 375m)
          </div>
        </div>

        {/* Coincident Overpass Validation Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Coincident Overpass Rate</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {comparisonData.coincident_overlap_percentage}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {comparisonData.coincident_clusters_count} clusters verified by both sensors
          </div>
        </div>

        {/* Mean FRP per Pixel */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Mean FRP / Detection</span>
            <Zap className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            <span className="text-amber-400">{comparisonData.modis_mean_frp_per_detection} MW</span>
            <span className="text-slate-500 mx-1.5">vs</span>
            <span className="text-red-400">{comparisonData.viirs_mean_frp_per_detection} MW</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            MODIS vs VIIRS (VIIRS detects cooler sub-pixel spots)
          </div>
        </div>

      </div>

      {/* Visual Resolution Comparison Sandbox */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Eye className="w-5 h-5 text-amber-500" />
          Visual Resolution Footprint Simulation: Why Naive Summing Fails
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Below is a physical representation of the same 1 square kilometer fire front. While MODIS records <strong className="text-amber-400">1 hotspot pixel</strong>, VIIRS's 375m spatial resolution detects up to <strong className="text-red-400">7 individual sub-pixels</strong> along the active burning perimeter. Summing them as 8 independent fires would artificially inflate the fire count by 800%!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* MODIS 1km Footprint */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center space-y-3">
            <div className="flex items-center justify-between w-full text-xs">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Satellite className="w-4 h-4" /> MODIS Nadir Footprint
              </span>
              <span className="text-slate-400 font-mono">1 detection (1000m x 1000m)</span>
            </div>
            
            {/* 1 large pixel box */}
            <div className="w-48 h-48 rounded-lg bg-amber-500/20 border-2 border-dashed border-amber-400 flex items-center justify-center p-2 relative shadow-inner">
              <div className="w-full h-full bg-amber-500/30 rounded flex flex-col items-center justify-center text-center p-2">
                <span className="text-xs font-bold text-amber-200">Single MODIS Pixel</span>
                <span className="text-[11px] text-amber-300 font-mono">Area: 1.0 km²</span>
                <span className="text-[10px] text-amber-400/80 mt-1">Averages total thermal radiance</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              Covers 1.0 km² at nadir; expands up to 9.0 km² at swath edge due to bow-tie distortion.
            </div>
          </div>

          {/* VIIRS 375m Footprint */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center space-y-3">
            <div className="flex items-center justify-between w-full text-xs">
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <Satellite className="w-4 h-4" /> VIIRS 375m I-Band Grid
              </span>
              <span className="text-slate-400 font-mono">7+ sub-pixel detections (375m each)</span>
            </div>

            {/* Subdivided 375m grid */}
            <div className="w-48 h-48 rounded-lg bg-red-950/20 border-2 border-dashed border-red-500/40 p-1 grid grid-cols-3 gap-1 relative shadow-inner">
              {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                <div key={num} className="bg-red-500/40 border border-red-400/80 rounded flex flex-col items-center justify-center text-[10px] font-mono text-white">
                  <span>V{num}</span>
                  <span className="text-[9px] text-red-200">0.14 km²</span>
                </div>
              ))}
              <div className="bg-slate-900/40 border border-slate-800 rounded flex items-center justify-center text-[10px] text-slate-600">
                cooler
              </div>
              <div className="bg-slate-900/40 border border-slate-800 rounded flex items-center justify-center text-[10px] text-slate-600">
                unburned
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center">
              Maintains ~0.14 km² pixel area across swath using 3:1 onboard pixel aggregation.
            </div>
          </div>

        </div>
      </div>

      {/* Comparison Charts: Diurnal & Confidence Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Diurnal (Day vs Night) Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Satellite className="w-5 h-5 text-cyan-400" />
            Diurnal Observation Distribution (Day vs. Night)
          </h3>
          <p className="text-xs text-slate-400">
            Terra (~10:30) and Aqua (~13:30) vs Suomi-NPP (~13:30) and NOAA-20 (~13:20).
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diurnalChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="period" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="MODIS" name="MODIS (1 km)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="VIIRS" name="VIIRS (375 m)" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confidence Categorization Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
            Confidence Distribution Breakdown
          </h3>
          <p className="text-xs text-slate-400">
            Harmonized categorization mapping continuous MODIS (0-100%) and categorical VIIRS (l/n/h).
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="level" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="MODIS" name="MODIS (1 km)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="VIIRS" name="VIIRS (375 m)" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Scientific Insights Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Sensor Harmonization Principles & Scientific Findings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {comparisonData.scientific_insights.map((insight, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed space-y-1">
              <div className="font-semibold text-amber-400 flex items-center gap-1.5 text-xs">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-mono flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                Principle {idx + 1}
              </div>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

