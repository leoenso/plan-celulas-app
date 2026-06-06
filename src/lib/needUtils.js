export const needCategories = [
  'oración',
  'salud',
  'visita pastoral',
  'apoyo material',
  'discipulado',
  'consejería',
  'conflicto / restauración',
  'otro'
]

export const needPriorities = ['baja', 'media', 'alta', 'urgente']

export const needStatuses = [
  'pendiente',
  'en seguimiento',
  'resuelta',
  'archivada'
]

export const emptyNeed = {
  cell_id: '',
  family_id: '',
  member_id: '',
  family_person_name: '',
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

export function getNeedStatusLabel(status) {
  if (status === 'pendiente') return 'Pendiente'
  if (status === 'en seguimiento') return 'En seguimiento'
  if (status === 'resuelta') return 'Resuelta'
  if (status === 'archivada') return 'Archivada'
  return status || 'Sin estado'
}

export function getNeedPriorityLabel(priority) {
  if (priority === 'baja') return 'Baja'
  if (priority === 'media') return 'Media'
  if (priority === 'alta') return 'Alta'
  if (priority === 'urgente') return 'Urgente'
  return priority || 'Sin prioridad'
}

export function getNeedStatusBadge(status) {
  if (status === 'resuelta') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (status === 'en seguimiento') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (status === 'archivada') return 'border-slate-200 bg-slate-100 text-slate-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export function getNeedPriorityBadge(priority) {
  if (priority === 'urgente') return 'border-red-200 bg-red-50 text-red-700'
  if (priority === 'alta') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (priority === 'media') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export function getNeedCategoryIcon(category) {
  if (category === 'oración') return 'folded_hands'
  if (category === 'salud') return 'health_and_safety'
  if (category === 'visita pastoral') return 'diversity_1'
  if (category === 'apoyo material') return 'volunteer_activism'
  if (category === 'discipulado') return 'menu_book'
  if (category === 'consejería') return 'support_agent'
  if (category === 'conflicto / restauración') return 'handshake'
  return 'more_horiz'
}

export function getNeedRelationLabel({ family, member, familyPersonName }) {
  if (family && familyPersonName) {
    return `Familia ${family.family_name} · ${familyPersonName}`
  }

  if (family) {
    return `Familia ${family.family_name} · Toda la familia`
  }

  if (member) {
    return member.full_name
  }

  return 'Necesidad general de la célula'
}