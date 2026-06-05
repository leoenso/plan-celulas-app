import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const emptyCell = {
  name: '',
  zone: '',
  meeting_day: 'Miércoles',
  meeting_time: '19:00',
  host_name: '',
  address_reference: '',
  leader_id: '',
  assistant_name: '',
  status: 'activa',
  notes: ''
}

const emptyFamily = {
  family_name: '',
  contact_name: '',
  phone: '',
  member_count: 1,
  active: true,
  notes: ''
}

const emptyPerson = {
  full_name: '',
  phone: '',
  email: '',
  member_type: 'miembro',
  active: true,
  notes: ''
}

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const cellStatuses = ['activa', 'en formación', 'en pausa', 'cerrada']

const memberTypes = ['miembro', 'visitante', 'nuevo creyente', 'joven', 'niño', 'adulto']

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatTime(value) {
  if (!value) return 'Sin hora'
  return String(value).slice(0, 5)
}

function isCellManager(profile, cell) {
  return profile?.role === 'admin' || cell?.leader_id === profile?.user_id
}

function toCellPayload(form) {
  return {
    name: form.name.trim(),
    zone: form.zone.trim() || null,
    meeting_day: form.meeting_day || null,
    meeting_time: form.meeting_time || null,
    host_name: form.host_name.trim() || null,
    address_reference: form.address_reference.trim() || null,
    leader_id: form.leader_id || null,
    assistant_name: form.assistant_name.trim() || null,
    status: form.status || 'activa',
    notes: form.notes.trim() || null
  }
}

export default function Cells({ user, profile }) {
  const [cells, setCells] = useState([])
  const [leaders, setLeaders] = useState([])
  const [familyCounts, setFamilyCounts] = useState([])
  const [personCounts, setPersonCounts] = useState([])
  const [selectedCell, setSelectedCell] = useState(null)
  const [mode, setMode] = useState('list')
  const [cellForm, setCellForm] = useState(emptyCell)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [leaderFilter, setLeaderFilter] = useState('todos')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAdmin = profile?.role === 'admin'
  const canCreateCell = profile?.role === 'admin'

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, leadersResponse, familiesResponse, peopleResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('profiles')
        .select('user_id,full_name,email,role')
        .in('role', ['admin', 'leader', 'auxiliar'])
        .order('full_name'),

      supabase
        .from('cell_families')
        .select('id,cell_id,member_count,active'),

      supabase
        .from('cell_members')
        .select('id,cell_id,active,member_type')
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (leadersResponse.error && isAdmin) setMessage(leadersResponse.error.message)
    if (familiesResponse.error) setMessage(familiesResponse.error.message)
    if (peopleResponse.error) setMessage(peopleResponse.error.message)

    setCells(cellsResponse.data || [])
    setLeaders(leadersResponse.data || [])
    setFamilyCounts(familiesResponse.data || [])
    setPersonCounts(peopleResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const leadersById = useMemo(() => {
    return Object.fromEntries(leaders.map((leader) => [leader.user_id, leader]))
  }, [leaders])

  const countsByCell = useMemo(() => {
    const result = {}

    cells.forEach((cell) => {
      result[cell.id] = {
        families: 0,
        familyPeople: 0,
        individuals: 0,
        totalPeople: 0
      }
    })

    familyCounts.forEach((family) => {
      if (!result[family.cell_id]) return
      if (family.active === false) return

      result[family.cell_id].families += 1
      result[family.cell_id].familyPeople += Number(family.member_count || 0)
      result[family.cell_id].totalPeople += Number(family.member_count || 0)
    })

    personCounts.forEach((person) => {
      if (!result[person.cell_id]) return
      if (person.active === false) return

      result[person.cell_id].individuals += 1
      result[person.cell_id].totalPeople += 1
    })

    return result
  }, [cells, familyCounts, personCounts])

  const filteredCells = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return cells.filter((cell) => {
      const leaderName = leadersById[cell.leader_id]?.full_name || leadersById[cell.leader_id]?.email || ''

      const searchable = normalizeText([
        cell.name,
        cell.zone,
        cell.meeting_day,
        cell.host_name,
        cell.assistant_name,
        cell.address_reference,
        leaderName,
        cell.status
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesStatus = statusFilter === 'todas' || cell.status === statusFilter
      const matchesLeader =
        leaderFilter === 'todos' ||
        (leaderFilter === 'sin_asignar' ? !cell.leader_id : cell.leader_id === leaderFilter)

      return matchesQuery && matchesStatus && matchesLeader
    })
  }, [cells, leadersById, query, statusFilter, leaderFilter])

  const summary = useMemo(() => {
    const activeCells = cells.filter((cell) => cell.status === 'activa').length
    const totalFamilies = familyCounts.filter((family) => family.active !== false).length
    const totalPeople = Object.values(countsByCell).reduce((sum, item) => sum + item.totalPeople, 0)

    return {
      total: cells.length,
      activeCells,
      totalFamilies,
      totalPeople
    }
  }, [cells, familyCounts, countsByCell])

  function openCreateForm() {
    setCellForm(emptyCell)
    setSelectedCell(null)
    setMode('create')
    setMessage('')
  }

  function openEditForm(cell) {
    setSelectedCell(cell)
    setCellForm({
      name: cell.name || '',
      zone: cell.zone || '',
      meeting_day: cell.meeting_day || 'Miércoles',
      meeting_time: cell.meeting_time ? String(cell.meeting_time).slice(0, 5) : '',
      host_name: cell.host_name || '',
      address_reference: cell.address_reference || '',
      leader_id: cell.leader_id || '',
      assistant_name: cell.assistant_name || '',
      status: cell.status || 'activa',
      notes: cell.notes || ''
    })
    setMode('edit')
    setMessage('')
  }

  function openDetail(cell) {
    setSelectedCell(cell)
    setMode('detail')
    setMessage('')
  }

  function backToList() {
    setMode('list')
    setSelectedCell(null)
    setCellForm(emptyCell)
    loadData({ keepMessage: true })
  }

  async function saveCell(event) {
    event.preventDefault()
    setMessage('')

    if (!cellForm.name.trim()) {
      setMessage('Escribe el nombre de la célula.')
      return
    }

    setSaving(true)

    const payload = toCellPayload(cellForm)

    const response =
      mode === 'edit' && selectedCell?.id
        ? await supabase
            .from('cells')
            .update(payload)
            .eq('id', selectedCell.id)
            .select()
            .single()
        : await supabase
            .from('cells')
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

    setMessage(mode === 'edit' ? 'Célula actualizada correctamente.' : 'Célula creada correctamente.')
    setCellForm(emptyCell)
    setMode('list')
    setSelectedCell(null)
    loadData({ keepMessage: true })
  }

  async function deleteCell(cell) {
    const confirmation = window.confirm(
      `¿Eliminar la célula "${cell.name}"? También se eliminarán familias, personas, asistencias, informes y necesidades relacionadas.`
    )

    if (!confirmation) return

    setMessage('')

    const { error } = await supabase
      .from('cells')
      .delete()
      .eq('id', cell.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Célula eliminada correctamente.')
    setMode('list')
    setSelectedCell(null)
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <CellFormView
        mode={mode}
        form={cellForm}
        setForm={setCellForm}
        leaders={leaders}
        selectedCell={selectedCell}
        profile={profile}
        saving={saving}
        message={message}
        onSubmit={saveCell}
        onCancel={backToList}
      />
    )
  }

  if (mode === 'detail' && selectedCell) {
    return (
      <CellDetail
        cell={selectedCell}
        profile={profile}
        leadersById={leadersById}
        canManage={isCellManager(profile, selectedCell)}
        canDeleteCell={isAdmin}
        onBack={backToList}
        onEdit={() => openEditForm(selectedCell)}
        onDelete={() => deleteCell(selectedCell)}
      />
    )
  }

  return (
    <section className="page-stack">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Gestión de células</p>
            <h2>Células</h2>
            <p className="muted">
              Aquí registras las células, sus líderes, familias y personas individuales.
            </p>
          </div>

          {canCreateCell && (
            <button className="primary-button" onClick={openCreateForm}>
              + Nueva célula
            </button>
          )}
        </div>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <p>Total células</p>
          <strong>{summary.total}</strong>
        </article>

        <article className="stat-card">
          <p>Activas</p>
          <strong>{summary.activeCells}</strong>
        </article>

        <article className="stat-card">
          <p>Familias</p>
          <strong>{summary.totalFamilies}</strong>
        </article>

        <article className="stat-card">
          <p>Personas estimadas</p>
          <strong>{summary.totalPeople}</strong>
        </article>
      </section>

      {message && <p className="notice">{message}</p>}

      <section className="card">
        <div className="section-heading">
          <h3>Buscar y filtrar</h3>
          <p className="muted">Busca por nombre, zona, líder, anfitrión, día o estatus.</p>
        </div>

        <div className="filter-grid">
          <label>
            Buscar
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. Norte, Lisbeth, miércoles..."
            />
          </label>

          <label>
            Estatus
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {cellStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Líder
            <select value={leaderFilter} onChange={(event) => setLeaderFilter(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="sin_asignar">Sin asignar</option>

              {leaders.map((leader) => (
                <option key={leader.user_id} value={leader.user_id}>
                  {leader.full_name || leader.email}
                </option>
              ))}
            </select>
          </label>

          <div className="filter-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setQuery('')
                setStatusFilter('todas')
                setLeaderFilter('todos')
              }}
            >
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-heading row-between wrap">
          <div>
            <h3>Células registradas</h3>
            <p className="muted">{filteredCells.length} resultado(s) encontrados.</p>
          </div>

          <button className="secondary-button" onClick={() => loadData()}>
            Actualizar
          </button>
        </div>

        {loading ? (
          <p>Cargando...</p>
        ) : filteredCells.length === 0 ? (
          <p className="muted">No hay células que coincidan con los filtros.</p>
        ) : (
          <div className="cards-grid cells-grid">
            {filteredCells.map((cell) => {
              const counts = countsByCell[cell.id] || {
                families: 0,
                individuals: 0,
                totalPeople: 0
              }

              const canManageThisCell = isCellManager(profile, cell)

              return (
                <article className="mini-card cell-card" key={cell.id}>
                  <div className="row-between align-start">
                    <div>
                      <h4>{cell.name}</h4>
                      <p className="muted small">{cell.zone || 'Sin zona'}</p>
                    </div>

                    <span className={`pill ${String(cell.status).replaceAll(' ', '-')}`}>
                      {cell.status}
                    </span>
                  </div>

                  <div className="info-grid compact-info">
                    <p>
                      <strong>Día:</strong> {cell.meeting_day || 'Sin día'}
                    </p>
                    <p>
                      <strong>Hora:</strong> {formatTime(cell.meeting_time)}
                    </p>
                    <p>
                      <strong>Líder:</strong> {leadersById[cell.leader_id]?.full_name || 'Sin asignar'}
                    </p>
                    <p>
                      <strong>Anfitrión:</strong> {cell.host_name || 'No registrado'}
                    </p>
                  </div>

                  <div className="row-gap">
                    <span className="pill">{counts.families} familias</span>
                    <span className="pill">{counts.individuals} individuales</span>
                    <span className="pill">{counts.totalPeople} personas</span>
                  </div>

                  <div className="card-actions">
                    <button className="primary-button" onClick={() => openDetail(cell)}>
                      Ver
                    </button>

                    {canManageThisCell && (
                      <button className="secondary-button" onClick={() => openEditForm(cell)}>
                        Editar
                      </button>
                    )}

                    {isAdmin && (
                      <button className="secondary-button danger-button" onClick={() => deleteCell(cell)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </section>
  )
}

function CellFormView({
  mode,
  form,
  setForm,
  leaders,
  selectedCell,
  profile,
  saving,
  message,
  onSubmit,
  onCancel
}) {
  const isLeaderEditingOwnCell =
    mode === 'edit' &&
    profile?.role !== 'admin' &&
    selectedCell?.leader_id === profile?.user_id

  return (
    <section className="page-stack">
      <button className="secondary-button fit" onClick={onCancel}>
        ← Volver a células
      </button>

      <section className="card">
        <div className="section-heading">
          <h3>{mode === 'edit' ? 'Editar célula' : 'Crear célula'}</h3>
          <p className="muted">
            Primero creas la célula. Después, dentro de ella agregas familias y personas individuales.
          </p>
        </div>

        {message && <p className="notice">{message}</p>}

        <form className="grid-form" onSubmit={onSubmit}>
          <label>
            Nombre de la célula
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              placeholder="Ej. Célula Norte"
            />
          </label>

          <label>
            Zona / colonia
            <input
              value={form.zone}
              onChange={(event) => setForm({ ...form, zone: event.target.value })}
              placeholder="Ej. Región 95"
            />
          </label>

          <label>
            Día de reunión
            <select
              value={form.meeting_day}
              onChange={(event) => setForm({ ...form, meeting_day: event.target.value })}
            >
              <option value="">Sin definir</option>

              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hora
            <input
              type="time"
              value={form.meeting_time}
              onChange={(event) => setForm({ ...form, meeting_time: event.target.value })}
            />
          </label>

          <label>
            Anfitrión
            <input
              value={form.host_name}
              onChange={(event) => setForm({ ...form, host_name: event.target.value })}
              placeholder="Nombre de quien abre su casa"
            />
          </label>

          <label>
            Auxiliar / apoyo
            <input
              value={form.assistant_name}
              onChange={(event) => setForm({ ...form, assistant_name: event.target.value })}
              placeholder="Nombre del auxiliar"
            />
          </label>

          <label>
            Referencia de domicilio
            <input
              value={form.address_reference}
              onChange={(event) => setForm({ ...form, address_reference: event.target.value })}
              placeholder="Referencia general"
            />
          </label>

          <label>
            Líder asignado
            <select
              value={form.leader_id}
              disabled={isLeaderEditingOwnCell}
              onChange={(event) => setForm({ ...form, leader_id: event.target.value })}
            >
              <option value="">Sin asignar</option>

              {leaders.map((leader) => (
                <option key={leader.user_id} value={leader.user_id}>
                  {leader.full_name || leader.email} · {leader.role}
                </option>
              ))}
            </select>
          </label>

          <label>
            Estatus
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {cellStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="span-2">
            Notas internas
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Observaciones del grupo."
            />
          </label>

          <div className="span-2 form-actions">
            <button className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear célula'}
            </button>

            <button type="button" className="secondary-button" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </section>
  )
}

function CellDetail({
  cell,
  leadersById,
  canManage,
  canDeleteCell,
  onBack,
  onEdit,
  onDelete
}) {
  return (
    <section className="page-stack">
      <div className="row-between wrap">
        <button className="secondary-button fit" onClick={onBack}>
          ← Volver a células
        </button>

        <div className="row-gap">
          {canManage && (
            <button className="primary-button" onClick={onEdit}>
              Editar célula
            </button>
          )}

          {canDeleteCell && (
            <button className="secondary-button danger-button" onClick={onDelete}>
              Eliminar célula
            </button>
          )}
        </div>
      </div>

      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Detalle de célula</p>
            <h2>{cell.name}</h2>
            <p className="muted">
              {cell.zone || 'Sin zona'} · {cell.meeting_day || 'Sin día'} · {formatTime(cell.meeting_time)}
            </p>
          </div>

          <span className={`pill ${String(cell.status).replaceAll(' ', '-')}`}>
            {cell.status}
          </span>
        </div>
      </section>

      <section className="card">
        <div className="info-grid">
          <p>
            <strong>Líder:</strong> {leadersById[cell.leader_id]?.full_name || 'Sin asignar'}
          </p>

          <p>
            <strong>Correo líder:</strong> {leadersById[cell.leader_id]?.email || 'No registrado'}
          </p>

          <p>
            <strong>Anfitrión:</strong> {cell.host_name || 'No registrado'}
          </p>

          <p>
            <strong>Auxiliar:</strong> {cell.assistant_name || 'No registrado'}
          </p>

          <p className="span-2">
            <strong>Referencia:</strong> {cell.address_reference || 'No registrada'}
          </p>

          <p className="span-2">
            <strong>Notas:</strong> {cell.notes || 'Sin notas'}
          </p>
        </div>
      </section>

      <FamiliesSection cell={cell} canManage={canManage} />

      <PeopleSection cell={cell} canManage={canManage} />
    </section>
  )
}

function CollapsibleSection({
  title,
  description,
  badges,
  defaultOpen = true,
  children
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="card collapsible-card">
      <button
        type="button"
        className="collapse-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div className="collapse-title">
          <h3>{title}</h3>
          {description && <p className="muted">{description}</p>}
        </div>

        <div className="collapse-side">
          {badges && <div className="row-gap collapse-badges">{badges}</div>}

          <span className="material-symbols-rounded collapse-arrow" aria-hidden="true">
            keyboard_arrow_down
          </span>
        </div>
      </button>

      {open && <div className="collapse-body">{children}</div>}
    </section>
  )
}

function FamiliesSection({ cell, canManage }) {
  const [families, setFamilies] = useState([])
  const [form, setForm] = useState(emptyFamily)
  const [editingFamily, setEditingFamily] = useState(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadFamilies(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const { data, error } = await supabase
      .from('cell_families')
      .select('*')
      .eq('cell_id', cell.id)
      .order('family_name')

    if (error) {
      setMessage(error.message)
      setFamilies([])
    } else {
      setFamilies(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadFamilies()
  }, [cell.id])

  const filteredFamilies = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return families.filter((family) => {
      const searchable = normalizeText([
        family.family_name,
        family.contact_name,
        family.phone,
        family.member_count,
        family.notes
      ].join(' '))

      return !normalizedQuery || searchable.includes(normalizedQuery)
    })
  }, [families, query])

  const activeFamilies = useMemo(() => {
    return families.filter((family) => family.active !== false).length
  }, [families])

  const totalPeople = useMemo(() => {
    return families
      .filter((family) => family.active !== false)
      .reduce((sum, family) => sum + Number(family.member_count || 0), 0)
  }, [families])

  function resetForm() {
    setForm(emptyFamily)
    setEditingFamily(null)
    setMessage('')
  }

  function startEdit(family) {
    setEditingFamily(family)
    setForm({
      family_name: family.family_name || '',
      contact_name: family.contact_name || '',
      phone: family.phone || '',
      member_count: family.member_count || 1,
      active: family.active !== false,
      notes: family.notes || ''
    })
    setMessage('')
  }

  async function saveFamily(event) {
    event.preventDefault()
    setMessage('')

    if (!form.family_name.trim()) {
      setMessage('Escribe el nombre de la familia.')
      return
    }

    const memberCount = Number(form.member_count)

    if (!memberCount || memberCount < 1) {
      setMessage('El número de integrantes debe ser mínimo 1.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: cell.id,
      family_name: form.family_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      member_count: memberCount,
      active: Boolean(form.active),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    }

    const response = editingFamily?.id
      ? await supabase
          .from('cell_families')
          .update(payload)
          .eq('id', editingFamily.id)
      : await supabase
          .from('cell_families')
          .insert(payload)

    setSaving(false)

    if (response.error) {
      setMessage(response.error.message)
      return
    }

    setMessage(editingFamily ? 'Familia actualizada correctamente.' : 'Familia agregada correctamente.')
    resetForm()
    loadFamilies({ keepMessage: true })
  }

  async function toggleFamily(family) {
    const { error } = await supabase
      .from('cell_families')
      .update({
        active: !family.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', family.id)

    if (error) {
      setMessage(error.message)
      return
    }

    loadFamilies()
  }

  async function deleteFamily(family) {
    const confirmation = window.confirm(`¿Eliminar a la familia "${family.family_name}"?`)

    if (!confirmation) return

    const { error } = await supabase
      .from('cell_families')
      .delete()
      .eq('id', family.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Familia eliminada correctamente.')
    loadFamilies({ keepMessage: true })
  }

  return (
    <CollapsibleSection
      title="Familias de la célula"
      description="Aquí agregas las familias que pertenecen a esta célula."
      badges={
        <>
          <span className="pill">{activeFamilies} familias activas</span>
          <span className="pill">{totalPeople} personas estimadas</span>
        </>
      }
    >
      {message && <p className="notice">{message}</p>}

      {canManage && (
        <form className="grid-form" onSubmit={saveFamily}>
          <label>
            Nombre de la familia
            <input
              value={form.family_name}
              onChange={(event) => setForm({ ...form, family_name: event.target.value })}
              placeholder="Ej. Collí Espinosa"
              required
            />
          </label>

          <label>
            Número de integrantes
            <input
              type="number"
              min="1"
              value={form.member_count}
              onChange={(event) => setForm({ ...form, member_count: event.target.value })}
              required
            />
          </label>

          <label>
            Contacto principal
            <input
              value={form.contact_name}
              onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
              placeholder="Ej. Hna. María Collí"
            />
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Opcional"
            />
          </label>

          <label className="checkbox-label span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Familia activa
          </label>

          <label className="span-2">
            Notas
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Ej. Familia anfitriona, requiere seguimiento, niños pequeños, etc."
            />
          </label>

          <div className="span-2 form-actions">
            <button className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : editingFamily ? 'Guardar familia' : 'Agregar familia'}
            </button>

            {editingFamily && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      <div className="family-search">
        <label>
          Buscar familia
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por familia, contacto o teléfono"
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando familias...</p>
      ) : filteredFamilies.length === 0 ? (
        <p className="muted">Todavía no hay familias registradas en esta célula.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Familia</th>
                <th>Integrantes</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Notas</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredFamilies.map((family) => (
                <tr key={family.id}>
                  <td>
                    <strong>Familia {family.family_name}</strong>
                  </td>

                  <td>
                    <span className="pill">{family.member_count} personas</span>
                  </td>

                  <td>
                    <p className="small table-text">{family.contact_name || 'Sin contacto'}</p>
                    <p className="small muted table-text">{family.phone || 'Sin teléfono'}</p>
                  </td>

                  <td>
                    <span className={`pill ${family.active ? 'resuelto' : 'danger'}`}>
                      {family.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>

                  <td className="small muted">{family.notes || '—'}</td>

                  {canManage && (
                    <td>
                      <div className="row-gap">
                        <button
                          className="secondary-button compact-button"
                          onClick={() => startEdit(family)}
                        >
                          Editar
                        </button>

                        <button
                          className="secondary-button compact-button"
                          onClick={() => toggleFamily(family)}
                        >
                          {family.active ? 'Desactivar' : 'Activar'}
                        </button>

                        <button
                          className="secondary-button compact-button danger-button"
                          onClick={() => deleteFamily(family)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleSection>
  )
}

function PeopleSection({ cell, canManage }) {
  const [people, setPeople] = useState([])
  const [form, setForm] = useState(emptyPerson)
  const [editingPerson, setEditingPerson] = useState(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadPeople(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const { data, error } = await supabase
      .from('cell_members')
      .select('*')
      .eq('cell_id', cell.id)
      .order('full_name')

    if (error) {
      setMessage(error.message)
      setPeople([])
    } else {
      setPeople(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPeople()
  }, [cell.id])

  const filteredPeople = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return people.filter((person) => {
      const searchable = normalizeText([
        person.full_name,
        person.phone,
        person.email,
        person.member_type,
        person.notes
      ].join(' '))

      return !normalizedQuery || searchable.includes(normalizedQuery)
    })
  }, [people, query])

  const activePeople = useMemo(() => {
    return people.filter((person) => person.active !== false).length
  }, [people])

  function resetForm() {
    setForm(emptyPerson)
    setEditingPerson(null)
    setMessage('')
  }

  function startEdit(person) {
    setEditingPerson(person)
    setForm({
      full_name: person.full_name || '',
      phone: person.phone || '',
      email: person.email || '',
      member_type: person.member_type || 'miembro',
      active: person.active !== false,
      notes: person.notes || ''
    })
    setMessage('')
  }

  async function savePerson(event) {
    event.preventDefault()
    setMessage('')

    if (!form.full_name.trim()) {
      setMessage('Escribe el nombre completo.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: cell.id,
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      member_type: form.member_type || 'miembro',
      active: Boolean(form.active),
      notes: form.notes.trim() || null
    }

    const response = editingPerson?.id
      ? await supabase
          .from('cell_members')
          .update(payload)
          .eq('id', editingPerson.id)
      : await supabase
          .from('cell_members')
          .insert(payload)

    setSaving(false)

    if (response.error) {
      setMessage(response.error.message)
      return
    }

    setMessage(editingPerson ? 'Persona actualizada correctamente.' : 'Persona agregada correctamente.')
    resetForm()
    loadPeople({ keepMessage: true })
  }

  async function togglePerson(person) {
    const { error } = await supabase
      .from('cell_members')
      .update({ active: !person.active })
      .eq('id', person.id)

    if (error) {
      setMessage(error.message)
      return
    }

    loadPeople()
  }

  async function deletePerson(person) {
    const confirmation = window.confirm(`¿Eliminar a "${person.full_name}"?`)

    if (!confirmation) return

    const { error } = await supabase
      .from('cell_members')
      .delete()
      .eq('id', person.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Persona eliminada correctamente.')
    loadPeople({ keepMessage: true })
  }

  return (
    <CollapsibleSection
      title="Personas individuales"
      description="Aquí agregas a personas que no van como familia o que asisten solas."
      badges={
        <>
          <span className="pill">{activePeople} personas activas</span>
        </>
      }
    >
      {message && <p className="notice">{message}</p>}

      {canManage && (
        <form className="grid-form" onSubmit={savePerson}>
          <label>
            Nombre completo
            <input
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              required
            />
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Opcional"
            />
          </label>

          <label>
            Correo
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="Opcional"
            />
          </label>

          <label>
            Tipo
            <select
              value={form.member_type}
              onChange={(event) => setForm({ ...form, member_type: event.target.value })}
            >
              {memberTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-label span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Persona activa
          </label>

          <label className="span-2">
            Notas
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Notas de seguimiento."
            />
          </label>

          <div className="span-2 form-actions">
            <button className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : editingPerson ? 'Guardar cambios' : 'Agregar persona'}
            </button>

            {editingPerson && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      <div className="family-search">
        <label>
          Buscar persona
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, teléfono o tipo"
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando personas...</p>
      ) : filteredPeople.length === 0 ? (
        <p className="muted">Todavía no hay personas individuales registradas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Notas</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredPeople.map((person) => (
                <tr key={person.id}>
                  <td>
                    <strong>{person.full_name}</strong>
                  </td>

                  <td>{person.member_type}</td>

                  <td>
                    <p className="small table-text">{person.phone || 'Sin teléfono'}</p>
                    <p className="small muted table-text">{person.email || 'Sin correo'}</p>
                  </td>

                  <td>
                    <span className={`pill ${person.active ? 'resuelto' : 'danger'}`}>
                      {person.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>

                  <td className="small muted">{person.notes || '—'}</td>

                  {canManage && (
                    <td>
                      <div className="row-gap">
                        <button
                          className="secondary-button compact-button"
                          onClick={() => startEdit(person)}
                        >
                          Editar
                        </button>

                        <button
                          className="secondary-button compact-button"
                          onClick={() => togglePerson(person)}
                        >
                          {person.active ? 'Desactivar' : 'Activar'}
                        </button>

                        <button
                          className="secondary-button compact-button danger-button"
                          onClick={() => deletePerson(person)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleSection>
  )
}