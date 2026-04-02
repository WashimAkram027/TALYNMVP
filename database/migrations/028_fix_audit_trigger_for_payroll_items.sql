-- Fix audit_log_trigger to handle tables without organization_id (e.g., payroll_items)
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _org_id UUID := NULL;
  _old JSONB := NULL;
  _new JSONB := NULL;
  _row JSONB;
BEGIN
  -- Build old/new JSONB
  IF TG_OP = 'DELETE' THEN
    _old := to_jsonb(OLD);
    _row := _old;
  ELSE
    _new := to_jsonb(NEW);
    _row := _new;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    _old := to_jsonb(OLD);
  END IF;

  -- Extract organization_id if the column exists on this table, otherwise NULL
  IF _row ? 'organization_id' THEN
    _org_id := (_row->>'organization_id')::UUID;
  END IF;

  INSERT INTO audit_log (
    organization_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    created_at
  ) VALUES (
    _org_id,
    TG_TABLE_NAME,
    COALESCE((_new->>'id')::UUID, (_old->>'id')::UUID),
    TG_OP,
    _old,
    _new,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;
