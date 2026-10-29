-- =============================================================================
-- 20261029000100 — Load demo data in several small parts (founder: one file was too big
-- for the Supabase SQL Editor).
--
-- Each part file stores a slice of the data in private.demo_stage; the last file calls
-- private.load_demo_staged(), which merges the parts and runs private.load_demo().
-- Parts use a compact column format per table: {"c": [column names], "r": [[values], ...]}.
-- =============================================================================

create table private.demo_stage (
  part       integer primary key,
  data       jsonb not null,
  created_at timestamptz not null default now()
);
revoke all on private.demo_stage from public, anon, authenticated;

-- {"c": [...], "r": [[...]]}  →  [{col: value, ...}, ...]
create or replace function private.demo_expand(p_table jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg((
           select jsonb_object_agg(c.name, r.row -> (c.ord::int - 1))
             from jsonb_array_elements_text(p_table -> 'c') with ordinality as c(name, ord))
         order by r.ord), '[]'::jsonb)
    from jsonb_array_elements(p_table -> 'r') with ordinality as r(row, ord)
$$;

create or replace function private.load_demo_staged()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_merged jsonb := '{}'::jsonb; v_parts integer; v_expected integer; s record; k text; v jsonb; v_result jsonb;
begin
  select count(*), max((data ->> 'parts')::int) into v_parts, v_expected from private.demo_stage;
  if v_parts = 0 then raise exception 'demo_parts_missing: run the part files first'; end if;
  if v_parts <> v_expected then
    raise exception 'demo_parts_missing: % of % parts loaded (missing: %)', v_parts, v_expected,
      (select string_agg(g::text, ', ') from generate_series(1, v_expected) g
        where g not in (select part from private.demo_stage));
  end if;
  for s in select data from private.demo_stage order by part loop
    for k, v in select key, value from jsonb_each(s.data -> 'tables') loop
      v_merged := jsonb_set(v_merged, array[k],
        coalesce(v_merged -> k, '[]'::jsonb) || private.demo_expand(v), true);
    end loop;
    if s.data ? 'reference_time' then
      v_merged := v_merged || jsonb_build_object('reference_time', s.data -> 'reference_time');
    end if;
  end loop;
  v_result := private.load_demo(v_merged);
  delete from private.demo_stage;
  return v_result;
end $$;

revoke all on function private.demo_expand(jsonb), private.load_demo_staged() from public, anon, authenticated;
