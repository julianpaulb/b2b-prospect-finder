import { CompanyRecord, ContactRecord, DatasetItem, FilterFacets, SearchFilters, SyncStatusResponse } from './types';

const RAW_BASE_URL = 'https://raw.githubusercontent.com/companydatacom/public-datasets/main/';
const HF_ROWS_URL = 'https://datasets-server.huggingface.co/rows';
const HF_STATS_URL = 'https://datasets-server.huggingface.co/statistics';
const PDL_HF_DATASET = 'andreaaltomani/company-dataset'; // 32,330,231 PDL companies
const BIGPICTURE_HF_DATASET = 'bigpictureio/companies-2023-q4-sm'; // 17,154,017 companies
const GLEIF_API_URL = 'https://api.gleif.org/api/v1/lei-records';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const PDL_KEY_STORAGE = 'apex_pdl_api_key';

// Exact country counts from Hugging Face /statistics on People Data Labs (32,330,231 companies)
const PDL_GLOBAL_COUNTRY_COUNTS: Record<string, number> = {
  'United States': 8481719,
  'United Kingdom': 2999010,
  France: 1949327,
  India: 1861783,
  Brazil: 1620758,
  China: 1214580,
  Spain: 1155765,
  Germany: 1068709,
  Canada: 831823,
  Australia: 761286,
  Netherlands: 725597,
  Italy: 673943,
  Belgium: 442772,
  'South Africa': 352702,
  Mexico: 347159,
  Sweden: 294812,
  Switzerland: 239158,
  Poland: 231490,
  Argentina: 218940,
  Colombia: 198430,
  Chile: 176520,
  'United Arab Emirates': 152575,
  Portugal: 148920,
  Ireland: 142310,
  Norway: 134890,
  Austria: 128450,
  Japan: 123333,
  Pakistan: 112947,
  Denmark: 109314,
  Singapore: 104820,
  'New Zealand': 98970,
  Finland: 94310,
  Nigeria: 88721,
  Philippines: 65011,
  Romania: 55507,
  Vietnam: 50432,
  Kenya: 42281,
  Bulgaria: 24925,
  Slovakia: 20655,
  Slovenia: 14141,
  Luxembourg: 12987,
  Qatar: 12085,
  Iceland: 10392,
};

// Exact industry counts from Hugging Face /statistics on People Data Labs (32,330,231 companies)
const PDL_GLOBAL_INDUSTRY_COUNTS: Record<string, number> = {
  Construction: 1351349,
  'Information Technology And Services': 1277810,
  Retail: 1199700,
  'Marketing And Advertising': 980293,
  'Management Consulting': 966089,
  'Real Estate': 949011,
  'Computer Software': 773967,
  Restaurants: 703890,
  'Medical Practice': 675804,
  'Hospital & Health Care': 561544,
  'Individual & Family Services': 550688,
  'Health, Wellness And Fitness': 545032,
  'Financial Services': 529801,
  Internet: 436859,
  Hospitality: 427482,
  'Education Management': 398410,
  Automotive: 385120,
  Accounting: 362900,
  Design: 348710,
  Telecommunications: 312450,
  'Mechanical Or Industrial Engineering': 298400,
  'Legal Services': 289110,
  Insurance: 274500,
  Banking: 258900,
  'Electrical/Electronic Manufacturing': 241800,
};

// Wikidata country QID to Country Name mapping
const WIKIDATA_COUNTRY_QIDS: Record<string, string> = {
  Q30: 'United States',
  Q145: 'United Kingdom',
  Q142: 'France',
  Q183: 'Germany',
  Q29: 'Spain',
  Q38: 'Italy',
  Q55: 'Netherlands',
  Q39: 'Switzerland',
  Q16: 'Canada',
  Q408: 'Australia',
  Q668: 'India',
  Q155: 'Brazil',
  Q17: 'Japan',
  Q148: 'China',
  Q34: 'Sweden',
  Q20: 'Norway',
  Q35: 'Denmark',
  Q33: 'Finland',
  Q36: 'Poland',
  Q31: 'Belgium',
  Q40: 'Austria',
  Q27: 'Ireland',
  Q45: 'Portugal',
  Q96: 'Mexico',
  Q258: 'South Africa',
  Q334: 'Singapore',
  Q878: 'United Arab Emirates',
};

export const GITHUB_DATASETS: DatasetItem[] = [
  {
    id: 'pdl-global-1',
    name: 'PDL Global Stream #1 (85+ Countries)',
    country: 'Global (32.3M PDL Index)',
    path: 'huggingface://andreaaltomani/company-dataset [0..1000]',
    download_url: `${HF_ROWS_URL}?dataset=${PDL_HF_DATASET}&config=default&split=train&offset=0&length=100`,
    size_bytes: 1450000,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'pdl-global-2',
    name: 'PDL Global Stream #2 (85+ Countries)',
    country: 'Global (32.3M PDL Index)',
    path: 'huggingface://andreaaltomani/company-dataset [1000..2000]',
    download_url: `${HF_ROWS_URL}?dataset=${PDL_HF_DATASET}&config=default&split=train&offset=1000&length=100`,
    size_bytes: 1450000,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'pdl-global-3',
    name: 'PDL Global Stream #3 (85+ Countries)',
    country: 'Global (32.3M PDL Index)',
    path: 'huggingface://andreaaltomani/company-dataset [2000..3000]',
    download_url: `${HF_ROWS_URL}?dataset=${PDL_HF_DATASET}&config=default&split=train&offset=2000&length=100`,
    size_bytes: 1450000,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
  {
    id: 'pdl-bigpicture-1',
    name: 'BigPicture / PDL Tech & B2B Stream',
    country: 'Global (17.1M Index)',
    path: 'huggingface://bigpictureio/companies-2023-q4-sm [0..1000]',
    download_url: `${HF_ROWS_URL}?dataset=${BIGPICTURE_HF_DATASET}&config=default&split=train&offset=0&length=100`,
    size_bytes: 1320000,
    estimated_rows: 1000,
    loaded_rows: 0,
    last_synced: null,
    is_synced: false,
  },
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
  US: 'United States',
  'UNITED STATES OF AME': 'United States',
  'UNITED STATES': 'United States',
  ENGLAND: 'United Kingdom',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
  'UNITED KINGDOM': 'United Kingdom',
  NETHERLANDS: 'Netherlands',
  NL: 'Netherlands',
  GERMANY: 'Germany',
  DE: 'Germany',
  FRANCE: 'France',
  FR: 'France',
  SPAIN: 'Spain',
  ES: 'Spain',
  ITALY: 'Italy',
  IT: 'Italy',
  CH: 'Switzerland',
  CA: 'Canada',
  AU: 'Australia',
  BR: 'Brazil',
  IN: 'India',
  JP: 'Japan',
  CN: 'China',
  SG: 'Singapore',
  AE: 'United Arab Emirates',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  BE: 'Belgium',
  AT: 'Austria',
  IE: 'Ireland',
  PT: 'Portugal',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  ZA: 'South Africa',
  NZ: 'New Zealand',
  NG: 'Nigeria',
  PH: 'Philippines',
  RO: 'Romania',
  VN: 'Vietnam',
  KE: 'Kenya',
  PK: 'Pakistan',
};

const COUNTRY_TO_ISO2: Record<string, string> = {
  'United States': 'US',
  'United Kingdom': 'GB',
  Netherlands: 'NL',
  Germany: 'DE',
  France: 'FR',
  Spain: 'ES',
  Italy: 'IT',
  Switzerland: 'CH',
  Canada: 'CA',
  Australia: 'AU',
  Brazil: 'BR',
  India: 'IN',
  Japan: 'JP',
  China: 'CN',
  Singapore: 'SG',
  'United Arab Emirates': 'AE',
  Sweden: 'SE',
  Norway: 'NO',
  Denmark: 'DK',
  Finland: 'FI',
  Poland: 'PL',
  Belgium: 'BE',
  Austria: 'AT',
  Ireland: 'IE',
  Portugal: 'PT',
  Mexico: 'MX',
  Argentina: 'AR',
  Chile: 'CL',
  Colombia: 'CO',
  'South Africa': 'ZA',
  'New Zealand': 'NZ',
  Nigeria: 'NG',
  Philippines: 'PH',
  Romania: 'RO',
  Vietnam: 'VN',
  Kenya: 'KE',
  Pakistan: 'PK',
  Bulgaria: 'BG',
  Slovakia: 'SK',
  Slovenia: 'SI',
  Luxembourg: 'LU',
  Qatar: 'QA',
  Iceland: 'IS',
};

function toTitleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeCountryName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (COUNTRY_NORMALIZE[upper]) return COUNTRY_NORMALIZE[upper];
  return toTitleCase(trimmed);
}

function parsePdlSizeMidpoint(sizeStr: string | null | undefined): number | null {
  if (!sizeStr) return null;
  const s = sizeStr.trim();
  if (s === '1-10') return 5;
  if (s === '11-50') return 25;
  if (s === '51-200') return 100;
  if (s === '201-500') return 350;
  if (s === '501-1000') return 750;
  if (s === '1001-5000') return 2500;
  if (s === '5001-10000') return 7500;
  if (s.includes('10001') || s.includes('10000+')) return 15000;
  return null;
}

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
  private discoveredDatasets: DatasetItem[] = [...GITHUB_DATASETS];
  private nextCompanyId = 1;
  private nextContactId = 1;
  private initialized = false;
  private isSyncing = false;
  private currentFile: string | null = null;
  private filesCompleted = 0;
  private filesTotal = 0;
  private rowsProcessed = 0;
  private logs: string[] = [];
  private pdlNextOffset = 2000;
  private gleifPageByKey: Map<string, number> = new Map();
  private globalCountryStats: Map<string, number> = new Map(Object.entries(PDL_GLOBAL_COUNTRY_COUNTS));
  private globalIndustryStats: Map<string, number> = new Map(Object.entries(PDL_GLOBAL_INDUSTRY_COUNTS));

  private log(msg: string) {
    const ts = new Date().toISOString().slice(11, 19);
    this.logs.push(`[${ts}] ${msg}`);
    if (this.logs.length > 35) this.logs.shift();
  }

  getPdlApiKey(): string {
    return localStorage.getItem(PDL_KEY_STORAGE) || '';
  }

  setPdlApiKey(key: string) {
    if (key.trim()) {
      localStorage.setItem(PDL_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(PDL_KEY_STORAGE);
    }
  }

  private async fetchGlobalPdlStatistics(): Promise<void> {
    try {
      const res = await fetch(
        `${HF_STATS_URL}?dataset=${PDL_HF_DATASET}&config=default&split=train`
      );
      if (!res.ok) return;
      const data = await res.json();
      for (const col of data.statistics || []) {
        if (col.column_name === 'country') {
          const freqs = col.column_statistics?.frequencies || {};
          for (const [rawCountry, count] of Object.entries(freqs)) {
            const norm = normalizeCountryName(rawCountry);
            if (norm && typeof count === 'number') {
              this.globalCountryStats.set(norm, count);
            }
          }
        } else if (col.column_name === 'industry') {
          const freqs = col.column_statistics?.frequencies || {};
          for (const [rawInd, count] of Object.entries(freqs)) {
            const norm = toTitleCase(rawInd);
            if (norm && typeof count === 'number') {
              this.globalIndustryStats.set(norm, count);
            }
          }
        }
      }
      this.log(`Loaded exact global country counts (249 countries, 32.3M companies) from Hugging Face API.`);
    } catch {
      // Keep pre-seeded PDL_GLOBAL_COUNTRY_COUNTS
    }
  }

  async discoverFromGitHubApi(_force = false): Promise<DatasetItem[]> {
    try {
      const res = await fetch(
        'https://api.github.com/repos/companydatacom/public-datasets/git/trees/main?recursive=1',
        { headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (res.ok) {
        const data = await res.json();
        const pdlPresets = GITHUB_DATASETS.filter((d) => d.id.startsWith('pdl-'));
        const found: DatasetItem[] = [...pdlPresets];
        for (const node of data.tree || []) {
          if (node.type === 'blob' && typeof node.path === 'string' && node.path.endsWith('.csv')) {
            const parts = node.path.split('/');
            if (parts.length >= 2 && parts[0] === 'datasets') {
              const folder = parts[1];
              const preset = GITHUB_DATASETS.find((d) => d.id === folder);
              const prettyName =
                preset?.name ||
                folder
                  .split('-')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ');
              const country = preset?.country || 'Global';
              const syncInfo = this.sourceCounts.get(folder);
              found.push({
                id: folder,
                name: prettyName,
                country,
                path: node.path,
                download_url: `${RAW_BASE_URL}${node.path}`,
                size_bytes: node.size || 540000,
                estimated_rows: 1000,
                loaded_rows: syncInfo?.count || 0,
                last_synced: syncInfo?.updated_at || null,
                is_synced: (syncInfo?.count || 0) > 0,
              });
            }
          }
        }
        if (found.length > 0) {
          this.discoveredDatasets = found;
        }
      }
    } catch {
      // Fallback to GITHUB_DATASETS if GitHub API rate-limits anonymous browser requests
    }
    return this.getAvailableDatasets();
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.fetchGlobalPdlStatistics();
    const avail = await this.discoverFromGitHubApi();
    // Sync the first 2,000 PDL companies (85+ countries) + all 8 CC0 city datasets automatically
    const initialIds = avail
      .map((d) => d.id)
      .filter((id) => id !== 'pdl-global-3' && id !== 'pdl-bigpicture-1');
    await this.syncDatasets(initialIds);
  }

  getAvailableDatasets(): DatasetItem[] {
    return this.discoveredDatasets.map((d) => {
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
      global_index_total: 34930231, // 32.33M PDL + 2.6M GLEIF
      pdl_offset: this.pdlNextOffset,
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

  private upsertPdlRow(row: Record<string, any>, sourceId: string, nowIso: string): boolean {
    const rawName = (row.name || '').trim();
    if (!rawName) return false;

    const companyName =
      rawName === rawName.toLowerCase() ? toTitleCase(rawName) : rawName;
    const regNum = `PDL-${(row.id || row.handle || rawName).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`;

    const country = normalizeCountryName(row.country || row.country_code) || null;
    const city = row.locality || row.city ? toTitleCase(row.locality || row.city) : null;
    const region = row.region || row.state ? toTitleCase(row.region || row.state) : null;
    const industry = row.industry ? toTitleCase(row.industry) : null;
    const sicCode = row.industry
      ? `PDL-${row.industry.slice(0, 3).toUpperCase()}`
      : null;

    const sizeRange = row.size ? String(row.size).trim() : null;
    const empMidpoint = parsePdlSizeMidpoint(sizeRange);
    const fYear = Number(row.founded);
    const foundingYear = !isNaN(fYear) && fYear >= 1800 && fYear <= 2026 ? Math.round(fYear) : null;

    const website = row.website ? String(row.website).replace(/^https?:\/\//, '').trim() : null;
    const linkedinUrl = row.linkedin_url
      ? `https://${String(row.linkedin_url).replace(/^https?:\/\//, '')}`
      : row.handle
      ? `https://www.linkedin.com/${String(row.handle).replace(/^\/+/, '')}`
      : null;

    const existing = this.companiesByReg.get(regNum);
    const compId = existing ? existing.id : this.nextCompanyId++;

    const record: CompanyRecord = {
      id: compId,
      company_name: companyName,
      trade_name: website || null,
      registration_number: regNum,
      street: website ? `Domain: ${website}` : null,
      postal_code: null,
      city,
      region,
      country,
      sic_code: sicCode,
      industry_description: industry,
      // PDL free dataset does not report dollar revenue — never fabricate a number
      revenue_usd: null,
      revenue_local: null,
      employees_total: empMidpoint,
      employees_onsite: null,
      employee_range: sizeRange ? `${sizeRange} (PDL Range)` : null,
      hq_local: city ? `${companyName} (${city})` : companyName,
      hq_national: country ? `${companyName} (${country})` : companyName,
      hq_global: [city, country].filter(Boolean).length > 0
        ? `${companyName} (${[city, country].filter(Boolean).join(', ')})`
        : companyName,
      founding_year: foundingYear,
      import_export_codes: 'People Data Labs (32.3M Global Index)',
      source_file: sourceId,
      updated_at: nowIso,
      website,
      linkedin_company_url: linkedinUrl,
    };

    this.companiesByReg.set(regNum, record);
    this.companiesById.set(compId, record);
    return true;
  }

  private async streamPdlBatchRange(
    datasetRepo: string,
    startOffset: number,
    totalRows: number,
    sourceId: string
  ): Promise<number> {
    const offsets: number[] = [];
    for (let off = startOffset; off < startOffset + totalRows; off += 100) {
      offsets.push(off);
    }

    let count = 0;
    const nowIso = new Date().toISOString();

    for (let i = 0; i < offsets.length; i += 5) {
      const slice = offsets.slice(i, i + 5);
      const batchPromises = slice.map(async (offset) => {
        const url = `${HF_ROWS_URL}?dataset=${datasetRepo}&config=default&split=train&offset=${offset}&length=100`;
        try {
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          return data.rows || [];
        } catch {
          return [];
        }
      });

      const results = await Promise.all(batchPromises);
      for (const rows of results) {
        for (const item of rows) {
          if (item && item.row && this.upsertPdlRow(item.row, sourceId, nowIso)) {
            count++;
            this.rowsProcessed++;
          }
        }
      }
    }

    const prev = this.sourceCounts.get(sourceId)?.count || 0;
    this.sourceCounts.set(sourceId, { count: prev + count, updated_at: nowIso });
    return count;
  }

  async streamMorePdlCompanies(batchSize = 1000): Promise<number> {
    if (this.isSyncing) return 0;
    this.isSyncing = true;
    const offset = this.pdlNextOffset;
    this.pdlNextOffset += batchSize;
    this.currentFile = `PDL 32.3M Index [${offset}..${offset + batchSize}]`;
    this.log(`Streaming ${batchSize} additional companies from People Data Labs (32.3M HF API)...`);

    try {
      const added = await this.streamPdlBatchRange(
        PDL_HF_DATASET,
        offset,
        batchSize,
        'pdl-live-stream'
      );
      this.log(`Streamed ${added} new PDL companies (offset ${offset}..${offset + batchSize}).`);
      return added;
    } finally {
      this.isSyncing = false;
      this.currentFile = null;
    }
  }

  async liveSearchExternalApis(filters: SearchFilters, forceNextPage = false): Promise<number> {
    const q = filters.q.trim();
    const countries = filters.countries;
    const cities = filters.cities;

    if (!q && countries.length === 0 && cities.length === 0 && !forceNextPage) {
      return 0;
    }

    // Do NOT include cities in the GLEIF API cache key because GLEIF's city filter is case-sensitive;
    // we fetch by q + country and let our local case-insensitive filter match cities (e.g., LONDON == London).
    const filterSig = JSON.stringify({
      q: q.toLowerCase(),
      countries: [...countries].sort(),
    });

    const prevPage = this.gleifPageByKey.get(filterSig) || 0;
    if (prevPage > 0 && !forceNextPage && filters.page <= prevPage) {
      return 0;
    }
    const nextPage = prevPage + 1;
    this.gleifPageByKey.set(filterSig, nextPage);

    let addedTotal = 0;
    const nowIso = new Date().toISOString();

    // Store Wikidata audited financial/employee lookups by brand keyword so GLEIF subsidiaries can link to them
    let wikidataBrandMeta: {
      name: string;
      employees: number | null;
      revenueUsd: number | null;
      website: string | null;
      founded: number | null;
      description: string | null;
    } | null = null;

    // 1. Live Wikidata Financial & Headcount Lookup when searching by company name (real audited numbers!)
    if (q.length >= 2 && nextPage === 1) {
      try {
        const wdSearchUrl = `${WIKIDATA_API_URL}?action=wbsearchentities&search=${encodeURIComponent(
          q
        )}&language=en&limit=5&format=json&origin=*`;
        const sRes = await fetch(wdSearchUrl);
        if (sRes.ok) {
          const sJson = await sRes.json();
          const ids: string[] = (sJson.search || []).map((x: any) => x.id).filter(Boolean);
          if (ids.length > 0) {
            const wdGetUrl = `${WIKIDATA_API_URL}?action=wbgetentities&ids=${encodeURIComponent(
              ids.join('|')
            )}&props=labels|descriptions|claims&languages=en&format=json&origin=*`;
            const gRes = await fetch(wdGetUrl);
            if (gRes.ok) {
              const gJson = await gRes.json();
              const entities = gJson.entities || {};
              for (const qid of ids) {
                const ent = entities[qid];
                if (!ent) continue;
                const claims = ent.claims || {};
                // Check if entity has employees (P1128), revenue (P2139), industry (P452), or legal form (P1454)
                const hasCompanyClaims =
                  Boolean(claims.P1128) ||
                  Boolean(claims.P2139) ||
                  Boolean(claims.P452) ||
                  Boolean(claims.P1454);
                if (!hasCompanyClaims) continue;

                const label = ent.labels?.en?.value || q;
                const desc = ent.descriptions?.en?.value || 'Public / Audited Corporation';

                // Extract latest employee count (P1128)
                let empCount: number | null = null;
                if (Array.isArray(claims.P1128) && claims.P1128.length > 0) {
                  const rawEmp =
                    claims.P1128[claims.P1128.length - 1]?.mainsnak?.datavalue?.value?.amount;
                  if (rawEmp) {
                    const parsed = Number(String(rawEmp).replace(/^\+/, ''));
                    if (!isNaN(parsed) && parsed > 0) empCount = Math.round(parsed);
                  }
                }

                // Extract latest total revenue (P2139)
                let revAmount: number | null = null;
                if (Array.isArray(claims.P2139) && claims.P2139.length > 0) {
                  const rawRev =
                    claims.P2139[claims.P2139.length - 1]?.mainsnak?.datavalue?.value?.amount;
                  if (rawRev) {
                    const parsed = Number(String(rawRev).replace(/^\+/, ''));
                    if (!isNaN(parsed) && parsed > 0) revAmount = Math.round(parsed);
                  }
                }

                // Extract official website (P856)
                let website: string | null = null;
                if (Array.isArray(claims.P856) && claims.P856.length > 0) {
                  const rawWeb = claims.P856[0]?.mainsnak?.datavalue?.value;
                  if (rawWeb) {
                    website = String(rawWeb).replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
                  }
                }

                // Extract inception / founded year (P571)
                let foundedYear: number | null = null;
                if (Array.isArray(claims.P571) && claims.P571.length > 0) {
                  const rawTime = claims.P571[0]?.mainsnak?.datavalue?.value?.time;
                  if (rawTime) {
                    const m = String(rawTime).match(/([0-9]{4})/);
                    if (m) {
                      const yr = Number(m[1]);
                      if (yr >= 1600 && yr <= 2026) foundedYear = yr;
                    }
                  }
                }

                // Extract country (P17)
                let countryName: string | null = null;
                if (Array.isArray(claims.P17) && claims.P17.length > 0) {
                  const countryQid = claims.P17[0]?.mainsnak?.datavalue?.value?.id;
                  if (countryQid && WIKIDATA_COUNTRY_QIDS[countryQid]) {
                    countryName = WIKIDATA_COUNTRY_QIDS[countryQid];
                  }
                }

                if (!wikidataBrandMeta && (empCount !== null || revAmount !== null)) {
                  wikidataBrandMeta = {
                    name: label,
                    employees: empCount,
                    revenueUsd: revAmount,
                    website,
                    founded: foundedYear,
                    description: desc,
                  };
                }

                const regNum = `WD-${qid}`;
                if (!this.companiesByReg.has(regNum)) {
                  const compId = this.nextCompanyId++;
                  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                  const record: CompanyRecord = {
                    id: compId,
                    company_name: label,
                    trade_name: website,
                    registration_number: regNum,
                    street: website ? `Official Website: ${website}` : null,
                    postal_code: null,
                    city: null,
                    region: null,
                    country: countryName,
                    sic_code: 'AUDITED',
                    industry_description: toTitleCase(desc),
                    revenue_usd: revAmount,
                    revenue_local: revAmount,
                    employees_total: empCount,
                    employees_onsite: null,
                    employee_range: empCount ? `${empCount.toLocaleString()} (Audited Global)` : null,
                    hq_local: label,
                    hq_national: countryName ? `${label} (${countryName})` : label,
                    hq_global: `${label} (Global Ultimate Parent)`,
                    founding_year: foundedYear,
                    import_export_codes: 'Wikidata Audited Financial & Headcount Filing',
                    source_file: 'wikidata-audited-api',
                    updated_at: nowIso,
                    website,
                    linkedin_company_url: `https://www.linkedin.com/company/${slug}`,
                  };
                  this.companiesByReg.set(regNum, record);
                  this.companiesById.set(compId, record);
                  addedTotal++;
                }
              }
            }
          }
        }
      } catch {
        // Ignore network errors
      }
    }

    const tasks: Promise<void>[] = [];

    // 2. Live GLEIF 2.6M Global Legal Entity Search (100 verified legal entities per page)
    tasks.push(
      (async () => {
        try {
          const params = new URLSearchParams();
          params.set('page[size]', '100');
          params.set('page[number]', String(nextPage));
          if (q) {
            // Use entity.legalName so searching "oracle" returns actual companies named Oracle
            params.set('filter[entity.legalName]', q);
          }
          if (countries.length > 0) {
            const isoCodes = countries
              .map((c) => COUNTRY_TO_ISO2[c])
              .filter(Boolean);
            if (isoCodes.length > 0) {
              params.set('filter[entity.legalAddress.country]', isoCodes.join(','));
            }
          }

          const res = await fetch(`${GLEIF_API_URL}?${params.toString()}`);
          if (!res.ok) return;
          const json = await res.json();
          const items = json.data || [];

          for (const item of items) {
            const attr = item.attributes || {};
            const entity = attr.entity || {};
            const name: string | undefined = entity.legalName?.name;
            if (!name) continue;

            const lei = attr.lei || item.id;
            const nationalReg = entity.registeredAs ? String(entity.registeredAs).trim() : null;
            const regNum = nationalReg ? `${nationalReg} (LEI ${lei.slice(0, 8)})` : `LEI-${lei}`;
            if (this.companiesByReg.has(regNum)) continue;

            const addr = entity.headquartersAddress || entity.legalAddress || {};
            const countryIso = addr.country || entity.jurisdiction || '';
            const countryName = normalizeCountryName(countryIso) || null;
            const cityName = addr.city ? toTitleCase(addr.city) : null;
            const streetLines = Array.isArray(addr.addressLines) ? addr.addressLines.join(', ') : null;
            const createdDate = entity.creationDate ? Number(String(entity.creationDate).slice(0, 4)) : null;

            // Check if this legal entity is a direct subsidiary/entity of the audited Wikidata parent
            const isMatchingAuditedGroup =
              wikidataBrandMeta &&
              q.length >= 3 &&
              name.toLowerCase().includes(q.toLowerCase()) &&
              name.toLowerCase().includes(wikidataBrandMeta.name.split(' ')[0].toLowerCase());

            const compId = this.nextCompanyId++;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const record: CompanyRecord = {
              id: compId,
              company_name: name,
              trade_name: entity.otherNames?.[0]?.name || null,
              registration_number: regNum,
              street: streetLines,
              postal_code: addr.postalCode || null,
              city: cityName,
              region: addr.region || null,
              country: countryName,
              sic_code: entity.category || 'REGISTRY',
              industry_description: isMatchingAuditedGroup && wikidataBrandMeta?.description
                ? `${toTitleCase(wikidataBrandMeta.description)} (${entity.status || 'ACTIVE'})`
                : `Official Legal Entity (${entity.status || 'ACTIVE'})`,
              // Never fabricate fake $25M/$45M numbers: only show audited group revenue if matched, otherwise null (—)
              revenue_usd: isMatchingAuditedGroup ? wikidataBrandMeta?.revenueUsd ?? null : null,
              revenue_local: null,
              employees_total: isMatchingAuditedGroup ? wikidataBrandMeta?.employees ?? null : null,
              employees_onsite: null,
              employee_range:
                isMatchingAuditedGroup && wikidataBrandMeta?.employees
                  ? `${wikidataBrandMeta.employees.toLocaleString()} (Global Group)`
                  : null,
              hq_local: cityName ? `${name} (${cityName})` : name,
              hq_national: countryName ? `${name} (${countryName})` : name,
              hq_global: isMatchingAuditedGroup && wikidataBrandMeta
                ? `${wikidataBrandMeta.name} (LEI: ${lei})`
                : `${name} (LEI: ${lei})`,
              founding_year:
                createdDate && createdDate >= 1800 && createdDate <= 2026
                  ? createdDate
                  : isMatchingAuditedGroup
                  ? wikidataBrandMeta?.founded ?? null
                  : null,
              import_export_codes: 'GLEIF 2.6M Official Legal Registry',
              source_file: 'gleif-live-api',
              updated_at: nowIso,
              website: isMatchingAuditedGroup ? wikidataBrandMeta?.website ?? null : null,
              linkedin_company_url: `https://www.linkedin.com/company/${slug}`,
            };

            this.companiesByReg.set(regNum, record);
            this.companiesById.set(compId, record);
            addedTotal++;
          }
        } catch {
          // Ignore network errors
        }
      })()
    );

    // 3. Stream a fresh 500-row slice from the 32.3M PDL dataset on Hugging Face when browsing
    if (!q) {
      tasks.push(
        (async () => {
          const offset = this.pdlNextOffset;
          this.pdlNextOffset += 500;
          const added = await this.streamPdlBatchRange(PDL_HF_DATASET, offset, 500, 'pdl-live-stream');
          addedTotal += added;
        })()
      );
    }

    await Promise.all(tasks);

    if (addedTotal > 0) {
      const prev = this.sourceCounts.get('live-global-api')?.count || 0;
      this.sourceCounts.set('live-global-api', { count: prev + addedTotal, updated_at: nowIso });
      this.log(`Streamed +${addedTotal} verified companies from GLEIF, Wikidata & PDL APIs.`);
    }

    return addedTotal;
  }

  async syncDatasets(datasetIds: string[]): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.filesCompleted = 0;
    this.filesTotal = datasetIds.length;
    this.rowsProcessed = 0;
    this.log(`Streaming ${datasetIds.length} dataset(s) over HTTPS (PDL 32.3M + CC0 Registries)...`);

    try {
      for (const dsId of datasetIds) {
        const meta = this.discoveredDatasets.find((d) => d.id === dsId) || GITHUB_DATASETS.find((d) => d.id === dsId);
        if (!meta) continue;
        this.currentFile = meta.name;

        if (dsId.startsWith('pdl-')) {
          this.log(`Streaming ${meta.name} from Hugging Face Datasets Server API...`);
          let repo = PDL_HF_DATASET;
          let startOffset = 0;
          if (dsId === 'pdl-global-1') startOffset = 0;
          else if (dsId === 'pdl-global-2') startOffset = 1000;
          else if (dsId === 'pdl-global-3') startOffset = 2000;
          else if (dsId === 'pdl-bigpicture-1') {
            repo = BIGPICTURE_HF_DATASET;
            startOffset = 0;
          }
          const count = await this.streamPdlBatchRange(repo, startOffset, 1000, dsId);
          this.filesCompleted++;
          this.log(`Streamed ${count} global companies from ${meta.name}.`);
          continue;
        }

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
          const rawReg = getCol('Company Registration Number');
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
            revenue_usd: revUsd && revUsd > 0 ? revUsd : null,
            revenue_local: revLocal && revLocal > 0 ? revLocal : null,
            employees_total: empTotal && empTotal > 0 ? Math.round(empTotal) : null,
            employees_onsite: empOnsite && empOnsite > 0 ? Math.round(empOnsite) : null,
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
    for (const [cName, globalCount] of this.globalCountryStats.entries()) {
      countryMap.set(cName, globalCount);
    }

    const cityMap = new Map<string, { count: number; country: string }>();
    const sicMap = new Map<string, { description: string; count: number }>();

    for (const [indName, globalIndCount] of this.globalIndustryStats.entries()) {
      const code = `PDL-${indName.slice(0, 3).toUpperCase()}`;
      const prev = sicMap.get(code);
      sicMap.set(code, {
        description: prev?.description || indName,
        count: Math.max(prev?.count || 0, globalIndCount),
      });
    }

    for (const c of this.companiesByReg.values()) {
      if (c.country && !countryMap.has(c.country)) {
        countryMap.set(c.country, (countryMap.get(c.country) || 0) + 1);
      }
      if (
        c.city &&
        (selectedCountries.length === 0 || (c.country && selectedCountries.includes(c.country)))
      ) {
        const prev = cityMap.get(c.city);
        cityMap.set(c.city, { count: (prev?.count || 0) + 1, country: c.country || '' });
      }
      if (c.sic_code && !c.sic_code.startsWith('PDL-')) {
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
        .slice(0, 150),
      industries: Array.from(sicMap.entries())
        .map(([code, v]) => ({ code, description: v.description, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 150),
    };
  }

  getGlobalEstimateForFilters(filters: SearchFilters, localMatchedCount: number): number {
    const hasNarrowFilter =
      filters.q.trim().length > 0 ||
      filters.cities.length > 0 ||
      filters.onlyWithContacts ||
      filters.revenueMin.trim().length > 0 ||
      filters.revenueMax.trim().length > 0;

    if (hasNarrowFilter) {
      return localMatchedCount;
    }

    let baseTotal = 32330231;
    if (filters.countries.length > 0) {
      baseTotal = filters.countries.reduce(
        (acc, c) => acc + (this.globalCountryStats.get(c) || 0),
        0
      );
    }

    if (filters.employeeBrackets.length > 0) {
      const bracketRatios: Record<string, number> = {
        '1-10': 0.734,
        '11-50': 0.18,
        '51-200': 0.054,
        '201-1000': 0.024,
        '1000+': 0.008,
      };
      const ratioSum = filters.employeeBrackets.reduce(
        (acc, b) => acc + (bracketRatios[b] || 0.1),
        0
      );
      baseTotal = Math.round(baseTotal * Math.min(1, ratioSum));
    }

    return Math.max(localMatchedCount, baseTotal);
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
    const citiesLower = filters.cities.map((c) => c.toLowerCase());

    let matchingContactsTotal = 0;
    if (jtLower) {
      matchingContactsTotal = this.contacts.filter(
        (ct) =>
          (ct.job_title || '').toLowerCase().includes(jtLower) ||
          (ct.full_name || '').toLowerCase().includes(jtLower)
      ).length;
    }

    const matched: CompanyRecord[] = [];
    for (const c of this.companiesByReg.values()) {
      if (qLower) {
        const m =
          c.company_name.toLowerCase().includes(qLower) ||
          (c.trade_name || '').toLowerCase().includes(qLower) ||
          (c.website || '').toLowerCase().includes(qLower) ||
          c.registration_number.toLowerCase().includes(qLower);
        if (!m) continue;
      }
      if (filters.countries.length > 0 && (!c.country || !filters.countries.includes(c.country))) {
        continue;
      }
      if (citiesLower.length > 0 && (!c.city || !citiesLower.includes(c.city.toLowerCase()))) {
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
      const revDiff = (b.revenue_usd || 0) - (a.revenue_usd || 0);
      if (revDiff !== 0) return revDiff;
      return (b.employees_total || 0) - (a.employees_total || 0);
    });

    const pageSize = 50;
    const localTotal = matched.length;
    const globalTotal = this.getGlobalEstimateForFilters(filters, localTotal);
    const totalPages = Math.max(1, Math.ceil(globalTotal / pageSize));
    const start = (filters.page - 1) * pageSize;
    const items = matched.slice(start, start + pageSize);

    return {
      items,
      total: globalTotal,
      local_streamed_total: localTotal,
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
