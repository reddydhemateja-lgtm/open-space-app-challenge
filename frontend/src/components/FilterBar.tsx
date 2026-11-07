import React from 'react';
import { Filter, Calendar, Layers, SlidersHorizontal } from 'lucide-react';

interface FilterState {
  startDate: string;
  endDate: string;
  sensor: string;
  confidence: string;
  daynight: string;
  viewLayer: 'clusters' | 'raw' | 'both';
}

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  minDate: string;
  maxDate: string;
  totalDetections: number;
  totalClusters: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  minDate,
  maxDate,
  totalDetections,
  totalClusters
}) => {
  const handleReset = () => {
    setFilters({
      startDate: minDate,
      endDate: maxDate,
      sensor: 'ALL',
      confidence: 'ALL',
      daynight: 'ALL',
      viewLayer: 'clusters'
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-4 shadow-lg backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold pr-2 border-r border-slate-800">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>Harmonization Filters</span>
          </div>

          {/* Date Range Start & End */}
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={filters.startDate}
              min={minDate}
              max={filters.endDate || maxDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={filters.endDate}
              min={filters.startDate || minDate}
              max={maxDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs"
            />
          </div>

          {/* Sensor Select */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-slate-400">Sensor:</span>
            <select
              value={filters.sensor}
              onChange={(e) => setFilters(prev => ({ ...prev, sensor: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-medium"
            >
              <option value="ALL" className="bg-slate-900">All Sensors (Harmonized)</option>
              <option value="MODIS" className="bg-slate-900">MODIS Only (1 km)</option>
              <option value="VIIRS" className="bg-slate-900">VIIRS Only (375 m)</option>
            </select>
          </div>

          {/* Confidence Select */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-slate-400">Confidence:</span>
            <select
              value={filters.confidence}
              onChange={(e) => setFilters(prev => ({ ...prev, confidence: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-medium"
            >
              <option value="ALL" className="bg-slate-900">All Confidence Levels</option>
              <option value="nominal" className="bg-slate-900">Nominal & High</option>
              <option value="high" className="bg-slate-900">High Confidence Only</option>
            </select>
          </div>

          {/* Day / Night Select */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <span className="text-slate-400">Pass:</span>
            <select
              value={filters.daynight}
              onChange={(e) => setFilters(prev => ({ ...prev, daynight: e.target.value }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-medium"
            >
              <option value="ALL" className="bg-slate-900">Day & Night Passes</option>
              <option value="D" className="bg-slate-900">Daytime Passes</option>
              <option value="N" className="bg-slate-900">Nighttime Passes</option>
            </select>
          </div>

          {/* Map Layer Mode */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Layer:</span>
            <select
              value={filters.viewLayer}
              onChange={(e) => setFilters(prev => ({ ...prev, viewLayer: e.target.value as any }))}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer font-medium"
            >
              <option value="clusters" className="bg-slate-900">Harmonized Clusters (Recommended)</option>
              <option value="raw" className="bg-slate-900">Raw Sensor Detections</option>
              <option value="both" className="bg-slate-900">Both (Overlay Comparison)</option>
            </select>
          </div>
        </div>

        {/* Right: Summary Count & Clear Button */}
        <div className="flex items-center space-x-3">
          <div className="text-slate-400 font-mono">
            <span className="text-amber-400 font-bold">{totalClusters.toLocaleString()}</span> clusters |{' '}
            <span className="text-slate-300">{totalDetections.toLocaleString()}</span> detections
          </div>
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition px-2 py-1 rounded hover:bg-slate-800"
            title="Reset filters to full dataset range"
          >
            Reset
          </button>
        </div>

      </div>
    </div>
  );
};

