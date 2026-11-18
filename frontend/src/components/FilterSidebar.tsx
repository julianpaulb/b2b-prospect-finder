import React, { useState } from 'react';
import {
  Search,
  Briefcase,
  Building2,
  MapPin,
  Layers,
  Users,
  DollarSign,
  RotateCcw,
  CheckSquare,
  Square,
  Filter,
} from 'lucide-react';
import { FilterFacets, SearchFilters } from '../types';
import { formatNumber } from '../utils';

interface FilterSidebarProps {
  filters: SearchFilters;
  facets: FilterFacets;
  onChange: (updater: (prev: SearchFilters) => SearchFilters) => void;
  onClearAll: () => void;
}

const EMPLOYEE_BRACKETS = [
  { id: '1-10', label: '1 - 10' },
  { id: '11-50', label: '11 - 50' },
  { id: '51-200', label: '51 - 200' },
  { id: '201-500', label: '201 - 500' },
  { id: '501-1000', label: '501 - 1,000' },
  { id: '1001-5000', label: '1,001 - 5,000' },
  { id: '5001-10000', label: '5,001 - 10,000' },
  { id: '10001+', label: '10,001+' },
];

const QUICK_JOB_TITLES = [
  'CEO',
  'VP Marketing',
  'Head of Demand Generation',
  'Founder',
  'CTO',
  'VP of Sales',
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  facets,
  onChange,
  onClearAll,
}) => {
  const [sicSearch, setSicSearch] = useState('');

  const toggleArrayItem = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const filteredIndustries = facets.industries.filter((ind) => {
    if (!sicSearch.trim()) return true;
    const q = sicSearch.toLowerCase();
    return (
      ind.code.toLowerCase().includes(q) ||
      ind.description.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-80 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Multi-Criteria Filters</span>
        </div>
        <button
          type="button"
          id="clear-all-filters-btn"
          onClick={onClearAll}
          className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear All</span>
        </button>
      </div>

      {/* Scrollable Filter Sections */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-200">
        {/* 1. Search Mode Toggle */}
        <div className="p-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Search Mode
          </label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
            {[
              { id: 'combined', label: 'Combined' },
              { id: 'companies', label: 'Companies' },
              { id: 'job_title', label: 'By Job Title' },
            ].map((mode) => {
              const active = filters.searchMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  id={`search-mode-${mode.id}-btn`}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      searchMode: mode.id as SearchFilters['searchMode'],
                      page: 1,
                    }))
                  }
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-blue-600 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Job Title / Target Role Filter */}
        {filters.searchMode !== 'companies' && (
          <div className="p-4 bg-blue-50/30">
            <label
              htmlFor="job-title-input"
              className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Job Title / Target Role
              </span>
              {filters.jobTitle && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  X-Ray Active
                </span>
              )}
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="job-title-input"
                type="text"
                value={filters.jobTitle}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, jobTitle: e.target.value, page: 1 }))
                }
                placeholder="e.g. VP Marketing, CEO, Founder..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Quick Role Suggestions */}
            <div className="mt-2 flex flex-wrap gap-1">
              {QUICK_JOB_TITLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      jobTitle: prev.jobTitle === role ? '' : role,
                      page: 1,
                    }))
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    filters.jobTitle === role
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  onlyWithContacts: !prev.onlyWithContacts,
                  page: 1,
                }))
              }
              className="mt-2.5 flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
            >
              {filters.onlyWithContacts ? (
                <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="text-[11px] leading-tight">
                Only show companies with matched contacts in DB
              </span>
            </div>
          </div>
        )}

        {/* 3. Company Name or Registration # */}
        {filters.searchMode !== 'job_title' && (
          <div className="p-4">
            <label
              htmlFor="company-search-input"
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Company Name or Registration #
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="company-search-input"
                type="text"
                value={filters.q}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, q: e.target.value, page: 1 }))
                }
                placeholder="Name, trade name, or KvK/Reg #..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* 4. Region: Country & City Multi-Select with Live Counts */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Country ({facets.countries.length})
            </span>
            {filters.countries.length > 0 && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, countries: [], page: 1 }))}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {facets.countries.map((c) => {
              const checked = filters.countries.includes(c.name);
              return (
                <div
                  key={c.name}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      countries: toggleArrayItem(prev.countries, c.name),
                      page: 1,
                    }))
                  }
                  className={`px-2 py-1 rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    checked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {checked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 ml-2">
                    {formatNumber(c.count)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Cities */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                City ({facets.cities.length})
              </span>
              {filters.cities.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, cities: [], page: 1 }))}
                  className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 pr-1">
              {facets.cities.slice(0, 30).map((cityObj) => {
                const checked = filters.cities.includes(cityObj.name);
                return (
                  <div
                    key={`${cityObj.name}-${cityObj.country}`}
                    onClick={() =>
                      onChange((prev) => ({
                        ...prev,
                        cities: toggleArrayItem(prev.cities, cityObj.name),
                        page: 1,
                      }))
                    }
                    className={`px-2 py-1 rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{cityObj.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 ml-2">
                      {formatNumber(cityObj.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Industry Filter (People Data Labs Taxonomy) */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              Industry ({facets.industries.length})
            </span>
            {(filters.sicCodes.length > 0 || filters.industryKeyword) && (
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    sicCodes: [],
                    industryKeyword: '',
                    page: 1,
                  }))
                }
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <input
            type="text"
            value={filters.industryKeyword}
            onChange={(e) => {
              setSicSearch(e.target.value);
              onChange((prev) => ({
                ...prev,
                industryKeyword: e.target.value,
                page: 1,
              }));
            }}
            placeholder="Filter industry (e.g. Software, Financial, Retail)..."
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1 pr-1">
            {filteredIndustries.slice(0, 40).map((ind) => {
              const checked = filters.sicCodes.includes(ind.code);
              return (
                <div
                  key={ind.code}
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      sicCodes: toggleArrayItem(prev.sicCodes, ind.code),
                      page: 1,
                    }))
                  }
                  className={`px-2 py-1 rounded-md flex items-center justify-between text-xs cursor-pointer transition-colors ${
                    checked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {checked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate text-[11px]" title={ind.description}>
                      {ind.description}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {formatNumber(ind.count)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Company Size (PDL Employee Count Brackets) */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Employees (PDL Size Bracket)
            </span>
            {filters.employeeBrackets.length > 0 && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, employeeBrackets: [], page: 1 }))}
                className="text-[11px] text-blue-600 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {EMPLOYEE_BRACKETS.map((b) => {
              const active = filters.employeeBrackets.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({
                      ...prev,
                      employeeBrackets: toggleArrayItem(prev.employeeBrackets, b.id),
                      page: 1,
                    }))
                  }
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium border text-left flex items-center justify-between transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-50 border-blue-600 text-blue-800 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{b.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
