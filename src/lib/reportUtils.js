export const reportStatuses = [
  'borrador',
  'enviado',
  'revisado',
  'archivado'
]

export const reportMoodOptions = [
  'excelente',
  'buena',
  'regular',
  'requiere atención'
]

export const emptyReport = {
  cell_id: '',
  report_date: new Date().toISOString().slice(0, 10),
  topic: '',
  bible_passage: '',
  meeting_summary: '',
  attendance_notes: '',
  prayer_requests: '',
  decisions: '',
  challenges: '',
  next_steps: '',
  leader_comments: '',
  status: 'borrador',
  mood: 'buena'
}

export function getReportStatusLabel(status) {
  if (status === 'borrador') return 'Borrador'
  if (status === 'enviado') return 'Enviado'
  if (status === 'revisado') return 'Revisado'
  if (status === 'archivado') return 'Archivado'
  return status || 'Sin estado'
}

export function getReportStatusBadge(status) {
  if (status === 'revisado') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'enviado') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (status === 'archivado') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export function getReportMoodLabel(mood) {
  if (mood === 'excelente') return 'Excelente'
  if (mood === 'buena') return 'Buena'
  if (mood === 'regular') return 'Regular'
  if (mood === 'requiere atención') return 'Requiere atención'
  return mood || 'Sin evaluación'
}

export function getReportMoodBadge(mood) {
  if (mood === 'excelente') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (mood === 'buena') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (mood === 'regular') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function getReportStatusIcon(status) {
  if (status === 'revisado') return 'verified'
  if (status === 'enviado') return 'send'
  if (status === 'archivado') return 'archive'
  return 'draft'
}