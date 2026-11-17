# Cloud Deployment Guide — ApexB2B Intelligence

This application is designed so you **never need to download large dataset files or install `git-lfs` on your computer**.
Instead, the app runs as a **single cloud web service** (FastAPI + compiled React/Tailwind frontend) that streams the open-source CC0 datasets directly from `https://github.com/companydatacom/public-datasets` into a managed PostgreSQL database in small 250-row batches.

---

## Step 1: Push This Project to a New GitHub Repository

1. Go to [https://github.com/new](https://github.com/new) and create a new repository (for example, `apex-b2b-intelligence`). Leave **"Add a README"** unchecked.
2. In your terminal inside this project folder, link your new GitHub repository and push:

```bash
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/apex-b2b-intelligence.git
git push -u origin main
```

---

## Step 2: Deploy to the Cloud (Choose Option A: Railway OR Option B: Render)

### Option A: Deploy on Railway (Recommended — 2 Minutes)

1. Go to [https://railway.app](https://railway.app) and sign in with your GitHub account.
2. Click **"New Project"** -> **"Deploy from GitHub repo"** and select your `apex-b2b-intelligence` repository.
3. Add a PostgreSQL database to the same project:
   - Click the **"+ New"** button on your project canvas -> **"Database"** -> **"Add PostgreSQL"**.
4. Connect PostgreSQL and set your password on the Web Service:
   - Click on your **Web Service** card -> go to the **"Variables"** tab.
   - Click **"+ New Variable"** -> add a reference variable:
     - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - Add your private access password:
     - `APP_PASSWORD` = `your-secret-password-here`
   - (Optional) `AUTO_SYNC_STARTER` = `true` (automatically loads starter cities on first boot).
5. Go to the **"Settings"** tab -> under **"Networking"**, click **"Generate Domain"** to get your public `https://...up.railway.app` URL.
6. Railway will automatically build the `Dockerfile` (using `railway.json`) and launch the app.

---

### Option B: Deploy on Render (1-Click Blueprint via `render.yaml`)

1. Go to [https://dashboard.render.com](https://dashboard.render.com) and sign in with GitHub.
2. Click **"New +"** in the top navigation bar and select **"Blueprint"**.
3. Connect your `apex-b2b-intelligence` repository.
4. Render will automatically detect `render.yaml` and prepare:
   - A managed PostgreSQL database (`apex-b2b-postgres`)
   - The Docker web service (`apex-b2b-intelligence`) with `DATABASE_URL` automatically wired up.
5. Click **"Apply"** to create both resources.
6. Once deployed, open the `apex-b2b-intelligence` web service -> **"Environment"** tab to view or customize your `APP_PASSWORD`.

---

## Step 3: Unlock the App & Load Datasets from Your Browser

1. Open your deployed cloud URL in your browser.
2. Enter your `APP_PASSWORD` on the lock screen and click **"Unlock Intelligence Workspace"**.
   - Your browser saves this key in `localStorage` so you won't have to type it again on that device.
3. Click **"Dataset Manager & Sync"** in the top-right header:
   - You will see all available city/country datasets discovered live from `companydatacom/public-datasets` (`Amsterdam`, `Berlin`, `London`, `Los Angeles`, `Madrid`, `New York City`, `Paris`, `Rome`).
   - Check the datasets you want and click **"Sync Selected to PostgreSQL"**.
   - Watch the live HTTPS stream log as rows upsert into PostgreSQL with `ON CONFLICT (registration_number) DO UPDATE`.

---

## Step 4: Searching by Job Title & Uploading Contacts

- **Role Discovery & LinkedIn X-Ray:** Type any role into the **Job Title / Target Role** box on the left sidebar (e.g., `VP Marketing`, `Head of Demand Generation`, `CEO`, `Founder`).
  - Matching contacts from your `contacts` table appear directly in the table row (including 840+ real CEOs extracted from the Paris registry).
  - Every company row also displays a 1-click **"Find [Job Title]"** button that launches a targeted LinkedIn X-Ray search (`site:linkedin.com/in "<Company Name>" "<Job Title>"`).
- **Slide-Over Company Profile & Role Finder:** Click any company row to inspect its street address, SIC code, corporate parent/subsidiary HQ hierarchy (`hq_local`, `hq_national`, `hq_global`), affiliated group entities, and interactive **Role Finder**.
- **Uploading Your Own People CSV:** Open **Dataset Manager & Sync** -> click **"Upload Contacts CSV"** (`POST /api/contacts/upload`). Upload any CSV with columns such as `full_name, job_title, company_registration_number, company_name, email, linkedin_url` to automatically link people to companies in PostgreSQL.
