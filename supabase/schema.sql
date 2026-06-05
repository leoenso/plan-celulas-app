-- =====================================================
-- PLAN DE CÉLULAS - ESQUEMA SUPABASE
-- Pega este archivo completo en Supabase > SQL Editor > Run
-- =====================================================

create extension if not exists "pgcrypto";

-- -------------------------------
-- TABLAS PRINCIPALES
-- -------------------------------

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'leader' check (role in ('admin', 'leader', 'auxiliar', 'viewer')),
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.cells (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text,
  meeting_day text,
  meeting_time time,
  host_name text,
  address_reference text,
  leader_id uuid references public.profiles(user_id) on delete set null,
  assistant_name text,
  status text not null default 'activa' check (status in ('activa', 'en formación', 'en pausa', 'cerrada')),
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.cell_members (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  member_type text not null default 'miembro' check (member_type in ('miembro', 'visitante', 'nuevo creyente', 'joven', 'niño', 'adulto')),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.topics_calendar (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  bible_text text,
  theme_month text,
  scheduled_date date not null,
  objective text,
  material_url text,
  notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_reports (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete cascade,
  meeting_date date not null default current_date,
  topic text,
  bible_text text,
  attendees_count integer not null default 0,
  visitors_count integer not null default 0,
  visitor_names text,
  decisions_count integer not null default 0,
  general_notes text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_people (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.attendance_reports(id) on delete cascade,
  member_id uuid not null references public.cell_members(id) on delete cascade,
  status text not null default 'presente' check (status in ('presente', 'ausente', 'justificado')),
  notes text,
  created_at timestamptz not null default now(),
  unique(report_id, member_id)
);

create table if not exists public.needs (
  id uuid primary key default gen_random_uuid(),
  cell_id uuid not null references public.cells(id) on delete cascade,
  title text not null,
  category text not null default 'oración' check (category in ('oración', 'visita', 'salud', 'económica', 'material', 'discipulado', 'conflicto', 'otro')),
  description text,
  priority text not null default 'media' check (priority in ('baja', 'media', 'alta', 'urgente')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en seguimiento', 'resuelto', 'archivado')),
  confidential boolean not null default false,
  assigned_to uuid references public.profiles(user_id) on delete set null,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'estudio' check (category in ('estudio', 'guía de líder', 'devocional', 'presentación', 'formato', 'otro')),
  url text not null,
  description text,
  created_by uuid references public.profiles(user_id) on delete set null,
  created_at timestamptz not null default now()
);

-- -------------------------------
-- PERFIL AUTOMÁTICO AL REGISTRAR USUARIO
-- -------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'leader'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- -------------------------------
-- FUNCIONES DE SEGURIDAD
-- -------------------------------

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_cell_leader(p_cell_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.cells
    where id = p_cell_id
      and leader_id = auth.uid()
  );
$$;

-- -------------------------------
-- ACTIVAR ROW LEVEL SECURITY
-- -------------------------------

alter table public.profiles enable row level security;
alter table public.cells enable row level security;
alter table public.cell_members enable row level security;
alter table public.topics_calendar enable row level security;
alter table public.attendance_reports enable row level security;
alter table public.attendance_people enable row level security;
alter table public.needs enable row level security;
alter table public.materials enable row level security;

-- -------------------------------
-- POLICIES - PROFILES
-- -------------------------------

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
to authenticated
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -------------------------------
-- POLICIES - CELLS
-- -------------------------------

drop policy if exists "cells_select_authenticated" on public.cells;
create policy "cells_select_authenticated"
on public.cells for select
to authenticated
using (true);

drop policy if exists "cells_insert_admin" on public.cells;
create policy "cells_insert_admin"
on public.cells for insert
to authenticated
with check (public.is_admin());

drop policy if exists "cells_update_admin_or_leader" on public.cells;
create policy "cells_update_admin_or_leader"
on public.cells for update
to authenticated
using (public.is_admin() or leader_id = auth.uid())
with check (public.is_admin() or leader_id = auth.uid());

drop policy if exists "cells_delete_admin" on public.cells;
create policy "cells_delete_admin"
on public.cells for delete
to authenticated
using (public.is_admin());

-- -------------------------------
-- POLICIES - MEMBERS
-- -------------------------------

drop policy if exists "members_select_admin_or_cell_leader" on public.cell_members;
create policy "members_select_admin_or_cell_leader"
on public.cell_members for select
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "members_insert_admin_or_cell_leader" on public.cell_members;
create policy "members_insert_admin_or_cell_leader"
on public.cell_members for insert
to authenticated
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "members_update_admin_or_cell_leader" on public.cell_members;
create policy "members_update_admin_or_cell_leader"
on public.cell_members for update
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id))
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "members_delete_admin" on public.cell_members;
drop policy if exists "members_delete_admin_or_cell_leader" on public.cell_members;
create policy "members_delete_admin_or_cell_leader"
on public.cell_members for delete
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id));

-- -------------------------------
-- POLICIES - TOPICS
-- -------------------------------

drop policy if exists "topics_select_authenticated" on public.topics_calendar;
create policy "topics_select_authenticated"
on public.topics_calendar for select
to authenticated
using (true);

drop policy if exists "topics_write_admin" on public.topics_calendar;
create policy "topics_write_admin"
on public.topics_calendar for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -------------------------------
-- POLICIES - ATTENDANCE REPORTS
-- -------------------------------

drop policy if exists "reports_select_admin_or_cell_leader" on public.attendance_reports;
create policy "reports_select_admin_or_cell_leader"
on public.attendance_reports for select
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "reports_insert_admin_or_cell_leader" on public.attendance_reports;
create policy "reports_insert_admin_or_cell_leader"
on public.attendance_reports for insert
to authenticated
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "reports_update_admin_or_cell_leader" on public.attendance_reports;
create policy "reports_update_admin_or_cell_leader"
on public.attendance_reports for update
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id))
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "reports_delete_admin" on public.attendance_reports;
create policy "reports_delete_admin"
on public.attendance_reports for delete
to authenticated
using (public.is_admin());

-- -------------------------------
-- POLICIES - ATTENDANCE PEOPLE
-- -------------------------------

drop policy if exists "attendance_people_select_admin_or_report_owner" on public.attendance_people;
create policy "attendance_people_select_admin_or_report_owner"
on public.attendance_people for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.attendance_reports ar
    where ar.id = report_id and public.is_cell_leader(ar.cell_id)
  )
);

drop policy if exists "attendance_people_insert_admin_or_report_owner" on public.attendance_people;
create policy "attendance_people_insert_admin_or_report_owner"
on public.attendance_people for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1 from public.attendance_reports ar
    where ar.id = report_id and public.is_cell_leader(ar.cell_id)
  )
);

-- -------------------------------
-- POLICIES - NEEDS
-- -------------------------------

drop policy if exists "needs_select_admin_or_cell_leader" on public.needs;
create policy "needs_select_admin_or_cell_leader"
on public.needs for select
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "needs_insert_admin_or_cell_leader" on public.needs;
create policy "needs_insert_admin_or_cell_leader"
on public.needs for insert
to authenticated
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "needs_update_admin_or_cell_leader" on public.needs;
create policy "needs_update_admin_or_cell_leader"
on public.needs for update
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id))
with check (public.is_admin() or public.is_cell_leader(cell_id));

drop policy if exists "needs_delete_admin" on public.needs;
create policy "needs_delete_admin"
on public.needs for delete
to authenticated
using (public.is_admin());

-- -------------------------------
-- POLICIES - MATERIALS
-- -------------------------------

drop policy if exists "materials_select_authenticated" on public.materials;
create policy "materials_select_authenticated"
on public.materials for select
to authenticated
using (true);

drop policy if exists "materials_write_admin" on public.materials;
create policy "materials_write_admin"
on public.materials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -------------------------------
-- ÍNDICES ÚTILES
-- -------------------------------

create index if not exists idx_cells_leader on public.cells(leader_id);
create index if not exists idx_members_cell on public.cell_members(cell_id);
create index if not exists idx_reports_cell_date on public.attendance_reports(cell_id, meeting_date desc);
create index if not exists idx_needs_cell_status on public.needs(cell_id, status);
create index if not exists idx_topics_date on public.topics_calendar(scheduled_date);

-- =====================================================
-- IMPORTANTE:
-- 1) Registra tu primer usuario desde la app.
-- 2) Después ejecuta esto reemplazando tu correo:
-- update public.profiles set role = 'admin' where email = 'TU-CORREO@EJEMPLO.COM';
-- =====================================================
