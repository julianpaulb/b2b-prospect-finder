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
                Cloud Dataset Manager & People CSV Importer
              </h2>
              <p className="text-xs text-slate-400">
                Direct HTTPS streaming from GitHub <code className="text-blue-300">companydatacom/public-datasets</code> (CC0) into PostgreSQL
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-dataset-modal-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                PostgreSQL Companies
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-slate-900">
                {formatNumber(syncStatus?.total_companies || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Indexed & deduplicated by Registration #
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Matched Contacts & CEOs
              </div>
              <div className="mt-1 text-2xl font-bold font-mono text-blue-600">
                {formatNumber(syncStatus?.total_contacts || 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                Linked to company profiles for Role Search
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sync Engine Status
              </div>
              <div className="mt-1 flex items-center gap-2">
                {isRunning ? (
                  <>
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-sm font-semibold text-blue-700">
                      Streaming {syncStatus?.sync.current_file || 'Dataset'}...
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700">
                      Ready ({syncStatus?.sources.length || 0} / {datasets.length || 8} regions loaded)
                    </span>
                  </>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {isRunning
                  ? `${formatNumber(syncStatus?.sync.rows_processed || 0)} rows upserted in current job`
                  : 'Zero local files — streams in 250-row batches'}
              </div>
            </div>
          </div>

          {/* Live Sync Progress Logs */}
          {syncStatus?.sync.recent_logs && syncStatus.sync.recent_logs.length > 0 && (
            <div className="rounded-lg bg-slate-900 text-slate-200 p-3.5 border border-slate-800 font-mono text-xs">
              <div className="flex items-center justify-between mb-2 text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" /> Live HTTPS Stream Log
                </span>
                {isRunning && (
                  <span className="text-[11px] text-blue-400 animate-pulse">
                    Batch Upserting to PostgreSQL...
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

          {/* Available GitHub Datasets Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  CC0 City & Country Datasets on GitHub
                </h3>
                <p className="text-xs text-slate-500">
                  Select which datasets to stream over HTTPS into your PostgreSQL database
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  {selectedIds.length === datasets.length ? 'Deselect All' : 'Select All 8 Datasets'}
                </button>
                <button
                  type="button"
                  onClick={() => fetchAvailable(true)}
                  disabled={loadingList}
                  className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  title="Refresh from GitHub API"
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
                          <span className="text-xs font-normal text-slate-500">({ds.country})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {ds.path} • {(ds.size_bytes / 1024).toFixed(0)} KB
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2 text-right">
                      {ds.is_synced ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          {formatNumber(ds.loaded_rows)} rows
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          Not Loaded
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between bg-blue-50/70 border border-blue-200 rounded-lg p-3.5">
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">{selectedIds.length} dataset(s)</span>{' '}
                selected for PostgreSQL upsert (<code className="text-blue-700">ON CONFLICT (registration_number) DO UPDATE</code>).
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
                    Syncing to PostgreSQL...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Sync Selected to PostgreSQL
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
                  Upload People / Directors CSV (<code className="text-xs font-mono">POST /api/contacts/upload</code>)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload any CSV with columns like <code className="text-slate-700">full_name, job_title, company_registration_number, company_name, email, linkedin_url</code>. Automatically links people to companies in PostgreSQL.
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
            Data Source: CompanyData.com Public Datasets (CC0 1.0 Universal)
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
