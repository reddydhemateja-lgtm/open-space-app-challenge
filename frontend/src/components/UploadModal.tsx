import React, { useState } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Download, Radio, Key, Globe } from 'lucide-react';
import { uploadCsvFile, fetchFromFirmsApi } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'live_api'>('upload');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any>(null);

  // Live NASA API state
  const [mapKey, setMapKey] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('USA');
  const [dayRange, setDayRange] = useState<number>(1);
  const [isFetchingApi, setIsFetchingApi] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccessInfo(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a NASA FIRMS CSV file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const res = await uploadCsvFile(file);
      setSuccessInfo(res);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to parse and harmonize CSV.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLiveApiFetch = async () => {
    if (!mapKey.trim()) {
      setError('Please enter your NASA FIRMS MAP_KEY.');
      return;
    }

    setIsFetchingApi(true);
    setError(null);
    setSuccessInfo(null);

    try {
      const res = await fetchFromFirmsApi(mapKey.trim(), countryCode, dayRange);
      setSuccessInfo(res);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live NASA FIRMS data.');
    } finally {
      setIsFetchingApi(false);
    }
  };

  const downloadSampleCsv = () => {
    const sampleCsv = `latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
40.1245,-121.3412,328.4,1.1,1.0,2024-08-15,1030,T,MODIS,85,6.1N,295.2,34.5,D
40.1288,-121.3456,332.1,1.2,1.1,2024-08-15,1330,A,MODIS,92,6.1N,298.0,42.0,D
40.1260,-121.3430,338.5,0.38,0.38,2024-08-15,1332,N,VIIRS,high,2.0NRT,301.2,12.8,D
40.1275,-121.3445,341.2,0.38,0.38,2024-08-15,1332,N,VIIRS,high,2.0NRT,302.1,14.2,D
40.1290,-121.3460,336.8,0.38,0.38,2024-08-15,1332,N,VIIRS,nominal,2.0NRT,299.5,9.5,D
40.1305,-121.3475,334.0,0.38,0.38,2024-08-15,1332,N,VIIRS,nominal,2.0NRT,298.0,8.1,D
40.1270,-121.3440,305.2,0.38,0.38,2024-08-15,2230,N,VIIRS,nominal,2.0NRT,290.4,4.5,N
`;
    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nasa_firms_sample_coincident.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Ingest Real NASA Observations</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector: CSV File vs Live NASA API */}
        <div className="flex space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition ${
              activeMode === 'upload' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Real NASA CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('live_api')}
            className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-1.5 transition ${
              activeMode === 'live_api' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live NASA FIRMS API</span>
          </button>
        </div>

        {activeMode === 'upload' ? (
          <>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload any official CSV downloaded from <a href="https://firms.modaps.eosdis.nasa.gov/download/" target="_blank" rel="noreferrer" className="text-blue-400 underline">NASA FIRMS</a> containing active fire detections from MODIS (Terra/Aqua) and/or VIIRS (Suomi-NPP/NOAA-20/21). The harmonizer will automatically standardize formats and cluster co-detections.
            </p>

            {/* File Dropzone Area */}
            <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center transition bg-slate-950/60">
              <input
                type="file"
                id="csv-upload-input"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="csv-upload-input" className="cursor-pointer flex flex-col items-center space-y-2">
                <FileText className="w-10 h-10 text-slate-500" />
                <span className="text-xs font-semibold text-slate-200">
                  {file ? file.name : 'Click to select or drag and drop NASA FIRMS CSV'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard NASA FIRMS CSV / TXT format'}
                </span>
              </label>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed">
              Query live Near-Real-Time (NRT) satellite passes directly from NASA FIRMS servers using your free NASA MAP_KEY.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-400" /> NASA FIRMS MAP_KEY:
                </label>
                <input
                  type="text"
                  placeholder="e.g. 32-character key from firms.modaps.eosdis.nasa.gov"
                  value={mapKey}
                  onChange={(e) => setMapKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs font-mono focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Get a free key in 30 seconds at <a href="https://firms.modaps.eosdis.nasa.gov/api/map_key/" target="_blank" rel="noreferrer" className="text-amber-400 underline">firms.modaps.eosdis.nasa.gov/api/map_key/</a>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1 flex items-center gap-1">
                    <Globe className="w-3 h-3 text-cyan-400" /> Country Code (ISO3):
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value="USA">USA (United States)</option>
                    <option value="CAN">CAN (Canada)</option>
                    <option value="AUS">AUS (Australia)</option>
                    <option value="BRA">BRA (Brazil / Amazon)</option>
                    <option value="GRC">GRC (Greece)</option>
                    <option value="ESP">ESP (Spain)</option>
                    <option value="IDN">IDN (Indonesia)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Lookback Days:</label>
                  <select
                    value={dayRange}
                    onChange={(e) => setDayRange(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none"
                  >
                    <option value={1}>Last 24 Hours</option>
                    <option value={2}>Last 48 Hours</option>
                    <option value={5}>Last 5 Days</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successInfo && (
          <div className="bg-emerald-950/50 border border-emerald-800 rounded-lg p-3 text-xs text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successInfo.message}</span>
            </div>
            <div className="text-[11px] text-emerald-200/80">
              Parsed: {successInfo.records_parsed || successInfo.records_count} detections | Harmonized: {successInfo.records_harmonized || successInfo.clusters_count} clusters
            </div>
          </div>
        )}

        {/* Sample Download & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample FIRMS CSV</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            {activeMode === 'upload' ? (
              <button
                onClick={handleUpload}
                disabled={isUploading || !file}
                className={`px-4 py-1.5 rounded-lg font-medium text-white shadow-sm transition ${
                  isUploading || !file
                    ? 'bg-blue-600/50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {isUploading ? 'Harmonizing...' : 'Upload & Process'}
              </button>
            ) : (
              <button
                onClick={handleLiveApiFetch}
                disabled={isFetchingApi || !mapKey.trim()}
                className={`px-4 py-1.5 rounded-lg font-medium text-white shadow-sm transition ${
                  isFetchingApi || !mapKey.trim()
                    ? 'bg-amber-600/50 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {isFetchingApi ? 'Fetching Space Data...' : 'Query NASA Live'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
