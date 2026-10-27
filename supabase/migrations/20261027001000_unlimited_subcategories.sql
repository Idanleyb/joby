-- =============================================================================
-- Joby MVP · 1000 · Unlimited subcategories per provider (founder decision, PRD v1.3)
-- A limit setting of 0 (or missing) now means "no limit". Skills (15) and service
-- cards (3) keep their limits.
-- =============================================================================
create or replace function private.enforce_provider_limits()
returns trigger language plpgsql set search_path = '' as $$
declare v_count integer; v_max integer; v_key text;
begin
  v_key := case tg_table_name
             when 'provider_subcategories' then 'max_subcategories'
             when 'provider_skills' then 'max_skills'
             when 'service_cards' then 'max_service_cards' end;
  v_max := public.setting_int(v_key);
  if v_max is null or v_max <= 0 then
    return new; -- unlimited
  end if;
  execute format('select count(*) from public.%I where provider_id = $1', tg_table_name)
    into v_count using new.provider_id;
  if v_count >= v_max then
    perform public.raise_app_error('limit_reached', v_key);
  end if;
  return new;
end $$;

update public.app_settings
   set value = '0', description = 'Subcategories per provider (0 = unlimited)', updated_at = now()
 where key = 'max_subcategories';
