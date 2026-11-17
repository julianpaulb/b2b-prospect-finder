import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  MapPin,
  Users,
  DollarSign,
  Calendar,
  Hash,
  ExternalLink,
  Search,
  UserCheck,
  Briefcase,
  Globe,
  Network,
  Mail,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { CompanyRecord } from '../types';
import { formatCurrencyUSD, formatNumber, buildLinkedInXrayUrl } from '../utils';
import { browserDb } from '../browserEngine';

interface CompanyDrawerProps {
  companyId: number | null;
  initialCompany: CompanyRecord | null;
  activeJobTitle: string;
  password: string;
  onClose: () => void;
  onSelectCompany: (company: CompanyRecord) => void;
}

const QUICK_ROLES = [
  'CEO',
  'Founder',
  'VP Marketing',
  'Head of Demand Generation',
  'VP of Sales',
  'CTO',
  'CFO',
  'Head of Growth',
];

export const CompanyDrawer: React.FC<CompanyDrawerProps> = ({
  companyId,
  initialCompany,
  activeJobTitle,
  password,
  onClose,
  onSelectCompany,
}) => {
  const [company, setCompany] = useState<CompanyRecord | null>(initialCompany);
  const [loading, setLoading] = useState(false);
  const [roleFinderInput, setRoleFinderInput] = useState(activeJobTitle || 'VP Marketing');
  const [copiedReg, setCopiedReg] = useState(false);

  useEffect(() => {
    if (activeJobTitle) {
      setRoleFinderInput(activeJobTitle);
    }
  }, [activeJobTitle]);

  useEffect(() => {
    setCompany(initialCompany);
    if (!companyId) return;

    let cancelled = false;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/companies/${companyId}`, {
          headers: { 'X-App-Password': password },
        });
        if (
          res.ok &&
          (res.headers.get('content-type') || '').includes('application/json') &&
          !cancelled
        ) {
          const fullData = await res.json();
          setCompany(fullData);
          return;
        }
        throw new Error('Static mode');
      } catch {
        if (!cancelled) {
          const localDetail = browserDb.getCompanyDetail(companyId);
          if (localDetail) setCompany(localDetail);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [companyId, initialCompany, password]);

  if (!companyId || !company) return null;

  const copyRegistration = () => {
    navigator.clipboard.writeText(company.registration_number);
    setCopiedReg(true);
    setTimeout(() => setCopiedReg(false), 1800);
  };

  const targetRole = roleFinderInput.trim() || 'CEO';

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="fixed inset-0" onClick={onClose} />
      <aside className="relative z-50 w-full max-w-xl bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {company.country || 'Global Registry'}
              </span>
              {company.sic_code && (
                <span className="px-2 py-0.5 rounded-sm text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  SIC {company.sic_code}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-bold tracking-tight text-white leading-snug">
              {company.company_name}
            </h2>
            {company.trade_name && company.trade_name !== company.company_name && (
              <p className="text-xs text-slate-400 mt-0.5">
                Trading As: <span className="text-slate-200 font-medium">{company.trade_name}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            id="close-company-drawer-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Annual Revenue
              </div>
              <div className="mt-1 text-base font-bold font-mono text-slate-900">
                {formatCurrencyUSD(company.revenue_usd)}
              </div>
              {company.revenue_local && company.revenue_local !== company.revenue_usd ? (
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  Local: {formatNumber(company.revenue_local)}
                </div>
              ) : null}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                Employees
              </div>
              <div className="mt-1 text-base font-bold font-mono text-slate-900">
                {formatNumber(company.employees_total)}
              </div>
              {company.employees_onsite ? (
                <div className="text-[10px] font-mono text-slate-400">
                  On-site: {formatNumber(company.employees_onsite)}
                </div>
              ) : null}
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Founded Year
              </div>
              <div className="mt-1 text-base font-bold font-mono text-slate-900">
                {company.founding_year || '—'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {company.import_export_codes || 'Domestic / Standard'}
              </div>
            </div>
          </div>

          {/* Interactive Role Finder Box */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white border border-blue-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Interactive Target Role Finder (LinkedIn X-Ray)
              </h3>
              <span className="text-[11px] text-blue-700 font-medium">1-Click Prospecting</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Test any job title at <strong>{company.company_name}</strong> to launch a pre-filtered LinkedIn profile search.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={roleFinderInput}
                  onChange={(e) => setRoleFinderInput(e.target.value)}
                  placeholder="Enter role (e.g. VP Marketing, CEO)..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
              <a
                href={buildLinkedInXrayUrl(company.company_name, targetRole)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
              >
                <span>Find "{targetRole}"</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Quick Role Pills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFinderInput(role)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    roleFinderInput.toLowerCase() === role.toLowerCase()
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:text-blue-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Matched Contacts in PostgreSQL */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-slate-700" />
                Known Contacts & Directors ({company.contacts?.length || 0})
              </h3>
            </div>

            {company.contacts && company.contacts.length > 0 ? (
              <div className="space-y-2">
                {company.contacts.map((ct) => (
                  <div
                    key={ct.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span>{ct.full_name}</span>
                        {ct.source && (
                          <span className="px-1.5 py-0.5 text-[10px] font-normal bg-slate-100 text-slate-600 rounded">
                            {ct.source}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-blue-700 font-medium flex items-center gap-1.5 mt-0.5">
                        <Briefcase className="w-3 h-3" />
                        <span>{ct.job_title}</span>
                      </div>
                      {ct.email && (
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-1">
                          <Mail className="w-3 h-3" />
                          <span>{ct.email}</span>
                        </div>
                      )}
                    </div>
                    <a
                      href={
                        ct.linkedin_url ||
                        buildLinkedInXrayUrl(company.company_name, `${ct.full_name} ${ct.job_title}`)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <p className="text-xs text-slate-500">
                  No direct contacts stored in PostgreSQL for this company yet. Use the{' '}
                  <strong>Role Finder</strong> above to discover decision-makers on LinkedIn or upload a people CSV.
                </p>
              </div>
            )}
          </div>

          {/* Firmographic & Address Details */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
              <Building2 className="w-4 h-4 text-slate-700" />
              Official Registry & Location Profile
            </h3>
            <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs">
              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Registration Number
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-slate-900">
                    {company.registration_number}
                  </span>
                  <button
                    onClick={copyRegistration}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="Copy Registration Number"
                  >
                    {copiedReg ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="p-3 flex items-start justify-between gap-4">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <MapPin className="w-3.5 h-3.5" /> Registered Address
                </span>
                <span className="text-slate-900 font-medium text-right">
                  {[company.street, company.postal_code, company.city, company.region, company.country]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>

              <div className="p-3 flex items-start justify-between gap-4">
                <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                  <Briefcase className="w-3.5 h-3.5" /> Primary Industry (SIC)
                </span>
                <span className="text-slate-900 font-medium text-right">
                  {company.sic_code ? `SIC ${company.sic_code} — ` : ''}
                  {company.industry_description || 'Unclassified'}
                </span>
              </div>

              <div className="p-3 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Source Dataset
                </span>
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  datasets/{company.source_file}
                </span>
              </div>
            </div>
          </div>

          {/* Corporate Hierarchy & HQ Linkages */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
              <Network className="w-4 h-4 text-slate-700" />
              Corporate HQ Parent & Subsidiary Linkages
            </h3>
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 space-y-3 text-xs">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Local Headquarters
                </div>
                <div className="text-slate-800 font-medium mt-0.5">
                  {company.hq_local || 'Independent / Self-Reported Local Entity'}
                </div>
              </div>
              <div className="border-t border-slate-200/80 pt-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  National Headquarters
                </div>
                <div className="text-slate-800 font-medium mt-0.5">
                  {company.hq_national || 'Same as Local Headquarters'}
                </div>
              </div>
              <div className="border-t border-slate-200/80 pt-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                  Global Ultimate Parent HQ
                </div>
                <div className="text-slate-900 font-semibold mt-0.5">
                  {company.hq_global || 'Independent Organization'}
                </div>
              </div>
            </div>

            {/* Related Corporate Family Members */}
            {company.related_entities && company.related_entities.length > 0 && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-500 mb-2">
                  Affiliated Entities Sharing Global Parent ({company.related_entities.length})
                </div>
                <div className="space-y-1.5">
                  {company.related_entities.map((rel) => (
                    <button
                      key={rel.id}
                      type="button"
                      onClick={() =>
                        onSelectCompany({
                          ...company,
                          id: rel.id,
                          company_name: rel.company_name,
                          city: rel.city,
                          country: rel.country,
                          registration_number: rel.registration_number,
                          employees_total: rel.employees_total,
                          revenue_usd: rel.revenue_usd,
                        })
                      }
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 bg-white flex items-center justify-between text-xs transition-colors cursor-pointer"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-slate-800 truncate">{rel.company_name}</div>
                        <div className="text-[11px] text-slate-500">
                          {[rel.city, rel.country].filter(Boolean).join(', ')} • Reg #{rel.registration_number}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-600 shrink-0">
                        {formatCurrencyUSD(rel.revenue_usd)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(
              `"${company.company_name}" ${company.city || ''} ${company.country || ''}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>Web Research</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </aside>
    </div>
  );
};
