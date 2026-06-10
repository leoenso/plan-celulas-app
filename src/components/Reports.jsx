import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAppStore } from '../context/AppContext'

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
import { canCreate, canDelete, canEdit, canReview } from '../lib/permissions'

import {
  emptyReport,
  getReportMoodBadge,
  getReportMoodLabel,
  getReportStatusBadge,
  getReportStatusIcon,
  getReportStatusLabel,
  reportMoodOptions,
  reportStatuses
} from '../lib/reportUtils'

export default function Reports({ user, profile }) {
  const [cells, setCells] = useState([])
  const [reports, setReports] = useState([])
  const [profiles, setProfiles] = useState([])

  const [mode, setMode] = useState('list')
  const [selectedReport, setSelectedReport] = useState(null)
  const [form, setForm] = useState(emptyReport)

  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [moodFilter, setMoodFilter] = useState('todos')
  const [dateFilter, setDateFilter] = useState('')

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const role = profile?.role
  const allowCreate = canCreate(role, 'reports')
  const allowEdit = canEdit(role, 'reports')
  const allowDelete = canDelete(role, 'reports')
  const allowReview = canReview(role, 'reports')

  const {
    assignedCells,
    activeCell,
    activeCellId,
    setActiveCellId
  } = useAppStore()

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, reportsResponse, profilesResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,leader_id,assistant_id,assistant_name,meeting_day,meeting_time,host_name,status')
        .order('name'),

      supabase
        .from('cell_reports')
        .select('*, cells(id,name,zone)')
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false }),

      supabase
        .from('profiles')
        .select('user_id,full_name,email,role,active')
        .order('full_name')
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (reportsResponse.error) setMessage(reportsResponse.error.message)
    if (profilesResponse.error) setMessage(profilesResponse.error.message)

    setCells(cellsResponse.data || [])
    setReports(reportsResponse.data || [])
    setProfiles(profilesResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsById = useMemo(() => {
    return Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  }, [cells])

  const availableCells = useMemo(() => {
    if (role === 'admin') return cells
    return assignedCells.length > 0 ? assignedCells : cells
  }, [role, cells, assignedCells])

  useEffect(() => {
    if (role === 'admin') return

    if (activeCellId) {
      setCellFilter(activeCellId)
      return
    }

    if (availableCells.length === 1) {
      setCellFilter(availableCells[0].id)
    }
  }, [role, activeCellId, availableCells])

  const profilesById = useMemo(() => {
    return Object.fromEntries(profiles.map((item) => [item.user_id, item]))
  }, [profiles])

  const visibleStatusOptions = useMemo(() => {
    if (allowReview) return reportStatuses
    return reportStatuses.filter((status) => status === 'borrador' || status === 'enviado')
  }, [allowReview])

  const filteredReports = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return reports.filter((report) => {
      const cell = report.cells || cellsById[report.cell_id]
      const author = profilesById[report.created_by]
      const reviewer = profilesById[report.reviewed_by]

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        author?.full_name,
        author?.email,
        reviewer?.full_name,
        reviewer?.email,
        report.report_date,
        report.topic,
        report.bible_passage,
        report.meeting_summary,
        report.attendance_notes,
        report.prayer_requests,
        report.decisions,
        report.challenges,
        report.next_steps,
        report.leader_comments,
        report.status,
        report.mood
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)
      const matchesCell = cellFilter === 'todas' || report.cell_id === cellFilter
      const matchesStatus = statusFilter === 'todos' || report.status === statusFilter
      const matchesMood = moodFilter === 'todos' || report.mood === moodFilter
      const matchesDate = !dateFilter || report.report_date === dateFilter

      return matchesQuery && matchesCell && matchesStatus && matchesMood && matchesDate
    })
  }, [reports, cellsById, profilesById, query, cellFilter, statusFilter, moodFilter, dateFilter])

  const summary = useMemo(() => {
    return {
      total: filteredReports.length,
      drafts: filteredReports.filter((report) => report.status === 'borrador').length,
      sent: filteredReports.filter((report) => report.status === 'enviado').length,
      reviewed: filteredReports.filter((report) => report.status === 'revisado').length,
      attention: filteredReports.filter((report) => report.mood === 'requiere atención').length
    }
  }, [filteredReports])

  function startCreate() {
    if (!allowCreate) {
      setMessage('Tu rol no tiene permiso para crear informes.')
      return
    }

    setSelectedReport(null)
    setForm({
      ...emptyReport,
      cell_id: role === 'admin' ? '' : activeCell?.id || activeCellId || ''
    })
    setMode('create')
    setMessage('')
  }

  function startEdit(report) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para editar informes.')
      return
    }

    setSelectedReport(report)
    setForm({
      cell_id: report.cell_id || '',
      report_date: report.report_date || new Date().toISOString().slice(0, 10),
      topic: report.topic || '',
      bible_passage: report.bible_passage || '',
      meeting_summary: report.meeting_summary || '',
      attendance_notes: report.attendance_notes || '',
      prayer_requests: report.prayer_requests || '',
      decisions: report.decisions || '',
      challenges: report.challenges || '',
      next_steps: report.next_steps || '',
      leader_comments: report.leader_comments || '',
      status: report.status || 'borrador',
      mood: report.mood || 'buena'
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

  async function saveReport(event) {
    event.preventDefault()
    setMessage('')

    if (!allowCreate && mode === 'create') {
      setMessage('Tu rol no tiene permiso para crear informes.')
      return
    }

    if (!allowEdit && mode === 'edit') {
      setMessage('Tu rol no tiene permiso para editar informes.')
      return
    }

    if (!form.cell_id) {
      setMessage('Selecciona un grupo pequeño.')
      return
    }

    if (!form.report_date) {
      setMessage('Selecciona la fecha del informe.')
      return
    }

    if (!form.topic.trim()) {
      setMessage('Escribe el tema de la reunión.')
      return
    }

    if (!allowReview && (form.status === 'revisado' || form.status === 'archivado')) {
      setMessage('Tu rol no tiene permiso para marcar informes como revisados o archivados.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: form.cell_id || null,
      report_date: form.report_date,
      topic: form.topic.trim(),
      bible_passage: form.bible_passage.trim() || null,
      meeting_summary: form.meeting_summary.trim() || '',
      attendance_notes: form.attendance_notes.trim() || null,
      prayer_requests: form.prayer_requests.trim() || null,
      decisions: form.decisions.trim() || null,
      challenges: form.challenges.trim() || null,
      next_steps: form.next_steps.trim() || null,
      leader_comments: form.leader_comments.trim() || null,
      status: form.status || 'borrador',
      mood: form.mood || 'buena',
      updated_at: new Date().toISOString()
    }

    if (form.status === 'revisado' && allowReview) {
      payload.reviewed_by = user.id
      payload.reviewed_at = new Date().toISOString()
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

  async function updateReportStatus(report, status) {
    setMessage('')

    if (!allowEdit && status === 'enviado') {
      setMessage('Tu rol no tiene permiso para enviar informes.')
      return
    }

    if (!allowReview && (status === 'revisado' || status === 'archivado')) {
      setMessage('Tu rol no tiene permiso para revisar o archivar informes.')
      return
    }

    const payload = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'revisado') {
      payload.reviewed_by = user.id
      payload.reviewed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('cell_reports')
      .update(payload)
      .eq('id', report.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`Informe marcado como ${getReportStatusLabel(status).toLowerCase()}.`)
    setSelectedReport(null)
    setMode('list')
    loadData({ keepMessage: true })
  }

  async function deleteReport(report) {
    if (!allowDelete) {
      setMessage('Tu rol no tiene permiso para eliminar informes.')
      return
    }

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
    setSelectedReport(null)
    setMode('list')
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <ReportForm
        mode={mode}
        form={form}
        setForm={setForm}
        cells={availableCells}
        statusOptions={visibleStatusOptions}
        saving={saving}
        message={message}
        onSubmit={saveReport}
        onBack={backToList}
        role={role}
        activeCellId={activeCell?.id || activeCellId}
      />
    )
  }

  if (mode === 'detail' && selectedReport) {
    const cell = selectedReport.cells || cellsById[selectedReport.cell_id]
    const author = profilesById[selectedReport.created_by]
    const reviewer = profilesById[selectedReport.reviewed_by]

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            {allowEdit && (
              <PrimaryButton onClick={() => startEdit(selectedReport)}>
                <span className="material-symbols-rounded text-lg">edit</span>
                Editar
              </PrimaryButton>
            )}

            {allowEdit && selectedReport.status !== 'enviado' && selectedReport.status !== 'revisado' && (
              <SecondaryButton onClick={() => updateReportStatus(selectedReport, 'enviado')}>
                <span className="material-symbols-rounded text-lg">send</span>
                Enviar
              </SecondaryButton>
            )}

            {allowReview && selectedReport.status !== 'revisado' && (
              <SecondaryButton onClick={() => updateReportStatus(selectedReport, 'revisado')}>
                <span className="material-symbols-rounded text-lg">verified</span>
                Revisar
              </SecondaryButton>
            )}

            {allowReview && selectedReport.status !== 'archivado' && (
              <SecondaryButton onClick={() => updateReportStatus(selectedReport, 'archivado')}>
                <span className="material-symbols-rounded text-lg">archive</span>
                Archivar
              </SecondaryButton>
            )}

            {allowDelete && (
              <DangerButton onClick={() => deleteReport(selectedReport)}>
                <span className="material-symbols-rounded text-lg">delete</span>
                Eliminar
              </DangerButton>
            )}
          </div>
        </div>

        <section className="hero-card">
          <p className="eyebrow">Detalle de informe</p>
          <h2>{selectedReport.topic || 'Informe sin tema'}</h2>
          <p className="muted mt-3">
            {cell?.name || 'Grupo pequeño'} · {formatDate(selectedReport.report_date)}
          </p>
        </section>

        {message && <Notice>{message}</Notice>}

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard
            icon="church"
            label="Grupo pequeño"
            value={cell?.name || 'Grupo pequeño'}
            tone="blue"
          />

          <StatCard
            icon={getReportStatusIcon(selectedReport.status)}
            label="Estado"
            value={getReportStatusLabel(selectedReport.status)}
            tone={selectedReport.status === 'revisado' ? 'green' : 'gold'}
          />

          <StatCard
            icon="sentiment_satisfied"
            label="Evaluación"
            value={getReportMoodLabel(selectedReport.mood)}
            tone={selectedReport.mood === 'requiere atención' ? 'red' : 'green'}
          />

          <StatCard
            icon="event"
            label="Fecha"
            value={formatDate(selectedReport.report_date)}
            tone="violet"
          />
        </section>

        <Card>
          <div className="grid gap-5">
            <ReportBlock title="Pasaje bíblico" value={selectedReport.bible_passage} />
            <ReportBlock title="Resumen de la reunión" value={selectedReport.meeting_summary} />
            <ReportBlock title="Notas de asistencia" value={selectedReport.attendance_notes} />
            <ReportBlock title="Peticiones de oración" value={selectedReport.prayer_requests} />
            <ReportBlock title="Decisiones / compromisos" value={selectedReport.decisions} />
            <ReportBlock title="Retos o situaciones" value={selectedReport.challenges} />
            <ReportBlock title="Siguientes pasos" value={selectedReport.next_steps} />
            <ReportBlock title="Comentarios del líder" value={selectedReport.leader_comments} />
            <ReportBlock title="Creado por" value={author?.full_name || author?.email} />
            <ReportBlock title="Revisado por" value={reviewer?.full_name || reviewer?.email} />
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
              Registra el resumen de cada reunión, avances, peticiones, retos y próximos pasos de los grupos pequeños.
            </p>
          </div>

          {allowCreate && (
            <button className="primary-button" onClick={startCreate}>
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nuevo informe
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard icon="assignment" label="Total" value={summary.total} tone="blue" />
        <StatCard icon="draft" label="Borradores" value={summary.drafts} tone="gold" />
        <StatCard icon="send" label="Enviados" value={summary.sent} tone="blue" />
        <StatCard icon="verified" label="Revisados" value={summary.reviewed} tone="green" />
        <StatCard icon="warning" label="Requieren atención" value={summary.attention} tone={summary.attention > 0 ? 'red' : 'green'} />
      </section>

      {message && <Notice>{message}</Notice>}

      {role !== 'admin' && (
        <ReportsActiveCellCard
          cells={availableCells}
          activeCell={activeCell}
          activeCellId={activeCell?.id || activeCellId}
          onChangeCell={(cellId) => {
            setActiveCellId(cellId)
            setCellFilter(cellId)
          }}
        />
      )}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por grupo pequeño, tema, pasaje, resumen, estado o evaluación.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, discipulado, Hechos, familia..."
            />
          </Field>

          <Field label="Grupo pequeño">
            <Select
              value={cellFilter}
              onChange={(event) => {
                const nextCellId = event.target.value
                setCellFilter(nextCellId)

                if (role !== 'admin' && nextCellId !== 'todas') {
                  setActiveCellId(nextCellId)
                }
              }}
            >
              {role === 'admin' && <option value="todas">Todas</option>}

              {availableCells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {reportStatuses.map((status) => (
                <option key={status} value={status}>
                  {getReportStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Evaluación">
            <Select value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)}>
              <option value="todos">Todas</option>
              {reportMoodOptions.map((mood) => (
                <option key={mood} value={mood}>
                  {getReportMoodLabel(mood)}
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
                setCellFilter(role === 'admin' ? 'todas' : activeCell?.id || activeCellId || availableCells[0]?.id || 'todas')
                setStatusFilter('todos')
                setMoodFilter('todos')
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
            <p className="eyebrow">Listado</p>
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
            description="Cuando registres el primer informe, aparecerá aquí."
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
                  <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#EAF4F8] text-[#003B5C]">
                      <span className="material-symbols-rounded">
                        {getReportStatusIcon(report.status)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-black text-slate-900">
                        {report.topic || 'Informe sin tema'}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        {cell?.name || 'Grupo pequeño'} · {formatDate(report.report_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge className={getReportStatusBadge(report.status)}>
                      {getReportStatusLabel(report.status)}
                    </Badge>

                    <Badge className={getReportMoodBadge(report.mood)}>
                      {getReportMoodLabel(report.mood)}
                    </Badge>
                  </div>

                  <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                    {report.meeting_summary || 'Sin resumen registrado.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(report)}>
                      Ver
                    </PrimaryButton>

                    {allowEdit && (
                      <SecondaryButton onClick={() => startEdit(report)}>
                        Editar
                      </SecondaryButton>
                    )}

                    {allowEdit && report.status !== 'enviado' && report.status !== 'revisado' && (
                      <SecondaryButton onClick={() => updateReportStatus(report, 'enviado')}>
                        Enviar
                      </SecondaryButton>
                    )}

                    {allowReview && report.status !== 'revisado' && (
                      <SecondaryButton onClick={() => updateReportStatus(report, 'revisado')}>
                        Revisar
                      </SecondaryButton>
                    )}

                    {allowDelete && (
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


function ReportsActiveCellCard({
  cells,
  activeCell,
  activeCellId,
  onChangeCell
}) {
  const selectedCellId = activeCellId || activeCell?.id || cells[0]?.id || ''

  if (!cells.length) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Grupo pequeño activo</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              No tienes grupo pequeño asignado
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cuando un administrador te asigne como líder o auxiliar, podrás crear informes para ese grupo pequeño.
            </p>
          </div>

          <span className="material-symbols-rounded rounded-3xl bg-[#EAF4F8] p-4 text-4xl text-[#003B5C]">
            assignment
          </span>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Grupo pequeño activo</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            {activeCell?.name || 'Selecciona un grupo pequeño'}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {activeCell
              ? `${activeCell.zone || 'Sin zona'} · ${activeCell.meeting_day || 'Sin día'} · ${activeCell.meeting_time ? String(activeCell.meeting_time).slice(0, 5) : 'Sin hora'}`
              : 'Elige el grupo pequeño con el que quieres trabajar.'}
          </p>
        </div>

        <label className="min-w-72">
          <span className="mb-2 block text-sm font-black text-slate-800">
            Cambiar grupo pequeño
          </span>

          <select
            value={selectedCellId}
            onChange={(event) => onChangeCell(event.target.value)}
            className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100"
          >
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id}>
                {cell.name} {cell.zone ? `· ${cell.zone}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  )
}

function ReportForm({
  mode,
  form,
  setForm,
  cells,
  statusOptions,
  saving,
  message,
  onSubmit,
  onBack,
  role,
  activeCellId
}) {
  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar informe' : 'Nuevo informe'}</p>
        <h2>{mode === 'edit' ? 'Editar informe de grupo pequeño' : 'Crear informe de grupo pequeño'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Registra el resumen de la reunión, peticiones, retos, decisiones y próximos pasos.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Grupo pequeño">
            <Select
              value={form.cell_id}
              onChange={(event) => setForm({ ...form, cell_id: event.target.value })}
              required
            >
              <option value="">Selecciona un grupo pequeño</option>
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name} {cell.zone ? `· ${cell.zone}` : ''}
                </option>
              ))}
            </Select>

            {role !== 'admin' && activeCellId && (
              <span className="mt-2 block text-xs font-semibold text-slate-500">
                Se está usando tu grupo pequeño activo. Puedes cambiarlo desde el selector superior.
              </span>
            )}
          </Field>

          <Field label="Fecha del informe">
            <Input
              type="date"
              value={form.report_date}
              onChange={(event) => setForm({ ...form, report_date: event.target.value })}
              required
            />
          </Field>

          <Field label="Tema de la reunión">
            <Input
              value={form.topic}
              onChange={(event) => setForm({ ...form, topic: event.target.value })}
              placeholder="Ej. La oración en la vida cristiana"
              required
            />
          </Field>

          <Field label="Pasaje bíblico">
            <Input
              value={form.bible_passage}
              onChange={(event) => setForm({ ...form, bible_passage: event.target.value })}
              placeholder="Ej. Hechos 2:42-47"
            />
          </Field>

          <Field label="Evaluación general">
            <Select
              value={form.mood}
              onChange={(event) => setForm({ ...form, mood: event.target.value })}
            >
              {reportMoodOptions.map((mood) => (
                <option key={mood} value={mood}>
                  {getReportMoodLabel(mood)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {getReportStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Resumen de la reunión">
              <Textarea
                value={form.meeting_summary}
                onChange={(event) => setForm({ ...form, meeting_summary: event.target.value })}
                placeholder="Describe brevemente qué se compartió y cómo respondió el grupo."
              />
            </Field>
          </div>

          <Field label="Notas de asistencia">
            <Textarea
              value={form.attendance_notes}
              onChange={(event) => setForm({ ...form, attendance_notes: event.target.value })}
              placeholder="Cambios, visitas, familias ausentes, nuevos asistentes..."
            />
          </Field>

          <Field label="Peticiones de oración">
            <Textarea
              value={form.prayer_requests}
              onChange={(event) => setForm({ ...form, prayer_requests: event.target.value })}
              placeholder="Peticiones o motivos de oración."
            />
          </Field>

          <Field label="Decisiones / compromisos">
            <Textarea
              value={form.decisions}
              onChange={(event) => setForm({ ...form, decisions: event.target.value })}
              placeholder="Decisiones tomadas, compromisos o respuestas del grupo."
            />
          </Field>

          <Field label="Retos o situaciones">
            <Textarea
              value={form.challenges}
              onChange={(event) => setForm({ ...form, challenges: event.target.value })}
              placeholder="Situaciones que requieren atención."
            />
          </Field>

          <Field label="Siguientes pasos">
            <Textarea
              value={form.next_steps}
              onChange={(event) => setForm({ ...form, next_steps: event.target.value })}
              placeholder="Qué se debe hacer después de la reunión."
            />
          </Field>

          <Field label="Comentarios del líder">
            <Textarea
              value={form.leader_comments}
              onChange={(event) => setForm({ ...form, leader_comments: event.target.value })}
              placeholder="Comentarios adicionales del líder o auxiliar."
            />
          </Field>

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
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}
