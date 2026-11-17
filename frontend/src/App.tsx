import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  ExternalLink,
  Search,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  UserCheck,
  Building2,
  MapPin,
  ArrowUpDown,
  Loader2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import {
  CompanyRecord,
  FilterFacets,
  SearchFilters,
  SyncStatusResponse,
} from './types';
import { formatCurrencyUSD, formatNumber, buildLinkedInXrayUrl } from './utils';
import { FilterSidebar } from './components/FilterSidebar';
import { CompanyDrawer } from './components/CompanyDrawer';
import { DatasetModal } from './components/DatasetModal';
import { browserDb } from './browserEngine';

const INITIAL_FILTERS: SearchFilters = {
  searchMode: 'combined',
  q: '',
  jobTitle: '',
  onlyWithContacts: false,
  countries: [],
  cities: [],
  industryKeyword: '',
  sicCodes: [],
  employeeBrackets: [],
  revenueMin: '',
  revenueMax: '',
  sortBy: 'revenue_desc',
  page: 1,
};

const STORAGE_KEY = 'apex_b2b_app_password';

export function App() {
  const [password, setPassword] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isStaticCloudMode, setIsStaticCloudMode] = useState<boolean>(false);
  const [loginInput, setLoginInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [facets, setFacets] = useState<FilterFacets>({
    countries: [],
    cities: [],
    industries: [],
  });

  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [totalCompanies, setTotalCompanies] = useState<number>(0);
  const [localStreamedCount, setLocalStreamedCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [matchingContactsTotal, setMatchingContactsTotal] = useState<number>(0);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);

  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse | null>(null);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);
  const [liveApiSearching, setLiveApiSearching] = useState<boolean>(false);
  const [streamingMorePdl, setStreamingMorePdl] = useState<boolean>(false);

  // Verify stored password or detect static GitHub Pages mode on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const healthRes = await fetch('/api/health');
        const isJson = (healthRes.headers.get('content-type') || '').includes('application/json');
        if (!healthRes.ok || !isJson) {
          throw new Error('Static GitHub Pages mode');
        }

        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password }),
        });
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        // Running on GitHub Pages / static hosting: initialize in-browser CC0 + PDL 32.3M streaming engine
        setIsStaticCloudMode(true);
        if (password) {
          setIsAuthenticated(true);
        } else {
          // Unlock automatically or accept zoominfo2026
          localStorage.setItem(STORAGE_KEY, 'zoominfo2026');
          setPassword('zoominfo2026');
          setIsAuthenticated(true);
        }
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const trimmed = loginInput.trim();
    if (isStaticCloudMode) {
      if (trimmed.length > 0) {
        localStorage.setItem(STORAGE_KEY, trimmed);
        setPassword(trimmed);
        setIsAuthenticated(true);
      } else {
        setLoginError('Please enter an access password (e.g. zoominfo2026).');
      }
      return;
    }
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed }),
      });
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, trimmed);
        setPassword(trimmed);
        setIsAuthenticated(true);
      } else {
        setLoginError('Invalid access key. Check your APP_PASSWORD environment variable.');
      }
    } catch {
      localStorage.setItem(STORAGE_KEY, trimmed || 'zoominfo2026');
      setPassword(trimmed || 'zoominfo2026');
      setIsStaticCloudMode(true);
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPassword('');
    setLoginInput('');
    setIsAuthenticated(false);
  };

  const fetchSyncStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    if (isStaticCloudMode) {
      await browserDb.ensureInitialized();
      setSyncStatus(browserDb.getStatus());
      return;
    }
    try {
      const res = await fetch('/api/datasets/status', {
        headers: { 'X-App-Password': password },
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data: SyncStatusResponse = await res.json();
        setSyncStatus(data);
        return;
      }
      throw new Error('Static');
    } catch {
      await browserDb.ensureInitialized();
      setSyncStatus(browserDb.getStatus());
    }
  }, [isAuthenticated, isStaticCloudMode, password]);

  const fetchFacets = useCallback(async () => {
    if (!isAuthenticated) return;
    if (isStaticCloudMode) {
      await browserDb.ensureInitialized();
      setFacets(browserDb.getFacets(filters.countries));
      return;
    }
    try {
      const countryParam =
        filters.countries.length > 0
          ? `?countries=${encodeURIComponent(filters.countries.join(','))}`
          : '';
      const res = await fetch(`/api/filters${countryParam}`, {
        headers: { 'X-App-Password': password },
      });
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data: FilterFacets = await res.json();
        setFacets(data);
        return;
      }
      throw new Error('Static');
    } catch {
      await browserDb.ensureInitialized();
      setFacets(browserDb.getFacets(filters.countries));
    }
  }, [isAuthenticated, isStaticCloudMode, password, filters.countries]);

  const fetchCompanies = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingCompanies(true);
    try {
      if (isStaticCloudMode) {
        await browserDb.ensureInitialized();
        const data = browserDb.searchCompanies(filters);
        setCompanies(data.items);
        setTotalCompanies(data.total);
        setLocalStreamedCount(data.local_streamed_total ?? data.total);
        setTotalPages(data.total_pages);
        setMatchingContactsTotal(data.matching_contacts_total);
        setSyncStatus(browserDb.getStatus());
        setFacets(browserDb.getFacets(filters.countries));

        const needsMoreForPage = filters.page > 1 && data.items.length < 25;
        if (
          needsMoreForPage ||
          filters.q.trim() ||
          filters.countries.length > 0 ||
          filters.cities.length > 0
        ) {
          setLiveApiSearching(true);
          browserDb
            .liveSearchExternalApis(filters, needsMoreForPage)
            .then((added) => {
              if (added > 0) {
                const refreshed = browserDb.searchCompanies(filters);
                setCompanies(refreshed.items);
                setTotalCompanies(refreshed.total);
                setLocalStreamedCount(refreshed.local_streamed_total ?? refreshed.total);
                setTotalPages(refreshed.total_pages);
                setMatchingContactsTotal(refreshed.matching_contacts_total);
                setSyncStatus(browserDb.getStatus());
                setFacets(browserDb.getFacets(filters.countries));
              }
            })
            .finally(() => setLiveApiSearching(false));
        }
        return;
      }

      const params = new URLSearchParams();
      params.set('search_mode', filters.searchMode);
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.jobTitle.trim()) params.set('job_title', filters.jobTitle.trim());
      if (filters.onlyWithContacts) params.set('only_with_contacts', 'true');
      if (filters.countries.length > 0) params.set('countries', filters.countries.join(','));
      if (filters.cities.length > 0) params.set('cities', filters.cities.join(','));
      if (filters.industryKeyword.trim()) params.set('industry', filters.industryKeyword.trim());
      if (filters.sicCodes.length > 0) params.set('sic_codes', filters.sicCodes.join(','));
      if (filters.employeeBrackets.length > 0) {
        params.set('employee_brackets', filters.employeeBrackets.join(','));
      }
      if (filters.revenueMin.trim()) params.set('revenue_min', filters.revenueMin.trim());
      if (filters.revenueMax.trim()) params.set('revenue_max', filters.revenueMax.trim());
      params.set('sort_by', filters.sortBy);
      params.set('page', String(filters.page));
      params.set('page_size', '50');

      const res = await fetch(`/api/companies?${params.toString()}`, {
        headers: { 'X-App-Password': password },
      });
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json();
        setCompanies(data.items || []);
        setTotalCompanies(data.total || 0);
        setTotalPages(data.total_pages || 1);
        setMatchingContactsTotal(data.matching_contacts_total || 0);
        return;
      }
      throw new Error('Static');
    } catch {
      await browserDb.ensureInitialized();
      const data = browserDb.searchCompanies(filters);
      setCompanies(data.items);
      setTotalCompanies(data.total);
      setTotalPages(data.total_pages);
      setMatchingContactsTotal(data.matching_contacts_total);
    } finally {
      setLoadingCompanies(false);
    }
  }, [isAuthenticated, isStaticCloudMode, password, filters]);

  const handleStreamMorePdl = async () => {
    if (streamingMorePdl) return;
    setStreamingMorePdl(true);
    try {
      await browserDb.streamMorePdlCompanies(1000);
      setSyncStatus(browserDb.getStatus());
      setFacets(browserDb.getFacets(filters.countries));
      const refreshed = browserDb.searchCompanies(filters);
      setCompanies(refreshed.items);
      setTotalCompanies(refreshed.total);
      setTotalPages(refreshed.total_pages);
    } finally {
      setStreamingMorePdl(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSyncStatus();
      fetchFacets();
    }
  }, [isAuthenticated, fetchSyncStatus, fetchFacets]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      fetchCompanies();
    }, 150);
    return () => clearTimeout(timer);
  }, [isAuthenticated, fetchCompanies]);

  // Poll sync status while a background sync is running
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!syncStatus?.sync.is_running) return;
    const interval = setInterval(() => {
      fetchSyncStatus();
      fetchFacets();
      fetchCompanies();
    }, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, syncStatus?.sync.is_running, fetchSyncStatus, fetchFacets, fetchCompanies]);

  const handleExportCsv = () => {
    if (isStaticCloudMode) {
      const { all_matched } = browserDb.searchCompanies(filters);
      const role = filters.jobTitle.trim() || 'CEO';
      const header = [
        'Company Name',
        'Trade Name',
        'Registration Number',
        'Street',
        'City',
        'Country',
        'SIC Code',
        'Industry Description',
        'Annual Revenue (USD)',
        'Employees Total',
        'Founding Year',
        'LinkedIn X-Ray URL',
      ];
      const lines = [header.join(',')].concat(
        all_matched.slice(0, 5000).map((c) =>
          [
            `"${(c.company_name || '').replace(/"/g, '""')}"`,
            `"${(c.trade_name || '').replace(/"/g, '""')}"`,
            `"${c.registration_number}"`,
            `"${(c.street || '').replace(/"/g, '""')}"`,
            `"${c.city || ''}"`,
            `"${c.country || ''}"`,
            `"${c.sic_code || ''}"`,
            `"${(c.industry_description || '').replace(/"/g, '""')}"`,
            c.revenue_usd || '',
            c.employees_total || '',
            c.founding_year || '',
            `"${buildLinkedInXrayUrl(c.company_name, role)}"`,
          ].join(',')
        )
      );
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'b2b_companies_export.csv';
      a.click();
      return;
    }

    const params = new URLSearchParams();
    params.set('search_mode', filters.searchMode);
    if (filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.jobTitle.trim()) params.set('job_title', filters.jobTitle.trim());
    if (filters.onlyWithContacts) params.set('only_with_contacts', 'true');
    if (filters.countries.length > 0) params.set('countries', filters.countries.join(','));
    if (filters.cities.length > 0) params.set('cities', filters.cities.join(','));
    if (filters.industryKeyword.trim()) params.set('industry', filters.industryKeyword.trim());
    if (filters.sicCodes.length > 0) params.set('sic_codes', filters.sicCodes.join(','));
    if (filters.employeeBrackets.length > 0) {
      params.set('employee_brackets', filters.employeeBrackets.join(','));
    }
    if (filters.revenueMin.trim()) params.set('revenue_min', filters.revenueMin.trim());
    if (filters.revenueMax.trim()) params.set('revenue_max', filters.revenueMax.trim());
    params.set('token', password);

    window.open(`/api/companies/export?${params.toString()}`, '_blank');
  };

  // Build active filter pills
  const activePills: Array<{ label: string; onRemove: () => void }> = [];
  if (filters.jobTitle.trim()) {
    activePills.push({
      label: `Role: "${filters.jobTitle}"`,
      onRemove: () => setFilters((p) => ({ ...p, jobTitle: '', page: 1 })),
    });
  }
  if (filters.onlyWithContacts) {
    activePills.push({
      label: 'Has DB Contacts',
      onRemove: () => setFilters((p) => ({ ...p, onlyWithContacts: false, page: 1 })),
    });
  }
  if (filters.q.trim()) {
    activePills.push({
      label: `Company: "${filters.q}"`,
      onRemove: () => setFilters((p) => ({ ...p, q: '', page: 1 })),
    });
  }
  filters.countries.forEach((c) => {
    activePills.push({
      label: `Country: ${c}`,
      onRemove: () =>
        setFilters((p) => ({
          ...p,
          countries: p.countries.filter((x) => x !== c),
          page: 1,
        })),
    });
  });
  filters.cities.forEach((city) => {
    activePills.push({
      label: `City: ${city}`,
      onRemove: () =>
        setFilters((p) => ({
          ...p,
          cities: p.cities.filter((x) => x !== city),
          page: 1,
        })),
    });
  });
  filters.sicCodes.forEach((code) => {
    activePills.push({
      label: `SIC: ${code}`,
      onRemove: () =>
        setFilters((p) => ({
          ...p,
          sicCodes: p.sicCodes.filter((x) => x !== code),
          page: 1,
        })),
    });
  });
  if (filters.industryKeyword.trim()) {
    activePills.push({
      label: `Industry: "${filters.industryKeyword}"`,
      onRemove: () => setFilters((p) => ({ ...p, industryKeyword: '', page: 1 })),
    });
  }
  filters.employeeBrackets.forEach((b) => {
    activePills.push({
      label: `Size: ${b} emp`,
      onRemove: () =>
        setFilters((p) => ({
          ...p,
          employeeBrackets: p.employeeBrackets.filter((x) => x !== b),
          page: 1,
        })),
    });
  });
  if (filters.revenueMin || filters.revenueMax) {
    const minStr = filters.revenueMin ? formatCurrencyUSD(Number(filters.revenueMin)) : '$0';
    const maxStr = filters.revenueMax ? formatCurrencyUSD(Number(filters.revenueMax)) : 'Any';
    activePills.push({
      label: `Revenue: ${minStr} - ${maxStr}`,
      onRemove: () =>
        setFilters((p) => ({ ...p, revenueMin: '', revenueMax: '', page: 1 })),
    });
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                ApexB2B Intelligence
              </h1>
              <p className="text-xs text-slate-400">
                Private Cloud Company & Prospect Database
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="app-password-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Access Password (<code className="text-blue-400">APP_PASSWORD</code>)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="app-password-input"
                  type="password"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Enter your access password..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Saved automatically in your browser after first login. Default local key:{' '}
                <button
                  type="button"
                  onClick={() => setLoginInput('zoominfo2026')}
                  className="font-mono text-blue-400 hover:underline cursor-pointer"
                >
                  zoominfo2026
                </button>
              </p>
            </div>

            {loginError && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              id="unlock-workspace-btn"
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
            >
              Unlock Intelligence Workspace
            </button>
          </form>
        </div>
      </div>
    );
  }

  const effectiveTargetRole = filters.jobTitle.trim() || 'CEO';

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Top Application Navigation Bar */}
      <header className="h-14 bg-slate-900 text-white px-5 flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs">
              AB
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight leading-none">
                ApexB2B Intelligence
              </h1>
              <span className="text-[10px] text-slate-400 font-mono">
                PDL 32.3M + GLEIF 2.6M Live Global API • CC0 Registries
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-xs">
            <span
              className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[11px]"
              title="Connected to People Data Labs (32,330,231 companies via HuggingFace API) + GLEIF Global API (2,600,000+ companies)"
            >
              <strong className="text-emerald-200">34.9M+</strong> Global API Index
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-[11px]">
              <strong className="text-white">{formatNumber(syncStatus?.total_companies || 0)}</strong> Loaded
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-blue-300 font-mono text-[11px]">
              <strong className="text-blue-200">{formatNumber(syncStatus?.total_contacts || 0)}</strong> Contacts
            </span>
            {(syncStatus?.sync.is_running || liveApiSearching || streamingMorePdl) && (
              <span className="px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-[11px] flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {liveApiSearching
                  ? 'Querying Live Global APIs...'
                  : `Streaming ${syncStatus?.sync.current_file || 'PDL 32.3M Index'}...`}
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="stream-more-pdl-btn"
            onClick={handleStreamMorePdl}
            disabled={streamingMorePdl || syncStatus?.sync.is_running}
            title="Stream another 1,000 global companies from the 32.3M People Data Labs dataset"
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {streamingMorePdl ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>+1,000 PDL Companies</span>
          </button>

          <button
            type="button"
            id="open-dataset-manager-btn"
            onClick={() => setIsDatasetModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>Datasets & PDL Stream</span>
            <span className="px-1.5 py-0.2 rounded bg-blue-600 text-[10px] font-mono text-white">
              34.9M
            </span>
          </button>

          <button
            type="button"
            id="export-csv-btn"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Lock Workspace"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Split */}
      <div className="flex-1 flex min-h-0">
        {/* Left Multi-Criteria Filter Sidebar */}
        <FilterSidebar
          filters={filters}
          facets={facets}
          onChange={setFilters}
          onClearAll={() => setFilters(INITIAL_FILTERS)}
        />

        {/* Right Results Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Subheader: Active Filter Pills & Sort Controls */}
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Global Index Matches:{' '}
                <span className="font-mono font-bold text-slate-900">
                  {formatNumber(totalCompanies)}
                </span>{' '}
                companies
              </span>

              {localStreamedCount > 0 && localStreamedCount !== totalCompanies && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono bg-slate-200/80 text-slate-700"
                  title="Rows currently buffered in your browser's RAM. Clicking countries, searching, or clicking '+1,000 PDL Companies' streams more live batches on demand."
                >
                  {formatNumber(localStreamedCount)} streamed in RAM
                </span>
              )}

              {liveApiSearching && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Streaming live matches (GLEIF 2.6M + PDL 32.3M)...
                </span>
              )}

              {filters.jobTitle.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <UserCheck className="w-3 h-3" />
                  {formatNumber(matchingContactsTotal)} direct "{filters.jobTitle}" contacts in DB + 1-click LinkedIn X-Ray
                </span>
              )}

              {activePills.map((pill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                >
                  <span>{pill.label}</span>
                  <button
                    type="button"
                    onClick={pill.onRemove}
                    className="hover:text-blue-950 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                aria-label="Sort companies by"
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, sortBy: e.target.value, page: 1 }))
                }
                className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="revenue_desc">Revenue: High to Low</option>
                <option value="employees_desc">Employees: High to Low</option>
                <option value="founded_desc">Founded Year: Newest</option>
                <option value="name_asc">Company Name: A to Z</option>
              </select>
            </div>
          </div>

          {/* High-Density B2B Results Table */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 pl-5 pr-3">Company & Registration #</th>
                  <th className="py-3 px-3">Industry (SIC)</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Employees</th>
                  <th className="py-3 px-3 text-right">Annual Revenue (USD)</th>
                  <th className="py-3 px-3 text-center">Founded</th>
                  <th className="py-3 pl-3 pr-5 text-right">
                    Target Role Discovery ({effectiveTargetRole})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {loadingCompanies && companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-slate-500">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                      Streaming from People Data Labs (32.3M) & Global Registries...
                    </td>
                  </tr>
                ) : companies.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <div className="max-w-sm mx-auto">
                        <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <div className="text-sm font-semibold text-slate-800">
                          No companies match the active criteria
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Click{' '}
                          <button
                            type="button"
                            onClick={handleStreamMorePdl}
                            className="text-emerald-600 font-semibold hover:underline cursor-pointer"
                          >
                            +1,000 PDL Companies
                          </button>{' '}
                          in the top bar or open the{' '}
                          <button
                            type="button"
                            onClick={() => setIsDatasetModalOpen(true)}
                            className="text-blue-600 font-semibold hover:underline cursor-pointer"
                          >
                            Dataset Manager
                          </button>{' '}
                          to stream more global batches.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  companies.map((comp) => {
                    const matchedContacts = comp.matching_contacts || [];
                    const isSelected = selectedCompany?.id === comp.id;

                    return (
                      <tr
                        key={comp.id}
                        onClick={() => setSelectedCompany(comp)}
                        className={`group transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/70'
                            : 'hover:bg-slate-50/90'
                        }`}
                      >
                        {/* 1. Company Name, Trade Name, Reg # */}
                        <td className="py-3 pl-5 pr-3 max-w-xs">
                          <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {comp.company_name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 truncate">
                            <span className="font-mono text-slate-400">
                              #{comp.registration_number}
                            </span>
                            {comp.website ? (
                              <span className="truncate text-blue-600 font-mono">
                                • {comp.website}
                              </span>
                            ) : (
                              comp.trade_name &&
                              comp.trade_name !== comp.company_name && (
                                <span className="truncate text-slate-500">
                                  • DBA {comp.trade_name}
                                </span>
                              )
                            )}
                          </div>
                        </td>

                        {/* 2. Industry (SIC) */}
                        <td className="py-3 px-3 max-w-[230px]">
                          {comp.sic_code ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold shrink-0">
                                {comp.sic_code}
                              </span>
                              <span
                                className="text-slate-700 truncate"
                                title={comp.industry_description || ''}
                              >
                                {comp.industry_description || 'Business Services'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 3. Location */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {[comp.city, comp.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                          {comp.street && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px] pl-4">
                              {comp.street}
                            </div>
                          )}
                        </td>

                        {/* 4. Employees */}
                        <td className="py-3 px-3 text-right font-mono text-slate-800 whitespace-nowrap">
                          {formatNumber(comp.employees_total)}
                        </td>

                        {/* 5. Annual Revenue (USD) */}
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                          {formatCurrencyUSD(comp.revenue_usd)}
                        </td>

                        {/* 6. Founded */}
                        <td className="py-3 px-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {comp.founding_year || '—'}
                        </td>

                        {/* 7. Target Role Action & Matched Contacts */}
                        <td
                          className="py-3 pl-3 pr-5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col items-end gap-1.5">
                            {matchedContacts.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                {matchedContacts.slice(0, 1).map((ct) => (
                                  <span
                                    key={ct.id}
                                    onClick={() => setSelectedCompany(comp)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium cursor-pointer hover:bg-emerald-100"
                                    title={`${ct.full_name} — ${ct.job_title}`}
                                  >
                                    <UserCheck className="w-3 h-3 text-emerald-600" />
                                    <span className="truncate max-w-[140px]">
                                      {ct.full_name}
                                    </span>
                                    <span className="text-[10px] text-emerald-600">
                                      ({ct.job_title.replace('Chief Executive Officer (CEO)', 'CEO')})
                                    </span>
                                  </span>
                                ))}
                              </div>
                            )}

                            <a
                              href={buildLinkedInXrayUrl(comp.company_name, effectiveTargetRole)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 transition-all"
                              title={`Search LinkedIn profiles for "${effectiveTargetRole}" at ${comp.company_name}`}
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Find {effectiveTargetRole}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="px-5 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <div>
              Page <strong className="font-mono text-slate-900">{filters.page}</strong> of{' '}
              <strong className="font-mono text-slate-900">{totalPages}</strong> •{' '}
              <span className="text-slate-500">
                Click any row to inspect full corporate hierarchy & contacts
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-medium cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              <button
                type="button"
                disabled={filters.page >= totalPages}
                onClick={() =>
                  setFilters((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))
                }
                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1 font-medium cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Slide-Over Company Drawer */}
      <CompanyDrawer
        companyId={selectedCompany?.id || null}
        initialCompany={selectedCompany}
        activeJobTitle={filters.jobTitle}
        password={password}
        onClose={() => setSelectedCompany(null)}
        onSelectCompany={(comp) => setSelectedCompany(comp)}
      />

      {/* Cloud Dataset Manager & Contact CSV Upload Modal */}
      <DatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        password={password}
        syncStatus={syncStatus}
        onRefreshStatus={() => {
          fetchSyncStatus();
          fetchFacets();
          fetchCompanies();
        }}
      />
    </div>
  );
}

export default App;
