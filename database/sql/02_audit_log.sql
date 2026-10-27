-- =====================================================================================
-- 02 SECURITY AUDIT LOG — run after 01.
-- Lives in the private "security" schema: not reachable through the Data API.
-- Append-only: UPDATE/DELETE/TRUNCATE are blocked by trigger. Read via public.read_audit_log() (03).
-- Never store passwords, tokens, keys or card data in metadata (the writer strips such keys).
-- Retention: keep 400 days; purge with a scheduled server job run by the database owner (README §7).
-- =====================================================================================

create table if not exists security.audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,
  action      text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  target_type text not null check (char_length(target_type) <= 60),
  target_id   text check (char_length(target_id) <= 120),
  result      text not null check (result in ('success','denied','failed')),
  metadata    jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 4000)
);
create index if not exists audit_log_at_idx on security.audit_log(at desc);
revoke all on security.audit_log from public, anon, authenticated;

create or replace function security.audit_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin raise exception 'audit log is append-only' using errcode = '42501'; end $$;
drop trigger if exists audit_no_update on security.audit_log;
create trigger audit_no_update before update or delete or truncate on security.audit_log
  for each statement execute function security.audit_immutable();

-- Internal writer. Not callable by API roles.
create or replace function security.audit(_action text, _type text, _id text, _result text, _meta jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into security.audit_log(actor_id, action, target_type, target_id, result, metadata)
  values (auth.uid(), _action, _type, left(_id, 120), _result,
    coalesce((select jsonb_object_agg(k, v) from jsonb_each(coalesce(_meta, '{}'::jsonb)) e(k, v)
              where k !~* '(password|token|secret|key|card|cvv)'), '{}'::jsonb));
end $$;
revoke all on function security.audit(text, text, text, text, jsonb) from public, anon, authenticated;

-- Row-change auditing for sensitive tables (records WHO changed WHAT and WHEN, not the full row).
create or replace function security.audit_row_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  r := to_jsonb(coalesce(new, old));
  perform security.audit(tg_table_name || '.' || lower(tg_op), tg_table_name,
    coalesce(r ->> 'id', r ->> 'variant_id', r ->> 'user_id'), 'success', '{}'::jsonb);
  return coalesce(new, old);
end $$;
revoke all on function security.audit_row_change() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['products','product_variants','inventory','collections','site_pages','site_config_versions',
                           'orders','discounts','media_assets'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I; create trigger audit_%1$s after insert or update or delete on public.%1$I for each row execute function security.audit_row_change();', t);
  end loop;
end $$;
