import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const roles = ['admin', 'leader', 'auxiliar', 'viewer']

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getRoleLabel(role) {
  if (role === 'admin') return 'Administrador'
  if (role === 'leader') return 'Líder'
  if (role === 'auxiliar') return 'Auxiliar'
  if (role === 'viewer') return 'Solo lectura'
  return 'Usuario'
}

function getRoleBadge(role) {
  if (role === 'admin') return 'border-violet-200 bg-violet-50 text-violet-700'
  if (role === 'leader') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (role === 'auxiliar') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

function getStatusBadge(active) {
  if (active !== false) return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function Field({ label, children, helper }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
      {helper && (
        <span className="mt-2 block text-xs font-semibold text-slate-500">
          {helper}
        </span>
      )}
    </label>
  )
}

function Input(props) {
  return (
    <input
      {...props}
      className={`block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100 ${props.className || ''}`}
    />
  )
}

function Select(props) {
  return (
    <select
      {...props}
      className={`block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100 ${props.className || ''}`}
    />
  )
}

function Card({ children, className = '' }) {
  return (
    <section className={`rounded-[28px] border border-slate-200 bg-white/95 p-6 shadow-sm backdrop-blur ${className}`}>
      {children}
    </section>
  )
}

function Badge({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
  )
}

function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#003B5C] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#002A42] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-[#EAF4F8] px-4 py-3 text-sm font-black text-[#003B5C] transition hover:bg-[#D8ECF4] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function DangerButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  )
}

function StatCard({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'from-sky-50 to-cyan-50 text-sky-900 border-sky-100',
    green: 'from-emerald-50 to-lime-50 text-emerald-900 border-emerald-100',
    gold: 'from-amber-50 to-yellow-50 text-amber-900 border-amber-100',
    red: 'from-red-50 to-rose-50 text-red-900 border-red-100'
  }

  return (
    <article className={`rounded-[28px] border bg-linear-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
          <strong className="mt-2 block text-3xl font-black tracking-tight">
            {value}
          </strong>
        </div>

        <span className="material-symbols-rounded rounded-2xl bg-white/70 p-3 text-2xl shadow-sm">
          {icon}
        </span>
      </div>
    </article>
  )
}

function Notice({ children }) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-black text-cyan-800">
      {children}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <span className="material-symbols-rounded text-5xl text-slate-400">
        {icon}
      </span>
      <h3 className="mt-3 text-lg font-black text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
        {description}
      </p>
    </div>
  )
}

export default function AdminUsers({ user, profile }) {
  const [users, setUsers] = useState([])
  const [cells, setCells] = useState([])
  const [editingUserId, setEditingUserId] = useState(null)

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    ministry_area: '',
    role: 'viewer',
    active: true
  })

  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [expandedUsers, setExpandedUsers] = useState({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const isAdmin = profile?.role === 'admin'

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [usersResponse, cellsResponse] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id,full_name,email,role,active,phone,ministry_area,created_at,updated_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('cells')
        .select('id,name,zone,leader_id,status,meeting_day,meeting_time')
        .order('name')
    ])

    if (usersResponse.error) setMessage(usersResponse.error.message)
    if (cellsResponse.error) setMessage(cellsResponse.error.message)

    setUsers(usersResponse.data || [])
    setCells(cellsResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsByLeader = useMemo(() => {
    return cells.reduce((acc, cell) => {
      if (!cell.leader_id) return acc

      if (!acc[cell.leader_id]) acc[cell.leader_id] = []
      acc[cell.leader_id].push(cell)

      return acc
    }, {})
  }, [cells])

  const unassignedCells = useMemo(() => {
    return cells.filter((cell) => !cell.leader_id)
  }, [cells])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return users.filter((item) => {
      const assignedCells = cellsByLeader[item.user_id] || []

      const searchable = normalizeText([
        item.full_name,
        item.email,
        item.role,
        item.phone,
        item.ministry_area,
        assignedCells.map((cell) => `${cell.name} ${cell.zone}`).join(' ')
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesRole = roleFilter === 'todos' || item.role === roleFilter
      const matchesStatus =
        statusFilter === 'todos' ||
        (statusFilter === 'activos' ? item.active !== false : item.active === false)

      return matchesQuery && matchesRole && matchesStatus
    })
  }, [users, cellsByLeader, query, roleFilter, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [query, roleFilter, statusFilter, pageSize])

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  }, [filteredUsers.length, pageSize])

  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const start = (safePage - 1) * pageSize
    const end = start + pageSize

    return filteredUsers.slice(start, end)
  }, [filteredUsers, currentPage, totalPages, pageSize])

  const summary = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((item) => item.active !== false).length,
      admins: users.filter((item) => item.role === 'admin').length,
      leaders: users.filter((item) => item.role === 'leader').length,
      assignedCells: cells.filter((cell) => cell.leader_id).length
    }
  }, [users, cells])

  function toggleExpanded(userId) {
    setExpandedUsers((current) => ({
      ...current,
      [userId]: !current[userId]
    }))
  }

  function startEdit(item) {
    setEditingUserId(item.user_id)
    setForm({
      full_name: item.full_name || '',
      phone: item.phone || '',
      ministry_area: item.ministry_area || '',
      role: item.role || 'viewer',
      active: item.active !== false
    })

    setExpandedUsers((current) => ({
      ...current,
      [item.user_id]: true
    }))

    setMessage('')
  }

  function cancelEdit() {
    setEditingUserId(null)
    setForm({
      full_name: '',
      phone: '',
      ministry_area: '',
      role: 'viewer',
      active: true
    })
  }

  async function saveUser(item) {
    setMessage('')

    if (!form.full_name.trim()) {
      setMessage('Escribe el nombre del usuario.')
      return
    }

    if (item.user_id === user.id && form.role !== 'admin') {
      setMessage('No puedes quitarte el rol de administrador desde tu propia cuenta.')
      return
    }

    if (item.user_id === user.id && form.active === false) {
      setMessage('No puedes desactivar tu propia cuenta.')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        ministry_area: form.ministry_area.trim() || null,
        role: form.role,
        active: Boolean(form.active),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', item.user_id)

    setSaving(false)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Usuario actualizado correctamente.')
    cancelEdit()
    loadData({ keepMessage: true })
  }

  async function toggleUser(item) {
    setMessage('')

    if (item.user_id === user.id) {
      setMessage('No puedes desactivar tu propia cuenta.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        active: item.active === false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', item.user_id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(item.active === false ? 'Usuario activado correctamente.' : 'Usuario desactivado correctamente.')
    loadData({ keepMessage: true })
  }

  async function assignCellToUser(cellId, userId) {
    setMessage('')

    if (!cellId || !userId) return

    const { error } = await supabase
      .from('cells')
      .update({
        leader_id: userId
      })
      .eq('id', cellId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Célula asignada correctamente.')
    loadData({ keepMessage: true })
  }

  async function removeCellAssignment(cellId) {
    setMessage('')

    const { error } = await supabase
      .from('cells')
      .update({
        leader_id: null
      })
      .eq('id', cellId)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Asignación removida correctamente.')
    loadData({ keepMessage: true })
  }

  async function copyInvitation() {
    const origin = window.location.origin

    const text = `Hola, te invito a registrarte en la app del Plan de Células.

Entra a este enlace:
${origin}

1. Crea tu cuenta con tu correo.
2. Avísame cuando termines el registro.
3. Un administrador activará tu acceso y asignará tu rol.

Gracias por apoyar el ministerio de células.`

    try {
      await navigator.clipboard.writeText(text)
      setMessage('Mensaje de invitación copiado al portapapeles.')
    } catch {
      setMessage('No se pudo copiar automáticamente. Puedes copiarlo manualmente desde este mensaje.')
    }
  }

  if (!isAdmin) {
    return (
      <main className="space-y-6">
        <section className="hero-card">
          <p className="eyebrow">Acceso restringido</p>
          <h2>Usuarios y permisos</h2>
          <p className="muted mt-3">
            Este módulo solo está disponible para administradores.
          </p>
        </section>

        <Notice>
          Tu rol actual no tiene permisos para administrar usuarios.
        </Notice>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Administración</p>
            <h2>Usuarios y permisos</h2>
            <p className="muted mt-3 max-w-3xl">
              Administra roles, estados de acceso y asignación de líderes a células.
            </p>
          </div>

          <button className="primary-button" onClick={copyInvitation}>
            <span className="material-symbols-rounded text-lg">content_copy</span>
            Copiar invitación
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard icon="group" label="Usuarios" value={summary.total} tone="blue" />
        <StatCard icon="toggle_on" label="Activos" value={summary.active} tone="green" />
        <StatCard icon="admin_panel_settings" label="Admins" value={summary.admins} tone="gold" />
        <StatCard icon="person_raised_hand" label="Líderes" value={summary.leaders} tone="green" />
        <StatCard icon="church" label="Células asignadas" value={summary.assignedCells} tone="blue" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por nombre, correo, rol, teléfono, ministerio o célula asignada.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. líder, correo, célula..."
            />
          </Field>

          <Field label="Rol">
            <Select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              <option value="todos">Todos</option>

              {roles.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </Select>
          </Field>

          <div className="flex items-end">
            <SecondaryButton
              type="button"
              onClick={() => {
                setQuery('')
                setRoleFilter('todos')
                setStatusFilter('todos')
              }}
            >
              Limpiar
            </SecondaryButton>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Listado</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Usuarios registrados
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredUsers.length} usuario(s) encontrados. Página {Math.min(currentPage, totalPages)} de {totalPages}.
            </p>
          </div>

          <SecondaryButton onClick={() => loadData()}>
            <span className="material-symbols-rounded text-lg">refresh</span>
            Actualizar
          </SecondaryButton>
        </div>

        {loading ? (
          <p className="font-semibold text-slate-500">Cargando usuarios...</p>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            icon="group"
            title="No hay usuarios"
            description="Cuando alguien se registre en la app, aparecerá aquí para asignarle rol y permisos."
          />
        ) : (
          <>
            <div className="grid gap-3">
              {paginatedUsers.map((item) => {
                const assignedCells = cellsByLeader[item.user_id] || []
                const isEditing = editingUserId === item.user_id
                const isExpanded = Boolean(expandedUsers[item.user_id])

                return (
                  <article
                    key={item.user_id}
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.user_id)}
                      className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 gap-3">
                        <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#EAF4F8] text-lg font-black text-[#003B5C]">
                          {(item.full_name || item.email || 'U').slice(0, 1).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-lg font-black text-slate-900">
                            {item.full_name || 'Sin nombre'}
                          </h4>

                          <p className="break-all text-sm font-semibold text-slate-500">
                            {item.email || 'Sin correo'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={getRoleBadge(item.role)}>
                          {getRoleLabel(item.role)}
                        </Badge>

                        <Badge className={getStatusBadge(item.active)}>
                          {item.active !== false ? 'Activo' : 'Inactivo'}
                        </Badge>

                        <span
                          className={`material-symbols-rounded text-[#003B5C] transition ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        >
                          keyboard_arrow_down
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-200 p-5">
                        <p className="mb-5 text-xs font-semibold text-slate-400">
                          Registrado: {formatDate(item.created_at)}
                        </p>

                        {isEditing ? (
                          <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                            <div className="grid gap-4 md:grid-cols-2">
                              <Field label="Nombre completo">
                                <Input
                                  value={form.full_name}
                                  onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                                />
                              </Field>

                              <Field label="Teléfono">
                                <Input
                                  value={form.phone}
                                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                                  placeholder="Opcional"
                                />
                              </Field>

                              <Field label="Área / ministerio">
                                <Input
                                  value={form.ministry_area}
                                  onChange={(event) => setForm({ ...form, ministry_area: event.target.value })}
                                  placeholder="Ej. Células, jóvenes, discipulado..."
                                />
                              </Field>

                              <Field label="Rol">
                                <Select
                                  value={form.role}
                                  onChange={(event) => setForm({ ...form, role: event.target.value })}
                                >
                                  {roles.map((role) => (
                                    <option key={role} value={role}>
                                      {getRoleLabel(role)}
                                    </option>
                                  ))}
                                </Select>
                              </Field>

                              <Field label="Estado">
                                <Select
                                  value={form.active ? 'activo' : 'inactivo'}
                                  onChange={(event) => setForm({ ...form, active: event.target.value === 'activo' })}
                                >
                                  <option value="activo">Activo</option>
                                  <option value="inactivo">Inactivo</option>
                                </Select>
                              </Field>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <PrimaryButton disabled={saving} onClick={() => saveUser(item)}>
                                {saving ? 'Guardando...' : 'Guardar cambios'}
                              </PrimaryButton>

                              <SecondaryButton onClick={cancelEdit}>
                                Cancelar
                              </SecondaryButton>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-5 grid gap-3 md:grid-cols-3">
                            <InfoBox title="Teléfono" value={item.phone} />
                            <InfoBox title="Área / ministerio" value={item.ministry_area} />
                            <InfoBox title="Última actualización" value={formatDate(item.updated_at)} />
                          </div>
                        )}

                        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h5 className="font-black text-slate-900">Células asignadas</h5>
                              <p className="text-sm font-semibold text-slate-500">
                                {assignedCells.length} célula(s) asignadas.
                              </p>
                            </div>

                            <AssignCellControl
                              userId={item.user_id}
                              cells={cells}
                              assignedCells={assignedCells}
                              onAssign={assignCellToUser}
                            />
                          </div>

                          {assignedCells.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-400">
                              Este usuario todavía no tiene células asignadas.
                            </p>
                          ) : (
                            <div className="grid gap-2 md:grid-cols-2">
                              {assignedCells.map((cell) => (
                                <div
                                  key={cell.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4"
                                >
                                  <div>
                                    <strong className="text-sm text-slate-900">
                                      {cell.name}
                                    </strong>
                                    <p className="text-xs font-semibold text-slate-500">
                                      {cell.zone || 'Sin zona'} · {cell.status}
                                    </p>
                                  </div>

                                  <DangerButton onClick={() => removeCellAssignment(cell.id)}>
                                    Quitar
                                  </DangerButton>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <PrimaryButton onClick={() => startEdit(item)}>
                            <span className="material-symbols-rounded text-lg">edit</span>
                            Editar usuario
                          </PrimaryButton>

                          <SecondaryButton onClick={() => toggleUser(item)}>
                            <span className="material-symbols-rounded text-lg">
                              {item.active === false ? 'toggle_on' : 'toggle_off'}
                            </span>
                            {item.active === false ? 'Activar' : 'Desactivar'}
                          </SecondaryButton>
                        </div>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            <PaginationControl
              currentPage={Math.min(currentPage, totalPages)}
              totalPages={totalPages}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setCurrentPage={setCurrentPage}
              totalItems={filteredUsers.length}
            />
          </>
        )}
      </Card>

      <Card>
        <div className="mb-4">
          <p className="eyebrow">Control</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Células sin líder asignado
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Úsalas como referencia para asignar responsables.
          </p>
        </div>

        {unassignedCells.length === 0 ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
            Todas las células tienen líder asignado.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {unassignedCells.map((cell) => (
              <div key={cell.id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <strong className="text-sm text-amber-900">{cell.name}</strong>
                <p className="mt-1 text-xs font-semibold text-amber-700">
                  {cell.zone || 'Sin zona'} · {cell.meeting_day || 'Sin día'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </main>
  )
}

function InfoBox({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {title}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-700">
        {value || 'No registrado'}
      </p>
    </div>
  )
}

function AssignCellControl({ userId, cells, assignedCells, onAssign }) {
  const [selectedCell, setSelectedCell] = useState('')

  const assignedIds = new Set(assignedCells.map((cell) => cell.id))

  const availableCells = cells.filter((cell) => {
    return !assignedIds.has(cell.id)
  })

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={selectedCell}
        onChange={(event) => setSelectedCell(event.target.value)}
        className="min-w-64"
      >
        <option value="">Selecciona célula</option>

        {availableCells.map((cell) => (
          <option key={cell.id} value={cell.id}>
            {cell.name} {cell.zone ? `· ${cell.zone}` : ''}
          </option>
        ))}
      </Select>

      <SecondaryButton
        type="button"
        onClick={() => {
          onAssign(selectedCell, userId)
          setSelectedCell('')
        }}
        disabled={!selectedCell}
      >
        Asignar
      </SecondaryButton>
    </div>
  )
}

function PaginationControl({
  currentPage,
  totalPages,
  pageSize,
  setPageSize,
  setCurrentPage,
  totalItems
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div>
        <p className="text-sm font-black text-slate-800">
          Mostrando {start} - {end} de {totalItems} usuarios
        </p>
        <p className="text-xs font-semibold text-slate-500">
          Página {currentPage} de {totalPages}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-black text-slate-700">
          Ver
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setCurrentPage(1)
            }}
            className="mt-0 w-auto rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800"
          >
            {[5, 10, 15, 20].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          por página
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
            className="inline-flex items-center justify-center rounded-2xl bg-[#EAF4F8] px-4 py-3 text-sm font-black text-[#003B5C] transition hover:bg-[#D8ECF4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex items-center justify-center rounded-2xl bg-[#EAF4F8] px-4 py-3 text-sm font-black text-[#003B5C] transition hover:bg-[#D8ECF4] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}