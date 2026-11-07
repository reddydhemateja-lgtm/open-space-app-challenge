import React, { useState, useEffect } from 'react';
import { fetchMethodology } from '../services/api';
import { BookOpen, Layers, ShieldCheck, AlertTriangle, Cpu, Globe2, HelpCircle } from 'lucide-react';

export const MethodologySection: React.FC = () => {
  const [methodology, setMethodology] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMethodology()
      .then((data) => {
        setMethodology(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Overview Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-500">
              NASA Earth Science Harmonization
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Harmonization Methodology & Scientific Principles
            </h2>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed">
          The 2026 NASA Space Apps Challenge task requires harmonizing NASA active fire data from two primary satellite instruments: <strong>MODIS</strong> (Moderate Resolution Imaging Spectroradiometer aboard Terra & Aqua) and <strong>VIIRS</strong> (Visible Infrared Imaging Radiometer Suite aboard Suomi-NPP & NOAA-20/21). This document explains why naive count summation is scientifically incorrect, details the spatial-temporal clustering algorithm, and outlines how observational uncertainties are quantified.
        </p>
      </div>

      {/* Why Naive Summing Fails Card */}
      <div className="bg-red-950/20 border border-red-900/60 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center space-x-2 text-red-400 font-bold text-base">
          <AlertTriangle className="w-5 h-5" />
          <h3>The Double-Counting Pitfall: Why Summing MODIS & VIIRS Is Scientifically Invalid</h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          A fundamental trap in satellite thermal anomaly analysis is adding raw MODIS and VIIRS detections together and reporting the result as "total fires". This introduces catastrophic scientific errors:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-amber-400">1. Spatial Resolution Mismatch</h4>
            <p className="text-slate-400 leading-relaxed">
              VIIRS I-Band pixels cover only <strong>0.14 km²</strong> (375m) at nadir, whereas MODIS pixels cover <strong>1.0 km²</strong> (1000m)—a <strong>7.14x area disparity</strong>. For the exact same physical fire front, VIIRS regularly produces 3 to 8 distinct hot-spot detections where MODIS records 1.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-red-400">2. Coincident Overpass Duplication</h4>
            <p className="text-slate-400 leading-relaxed">
              NASA Aqua (MODIS) and Suomi-NPP (VIIRS) orbit in the afternoon constellation, passing overhead within <strong>15 minutes of each other (~13:30 local)</strong>. Summing their detections treats one physical fire front as multiple independent fires.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-cyan-400">3. Artificial Historical Spike</h4>
            <p className="text-slate-400 leading-relaxed">
              MODIS data begins in 2000 (Terra) and 2002 (Aqua), while VIIRS began in late 2011. Plotting raw summed counts over 2000-2024 creates a massive artificial spike in 2012+ caused entirely by higher sensor resolution, not an increase in wildfires!
            </p>
          </div>
        </div>
      </div>

      {/* Sensor Optical & Geometric Specifications */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Sensor Instrument Specifications & Orbital Geometry
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4 font-bold">Specification</th>
                <th className="py-2.5 px-4 font-bold text-amber-400">NASA MODIS</th>
                <th className="py-2.5 px-4 font-bold text-red-400">NASA / NOAA VIIRS (375m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Spacecraft Platforms</td>
                <td className="py-2.5 px-4">Terra (EOS AM-1), Aqua (EOS PM-1)</td>
                <td className="py-2.5 px-4">Suomi-NPP, NOAA-20 (JPSS-1), NOAA-21</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Nominal Spatial Resolution</td>
                <td className="py-2.5 px-4 font-mono">1,000 m (1 km)</td>
                <td className="py-2.5 px-4 font-mono">375 m (I-Band)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Nadir Ground Pixel Area</td>
                <td className="py-2.5 px-4 font-mono">1.0 km²</td>
                <td className="py-2.5 px-4 font-mono">0.14 km²</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Swath Edge Pixel Growth</td>
                <td className="py-2.5 px-4">Expands up to ~9.0 km² (Bow-tie effect)</td>
                <td className="py-2.5 px-4">Constrained to ~0.35 km² (Onboard 3:1 aggregation)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Equatorial Overpass Times</td>
                <td className="py-2.5 px-4 font-mono">10:30 & 22:30 (Terra) | 13:30 & 01:30 (Aqua)</td>
                <td className="py-2.5 px-4 font-mono">13:30 & 01:30 (S-NPP) | 13:20 & 01:20 (NOAA-20)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Thermal Detection Channels</td>
                <td className="py-2.5 px-4">Channel 21/22 (3.96 µm) & 31 (11.0 µm)</td>
                <td className="py-2.5 px-4">I4 (3.74 µm) & I5 (11.45 µm)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-white">Confidence Reporting</td>
                <td className="py-2.5 px-4 font-mono">Continuous percentage (0% - 100%)</td>
                <td className="py-2.5 px-4 font-mono">Categorical ('low', 'nominal', 'high')</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* The 5-Step Harmonization Pipeline */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          The 5-Step Harmonization Algorithm
        </h3>

        <div className="space-y-4 text-xs text-slate-300">
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-amber-400 text-sm">Step 1: Schema & Temporal Standardization</h4>
            <p className="leading-relaxed">
              Raw NASA FIRMS CSV feeds are ingested and transformed into a standardized data model. Acquisition dates and times are unified into standard UTC ISO 8601 strings (<code className="text-amber-300">YYYY-MM-DDTHH:MM:SSZ</code>). Confidence metrics are normalized: MODIS 0-100% is categorized into low (&lt;30%), nominal (30-79%), and high (80-100%), matching VIIRS categorical reporting while preserving all original raw satellite fields.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-cyan-400 text-sm">Step 2: Spatio-Temporal Event Clustering</h4>
            <p className="leading-relaxed">
              Detections are clustered using a spatial proximity buffer of <strong>1.2 km</strong> (matching MODIS nadir scale) and grouped into diurnal overpass epochs (Morning AM: ~10:30, Afternoon PM: ~13:30, Night: ~01:30). Points within this buffer are consolidated into a single unified <strong>Harmonized Fire Cluster Event</strong>.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-emerald-400 text-sm">Step 3: Harmonized Fire Pixel Equivalent (HFPE)</h4>
            <p className="leading-relaxed">
              Instead of naive addition, each cluster computes a Harmonized Fire Pixel Equivalent (HFPE). When coincident overpasses occur (both MODIS and VIIRS detect the front), the equivalent is computed as:
            </p>
            <div className="bg-slate-900 p-2.5 rounded font-mono text-emerald-300 text-[11px] my-2">
              HFPE = max(MODIS_count, max(1.0, VIIRS_count * 0.18))
            </div>
            <p className="leading-relaxed">
              This preserves the physical 1 km² area footprint scale without double counting sub-pixels or over-weighting sensor upgrades.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-red-400 text-sm">Step 4: Energy Radiance Conservation (FRP)</h4>
            <p className="leading-relaxed">
              Fire Radiative Power (FRP in Megawatts) measures total emitted radiative energy. During coincident passes, total cluster FRP is reconciled using the mean across co-observing sensors, preventing double-counting of released energy.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
            <h4 className="font-bold text-purple-400 text-sm">Step 5: Statistical Anomaly Baseline Indicator</h4>
            <p className="leading-relaxed">
              A 14-day rolling historical baseline is maintained for daily FRP emission (<span className="font-mono text-cyan-300">μ_baseline</span>, <span className="font-mono text-cyan-300">σ_baseline</span>). Activity exceeding +2.0 standard deviations is flagged as an <strong>Unusual Thermal Activity (Analytical Baseline Deviation)</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* Mandatory Scientific Disclaimers & Ethics */}
      <div className="bg-slate-900/90 border border-amber-900/50 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          Observational Integrity & Mandatory Disclaimers
        </h3>

        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">•</span>
            <span>
              <strong>Thermal Anomalies, Not Ground Fires:</strong> Satellite sensors detect thermal radiance anomalies, NOT field-verified ground fires. Hot spots may be triggered by agricultural burns, gas flares, industry, or rock heat reflection.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">•</span>
            <span>
              <strong>No Predictive Fire Claims:</strong> This platform never claims to predict fires or forecast spread directions. All anomaly flags represent retrospective empirical deviations from historical baselines.
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">•</span>
            <span>
              <strong>Uncertainty & Detection Limits:</strong> Clouds, dense smoke, deep valleys, or tree canopy foliage can attenuate infrared radiance, causing detection omission. VIIRS has higher sensitivity (min FRP ~0.5 MW) than MODIS (min FRP ~5.0 MW).
            </span>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-amber-500 font-bold">•</span>
            <span>
              <strong>Demonstration Benchmark Integrity:</strong> Simulated benchmark datasets are explicitly marked as demonstration data. NASA FIRMS real feeds can be loaded at any time via CSV upload.
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};

