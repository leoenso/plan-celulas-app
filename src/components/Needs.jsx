import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const categories = [
  'oración',
  'salud',
  'visita pastoral',
  'apoyo material',
  'discipulado',
  'consejería',
  'conflicto / restauración',
  'otro'
]

const priorities = ['baja', 'media', 'alta', 'urgente']
const statuses = ['pendiente', 'en seguimiento', 'resuelta', 'archivada']

const emptyNeed = {
  cell_id: '',
  family_id: '',
  member_id: '',
  title: '',
  category: 'oración',
  priority: 'media',
  description: '',
  recommended_action: '',
  responsible_user_id: '',
  due_date: '',
  status: 'pendiente',
  follow_up_notes: ''
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  const [year, month, day] = String(value).split('-')
  return `${day}/${month}/${year}`
}

function getStatusLabel(status) {
  if (status === 'pendiente') return 'Pendiente'
  if (status === 'en seguimiento') return 'En seguimiento'
  if (status === 'resuelta') return 'Resuelta'
  if (status === 'archivada') return 'Archivada'
  return status || 'Sin estado'
}

function getPriorityLabel(priority) {
  if (priority === 'baja') return 'Baja'
  if (priority === 'media') return 'Media'
  if (priority === 'alta') return 'Alta'
  if (priority === 'urgente') return 'Urgente'
  return priority || 'Sin prioridad'
}

function getStatusBadge(status) {
  if (status === 'resuelta') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'en seguimiento') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (status === 'archivada') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function getPriorityBadge(priority) {
  if (priority === 'urgente') return 'border-red-200 bg-red-50 text-red-700'
  if (priority === 'alta') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (priority === 'media') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-800">{label}</span>
      {children}
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

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`block min-h-32 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100 ${props.className || ''}`}
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
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black capitalize ${className}`}>
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
    <article className={`rounded-[28px] border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
          <strong className="mt-2 block text-3xl font-black tracking-tight">{value}</strong>
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
      <span className="material-symbols-rounded text-5xl text-slate-400">{icon}</span>
      <h3 className="mt-3 text-lg font-black text-slate-800">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">{description}</p>
    </div>
  )
}

export default function Needs({ user, profile }) {
  const [cells, setCells] = useState([])
  const [families, setFamilies] = useState([])
  const [members, setMembers] = useState([])
  const [users, setUsers] = useState([])
  const [needs, setNeeds] = useState([])
  const [mode, setMode] = useState('list')
  const [selectedNeed, setSelectedNeed] = useState(null)
  const [form, setForm] = useState(emptyNeed)
  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [priorityFilter, setPriorityFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAdmin = profile?.role === 'admin'

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, familiesResponse, membersResponse, usersResponse, needsResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,leader_id,status')
        .order('name'),

      supabase
        .from('cell_families')
        .select('id,cell_id,family_name,member_count,active')
        .order('family_name'),

      supabase
        .from('cell_members')
        .select('id,cell_id,full_name,member_type,active')
        .order('full_name'),

      supabase
        .from('profiles')
        .select('user_id,full_name,email,role,active')
        .in('role', ['admin', 'leader', 'auxiliar'])
        .order('full_name'),

      supabase
        .from('cell_needs')
        .select('*, cells(id,name,zone,leader_id)')
        .order('created_at', { ascending: false })
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (familiesResponse.error) setMessage(familiesResponse.error.message)
    if (membersResponse.error) setMessage(membersResponse.error.message)
    if (usersResponse.error && isAdmin) setMessage(usersResponse.error.message)
    if (needsResponse.error) setMessage(needsResponse.error.message)

    setCells(cellsResponse.data || [])
    setFamilies(familiesResponse.data || [])
    setMembers(membersResponse.data || [])
    setUsers(usersResponse.data || [])
    setNeeds(needsResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsById = useMemo(() => {
    return Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  }, [cells])

  const familiesById = useMemo(() => {
    return Object.fromEntries(families.map((family) => [family.id, family]))
  }, [families])

  const membersById = useMemo(() => {
    return Object.fromEntries(members.map((member) => [member.id, member]))
  }, [members])

  const usersById = useMemo(() => {
    return Object.fromEntries(users.map((item) => [item.user_id, item]))
  }, [users])

  const familiesForSelectedCell = useMemo(() => {
    if (!form.cell_id) return []
    return families.filter((family) => family.cell_id === form.cell_id && family.active !== false)
  }, [families, form.cell_id])

  const membersForSelectedCell = useMemo(() => {
    if (!form.cell_id) return []
    return members.filter((member) => member.cell_id === form.cell_id && member.active !== false)
  }, [members, form.cell_id])

  const filteredNeeds = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return needs.filter((need) => {
      const cell = need.cells || cellsById[need.cell_id]
      const family = familiesById[need.family_id]
      const member = membersById[need.member_id]
      const responsible = usersById[need.responsible_user_id]

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        family?.family_name,
        member?.full_name,
        responsible?.full_name,
        responsible?.email,
        need.title,
        need.category,
        need.priority,
        need.status,
        need.description,
        need.recommended_action,
        need.follow_up_notes
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesCell = cellFilter === 'todas' || need.cell_id === cellFilter
      const matchesCategory = categoryFilter === 'todas' || need.category === categoryFilter
      const matchesPriority = priorityFilter === 'todas' || need.priority === priorityFilter
      const matchesStatus = statusFilter === 'todos' || need.status === statusFilter

      return matchesQuery && matchesCell && matchesCategory && matchesPriority && matchesStatus
    })
  }, [
    needs,
    cellsById,
    familiesById,
    membersById,
    usersById,
    query,
    cellFilter,
    categoryFilter,
    priorityFilter,
    statusFilter
  ])

  const summary = useMemo(() => {
    return {
      total: needs.length,
      pending: needs.filter((need) => need.status === 'pendiente').length,
      following: needs.filter((need) => need.status === 'en seguimiento').length,
      urgent: needs.filter((need) => need.priority === 'urgente' && need.status !== 'resuelta').length,
      resolved: needs.filter((need) => need.status === 'resuelta').length
    }
  }, [needs])

  function startCreate() {
    const firstCellId = cells[0]?.id || ''

    setSelectedNeed(null)
    setForm({
      ...emptyNeed,
      cell_id: firstCellId
    })
    setMode('create')
    setMessage('')
  }

  function startEdit(need) {
    setSelectedNeed(need)
    setForm({
      cell_id: need.cell_id || '',
      family_id: need.family_id || '',
      member_id: need.member_id || '',
      title: need.title || '',
      category: need.category || 'oración',
      priority: need.priority || 'media',
      description: need.description || '',
      recommended_action: need.recommended_action || '',
      responsible_user_id: need.responsible_user_id || '',
      due_date: need.due_date || '',
      status: need.status || 'pendiente',
      follow_up_notes: need.follow_up_notes || ''
    })
    setMode('edit')
    setMessage('')
  }

  function openDetail(need) {
    setSelectedNeed(need)
    setMode('detail')
    setMessage('')
  }

  function backToList() {
    setMode('list')
    setSelectedNeed(null)
    setForm(emptyNeed)
    loadData({ keepMessage: true })
  }

  async function saveNeed(event) {
    event.preventDefault()
    setMessage('')

    if (!form.cell_id) {
      setMessage('Selecciona una célula.')
      return
    }

    if (!form.title.trim()) {
      setMessage('Escribe un título para la necesidad.')
      return
    }

    if (!form.description.trim()) {
      setMessage('Describe la necesidad.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: form.cell_id,
      family_id: form.family_id || null,
      member_id: form.member_id || null,
      title: form.title.trim(),
      category: form.category || 'oración',
      priority: form.priority || 'media',
      description: form.description.trim(),
      recommended_action: form.recommended_action.trim() || null,
      responsible_user_id: form.responsible_user_id || null,
      due_date: form.due_date || null,
      status: form.status || 'pendiente',
      follow_up_notes: form.follow_up_notes.trim() || null,
      resolved_at: form.status === 'resuelta' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    const response =
      mode === 'edit' && selectedNeed?.id
        ? await supabase
            .from('cell_needs')
            .update(payload)
            .eq('id', selectedNeed.id)
            .select()
            .single()
        : await supabase
            .from('cell_needs')
            .insert({
              ...payload,
              created_by: user.id
            })
            .select()
            .single()

    setSaving(false)

    if (response.error) {
      setMessage(response.error.message)
      return
    }

    setMessage(mode === 'edit' ? 'Necesidad actualizada correctamente.' : 'Necesidad creada correctamente.')
    setMode('list')
    setSelectedNeed(null)
    setForm(emptyNeed)
    loadData({ keepMessage: true })
  }

  async function markResolved(need) {
    const { error } = await supabase
      .from('cell_needs')
      .update({
        status: 'resuelta',
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', need.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Necesidad marcada como resuelta.')
    loadData({ keepMessage: true })
  }

  async function moveToFollowUp(need) {
    const { error } = await supabase
      .from('cell_needs')
      .update({
        status: 'en seguimiento',
        updated_at: new Date().toISOString()
      })
      .eq('id', need.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Necesidad marcada en seguimiento.')
    loadData({ keepMessage: true })
  }

  async function deleteNeed(need) {
    const confirmation = window.confirm('¿Eliminar esta necesidad? Esta acción no se puede deshacer.')

    if (!confirmation) return

    const { error } = await supabase
      .from('cell_needs')
      .delete()
      .eq('id', need.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Necesidad eliminada correctamente.')
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <NeedForm
        mode={mode}
        form={form}
        setForm={setForm}
        cells={cells}
        familiesForSelectedCell={familiesForSelectedCell}
        membersForSelectedCell={membersForSelectedCell}
        users={users}
        saving={saving}
        message={message}
        onSubmit={saveNeed}
        onBack={backToList}
      />
    )
  }

  if (mode === 'detail' && selectedNeed) {
    const cell = selectedNeed.cells || cellsById[selectedNeed.cell_id]
    const family = familiesById[selectedNeed.family_id]
    const member = membersById[selectedNeed.member_id]
    const responsible = usersById[selectedNeed.responsible_user_id]

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => startEdit(selectedNeed)}>
              <span className="material-symbols-rounded text-lg">edit</span>
              Editar
            </PrimaryButton>

            {selectedNeed.status !== 'resuelta' && (
              <SecondaryButton onClick={() => moveToFollowUp(selectedNeed)}>
                <span className="material-symbols-rounded text-lg">pending_actions</span>
                Seguimiento
              </SecondaryButton>
            )}

            {selectedNeed.status !== 'resuelta' && (
              <SecondaryButton onClick={() => markResolved(selectedNeed)}>
                <span className="material-symbols-rounded text-lg">check_circle</span>
                Resolver
              </SecondaryButton>
            )}

            {isAdmin && (
              <DangerButton onClick={() => deleteNeed(selectedNeed)}>
                <span className="material-symbols-rounded text-lg">delete</span>
                Eliminar
              </DangerButton>
            )}
          </div>
        </div>

        <section className="hero-card">
          <p className="eyebrow">Detalle de necesidad</p>
          <h2>{selectedNeed.title}</h2>
          <p className="muted mt-3">
            {cell?.name || 'Célula'} · {getPriorityLabel(selectedNeed.priority)} · {getStatusLabel(selectedNeed.status)}
          </p>
        </section>

        {message && <Notice>{message}</Notice>}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon="volunteer_activism" label="Categoría" value={selectedNeed.category} tone="blue" />
          <StatCard icon="priority_high" label="Prioridad" value={getPriorityLabel(selectedNeed.priority)} tone={selectedNeed.priority === 'urgente' ? 'red' : 'gold'} />
          <StatCard icon="pending_actions" label="Estado" value={getStatusLabel(selectedNeed.status)} tone={selectedNeed.status === 'resuelta' ? 'green' : 'gold'} />
          <StatCard icon="event" label="Fecha límite" value={formatDate(selectedNeed.due_date)} tone="blue" />
        </section>

        <Card>
          <div className="grid gap-5">
            <NeedBlock title="Célula" value={cell?.name} />
            <NeedBlock title="Familia relacionada" value={family ? `Familia ${family.family_name}` : null} />
            <NeedBlock title="Persona relacionada" value={member?.full_name} />
            <NeedBlock title="Responsable" value={responsible?.full_name || responsible?.email} />
            <NeedBlock title="Descripción" value={selectedNeed.description} />
            <NeedBlock title="Acción recomendada" value={selectedNeed.recommended_action} />
            <NeedBlock title="Notas de seguimiento" value={selectedNeed.follow_up_notes} />
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Seguimiento pastoral</p>
            <h2>Necesidades</h2>
            <p className="muted mt-3 max-w-3xl">
              Registra necesidades de oración, salud, visitas, apoyo, discipulado o seguimiento especial.
            </p>
          </div>

          <button className="primary-button" onClick={startCreate}>
            <span className="material-symbols-rounded text-lg">add_circle</span>
            Nueva necesidad
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon="volunteer_activism" label="Total" value={summary.total} tone="blue" />
        <StatCard icon="pending" label="Pendientes" value={summary.pending} tone="gold" />
        <StatCard icon="priority_high" label="Urgentes" value={summary.urgent} tone="red" />
        <StatCard icon="check_circle" label="Resueltas" value={summary.resolved} tone="green" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por célula, familia, persona, categoría, prioridad, responsable o descripción.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, visita, salud, familia..."
            />
          </Field>

          <Field label="Célula">
            <Select value={cellFilter} onChange={(event) => setCellFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoría">
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridad">
            <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getPriorityLabel(priority)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            <SecondaryButton
              type="button"
              onClick={() => {
                setQuery('')
                setCellFilter('todas')
                setCategoryFilter('todas')
                setPriorityFilter('todas')
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
            <p className="eyebrow">Historial</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Necesidades registradas
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredNeeds.length} registro(s) encontrados.
            </p>
          </div>

          <SecondaryButton onClick={() => loadData()}>
            <span className="material-symbols-rounded text-lg">refresh</span>
            Actualizar
          </SecondaryButton>
        </div>

        {loading ? (
          <p className="font-semibold text-slate-500">Cargando necesidades...</p>
        ) : filteredNeeds.length === 0 ? (
          <EmptyState
            icon="volunteer_activism"
            title="Todavía no hay necesidades"
            description="Cuando registres la primera necesidad de una célula, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredNeeds.map((need) => {
              const cell = need.cells || cellsById[need.cell_id]
              const responsible = usersById[need.responsible_user_id]

              return (
                <article
                  key={need.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">
                        {need.title}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        {cell?.name || 'Célula'} · {need.category}
                      </p>
                    </div>

                    <Badge className={getPriorityBadge(need.priority)}>
                      {getPriorityLabel(need.priority)}
                    </Badge>
                  </div>

                  <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                    {need.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className={getStatusBadge(need.status)}>
                      {getStatusLabel(need.status)}
                    </Badge>

                    {responsible && (
                      <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">
                        {responsible.full_name || responsible.email}
                      </Badge>
                    )}

                    {need.due_date && (
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                        Límite: {formatDate(need.due_date)}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(need)}>
                      Ver
                    </PrimaryButton>

                    <SecondaryButton onClick={() => startEdit(need)}>
                      Editar
                    </SecondaryButton>

                    {need.status !== 'resuelta' && (
                      <SecondaryButton onClick={() => markResolved(need)}>
                        Resolver
                      </SecondaryButton>
                    )}

                    {isAdmin && (
                      <DangerButton onClick={() => deleteNeed(need)}>
                        Eliminar
                      </DangerButton>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Card>
    </main>
  )
}

function NeedForm({
  mode,
  form,
  setForm,
  cells,
  familiesForSelectedCell,
  membersForSelectedCell,
  users,
  saving,
  message,
  onSubmit,
  onBack
}) {
  function handleCellChange(cellId) {
    setForm({
      ...form,
      cell_id: cellId,
      family_id: '',
      member_id: ''
    })
  }

  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar necesidad' : 'Nueva necesidad'}</p>
        <h2>{mode === 'edit' ? 'Editar necesidad' : 'Registrar necesidad'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Registra la necesidad, prioridad, responsable y seguimiento recomendado.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Célula">
            <Select value={form.cell_id} onChange={(event) => handleCellChange(event.target.value)} required>
              <option value="">Selecciona una célula</option>
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name} {cell.zone ? `· ${cell.zone}` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Familia relacionada">
            <Select
              value={form.family_id}
              onChange={(event) => setForm({ ...form, family_id: event.target.value, member_id: '' })}
            >
              <option value="">Sin familia relacionada</option>
              {familiesForSelectedCell.map((family) => (
                <option key={family.id} value={family.id}>
                  Familia {family.family_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Persona relacionada">
            <Select
              value={form.member_id}
              onChange={(event) => setForm({ ...form, member_id: event.target.value, family_id: '' })}
            >
              <option value="">Sin persona relacionada</option>
              {membersForSelectedCell.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Responsable">
            <Select
              value={form.responsible_user_id}
              onChange={(event) => setForm({ ...form, responsible_user_id: event.target.value })}
            >
              <option value="">Sin responsable asignado</option>
              {users.map((item) => (
                <option key={item.user_id} value={item.user_id}>
                  {item.full_name || item.email} · {item.role}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Título">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Visita pastoral por enfermedad"
              required
            />
          </Field>

          <Field label="Categoría">
            <Select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridad">
            <Select
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value })}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getPriorityLabel(priority)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha límite">
            <Input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm({ ...form, due_date: event.target.value })}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Descripción de la necesidad">
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Describe qué está pasando y qué se necesita."
                required
              />
            </Field>
          </div>

          <Field label="Acción recomendada">
            <Textarea
              value={form.recommended_action}
              onChange={(event) => setForm({ ...form, recommended_action: event.target.value })}
              placeholder="Ej. Llamar, visitar, orar, apoyar con despensa, canalizar con pastor, etc."
            />
          </Field>

          <Field label="Notas de seguimiento">
            <Textarea
              value={form.follow_up_notes}
              onChange={(event) => setForm({ ...form, follow_up_notes: event.target.value })}
              placeholder="Actualizaciones, avances o comentarios."
            />
          </Field>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <PrimaryButton disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar necesidad'}
            </PrimaryButton>

            <SecondaryButton type="button" onClick={onBack}>
              Cancelar
            </SecondaryButton>
          </div>
        </form>
      </Card>
    </main>
  )
}

function NeedBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}