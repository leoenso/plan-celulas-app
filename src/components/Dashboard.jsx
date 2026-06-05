import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parseDate(value) {
  if (!value) return new Date()

  if (String(value).includes('T')) {
    return new Date(value)
  }

  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDate(value) {
  if (!value) return 'Sin fecha'

  const date = String(value).includes('T') ? new Date(value) : parseDate(value)

  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function startOfWeek(date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day

  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)

  return result
}

function endOfWeek(date) {
  const start = startOfWeek(date)
  const end = addDays(start, 6)

  end.setHours(23, 59, 59, 999)

  return end
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function startOfYear(date) {
  return new Date(date.getFullYear(), 0, 1)
}

function endOfYear(date) {
  return new Date(date.getFullYear(), 11, 31)
}

function dateInRange(value, startDate, endDate) {
  if (!value || !startDate || !endDate) return false

  const date = parseDate(value)
  const start = parseDate(startDate)
  const end = parseDate(endDate)

  date.setHours(12, 0, 0, 0)
  start.setHours(0, 0, 0, 0)
  end.setHours(23, 59, 59, 999)

  return date >= start && date <= end
}

function getAttendanceCounts(records = []) {
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
      families: 0
    }
  )
}

function getRoleLabel(role) {
  if (role === 'admin') return 'Administrador'
  if (role === 'leader') return 'Líder'
  if (role === 'auxiliar') return 'Auxiliar'
  if (role === 'viewer') return 'Solo lectura'
  return 'Usuario'
}

function getNeedPriorityBadge(priority) {
  if (priority === 'urgente') return 'border-red-200 bg-red-50 text-red-700'
  if (priority === 'alta') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (priority === 'media') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function getStatusBadge(status) {
  if (
    status === 'revisado' ||
    status === 'visto' ||
    status === 'resuelta' ||
    status === 'activo'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (status === 'enviado' || status === 'programado') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  }

  if (
    status === 'pendiente' ||
    status === 'borrador' ||
    status === 'pospuesto' ||
    status === 'en seguimiento'
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-slate-200 bg-slate-100 text-slate-700'
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
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black capitalize ${className}`}>
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

function StatCard({ icon, label, value, helper, tone = 'blue', onClick }) {
  const tones = {
    blue: 'from-sky-50 to-cyan-50 text-sky-900 border-sky-100',
    green: 'from-emerald-50 to-lime-50 text-emerald-900 border-emerald-100',
    gold: 'from-amber-50 to-yellow-50 text-amber-900 border-amber-100',
    red: 'from-red-50 to-rose-50 text-red-900 border-red-100',
    violet: 'from-violet-50 to-purple-50 text-violet-900 border-violet-100'
  }

  const Tag = onClick ? 'button' : 'article'

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full rounded-[28px] border bg-linear-to-br p-5 text-left shadow-sm transition ${tones[tone]} ${onClick ? 'hover:-translate-y-1 hover:shadow-md' : ''}`}
    >
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
    </Tag>
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
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
        {description}
      </p>
    </div>
  )
}

export default function Dashboard({
  profile,
  user,
  setCurrentPage,
  setActivePage,
  setCurrentView,
  setActiveView
}) {
  const today = new Date()

  const [cells, setCells] = useState([])
  const [families, setFamilies] = useState([])
  const [members, setMembers] = useState([])
  const [sessions, setSessions] = useState([])
  const [records, setRecords] = useState([])
  const [reports, setReports] = useState([])
  const [needs, setNeeds] = useState([])
  const [topics, setTopics] = useState([])
  const [materials, setMaterials] = useState([])
  const [profiles, setProfiles] = useState([])
  const [query, setQuery] = useState('')
  const [dashboardView, setDashboardView] = useState('cards')
  const [chartPreset, setChartPreset] = useState('week')
  const [chartStartDate, setChartStartDate] = useState(toDateKey(startOfWeek(today)))
  const [chartEndDate, setChartEndDate] = useState(toDateKey(endOfWeek(today)))
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const setPage =
    setCurrentPage ||
    setActivePage ||
    setCurrentView ||
    setActiveView ||
    (() => {})

  function applyChartPreset(preset) {
    const current = new Date()
    setChartPreset(preset)

    if (preset === 'week') {
      setChartStartDate(toDateKey(startOfWeek(current)))
      setChartEndDate(toDateKey(endOfWeek(current)))
    }

    if (preset === 'month') {
      setChartStartDate(toDateKey(startOfMonth(current)))
      setChartEndDate(toDateKey(endOfMonth(current)))
    }

    if (preset === 'year') {
      setChartStartDate(toDateKey(startOfYear(current)))
      setChartEndDate(toDateKey(endOfYear(current)))
    }
  }

  async function loadDashboard() {
    setLoading(true)
    setMessage('')

    const [
      cellsResponse,
      familiesResponse,
      membersResponse,
      sessionsResponse,
      reportsResponse,
      needsResponse,
      topicsResponse,
      materialsResponse,
      profilesResponse
    ] = await Promise.all([
      supabase
        .from('cells')
        .select('id,name,zone,status,meeting_day,meeting_time,leader_id,host_name,created_at')
        .order('created_at', { ascending: false }),

      supabase
        .from('cell_families')
        .select('id,cell_id,family_name,member_count,active'),

      supabase
        .from('cell_members')
        .select('id,cell_id,full_name,member_type,active'),

      supabase
        .from('attendance_sessions')
        .select('id,cell_id,meeting_date,topic,bible_passage,status,created_at,cells(id,name,zone)')
        .order('meeting_date', { ascending: false })
        .limit(300),

      supabase
        .from('cell_reports')
        .select('id,cell_id,report_date,topic,status,meeting_summary,created_at,cells(id,name,zone)')
        .order('report_date', { ascending: false })
        .limit(300),

      supabase
        .from('cell_needs')
        .select('id,cell_id,title,category,priority,status,due_date,description,created_at,cells(id,name,zone)')
        .order('created_at', { ascending: false })
        .limit(300),

      supabase
        .from('cell_topics')
        .select('id,cell_id,title,bible_passage,suggested_date,status,created_at,cells(id,name,zone)')
        .order('suggested_date', { ascending: true })
        .limit(300),

      supabase
        .from('cell_materials')
        .select('id,cell_id,topic_id,title,material_type,category,source_type,status,created_at,cells(id,name,zone)')
        .order('created_at', { ascending: false })
        .limit(300),

      supabase
        .from('profiles')
        .select('user_id,full_name,email,role,active,created_at')
        .order('created_at', { ascending: false })
    ])

    const responses = [
      cellsResponse,
      familiesResponse,
      membersResponse,
      sessionsResponse,
      reportsResponse,
      needsResponse,
      topicsResponse,
      materialsResponse,
      profilesResponse
    ]

    const firstError = responses.find((response) => response.error)?.error

    if (firstError) {
      setMessage(firstError.message)
    }

    const sessionList = sessionsResponse.data || []

    if (sessionList.length > 0) {
      const sessionIds = sessionList.map((session) => session.id)

      const recordsResponse = await supabase
        .from('attendance_records')
        .select('session_id,record_type,family_id,family_total,attended_count,attendance_status,person_type')
        .in('session_id', sessionIds)

      if (recordsResponse.error) {
        setMessage(recordsResponse.error.message)
        setRecords([])
      } else {
        setRecords(recordsResponse.data || [])
      }
    } else {
      setRecords([])
    }

    setCells(cellsResponse.data || [])
    setFamilies(familiesResponse.data || [])
    setMembers(membersResponse.data || [])
    setSessions(sessionList)
    setReports(reportsResponse.data || [])
    setNeeds(needsResponse.data || [])
    setTopics(topicsResponse.data || [])
    setMaterials(materialsResponse.data || [])
    setProfiles(profilesResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const recordsBySession = useMemo(() => {
    return records.reduce((acc, record) => {
      if (!acc[record.session_id]) acc[record.session_id] = []
      acc[record.session_id].push(record)

      return acc
    }, {})
  }, [records])

  const dashboard = useMemo(() => {
    const activeCells = cells.filter((cell) => cell.status === 'activa')
    const activeFamilies = families.filter((family) => family.active !== false)
    const activeMembers = members.filter((member) => member.active !== false)

    const peopleInFamilies = activeFamilies.reduce((sum, family) => {
      return sum + Number(family.member_count || 0)
    }, 0)

    const estimatedPeople = peopleInFamilies + activeMembers.length
    const attendanceCounts = getAttendanceCounts(records)

    const attendancePercentage =
      attendanceCounts.expected > 0
        ? Math.round((attendanceCounts.present / attendanceCounts.expected) * 100)
        : 0

    const urgentNeeds = needs.filter((need) => {
      return need.priority === 'urgente' && need.status !== 'resuelta' && need.status !== 'archivada'
    })

    const pendingNeeds = needs.filter((need) => {
      return need.status === 'pendiente' || need.status === 'en seguimiento'
    })

    const pendingReports = reports.filter((report) => {
      return report.status === 'borrador' || report.status === 'enviado'
    })

    const currentWeekStart = toDateKey(startOfWeek(new Date()))
    const currentWeekEnd = toDateKey(endOfWeek(new Date()))

    const topicsThisWeek = topics.filter((topic) => {
      return dateInRange(topic.suggested_date, currentWeekStart, currentWeekEnd)
    })

    return {
      activeCells: activeCells.length,
      totalCells: cells.length,
      families: activeFamilies.length,
      estimatedPeople,
      attendanceCounts,
      attendancePercentage,
      urgentNeeds: urgentNeeds.length,
      pendingNeeds: pendingNeeds.length,
      pendingReports: pendingReports.length,
      topicsThisWeek: topicsThisWeek.length,
      materials: materials.length,
      activeUsers: profiles.filter((item) => item.active !== false).length
    }
  }, [cells, families, members, records, needs, reports, topics, materials, profiles])

  const filteredChartData = useMemo(() => {
    const rangeSessions = sessions.filter((session) => {
      return dateInRange(session.meeting_date, chartStartDate, chartEndDate)
    })

    const sessionIds = new Set(rangeSessions.map((session) => session.id))

    const rangeRecords = records.filter((record) => {
      return sessionIds.has(record.session_id)
    })

    const rangeReports = reports.filter((report) => {
      return dateInRange(report.report_date, chartStartDate, chartEndDate)
    })

    const rangeNeeds = needs.filter((need) => {
      return dateInRange(need.created_at, chartStartDate, chartEndDate)
    })

    const rangeTopics = topics.filter((topic) => {
      return dateInRange(topic.suggested_date, chartStartDate, chartEndDate)
    })

    const rangeMaterials = materials.filter((material) => {
      return dateInRange(material.created_at, chartStartDate, chartEndDate)
    })

    return {
      sessions: rangeSessions,
      records: rangeRecords,
      reports: rangeReports,
      needs: rangeNeeds,
      topics: rangeTopics,
      materials: rangeMaterials
    }
  }, [
    sessions,
    records,
    reports,
    needs,
    topics,
    materials,
    chartStartDate,
    chartEndDate
  ])

  const chartData = useMemo(() => {
    const attendance = getAttendanceCounts(filteredChartData.records)

    const attendancePercentage =
      attendance.expected > 0
        ? Math.round((attendance.present / attendance.expected) * 100)
        : 0

    const cellStatusData = [
      {
        label: 'Activas',
        value: cells.filter((cell) => cell.status === 'activa').length
      },
      {
        label: 'En formación',
        value: cells.filter((cell) => cell.status === 'en formación' || cell.status === 'en-formación').length
      },
      {
        label: 'En pausa',
        value: cells.filter((cell) => cell.status === 'en pausa').length
      },
      {
        label: 'Cerradas',
        value: cells.filter((cell) => cell.status === 'cerrada').length
      }
    ]

    const attendanceData = [
      { label: 'Presentes', value: attendance.present },
      { label: 'Faltaron', value: attendance.absent },
      { label: 'Justificados', value: attendance.justified }
    ]

    const needsStatusData = [
      {
        label: 'Pendientes',
        value: filteredChartData.needs.filter((need) => need.status === 'pendiente').length
      },
      {
        label: 'En seguimiento',
        value: filteredChartData.needs.filter((need) => need.status === 'en seguimiento').length
      },
      {
        label: 'Resueltas',
        value: filteredChartData.needs.filter((need) => need.status === 'resuelta').length
      },
      {
        label: 'Archivadas',
        value: filteredChartData.needs.filter((need) => need.status === 'archivada').length
      }
    ]

    const needsPriorityData = [
      {
        label: 'Urgente',
        value: filteredChartData.needs.filter((need) => need.priority === 'urgente' && need.status !== 'resuelta').length
      },
      {
        label: 'Alta',
        value: filteredChartData.needs.filter((need) => need.priority === 'alta' && need.status !== 'resuelta').length
      },
      {
        label: 'Media',
        value: filteredChartData.needs.filter((need) => need.priority === 'media' && need.status !== 'resuelta').length
      },
      {
        label: 'Baja',
        value: filteredChartData.needs.filter((need) => need.priority === 'baja' && need.status !== 'resuelta').length
      }
    ]

    const reportsStatusData = [
      {
        label: 'Borradores',
        value: filteredChartData.reports.filter((report) => report.status === 'borrador').length
      },
      {
        label: 'Enviados',
        value: filteredChartData.reports.filter((report) => report.status === 'enviado').length
      },
      {
        label: 'Revisados',
        value: filteredChartData.reports.filter((report) => report.status === 'revisado').length
      }
    ]

    const topicsStatusData = [
      {
        label: 'Programados',
        value: filteredChartData.topics.filter((topic) => topic.status === 'programado').length
      },
      {
        label: 'Vistos',
        value: filteredChartData.topics.filter((topic) => topic.status === 'visto').length
      },
      {
        label: 'Pospuestos',
        value: filteredChartData.topics.filter((topic) => topic.status === 'pospuesto').length
      },
      {
        label: 'Cancelados',
        value: filteredChartData.topics.filter((topic) => topic.status === 'cancelado').length
      }
    ]

    const materialSourceData = [
      {
        label: 'Subidos',
        value: filteredChartData.materials.filter((material) => material.source_type === 'upload').length
      },
      {
        label: 'Drive',
        value: filteredChartData.materials.filter((material) => material.source_type === 'drive').length
      },
      {
        label: 'Links',
        value: filteredChartData.materials.filter((material) => material.source_type === 'link').length
      }
    ]

    const totalReports = filteredChartData.reports.length
    const reviewedReports = filteredChartData.reports.filter((report) => report.status === 'revisado').length

    const totalNeeds = filteredChartData.needs.length
    const resolvedNeeds = filteredChartData.needs.filter((need) => need.status === 'resuelta').length

    const totalTopics = filteredChartData.topics.length
    const completedTopics = filteredChartData.topics.filter((topic) => topic.status === 'visto').length

    const totalMaterials = filteredChartData.materials.length
    const activeMaterials = filteredChartData.materials.filter((material) => material.status === 'activo').length

    return {
      range: {
        start: chartStartDate,
        end: chartEndDate
      },
      attendance,
      attendancePercentage,
      attendanceData,
      cellStatusData,
      needsStatusData,
      needsPriorityData,
      reportsStatusData,
      topicsStatusData,
      materialSourceData,
      progressData: [
        {
          label: 'Informes revisados',
          value: totalReports > 0 ? Math.round((reviewedReports / totalReports) * 100) : 0
        },
        {
          label: 'Necesidades resueltas',
          value: totalNeeds > 0 ? Math.round((resolvedNeeds / totalNeeds) * 100) : 0
        },
        {
          label: 'Temas vistos',
          value: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0
        },
        {
          label: 'Materiales activos',
          value: totalMaterials > 0 ? Math.round((activeMaterials / totalMaterials) * 100) : 0
        }
      ],
      totals: {
        sessions: filteredChartData.sessions.length,
        reports: filteredChartData.reports.length,
        needs: filteredChartData.needs.length,
        topics: filteredChartData.topics.length,
        materials: filteredChartData.materials.length
      }
    }
  }, [filteredChartData, cells, chartStartDate, chartEndDate])

  const filteredSearchResults = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    if (!normalizedQuery) return []

    const resultCells = cells
      .filter((cell) =>
        normalizeText(`${cell.name} ${cell.zone} ${cell.host_name}`).includes(normalizedQuery)
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        type: 'Célula',
        title: item.name,
        subtitle: item.zone || 'Sin zona',
        page: 'cells',
        icon: 'groups'
      }))

    const resultNeeds = needs
      .filter((need) =>
        normalizeText(`${need.title} ${need.category} ${need.priority} ${need.status} ${need.description}`).includes(normalizedQuery)
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        type: 'Necesidad',
        title: item.title,
        subtitle: `${item.priority} · ${item.status}`,
        page: 'needs',
        icon: 'volunteer_activism'
      }))

    const resultTopics = topics
      .filter((topic) =>
        normalizeText(`${topic.title} ${topic.bible_passage} ${topic.status}`).includes(normalizedQuery)
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        type: 'Tema',
        title: item.title,
        subtitle: `${formatDate(item.suggested_date)} · ${item.status}`,
        page: 'topics',
        icon: 'calendar_month'
      }))

    const resultMaterials = materials
      .filter((material) =>
        normalizeText(`${material.title} ${material.material_type} ${material.category}`).includes(normalizedQuery)
      )
      .slice(0, 4)
      .map((item) => ({
        id: item.id,
        type: 'Material',
        title: item.title,
        subtitle: `${item.material_type} · ${item.category}`,
        page: 'materials',
        icon: 'folder_open'
      }))

    return [...resultCells, ...resultNeeds, ...resultTopics, ...resultMaterials].slice(0, 10)
  }, [query, cells, needs, topics, materials])

  const recentAttendance = sessions.slice(0, 5)

  const urgentNeeds = needs
    .filter((need) => need.priority === 'urgente' && need.status !== 'resuelta' && need.status !== 'archivada')
    .slice(0, 5)

  const pendingReports = reports
    .filter((report) => report.status === 'borrador' || report.status === 'enviado')
    .slice(0, 5)

  const currentWeekStart = toDateKey(startOfWeek(new Date()))
  const currentWeekEnd = toDateKey(endOfWeek(new Date()))

  const upcomingTopics = topics
    .filter((topic) => dateInRange(topic.suggested_date, currentWeekStart, currentWeekEnd))
    .slice(0, 5)

  const recentMaterials = materials.slice(0, 5)

  return (
    <main className="space-y-6">
      <section className="hero-card">
        <div className="row-between wrap">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h2>Bienvenida al Plan de Células</h2>
            <p className="muted mt-3 max-w-3xl">
              Visualiza el estado general del ministerio: células, asistencia, informes,
              necesidades, temas, materiales y usuarios activos.
            </p>
          </div>

          <div className="rounded-3xl border border-white/20 bg-white/10 p-5 text-right backdrop-blur">
            <p className="text-sm font-bold text-white/70">Rol actual</p>
            <strong className="mt-1 block text-xl font-black text-white">
              {getRoleLabel(profile?.role)}
            </strong>
          </div>
        </div>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_auto]">
          <div>
            <p className="eyebrow">Buscador rápido</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Encuentra información en la app
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Busca células, necesidades, temas o materiales.
            </p>
          </div>

          <div className="flex items-end">
            <SecondaryButton onClick={() => loadDashboard()}>
              <span className="material-symbols-rounded text-lg">refresh</span>
              Actualizar
            </SecondaryButton>
          </div>
        </div>

        <div className="mt-5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej. oración, familia, discipulado, material..."
            className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100"
          />
        </div>

        {query && (
          <div className="mt-5">
            {filteredSearchResults.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-400">
                No encontré resultados con esa búsqueda.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredSearchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => setPage(result.page)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-[#EAF4F8]"
                  >
                    <span className="material-symbols-rounded text-[#003B5C]">
                      {result.icon}
                    </span>

                    <div>
                      <Badge className="border-slate-200 bg-white text-slate-600">
                        {result.type}
                      </Badge>
                      <h4 className="mt-2 font-black text-slate-900">{result.title}</h4>
                      <p className="text-sm font-semibold text-slate-500">{result.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Vista del panel</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Resumen visual
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Cambia entre tarjetas rápidas o gráficas de avance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <button
              type="button"
              onClick={() => setDashboardView('cards')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                dashboardView === 'cards'
                  ? 'bg-[#003B5C] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <span className="material-symbols-rounded text-lg">dashboard</span>
              Tarjetas
            </button>

            <button
              type="button"
              onClick={() => setDashboardView('charts')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${
                dashboardView === 'charts'
                  ? 'bg-[#003B5C] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <span className="material-symbols-rounded text-lg">monitoring</span>
              Gráficas
            </button>
          </div>
        </div>
      </Card>

      {dashboardView === 'cards' ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="groups"
              label="Células activas"
              value={dashboard.activeCells}
              helper={`${dashboard.totalCells} registradas`}
              tone="blue"
              onClick={() => setPage('cells')}
            />

            <StatCard
              icon="family_restroom"
              label="Familias"
              value={dashboard.families}
              helper={`${dashboard.estimatedPeople} personas estimadas`}
              tone="green"
              onClick={() => setPage('cells')}
            />

            <StatCard
              icon="fact_check"
              label="Asistencia"
              value={`${dashboard.attendancePercentage}%`}
              helper={`${dashboard.attendanceCounts.present} de ${dashboard.attendanceCounts.expected} recientes`}
              tone={dashboard.attendancePercentage >= 70 ? 'green' : 'gold'}
              onClick={() => setPage('attendance')}
            />

            <StatCard
              icon="priority_high"
              label="Urgentes"
              value={dashboard.urgentNeeds}
              helper={`${dashboard.pendingNeeds} necesidades pendientes`}
              tone={dashboard.urgentNeeds > 0 ? 'red' : 'green'}
              onClick={() => setPage('needs')}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon="assignment"
              label="Informes pendientes"
              value={dashboard.pendingReports}
              helper="Borradores o enviados"
              tone="gold"
              onClick={() => setPage('reports')}
            />

            <StatCard
              icon="calendar_month"
              label="Temas esta semana"
              value={dashboard.topicsThisWeek}
              helper="Programados de lunes a domingo"
              tone="blue"
              onClick={() => setPage('topics')}
            />

            <StatCard
              icon="folder_open"
              label="Materiales recientes"
              value={dashboard.materials}
              helper="Últimos recursos cargados"
              tone="violet"
              onClick={() => setPage('materials')}
            />

            <StatCard
              icon="group"
              label="Usuarios activos"
              value={dashboard.activeUsers}
              helper="Usuarios con acceso activo"
              tone="green"
              onClick={() => setPage('users')}
            />
          </section>
        </>
      ) : (
        <DashboardCharts
          dashboard={dashboard}
          chartData={chartData}
          chartPreset={chartPreset}
          chartStartDate={chartStartDate}
          chartEndDate={chartEndDate}
          setChartPreset={setChartPreset}
          setChartStartDate={setChartStartDate}
          setChartEndDate={setChartEndDate}
          applyChartPreset={applyChartPreset}
          setPage={setPage}
        />
      )}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader
            eyebrow="Actividad reciente"
            title="Últimas asistencias"
            description="Resumen de las reuniones registradas recientemente."
            actionLabel="Ver asistencia"
            onAction={() => setPage('attendance')}
          />

          {loading ? (
            <p className="font-semibold text-slate-500">Cargando asistencias...</p>
          ) : recentAttendance.length === 0 ? (
            <EmptyState
              icon="fact_check"
              title="Sin asistencias"
              description="Cuando registres asistencias, aparecerán aquí."
            />
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((session) => {
                const sessionRecords = recordsBySession[session.id] || []
                const counts = getAttendanceCounts(sessionRecords)

                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-black text-slate-900">
                          {session.cells?.name || 'Célula'}
                        </h4>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {formatDate(session.meeting_date)} · {session.topic || 'Sin tema'}
                        </p>
                      </div>

                      <Badge className={getStatusBadge(session.status)}>
                        {session.status}
                      </Badge>
                    </div>

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
                  </article>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Seguimiento"
            title="Necesidades urgentes"
            description="Casos que requieren atención prioritaria."
            actionLabel="Ver necesidades"
            onAction={() => setPage('needs')}
          />

          {urgentNeeds.length === 0 ? (
            <EmptyState
              icon="volunteer_activism"
              title="Sin urgentes"
              description="No hay necesidades urgentes pendientes."
            />
          ) : (
            <div className="space-y-3">
              {urgentNeeds.map((need) => (
                <button
                  key={need.id}
                  type="button"
                  onClick={() => setPage('needs')}
                  className="w-full rounded-2xl border border-red-100 bg-red-50 p-4 text-left transition hover:bg-red-100"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-red-900">{need.title}</h4>
                      <p className="mt-1 text-sm font-semibold text-red-700">
                        {need.cells?.name || 'Célula'} · {need.category}
                      </p>
                    </div>

                    <Badge className={getNeedPriorityBadge(need.priority)}>
                      {need.priority}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <DashboardList
          eyebrow="Informes"
          title="Informes pendientes"
          emptyIcon="assignment"
          emptyTitle="Sin informes pendientes"
          emptyDescription="Los informes borrador o enviados aparecerán aquí."
          actionLabel="Ver informes"
          onAction={() => setPage('reports')}
        >
          {pendingReports.map((report) => (
            <CompactItem
              key={report.id}
              icon="assignment"
              title={report.topic || 'Informe sin tema'}
              subtitle={`${report.cells?.name || 'Célula'} · ${formatDate(report.report_date)}`}
              badge={report.status}
              badgeClass={getStatusBadge(report.status)}
              onClick={() => setPage('reports')}
            />
          ))}
        </DashboardList>

        <DashboardList
          eyebrow="Calendario"
          title="Temas de esta semana"
          emptyIcon="calendar_month"
          emptyTitle="Sin temas esta semana"
          emptyDescription="Programa temas para que aparezcan aquí."
          actionLabel="Ver calendario"
          onAction={() => setPage('topics')}
        >
          {upcomingTopics.map((topic) => (
            <CompactItem
              key={topic.id}
              icon="calendar_month"
              title={topic.title}
              subtitle={`${formatDate(topic.suggested_date)} · ${topic.cells?.name || 'General'}`}
              badge={topic.status}
              badgeClass={getStatusBadge(topic.status)}
              onClick={() => setPage('topics')}
            />
          ))}
        </DashboardList>

        <DashboardList
          eyebrow="Biblioteca"
          title="Materiales recientes"
          emptyIcon="folder_open"
          emptyTitle="Sin materiales"
          emptyDescription="Los últimos materiales cargados aparecerán aquí."
          actionLabel="Ver materiales"
          onAction={() => setPage('materials')}
        >
          {recentMaterials.map((material) => (
            <CompactItem
              key={material.id}
              icon={material.source_type === 'drive' ? 'add_to_drive' : material.source_type === 'upload' ? 'upload_file' : 'link'}
              title={material.title}
              subtitle={`${material.cells?.name || 'General'} · ${material.category}`}
              badge={material.material_type}
              badgeClass="border-slate-200 bg-slate-100 text-slate-700"
              onClick={() => setPage('materials')}
            />
          ))}
        </DashboardList>
      </section>

      <Card>
        <SectionHeader
          eyebrow="Acciones rápidas"
          title="Trabaja más rápido"
          description="Atajos principales para operar el sistema."
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            icon="groups"
            title="Gestionar células"
            description="Agrega familias, personas y líderes."
            onClick={() => setPage('cells')}
          />

          <QuickAction
            icon="fact_check"
            title="Registrar asistencia"
            description="Marca familias completas, incompletas o ausentes."
            onClick={() => setPage('attendance')}
          />

          <QuickAction
            icon="assignment"
            title="Crear informe"
            description="Registra el resumen de la reunión."
            onClick={() => setPage('reports')}
          />

          <QuickAction
            icon="folder_open"
            title="Subir material"
            description="Guarda archivos, Drive o links."
            onClick={() => setPage('materials')}
          />
        </div>
      </Card>
    </main>
  )
}

function DashboardCharts({
  dashboard,
  chartData,
  chartPreset,
  chartStartDate,
  chartEndDate,
  setChartPreset,
  setChartStartDate,
  setChartEndDate,
  applyChartPreset,
  setPage
}) {
  return (
    <section className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Filtros de gráficas</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Estadísticas por periodo
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Periodo actual: {formatDate(chartStartDate)} - {formatDate(chartEndDate)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyChartPreset('week')}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                chartPreset === 'week'
                  ? 'bg-[#003B5C] text-white'
                  : 'bg-[#EAF4F8] text-[#003B5C] hover:bg-[#D8ECF4]'
              }`}
            >
              Semana
            </button>

            <button
              type="button"
              onClick={() => applyChartPreset('month')}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                chartPreset === 'month'
                  ? 'bg-[#003B5C] text-white'
                  : 'bg-[#EAF4F8] text-[#003B5C] hover:bg-[#D8ECF4]'
              }`}
            >
              Mes
            </button>

            <button
              type="button"
              onClick={() => applyChartPreset('year')}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                chartPreset === 'year'
                  ? 'bg-[#003B5C] text-white'
                  : 'bg-[#EAF4F8] text-[#003B5C] hover:bg-[#D8ECF4]'
              }`}
            >
              Año
            </button>

            <button
              type="button"
              onClick={() => setChartPreset('custom')}
              className={`rounded-2xl px-4 py-3 text-sm font-black transition ${
                chartPreset === 'custom'
                  ? 'bg-[#003B5C] text-white'
                  : 'bg-[#EAF4F8] text-[#003B5C] hover:bg-[#D8ECF4]'
              }`}
            >
              Rango
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              Fecha inicial
            </span>
            <input
              type="date"
              value={chartStartDate}
              onChange={(event) => {
                setChartPreset('custom')
                setChartStartDate(event.target.value)
              }}
              className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-800">
              Fecha final
            </span>
            <input
              type="date"
              value={chartEndDate}
              onChange={(event) => {
                setChartPreset('custom')
                setChartEndDate(event.target.value)
              }}
              className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#003B5C] focus:ring-4 focus:ring-sky-100"
            />
          </label>

          <div className="flex items-end">
            <Badge className="border-cyan-200 bg-cyan-50 px-4 py-3 text-cyan-700">
              {chartPreset === 'week' && 'Vista semanal'}
              {chartPreset === 'month' && 'Vista mensual'}
              {chartPreset === 'year' && 'Vista anual'}
              {chartPreset === 'custom' && 'Rango personalizado'}
            </Badge>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon="fact_check"
          label="Reuniones"
          value={chartData.totals.sessions}
          helper="Asistencias registradas"
          tone="blue"
        />

        <StatCard
          icon="assignment"
          label="Informes"
          value={chartData.totals.reports}
          helper="Informes del periodo"
          tone="gold"
        />

        <StatCard
          icon="volunteer_activism"
          label="Necesidades"
          value={chartData.totals.needs}
          helper="Creadas en el periodo"
          tone="red"
        />

        <StatCard
          icon="calendar_month"
          label="Temas"
          value={chartData.totals.topics}
          helper="Programados en el periodo"
          tone="green"
        />

        <StatCard
          icon="folder_open"
          label="Materiales"
          value={chartData.totals.materials}
          helper="Cargados en el periodo"
          tone="violet"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="mb-5">
            <p className="eyebrow">Asistencia</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Asistencia general
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Porcentaje de asistencia dentro del periodo seleccionado.
            </p>
          </div>

          <DonutProgress
            value={chartData.attendancePercentage}
            label={`${chartData.attendancePercentage}%`}
            helper={`${chartData.attendance.present} presentes de ${chartData.attendance.expected} esperados`}
          />

          <div className="mt-6">
            <BarList
              title="Detalle de asistencia"
              items={chartData.attendanceData}
            />
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Seguimiento pastoral</p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                Necesidades
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Estado y prioridad de las necesidades creadas en el periodo.
              </p>
            </div>

            <SecondaryButton onClick={() => setPage('needs')}>
              Ver necesidades
            </SecondaryButton>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <BarList title="Por estado" items={chartData.needsStatusData} />
            <BarList title="Por prioridad" items={chartData.needsPriorityData} />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <div className="mb-5">
            <p className="eyebrow">Informes</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              Estado de informes
            </h3>
          </div>

          <BarList title="Informes" items={chartData.reportsStatusData} />
        </Card>

        <Card>
          <div className="mb-5">
            <p className="eyebrow">Calendario</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              Temas programados
            </h3>
          </div>

          <BarList title="Temas" items={chartData.topicsStatusData} />
        </Card>

        <Card>
          <div className="mb-5">
            <p className="eyebrow">Materiales</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              Origen de recursos
            </h3>
          </div>

          <BarList title="Materiales" items={chartData.materialSourceData} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="mb-5">
            <p className="eyebrow">Células</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              Estado de células
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Esta gráfica muestra el estado actual de las células.
            </p>
          </div>

          <BarList title="Células" items={chartData.cellStatusData} />
        </Card>

        <Card>
          <div className="mb-5">
            <p className="eyebrow">Progreso</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              Avance general
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Indicadores rápidos del periodo seleccionado.
            </p>
          </div>

          <ProgressList items={chartData.progressData} />
        </Card>
      </div>
    </section>
  )
}

function DonutProgress({ value, label, helper }) {
  const safeValue = Math.max(0, Math.min(Number(value || 0), 100))
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeValue / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50 p-8 text-center">
      <div className="relative h-40 w-40">
        <svg className="h-40 w-40 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="12"
          />

          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#003B5C"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <div>
            <strong className="block text-3xl font-black text-slate-900">
              {label}
            </strong>
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">
              Asistencia
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-500">
        {helper}
      </p>
    </div>
  )
}

function BarList({ title, items }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1)

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="font-black text-slate-900">{title}</h4>
        <Badge className="border-slate-200 bg-white text-slate-600">
          Total {total}
        </Badge>
      </div>

      {total === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-400">
          Sin datos para mostrar.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const value = Number(item.value || 0)
            const width = `${Math.max((value / maxValue) * 100, value > 0 ? 8 : 0)}%`
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0

            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-slate-700">
                    {item.label}
                  </span>

                  <span className="text-sm font-black text-slate-500">
                    {value} · {percentage}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${getBarClass(index)}`}
                    style={{ width }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ProgressList({ items }) {
  return (
    <div className="grid gap-4">
      {items.map((item, index) => {
        const value = Math.max(0, Math.min(Number(item.value || 0), 100))

        return (
          <div
            key={item.label}
            className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="font-black text-slate-900">{item.label}</h4>
              <strong className="text-xl font-black text-[#003B5C]">
                {value}%
              </strong>
            </div>

            <div className="h-4 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full ${getBarClass(index)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getBarClass(index) {
  const classes = [
    'bg-[#003B5C]',
    'bg-[#2F5D1E]',
    'bg-[#D6A900]',
    'bg-[#B91C1C]',
    'bg-slate-500'
  ]

  return classes[index % classes.length]
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {description}
          </p>
        )}
      </div>

      {actionLabel && (
        <SecondaryButton onClick={onAction}>
          {actionLabel}
        </SecondaryButton>
      )}
    </div>
  )
}

function DashboardList({
  eyebrow,
  title,
  children,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  actionLabel,
  onAction
}) {
  const hasChildren = React.Children.count(children) > 0

  return (
    <Card>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        actionLabel={actionLabel}
        onAction={onAction}
      />

      {!hasChildren ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </Card>
  )
}

function CompactItem({
  icon,
  title,
  subtitle,
  badge,
  badgeClass,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:bg-[#EAF4F8]"
    >
      <div className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-white text-[#003B5C] shadow-sm">
        <span className="material-symbols-rounded">{icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="font-black text-slate-900">{title}</h4>

          {badge && (
            <Badge className={badgeClass}>
              {badge}
            </Badge>
          )}
        </div>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          {subtitle}
        </p>
      </div>
    </button>
  )
}

function QuickAction({
  icon,
  title,
  description,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-1 hover:bg-[#EAF4F8] hover:shadow-sm"
    >
      <span className="material-symbols-rounded text-4xl text-[#003B5C]">
        {icon}
      </span>

      <h4 className="mt-3 font-black text-slate-900">{title}</h4>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </button>
  )
}