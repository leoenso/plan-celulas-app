export const roleLabels = {
  admin: 'Administrador',
  leader: 'Líder',
  auxiliar: 'Auxiliar',
  viewer: 'Solo lectura'
}

export const views = {
  dashboard: {
    label: 'Dashboard',
    icon: 'dashboard',
    description: 'Resumen general',
    roles: ['admin', 'leader', 'auxiliar', 'viewer']
  },
  cells: {
    label: 'Grupos pequeños',
    icon: 'groups',
    description: 'Familias y grupos',
    roles: ['admin', 'leader']
  },
  attendance: {
    label: 'Asistencia',
    icon: 'fact_check',
    description: 'Registro semanal',
    roles: ['admin', 'leader', 'auxiliar']
  },
  reports: {
    label: 'Informes',
    icon: 'assignment',
    description: 'Reportes de líderes',
    roles: ['admin', 'leader', 'auxiliar']
  },
  needs: {
    label: 'Necesidades',
    icon: 'volunteer_activism',
    description: 'Seguimiento pastoral',
    roles: ['admin', 'leader', 'auxiliar']
  },
  topics: {
    label: 'Calendario',
    icon: 'calendar_month',
    description: 'Temas y fechas',
    roles: ['admin', 'leader', 'auxiliar', 'viewer']
  },
  materials: {
    label: 'Materiales',
    icon: 'folder_open',
    description: 'Recursos y guías',
    roles: ['admin', 'leader', 'auxiliar', 'viewer']
  },
  users: {
    label: 'Usuarios',
    icon: 'admin_panel_settings',
    description: 'Roles y permisos',
    roles: ['admin']
  }
}

const actionPermissions = {
  admin: {
    create: ['cells', 'attendance', 'reports', 'needs', 'topics', 'materials', 'users'],
    edit: ['cells', 'attendance', 'reports', 'needs', 'topics', 'materials', 'users'],
    delete: ['cells', 'attendance', 'reports', 'needs', 'topics', 'materials', 'users'],
    review: ['reports'],
    assign: ['users', 'cells'],
    upload: ['materials']
  },
  leader: {
    create: ['attendance', 'reports', 'needs', 'topics', 'materials'],
    edit: ['cells', 'attendance', 'reports', 'needs', 'topics', 'materials'],
    delete: [],
    review: [],
    assign: [],
    upload: ['materials']
  },
  auxiliar: {
    create: ['attendance', 'reports', 'needs'],
    edit: ['attendance', 'reports', 'needs'],
    delete: [],
    review: [],
    assign: [],
    upload: []
  },
  viewer: {
    create: [],
    edit: [],
    delete: [],
    review: [],
    assign: [],
    upload: []
  }
}

export function getRoleLabel(role) {
  return roleLabels[role] || 'Usuario'
}

export function canAccessView(role, viewKey) {
  const safeRole = role || 'viewer'
  const view = views[viewKey]

  if (!view) return false

  return view.roles.includes(safeRole)
}

export function getAllowedViews(role) {
  const safeRole = role || 'viewer'

  return Object.entries(views)
    .filter(([, view]) => view.roles.includes(safeRole))
    .map(([key, view]) => ({
      key,
      id: key,
      ...view
    }))
}

export function getDefaultViewForRole(role) {
  if (canAccessView(role, 'dashboard')) return 'dashboard'

  const firstAllowedView = getAllowedViews(role)

  return firstAllowedView?.[0]?.key || 'dashboard'
}

export function canPerform(role, action, module) {
  const safeRole = role || 'viewer'
  const permissions = actionPermissions[safeRole]

  if (!permissions) return false

  return permissions[action]?.includes(module) || false
}

export function canCreate(role, module) {
  return canPerform(role, 'create', module)
}

export function canEdit(role, module) {
  return canPerform(role, 'edit', module)
}

export function canDelete(role, module) {
  return canPerform(role, 'delete', module)
}

export function canReview(role, module) {
  return canPerform(role, 'review', module)
}

export function canAssign(role, module) {
  return canPerform(role, 'assign', module)
}

export function canUpload(role, module) {
  return canPerform(role, 'upload', module)
}

export function isAdmin(role) {
  return role === 'admin'
}

export function isLeader(role) {
  return role === 'leader'
}

export function isAuxiliar(role) {
  return role === 'auxiliar'
}

export function isViewer(role) {
  return role === 'viewer'
}

export function isReadOnly(role) {
  return role === 'viewer'
}