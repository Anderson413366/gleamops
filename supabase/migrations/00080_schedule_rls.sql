BEGIN;

ALTER TABLE public.schedule_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_trade_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS schedule_periods_select ON public.schedule_periods;
CREATE POLICY schedule_periods_select ON public.schedule_periods
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS schedule_periods_insert ON public.schedule_periods;
CREATE POLICY schedule_periods_insert ON public.schedule_periods
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS schedule_periods_update ON public.schedule_periods;
CREATE POLICY schedule_periods_update ON public.schedule_periods
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS staff_availability_rules_select ON public.staff_availability_rules;
CREATE POLICY staff_availability_rules_select ON public.staff_availability_rules
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS staff_availability_rules_insert ON public.staff_availability_rules;
CREATE POLICY staff_availability_rules_insert ON public.staff_availability_rules
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
      OR staff_id IN (SELECT id FROM public.staff WHERE tenant_id = current_tenant_id() AND user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS staff_availability_rules_update ON public.staff_availability_rules;
CREATE POLICY staff_availability_rules_update ON public.staff_availability_rules
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
      OR staff_id IN (SELECT id FROM public.staff WHERE tenant_id = current_tenant_id() AND user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS shift_trade_requests_select ON public.shift_trade_requests;
CREATE POLICY shift_trade_requests_select ON public.shift_trade_requests
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS shift_trade_requests_insert ON public.shift_trade_requests;
CREATE POLICY shift_trade_requests_insert ON public.shift_trade_requests
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND initiator_staff_id IN (SELECT id FROM public.staff WHERE tenant_id = current_tenant_id() AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS shift_trade_requests_update ON public.shift_trade_requests;
CREATE POLICY shift_trade_requests_update ON public.shift_trade_requests
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND (
      has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR'])
      OR initiator_staff_id IN (SELECT id FROM public.staff WHERE tenant_id = current_tenant_id() AND user_id = auth.uid())
      OR target_staff_id IN (SELECT id FROM public.staff WHERE tenant_id = current_tenant_id() AND user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS schedule_conflicts_select ON public.schedule_conflicts;
CREATE POLICY schedule_conflicts_select ON public.schedule_conflicts
  FOR SELECT USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS schedule_conflicts_insert ON public.schedule_conflicts;
CREATE POLICY schedule_conflicts_insert ON public.schedule_conflicts
  FOR INSERT WITH CHECK (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

DROP POLICY IF EXISTS schedule_conflicts_update ON public.schedule_conflicts;
CREATE POLICY schedule_conflicts_update ON public.schedule_conflicts
  FOR UPDATE USING (
    tenant_id = current_tenant_id()
    AND has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER'])
  );

COMMIT;
