import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { canCreate, canDelete, canEdit } from '../lib/permissions'
import { formatDate, normalizeText } from '../lib/formatters'
import {
  addDays,
  addMonths,
  addYears,
  emptyTopic,
  getCompactCardClass,
  getMonthGridDays,
  getRangeTitle,
  getStatusBadge,
  getStatusLabel,
  getWeekGridDays,
  monthNames,
  parseTopicDate,
  topicStatuses,
  topicViewModes,
  toDateKey,
  weekDays
} from '../lib/topicUtils'
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

export default function Topics({ user, profile }) {
  const [cells, setCells] = useState([])
  const [topics, setTopics] = useState([])
  const [mode, setMode] = useState('list')
  const [viewMode, setViewMode] = useState('cards')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [modalTopic, setModalTopic] = useState(null)
  const [form, setForm] = useState(emptyTopic)
  const [query, setQuery] = useState('')
  const [cellFilter, setCellFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [dateFilter, setDateFilter] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const role = profile?.role
  const isAdmin = role === 'admin'
  const allowCreate = canCreate(role, 'topics')
  const allowEdit = canEdit(role, 'topics')
  const allowDelete = canDelete(role, 'topics')

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [cellsResponse, topicsResponse] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,leader_id,status')
        .order('name'),

      supabase
        .from('cell_topics')
        .select('*, cells(id,name,zone,leader_id)')
        .order('suggested_date', { ascending: true })
        .order('created_at', { ascending: false })
    ])

    if (cellsResponse.error) setMessage(cellsResponse.error.message)
    if (topicsResponse.error) setMessage(topicsResponse.error.message)

    setCells(cellsResponse.data || [])
    setTopics(topicsResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const cellsById = useMemo(() => {
    return Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  }, [cells])

  const filteredTopics = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return topics.filter((topic) => {
      const cell = topic.cells || cellsById[topic.cell_id]

      const searchable = normalizeText([
        cell?.name,
        cell?.zone,
        topic.title,
        topic.bible_passage,
        topic.objective,
        topic.summary,
        topic.activity,
        topic.materials_needed,
        topic.notes,
        topic.status,
        topic.suggested_date
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)

      const matchesCell =
        cellFilter === 'todas' ||
        (cellFilter === 'general' ? !topic.cell_id : topic.cell_id === cellFilter)

      const matchesStatus = statusFilter === 'todos' || topic.status === statusFilter
      const matchesDate = !dateFilter || topic.suggested_date === dateFilter

      return matchesQuery && matchesCell && matchesStatus && matchesDate
    })
  }, [topics, cellsById, query, cellFilter, statusFilter, dateFilter])

  const topicsByDate = useMemo(() => {
    return filteredTopics.reduce((acc, topic) => {
      if (!acc[topic.suggested_date]) acc[topic.suggested_date] = []
      acc[topic.suggested_date].push(topic)
      return acc
    }, {})
  }, [filteredTopics])

  const summary = useMemo(() => {
    return {
      total: topics.length,
      programmed: topics.filter((topic) => topic.status === 'programado').length,
      completed: topics.filter((topic) => topic.status === 'visto').length,
      postponed: topics.filter((topic) => topic.status === 'pospuesto').length
    }
  }, [topics])

  function startCreate() {
    if (!allowCreate) {
      setMessage('Tu rol no tiene permiso para crear temas.')
      return
    }

    setSelectedTopic(null)
    setModalTopic(null)
    setForm(emptyTopic)
    setMode('create')
    setMessage('')
  }

  function startEdit(topic) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para editar temas.')
      return
    }

    setSelectedTopic(topic)
    setModalTopic(null)
    setForm({
      cell_id: topic.cell_id || '',
      title: topic.title || '',
      bible_passage: topic.bible_passage || '',
      objective: topic.objective || '',
      summary: topic.summary || '',
      activity: topic.activity || '',
      materials_needed: topic.materials_needed || '',
      notes: topic.notes || '',
      suggested_date: topic.suggested_date || new Date().toISOString().slice(0, 10),
      status: topic.status || 'programado'
    })
    setMode('edit')
    setMessage('')
  }

  function openTopicModal(topic) {
    setModalTopic(topic)
    setMessage('')
  }

  function closeTopicModal() {
    setModalTopic(null)
  }

  function backToList() {
    setMode('list')
    setSelectedTopic(null)
    setModalTopic(null)
    setForm(emptyTopic)
    loadData({ keepMessage: true })
  }

  function goPrevious() {
    if (viewMode === 'month') setCalendarDate((current) => addMonths(current, -1))
    if (viewMode === 'week') setCalendarDate((current) => addDays(current, -7))
    if (viewMode === 'year') setCalendarDate((current) => addYears(current, -1))
  }

  function goNext() {
    if (viewMode === 'month') setCalendarDate((current) => addMonths(current, 1))
    if (viewMode === 'week') setCalendarDate((current) => addDays(current, 7))
    if (viewMode === 'year') setCalendarDate((current) => addYears(current, 1))
  }

  function goToday() {
    setCalendarDate(new Date())
  }

  async function saveTopic(event) {
    event.preventDefault()
    setMessage('')

    if (mode === 'create' && !allowCreate) {
      setMessage('Tu rol no tiene permiso para crear temas.')
      return
    }

    if (mode === 'edit' && !allowEdit) {
      setMessage('Tu rol no tiene permiso para editar temas.')
      return
    }

    if (!form.title.trim()) {
      setMessage('Escribe el título del tema.')
      return
    }

    if (!form.suggested_date) {
      setMessage('Selecciona una fecha sugerida.')
      return
    }

    if (!isAdmin && !form.cell_id) {
      setMessage('Como líder, selecciona una célula. Los temas generales solo los puede crear un administrador.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: form.cell_id || null,
      title: form.title.trim(),
      bible_passage: form.bible_passage.trim() || null,
      objective: form.objective.trim() || null,
      summary: form.summary.trim() || null,
      activity: form.activity.trim() || null,
      materials_needed: form.materials_needed.trim() || null,
      notes: form.notes.trim() || null,
      suggested_date: form.suggested_date,
      status: form.status || 'programado',
      completed_at: form.status === 'visto' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }

    const response =
      mode === 'edit' && selectedTopic?.id
        ? await supabase
            .from('cell_topics')
            .update(payload)
            .eq('id', selectedTopic.id)
            .select()
            .single()
        : await supabase
            .from('cell_topics')
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

    setMessage(mode === 'edit' ? 'Tema actualizado correctamente.' : 'Tema creado correctamente.')
    setMode('list')
    setSelectedTopic(null)
    setForm(emptyTopic)
    loadData({ keepMessage: true })
  }

  async function markAsCompleted(topic) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para marcar temas como vistos.')
      return
    }

    const { error } = await supabase
      .from('cell_topics')
      .update({
        status: 'visto',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', topic.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Tema marcado como visto.')
    setModalTopic(null)
    loadData({ keepMessage: true })
  }

  async function postponeTopic(topic) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para posponer temas.')
      return
    }

    const { error } = await supabase
      .from('cell_topics')
      .update({
        status: 'pospuesto',
        updated_at: new Date().toISOString()
      })
      .eq('id', topic.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Tema marcado como pospuesto.')
    setModalTopic(null)
    loadData({ keepMessage: true })
  }

  async function deleteTopic(topic) {
    if (!allowDelete) {
      setMessage('Tu rol no tiene permiso para eliminar temas.')
      return
    }

    const confirmation = window.confirm('¿Eliminar este tema del calendario?')

    if (!confirmation) return

    const { error } = await supabase
      .from('cell_topics')
      .delete()
      .eq('id', topic.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Tema eliminado correctamente.')
    setModalTopic(null)
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <TopicForm
        mode={mode}
        form={form}
        setForm={setForm}
        cells={cells}
        saving={saving}
        message={message}
        onSubmit={saveTopic}
        onBack={backToList}
        isAdmin={isAdmin}
      />
    )
  }

  return (
    <main className="space-y-6">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Planeación espiritual</p>
            <h2>Calendario de temas</h2>
            <p className="muted mt-3 max-w-3xl">
              Programa temas, pasajes, actividades y materiales. Cambia entre vista de tarjetas, mes, semana o año.
            </p>
          </div>

          {allowCreate && (
            <button className="primary-button" onClick={startCreate}>
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nuevo tema
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon="event_note" label="Total temas" value={summary.total} tone="blue" />
        <StatCard icon="calendar_month" label="Programados" value={summary.programmed} tone="gold" />
        <StatCard icon="check_circle" label="Vistos" value={summary.completed} tone="green" />
        <StatCard icon="event_repeat" label="Pospuestos" value={summary.postponed} tone="red" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Vista</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              {getRangeTitle(viewMode, calendarDate)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Elige cómo quieres visualizar los temas programados.
            </p>
          </div>

          <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {viewMode !== 'cards' && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={goPrevious}>
                <span className="material-symbols-rounded text-lg">chevron_left</span>
                Anterior
              </SecondaryButton>

              <SecondaryButton type="button" onClick={goToday}>
                Hoy
              </SecondaryButton>

              <SecondaryButton type="button" onClick={goNext}>
                Siguiente
                <span className="material-symbols-rounded text-lg">chevron_right</span>
              </SecondaryButton>
            </div>

            <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">
              {filteredTopics.length} tema(s) en filtros actuales
            </Badge>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, Hechos, discipulado..."
            />
          </Field>

          <Field label="Asignación">
            <Select value={cellFilter} onChange={(event) => setCellFilter(event.target.value)}>
              <option value="todas">Todas</option>
              <option value="general">General</option>
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
              {topicStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha exacta">
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
        {loading ? (
          <p className="font-semibold text-slate-500">Cargando temas...</p>
        ) : filteredTopics.length === 0 ? (
          <EmptyState
            icon="calendar_month"
            title="Todavía no hay temas programados"
            description="Cuando registres el primer tema, aparecerá aquí."
          />
        ) : (
          <>
            {viewMode === 'cards' && (
              <CardsView
                topics={filteredTopics}
                cellsById={cellsById}
                onOpen={openTopicModal}
                onEdit={startEdit}
                onComplete={markAsCompleted}
                onDelete={deleteTopic}
                allowEdit={allowEdit}
                allowDelete={allowDelete}
              />
            )}

            {viewMode === 'month' && (
              <MonthCalendarView
                calendarDate={calendarDate}
                topicsByDate={topicsByDate}
                cellsById={cellsById}
                onOpen={openTopicModal}
              />
            )}

            {viewMode === 'week' && (
              <WeekCalendarView
                calendarDate={calendarDate}
                topicsByDate={topicsByDate}
                cellsById={cellsById}
                onOpen={openTopicModal}
              />
            )}

            {viewMode === 'year' && (
              <YearCalendarView
                calendarDate={calendarDate}
                topics={filteredTopics}
                cellsById={cellsById}
                onOpen={openTopicModal}
                onSelectMonth={(monthIndex) => {
                  setCalendarDate(new Date(calendarDate.getFullYear(), monthIndex, 1))
                  setViewMode('month')
                }}
              />
            )}
          </>
        )}
      </Card>

      {modalTopic && (
        <TopicModal
          topic={modalTopic}
          cell={modalTopic.cells || cellsById[modalTopic.cell_id]}
          allowEdit={allowEdit}
          allowDelete={allowDelete}
          onClose={closeTopicModal}
          onEdit={startEdit}
          onComplete={markAsCompleted}
          onPostpone={postponeTopic}
          onDelete={deleteTopic}
        />
      )}
    </main>
  )
}

function ViewSwitcher({ viewMode, setViewMode }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
      {topicViewModes.map((view) => {
        const active = viewMode === view.id

        return (
          <button
            key={view.id}
            type="button"
            onClick={() => setViewMode(view.id)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition ${
              active
                ? 'bg-[#003B5C] text-white shadow-sm'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            <span className="material-symbols-rounded text-lg">{view.icon}</span>
            {view.label}
          </button>
        )
      })}
    </div>
  )
}

function TopicCompactCard({ topic, cell, onOpen, small = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className={`w-full rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
        small ? 'p-2' : 'p-3'
      } ${getCompactCardClass(topic.status)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <strong className={`${small ? 'text-xs' : 'text-sm'} line-clamp-2`}>
          {topic.title}
        </strong>
        <span className="material-symbols-rounded text-base opacity-70">open_in_new</span>
      </div>

      <p className={`${small ? 'mt-1 text-[11px]' : 'mt-2 text-xs'} font-semibold opacity-75`}>
        {cell?.name || 'General'}
      </p>
    </button>
  )
}

function CardsView({ topics, cellsById, onOpen, onEdit, onComplete, onDelete, allowEdit, allowDelete }) {
  return (
    <div>
      <div className="mb-5">
        <p className="eyebrow">Tarjetas</p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          Temas programados
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          {topics.length} registro(s) encontrados.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {topics.map((topic) => {
          const cell = topic.cells || cellsById[topic.cell_id]

          return (
            <article
              key={topic.id}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-slate-900">
                    {topic.title}
                  </h4>
                  <p className="text-sm font-semibold text-slate-500">
                    {formatDate(topic.suggested_date)} · {cell?.name || 'General'}
                  </p>
                </div>

                <Badge className={getStatusBadge(topic.status)}>
                  {getStatusLabel(topic.status)}
                </Badge>
              </div>

              <p className="text-sm font-semibold text-slate-700">
                <strong>Pasaje:</strong> {topic.bible_passage || 'No registrado'}
              </p>

              <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-500">
                {topic.objective || topic.summary || 'Sin descripción registrada.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryButton onClick={() => onOpen(topic)}>
                  Ver
                </PrimaryButton>

                {allowEdit && (
                  <>
                    <SecondaryButton onClick={() => onEdit(topic)}>
                      Editar
                    </SecondaryButton>

                    {topic.status !== 'visto' && (
                      <SecondaryButton onClick={() => onComplete(topic)}>
                        Visto
                      </SecondaryButton>
                    )}
                  </>
                )}

                {allowDelete && (
                  <DangerButton onClick={() => onDelete(topic)}>
                    Eliminar
                  </DangerButton>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}

function MonthCalendarView({ calendarDate, topicsByDate, cellsById, onOpen }) {
  const days = getMonthGridDays(calendarDate)
  const currentMonth = calendarDate.getMonth()

  return (
    <div>
      <div className="mb-4 grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="rounded-2xl bg-slate-100 px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dateKey = toDateKey(day)
          const dayTopics = topicsByDate[dateKey] || []
          const isCurrentMonth = day.getMonth() === currentMonth
          const isToday = dateKey === toDateKey(new Date())

          return (
            <div
              key={dateKey}
              className={`min-h-36 rounded-2xl border p-3 ${
                isCurrentMonth
                  ? 'border-slate-200 bg-white'
                  : 'border-slate-100 bg-slate-50/70 opacity-60'
              } ${isToday ? 'ring-4 ring-cyan-100' : ''}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={`text-sm font-black ${isToday ? 'text-[#003B5C]' : 'text-slate-700'}`}>
                  {day.getDate()}
                </span>

                {dayTopics.length > 0 && (
                  <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                    {dayTopics.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {dayTopics.slice(0, 3).map((topic) => (
                  <TopicCompactCard
                    key={topic.id}
                    topic={topic}
                    cell={topic.cells || cellsById[topic.cell_id]}
                    onOpen={onOpen}
                    small
                  />
                ))}

                {dayTopics.length > 3 && (
                  <p className="text-xs font-black text-slate-400">
                    + {dayTopics.length - 3} más
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekCalendarView({ calendarDate, topicsByDate, cellsById, onOpen }) {
  const days = getWeekGridDays(calendarDate)

  return (
    <div className="grid gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dateKey = toDateKey(day)
        const dayTopics = topicsByDate[dateKey] || []
        const isToday = dateKey === toDateKey(new Date())

        return (
          <div
            key={dateKey}
            className={`rounded-3xl border bg-white p-4 ${
              isToday ? 'border-cyan-300 ring-4 ring-cyan-100' : 'border-slate-200'
            }`}
          >
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                {weekDays[(day.getDay() + 6) % 7]}
              </p>
              <h4 className="mt-1 text-xl font-black text-slate-900">
                {day.getDate()}
              </h4>
              <p className="text-xs font-semibold text-slate-500">
                {monthNames[day.getMonth()]}
              </p>
            </div>

            {dayTopics.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
                Sin temas
              </p>
            ) : (
              <div className="space-y-2">
                {dayTopics.map((topic) => (
                  <TopicCompactCard
                    key={topic.id}
                    topic={topic}
                    cell={topic.cells || cellsById[topic.cell_id]}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function YearCalendarView({ calendarDate, topics, cellsById, onOpen, onSelectMonth }) {
  const year = calendarDate.getFullYear()

  const topicsByMonth = useMemo(() => {
    return topics.reduce((acc, topic) => {
      const date = parseTopicDate(topic.suggested_date)
      if (date.getFullYear() !== year) return acc

      const month = date.getMonth()
      if (!acc[month]) acc[month] = []
      acc[month].push(topic)
      return acc
    }, {})
  }, [topics, year])

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {monthNames.map((month, index) => {
        const monthTopics = topicsByMonth[index] || []

        return (
          <article
            key={month}
            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onSelectMonth(index)}
              className="mb-4 flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-cyan-50"
            >
              <div>
                <h4 className="text-lg font-black text-slate-900">{month}</h4>
                <p className="text-xs font-semibold text-slate-500">
                  {monthTopics.length} tema(s)
                </p>
              </div>

              <span className="material-symbols-rounded text-[#003B5C]">
                calendar_month
              </span>
            </button>

            {monthTopics.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-400">
                Sin temas
              </p>
            ) : (
              <div className="space-y-2">
                {monthTopics.slice(0, 4).map((topic) => (
                  <TopicCompactCard
                    key={topic.id}
                    topic={topic}
                    cell={topic.cells || cellsById[topic.cell_id]}
                    onOpen={onOpen}
                    small
                  />
                ))}

                {monthTopics.length > 4 && (
                  <button
                    type="button"
                    onClick={() => onSelectMonth(index)}
                    className="w-full rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-200"
                  >
                    Ver {monthTopics.length - 4} tema(s) más
                  </button>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function TopicModal({ topic, cell, allowEdit, allowDelete, onClose, onEdit, onComplete, onPostpone, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section className="modal-scroll-hidden max-h-[92vh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-4xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Tema del calendario</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
              {topic.title}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {formatDate(topic.suggested_date)} · {cell?.name || 'Tema general'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Cerrar"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <Badge className={getStatusBadge(topic.status)}>
            {getStatusLabel(topic.status)}
          </Badge>

          <Badge className="border-cyan-200 bg-cyan-50 text-cyan-700">
            {cell?.name || 'General'}
          </Badge>

          {topic.bible_passage && (
            <Badge className="border-amber-200 bg-amber-50 text-amber-700">
              {topic.bible_passage}
            </Badge>
          )}
        </div>

        <div className="grid gap-4">
          <TopicBlock title="Pasaje bíblico" value={topic.bible_passage} />
          <TopicBlock title="Objetivo" value={topic.objective} />
          <TopicBlock title="Resumen del tema" value={topic.summary} />
          <TopicBlock title="Actividad sugerida" value={topic.activity} />
          <TopicBlock title="Materiales necesarios" value={topic.materials_needed} />
          <TopicBlock title="Notas" value={topic.notes} />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
          <SecondaryButton type="button" onClick={onClose}>
            Cerrar
          </SecondaryButton>

          {allowEdit && (
            <>
              <PrimaryButton type="button" onClick={() => onEdit(topic)}>
                <span className="material-symbols-rounded text-lg">edit</span>
                Editar
              </PrimaryButton>

              {topic.status !== 'visto' && (
                <SecondaryButton type="button" onClick={() => onComplete(topic)}>
                  <span className="material-symbols-rounded text-lg">check_circle</span>
                  Marcar visto
                </SecondaryButton>
              )}

              {topic.status !== 'pospuesto' && (
                <SecondaryButton type="button" onClick={() => onPostpone(topic)}>
                  <span className="material-symbols-rounded text-lg">event_repeat</span>
                  Posponer
                </SecondaryButton>
              )}
            </>
          )}

          {allowDelete && (
            <DangerButton type="button" onClick={() => onDelete(topic)}>
              <span className="material-symbols-rounded text-lg">delete</span>
              Eliminar
            </DangerButton>
          )}
        </div>
      </section>
    </div>
  )
}

function TopicForm({ mode, form, setForm, cells, saving, message, onSubmit, onBack, isAdmin }) {
  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar tema' : 'Nuevo tema'}</p>
        <h2>{mode === 'edit' ? 'Editar tema del calendario' : 'Crear tema del calendario'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Puedes crear un tema general para todas las células o asignarlo a una célula específica.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Asignar a célula">
            <Select
              value={form.cell_id}
              onChange={(event) => setForm({ ...form, cell_id: event.target.value })}
            >
              <option value="">Tema general</option>
              {cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name} {cell.zone ? `· ${cell.zone}` : ''}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha sugerida">
            <Input
              type="date"
              value={form.suggested_date}
              onChange={(event) => setForm({ ...form, suggested_date: event.target.value })}
              required
            />
          </Field>

          <Field label="Título del tema">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
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

          <Field label="Estado">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {topicStatuses.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>

          {!isAdmin && !form.cell_id && (
            <div className="md:col-span-2">
              <Notice>
                Como líder, selecciona una célula para crear un tema específico. Los temas generales solo los puede crear un administrador.
              </Notice>
            </div>
          )}

          <div className="md:col-span-2">
            <Field label="Objetivo">
              <Textarea
                value={form.objective}
                onChange={(event) => setForm({ ...form, objective: event.target.value })}
                placeholder="¿Qué se espera que las personas comprendan o apliquen?"
              />
            </Field>
          </div>

          <Field label="Resumen del tema">
            <Textarea
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              placeholder="Breve explicación del tema."
            />
          </Field>

          <Field label="Actividad sugerida">
            <Textarea
              value={form.activity}
              onChange={(event) => setForm({ ...form, activity: event.target.value })}
              placeholder="Dinámica, preguntas, rompehielo o aplicación."
            />
          </Field>

          <Field label="Materiales necesarios">
            <Textarea
              value={form.materials_needed}
              onChange={(event) => setForm({ ...form, materials_needed: event.target.value })}
              placeholder="Biblias, hojas, guía, proyector, etc."
            />
          </Field>

          <Field label="Notas">
            <Textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Comentarios adicionales."
            />
          </Field>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <PrimaryButton disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar tema'}
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

function TopicBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}
