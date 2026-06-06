import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { canCreate, canDelete, canEdit } from '../lib/permissions'

const emptySessionForm = {
  cell_id: '',
  meeting_date: new Date().toISOString().slice(0, 10),
  topic: '',
  bible_passage: '',
  general_notes: '',
  status: 'cerrada'
}

const personTypes = ['miembro', 'visitante', 'nuevo creyente', 'joven', 'niño', 'adulto']
const attendanceStatuses = ['presente', 'ausente', 'justificado']

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

function isFamilyRow(row) {
  return row.record_type === 'familia' || Boolean(row.family_id)
}

function getFamilyMode(row) {
  const total = Number(row.family_total || 0)
  const attended = Number(row.attended_count || 0)

  if (attended <= 0) return 'no_asistio'
  if (attended >= total) return 'completa'
  return 'incompleta'
}

function getPersonStatusLabel(status) {
  if (status === 'presente') return 'Presente'
  if (status === 'ausente') return 'Ausente'
  if (status === 'justificado') return 'Justificado'
  return status
}

function getCounts(records = []) {
  return records.reduce(
    (acc, record) => {
      if (isFamilyRow(record)) {
        const total = Number(record.family_total || 0)
        const attended = Number(record.attended_count || 0)

        acc.families += 1
        acc.expected += total
        acc.present += attended
        acc.absent += Math.max(total - attended, 0)

        if (attended === 0) acc.absentFamilies += 1
        if (attended > 0 && attended < total) acc.partialFamilies += 1
        if (attended >= total) acc.completeFamilies += 1

        return acc
      }

      acc.expected += 1

      if (record.attendance_status === 'presente') acc.present += 1
      if (record.attendance_status === 'ausente') acc.absent += 1
      if (record.attendance_status === 'justificado') acc.justified += 1
      if (record.person_type === 'visitante') acc.visitors += 1
      if (record.person_type === 'nuevo creyente') acc.newBelievers += 1

      return acc
    },
    {
      expected: 0,
      present: 0,
      absent: 0,
      justified: 0,
      visitors: 0,
      newBelievers: 0,
      families: 0,
      completeFamilies: 0,
      partialFamilies: 0,
      absentFamilies: 0
    }
  )
}

function buildRowsFromMembersAndFamilies(members, families) {
  const familyRows = families.map((family) => ({
    key: `family-${family.id}`,
    record_type: 'familia',
    family_id: family.id,
    member_id: null,
    full_name: `Familia ${family.family_name}`,
    person_type: 'familia',
    attendance_status: 'presente',
    family_total: Number(family.member_count || 1),
    attended_count: Number(family.member_count || 1),
    family_complete: true,
    notes: ''
  }))

  const memberRows = members.map((member) => ({
    key: `member-${member.id}`,
    record_type: 'persona',
    family_id: null,
    member_id: member.id,
    full_name: member.full_name,
    person_type: member.member_type || 'miembro',
    attendance_status: 'presente',
    family_total: null,
    attended_count: null,
    family_complete: false,
    notes: ''
  }))

  return [...familyRows, ...memberRows]
}

function normalizeRecord(record) {
  return {
    key: record.id,
    id: record.id,
    record_type: record.record_type || (record.family_id ? 'familia' : 'persona'),
    family_id: record.family_id || null,
    member_id: record.member_id || null,
    full_name: record.full_name,
    person_type: record.person_type || (record.family_id ? 'familia' : 'miembro'),
    attendance_status: record.attendance_status || 'presente',
    family_total: record.family_total,
    attended_count: record.attended_count,
    family_complete: Boolean(record.family_complete),
    notes: record.notes || ''
  }
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
      className={`block min-h-28 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100 ${props.className || ''}`}
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

function StatCard({ icon, label, value, helper, tone = 'blue' }) {
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
          <strong className="mt-2 block text-3xl font-black tracking-tight">{value}</strong>
          {helper && <p className="mt-2 text-xs font-bold opacity-75">{helper}</p>}
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

export default function Attendance({ user, profile }) {
  const [cells, setCells] = useState([])
  const [sessions, setSessions] = useState([])
  const [recordsBySession, setRecordsBySession] = useState({})
  const [mode, setMode] = useState('list')
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionForm, setSessionForm] = useState(emptySessionForm)
  const [attendanceRows, setAttendanceRows] = useState([])
  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [dateFilter, setDateFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const role = profile?.role
  const allowCreate = canCreate(role, 'attendance')
  const allowEdit = canEdit(role, 'attendance')
  const allowDelete = canDelete(role, 'attendance')

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, sessionsResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,leader_id,meeting_day,meeting_time,status')
        .order('name'),

      supabase
        .from('attendance_sessions')
        .select('*, cells(id,name,zone,leader_id)')
        .order('meeting_date', { ascending: false })
        .order('created_at', { ascending: false })
    ])

    if (cellsResponse.error) {
      setMessage(cellsResponse.error.message)
      setCells([])
    } else {
      setCells(cellsResponse.data || [])
    }

    if (sessionsResponse.error) {
      setMessage(sessionsResponse.error.message)
      setSessions([])
      setRecordsBySession({})
      setLoading(false)
      return
    }

    const sessionList = sessionsResponse.data || []
    setSessions(sessionList)

    if (sessionList.length > 0) {
      const sessionIds = sessionList.map((session) => session.id)

      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .in('session_id', sessionIds)

      if (recordsError) {
        setMessage(recordsError.message)
        setRecordsBySession({})
      } else {
        const grouped = (records || []).reduce((acc, record) => {
          if (!acc[record.session_id]) acc[record.session_id] = []
          acc[record.session_id].push(normalizeRecord(record))
          return acc
        }, {})

        setRecordsBySession(grouped)
      }
    } else {
      setRecordsBySession({})
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsById = useMemo(() => {
    return Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  }, [cells])

  const filteredSessions = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return sessions.filter((session) => {
      const cell = session.cells || cellsById[session.cell_id]
      const records = recordsBySession[session.id] || []

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        session.topic,
        session.bible_passage,
        session.general_notes,
        session.meeting_date,
        records.map((record) => record.full_name).join(' ')
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesCell = cellFilter === 'todas' || session.cell_id === cellFilter
      const matchesDate = !dateFilter || session.meeting_date === dateFilter

      return matchesQuery && matchesCell && matchesDate
    })
  }, [sessions, recordsBySession, cellsById, query, cellFilter, dateFilter])

  const summary = useMemo(() => {
    const allRecords = Object.values(recordsBySession).flat()
    const counts = getCounts(allRecords)

    const percentage =
      counts.expected > 0
        ? Math.round((counts.present / counts.expected) * 100)
        : 0

    return {
      meetings: sessions.length,
      expected: counts.expected,
      present: counts.present,
      absent: counts.absent,
      families: counts.families,
      percentage
    }
  }, [sessions, recordsBySession])

  async function loadMembersForCell(cellId) {
    if (!cellId) {
      setAttendanceRows([])
      return
    }

    const [membersResponse, familiesResponse] = await Promise.all([
      supabase
        .from('cell_members')
        .select('id,full_name,member_type,active,phone,email')
        .eq('cell_id', cellId)
        .eq('active', true)
        .order('full_name'),

      supabase
        .from('cell_families')
        .select('id,family_name,member_count,active,contact_name,phone')
        .eq('cell_id', cellId)
        .eq('active', true)
        .order('family_name')
    ])

    if (membersResponse.error) {
      setMessage(membersResponse.error.message)
      setAttendanceRows([])
      return
    }

    if (familiesResponse.error) {
      setMessage(familiesResponse.error.message)
      setAttendanceRows([])
      return
    }

    setAttendanceRows(
      buildRowsFromMembersAndFamilies(
        membersResponse.data || [],
        familiesResponse.data || []
      )
    )
  }

  function startCreate() {
    if (!allowCreate) {
      setMessage('Tu rol no tiene permiso para crear asistencias.')
      return
    }

    const firstCellId = cells[0]?.id || ''

    setSelectedSession(null)
    setSessionForm({
      ...emptySessionForm,
      cell_id: firstCellId
    })
    setAttendanceRows([])
    setMode('create')
    setMessage('')

    if (firstCellId) loadMembersForCell(firstCellId)
  }

  async function handleCellChange(cellId) {
    setSessionForm({ ...sessionForm, cell_id: cellId })
    await loadMembersForCell(cellId)
  }

  async function openDetail(session) {
    setSelectedSession(session)
    setMode('detail')
    setMessage('')

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session.id)
      .order('full_name')

    if (error) {
      setMessage(error.message)
      return
    }

    setAttendanceRows((data || []).map(normalizeRecord))
  }

  async function startEdit(session) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para editar asistencias.')
      return
    }

    setSelectedSession(session)
    setSessionForm({
      cell_id: session.cell_id,
      meeting_date: session.meeting_date || new Date().toISOString().slice(0, 10),
      topic: session.topic || '',
      bible_passage: session.bible_passage || '',
      general_notes: session.general_notes || '',
      status: session.status || 'cerrada'
    })

    setMode('edit')
    setMessage('')

    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session.id)
      .order('full_name')

    if (error) {
      setMessage(error.message)
      setAttendanceRows([])
    } else {
      setAttendanceRows((data || []).map(normalizeRecord))
    }
  }

  function backToList() {
    setMode('list')
    setSelectedSession(null)
    setSessionForm(emptySessionForm)
    setAttendanceRows([])
    loadData({ keepMessage: true })
  }

  function updateRow(index, field, value) {
    setAttendanceRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== index) return row

        const next = { ...row }

        if (field !== 'family_mode') {
          next[field] = value
        }

        if (isFamilyRow(next)) {
          const total = Number(next.family_total || 1)

          if (field === 'family_mode') {
            if (value === 'no_asistio') {
              next.attended_count = 0
              next.family_complete = false
              next.attendance_status = 'ausente'
            }

            if (value === 'completa') {
              next.attended_count = total
              next.family_complete = true
              next.attendance_status = 'presente'
            }

            if (value === 'incompleta') {
              const currentAttended = Number(next.attended_count || 0)
              const safeAttended =
                currentAttended > 0 && currentAttended < total
                  ? currentAttended
                  : Math.max(total - 1, 1)

              next.attended_count = safeAttended
              next.family_complete = false
              next.attendance_status = 'presente'
            }
          }

          if (field === 'attended_count') {
            const attended = Math.max(0, Math.min(Number(value || 0), total))

            next.attended_count = attended
            next.family_complete = attended === total
            next.attendance_status = attended > 0 ? 'presente' : 'ausente'
          }
        }

        return next
      })
    )
  }

  function addVisitorRow() {
    setAttendanceRows((current) => [
      ...current,
      {
        key: `visitor-${Date.now()}`,
        record_type: 'persona',
        family_id: null,
        member_id: null,
        full_name: '',
        person_type: 'visitante',
        attendance_status: 'presente',
        family_total: null,
        attended_count: null,
        family_complete: false,
        notes: ''
      }
    ])
  }

  function removeRow(index) {
    setAttendanceRows((current) => current.filter((_, rowIndex) => rowIndex !== index))
  }

  function markAllPresent() {
    setAttendanceRows((current) =>
      current.map((row) => {
        if (isFamilyRow(row)) {
          const total = Number(row.family_total || 1)

          return {
            ...row,
            attended_count: total,
            family_complete: true,
            attendance_status: 'presente'
          }
        }

        return {
          ...row,
          attendance_status: 'presente'
        }
      })
    )
  }

  function markAllAbsent() {
    setAttendanceRows((current) =>
      current.map((row) => {
        if (isFamilyRow(row)) {
          return {
            ...row,
            attended_count: 0,
            family_complete: false,
            attendance_status: 'ausente'
          }
        }

        return {
          ...row,
          attendance_status: 'ausente'
        }
      })
    )
  }

  async function saveAttendance(event) {
    event.preventDefault()
    setMessage('')

    if (mode === 'create' && !allowCreate) {
      setMessage('Tu rol no tiene permiso para crear asistencias.')
      return
    }

    if (mode === 'edit' && !allowEdit) {
      setMessage('Tu rol no tiene permiso para editar asistencias.')
      return
    }

    if (!sessionForm.cell_id) {
      setMessage('Selecciona una célula.')
      return
    }

    if (!sessionForm.meeting_date) {
      setMessage('Selecciona la fecha de la reunión.')
      return
    }

    const cleanRows = attendanceRows
      .map((row) => {
        const family = isFamilyRow(row)
        const total = family ? Number(row.family_total || 1) : null
        const attended = family ? Number(row.attended_count || 0) : null

        return {
          record_type: family ? 'familia' : 'persona',
          family_id: row.family_id || null,
          member_id: row.member_id || null,
          full_name: row.full_name.trim(),
          person_type: family ? 'familia' : row.person_type || 'miembro',
          attendance_status: family
            ? attended > 0 ? 'presente' : 'ausente'
            : row.attendance_status || 'presente',
          family_total: total,
          attended_count: attended,
          family_complete: family ? attended === total : false,
          notes: row.notes?.trim() || null
        }
      })
      .filter((row) => row.full_name)

    if (cleanRows.length === 0) {
      setMessage('No puedes guardar una asistencia vacía. Agrega familias, personas individuales o visitantes.')
      return
    }

    setSaving(true)

    const sessionPayload = {
      cell_id: sessionForm.cell_id,
      meeting_date: sessionForm.meeting_date,
      topic: sessionForm.topic.trim() || null,
      bible_passage: sessionForm.bible_passage.trim() || null,
      general_notes: sessionForm.general_notes.trim() || null,
      status: sessionForm.status || 'cerrada',
      updated_at: new Date().toISOString()
    }

    let sessionId = selectedSession?.id

    if (mode === 'edit' && sessionId) {
      const { error } = await supabase
        .from('attendance_sessions')
        .update(sessionPayload)
        .eq('id', sessionId)

      if (error) {
        setSaving(false)
        setMessage(error.message)
        return
      }

      const deleteResponse = await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', sessionId)

      if (deleteResponse.error) {
        setSaving(false)
        setMessage(deleteResponse.error.message)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          ...sessionPayload,
          created_by: user.id
        })
        .select()
        .single()

      if (error) {
        setSaving(false)

        if (error.code === '23505') {
          setMessage('Ya existe una asistencia registrada para esta célula en esa fecha. Puedes editarla desde el historial.')
        } else {
          setMessage(error.message)
        }

        return
      }

      sessionId = data.id
    }

    const recordsPayload = cleanRows.map((row) => ({
      session_id: sessionId,
      ...row,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('attendance_records')
      .insert(recordsPayload)

    if (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }

    setSaving(false)
    setMessage(mode === 'edit' ? 'Asistencia actualizada correctamente.' : 'Asistencia registrada correctamente.')
    setMode('list')
    setSelectedSession(null)
    setSessionForm(emptySessionForm)
    setAttendanceRows([])
    loadData({ keepMessage: true })
  }

  async function deleteSession(session) {
    if (!allowDelete) {
      setMessage('Tu rol no tiene permiso para eliminar asistencias.')
      return
    }

    const cellName = session.cells?.name || cellsById[session.cell_id]?.name || 'esta célula'

    const confirmation = window.confirm(
      `¿Eliminar la asistencia de "${cellName}" del ${formatDate(session.meeting_date)}?`
    )

    if (!confirmation) return

    setMessage('')

    const { error } = await supabase
      .from('attendance_sessions')
      .delete()
      .eq('id', session.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Asistencia eliminada correctamente.')
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <AttendanceForm
        mode={mode}
        cells={cells}
        form={sessionForm}
        setForm={setSessionForm}
        rows={attendanceRows}
        saving={saving}
        message={message}
        onCellChange={handleCellChange}
        onSubmit={saveAttendance}
        onBack={backToList}
        updateRow={updateRow}
        addVisitorRow={addVisitorRow}
        removeRow={removeRow}
        markAllPresent={markAllPresent}
        markAllAbsent={markAllAbsent}
      />
    )
  }

  if (mode === 'detail' && selectedSession) {
    const counts = getCounts(attendanceRows)
    const cell = selectedSession.cells || cellsById[selectedSession.cell_id]

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            {allowEdit && (
              <PrimaryButton onClick={() => startEdit(selectedSession)}>
                <span className="material-symbols-rounded text-lg">edit</span>
                Editar
              </PrimaryButton>
            )}

            {allowDelete && (
              <DangerButton onClick={() => deleteSession(selectedSession)}>
                <span className="material-symbols-rounded text-lg">delete</span>
                Eliminar
              </DangerButton>
            )}
          </div>
        </div>

        <section className="hero-card">
          <p className="eyebrow">Detalle de asistencia</p>
          <h2>{cell?.name || 'Célula'}</h2>
          <p className="muted mt-3">
            {formatDate(selectedSession.meeting_date)} · {selectedSession.topic || 'Sin tema'}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon="groups" label="Total esperado" value={counts.expected} tone="blue" />
          <StatCard icon="check_circle" label="Asistieron" value={counts.present} tone="green" />
          <StatCard icon="cancel" label="Faltaron" value={counts.absent} tone="red" />
          <StatCard icon="family_restroom" label="Familias" value={counts.families} tone="gold" />
        </section>

        {message && <Notice>{message}</Notice>}

        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="text-sm font-semibold text-slate-700">
              <strong>Pasaje:</strong> {selectedSession.bible_passage || 'No registrado'}
            </p>

            <p className="text-sm font-semibold text-slate-700">
              <strong>Estatus:</strong> {selectedSession.status}
            </p>

            <p className="text-sm font-semibold text-slate-700 md:col-span-2">
              <strong>Notas:</strong> {selectedSession.general_notes || 'Sin notas'}
            </p>
          </div>
        </Card>

        <AttendanceTable rows={attendanceRows} readOnly />
      </main>
    )
  }

  return (
    <main className="space-y-6">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Registro semanal</p>
            <h2>Asistencia</h2>
            <p className="muted mt-3 max-w-3xl">
              Registra familias completas, incompletas, ausentes, personas individuales y visitantes.
            </p>
          </div>

          {allowCreate && (
            <button className="primary-button" onClick={startCreate}>
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nueva asistencia
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon="calendar_month" label="Reuniones" value={summary.meetings} tone="blue" />
        <StatCard icon="check_circle" label="Asistieron" value={summary.present} tone="green" />
        <StatCard icon="cancel" label="Faltaron" value={summary.absent} tone="red" />
        <StatCard icon="monitoring" label="Porcentaje" value={`${summary.percentage}%`} tone="gold" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por célula, familia, persona, zona, tema, pasaje o fecha.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. Familia Collí, Célula Norte, Romanos..."
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

          <Field label="Fecha">
            <Input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </Field>

          <div className="flex items-end">
            <SecondaryButton
              type="button"
              onClick={() => {
                setQuery('')
                setCellFilter('todas')
                setDateFilter('')
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
              Asistencias registradas
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredSessions.length} registro(s) encontrados.
            </p>
          </div>

          <SecondaryButton onClick={() => loadData()}>
            <span className="material-symbols-rounded text-lg">refresh</span>
            Actualizar
          </SecondaryButton>
        </div>

        {loading ? (
          <p className="font-semibold text-slate-500">Cargando asistencias...</p>
        ) : filteredSessions.length === 0 ? (
          <EmptyState
            icon="fact_check"
            title="Todavía no hay asistencias"
            description="Cuando registres la primera asistencia de una célula, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredSessions.map((session) => {
              const cell = session.cells || cellsById[session.cell_id]
              const records = recordsBySession[session.id] || []
              const counts = getCounts(records)

              return (
                <article
                  key={session.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">
                        {cell?.name || 'Célula'}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        {formatDate(session.meeting_date)}
                      </p>
                    </div>

                    <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                      {session.status}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    <strong>Tema:</strong> {session.topic || 'Sin tema'}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    <strong>Pasaje:</strong> {session.bible_passage || 'No registrado'}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      {counts.present} asistieron
                    </Badge>

                    <Badge className="border-red-200 bg-red-50 text-red-700">
                      {counts.absent} faltaron
                    </Badge>

                    <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">
                      {counts.families} familias
                    </Badge>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(session)}>
                      Ver
                    </PrimaryButton>

                    {allowEdit && (
                      <SecondaryButton onClick={() => startEdit(session)}>
                        Editar
                      </SecondaryButton>
                    )}

                    {allowDelete && (
                      <DangerButton onClick={() => deleteSession(session)}>
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

function AttendanceForm({
  mode,
  cells,
  form,
  setForm,
  rows,
  saving,
  message,
  onCellChange,
  onSubmit,
  onBack,
  updateRow,
  addVisitorRow,
  removeRow,
  markAllPresent,
  markAllAbsent
}) {
  const counts = getCounts(rows)

  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar registro' : 'Nueva asistencia'}</p>
        <h2>{mode === 'edit' ? 'Editar asistencia' : 'Registrar asistencia'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Marca si cada familia asistió completa, incompleta o no asistió. Las personas individuales se marcan una por una.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Célula">
            <Select
              value={form.cell_id}
              disabled={mode === 'edit'}
              onChange={(event) => onCellChange(event.target.value)}
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

          <Field label="Fecha de reunión">
            <Input
              type="date"
              value={form.meeting_date}
              onChange={(event) => setForm({ ...form, meeting_date: event.target.value })}
              required
            />
          </Field>

          <Field label="Tema visto">
            <Input
              value={form.topic}
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
              placeholder="Ej. La oración en la vida cristiana"
            />
          </Field>

          <Field label="Pasaje bíblico">
            <Input
              value={form.bible_passage}
              onChange={(event) => setForm({ ...form, bible_passage: event.target.value })}
              placeholder="Ej. Hechos 2:42-47"
            />
          </Field>

          <Field label="Estatus">
            <Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="cerrada">Cerrada</option>
              <option value="borrador">Borrador</option>
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Observaciones generales">
              <Textarea
                value={form.general_notes}
                onChange={(event) => setForm({ ...form, general_notes: event.target.value })}
                placeholder="Notas generales de la reunión."
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <PrimaryButton disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar asistencia'}
            </PrimaryButton>

            <SecondaryButton type="button" onClick={onBack}>
              Cancelar
            </SecondaryButton>
          </div>
        </form>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon="groups" label="Total esperado" value={counts.expected} tone="blue" />
        <StatCard icon="check_circle" label="Asistieron" value={counts.present} tone="green" />
        <StatCard icon="cancel" label="Faltaron" value={counts.absent} tone="red" />
        <StatCard icon="family_restroom" label="Familias" value={counts.families} tone="gold" />
      </section>

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Registro</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Lista de asistencia
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Las familias se registran por cantidad. Las personas individuales se marcan una por una.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <SecondaryButton type="button" onClick={markAllPresent}>
              Todos presentes
            </SecondaryButton>

            <SecondaryButton type="button" onClick={markAllAbsent}>
              Todos ausentes
            </SecondaryButton>

            <PrimaryButton type="button" onClick={addVisitorRow}>
              + Persona no registrada
            </PrimaryButton>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="groups"
            title="No hay familias ni personas cargadas"
            description="Ve al módulo Células, entra a Ver célula y agrega familias o personas individuales."
          />
        ) : (
          <AttendanceTable
            rows={rows}
            updateRow={updateRow}
            removeRow={removeRow}
          />
        )}
      </Card>
    </main>
  )
}

function AttendanceTable({ rows, updateRow, removeRow, readOnly = false }) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-4">Registro</th>
              <th className="px-4 py-4">Tipo</th>
              <th className="px-4 py-4">Asistencia</th>
              <th className="px-4 py-4">Notas</th>
              {!readOnly && <th className="px-4 py-4">Acciones</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const family = isFamilyRow(row)
              const total = Number(row.family_total || 1)
              const attended = Number(row.attended_count || 0)
              const familyMode = getFamilyMode(row)

              return (
                <tr key={row.key || row.id || `${row.full_name}-${index}`} className="bg-white align-top">
                  <td className="px-4 py-4">
                    {readOnly || row.member_id || family ? (
                      <div>
                        <strong className="text-slate-900">{row.full_name}</strong>

                        {family && (
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            Registrados: {total} integrante(s)
                          </p>
                        )}
                      </div>
                    ) : (
                      <Input
                        value={row.full_name}
                        onChange={(event) => updateRow(index, 'full_name', event.target.value)}
                        placeholder="Nombre completo"
                      />
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {family ? (
                      <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">
                        Familia
                      </Badge>
                    ) : readOnly ? (
                      <Badge className="border-slate-200 bg-slate-100 text-slate-700">
                        {row.person_type}
                      </Badge>
                    ) : (
                      <Select
                        value={row.person_type}
                        onChange={(event) => updateRow(index, 'person_type', event.target.value)}
                      >
                        {personTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {family ? (
                      readOnly ? (
                        <FamilyReadOnlyBadge attended={attended} total={total} mode={familyMode} />
                      ) : (
                        <FamilyAttendanceControl
                          row={row}
                          index={index}
                          total={total}
                          attended={attended}
                          familyMode={familyMode}
                          updateRow={updateRow}
                        />
                      )
                    ) : readOnly ? (
                      <PersonStatusBadge status={row.attendance_status} />
                    ) : (
                      <Select
                        value={row.attendance_status}
                        onChange={(event) => updateRow(index, 'attendance_status', event.target.value)}
                      >
                        {attendanceStatuses.map((status) => (
                          <option key={status} value={status}>
                            {getPersonStatusLabel(status)}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {readOnly ? (
                      <span className="text-sm font-semibold text-slate-500">
                        {row.notes || '—'}
                      </span>
                    ) : (
                      <Input
                        value={row.notes || ''}
                        onChange={(event) => updateRow(index, 'notes', event.target.value)}
                        placeholder="Opcional"
                      />
                    )}
                  </td>

                  {!readOnly && (
                    <td className="px-4 py-4">
                      {!row.member_id && !family && (
                        <DangerButton type="button" onClick={() => removeRow(index)}>
                          Quitar
                        </DangerButton>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function FamilyAttendanceControl({ index, total, attended, familyMode, updateRow }) {
  const options = [
    {
      value: 'no_asistio',
      label: 'No asistió',
      icon: 'cancel',
      activeClass: 'border-red-300 bg-red-50 text-red-700 ring-red-100'
    },
    {
      value: 'completa',
      label: 'Completa',
      icon: 'check_circle',
      activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-100'
    },
    {
      value: 'incompleta',
      label: 'Incompleta',
      icon: 'groups_2',
      activeClass: 'border-amber-300 bg-amber-50 text-amber-700 ring-amber-100'
    }
  ]

  return (
    <div className="space-y-3">
      <div className="grid gap-2 xl:grid-cols-3">
        {options.map((option) => {
          const active = familyMode === option.value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateRow(index, 'family_mode', option.value)}
              className={`rounded-2xl border px-3 py-3 text-left text-xs font-black transition ${
                active
                  ? `${option.activeClass} ring-4`
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-rounded text-lg">{option.icon}</span>
                {option.label}
              </span>
            </button>
          )
        })}
      </div>

      {familyMode === 'incompleta' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <label className="block">
            <span className="mb-2 block text-xs font-black text-amber-800">
              ¿Cuántos asistieron de esta familia?
            </span>

            <Input
              type="number"
              min="1"
              max={Math.max(total - 1, 1)}
              value={attended}
              onChange={(event) => updateRow(index, 'attended_count', event.target.value)}
              className="max-w-32 bg-white"
            />
          </label>

          <p className="mt-2 text-xs font-bold text-amber-700">
            Registrados: {total} · Asistieron: {attended}
          </p>
        </div>
      )}
    </div>
  )
}

function FamilyReadOnlyBadge({ attended, total, mode }) {
  if (mode === 'no_asistio') {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">
        No asistió · 0 de {total}
      </Badge>
    )
  }

  if (mode === 'completa') {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Completa · {attended} de {total}
      </Badge>
    )
  }

  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
      Incompleta · {attended} de {total}
    </Badge>
  )
}

function PersonStatusBadge({ status }) {
  if (status === 'presente') {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
        Presente
      </Badge>
    )
  }

  if (status === 'ausente') {
    return (
      <Badge className="border-red-200 bg-red-50 text-red-700">
        Ausente
      </Badge>
    )
  }

  return (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
      Justificado
    </Badge>
  )
}