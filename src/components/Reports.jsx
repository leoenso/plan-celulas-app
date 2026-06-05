import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const emptyReport = {
  cell_id: '',
  attendance_session_id: '',
  report_date: new Date().toISOString().slice(0, 10),
  topic: '',
  bible_passage: '',
  meeting_summary: '',
  testimonies: '',
  visitors_notes: '',
  needs_detected: '',
  follow_up_people: '',
  leader_observations: '',
  status: 'borrador'
}

const statuses = ['borrador', 'enviado', 'revisado']

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
  if (status === 'borrador') return 'Borrador'
  if (status === 'enviado') return 'Enviado'
  if (status === 'revisado') return 'Revisado'
  return status || 'Sin estatus'
}

function getStatusBadge(status) {
  if (status === 'revisado') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'enviado') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
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

export default function Reports({ user, profile }) {
  const [cells, setCells] = useState([])
  const [sessions, setSessions] = useState([])
  const [reports, setReports] = useState([])
  const [mode, setMode] = useState('list')
  const [selectedReport, setSelectedReport] = useState(null)
  const [form, setForm] = useState(emptyReport)
  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [dateFilter, setDateFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const isAdmin = profile?.role === 'admin'

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, sessionsResponse, reportsResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,leader_id,status')
        .order('name'),

      supabase
        .from('attendance_sessions')
        .select('id,cell_id,meeting_date,topic,bible_passage,status')
        .order('meeting_date', { ascending: false }),

      supabase
        .from('cell_reports')
        .select('*, cells(id,name,zone,leader_id)')
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (sessionsResponse.error) setMessage(sessionsResponse.error.message)
    if (reportsResponse.error) setMessage(reportsResponse.error.message)

    setCells(cellsResponse.data || [])
    setSessions(sessionsResponse.data || [])
    setReports(reportsResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsById = useMemo(() => {
    return Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  }, [cells])

  const sessionsForSelectedCell = useMemo(() => {
    if (!form.cell_id) return []
    return sessions.filter((session) => session.cell_id === form.cell_id)
  }, [sessions, form.cell_id])

  const filteredReports = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return reports.filter((report) => {
      const cell = report.cells || cellsById[report.cell_id]

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        report.report_date,
        report.topic,
        report.bible_passage,
        report.meeting_summary,
        report.testimonies,
        report.visitors_notes,
        report.needs_detected,
        report.follow_up_people,
        report.leader_observations,
        report.status
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesCell = cellFilter === 'todas' || report.cell_id === cellFilter
      const matchesStatus = statusFilter === 'todos' || report.status === statusFilter
      const matchesDate = !dateFilter || report.report_date === dateFilter

      return matchesQuery && matchesCell && matchesStatus && matchesDate
    })
  }, [reports, cellsById, query, cellFilter, statusFilter, dateFilter])

  const summary = useMemo(() => {
    return {
      total: reports.length,
      drafts: reports.filter((report) => report.status === 'borrador').length,
      sent: reports.filter((report) => report.status === 'enviado').length,
      reviewed: reports.filter((report) => report.status === 'revisado').length
    }
  }, [reports])

  function startCreate() {
    const firstCellId = cells[0]?.id || ''

    setSelectedReport(null)
    setForm({
      ...emptyReport,
      cell_id: firstCellId
    })
    setMode('create')
    setMessage('')
  }

  function startEdit(report) {
    setSelectedReport(report)
    setForm({
      cell_id: report.cell_id || '',
      attendance_session_id: report.attendance_session_id || '',
      report_date: report.report_date || new Date().toISOString().slice(0, 10),
      topic: report.topic || '',
      bible_passage: report.bible_passage || '',
      meeting_summary: report.meeting_summary || '',
      testimonies: report.testimonies || '',
      visitors_notes: report.visitors_notes || '',
      needs_detected: report.needs_detected || '',
      follow_up_people: report.follow_up_people || '',
      leader_observations: report.leader_observations || '',
      status: report.status || 'borrador'
    })
    setMode('edit')
    setMessage('')
  }

  function openDetail(report) {
    setSelectedReport(report)
    setMode('detail')
    setMessage('')
  }

  function backToList() {
    setMode('list')
    setSelectedReport(null)
    setForm(emptyReport)
    loadData({ keepMessage: true })
  }

  function handleSessionChange(sessionId) {
    const selectedSession = sessions.find((session) => session.id === sessionId)

    setForm((current) => ({
      ...current,
      attendance_session_id: sessionId,
      report_date: selectedSession?.meeting_date || current.report_date,
      topic: selectedSession?.topic || current.topic,
      bible_passage: selectedSession?.bible_passage || current.bible_passage
    }))
  }

  async function saveReport(event) {
    event.preventDefault()
    setMessage('')

    if (!form.cell_id) {
      setMessage('Selecciona una célula.')
      return
    }

    if (!form.report_date) {
      setMessage('Selecciona la fecha del informe.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: form.cell_id,
      attendance_session_id: form.attendance_session_id || null,
      report_date: form.report_date,
      topic: form.topic.trim() || null,
      bible_passage: form.bible_passage.trim() || null,
      meeting_summary: form.meeting_summary.trim() || null,
      testimonies: form.testimonies.trim() || null,
      visitors_notes: form.visitors_notes.trim() || null,
      needs_detected: form.needs_detected.trim() || null,
      follow_up_people: form.follow_up_people.trim() || null,
      leader_observations: form.leader_observations.trim() || null,
      status: form.status || 'borrador',
      updated_at: new Date().toISOString()
    }

    const response =
      mode === 'edit' && selectedReport?.id
        ? await supabase
            .from('cell_reports')
            .update(payload)
            .eq('id', selectedReport.id)
            .select()
            .single()
        : await supabase
            .from('cell_reports')
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

    setMessage(mode === 'edit' ? 'Informe actualizado correctamente.' : 'Informe creado correctamente.')
    setMode('list')
    setSelectedReport(null)
    setForm(emptyReport)
    loadData({ keepMessage: true })
  }

  async function markAsReviewed(report) {
    const { error } = await supabase
      .from('cell_reports')
      .update({
        status: 'revisado',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', report.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Informe marcado como revisado.')
    loadData({ keepMessage: true })
  }

  async function deleteReport(report) {
    const confirmation = window.confirm('¿Eliminar este informe? Esta acción no se puede deshacer.')

    if (!confirmation) return

    const { error } = await supabase
      .from('cell_reports')
      .delete()
      .eq('id', report.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Informe eliminado correctamente.')
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <ReportForm
        mode={mode}
        form={form}
        setForm={setForm}
        cells={cells}
        sessionsForSelectedCell={sessionsForSelectedCell}
        saving={saving}
        message={message}
        onSubmit={saveReport}
        onBack={backToList}
        onSessionChange={handleSessionChange}
      />
    )
  }

  if (mode === 'detail' && selectedReport) {
    const cell = selectedReport.cells || cellsById[selectedReport.cell_id]

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={() => startEdit(selectedReport)}>
              <span className="material-symbols-rounded text-lg">edit</span>
              Editar
            </PrimaryButton>

            {isAdmin && selectedReport.status !== 'revisado' && (
              <SecondaryButton onClick={() => markAsReviewed(selectedReport)}>
                <span className="material-symbols-rounded text-lg">verified</span>
                Marcar revisado
              </SecondaryButton>
            )}

            {isAdmin && (
              <DangerButton onClick={() => deleteReport(selectedReport)}>
                <span className="material-symbols-rounded text-lg">delete</span>
                Eliminar
              </DangerButton>
            )}
          </div>
        </div>

        <section className="hero-card">
          <p className="eyebrow">Detalle de informe</p>
          <h2>{cell?.name || 'Célula'}</h2>
          <p className="muted mt-3">
            {formatDate(selectedReport.report_date)} · {selectedReport.topic || 'Sin tema'}
          </p>
        </section>

        {message && <Notice>{message}</Notice>}

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon="assignment" label="Estado" value={getStatusLabel(selectedReport.status)} tone="blue" />
          <StatCard icon="calendar_month" label="Fecha" value={formatDate(selectedReport.report_date)} tone="gold" />
          <StatCard icon="church" label="Célula" value={cell?.name || 'Sin célula'} tone="green" />
        </section>

        <Card>
          <div className="grid gap-5">
            <ReportBlock title="Pasaje bíblico" value={selectedReport.bible_passage} />
            <ReportBlock title="Resumen de la reunión" value={selectedReport.meeting_summary} />
            <ReportBlock title="Testimonios" value={selectedReport.testimonies} />
            <ReportBlock title="Visitantes / nuevos asistentes" value={selectedReport.visitors_notes} />
            <ReportBlock title="Necesidades detectadas" value={selectedReport.needs_detected} />
            <ReportBlock title="Personas para seguimiento" value={selectedReport.follow_up_people} />
            <ReportBlock title="Observaciones del líder" value={selectedReport.leader_observations} />
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
            <p className="eyebrow">Reportes de líderes</p>
            <h2>Informes</h2>
            <p className="muted mt-3 max-w-3xl">
              Registra el resumen de cada reunión, testimonios, visitantes, necesidades y personas que requieren seguimiento.
            </p>
          </div>

          <button className="primary-button" onClick={startCreate}>
            <span className="material-symbols-rounded text-lg">add_circle</span>
            Nuevo informe
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon="assignment" label="Total informes" value={summary.total} tone="blue" />
        <StatCard icon="edit_note" label="Borradores" value={summary.drafts} tone="gold" />
        <StatCard icon="send" label="Enviados" value={summary.sent} tone="green" />
        <StatCard icon="verified" label="Revisados" value={summary.reviewed} tone="blue" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por célula, tema, fecha, necesidades, testimonios o estado.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, visita, familia, seguimiento..."
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
                setStatusFilter('todos')
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
              Informes registrados
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredReports.length} registro(s) encontrados.
            </p>
          </div>

          <SecondaryButton onClick={() => loadData()}>
            <span className="material-symbols-rounded text-lg">refresh</span>
            Actualizar
          </SecondaryButton>
        </div>

        {loading ? (
          <p className="font-semibold text-slate-500">Cargando informes...</p>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            icon="assignment"
            title="Todavía no hay informes"
            description="Cuando registres el primer informe de una célula, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredReports.map((report) => {
              const cell = report.cells || cellsById[report.cell_id]

              return (
                <article
                  key={report.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black text-slate-900">
                        {cell?.name || 'Célula'}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        {formatDate(report.report_date)}
                      </p>
                    </div>

                    <Badge className={getStatusBadge(report.status)}>
                      {getStatusLabel(report.status)}
                    </Badge>
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    <strong>Tema:</strong> {report.topic || 'Sin tema'}
                  </p>

                  <p className="mt-2 line-clamp-3 text-sm font-semibold text-slate-500">
                    {report.meeting_summary || 'Sin resumen registrado.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(report)}>
                      Ver
                    </PrimaryButton>

                    <SecondaryButton onClick={() => startEdit(report)}>
                      Editar
                    </SecondaryButton>

                    {isAdmin && report.status !== 'revisado' && (
                      <SecondaryButton onClick={() => markAsReviewed(report)}>
                        Revisar
                      </SecondaryButton>
                    )}

                    {isAdmin && (
                      <DangerButton onClick={() => deleteReport(report)}>
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

function ReportForm({
  mode,
  form,
  setForm,
  cells,
  sessionsForSelectedCell,
  saving,
  message,
  onSubmit,
  onBack,
  onSessionChange
}) {
  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar informe' : 'Nuevo informe'}</p>
        <h2>{mode === 'edit' ? 'Editar informe de reunión' : 'Crear informe de reunión'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Registra lo más importante de la reunión: tema, resumen, visitantes, necesidades y seguimiento.
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
                  attendance_session_id: ''
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

          <Field label="Vincular asistencia">
            <Select
              value={form.attendance_session_id}
              onChange={(event) => onSessionChange(event.target.value)}
            >
              <option value="">Sin vincular</option>
              {sessionsForSelectedCell.map((session) => (
                <option key={session.id} value={session.id}>
                  {formatDate(session.meeting_date)} · {session.topic || 'Sin tema'}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha del informe">
            <Input
              type="date"
              value={form.report_date}
              onChange={(event) => setForm({ ...form, report_date: event.target.value })}
              required
            />
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

          <div className="md:col-span-2">
            <Field label="Resumen de la reunión">
              <Textarea
                value={form.meeting_summary}
                onChange={(event) => setForm({ ...form, meeting_summary: event.target.value })}
                placeholder="Describe brevemente cómo se desarrolló la reunión."
              />
            </Field>
          </div>

          <Field label="Testimonios">
            <Textarea
              value={form.testimonies}
              onChange={(event) => setForm({ ...form, testimonies: event.target.value })}
              placeholder="Testimonios, respuestas de oración o momentos importantes."
            />
          </Field>

          <Field label="Visitantes / nuevos asistentes">
            <Textarea
              value={form.visitors_notes}
              onChange={(event) => setForm({ ...form, visitors_notes: event.target.value })}
              placeholder="Personas nuevas, familias invitadas o visitantes."
            />
          </Field>

          <Field label="Necesidades detectadas">
            <Textarea
              value={form.needs_detected}
              onChange={(event) => setForm({ ...form, needs_detected: event.target.value })}
              placeholder="Oración, salud, visita, apoyo material, discipulado, etc."
            />
          </Field>

          <Field label="Personas para seguimiento">
            <Textarea
              value={form.follow_up_people}
              onChange={(event) => setForm({ ...form, follow_up_people: event.target.value })}
              placeholder="Personas que requieren llamada, visita o acompañamiento."
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Observaciones del líder">
              <Textarea
                value={form.leader_observations}
                onChange={(event) => setForm({ ...form, leader_observations: event.target.value })}
                placeholder="Comentarios adicionales del líder de célula."
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <PrimaryButton disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar informe'}
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

function ReportBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}