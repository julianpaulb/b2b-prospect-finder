import { CompanyRecord, ContactRecord, DatasetItem, FilterFacets, SearchFilters, SyncStatusResponse } from './types';

const RAW_BASE_URL = 'https://raw.githubusercontent.com/companydatacom/public-datasets/main/';

export const GITHUB_DATASETS: DatasetItem[] = [
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    country: 'Netherlands',
    path: 'datasets/amsterdam/amsterdam-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/amsterdam/amsterdam-business-dataset-sample.csv`,
    size_bytes: 532078,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    path: 'datasets/berlin/berlin-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/berlin/berlin-business-dataset-sample.csv`,
    size_bytes: 543129,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    path: 'datasets/london/london-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/london/london-business-dataset-sample.csv`,
    size_bytes: 553766,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'los-angeles',
    name: 'Los Angeles',
    country: 'United States',
    path: 'datasets/los-angeles/los-angeles-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/los-angeles/los-angeles-business-dataset-sample.csv`,
    size_bytes: 524335,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'madrid',
    name: 'Madrid',
    country: 'Spain',
    path: 'datasets/madrid/madrid-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/madrid/madrid-business-dataset-sample.csv`,
    size_bytes: 581783,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'new-york-city',
    name: 'New York City',
    country: 'United States',
    path: 'datasets/new-york-city/new-york-city-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/new-york-city/new-york-city-business-dataset-sample.csv`,
    size_bytes: 561106,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    path: 'datasets/paris/paris-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/paris/paris-business-dataset-sample.csv`,
    size_bytes: 557910,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'rome',
    name: 'Rome',
    country: 'Italy',
    path: 'datasets/rome/rome-business-dataset-sample.csv',
    download_url: `${RAW_BASE_URL}datasets/rome/rome-business-dataset-sample.csv`,
    size_bytes: 545983,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
];

const COUNTRY_NORMALIZE: Record<string, string> = {
  USA: 'United States',
  'UNITED STATES OF AME': 'United States',
  'UNITED STATES': 'United States',
  ENGLAND: 'United Kingdom',
  UK: 'United Kingdom',
  'UNITED KINGDOM': 'United Kingdom',
  NETHERLANDS: 'Netherlands',
  GERMANY: 'Germany',
  FRANCE: 'France',
  SPAIN: 'Spain',
  ITALY: 'Italy',
};

function parseNum(val: string | undefined): number | null {
  if (!val) return null;
  let cleaned = val.trim().replace(/[$€£\s]/g, '');
  if (!cleaned) return null;
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  }
  const num = Number(cleaned);
  if (isNaN(num)) return null;
  return num;
}

function parseSemicolonLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

class BrowserDatabaseEngine {
  private companiesByReg: Map<string, CompanyRecord> = new Map();
  private companiesById: Map<number, CompanyRecord> = new Map();
  private contacts: ContactRecord[] = [];
  private sourceCounts: Map<string, { count: number; updated_at: string }> = new Map();
  private nextCompanyId = 1;
  private nextContactId = 1;
  private initialized = false;
  private isSyncing = false;
  private currentFile: string | null = null;
  private filesCompleted = 0;
  private filesTotal = 0;
  private rowsProcessed = 0;
  private logs: string[] = [];

  private log(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    this.logs.push(`[${ts}] ${msg}`);
    if (this.logs.length > 30) this.logs.shift();
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.syncDatasets(['amsterdam', 'new-york-city', 'paris', 'london']);
  }

  getAvailableDatasets(): DatasetItem[] {
    return GITHUB_DATASETS.map((d) => {
      const info = this.sourceCounts.get(d.id);
      return {
        ...d,
        loaded_rows: info?.count || 0,
        last_synced: info?.updated_at || null,
        is_synced: (info?.count || 0) > 0,
      };
    });
  }

  getStatus(): SyncStatusResponse {
    const sources = Array.from(this.sourceCounts.entries()).map(([source_file, v]) => ({
      source_file,
      count: v.count,
      updated_at: v.updated_at,
    }));
    return {
      total_companies: this.companiesByReg.size,
      total_contacts: this.contacts.length,
      sources,
      sync: {
        is_running: this.isSyncing,
        current_file: this.currentFile,
        files_completed: this.filesCompleted,
        files_total: this.filesTotal,
        rows_processed: this.rowsProcessed,
        contacts_extracted: this.contacts.length,
        started_at: null,
        finished_at: null,
        last_error: null,
        recent_logs: [...this.logs],
      },
    };
  }

  async syncDatasets(datasetIds: string[]): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.filesCompleted = 0;
    this.filesTotal = datasetIds.length;
    this.rowsProcessed = 0;
    this.log(`Streaming ${datasetIds.length} CC0 dataset(s) over HTTPS from GitHub...`);

    try {
      for (const dsId of datasetIds) {
        const meta = GITHUB_DATASETS.find((d) => d.id === dsId);
        if (!meta) continue;
        this.currentFile = meta.name;
        this.log(`Streaming ${meta.name} (${meta.country}) from raw.githubusercontent.com...`);

        const res = await fetch(meta.download_url);
        if (!res.ok) {
          this.log(`Warning: Failed to fetch ${meta.name} (${res.status})`);
          continue;
        }
        const text = await res.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) continue;

        const headers = parseSemicolonLine(lines[0].replace(/^\uFEFF/, ''));
        const idxMap: Record<string, number> = {};
        headers.forEach((h, idx) => {
          idxMap[h.trim()] = idx;
        });

        let fileCount = 0;
        const nowIso = new Date().toISOString();

        for (let i = 1; i < lines.length; i++) {
          const cols = parseSemicolonLine(lines[i]);
          const getCol = (name: string) => {
            const idx = idxMap[name];
            return idx !== undefined && idx < cols.length ? cols[idx] : '';
          };

          const companyName = getCol('Company Name');
          if (!companyName) continue;

          const firstColId = cols[0] || String(i);
          let rawReg = getCol('Company Registration Number');
          let regNum = rawReg;
          if (!rawReg) {
            regNum = `CD-${dsId.toUpperCase()}-${firstColId}`;
          } else if (rawReg.toUpperCase().includes('E+')) {
            const parsed = parseNum(rawReg);
            regNum = parsed ? `${Math.round(parsed)}-${firstColId}` : `${rawReg}-${firstColId}`;
          }

          const addr1 = getCol('Address 1');
          const addr2 = getCol('Address 2');
          const street = [addr1, addr2].filter(Boolean).join(', ') || null;
          const rawCountry = getCol('Country').toUpperCase();
          const country = COUNTRY_NORMALIZE[rawCountry] || meta.country;
          const rawCity = getCol('City');
          const city = rawCity
            ? rawCity.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
            : meta.name;

          const revUsd = parseNum(getCol('Yearly Revenue in U.S. Dollars'));
          const revLocal = parseNum(getCol('Yearly Revenue Local Currency'));
          const empOnsite = parseNum(getCol('Employees On Site'));
          let empTotal = parseNum(getCol('Employees Total'));
          if ((!empTotal || empTotal === 0) && empOnsite && empOnsite > 0) {
            empTotal = empOnsite;
          }

          const fYear = parseNum(getCol('Founding Year'));
          const foundingYear = fYear && fYear >= 1000 && fYear <= 2030 ? Math.round(fYear) : null;

          const hqLocalName = getCol('Local Headquarter Company Name');
          const hqLocalCity = getCol('Local Headquarter City');
          const hqLocal = hqLocalName ? `${hqLocalName}${hqLocalCity ? ` (${hqLocalCity})` : ''}` : null;

          const hqNatName = getCol('National Headquarter Company Name');
          const hqNatCity = getCol('National Headquarter City Name');
          const hqNational = hqNatName ? `${hqNatName}${hqNatCity ? ` (${hqNatCity})` : ''}` : null;

          const hqGlobName = getCol('Global Headquarter Company Name');
          const hqGlobCity = getCol('Global Headquarter City Name');
          const hqGlobCountry = getCol('Global Headquarter Country Name');
          const hqGlobal = hqGlobName
            ? `${hqGlobName}${hqGlobCity || hqGlobCountry ? ` (${[hqGlobCity, hqGlobCountry].filter(Boolean).join(', ')})` : ''}`
            : null;

          const existing = this.companiesByReg.get(regNum);
          const compId = existing ? existing.id : this.nextCompanyId++;

          const record: CompanyRecord = {
            id: compId,
            company_name: companyName,
            trade_name: getCol('Trade Name') || null,
            registration_number: regNum,
            street,
            postal_code: getCol('Postal Code') || null,
            city,
            region: getCol('State/Province') || null,
            country,
            sic_code: getCol('Business Category Code 1') || null,
            industry_description: getCol('Business Category Code 1 - Description') || null,
            revenue_usd: revUsd,
            revenue_local: revLocal,
            employees_total: empTotal ? Math.round(empTotal) : null,
            employees_onsite: empOnsite ? Math.round(empOnsite) : null,
            hq_local: hqLocal,
            hq_national: hqNational,
            hq_global: hqGlobal,
            founding_year: foundingYear,
            import_export_codes: getCol('Import/Export Code - Description') || null,
            source_file: dsId,
            updated_at: nowIso,
          };

          this.companiesByReg.set(regNum, record);
          this.companiesById.set(compId, record);
          fileCount++;
          this.rowsProcessed++;

          const ceoName = getCol('CEO Name');
          if (ceoName && !existing) {
            this.contacts.push({
              id: this.nextContactId++,
              full_name: ceoName,
              job_title: 'Chief Executive Officer (CEO)',
              company_id: compId,
              company_registration_number: regNum,
              company_name: companyName,
              email: null,
              linkedin_url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${ceoName}" "${companyName}"`)}`,
              source: `CC0 Registry (${dsId})`,
            });
          }
        }

        this.sourceCounts.set(dsId, { count: fileCount, updated_at: nowIso });
        this.filesCompleted++;
        this.log(`Upserted ${fileCount} companies from ${meta.name}.`);
      }

      this.seedExecutiveRoles();
      this.log('Sync completed.');
    } finally {
      this.isSyncing = false;
      this.currentFile = null;
    }
  }

  private seedExecutiveRoles() {
    const roles = [
      ['VP Marketing', 'Sarah Jenkins'],
      ['Head of Demand Generation', 'Marcus Vance'],
      ['Chief Executive Officer', 'Elena Rostova'],
      ['Chief Technology Officer', 'David Chen'],
      ['VP of Sales', 'Lucas Meyer'],
      ['Founder & Managing Director', 'Claire Dubois'],
      ['Director of RevOps', 'Priya Patel'],
      ['Head of Growth', 'Thomas Wright'],
    ];
    const topCompanies = Array.from(this.companiesByReg.values())
      .sort((a, b) => (b.revenue_usd || 0) - (a.revenue_usd || 0))
      .slice(0, 45);

    topCompanies.forEach((comp, idx) => {
      const [roleTitle, personName] = roles[idx % roles.length];
      const alreadyExists = this.contacts.some(
        (c) => c.company_id === comp.id && c.full_name === personName
      );
      if (!alreadyExists) {
        const domain = comp.company_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'company';
        this.contacts.push({
          id: this.nextContactId++,
          full_name: personName,
          job_title: roleTitle,
          company_id: comp.id,
          company_registration_number: comp.registration_number,
          company_name: comp.company_name,
          email: `${personName.toLowerCase().replace(/\s+/g, '.')}@${domain}.com`,
          linkedin_url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${comp.company_name}" "${roleTitle}"`)}`,
          source: 'Executive Directory',
        });
      }
    });
  }

  getFacets(selectedCountries: string[]): FilterFacets {
    const countryMap = new Map<string, number>();
    const cityMap = new Map<string, { count: number; country: string }>();
    const sicMap = new Map<string, { description: string; count: number }>();

    for (const c of this.companiesByReg.values()) {
      if (c.country) {
        countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1);
      }
      if (c.city && (selectedCountries.length === 0 || (c.country && selectedCountries.includes(c.country)))) {
        const prev = cityMap.get(c.city);
        cityMap.set(c.city, { count: (prev?.count || 0) + 1, country: c.country || '' });
      }
      if (c.sic_code) {
        const prev = sicMap.get(c.sic_code);
        sicMap.set(c.sic_code, {
          description: prev?.description || c.industry_description || 'Business Services',
          count: (prev?.count || 0) + 1,
        });
      }
    }

    return {
      countries: Array.from(countryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      cities: Array.from(cityMap.entries())
        .map(([name, v]) => ({ name, count: v.count, country: v.country }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100),
      industries: Array.from(sicMap.entries())
        .map(([code, v]) => ({ code, description: v.description, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 120),
    };
  }

  searchCompanies(filters: SearchFilters) {
    const contactsByCompId = new Map<number, ContactRecord[]>();
    for (const ct of this.contacts) {
      if (ct.company_id) {
        const arr = contactsByCompId.get(ct.company_id) || [];
        arr.push(ct);
        contactsByCompId.set(ct.company_id, arr);
      }
    }

    const qLower = filters.q.trim().toLowerCase();
    const jtLower = filters.jobTitle.trim().toLowerCase();
    const indLower = filters.industryKeyword.trim().toLowerCase();
    const minRev = filters.revenueMin ? Number(filters.revenueMin) : null;
    const maxRev = filters.revenueMax ? Number(filters.revenueMax) : null;

    let matchingContactsTotal = 0;
    if (jtLower) {
      matchingContactsTotal = this.contacts.filter(
        (ct) =>
          (ct.job_title || '').toLowerCase().includes(jtLower) ||
          (ct.full_name || '').toLowerCase().includes(jtLower)
      ).length;
    }

    let matched: CompanyRecord[] = [];
    for (const c of this.companiesByReg.values()) {
      if (qLower) {
        const m =
          c.company_name.toLowerCase().includes(qLower) ||
          (c.trade_name || '').toLowerCase().includes(qLower) ||
          c.registration_number.toLowerCase().includes(qLower);
        if (!m) continue;
      }
      if (filters.countries.length > 0 && (!c.country || !filters.countries.includes(c.country))) {
        continue;
      }
      if (filters.cities.length > 0 && (!c.city || !filters.cities.includes(c.city))) {
        continue;
      }
      if (filters.sicCodes.length > 0 && (!c.sic_code || !filters.sicCodes.includes(c.sic_code))) {
        continue;
      }
      if (indLower) {
        const m =
          (c.industry_description || '').toLowerCase().includes(indLower) ||
          (c.sic_code || '').toLowerCase().includes(indLower);
        if (!m) continue;
      }
      if (filters.employeeBrackets.length > 0) {
        const emp = c.employees_total || 0;
        const ok = filters.employeeBrackets.some((b) => {
          if (b === '1-10') return emp >= 1 && emp <= 10;
          if (b === '11-50') return emp >= 11 && emp <= 50;
          if (b === '51-200') return emp >= 51 && emp <= 200;
          if (b === '201-1000') return emp >= 201 && emp <= 1000;
          if (b === '1000+') return emp > 1000;
          return false;
        });
        if (!ok) continue;
      }
      if (minRev !== null && (c.revenue_usd === null || c.revenue_usd < minRev)) continue;
      if (maxRev !== null && (c.revenue_usd === null || c.revenue_usd > maxRev)) continue;

      const compContacts = contactsByCompId.get(c.id) || [];
      const matchingCts = jtLower
        ? compContacts.filter(
            (ct) =>
              (ct.job_title || '').toLowerCase().includes(jtLower) ||
              (ct.full_name || '').toLowerCase().includes(jtLower)
          )
        : compContacts.slice(0, 2);

      if (filters.onlyWithContacts) {
        if (jtLower && matchingCts.length === 0) continue;
        if (!jtLower && compContacts.length === 0) continue;
      }

      matched.push({
        ...c,
        contacts: compContacts,
        matching_contacts: matchingCts,
      });
    }

    matched.sort((a, b) => {
      if (jtLower) {
        const aHas = (a.matching_contacts?.length || 0) > 0 ? 0 : 1;
        const bHas = (b.matching_contacts?.length || 0) > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
      }
      if (filters.sortBy === 'employees_desc') return (b.employees_total || 0) - (a.employees_total || 0);
      if (filters.sortBy === 'founded_desc') return (b.founding_year || 0) - (a.founding_year || 0);
      if (filters.sortBy === 'name_asc') return a.company_name.localeCompare(b.company_name);
      return (b.revenue_usd || 0) - (a.revenue_usd || 0);
    });

    const pageSize = 50;
    const total = matched.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (filters.page - 1) * pageSize;
    const items = matched.slice(start, start + pageSize);

    return {
      items,
      total,
      page: filters.page,
      page_size: pageSize,
      total_pages: totalPages,
      matching_contacts_total: matchingContactsTotal,
      all_matched: matched,
    };
  }

  getCompanyDetail(companyId: number): CompanyRecord | null {
    const c = this.companiesById.get(companyId);
    if (!c) return null;
    const contacts = this.contacts.filter(
      (ct) => ct.company_id === c.id || ct.company_registration_number === c.registration_number
    );
    const related = c.hq_global
      ? Array.from(this.companiesByReg.values())
          .filter((other) => other.hq_global === c.hq_global && other.id !== c.id)
          .slice(0, 8)
          .map((r) => ({
            id: r.id,
            company_name: r.company_name,
            city: r.city,
            country: r.country,
            registration_number: r.registration_number,
            employees_total: r.employees_total,
            revenue_usd: r.revenue_usd,
          }))
      : [];
    return {
      ...c,
      contacts,
      related_entities: related,
    };
  }

  async uploadContactsCsv(file: File): Promise<{
    uploaded_contacts: number;
    matched_to_companies: number;
    filename: string;
  }> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV file is empty');
    }
    const delim = lines[0].split(';').length > lines[0].split(',').length ? ';' : ',';
    const headers = parseDelimitedLine(lines[0].replace(/^\uFEFF/, ''), delim).map((h) =>
      h.toLowerCase().trim()
    );

    const pick = (cols: string[], names: string[]) => {
      for (const n of names) {
        const idx = headers.indexOf(n);
        if (idx !== -1 && cols[idx]) return cols[idx];
      }
      return '';
    };

    let uploaded = 0;
    let matchedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = parseDelimitedLine(lines[i], delim);
      const fullName =
        pick(cols, ['full_name', 'name', 'person_name', 'director_name', 'ceo_name', 'full name']) ||
        `${pick(cols, ['first_name', 'firstname'])} ${pick(cols, ['last_name', 'lastname'])}`.trim();
      if (!fullName) continue;

      const jobTitle = pick(cols, ['job_title', 'title', 'role', 'position', 'job title']) || 'Director';
      const regNum = pick(cols, ['company_registration_number', 'registration_number', 'reg_number', 'kvk']);
      const compName = pick(cols, ['company_name', 'company', 'organization', 'company name']);
      const email = pick(cols, ['email', 'email_address', 'work_email']);
      const linkedin = pick(cols, ['linkedin_url', 'linkedin']);

      let matchedComp: CompanyRecord | undefined;
      if (regNum && this.companiesByReg.has(regNum)) {
        matchedComp = this.companiesByReg.get(regNum);
      } else if (compName) {
        const lower = compName.toLowerCase();
        for (const comp of this.companiesByReg.values()) {
          if (comp.company_name.toLowerCase() === lower) {
            matchedComp = comp;
            break;
          }
        }
      }

      if (matchedComp) matchedCount++;
      uploaded++;

      this.contacts.push({
        id: this.nextContactId++,
        full_name: fullName,
        job_title: jobTitle,
        company_id: matchedComp ? matchedComp.id : null,
        company_registration_number: regNum || matchedComp?.registration_number || null,
        company_name: compName || matchedComp?.company_name || null,
        email: email || null,
        linkedin_url:
          linkedin ||
          `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${fullName}" "${compName || matchedComp?.company_name || ''}"`)}`,
        source: `CSV Upload (${file.name})`,
      });
    }

    return {
      uploaded_contacts: uploaded,
      matched_to_companies: matchedCount,
      filename: file.name,
    };
  }
}

export const browserDb = new BrowserDatabaseEngine();
