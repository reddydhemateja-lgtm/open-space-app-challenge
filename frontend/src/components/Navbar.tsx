import React from 'react';
import { Flame, Satellite, Upload, RotateCcw, AlertTriangle, ShieldCheck, Database, Radio } from 'lucide-react';
import { DatasetMetadata } from '../services/api';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  metadata: DatasetMetadata | null;
  onOpenUpload: () => void;
  onReset: () => void;
  onSelectPreset: (presetId: string) => void;
  isLoading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  metadata,
  onOpenUpload,
  onReset,
  onSelectPreset,
  isLoading
}) => {
  const tabs = [
    { id: 'map', label: 'Interactive Map' },
    { id: 'calendar', label: 'Burning Calendar' },
    { id: 'trends', label: 'Historical Trends' },
    { id: 'comparison', label: 'MODIS vs VIIRS' },
    { id: 'methodology', label: 'Methodology & Science' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & NASA Challenge Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-red-950/40">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                  NASA Space Apps 2026
                </span>
                <span className="text-xs text-slate-400 font-mono">MODIS & VIIRS Harmonization</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Satellite Hotspot Harmonization Platform
              </h1>
            </div>
          </div>

          {/* Real Dataset Switcher Selector */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400 font-medium">Dataset:</span>
            <select
              value={metadata?.is_demonstration_data ? 'demo_california' : (metadata?.dataset_name.includes('Dixie') ? 'nasa_dixie' : (metadata?.dataset_name.includes('Canada') ? 'nasa_canada' : 'custom'))}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer max-w-[260px] truncate"
            >
              <option value="demo_california" className="bg-slate-900 text-amber-400">
                🟡 Demo Benchmark (Simulated Fire Season)
              </option>
              <option value="nasa_dixie" className="bg-slate-900 text-emerald-400 font-bold">
                🟢 Real NASA FIRMS: Dixie Fire (Aug 2021)
              </option>
              <option value="nasa_canada" className="bg-slate-900 text-emerald-400 font-bold">
                🟢 Real NASA FIRMS: Canada Boreal (June 2023)
              </option>
              {!metadata?.is_demonstration_data && !metadata?.dataset_name.includes('Dixie') && !metadata?.dataset_name.includes('Canada') && (
                <option value="custom" className="bg-slate-900 text-cyan-400 font-bold">
                  🟢 User Uploaded / Live NASA Feed
                </option>
              )}
            </select>
          </div>

          {/* Action Buttons: Upload CSV & Reset */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition shadow-sm"
              title="Upload custom NASA FIRMS CSV dataset or connect live NASA API"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload / Live API</span>
            </button>
            <button
              onClick={onReset}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
              title="Reset to benchmark demonstration dataset"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-800/80 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 font-semibold shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
