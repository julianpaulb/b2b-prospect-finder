import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Database,
  RefreshCw,
  CheckCircle2,
  Upload,
  CheckSquare,
  Square,
  Globe,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Terminal,
  Key,
  ShieldCheck,
} from 'lucide-react';
import { DatasetItem, SyncStatusResponse } from '../types';
import { formatNumber } from '../utils';
import { browserDb } from '../browserEngine';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  password: string;
  syncStatus: SyncStatusResponse | null;
  onRefreshStatus: () => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  password,
  syncStatus,
  onRefreshStatus,
}) => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [triggeringSync, setTriggeringSync] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    uploaded_contacts: number;
    matched_to_companies: number;
    filename: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pdlApiKey, setPdlApiKey] = useState<string>(() => browserDb.getPdlApiKey());
  const [apiKeySaved, setApiKeySaved] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchAvailable = async (force = false) => {
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/datasets/available${force ? '?refresh=true' : ''}`, {
        headers: { 'X-App-Password': password },
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('Static mode');
      }
      const data = await res.json();
      setDatasets(data.datasets || []);
      if (selectedIds.length === 0 && data.datasets) {
        const unsynced = data.datasets.filter((d: DatasetItem) => !d.is_synced).map((d: DatasetItem) => d.id);
        setSelectedIds(unsynced.length > 0 ? unsynced : data.datasets.map((d: DatasetItem) => d.id));
      }
    } catch {
      const avail = await browserDb.discoverFromGitHubApi(force);
      setDatasets(avail);
      if (selectedIds.length === 0) {
        const unsynced = avail.filter((d) => !d.is_synced).map((d) => d.id);
        setSelectedIds(unsynced.length > 0 ? unsynced : avail.map((d) => d.id));
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAvailable(false);
      setPdlApiKey(browserDb.getPdlApiKey());
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && syncStatus && !syncStatus.sync.is_running) {
      fetchAvailable(false);
    }
  }, [syncStatus?.sync.is_running]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === datasets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(datasets.map((d) => d.id));
    }
  };

  const handleStartSync = async () => {
    if (selectedIds.length === 0) return;
    setTriggeringSync(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/datasets/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Password': password,
        },
        body: JSON.stringify({ datasets: selectedIds }),
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('Static mode');
      }
      onRefreshStatus();
    } catch {
      await browserDb.syncDatasets(selectedIds);
      fetchAvailable(false);
      onRefreshStatus();
    } finally {
      setTriggeringSync(false);
    }
  };

  const handleSaveApiKey = () => {
    browserDb.setPdlApiKey(pdlApiKey);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsv(true);
    setErrorMsg(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        headers: { 'X-App-Password': password },
        body: formData,
      });
      if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) {
        throw new Error('Static mode');
      }
      const data = await res.json();
      setUploadResult(data);
      onRefreshStatus();
    } catch {
      try {
        const res = await browserDb.uploadContactsCsv(file);
        setUploadResult(res);
        onRefreshStatus();
      } catch (err: any) {
        setErrorMsg(err.message || 'Contact CSV upload error');
      }
    } finally {
      setUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isRunning = syncStatus?.sync.is_running || false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                People Data Labs (PDL) Global Stream Manager — 32,330,231 Companies
              </h2>
              <p className="text-xs text-slate-400">
                Single clean source via <code className="text-emerald-300">datasets-server.huggingface.co (andreaaltomani/company-dataset)</code> with strict domain + brand deduplication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-dataset-modal-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Top Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200">
              <div className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
                PDL Global API Index
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-emerald-900">
                32,330,231
              </div>
              <div className="mt-1 text-[11px] text-emerald-700">
                Single clean source • Zero multi-source duplicates
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Unique Companies in RAM
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
                {formatNumber(syncStatus?.total_companies || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Deduplicated by domain + brand name per market
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                PDL Live Batch Streamer
              </div>
              <div className="mt-2">
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={async () => {
                    await browserDb.streamMorePdlCompanies(2000);
                    fetchAvailable(false);
                    onRefreshStatus();
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>Stream +2,000 More PDL Companies</span>
                </button>
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500 text-center">
                Current PDL offset: {formatNumber(syncStatus?.pdl_offset || 3000)} / 32,330,231
              </div>
            </div>
          </div>

          {/* Live Sync Progress Logs */}
          {syncStatus?.sync.recent_logs && syncStatus.sync.recent_logs.length > 0 && (
            <div className="rounded-lg bg-slate-900 text-slate-200 p-3.5 border border-slate-800 font-mono text-xs">
              <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" /> Live PDL HTTPS Stream Log
                </span>
                {isRunning && (
                  <span className="text-[11px] text-blue-400 animate-pulse">
                    Streaming & Deduplicating PDL Partitions...
                  </span>
                )}
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 text-[11px] leading-relaxed">
                {syncStatus.sync.recent_logs.slice(-8).map((line, i) => (
                  <div key={i} className="text-slate-300">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Direct PDL API Key Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                Optional: Official People Data Labs API Key (Direct Full-Index Search)
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Stored locally in browser only
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              By default, this app streams partitions from the free Hugging Face mirror (<code className="text-slate-700">andreaaltomani/company-dataset</code>). If you have a free or commercial API key from <a href="https://www.peopledatalabs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">peopledatalabs.com</a>, paste it below to query <code className="text-slate-700">api.peopledatalabs.com/v5/company/search</code> across all 32.3M rows in 1 request.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={pdlApiKey}
                onChange={(e) => setPdlApiKey(e.target.value)}
                placeholder="Paste optional PDL API Key (X-Api-Key)..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {apiKeySaved ? 'Saved!' : 'Save Key'}
              </button>
            </div>
          </div>

          {/* Available PDL Partitions Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  People Data Labs (32.3M) Live Stream Partitions
                </h3>
                <p className="text-xs text-slate-500">
                  Each partition streams 1,000 companies from Hugging Face Datasets Server API and deduplicates in-place
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  {selectedIds.length === datasets.length ? 'Deselect All' : 'Select All Partitions'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchAvailable(true)}
                  disabled={loadingList}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  title="Refresh partition status"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {datasets.map((ds) => {
                const isSelected = selectedIds.includes(ds.id);
                return (
                  <div
                    key={ds.id}
                    onClick={() => toggleSelect(ds.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <span>{ds.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {ds.path}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2 text-right">
                      {ds.is_synced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Streamed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          Ready
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{selectedIds.length} partition(s)</span>{' '}
                selected for live streaming &amp; strict domain/brand deduplication.
              </div>
              <button
                type="button"
                id="sync-selected-datasets-btn"
                onClick={handleStartSync}
                disabled={isRunning || triggeringSync || selectedIds.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {isRunning || triggeringSync ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Streaming PDL Partitions...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Stream Selected Partitions
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Upload Contacts CSV Section */}
          <div className="border-t border-slate-200 pt-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  Upload People / Contacts CSV
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload any CSV with columns like <code className="text-slate-700">full_name, job_title, company_name, email, linkedin_url</code> to match contacts directly to PDL companies.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="contact-csv-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCsv}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 flex items-center gap-2 shadow-2xs transition-colors cursor-pointer shrink-0"
                >
                  {uploadingCsv ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Matching & Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-blue-600" />
                      Upload Contacts CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {uploadResult && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                <span>
                  Imported <strong>{uploadResult.uploaded_contacts}</strong> contacts from{' '}
                  <code className="font-mono">{uploadResult.filename}</code> — matched{' '}
                  <strong>{uploadResult.matched_to_companies}</strong> directly to existing companies!
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Data Source: People Data Labs Global Company Dataset (32,330,231 records via HuggingFace API)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
