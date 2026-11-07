import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { MapView } from './components/MapView';
import { CalendarView } from './components/CalendarView';
import { HistoricalTrends } from './components/HistoricalTrends';
import { SensorComparison } from './components/SensorComparison';
import { MethodologySection } from './components/MethodologySection';
import { UnusualActivityBadge } from './components/UnusualActivityBadge';
import { UploadModal } from './components/UploadModal';
import {
  fetchHealth,
  fetchMetadata,
  fetchDetections,
  fetchClusters,
  fetchDailyCalendar,
  fetchMonthlySummary,
  fetchAnomalies,
  fetchComparison,
  resetToDemo,
  loadPreset,
  DatasetMetadata,
  HarmonizedDetection,
  HarmonizedCluster,
  CalendarDaySummary,
  MonthlySummary,
  AnomalySummary,
  SensorComparisonSummary
} from './services/api';
import { AlertCircle, RefreshCw, Satellite } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('map');
  const [isHealthOk, setIsHealthOk] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Core Data States
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [detections, setDetections] = useState<HarmonizedDetection[]>([]);
  const [clusters, setClusters] = useState<HarmonizedCluster[]>([]);
  const [dailyData, setDailyData] = useState<CalendarDaySummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalySummary[]>([]);
  const [comparison, setComparison] = useState<SensorComparisonSummary | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Filters State
  const [filters, setFilters] = useState<{
    startDate: string;
    endDate: string;
    sensor: string;
    confidence: string;
    daynight: string;
    viewLayer: 'clusters' | 'raw' | 'both';
  }>({
    startDate: '',
    endDate: '',
    sensor: 'ALL',
    confidence: 'ALL',
    daynight: 'ALL',
    viewLayer: 'clusters'
  });

  // Initial Load & Health Check
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Health check
      await fetchHealth();
      setIsHealthOk(true);

      // 2. Fetch metadata
      const meta = await fetchMetadata();
      setMetadata(meta);

      // Initialize filter dates from metadata
      if (meta.date_range_start && meta.date_range_end) {
        setFilters(prev => ({
          ...prev,
          startDate: meta.date_range_start,
          endDate: meta.date_range_end
        }));
      }

      // 3. Parallel fetch of core harmonized series
      const [dailyRes, monthlyRes, anomRes, compRes] = await Promise.all([
        fetchDailyCalendar(meta.date_range_start, meta.date_range_end),
        fetchMonthlySummary(),
        fetchAnomalies(),
        fetchComparison()
      ]);

      setDailyData(dailyRes);
      setMonthlyData(monthlyRes);
      setAnomalies(anomRes);
      setComparison(compRes);

      // 4. Fetch initial spatial detections and clusters
      const [detRes, clustRes] = await Promise.all([
        fetchDetections({ limit: 1500 }),
        fetchClusters()
      ]);

      setDetections(detRes.detections);
      setClusters(clustRes.clusters);

    } catch (err: any) {
      console.error('Initialization error:', err);
      setIsHealthOk(false);
      setErrorMessage(err.message || 'Unable to connect to NASA Harmonization backend.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Filter Updates for Map and Detections
  useEffect(() => {
    if (!metadata) return;

    let isMounted = true;

    const applyFilters = async () => {
      try {
        const [detRes, clustRes, dailyRes] = await Promise.all([
          fetchDetections({
            start_date: filters.startDate || undefined,
            end_date: filters.endDate || undefined,
            sensor: filters.sensor,
            confidence: filters.confidence,
            daynight: filters.daynight,
            limit: 2000
          }),
          fetchClusters({
            start_date: filters.startDate || undefined,
            end_date: filters.endDate || undefined
          }),
          fetchDailyCalendar(filters.startDate || undefined, filters.endDate || undefined)
        ]);

        if (isMounted) {
          setDetections(detRes.detections);
          setClusters(clustRes.clusters);
          setDailyData(dailyRes);
        }
      } catch (err) {
        console.error('Filter update error:', err);
      }
    };

    const timeout = setTimeout(applyFilters, 150);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [filters, metadata]);

  // Reset to Demo Benchmark
  const handleResetDemo = async () => {
    try {
      setIsLoading(true);
      await resetToDemo();
      await loadInitialData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset dataset.');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to Real NASA Dataset Preset
  const handleSelectPreset = async (presetId: string) => {
    try {
      setIsLoading(true);
      if (presetId === 'demo_california') {
        await resetToDemo();
      } else {
        await loadPreset(presetId);
      }
      await loadInitialData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load dataset preset.');
    } finally {
      setIsLoading(false);
    }
  };

  // Jump to peak day on calendar tab
  const handleSelectAnomalyDate = (date: string) => {
    setActiveTab('calendar');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        metadata={metadata}
        onOpenUpload={() => setIsUploadOpen(true)}
        onReset={handleResetDemo}
        onSelectPreset={handleSelectPreset}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Backend Connection Error Alert */}
        {isHealthOk === false && (
          <div className="bg-red-950/60 border border-red-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <h4 className="font-bold text-red-200 text-sm">Backend Service Unreachable</h4>
                <p className="text-xs text-red-300/80">{errorMessage || 'FastAPI service on http://127.0.0.1:8000 is not running.'}</p>
              </div>
            </div>
            <button
              onClick={loadInitialData}
              className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs font-medium text-white transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        )}

        {/* Global Statistical Unusual Activity Indicator Banner */}
        <UnusualActivityBadge
          anomalies={anomalies}
          onSelectDate={handleSelectAnomalyDate}
        />

        {/* Filters Bar (visible on Map and Calendar tabs) */}
        {(activeTab === 'map' || activeTab === 'calendar' || activeTab === 'trends') && (
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            minDate={metadata?.date_range_start || '2024-07-15'}
            maxDate={metadata?.date_range_end || '2024-10-15'}
            totalDetections={detections.length}
            totalClusters={clusters.length}
          />
        )}

        {/* Tab 1: Interactive Map View */}
        {activeTab === 'map' && (
          <MapView
            detections={detections}
            clusters={clusters}
            bounds={metadata?.geographic_bounds}
            viewLayer={filters.viewLayer}
            isLoading={isLoading}
          />
        )}

        {/* Tab 2: Burning Activity Calendar */}
        {activeTab === 'calendar' && (
          <CalendarView
            dailyData={dailyData}
            monthlyData={monthlyData}
            isLoading={isLoading}
          />
        )}

        {/* Tab 3: Historical Trends & Recharts Analysis */}
        {activeTab === 'trends' && (
          <HistoricalTrends
            dailyData={dailyData}
            monthlyData={monthlyData}
            isLoading={isLoading}
          />
        )}

        {/* Tab 4: MODIS vs VIIRS Deep Dive */}
        {activeTab === 'comparison' && (
          <SensorComparison
            comparisonData={comparison}
            isLoading={isLoading}
          />
        )}

        {/* Tab 5: Methodology & Science Documentation */}
        {activeTab === 'methodology' && (
          <MethodologySection />
        )}

      </main>

      {/* CSV Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          setIsUploadOpen(false);
          loadInitialData();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Satellite className="w-4 h-4 text-slate-400" />
            <span>NASA Space Apps Challenge 2026: Harmonization of MODIS & VIIRS Hot Spots</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Thermal anomaly observations courtesy of NASA Earth Observing System (EOS) & Suomi-NPP / JPSS FIRMS.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
