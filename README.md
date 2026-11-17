# ApexB2B — Cloud Company & Prospect Intelligence Platform

A cloud-ready, ZoomInfo-style B2B Company & Prospect Intelligence web application powered by the CC0 open-source firmographic datasets from [`companydatacom/public-datasets`](https://github.com/companydatacom/public-datasets).

## Key Features

- **Zero-Local-Download HTTPS Streaming:** Dynamically discovers available city/country datasets via the GitHub API (`GET /api/datasets/available`) and streams raw CSV files over HTTPS in 250-row batches directly into PostgreSQL (`POST /api/datasets/sync`) using `ON CONFLICT (registration_number) DO UPDATE`.
- **Multi-Criteria Sidebar Filtering:**
  - **Search Mode Toggle:** `Combined` | `Companies` | `By Job Title`
  - **Job Title / Role Discovery:** Matches contacts in PostgreSQL and generates 1-click LinkedIn X-Ray searches (`site:linkedin.com/in "<Company Name>" "<Job Title>"`) for every company.
  - **Instant Company Name / Trade Name / Registration # Search**
  - **Region Facets:** Multi-select **Country** and **City** filters with live PostgreSQL row counts.
  - **Industry Facets:** Searchable **SIC Code** and industry keyword filter.
  - **Firmographic Brackets:** Employee size brackets (`1-10`, `11-50`, `51-200`, `201-1000`, `1000+`) and annual USD revenue presets/ranges.
- **Slide-Over Company Drawer:** Full street address, registration number, local/national/global HQ parent linkages, affiliated corporate group members, known contacts, and an interactive **Role Finder**.
- **People / Director CSV Importer (`POST /api/contacts/upload`):** Upload any CSV of contacts or directors and automatically match them to companies by registration number or company name.
- **Single-Service Cloud Deployment:** Multi-stage `Dockerfile` compiles the React + Tailwind frontend and serves it directly from FastAPI on `$PORT`. Protected by `APP_PASSWORD`.

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step instructions to deploy on **Railway** or **Render**.
