import React from 'react';
import { AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { AnomalySummary } from '../services/api';

interface UnusualActivityBadgeProps {
  anomalies: AnomalySummary[];
  onSelectDate?: (date: string) => void;
}

export const UnusualActivityBadge: React.FC<UnusualActivityBadgeProps> = ({
  anomalies,
  onSelectDate
}) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          <span>Thermal Activity Within Normal 14-Day Baseline Ranges (&lt; +2.0σ)</span>
        </span>
        <span className="text-[11px] text-slate-500 italic">Analytical Indicator</span>
      </div>
    );
  }

  const latest = anomalies[anomalies.length - 1];

  return (
    <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 shadow-xl backdrop-blur space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-red-800/60 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                Analytical Observation Flag
              </span>
              <span className="text-[10px] font-semibold bg-red-900/60 text-red-200 border border-red-700 px-2 py-0.5 rounded">
                Statistical Anomaly ({anomalies.length} days detected)
              </span>
            </div>
            <h4 className="text-sm font-bold text-white">
              Elevated Thermal Activity Exceeding Historical Baseline
            </h4>
          </div>
        </div>

        {/* Quick jump to date button */}
        {onSelectDate && (
          <button
            onClick={() => onSelectDate(latest.date)}
            className="text-xs font-medium text-red-300 hover:text-white bg-red-900/40 hover:bg-red-800/50 border border-red-700/60 px-3 py-1.5 rounded-lg transition"
          >
            Inspect Peak Day ({latest.date})
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-950/70 border border-red-900/40 rounded-xl p-2.5">
          <span className="text-slate-400 block text-[11px]">Latest Deviation (Z-score):</span>
          <span className="text-base font-bold text-red-400 font-mono">
            +{latest.z_score}σ
          </span>
          <span className="text-[10px] text-slate-500 block">Threshold: +2.0σ</span>
        </div>

        <div className="bg-slate-950/70 border border-red-900/40 rounded-xl p-2.5">
          <span className="text-slate-400 block text-[11px]">Observed Thermal Radiance:</span>
          <span className="text-base font-bold text-white font-mono">
            {latest.observed_frp_mw.toLocaleString()} MW
          </span>
          <span className="text-[10px] text-slate-500 block">vs Baseline: {latest.baseline_mean_frp_mw.toFixed(1)} MW</span>
        </div>

        <div className="bg-slate-950/70 border border-red-900/40 rounded-xl p-2.5">
          <span className="text-slate-400 block text-[11px]">Harmonized Fire Clusters:</span>
          <span className="text-base font-bold text-purple-400 font-mono">
            {latest.harmonized_clusters} cluster events
          </span>
          <span className="text-[10px] text-slate-500 block">Cross-sensor verified</span>
        </div>
      </div>

      {/* Mandatory Scientific Disclaimer */}
      <div className="text-[11px] text-red-300/80 bg-red-950/60 border border-red-900/50 rounded-lg p-2.5 flex items-start gap-2">
        <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong>Scientific Notice:</strong> This analytical flag indicates an empirical statistical deviation from the rolling 14-day historical baseline. It is strictly an observational statistic reflecting detected thermal emission, <strong>NOT a prediction or wildfire spread forecast</strong>. Satellite observations reflect thermal anomalies, which may include agricultural fires, prescribed burns, or industrial sources.
        </span>
      </div>
    </div>
  );
};

