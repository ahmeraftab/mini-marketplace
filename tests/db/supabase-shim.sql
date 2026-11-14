-- Minimal stand-in for the parts of Supabase our migrations rely on, so the
-- migrations and row-level security can be tested on a plain Postgres
-- (PGlite) with no account and no Docker. NEVER applied to a real project.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  raw_user_meta_data  jsonb,
  created_at          timestamptz not null default now()
);
create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claim.sub', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    ), '')::uuid
$$;

create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[]
language plpgsql immutable
as $$
declare _parts text[];
begin
  _parts := string_to_array(name, '/');
  return _parts[1:array_length(_parts, 1) - 1];
end;
$$;

create publication supabase_realtime;

-- Supabase hands out broad default privileges; reproduce them so that our
-- revokes in migration 02 are genuinely exercised.
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
