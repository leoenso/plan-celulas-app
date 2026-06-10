-- =====================================================
-- UPGRADE MÓDULO CÉLULAS CRUD
-- Ejecuta este archivo SOLO si ya habías pegado schema.sql antes.
-- Permite que líderes de grupo pequeño también eliminen integrantes
-- de sus propias grupos pequeños. Los administradores siguen pudiendo todo.
-- =====================================================

drop policy if exists "members_delete_admin" on public.cell_members;
drop policy if exists "members_delete_admin_or_cell_leader" on public.cell_members;

create policy "members_delete_admin_or_cell_leader"
on public.cell_members for delete
to authenticated
using (public.is_admin() or public.is_cell_leader(cell_id));
