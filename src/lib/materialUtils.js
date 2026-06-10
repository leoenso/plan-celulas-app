export const bucketName = 'cell-materials'

export const sourceTypes = [
  { id: 'upload', label: 'Subir archivo', icon: 'upload_file' },
  { id: 'drive', label: 'Google Drive', icon: 'add_to_drive' },
  { id: 'link', label: 'Link externo', icon: 'link' }
]

export const materialTypes = [
  'archivo',
  'guía',
  'pdf',
  'video',
  'enlace',
  'imagen',
  'documento',
  'presentación',
  'actividad',
  'otro'
]

export const materialCategories = [
  'enseñanza',
  'discipulado',
  'oración',
  'evangelismo',
  'jóvenes',
  'niños',
  'familias',
  'capacitación',
  'otro'
]

export const materialAudiences = [
  'líderes',
  'todo el grupo pequeño',
  'jóvenes',
  'niños',
  'familias',
  'administradores'
]

export const materialStatuses = ['activo', 'archivado']

export const emptyMaterial = {
  cell_id: '',
  topic_id: '',
  title: '',
  material_type: 'archivo',
  category: 'enseñanza',
  description: '',
  source_type: 'upload',
  url: '',
  drive_url: '',
  author: '',
  audience: 'líderes',
  status: 'activo',
  notes: ''
}

export function getSourceType(material) {
  if (material?.source_type) return material.source_type
  if (material?.storage_path) return 'upload'
  if (material?.drive_url) return 'drive'
  if (material?.url) return 'link'
  return 'upload'
}

export function getTypeIcon(type) {
  if (type === 'guía') return 'menu_book'
  if (type === 'pdf') return 'picture_as_pdf'
  if (type === 'video') return 'play_circle'
  if (type === 'enlace') return 'link'
  if (type === 'imagen') return 'image'
  if (type === 'documento') return 'description'
  if (type === 'presentación') return 'slideshow'
  if (type === 'actividad') return 'extension'
  return 'folder_open'
}

export function getStatusBadge(status) {
  if (status === 'activo') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-slate-200 bg-slate-100 text-slate-700'
}

export function getCategoryBadge(category) {
  if (category === 'enseñanza') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (category === 'discipulado') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (category === 'oración') return 'border-violet-200 bg-violet-50 text-violet-700'
  if (category === 'evangelismo') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (category === 'jóvenes') return 'border-pink-200 bg-pink-50 text-pink-700'
  if (category === 'niños') return 'border-orange-200 bg-orange-50 text-orange-700'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

export function getDriveEmbedUrl(url) {
  const value = String(url || '').trim()

  if (!value) return ''

  const fileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`

  const openMatch = value.match(/[?&]id=([^&]+)/)
  if (value.includes('drive.google.com/open') && openMatch?.[1]) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`
  }

  const documentMatch = value.match(/docs\.google\.com\/document\/d\/([^/]+)/)
  if (documentMatch?.[1]) return `https://docs.google.com/document/d/${documentMatch[1]}/preview`

  const presentationMatch = value.match(/docs\.google\.com\/presentation\/d\/([^/]+)/)
  if (presentationMatch?.[1]) return `https://docs.google.com/presentation/d/${presentationMatch[1]}/preview`

  const spreadsheetMatch = value.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (spreadsheetMatch?.[1]) return `https://docs.google.com/spreadsheets/d/${spreadsheetMatch[1]}/preview`

  return value
}

export function getYouTubeEmbedUrl(url) {
  const value = String(url || '').trim()

  if (!value) return ''

  const watchMatch = value.match(/youtube\.com\/watch\?v=([^&]+)/)
  if (watchMatch?.[1]) return `https://www.youtube.com/embed/${watchMatch[1]}`

  const shortMatch = value.match(/youtu\.be\/([^?]+)/)
  if (shortMatch?.[1]) return `https://www.youtube.com/embed/${shortMatch[1]}`

  const embedMatch = value.match(/youtube\.com\/embed\/([^?]+)/)
  if (embedMatch?.[1]) return value

  return ''
}