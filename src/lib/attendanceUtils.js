export const attendanceSessionStatuses = [
  'borrador',
  'registrada',
  'cerrada',
  'archivada'
]

export const attendanceStatuses = [
  'presente',
  'ausente',
  'justificado'
]

export const personTypes = [
  'miembro',
  'visitante',
  'nuevo creyente'
]

export const emptyAttendanceSession = {
  cell_id: '',
  meeting_date: new Date().toISOString().slice(0, 10),
  topic: '',
  bible_passage: '',
  notes: '',
  status: 'borrador'
}

export function getAttendanceSessionStatusLabel(status) {
  if (status === 'borrador') return 'Borrador'
  if (status === 'registrada') return 'Registrada'
  if (status === 'cerrada') return 'Cerrada'
  if (status === 'archivada') return 'Archivada'
  return status || 'Sin estado'
}

export function getAttendanceSessionStatusBadge(status) {
  if (status === 'registrada') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'cerrada') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (status === 'archivada') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export function getAttendanceStatusLabel(status) {
  if (status === 'presente') return 'Presente'
  if (status === 'ausente') return 'Ausente'
  if (status === 'justificado') return 'Justificado'
  return status || 'Sin estado'
}

export function getAttendanceStatusBadge(status) {
  if (status === 'presente') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'justificado') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function getFamilyAttendanceStatus(record) {
  const total = Number(record?.family_total || 0)
  const attended = Number(record?.attended_count || 0)

  if (attended <= 0) return 'ausente'
  if (total > 0 && attended >= total) return 'completa'
  return 'incompleta'
}

export function getFamilyAttendanceLabel(record) {
  const status = getFamilyAttendanceStatus(record)

  if (status === 'completa') return 'Familia completa'
  if (status === 'incompleta') return 'Familia incompleta'
  return 'Familia ausente'
}

export function getFamilyAttendanceBadge(record) {
  const status = getFamilyAttendanceStatus(record)

  if (status === 'completa') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'incompleta') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-red-200 bg-red-50 text-red-700'
}

export function calculateAttendanceSummary(records = []) {
  return records.reduce(
    (acc, record) => {
      const isFamily = record.record_type === 'familia' || Boolean(record.family_id)

      if (isFamily) {
        const total = Number(record.family_total || 0)
        const attended = Number(record.attended_count || 0)

        acc.expected += total
        acc.present += attended
        acc.absent += Math.max(total - attended, 0)
        acc.families += 1

        if (attended <= 0) acc.absentFamilies += 1
        else if (total > 0 && attended >= total) acc.completeFamilies += 1
        else acc.incompleteFamilies += 1

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
      incompleteFamilies: 0,
      absentFamilies: 0
    }
  )
}

export function getAttendancePercentage(records = []) {
  const summary = calculateAttendanceSummary(records)

  if (summary.expected <= 0) return 0

  return Math.round((summary.present / summary.expected) * 100)
}