import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

import {
  Badge,
  Card,
  DangerButton,
  EmptyState,
  Field,
  Input,
  Notice,
  PrimaryButton,
  SecondaryButton,
  Select,
  StatCard,
  Textarea
} from './ui'

import { formatDate, normalizeText } from '../lib/formatters'
import { canCreate, canDelete, canEdit } from '../lib/permissions'

import {
  emptyNeed,
  getNeedCategoryIcon,
  getNeedPriorityBadge,
  getNeedPriorityLabel,
  getNeedRelationLabel,
  getNeedStatusBadge,
  getNeedStatusLabel,
  needCategories,
  needPriorities,
  needStatuses
} from '../lib/needUtils'

export default function Needs({ user, profile }) {
  const [cells, setCells] = useState([])
  const [families, setFamilies] = useState([])
  const [members, setMembers] = useState([])
  const [profiles, setProfiles] = useState([])
  const [needs, setNeeds] = useState([])

  const [mode, setMode] = useState('list')
  const [selectedNeed, setSelectedNeed] = useState(null)
  const [form, setForm] = useState(emptyNeed)

  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [priorityFilter, setPriorityFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const role = profile?.role
  const allowCreate = canCreate(role, 'needs')
  const allowEdit = canEdit(role, 'needs')
  const allowDelete = canDelete(role, 'needs')

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [
      cellsResponse,
      familiesResponse,
      membersResponse,
      profilesResponse,
      needsResponse
    ] = await Promise.all([
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
        .order('full_name'),

      supabase
        .from('cell_needs')
        .select(`
          *,
          cells(id,name,zone),
          cell_families(id,family_name,member_count),
          cell_members(id,full_name,member_type),
          profiles!cell_needs_responsible_user_id_fkey(user_id,full_name,email,role)
        `)
        .order('created_at', { ascending: false })
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (familiesResponse.error) setMessage(familiesResponse.error.message)
    if (membersResponse.error) setMessage(membersResponse.error.message)
    if (profilesResponse.error) setMessage(profilesResponse.error.message)

    if (needsResponse.error) {
      const fallbackResponse = await supabase
        .from('cell_needs')
        .select('*, cells(id,name,zone)')
        .order('created_at', { ascending: false })

      if (fallbackResponse.error) {
        setMessage(fallbackResponse.error.message)
        setNeeds([])
      } else {
        setNeeds(fallbackResponse.data || [])
      }
    } else {
      setNeeds(needsResponse.data || [])
    }

    setCells(cellsResponse.data || [])
    setFamilies(familiesResponse.data || [])
    setMembers(membersResponse.data || [])
    setProfiles(profilesResponse.data || [])
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

  const profilesById = useMemo(() => {
    return Object.fromEntries(profiles.map((item) => [item.user_id, item]))
  }, [profiles])

  const familiesForSelectedCell = useMemo(() => {
    if (!form.cell_id) return []

    return families.filter((family) => {
      return family.cell_id === form.cell_id && family.active !== false
    })
  }, [families, form.cell_id])

  const membersForSelectedCell = useMemo(() => {
    if (!form.cell_id) return []

    return members.filter((member) => {
      return member.cell_id === form.cell_id && member.active !== false
    })
  }, [members, form.cell_id])

  const filteredNeeds = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return needs.filter((need) => {
      const cell = need.cells || cellsById[need.cell_id]
      const family = need.cell_families || familiesById[need.family_id]
      const member = need.cell_members || membersById[need.member_id]
      const responsible =
        need.profiles ||
        profilesById[need.responsible_user_id]

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        family?.family_name,
        member?.full_name,
        responsible?.full_name,
        responsible?.email,
        need.family_person_name,
        need.title,
        need.category,
        need.priority,
        need.status,
        need.description,
        need.recommended_action,
        need.follow_up_notes,
        need.due_date
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesCell = cellFilter === 'todas' || need.cell_id === cellFilter
      const matchesPriority = priorityFilter === 'todas' || need.priority === priorityFilter
      const matchesStatus = statusFilter === 'todos' || need.status === statusFilter
      const matchesCategory = categoryFilter === 'todas' || need.category === categoryFilter

      return matchesQuery && matchesCell && matchesPriority && matchesStatus && matchesCategory
    })
  }, [
    needs,
    cellsById,
    familiesById,
    membersById,
    profilesById,
    query,
    cellFilter,
    priorityFilter,
    statusFilter,
    categoryFilter
  ])

  const summary = useMemo(() => {
    return {
      total: needs.length,
      pending: needs.filter((need) => need.status === 'pendiente').length,
      followUp: needs.filter((need) => need.status === 'en seguimiento').length,
      urgent: needs.filter((need) => need.priority === 'urgente' && need.status !== 'resuelta').length,
      resolved: needs.filter((need) => need.status === 'resuelta').length
    }
  }, [needs])

  function startCreate() {
    if (!allowCreate) {
      setMessage('Tu rol no tiene permiso para crear necesidades.')
      return
    }

    setSelectedNeed(null)
    setForm(emptyNeed)
    setMode('create')
    setMessage('')
  }

  function startEdit(need) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para editar necesidades.')
      return
    }

    setSelectedNeed(need)
    setForm({
      cell_id: need.cell_id || '',
      family_id: need.family_id || '',
      member_id: need.member_id || '',
      family_person_name: need.family_person_name || '',
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

    if (!allowCreate && mode === 'create') {
      setMessage('Tu rol no tiene permiso para crear necesidades.')
      return
    }

    if (!allowEdit && mode === 'edit') {
      setMessage('Tu rol no tiene permiso para editar necesidades.')
      return
    }

    if (!form.cell_id) {
      setMessage('Selecciona una célula.')
      return
    }

    if (!form.title.trim()) {
      setMessage('Escribe el título de la necesidad.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: form.cell_id || null,
      family_id: form.family_id || null,
      member_id: form.member_id || null,
      family_person_name: form.family_person_name.trim() || null,
      title: form.title.trim(),
      category: form.category || 'oración',
      priority: form.priority || 'media',
      description: form.description.trim() || '',
      recommended_action: form.recommended_action.trim() || null,
      responsible_user_id: form.responsible_user_id || null,
      due_date: form.due_date || null,
      status: form.status || 'pendiente',
      follow_up_notes: form.follow_up_notes.trim() || null,
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

  async function updateNeedStatus(need, status) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para actualizar necesidades.')
      return
    }

    const { error } = await supabase
      .from('cell_needs')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', need.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`Necesidad marcada como ${getNeedStatusLabel(status).toLowerCase()}.`)
    setSelectedNeed(null)
    setMode('list')
    loadData({ keepMessage: true })
  }

  async function deleteNeed(need) {
    if (!allowDelete) {
      setMessage('Tu rol no tiene permiso para eliminar necesidades.')
      return
    }

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
    setSelectedNeed(null)
    setMode('list')
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
        profiles={profiles}
        saving={saving}
        message={message}
        onSubmit={saveNeed}
        onBack={backToList}
      />
    )
  }

  if (mode === 'detail' && selectedNeed) {
    const cell = selectedNeed.cells || cellsById[selectedNeed.cell_id]
    const family = selectedNeed.cell_families || familiesById[selectedNeed.family_id]
    const member = selectedNeed.cell_members || membersById[selectedNeed.member_id]
    const responsible =
      selectedNeed.profiles ||
      profilesById[selectedNeed.responsible_user_id]

    const relationLabel = getNeedRelationLabel({
      family,
      member,
      familyPersonName: selectedNeed.family_person_name
    })

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            {allowEdit && (
              <>
                <PrimaryButton onClick={() => startEdit(selectedNeed)}>
                  <span className="material-symbols-rounded text-lg">edit</span>
                  Editar
                </PrimaryButton>

                {selectedNeed.status !== 'en seguimiento' && (
                  <SecondaryButton onClick={() => updateNeedStatus(selectedNeed, 'en seguimiento')}>
                    <span className="material-symbols-rounded text-lg">pending_actions</span>
                    Seguimiento
                  </SecondaryButton>
                )}

                {selectedNeed.status !== 'resuelta' && (
                  <SecondaryButton onClick={() => updateNeedStatus(selectedNeed, 'resuelta')}>
                    <span className="material-symbols-rounded text-lg">check_circle</span>
                    Resolver
                  </SecondaryButton>
                )}

                {selectedNeed.status !== 'archivada' && (
                  <SecondaryButton onClick={() => updateNeedStatus(selectedNeed, 'archivada')}>
                    <span className="material-symbols-rounded text-lg">archive</span>
                    Archivar
                  </SecondaryButton>
                )}
              </>
            )}

            {allowDelete && (
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
            {cell?.name || 'Célula'} · {relationLabel}
          </p>
        </section>

        {message && <Notice>{message}</Notice>}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon={getNeedCategoryIcon(selectedNeed.category)}
            label="Categoría"
            value={selectedNeed.category}
            tone="blue"
          />

          <StatCard
            icon="priority_high"
            label="Prioridad"
            value={getNeedPriorityLabel(selectedNeed.priority)}
            tone={selectedNeed.priority === 'urgente' ? 'red' : 'gold'}
          />

          <StatCard
            icon="pending_actions"
            label="Estado"
            value={getNeedStatusLabel(selectedNeed.status)}
            tone={selectedNeed.status === 'resuelta' ? 'green' : 'gold'}
          />

          <StatCard
            icon="event"
            label="Fecha límite"
            value={selectedNeed.due_date ? formatDate(selectedNeed.due_date) : 'Sin fecha'}
            tone="violet"
          />
        </section>

        <Card>
          <div className="grid gap-5">
            <NeedBlock title="Célula" value={cell?.name} />
            <NeedBlock title="Persona o familia relacionada" value={relationLabel} />
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
              Registra necesidades de oración, salud, visitas, discipulado, apoyo material o seguimiento pastoral.
            </p>
          </div>

          {allowCreate && (
            <button className="primary-button" onClick={startCreate}>
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nueva necesidad
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard icon="volunteer_activism" label="Total" value={summary.total} tone="blue" />
        <StatCard icon="pending_actions" label="Pendientes" value={summary.pending} tone="gold" />
        <StatCard icon="sync_problem" label="En seguimiento" value={summary.followUp} tone="violet" />
        <StatCard icon="priority_high" label="Urgentes" value={summary.urgent} tone={summary.urgent > 0 ? 'red' : 'green'} />
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
            Busca por título, célula, familia, persona, categoría, prioridad o responsable.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, salud, familia, visita..."
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
              {needCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Prioridad">
            <Select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {needPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getNeedPriorityLabel(priority)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {needStatuses.map((status) => (
                <option key={status} value={status}>
                  {getNeedStatusLabel(status)}
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
            <p className="eyebrow">Listado</p>
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
            description="Cuando registres la primera necesidad, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredNeeds.map((need) => {
              const cell = need.cells || cellsById[need.cell_id]
              const family = need.cell_families || familiesById[need.family_id]
              const member = need.cell_members || membersById[need.member_id]

              const relationLabel = getNeedRelationLabel({
                family,
                member,
                familyPersonName: need.family_person_name
              })

              return (
                <article
                  key={need.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#EAF4F8] text-[#003B5C]">
                      <span className="material-symbols-rounded">
                        {getNeedCategoryIcon(need.category)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-black text-slate-900">
                        {need.title}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        {cell?.name || 'Célula'} · {relationLabel}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge className={getNeedPriorityBadge(need.priority)}>
                      {getNeedPriorityLabel(need.priority)}
                    </Badge>

                    <Badge className={getNeedStatusBadge(need.status)}>
                      {getNeedStatusLabel(need.status)}
                    </Badge>

                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                      {need.category}
                    </Badge>
                  </div>

                  <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                    {need.description || 'Sin descripción registrada.'}
                  </p>

                  {need.due_date && (
                    <p className="mt-3 text-xs font-black text-[#003B5C]">
                      Fecha límite: {formatDate(need.due_date)}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(need)}>
                      Ver
                    </PrimaryButton>

                    {allowEdit && (
                      <SecondaryButton onClick={() => startEdit(need)}>
                        Editar
                      </SecondaryButton>
                    )}

                    {allowEdit && need.status !== 'resuelta' && (
                      <SecondaryButton onClick={() => updateNeedStatus(need, 'resuelta')}>
                        Resolver
                      </SecondaryButton>
                    )}

                    {allowDelete && (
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
  profiles,
  saving,
  message,
  onSubmit,
  onBack
}) {
  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar necesidad' : 'Nueva necesidad'}</p>
        <h2>{mode === 'edit' ? 'Editar necesidad registrada' : 'Crear necesidad pastoral'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Puedes registrar necesidades de toda una familia, de una persona dentro de la familia, de una persona individual o de la célula en general.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Célula">
            <Select
              value={form.cell_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  cell_id: event.target.value,
                  family_id: '',
                  member_id: '',
                  family_person_name: ''
                })
              }
              required
            >
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
              onChange={(event) =>
                setForm({
                  ...form,
                  family_id: event.target.value,
                  member_id: ''
                })
              }
              disabled={!form.cell_id}
            >
              <option value="">Sin familia relacionada</option>
              {familiesForSelectedCell.map((family) => (
                <option key={family.id} value={family.id}>
                  Familia {family.family_name} · {family.member_count || 0} integrante(s)
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Nombre específico dentro de la familia"
            helper="Si la necesidad es de alguien dentro de una familia, escribe aquí su nombre. Si es de toda la familia, déjalo vacío."
          >
            <Input
              value={form.family_person_name}
              onChange={(event) =>
                setForm({
                  ...form,
                  family_person_name: event.target.value
                })
              }
              placeholder="Ej. Hna. María, Mateo, mamá de la familia..."
              disabled={!form.family_id}
            />
          </Field>

          <Field label="Persona individual relacionada">
            <Select
              value={form.member_id}
              onChange={(event) =>
                setForm({
                  ...form,
                  member_id: event.target.value,
                  family_id: '',
                  family_person_name: ''
                })
              }
              disabled={!form.cell_id}
            >
              <option value="">Sin persona individual</option>
              {membersForSelectedCell.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} {member.member_type ? `· ${member.member_type}` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Título de la necesidad">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Oración por salud"
              required
            />
          </Field>

          <Field label="Categoría">
            <Select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {needCategories.map((category) => (
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
              {needPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {getNeedPriorityLabel(priority)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {needStatuses.map((status) => (
                <option key={status} value={status}>
                  {getNeedStatusLabel(status)}
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
              {profiles
                .filter((item) => item.active !== false)
                .map((item) => (
                  <option key={item.user_id} value={item.user_id}>
                    {item.full_name || item.email}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Fecha límite / seguimiento">
            <Input
              type="date"
              value={form.due_date}
              onChange={(event) => setForm({ ...form, due_date: event.target.value })}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Descripción">
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Describe brevemente la necesidad."
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Acción recomendada">
              <Textarea
                value={form.recommended_action}
                onChange={(event) => setForm({ ...form, recommended_action: event.target.value })}
                placeholder="Ej. Orar, visitar, llamar, acompañar, entregar apoyo..."
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Notas de seguimiento">
              <Textarea
                value={form.follow_up_notes}
                onChange={(event) => setForm({ ...form, follow_up_notes: event.target.value })}
                placeholder="Avances, comentarios o acuerdos posteriores."
              />
            </Field>
          </div>

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
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}