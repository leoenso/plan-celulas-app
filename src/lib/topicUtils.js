export const topicStatuses = ['programado', 'visto', 'pospuesto', 'cancelado']

export const topicViewModes = [
  { id: 'cards', label: 'Tarjetas', icon: 'view_agenda' },
  { id: 'month', label: 'Mes', icon: 'calendar_month' },
  { id: 'week', label: 'Semana', icon: 'view_week' },
  { id: 'year', label: 'Año', icon: 'calendar_view_month' }
]

export const emptyTopic = {
  cell_id: '',
  title: '',
  bible_passage: '',
  objective: '',
  summary: '',
  activity: '',
  materials_needed: '',
  notes: '',
  suggested_date: new Date().toISOString().slice(0, 10),
  status: 'programado'
}

export const monthNames = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]

export const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function getStatusLabel(status) {
  if (status === 'programado') return 'Programado'
  if (status === 'visto') return 'Visto'
  if (status === 'pospuesto') return 'Pospuesto'
  if (status === 'cancelado') return 'Cancelado'
  return status || 'Sin estado'
}

export function getStatusBadge(status) {
  if (status === 'visto') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'programado') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (status === 'pospuesto') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function parseTopicDate(value) {
  if (!value) return new Date()

  const [year, month, day] = String(value).split('-').map(Number)

  return new Date(year, month - 1, day)
}

export function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function startOfWeek(date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)

  return result
}

export function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function addMonths(date, amount) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + amount)
  return result
}

export function addYears(date, amount) {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + amount)
  return result
}

export function getMonthGridDays(date) {
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstDay = new Date(year, month, 1)
  const start = startOfWeek(firstDay)

  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export function getWeekGridDays(date) {
  const start = startOfWeek(date)

  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export function formatLongDate(value) {
  const date = typeof value === 'string' ? parseTopicDate(value) : value

  return `${date.getDate()} de ${monthNames[date.getMonth()]} de ${date.getFullYear()}`
}

export function getRangeTitle(viewMode, calendarDate) {
  if (viewMode === 'month') {
    return `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`
  }

  if (viewMode === 'week') {
    const days = getWeekGridDays(calendarDate)
    return `${formatLongDate(days[0])} - ${formatLongDate(days[6])}`
  }

  if (viewMode === 'year') {
    return `${calendarDate.getFullYear()}`
  }

  return 'Vista de tarjetas'
}

export function getCompactCardClass(status) {
  if (status === 'visto') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (status === 'pospuesto') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (status === 'cancelado') return 'border-red-200 bg-red-50 text-red-800'
  return 'border-cyan-200 bg-cyan-50 text-cyan-800'
}