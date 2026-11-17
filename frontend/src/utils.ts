export function formatCurrencyUSD(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  if (val === 0) return '—';
  if (val >= 1_000_000_000) {
    return `$${(val / 1_000_000_000).toFixed(1)}B`;
  }
  if (val >= 1_000_000) {
    return `$${(val / 1_000_000).toFixed(1)}M`;
  }
  if (val >= 1_000) {
    return `$${(val / 1_000).toFixed(0)}K`;
  }
  return `$${val.toFixed(0)}`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || val === 0) return '—';
  return val.toLocaleString('en-US');
}

export function buildLinkedInXrayUrl(companyName: string, jobTitle: string): string {
  const cleanCompany = companyName.replace(/"/g, '').trim();
  const cleanRole = (jobTitle || 'CEO').replace(/"/g, '').trim();
  const query = `site:linkedin.com/in "${cleanCompany}" "${cleanRole}"`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
