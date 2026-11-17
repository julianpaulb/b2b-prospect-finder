import csv
import io
import os
import logging
import threading
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Header, Query, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from psycopg2.extras import execute_values

from backend.database import init_db, get_db_cursor, get_db_connection
from backend.ingestion import (
    discover_available_datasets,
    stream_and_sync_datasets,
    get_sync_status,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger(__name__)

APP_PASSWORD = os.getenv("APP_PASSWORD", "zoominfo2026")
AUTO_SYNC_STARTER = os.getenv("AUTO_SYNC_STARTER", "true").lower() in ("1", "true", "yes")

app = FastAPI(
    title="ApexB2B — Cloud Company & Prospect Intelligence",
    description="ZoomInfo-style B2B Company & Prospect Intelligence powered by CC0 CompanyData.com datasets",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthRequest(BaseModel):
    password: str


class SyncRequest(BaseModel):
    datasets: Optional[List[str]] = None


def verify_access_key(
    x_app_password: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
):
    """Validates the APP_PASSWORD via X-App-Password header or query token (for CSV downloads)."""
    if not APP_PASSWORD:
        return True
    provided = x_app_password if x_app_password is not None else token
    if provided != APP_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid or missing access key (APP_PASSWORD).")
    return True


@app.on_event("startup")
def on_startup():
    try:
        init_db()
        if AUTO_SYNC_STARTER:
            status = get_sync_status()
            if status.get("total_companies", 0) == 0 and not status["sync"]["is_running"]:
                logger.info("Database is empty on startup; launching background starter sync (amsterdam, new-york-city, paris, london)...")
                threading.Thread(
                    target=stream_and_sync_datasets,
                    args=(["amsterdam", "new-york-city", "paris", "london"],),
                    daemon=True,
                ).start()
    except Exception as exc:
        logger.error(f"Startup initialization warning: {exc}")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "ApexB2B Intelligence API"}


@app.post("/api/auth/verify")
def verify_auth(payload: AuthRequest):
    if not APP_PASSWORD or payload.password == APP_PASSWORD:
        return {"authenticated": True}
    raise HTTPException(status_code=401, detail="Invalid access password.")


@app.get("/api/datasets/available")
def api_datasets_available(
    refresh: bool = False,
    _auth: bool = Depends(verify_access_key),
):
    datasets = discover_available_datasets(force_refresh=refresh)
    return {"datasets": datasets}


@app.post("/api/datasets/sync")
def api_datasets_sync(
    payload: SyncRequest,
    _auth: bool = Depends(verify_access_key),
):
    current_status = get_sync_status()
    if current_status["sync"]["is_running"]:
        return {
            "status": "already_running",
            "message": "A dataset sync is already in progress.",
            "sync": current_status["sync"],
        }

    available_ids = [d["id"] for d in discover_available_datasets()]
    selected = payload.datasets if payload.datasets else ["amsterdam", "new-york-city", "paris", "london"]
    valid_selected = [d for d in selected if d in available_ids]
    if not valid_selected:
        valid_selected = available_ids[:3]

    threading.Thread(
        target=stream_and_sync_datasets,
        args=(valid_selected,),
        daemon=True,
    ).start()

    return {
        "status": "started",
        "datasets": valid_selected,
        "message": f"Started streaming {len(valid_selected)} dataset(s) into PostgreSQL.",
    }


@app.get("/api/datasets/status")
def api_datasets_status(_auth: bool = Depends(verify_access_key)):
    return get_sync_status()


@app.get("/api/filters")
def api_get_filters(
    countries: Optional[str] = Query(default=None, description="Comma-separated selected countries to filter cities"),
    _auth: bool = Depends(verify_access_key),
):
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT country, COUNT(*) AS count FROM companies "
            "WHERE country IS NOT NULL AND country != '' "
            "GROUP BY country ORDER BY count DESC, country ASC"
        )
        country_list = [{"name": r["country"], "count": r["count"]} for r in cur.fetchall()]

        if countries:
            selected_countries = [c.strip() for c in countries.split(",") if c.strip()]
            cur.execute(
                "SELECT city, country, COUNT(*) AS count FROM companies "
                "WHERE city IS NOT NULL AND city != '' AND country = ANY(%s) "
                "GROUP BY city, country ORDER BY count DESC, city ASC LIMIT 100",
                (selected_countries,),
            )
        else:
            cur.execute(
                "SELECT city, country, COUNT(*) AS count FROM companies "
                "WHERE city IS NOT NULL AND city != '' "
                "GROUP BY city, country ORDER BY count DESC, city ASC LIMIT 100"
            )
        city_list = [
            {"name": r["city"], "country": r["country"], "count": r["count"]}
            for r in cur.fetchall()
        ]

        cur.execute(
            "SELECT sic_code, MAX(industry_description) AS description, COUNT(*) AS count "
            "FROM companies WHERE sic_code IS NOT NULL AND sic_code != '' "
            "GROUP BY sic_code ORDER BY count DESC LIMIT 120"
        )
        sic_list = [
            {
                "code": r["sic_code"],
                "description": r["description"] or "Business Services",
                "count": r["count"],
            }
            for r in cur.fetchall()
        ]

    return {
        "countries": country_list,
        "cities": city_list,
        "industries": sic_list,
    }


def _build_company_where_clause(
    search_mode: str = "combined",
    q: Optional[str] = None,
    job_title: Optional[str] = None,
    countries: Optional[str] = None,
    cities: Optional[str] = None,
    industry: Optional[str] = None,
    sic_codes: Optional[str] = None,
    employee_brackets: Optional[str] = None,
    revenue_min: Optional[float] = None,
    revenue_max: Optional[float] = None,
):
    conditions = []
    params = []

    if q and q.strip():
        q_clean = f"%{q.strip()}%"
        conditions.append(
            "(c.company_name ILIKE %s OR c.trade_name ILIKE %s OR c.registration_number ILIKE %s)"
        )
        params.extend([q_clean, q_clean, q_clean])

    if countries and countries.strip():
        country_arr = [x.strip() for x in countries.split(",") if x.strip()]
        if country_arr:
            conditions.append("c.country = ANY(%s)")
            params.append(country_arr)

    if cities and cities.strip():
        city_arr = [x.strip() for x in cities.split(",") if x.strip()]
        if city_arr:
            conditions.append("c.city = ANY(%s)")
            params.append(city_arr)

    if sic_codes and sic_codes.strip():
        sic_arr = [x.strip() for x in sic_codes.split(",") if x.strip()]
        if sic_arr:
            conditions.append("c.sic_code = ANY(%s)")
            params.append(sic_arr)

    if industry and industry.strip():
        ind_clean = f"%{industry.strip()}%"
        conditions.append("(c.industry_description ILIKE %s OR c.sic_code ILIKE %s)")
        params.extend([ind_clean, ind_clean])

    if employee_brackets and employee_brackets.strip():
        brackets = [b.strip() for b in employee_brackets.split(",") if b.strip()]
        bracket_clauses = []
        for b in brackets:
            if b == "1-10":
                bracket_clauses.append("(c.employees_total BETWEEN 1 AND 10)")
            elif b == "11-50":
                bracket_clauses.append("(c.employees_total BETWEEN 11 AND 50)")
            elif b == "51-200":
                bracket_clauses.append("(c.employees_total BETWEEN 51 AND 200)")
            elif b == "201-1000":
                bracket_clauses.append("(c.employees_total BETWEEN 201 AND 1000)")
            elif b == "1000+":
                bracket_clauses.append("(c.employees_total > 1000)")
        if bracket_clauses:
            conditions.append("(" + " OR ".join(bracket_clauses) + ")")

    if revenue_min is not None:
        conditions.append("c.revenue_usd >= %s")
        params.append(revenue_min)

    if revenue_max is not None:
        conditions.append("c.revenue_usd <= %s")
        params.append(revenue_max)

    # In "job_title" strict mode with a job_title query, prioritize or filter companies that have matching contacts
    # Wait: let's make sure when search_mode == "job_title" and job_title is entered, we still return companies (or if user wants to see companies with matching contacts first, or filter when contacts exist)
    where_sql = " WHERE " + " AND ".join(conditions) if conditions else ""
    return where_sql, params


@app.get("/api/companies")
def api_search_companies(
    search_mode: str = Query(default="combined", description="combined | companies | job_title"),
    q: Optional[str] = Query(default=None),
    job_title: Optional[str] = Query(default=None),
    only_with_contacts: bool = Query(default=False),
    countries: Optional[str] = Query(default=None),
    cities: Optional[str] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    sic_codes: Optional[str] = Query(default=None),
    employee_brackets: Optional[str] = Query(default=None),
    revenue_min: Optional[float] = Query(default=None),
    revenue_max: Optional[float] = Query(default=None),
    sort_by: str = Query(default="revenue_desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    _auth: bool = Depends(verify_access_key),
):
    where_sql, params = _build_company_where_clause(
        search_mode=search_mode,
        q=q,
        job_title=job_title,
        countries=countries,
        cities=cities,
        industry=industry,
        sic_codes=sic_codes,
        employee_brackets=employee_brackets,
        revenue_min=revenue_min,
        revenue_max=revenue_max,
    )

    clean_job_title = (job_title or "").strip()

    # If only_with_contacts is requested, filter to companies with contacts matching the job title
    if only_with_contacts:
        if clean_job_title:
            clause = "EXISTS (SELECT 1 FROM contacts ct WHERE (ct.company_id = c.id OR ct.company_registration_number = c.registration_number) AND (ct.job_title ILIKE %s OR ct.full_name ILIKE %s))"
            where_sql = (where_sql + " AND " + clause) if where_sql else (" WHERE " + clause)
            params.extend([f"%{clean_job_title}%", f"%{clean_job_title}%"])
        else:
            clause = "EXISTS (SELECT 1 FROM contacts ct WHERE (ct.company_id = c.id OR ct.company_registration_number = c.registration_number))"
            where_sql = (where_sql + " AND " + clause) if where_sql else (" WHERE " + clause)

    sort_map = {
        "revenue_desc": "c.revenue_usd DESC NULLS LAST, c.employees_total DESC NULLS LAST",
        "revenue_asc": "c.revenue_usd ASC NULLS LAST",
        "employees_desc": "c.employees_total DESC NULLS LAST, c.revenue_usd DESC NULLS LAST",
        "employees_asc": "c.employees_total ASC NULLS LAST",
        "name_asc": "c.company_name ASC",
        "founded_desc": "c.founding_year DESC NULLS LAST",
    }
    order_clause = sort_map.get(sort_by, sort_map["revenue_desc"])

    # If job_title is entered or search_mode == 'job_title', boost companies that have matching contacts in DB to the top!
    boost_params = []
    if clean_job_title:
        boost_expr = """
        CASE WHEN EXISTS (
            SELECT 1 FROM contacts ct
            WHERE (ct.company_id = c.id OR ct.company_registration_number = c.registration_number)
              AND (ct.job_title ILIKE %s OR ct.full_name ILIKE %s)
        ) THEN 0 ELSE 1 END ASC,
        """
        boost_params = [f"%{clean_job_title}%", f"%{clean_job_title}%"]
        order_clause = boost_expr + order_clause

    offset = (page - 1) * page_size

    with get_db_cursor() as cur:
        count_sql = f"SELECT COUNT(*) AS total FROM companies c {where_sql}"
        cur.execute(count_sql, params)
        total = cur.fetchone()["total"]

        query_sql = f"""
        SELECT
            c.id,
            c.company_name,
            c.trade_name,
            c.registration_number,
            c.street,
            c.postal_code,
            c.city,
            c.region,
            c.country,
            c.sic_code,
            c.industry_description,
            c.revenue_usd,
            c.revenue_local,
            c.employees_total,
            c.employees_onsite,
            c.hq_local,
            c.hq_national,
            c.hq_global,
            c.founding_year,
            c.import_export_codes,
            c.source_file,
            c.updated_at
        FROM companies c
        {where_sql}
        ORDER BY {order_clause}
        LIMIT %s OFFSET %s
        """
        cur.execute(query_sql, params + boost_params + [page_size, offset])
        rows = cur.fetchall()

        company_ids = [r["id"] for r in rows]
        reg_numbers = [r["registration_number"] for r in rows if r["registration_number"]]

        contacts_by_company = {}
        if company_ids:
            cur.execute(
                """
                SELECT id, full_name, job_title, company_id, company_registration_number,
                       company_name, email, linkedin_url, source
                FROM contacts
                WHERE company_id = ANY(%s) OR company_registration_number = ANY(%s)
                ORDER BY id ASC
                """,
                (company_ids, reg_numbers),
            )
            all_contacts = cur.fetchall()
            for ct in all_contacts:
                cid = ct["company_id"]
                creg = ct["company_registration_number"]
                contacts_by_company.setdefault(cid, []).append(ct)
                if creg:
                    contacts_by_company.setdefault(f"reg:{creg}", []).append(ct)

        # Also query top matching contacts across the entire filtered set if job_title is active
        matching_contacts_total = 0
        if clean_job_title:
            cur.execute(
                """
                SELECT COUNT(*) AS cnt FROM contacts ct
                WHERE ct.job_title ILIKE %s OR ct.full_name ILIKE %s
                """,
                (f"%{clean_job_title}%", f"%{clean_job_title}%"),
            )
            matching_contacts_total = cur.fetchone()["cnt"]

    results = []
    for r in rows:
        cid = r["id"]
        creg = r["registration_number"]
        raw_cts = contacts_by_company.get(cid, []) + contacts_by_company.get(f"reg:{creg}", [])
        # deduplicate by contact id
        seen_ct = set()
        company_contacts = []
        matching_contacts = []
        for ct in raw_cts:
            if ct["id"] not in seen_ct:
                seen_ct.add(ct["id"])
                company_contacts.append(ct)
                if clean_job_title:
                    jt_lower = clean_job_title.lower()
                    if jt_lower in (ct.get("job_title") or "").lower() or jt_lower in (ct.get("full_name") or "").lower():
                        matching_contacts.append(ct)

        item = dict(r)
        item["revenue_usd"] = float(item["revenue_usd"]) if item["revenue_usd"] is not None else None
        item["revenue_local"] = float(item["revenue_local"]) if item["revenue_local"] is not None else None
        item["updated_at"] = item["updated_at"].isoformat() if item["updated_at"] else None
        item["contacts"] = company_contacts
        item["matching_contacts"] = matching_contacts if clean_job_title else company_contacts[:2]
        results.append(item)

    return {
        "items": results,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "matching_contacts_total": matching_contacts_total,
    }


@app.get("/api/companies/export")
def api_export_companies_csv(
    search_mode: str = Query(default="combined"),
    q: Optional[str] = Query(default=None),
    job_title: Optional[str] = Query(default=None),
    only_with_contacts: bool = Query(default=False),
    countries: Optional[str] = Query(default=None),
    cities: Optional[str] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    sic_codes: Optional[str] = Query(default=None),
    employee_brackets: Optional[str] = Query(default=None),
    revenue_min: Optional[float] = Query(default=None),
    revenue_max: Optional[float] = Query(default=None),
    _auth: bool = Depends(verify_access_key),
):
    where_sql, params = _build_company_where_clause(
        search_mode=search_mode,
        q=q,
        job_title=job_title,
        countries=countries,
        cities=cities,
        industry=industry,
        sic_codes=sic_codes,
        employee_brackets=employee_brackets,
        revenue_min=revenue_min,
        revenue_max=revenue_max,
    )

    clean_job_title = (job_title or "").strip()
    if only_with_contacts and clean_job_title:
        clause = "EXISTS (SELECT 1 FROM contacts ct WHERE (ct.company_id = c.id OR ct.company_registration_number = c.registration_number) AND (ct.job_title ILIKE %s OR ct.full_name ILIKE %s))"
        where_sql = (where_sql + " AND " + clause) if where_sql else (" WHERE " + clause)
        params.extend([f"%{clean_job_title}%", f"%{clean_job_title}%"])

    def generate_csv():
        output = io.StringIO()
        writer = csv.writer(output)
        target_role = clean_job_title or "CEO"
        writer.writerow([
            "Company Name",
            "Trade Name",
            "Registration Number",
            "Street Address",
            "Postal Code",
            "City",
            "Region",
            "Country",
            "SIC Code",
            "Industry Description",
            "Annual Revenue (USD)",
            "Annual Revenue (Local)",
            "Employees Total",
            "Employees On Site",
            "Founding Year",
            "Local HQ",
            "National HQ",
            "Global HQ",
            "Import/Export",
            f"LinkedIn X-Ray Search ({target_role})",
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        with get_db_cursor() as cur:
            sql = f"""
            SELECT
                c.company_name, c.trade_name, c.registration_number, c.street, c.postal_code,
                c.city, c.region, c.country, c.sic_code, c.industry_description,
                c.revenue_usd, c.revenue_local, c.employees_total, c.employees_onsite,
                c.founding_year, c.hq_local, c.hq_national, c.hq_global, c.import_export_codes
            FROM companies c
            {where_sql}
            ORDER BY c.revenue_usd DESC NULLS LAST
            LIMIT 10000
            """
            cur.execute(sql, params)
            for r in cur:
                xray_url = f'https://www.google.com/search?q=site:linkedin.com/in+"{r["company_name"]}"+"{target_role}"'
                writer.writerow([
                    r["company_name"],
                    r["trade_name"] or "",
                    r["registration_number"],
                    r["street"] or "",
                    r["postal_code"] or "",
                    r["city"] or "",
                    r["region"] or "",
                    r["country"] or "",
                    r["sic_code"] or "",
                    r["industry_description"] or "",
                    f"{float(r['revenue_usd']):.2f}" if r["revenue_usd"] is not None else "",
                    f"{float(r['revenue_local']):.2f}" if r["revenue_local"] is not None else "",
                    r["employees_total"] if r["employees_total"] is not None else "",
                    r["employees_onsite"] if r["employees_onsite"] is not None else "",
                    r["founding_year"] or "",
                    r["hq_local"] or "",
                    r["hq_national"] or "",
                    r["hq_global"] or "",
                    r["import_export_codes"] or "",
                    xray_url,
                ])
                yield output.getvalue()
                output.seek(0)
                output.truncate(0)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="b2b_companies_export.csv"'},
    )


@app.get("/api/companies/{company_id}")
def api_get_company_detail(company_id: int, _auth: bool = Depends(verify_access_key)):
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM companies WHERE id = %s", (company_id,))
        comp = cur.fetchone()
        if not comp:
            raise HTTPException(status_code=404, detail="Company not found")

        cur.execute(
            """
            SELECT id, full_name, job_title, company_id, company_registration_number,
                   company_name, email, linkedin_url, source
            FROM contacts
            WHERE company_id = %s OR company_registration_number = %s
            ORDER BY id ASC
            """,
            (comp["id"], comp["registration_number"]),
        )
        contacts = cur.fetchall()

        # Find corporate family members sharing the same global HQ or national HQ
        related = []
        if comp.get("hq_global"):
            cur.execute(
                """
                SELECT id, company_name, city, country, registration_number, employees_total, revenue_usd
                FROM companies
                WHERE hq_global = %s AND id != %s
                ORDER BY revenue_usd DESC NULLS LAST
                LIMIT 8
                """,
                (comp["hq_global"], comp["id"]),
            )
            related = [
                {
                    **dict(r),
                    "revenue_usd": float(r["revenue_usd"]) if r["revenue_usd"] is not None else None,
                }
                for r in cur.fetchall()
            ]

    item = dict(comp)
    item["revenue_usd"] = float(item["revenue_usd"]) if item["revenue_usd"] is not None else None
    item["revenue_local"] = float(item["revenue_local"]) if item["revenue_local"] is not None else None
    item["updated_at"] = item["updated_at"].isoformat() if item["updated_at"] else None
    item["contacts"] = contacts
    item["related_entities"] = related
    return item


@app.post("/api/contacts/upload")
async def api_upload_contacts_csv(
    file: UploadFile = File(...),
    _auth: bool = Depends(verify_access_key),
):
    """
    Uploads a CSV of people/directors and automatically matches them to companies
    in PostgreSQL by registration_number or company_name.
    """
    raw_bytes = await file.read()
    try:
        text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw_bytes.decode("latin-1")

    # Detect delimiter (; or ,)
    first_line = text.splitlines()[0] if text.splitlines() else ""
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)

    def pick_field(row_dict: dict, candidates: List[str]) -> str:
        lower_map = {k.lower().strip(): (v or "").strip() for k, v in row_dict.items() if k}
        for cand in candidates:
            if cand in lower_map and lower_map[cand]:
                return lower_map[cand]
        return ""

    parsed_rows = []
    for row in reader:
        full_name = pick_field(row, ["full_name", "name", "person_name", "director_name", "ceo_name", "contact_name", "full name"])
        if not full_name:
            first = pick_field(row, ["first_name", "firstname", "first name"])
            last = pick_field(row, ["last_name", "lastname", "last name"])
            full_name = f"{first} {last}".strip()
        if not full_name:
            continue

        job_title = pick_field(row, ["job_title", "title", "role", "position", "job title", "function"]) or "Director"
        reg_num = pick_field(row, ["company_registration_number", "registration_number", "reg_number", "kvk", "company_number", "registration number"])
        comp_name = pick_field(row, ["company_name", "company", "organization", "company name", "employer"])
        email = pick_field(row, ["email", "email_address", "work_email", "e-mail"])
        linkedin = pick_field(row, ["linkedin_url", "linkedin", "linkedin_profile", "linkedin url"])

        parsed_rows.append({
            "full_name": full_name,
            "job_title": job_title,
            "company_registration_number": reg_num or None,
            "company_name": comp_name or None,
            "email": email or None,
            "linkedin_url": linkedin or None,
            "source": f"CSV Upload ({file.filename})",
        })

    if not parsed_rows:
        raise HTTPException(
            status_code=400,
            detail="No valid contact rows found. Expected columns like: full_name, job_title, company_registration_number, company_name, email, linkedin_url."
        )

    matched_count = 0
    records_to_insert = []

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Build lookup maps for matching by registration_number or company_name
            regs = list({r["company_registration_number"] for r in parsed_rows if r["company_registration_number"]})
            names = list({r["company_name"].lower() for r in parsed_rows if r["company_name"]})

            reg_map = {}
            if regs:
                cur.execute(
                    "SELECT id, registration_number, company_name FROM companies WHERE registration_number = ANY(%s)",
                    (regs,),
                )
                for cid, creg, cname in cur.fetchall():
                    reg_map[creg] = (cid, cname)

            name_map = {}
            if names:
                cur.execute(
                    "SELECT id, LOWER(company_name), registration_number, company_name FROM companies WHERE LOWER(company_name) = ANY(%s)",
                    (names,),
                )
                for cid, cname_low, creg, cname_orig in cur.fetchall():
                    name_map[cname_low] = (cid, creg, cname_orig)

            for r in parsed_rows:
                comp_id = None
                creg = r["company_registration_number"]
                cname = r["company_name"]

                if creg and creg in reg_map:
                    comp_id, matched_cname = reg_map[creg]
                    cname = cname or matched_cname
                    matched_count += 1
                elif cname and cname.lower() in name_map:
                    comp_id, matched_creg, matched_cname = name_map[cname.lower()]
                    creg = creg or matched_creg
                    cname = matched_cname
                    matched_count += 1

                linkedin_url = r["linkedin_url"]
                if not linkedin_url and cname:
                    linkedin_url = f'https://www.google.com/search?q=site:linkedin.com/in+"{r["full_name"]}"+"{cname}"'

                records_to_insert.append((
                    r["full_name"],
                    r["job_title"],
                    comp_id,
                    creg,
                    cname,
                    r["email"],
                    linkedin_url,
                    r["source"],
                ))

            sql = """
            INSERT INTO contacts (
                full_name, job_title, company_id, company_registration_number,
                company_name, email, linkedin_url, source
            ) VALUES %s
            ON CONFLICT (full_name, COALESCE(company_registration_number, ''), COALESCE(job_title, ''))
            DO UPDATE SET
                company_id = COALESCE(EXCLUDED.company_id, contacts.company_id),
                company_name = COALESCE(EXCLUDED.company_name, contacts.company_name),
                email = COALESCE(EXCLUDED.email, contacts.email),
                linkedin_url = COALESCE(EXCLUDED.linkedin_url, contacts.linkedin_url),
                source = EXCLUDED.source;
            """
            execute_values(cur, sql, records_to_insert)
        conn.commit()

    return {
        "status": "uploaded",
        "uploaded_contacts": len(records_to_insert),
        "matched_to_companies": matched_count,
        "filename": file.filename,
    }


# Serve compiled React + Tailwind frontend static assets on the same port
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    if FRONTEND_DIST.exists():
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        index_file = FRONTEND_DIST / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))

    return JSONResponse(
        {
            "message": "ApexB2B Intelligence API is running. Build the frontend in /frontend/dist to view the UI.",
            "docs": "/docs",
        }
    )
