-- GleamOps Master Blueprint (v7.0) - schema reference (as provided)
-- Note: implementation adds tenant_id, timestamps, archived_at, version_etag, constraints, indexes, and RLS.

-- =================================================================
-- MODULE A: CRM
-- =================================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_code TEXT UNIQUE NOT NULL, -- CLI-1001
    name TEXT NOT NULL,
    status TEXT DEFAULT 'Active',
    billing_address JSONB
);

CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code TEXT UNIQUE NOT NULL, -- SIT-2050
    client_id UUID REFERENCES clients(id),
    address JSONB,
    alarm_code TEXT, 
    access_notes TEXT
);

-- =================================================================
-- MODULE B: SERVICE CONFIGURATION (The DNA)
-- =================================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code TEXT UNIQUE NOT NULL, -- TSK-001
    name TEXT NOT NULL, -- "Empty Trash"
    production_rate_sqft_per_hour NUMERIC, -- ISSA Standard
    category TEXT -- "Restroom", "Floors"
);

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_code TEXT UNIQUE NOT NULL, -- SER-001
    name TEXT NOT NULL, -- "Nightly Janitorial"
    description TEXT
);

CREATE TABLE service_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id),
    task_id UUID REFERENCES tasks(id),
    frequency_default TEXT -- "Daily", "Weekly"
);

-- =================================================================
-- MODULE C: SALES (CleanFlow)
-- =================================================================
CREATE TABLE sales_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_code TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    service_id UUID REFERENCES services(id), -- Links to the Template
    total_sqft NUMERIC,
    status TEXT DEFAULT 'Draft',
    -- Financials
    bid_monthly_price NUMERIC,
    target_margin_percent NUMERIC
);

CREATE TABLE sales_bid_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID REFERENCES sales_bids(id),
    area_name TEXT,
    tasks JSONB -- Custom adjustments to the Service Template
);

-- =================================================================
-- MODULE D: OPERATIONS
-- =================================================================
CREATE TABLE site_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_code TEXT UNIQUE NOT NULL, -- JOB-2026-A
    site_id UUID REFERENCES sites(id),
    source_bid_id UUID REFERENCES sales_bids(id),
    billing_amount NUMERIC,
    frequency TEXT
);

CREATE TABLE work_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code TEXT UNIQUE NOT NULL,
    job_id UUID REFERENCES site_jobs(id),
    scheduled_date DATE,
    assigned_staff_id UUID,
    status TEXT DEFAULT 'Scheduled'
);

-- =================================================================
-- MODULE E: WORKFORCE & HR
-- =================================================================
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_code TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT,
    is_subcontractor BOOLEAN DEFAULT FALSE,
    pay_rate NUMERIC
);

-- SAFETY: Training/Certs
CREATE TABLE staff_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id),
    cert_name TEXT, -- "OSHA 10"
    expiry_date DATE,
    doc_url TEXT
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff(id),
    ticket_id UUID REFERENCES work_tickets(id),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ
);

-- =================================================================
-- MODULE F: ASSETS (Fleet & Keys)
-- =================================================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_code TEXT UNIQUE NOT NULL,
    vin TEXT,
    mileage INT,
    status TEXT
);

CREATE TABLE vehicle_maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id),
    service_date DATE,
    description TEXT,
    cost NUMERIC
);

CREATE TABLE keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id)
);

CREATE TABLE key_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID REFERENCES keys(id),
    staff_id UUID REFERENCES staff(id),
    assigned_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ
);

-- =================================================================
-- MODULE G: INVENTORY & MODULE H: SAFETY (SDS)
-- =================================================================
CREATE TABLE supplies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supply_code TEXT UNIQUE NOT NULL,
    name TEXT,
    sds_url TEXT, -- Link to Safety Data Sheet PDF
    cost_per_unit NUMERIC
);

CREATE TABLE supply_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id),
    supply_id UUID REFERENCES supplies(id),
    min_quantity INT
);
