import React, { useState, useMemo } from 'react';
import { CalendarDaySummary, MonthlySummary } from '../services/api';
import { Calendar, Flame, AlertTriangle, Info, TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';

interface CalendarViewProps {
  dailyData: CalendarDaySummary[];
  monthlyData: MonthlySummary[];
  isLoading: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  dailyData,
  monthlyData,
  isLoading
}) => {
  const [selectedDay, setSelectedDay] = useState<CalendarDaySummary | null>(null);

  // Default to selecting the first unusual day or the highest activity day
  useMemo(() => {
    if (dailyData.length > 0 && !selectedDay) {
      const unusual = dailyData.find(d => d.is_unusual_activity);
      if (unusual) {
        setSelectedDay(unusual);
      } else {
        const peak = [...dailyData].sort((a, b) => b.harmonized_fire_pixel_equivalent - a.harmonized_fire_pixel_equivalent)[0];
        setSelectedDay(peak);
      }
    }
  }, [dailyData, selectedDay]);

  // Group dailyData by Year-Month
  const monthsMap = useMemo(() => {
    const map = new Map<string, CalendarDaySummary[]>();
    dailyData.forEach((day) => {
      const ym = day.date.substring(0, 7);
      if (!map.has(ym)) map.set(ym, []);
      map.get(ym)!.push(day);
    });
    return map;
  }, [dailyData]);

  const getActivityColor = (level: string, isUnusual: boolean) => {
    if (isUnusual) return 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-1 ring-offset-slate-900 shadow-lg shadow-red-500/50';
    switch (level) {
      case 'extreme': return 'bg-orange-600 text-white shadow-sm shadow-orange-600/40';
      case 'elevated': return 'bg-amber-600 text-white';
      case 'moderate': return 'bg-amber-500/80 text-slate-900';
      case 'low': return 'bg-blue-600/60 text-slate-100';
      default: return 'bg-slate-800 text-slate-500 hover:bg-slate-700';
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center bg-slate-900 rounded-2xl border border-slate-800">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading Burning Activity Calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Monthly Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {monthlyData.map((m) => (
          <div key={m.year_month} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold text-white text-sm">{m.month_name}</span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
                {m.days_with_activity} active days
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-400">Harmonized Eq:</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {m.total_harmonized_equivalent.toLocaleString()} eq. px
                </span>
              </div>

              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-400">Total FRP:</span>
                <span className="font-mono text-red-400 font-medium">
                  {m.total_frp_mw.toLocaleString()} MW
                </span>
              </div>

              <div className="flex justify-between items-baseline text-xs">
                <span className="text-slate-400">VIIRS:MODIS Ratio:</span>
                <span className="font-mono text-cyan-400 font-semibold">
                  {m.viirs_to_modis_ratio}x
                </span>
              </div>

              {m.unusual_days_count > 0 && (
                <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{m.unusual_days_count} statistical anomaly day(s)</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Calendar Matrix & Detailed Inspector Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Calendar Heatmap */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-white">Historical Burning Activity Calendar</h2>
            </div>
            
            {/* Color Scale Legend */}
            <div className="flex items-center space-x-2 text-[10px] text-slate-400">
              <span>Low</span>
              <div className="flex space-x-1">
                <span className="w-3 h-3 rounded bg-blue-600/60" title="Low" />
                <span className="w-3 h-3 rounded bg-amber-500/80" title="Moderate" />
                <span className="w-3 h-3 rounded bg-amber-600" title="Elevated" />
                <span className="w-3 h-3 rounded bg-orange-600" title="Extreme" />
                <span className="w-3 h-3 rounded bg-red-500 ring-1 ring-red-300" title="Unusual Activity (+2.0σ Baseline Anomaly)" />
              </div>
              <span>Extreme</span>
            </div>
          </div>

          {/* Month Blocks */}
          <div className="space-y-6">
            {Array.from(monthsMap.entries()).map(([ym, days]) => {
              const monthTitle = new Date(`${ym}-01T00:00:00Z`).toLocaleString('default', { month: 'long', year: 'numeric' });
              return (
                <div key={ym} className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{monthTitle}</h3>
                  <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1.5">
                    {days.map((day) => {
                      const dayNum = parseInt(day.date.split('-')[2], 10);
                      const isSelected = selectedDay?.date === day.date;
                      return (
                        <button
                          key={day.date}
                          onClick={() => setSelectedDay(day)}
                          className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-medium transition cursor-pointer ${getActivityColor(day.activity_level, day.is_unusual_activity)} ${
                            isSelected ? 'ring-2 ring-white scale-105 z-10' : 'hover:scale-105'
                          }`}
                          title={`${day.date}: ${day.harmonized_fire_pixel_equivalent} HFPE, ${day.total_frp_mw} MW FRP`}
                        >
                          <span className="text-[11px] font-mono">{dayNum}</span>
                          {day.is_unusual_activity && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-300 rounded-full border border-slate-900 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Click any calendar day to inspect sensor counts, cross-sensor coincident overpass validation, and statistical Z-score baseline metrics.
            </span>
          </div>
        </div>

        {/* Right Col: Selected Day Inspector & Scientific Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider">Day Breakdown</span>
                  <h3 className="text-lg font-bold text-white">{selectedDay.date}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  selectedDay.is_unusual_activity
                    ? 'bg-red-900/50 text-red-300 border border-red-700/60'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  {selectedDay.activity_level}
                </span>
              </div>

              {/* Unusual Activity Analytical Flag Banner */}
              {selectedDay.is_unusual_activity && (
                <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Unusual Thermal Activity (Analytical Flag)</span>
                  </div>
                  <p className="text-[11px] text-red-200/90 leading-relaxed">
                    Observed Fire Radiative Power reached <strong className="text-white">{selectedDay.total_frp_mw} MW</strong>, representing a statistical deviation of <strong className="text-white">+{selectedDay.z_score}σ</strong> above the 14-day rolling baseline mean ({selectedDay.baseline_mean_frp} MW).
                  </p>
                  <p className="text-[10px] text-red-400/80 italic pt-1 border-t border-red-900/40">
                    * Analytical observation indicator only. Not a fire forecast or spread prediction.
                  </p>
                </div>
              )}

              {/* Key Metrics Comparison (Harmonized vs Naive Sum) */}
              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Harmonized Fire Pixel Eq:</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">
                      {selectedDay.harmonized_fire_pixel_equivalent} eq. px
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Harmonized Fire Clusters:</span>
                    <span className="font-bold text-purple-400 font-mono">
                      {selectedDay.harmonized_clusters_count} events
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Total FRP:</span>
                    <span className="font-bold text-red-400 font-mono">
                      {selectedDay.total_frp_mw} MW
                    </span>
                  </div>
                </div>

                {/* Raw Sensor Breakdown */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                  <div className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                    Raw Sensor Detections
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-300">MODIS (1 km):</span>
                    <span className="font-mono text-white font-semibold">{selectedDay.raw_modis_count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-400">VIIRS (375 m):</span>
                    <span className="font-mono text-white font-semibold">{selectedDay.raw_viirs_count}</span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-slate-400">Naive Addition Sum:</span>
                    <span className="font-mono text-slate-400 line-through">
                      {selectedDay.total_raw_detections}
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Harmonization eliminated {Math.max(0, Math.round(selectedDay.total_raw_detections - selectedDay.harmonized_fire_pixel_equivalent))} double-counted pixels!
                    </span>
                  </div>
                </div>

                {/* Coincident Overpasses */}
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Coincident Overpass Events:</span>
                    <span className="font-mono text-purple-300 font-bold">{selectedDay.coincident_clusters_count}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Simultaneous afternoon overpass by Aqua (MODIS) and Suomi-NPP / NOAA-20 (VIIRS).
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a calendar day to view details
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

