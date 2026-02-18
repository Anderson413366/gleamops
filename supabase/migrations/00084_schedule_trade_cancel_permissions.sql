BEGIN;

CREATE OR REPLACE FUNCTION public.fn_cancel_shift_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_staff_id UUID;
  v_is_manager BOOLEAN;
BEGIN
  v_staff_id := public.fn_current_staff_id();
  v_is_manager := has_any_role(auth.uid(), ARRAY['OWNER_ADMIN','MANAGER','SUPERVISOR']);

  UPDATE public.shift_trade_requests
  SET
    status = 'CANCELED',
    manager_user_id = CASE WHEN v_is_manager THEN auth.uid() ELSE manager_user_id END
  WHERE id = p_trade_id
    AND tenant_id = current_tenant_id()
    AND archived_at IS NULL
    AND status IN ('PENDING', 'ACCEPTED', 'MANAGER_APPROVED')
    AND (
      (v_staff_id IS NOT NULL AND initiator_staff_id = v_staff_id)
      OR v_is_manager
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade request cannot be canceled by this user';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_cancel_shift_trade(UUID) TO authenticated;

COMMIT;
