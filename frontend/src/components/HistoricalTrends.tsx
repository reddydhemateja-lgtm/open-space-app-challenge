import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Area
} from 'recharts';
import { CalendarDaySummary, MonthlySummary } from '../services/api';
import { TrendingUp, AlertTriangle, ShieldCheck, Flame, BarChart2 } from 'lucide-react';

interface HistoricalTrendsProps {
  dailyData: CalendarDaySummary[];
  monthlyData: MonthlySummary[];
  isLoading: boolean;
}

export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({
  dailyData,
  monthlyData,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Rendering Historical Charts...</span>
        </div>
      </div>
    );
  }

  // Pre-calculate statistical summary metrics
  const totalHarmonized = dailyData.reduce((acc, d) => acc + d.harmonized_fire_pixel_equivalent, 0);
  const totalNaive = dailyData.reduce((acc, d) => acc + d.total_raw_detections, 0);
  const totalDoubleCountPrevented = Math.max(0, Math.round(totalNaive - totalHarmonized));
  const peakFRPDay = [...dailyData].sort((a, b) => b.total_frp_mw - a.total_frp_mw)[0];
  const anomalyDaysCount = dailyData.filter(d => d.is_unusual_activity).length;

  return (
    <div className="space-y-6">
      
      {/* Top Statistical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Harmonized Equivalent</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {Math.round(totalHarmonized).toLocaleString()} <span className="text-xs font-sans text-amber-400">eq. px</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Reconciles 1km and 375m footprints
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Naive Sum Overcount</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400 font-mono">
            {totalNaive.toLocaleString()} <span className="text-xs font-sans text-slate-500">raw pts</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Eliminated {totalDoubleCountPrevented.toLocaleString()} duplicate pixels</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Peak Burning Event</span>
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {peakFRPDay ? `${peakFRPDay.total_frp_mw.toLocaleString()} MW` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Date: {peakFRPDay ? peakFRPDay.date : 'N/A'}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="text-xs text-slate-400 mb-1 flex items-center justify-between">
            <span>Analytical Anomalies</span>
            <BarChart2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {anomalyDaysCount} <span className="text-xs font-sans text-slate-400">days</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Exceeded +2.0σ rolling baseline
          </div>
        </div>
      </div>

      {/* Chart 1: Harmonization vs Naive Summation (Visual Proof of Double Counting Prevention) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Harmonization vs. Naive Summation (Double-Counting Prevention)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Notice how naive addition (<span className="text-orange-400 font-semibold">orange line</span>) severely over-estimates burning footprint compared to harmonized equivalent (<span className="text-emerald-400 font-semibold">green area</span>).
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val: any, name: any) => [val, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              
              {/* Naive addition line */}
              <Line
                type="monotone"
                dataKey="total_raw_detections"
                name="Naive Raw Sum (MODIS + VIIRS)"
                stroke="#F97316"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Harmonized Fire Pixel Equivalent */}
              <Area
                type="monotone"
                dataKey="harmonized_fire_pixel_equivalent"
                name="Harmonized Equivalent (HFPE)"
                fill="#10B981"
                fillOpacity={0.25}
                stroke="#10B981"
                strokeWidth={2}
              />

              {/* Harmonized Clusters */}
              <Line
                type="monotone"
                dataKey="harmonized_clusters_count"
                name="Unique Harmonized Clusters"
                stroke="#A855F7"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Fire Radiative Power (MW) and 14-Day Rolling Baseline Envelope */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Fire Radiative Power (FRP) & Historical Statistical Baseline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily observed FRP (<span className="text-red-400 font-semibold">bars</span>) compared against 14-day rolling mean (<span className="text-cyan-400 font-semibold">cyan line</span>) and analytical anomaly threshold (+2.0σ).
            </p>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" MW" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                formatter={(val: any, name: any) => [`${val} MW`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

              {/* Observed FRP */}
              <Bar
                dataKey="total_frp_mw"
                name="Observed FRP (MW)"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />

              {/* Baseline Mean */}
              <Line
                type="monotone"
                dataKey="baseline_mean_frp"
                name="14-Day Baseline Mean (μ)"
                stroke="#06B6D4"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};

