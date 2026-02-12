-- =================================================================
-- Milestone F: Proposals, Email Sends, Follow-ups
-- proposals, pricing options, sends, email events,
-- followup sequences, followup sends
-- =================================================================

-- =================================================================
-- SALES PROPOSALS
-- =================================================================
CREATE TABLE sales_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_code TEXT UNIQUE NOT NULL CHECK (proposal_code ~ '^PRP-[0-9]{4,}$'),
  bid_version_id UUID NOT NULL REFERENCES sales_bid_versions(id),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  pdf_file_id UUID NULL,
  pdf_generated_at TIMESTAMPTZ NULL,
  page_count INT NULL,
  valid_until DATE NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_proposals_tenant_active ON sales_proposals(tenant_id) WHERE archived_at IS NULL;
CREATE INDEX idx_proposals_bid_version ON sales_proposals(bid_version_id);
CREATE INDEX idx_proposals_status ON sales_proposals(tenant_id, status);
CREATE INDEX idx_proposals_code ON sales_proposals(proposal_code);

CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON sales_proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposals_etag BEFORE UPDATE ON sales_proposals FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY proposals_select ON sales_proposals FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY proposals_insert ON sales_proposals FOR INSERT WITH CHECK (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));
CREATE POLICY proposals_update ON sales_proposals FOR UPDATE USING (tenant_id = current_tenant_id() AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN', 'MANAGER', 'SALES']));

-- =================================================================
-- SALES PROPOSAL PRICING OPTIONS (Good / Better / Best)
-- =================================================================
CREATE TABLE sales_proposal_pricing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_id UUID NOT NULL REFERENCES sales_proposals(id),
  label TEXT NOT NULL, -- Good | Better | Best
  monthly_price NUMERIC NOT NULL,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_proposal_options_proposal ON sales_proposal_pricing_options(proposal_id);

CREATE TRIGGER trg_proposal_options_updated_at BEFORE UPDATE ON sales_proposal_pricing_options FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposal_options_etag BEFORE UPDATE ON sales_proposal_pricing_options FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_proposal_pricing_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY po_select ON sales_proposal_pricing_options FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY po_insert ON sales_proposal_pricing_options FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY po_update ON sales_proposal_pricing_options FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES PROPOSAL SENDS
-- =================================================================
CREATE TABLE sales_proposal_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_id UUID NOT NULL REFERENCES sales_proposals(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  status TEXT NOT NULL DEFAULT 'SENDING',
  provider_message_id TEXT,
  sent_at TIMESTAMPTZ,
  idempotency_key UUID NOT NULL DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid(),

  UNIQUE (idempotency_key)
);

CREATE INDEX idx_proposal_sends_proposal ON sales_proposal_sends(proposal_id);
CREATE INDEX idx_proposal_sends_provider ON sales_proposal_sends(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE INDEX idx_proposal_sends_recipient ON sales_proposal_sends(tenant_id, recipient_email, created_at);

CREATE TRIGGER trg_proposal_sends_updated_at BEFORE UPDATE ON sales_proposal_sends FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposal_sends_etag BEFORE UPDATE ON sales_proposal_sends FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_proposal_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY ps_select ON sales_proposal_sends FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ps_insert ON sales_proposal_sends FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY ps_update ON sales_proposal_sends FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES EMAIL EVENTS (webhook ingestion — idempotent)
-- =================================================================
CREATE TABLE sales_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_send_id UUID NOT NULL REFERENCES sales_proposal_sends(id),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- delivered | open | click | bounce | spam
  raw_payload JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Idempotency: one event per provider_event_id
  UNIQUE (provider_event_id)
);

CREATE INDEX idx_email_events_send ON sales_email_events(proposal_send_id);
CREATE INDEX idx_email_events_type ON sales_email_events(event_type);

ALTER TABLE sales_email_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ee_select ON sales_email_events FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY ee_insert ON sales_email_events FOR INSERT WITH CHECK (tenant_id = current_tenant_id());

-- =================================================================
-- SALES FOLLOWUP SEQUENCES
-- =================================================================
CREATE TABLE sales_followup_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  proposal_id UUID NOT NULL REFERENCES sales_proposals(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | STOPPED | COMPLETED
  stop_reason TEXT, -- WON | LOST | BOUNCE | SPAM | MANUAL | UNSUBSCRIBED
  total_steps INT NOT NULL DEFAULT 3,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_followup_seq_proposal ON sales_followup_sequences(proposal_id);
CREATE INDEX idx_followup_seq_status ON sales_followup_sequences(tenant_id, status);

CREATE TRIGGER trg_followup_seq_updated_at BEFORE UPDATE ON sales_followup_sequences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_followup_seq_etag BEFORE UPDATE ON sales_followup_sequences FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_followup_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_select ON sales_followup_sequences FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY fs_insert ON sales_followup_sequences FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY fs_update ON sales_followup_sequences FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SALES FOLLOWUP SENDS
-- =================================================================
CREATE TABLE sales_followup_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sequence_id UUID NOT NULL REFERENCES sales_followup_sequences(id),
  step_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED | SENDING | SENT | FAILED | SKIPPED
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ NULL,
  archived_by UUID NULL,
  archive_reason TEXT NULL,
  version_etag UUID NOT NULL DEFAULT gen_random_uuid()
);

CREATE INDEX idx_followup_sends_sequence ON sales_followup_sends(sequence_id);
CREATE INDEX idx_followup_sends_scheduled ON sales_followup_sends(status, scheduled_at) WHERE status = 'SCHEDULED';

CREATE TRIGGER trg_followup_sends_updated_at BEFORE UPDATE ON sales_followup_sends FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_followup_sends_etag BEFORE UPDATE ON sales_followup_sends FOR EACH ROW EXECUTE FUNCTION set_version_etag();

ALTER TABLE sales_followup_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY fse_select ON sales_followup_sends FOR SELECT USING (tenant_id = current_tenant_id());
CREATE POLICY fse_insert ON sales_followup_sends FOR INSERT WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY fse_update ON sales_followup_sends FOR UPDATE USING (tenant_id = current_tenant_id());

-- =================================================================
-- SEED: Sequence prefix for proposals
-- =================================================================
INSERT INTO system_sequences (tenant_id, prefix, current_value)
SELECT t.id, 'PRP', 0
FROM tenants t
WHERE t.tenant_code = 'TNT-0001'
ON CONFLICT (tenant_id, prefix) DO NOTHING;
