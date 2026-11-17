export interface ContactRecord {
  id: number;
  full_name: string;
  job_title: string;
  company_id: number | null;
  company_registration_number: string | null;
  company_name: string | null;
  email: string | null;
  linkedin_url: string | null;
  source: string | null;
}

export interface CompanyRecord {
  id: number;
  company_name: string;
  trade_name: string | null;
  registration_number: string;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  sic_code: string | null;
  industry_description: string | null;
  revenue_usd: number | null;
  revenue_local: number | null;
  employees_total: number | null;
  employees_onsite: number | null;
  hq_local: string | null;
  hq_national: string | null;
  hq_global: string | null;
  founding_year: number | null;
  import_export_codes: string | null;
  source_file: string | null;
  updated_at: string | null;
  contacts?: ContactRecord[];
  matching_contacts?: ContactRecord[];
  related_entities?: Array<{
    id: number;
    company_name: string;
    city: string | null;
    country: string | null;
    registration_number: string;
    employees_total: number | null;
    revenue_usd: number | null;
  }>;
}

export interface DatasetItem {
  id: string;
  name: string;
  country: string;
  path: string;
  download_url: string;
  size_bytes: number;
  estimated_rows: number;
  loaded_rows: number;
  last_synced: string | null;
  is_synced: boolean;
}

export interface SyncStatusResponse {
  total_companies: number;
  total_contacts: number;
  sources: Array<{
    source_file: string;
    count: number;
    updated_at: string | null;
  }>;
  sync: {
    is_running: boolean;
    current_file: string | null;
    files_completed: number;
    files_total: number;
    rows_processed: number;
    contacts_extracted: number;
    started_at: string | null;
    finished_at: string | null;
    last_error: string | null;
    recent_logs: string[];
  };
}

export interface FilterFacets {
  countries: Array<{ name: string; count: number }>;
  cities: Array<{ name: string; count: number; country: string }>;
  industries: Array<{ code: string; description: string; count: number }>;
}

export interface SearchFilters {
  searchMode: 'combined' | 'companies' | 'job_title';
  q: string;
  jobTitle: string;
  onlyWithContacts: boolean;
  countries: string[];
  cities: string[];
  industryKeyword: string;
  sicCodes: string[];
  employeeBrackets: string[];
  revenueMin: string;
  revenueMax: string;
  sortBy: string;
  page: number;
}
