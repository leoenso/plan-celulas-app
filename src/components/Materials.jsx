import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { canCreate, canEdit, canDelete, canUpload } from '../lib/permissions'
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
import {
  formatDate,
  formatFileSize,
  normalizeText,
  sanitizeFileName
} from '../lib/formatters'
import {
  bucketName,
  emptyMaterial,
  getCategoryBadge,
  getDriveEmbedUrl,
  getSourceType,
  getStatusBadge,
  getTypeIcon,
  getYouTubeEmbedUrl,
  materialAudiences,
  materialCategories,
  materialStatuses,
  materialTypes,
  sourceTypes
} from '../lib/materialUtils'

function getSourceLabel(sourceType) {
  if (sourceType === 'upload') return 'Archivo subido'
  if (sourceType === 'drive') return 'Google Drive'
  if (sourceType === 'link') return 'Link externo'
  return 'Material'
}

function getSourceIcon(sourceType, materialType) {
  if (sourceType === 'drive') return 'add_to_drive'
  if (sourceType === 'upload') return 'upload_file'
  if (sourceType === 'link') return 'link'
  return getTypeIcon(materialType)
}

export default function Materials({ user, profile }) {
  const [topics, setTopics] = useState([])
  const [materials, setMaterials] = useState([])
  const [mode, setMode] = useState('list')
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [form, setForm] = useState(emptyMaterial)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const role = profile?.role || 'viewer'
  const allowCreate = canCreate(role, 'materials')
  const allowEdit = canEdit(role, 'materials')
  const allowDelete = canDelete(role, 'materials')
  const allowUpload = canUpload(role, 'materials')

  async function loadData(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const [topicsResponse, materialsResponse] = await Promise.all([
      supabase
        .from('cell_topics')
        .select('id,cell_id,title,suggested_date,status')
        .order('suggested_date', { ascending: false }),

      supabase
        .from('cell_materials')
        .select('*, cell_topics(id,title,suggested_date,status)')
        .order('created_at', { ascending: false })
    ])

    if (topicsResponse.error) setMessage(topicsResponse.error.message)
    if (materialsResponse.error) setMessage(materialsResponse.error.message)

    setTopics(topicsResponse.data || [])
    setMaterials(materialsResponse.data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const topicsById = useMemo(() => {
    return Object.fromEntries(topics.map((topic) => [topic.id, topic]))
  }, [topics])

  const topicsForSelectedCell = useMemo(() => {
    return topics
  }, [topics])

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return materials.filter((material) => {
      const topic = material.cell_topics || topicsById[material.topic_id]
      const sourceType = getSourceType(material)

      const searchable = normalizeText([
        topic?.title,
        material.title,
        material.material_type,
        material.category,
        material.description,
        material.url,
        material.drive_url,
        material.file_name,
        material.author,
        material.audience,
        material.status,
        sourceType,
        material.notes
      ].join(' '))

      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery)

      const matchesType = typeFilter === 'todos' || material.material_type === typeFilter
      const matchesCategory = categoryFilter === 'todas' || material.category === categoryFilter
      const matchesStatus = statusFilter === 'todos' || material.status === statusFilter

      return matchesQuery && matchesType && matchesCategory && matchesStatus
    })
  }, [
    materials,
    topicsById,
    query,
    typeFilter,
    categoryFilter,
    statusFilter
  ])

  const summary = useMemo(() => {
    return {
      total: materials.length,
      active: materials.filter((item) => item.status === 'activo').length,
      archived: materials.filter((item) => item.status === 'archivado').length,
      uploads: materials.filter((item) => getSourceType(item) === 'upload').length,
      drive: materials.filter((item) => getSourceType(item) === 'drive').length
    }
  }, [materials])

  function startCreate() {
    if (!allowCreate) {
      setMessage('Tu rol no tiene permiso para crear materiales.')
      return
    }

    setSelectedMaterial(null)
    setFileToUpload(null)
    setForm({
      ...emptyMaterial,
      source_type: allowUpload ? 'upload' : 'drive'
    })
    setMode('create')
    setMessage('')
  }

  function startEdit(material) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para editar materiales.')
      return
    }

    setSelectedMaterial(material)
    setFileToUpload(null)

    setForm({
      topic_id: material.topic_id || '',
      title: material.title || '',
      material_type: material.material_type || 'archivo',
      category: material.category || 'enseñanza',
      description: material.description || '',
      source_type: getSourceType(material),
      url: material.url || '',
      drive_url: material.drive_url || '',
      author: material.author || '',
      audience: material.audience || 'líderes',
      status: material.status || 'activo',
      notes: material.notes || ''
    })

    setMode('edit')
    setMessage('')
  }

  function openDetail(material) {
    setSelectedMaterial(material)
    setMode('detail')
    setMessage('')
  }

  function backToList() {
    setMode('list')
    setSelectedMaterial(null)
    setFileToUpload(null)
    setForm(emptyMaterial)
    loadData({ keepMessage: true })
  }

  async function uploadSelectedFile() {
    if (!fileToUpload) return null

    if (!allowUpload) {
      throw new Error('Tu rol no tiene permiso para subir archivos.')
    }

    const path = `${user.id}/${Date.now()}-${sanitizeFileName(fileToUpload.name)}`

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(path, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileToUpload.type || 'application/octet-stream'
      })

    if (error) throw error

    return {
      storage_path: path,
      file_name: fileToUpload.name,
      file_mime_type: fileToUpload.type || null,
      file_size: fileToUpload.size || null
    }
  }

  async function saveMaterial(event) {
    event.preventDefault()
    setMessage('')

    if (mode === 'create' && !allowCreate) {
      setMessage('Tu rol no tiene permiso para crear materiales.')
      return
    }

    if (mode === 'edit' && !allowEdit) {
      setMessage('Tu rol no tiene permiso para editar materiales.')
      return
    }

    if (!form.title.trim()) {
      setMessage('Escribe el título del material.')
      return
    }

    if (form.source_type === 'upload' && !allowUpload) {
      setMessage('Tu rol no tiene permiso para subir archivos.')
      return
    }

    if (form.source_type === 'upload' && !fileToUpload && !selectedMaterial?.storage_path) {
      setMessage('Selecciona un archivo para subir.')
      return
    }

    if (form.source_type === 'drive' && !form.drive_url.trim()) {
      setMessage('Pega la URL pública de Google Drive.')
      return
    }

    if (form.source_type === 'link' && !form.url.trim()) {
      setMessage('Pega el enlace externo.')
      return
    }

    setSaving(true)

    let uploadedFile = null

    try {
      uploadedFile = await uploadSelectedFile()
    } catch (error) {
      setSaving(false)
      setMessage(error.message)
      return
    }

    const keepPreviousUpload =
      form.source_type === 'upload' &&
      !uploadedFile &&
      selectedMaterial?.storage_path

    const payload = {
      cell_id: null,
      topic_id: form.topic_id || null,
      title: form.title.trim(),
      material_type: form.material_type || 'archivo',
      category: form.category || 'enseñanza',
      description: form.description.trim() || null,
      source_type: form.source_type || 'upload',

      url: form.source_type === 'link' ? form.url.trim() || null : null,
      drive_url: form.source_type === 'drive' ? form.drive_url.trim() || null : null,

      storage_path:
        uploadedFile?.storage_path ||
        (keepPreviousUpload ? selectedMaterial.storage_path : null),

      file_name:
        uploadedFile?.file_name ||
        (keepPreviousUpload ? selectedMaterial.file_name : null),

      file_mime_type:
        uploadedFile?.file_mime_type ||
        (keepPreviousUpload ? selectedMaterial.file_mime_type : null),

      file_size:
        uploadedFile?.file_size ||
        (keepPreviousUpload ? selectedMaterial.file_size : null),

      author: form.author.trim() || null,
      audience: form.audience || 'líderes',
      status: form.status || 'activo',
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    }

    const response =
      mode === 'edit' && selectedMaterial?.id
        ? await supabase
            .from('cell_materials')
            .update(payload)
            .eq('id', selectedMaterial.id)
            .select()
            .single()
        : await supabase
            .from('cell_materials')
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

    setMessage(mode === 'edit' ? 'Material actualizado correctamente.' : 'Material creado correctamente.')
    setMode('list')
    setSelectedMaterial(null)
    setFileToUpload(null)
    setForm(emptyMaterial)
    loadData({ keepMessage: true })
  }

  async function archiveMaterial(material) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para archivar materiales.')
      return
    }

    const { error } = await supabase
      .from('cell_materials')
      .update({
        status: 'archivado',
        updated_at: new Date().toISOString()
      })
      .eq('id', material.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Material archivado correctamente.')
    loadData({ keepMessage: true })
  }

  async function activateMaterial(material) {
    if (!allowEdit) {
      setMessage('Tu rol no tiene permiso para activar materiales.')
      return
    }

    const { error } = await supabase
      .from('cell_materials')
      .update({
        status: 'activo',
        updated_at: new Date().toISOString()
      })
      .eq('id', material.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Material activado correctamente.')
    loadData({ keepMessage: true })
  }

  async function deleteMaterial(material) {
    if (!allowDelete) {
      setMessage('Tu rol no tiene permiso para eliminar materiales.')
      return
    }

    const confirmation = window.confirm('¿Eliminar este material? Esta acción no se puede deshacer.')

    if (!confirmation) return

    if (material.storage_path) {
      await supabase.storage
        .from(bucketName)
        .remove([material.storage_path])
    }

    const { error } = await supabase
      .from('cell_materials')
      .delete()
      .eq('id', material.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Material eliminado correctamente.')
    loadData({ keepMessage: true })
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <MaterialForm
        mode={mode}
        form={form}
        setForm={setForm}
        fileToUpload={fileToUpload}
        setFileToUpload={setFileToUpload}
        selectedMaterial={selectedMaterial}
        topicsForSelectedCell={topicsForSelectedCell}
        saving={saving}
        message={message}
        onSubmit={saveMaterial}
        onBack={backToList}
        allowUpload={allowUpload}
      />
    )
  }

  if (mode === 'detail' && selectedMaterial) {
    const topic = selectedMaterial.cell_topics || topicsById[selectedMaterial.topic_id]
    const sourceType = getSourceType(selectedMaterial)

    return (
      <main className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SecondaryButton onClick={backToList}>
            <span className="material-symbols-rounded text-lg">arrow_back</span>
            Volver
          </SecondaryButton>

          <div className="flex flex-wrap gap-2">
            {allowEdit && (
              <PrimaryButton onClick={() => startEdit(selectedMaterial)}>
                <span className="material-symbols-rounded text-lg">edit</span>
                Editar
              </PrimaryButton>
            )}

            {allowEdit && selectedMaterial.status === 'activo' && (
              <SecondaryButton onClick={() => archiveMaterial(selectedMaterial)}>
                <span className="material-symbols-rounded text-lg">archive</span>
                Archivar
              </SecondaryButton>
            )}

            {allowEdit && selectedMaterial.status !== 'activo' && (
              <SecondaryButton onClick={() => activateMaterial(selectedMaterial)}>
                <span className="material-symbols-rounded text-lg">unarchive</span>
                Activar
              </SecondaryButton>
            )}

            {allowDelete && (
              <DangerButton onClick={() => deleteMaterial(selectedMaterial)}>
                <span className="material-symbols-rounded text-lg">delete</span>
                Eliminar
              </DangerButton>
            )}
          </div>
        </div>

        <section className="hero-card">
          <p className="eyebrow">Detalle de material</p>
          <h2>{selectedMaterial.title}</h2>
          <p className="muted mt-3">
            Material global · {getSourceLabel(sourceType)}
          </p>
        </section>

        {message && <Notice>{message}</Notice>}

        <MaterialPreview material={selectedMaterial} />

        <section className="grid gap-4 md:grid-cols-4">
          <StatCard icon={getTypeIcon(selectedMaterial.material_type)} label="Tipo" value={selectedMaterial.material_type} tone="blue" />
          <StatCard icon="category" label="Categoría" value={selectedMaterial.category} tone="green" />
          <StatCard icon="groups" label="Audiencia" value={selectedMaterial.audience} tone="gold" />
          <StatCard icon="toggle_on" label="Estado" value={selectedMaterial.status} tone={selectedMaterial.status === 'activo' ? 'green' : 'red'} />
        </section>

        <Card>
          <div className="grid gap-5">
            <MaterialBlock title="Tema vinculado" value={topic?.title} />
            <MaterialBlock title="Asignación" value="Material global" />
            <MaterialBlock title="Autor / Fuente" value={selectedMaterial.author} />
            <MaterialBlock title="Archivo" value={selectedMaterial.file_name ? `${selectedMaterial.file_name} · ${formatFileSize(selectedMaterial.file_size)}` : null} />
            <MaterialBlock title="Descripción" value={selectedMaterial.description} />
            <MaterialBlock title="Notas" value={selectedMaterial.notes} />
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
            <p className="eyebrow">Recursos ministeriales</p>
            <h2>Materiales</h2>
            <p className="muted mt-3 max-w-3xl">
              Sube archivos, pega enlaces públicos de Google Drive y visualiza materiales sin salir de la app.
            </p>
          </div>

          {allowCreate && (
            <button className="primary-button" onClick={startCreate}>
              <span className="material-symbols-rounded text-lg">add_circle</span>
              Nuevo material
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <StatCard icon="folder_open" label="Total" value={summary.total} tone="blue" />
        <StatCard icon="toggle_on" label="Activos" value={summary.active} tone="green" />
        <StatCard icon="archive" label="Archivados" value={summary.archived} tone="red" />
        <StatCard icon="upload_file" label="Subidos" value={summary.uploads} tone="gold" />
        <StatCard icon="add_to_drive" label="Drive" value={summary.drive} tone="blue" />
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <div className="mb-5">
          <p className="eyebrow">Consulta</p>
          <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
            Buscar y filtrar
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Busca por título, tipo, categoría, tema, grupo pequeño, autor, enlace o archivo.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr_1fr_1fr_auto]">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. oración, guía, video, PDF..."
            />
          </Field>

          <Field label="Tipo">
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {materialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoría">
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="todas">Todas</option>
              {materialCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Estado">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="todos">Todos</option>
              {materialStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex items-end">
            <SecondaryButton
              type="button"
              onClick={() => {
                setQuery('')
                setTypeFilter('todos')
                setCategoryFilter('todas')
                setStatusFilter('todos')
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
            <p className="eyebrow">Biblioteca</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
              Materiales registrados
            </h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {filteredMaterials.length} registro(s) encontrados.
            </p>
          </div>

          <SecondaryButton onClick={() => loadData()}>
            <span className="material-symbols-rounded text-lg">refresh</span>
            Actualizar
          </SecondaryButton>
        </div>

        {loading ? (
          <p className="font-semibold text-slate-500">Cargando materiales...</p>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            icon="folder_open"
            title="Todavía no hay materiales"
            description="Cuando registres el primer material, aparecerá aquí."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {filteredMaterials.map((material) => {
                      const topic = material.cell_topics || topicsById[material.topic_id]
              const sourceType = getSourceType(material)

              return (
                <article
                  key={material.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#EAF4F8] text-[#003B5C]">
                      <span className="material-symbols-rounded">
                        {getSourceIcon(sourceType, material.material_type)}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-black text-slate-900">
                        {material.title}
                      </h4>
                      <p className="text-sm font-semibold text-slate-500">
                        Material global
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge className={getCategoryBadge(material.category)}>
                      {material.category}
                    </Badge>

                    <Badge className={getStatusBadge(material.status)}>
                      {material.status}
                    </Badge>

                    <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                      {sourceType === 'upload' ? 'archivo' : sourceType === 'drive' ? 'drive' : 'link'}
                    </Badge>
                  </div>

                  <p className="line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                    {material.description || topic?.title || material.file_name || 'Sin descripción registrada.'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <PrimaryButton onClick={() => openDetail(material)}>
                      Ver
                    </PrimaryButton>

                    {allowEdit && (
                      <SecondaryButton onClick={() => startEdit(material)}>
                        Editar
                      </SecondaryButton>
                    )}

                    {allowDelete && (
                      <DangerButton onClick={() => deleteMaterial(material)}>
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

function SourceTypeSelector({ value, onChange, allowUpload }) {
  const availableSources = sourceTypes.filter((source) => {
    return source.id !== 'upload' || allowUpload
  })

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {availableSources.map((source) => {
        const active = value === source.id

        return (
          <button
            key={source.id}
            type="button"
            onClick={() => onChange(source.id)}
            className={`rounded-2xl border p-4 text-left transition ${
              active
                ? 'border-[#003B5C] bg-[#EAF4F8] text-[#003B5C] ring-4 ring-sky-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-rounded text-3xl">{source.icon}</span>
            <strong className="mt-2 block text-sm font-black">{source.label}</strong>
          </button>
        )
      })}
    </div>
  )
}

function MaterialForm({
  mode,
  form,
  setForm,
  fileToUpload,
  setFileToUpload,
  selectedMaterial,
  topicsForSelectedCell,
  saving,
  message,
  onSubmit,
  onBack,
  allowUpload
}) {
  function handleSourceChange(sourceType) {
    setFileToUpload(null)

    setForm({
      ...form,
      source_type: sourceType,
      url: sourceType === 'link' ? form.url : '',
      drive_url: sourceType === 'drive' ? form.drive_url : ''
    })
  }

  return (
    <main className="space-y-6">
      <SecondaryButton onClick={onBack}>
        <span className="material-symbols-rounded text-lg">arrow_back</span>
        Volver
      </SecondaryButton>

      <section className="hero-card">
        <p className="eyebrow">{mode === 'edit' ? 'Editar material' : 'Nuevo material'}</p>
        <h2>{mode === 'edit' ? 'Editar material' : 'Crear material de apoyo'}</h2>
        <p className="muted mt-3 max-w-3xl">
          Sube archivos o pega un enlace público de Google Drive para visualizarlo dentro de la app.
        </p>
      </section>

      {message && <Notice>{message}</Notice>}

      <Card>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2">
            <Field label="Origen del material">
              <SourceTypeSelector
                value={form.source_type}
                onChange={handleSourceChange}
                allowUpload={allowUpload}
              />
            </Field>
          </div>

          <Field label="Vincular con tema">
            <Select
              value={form.topic_id}
              onChange={(event) => setForm({ ...form, topic_id: event.target.value })}
            >
              <option value="">Sin tema vinculado</option>
              {topicsForSelectedCell.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {formatDate(topic.suggested_date)} · {topic.title}
                </option>
              ))}
            </Select>
          </Field>

          {form.source_type === 'upload' && allowUpload && (
            <div className="md:col-span-2">
              <Field
                label="Subir archivo"
                helper="Puedes subir PDF, imágenes, videos, documentos o presentaciones. Límite recomendado: 50 MB."
              >
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6">
                  <input
                    type="file"
                    onChange={(event) => setFileToUpload(event.target.files?.[0] || null)}
                    className="block w-full cursor-pointer rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-[#003B5C] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                  />

                  {fileToUpload && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-black text-emerald-800">
                        Archivo seleccionado:
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        {fileToUpload.name} · {formatFileSize(fileToUpload.size)}
                      </p>
                    </div>
                  )}

                  {!fileToUpload && selectedMaterial?.file_name && (
                    <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                      <p className="text-sm font-black text-cyan-800">
                        Archivo actual:
                      </p>
                      <p className="mt-1 text-sm font-semibold text-cyan-700">
                        {selectedMaterial.file_name} · {formatFileSize(selectedMaterial.file_size)}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-cyan-700">
                        Si no seleccionas otro archivo, se conservará el actual.
                      </p>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {form.source_type === 'drive' && (
            <div className="md:col-span-2">
              <Field
                label="URL pública de Google Drive"
                helper="En Drive usa Compartir → Cualquier persona con el enlace → Lector. Después pega aquí el enlace."
              >
                <Input
                  value={form.drive_url}
                  onChange={(event) => setForm({ ...form, drive_url: event.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                />
              </Field>
            </div>
          )}

          {form.source_type === 'link' && (
            <div className="md:col-span-2">
              <Field label="URL externa">
                <Input
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                  placeholder="https://..."
                />
              </Field>
            </div>
          )}

          <Field label="Título del material">
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Ej. Guía de estudio sobre la oración"
              required
            />
          </Field>

          <Field label="Tipo de material">
            <Select
              value={form.material_type}
              onChange={(event) => setForm({ ...form, material_type: event.target.value })}
            >
              {materialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Categoría">
            <Select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            >
              {materialCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Audiencia">
            <Select
              value={form.audience}
              onChange={(event) => setForm({ ...form, audience: event.target.value })}
            >
              {materialAudiences.map((audience) => (
                <option key={audience} value={audience}>
                  {audience}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Autor / Fuente">
            <Input
              value={form.author}
              onChange={(event) => setForm({ ...form, author: event.target.value })}
              placeholder="Ej. Iglesia, pastor, libro, ministerio..."
            />
          </Field>

          <Field label="Estado">
            <Select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {materialStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Descripción">
              <Textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Explica para qué sirve este material."
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Notas internas">
              <Textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Indicaciones para líderes, recomendaciones de uso, etc."
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3 md:col-span-2">
            <PrimaryButton disabled={saving}>
              {saving ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Guardar material'}
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

function MaterialPreview({ material }) {
  const [signedUrl, setSignedUrl] = useState('')
  const [previewError, setPreviewError] = useState('')
  const sourceType = getSourceType(material)

  useEffect(() => {
    let active = true

    async function loadSignedUrl() {
      setSignedUrl('')
      setPreviewError('')

      if (sourceType !== 'upload' || !material.storage_path) return

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(material.storage_path, 60 * 60)

      if (!active) return

      if (error) {
        setPreviewError(error.message)
      } else {
        setSignedUrl(data?.signedUrl || '')
      }
    }

    loadSignedUrl()

    return () => {
      active = false
    }
  }, [material.storage_path, sourceType])

  if (sourceType === 'drive') {
    const embedUrl = getDriveEmbedUrl(material.drive_url)

    return (
      <Card>
        <PreviewHeader
          icon="add_to_drive"
          title="Vista previa de Google Drive"
          description="El archivo se muestra dentro de la app. Si no aparece, revisa que el enlace sea público."
          url={material.drive_url}
        />

        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <iframe
            title={material.title}
            src={embedUrl}
            className="h-[70vh] w-full"
            allow="autoplay"
          />
        </div>
      </Card>
    )
  }

  if (sourceType === 'link') {
    const youtubeEmbed = getYouTubeEmbedUrl(material.url)

    return (
      <Card>
        <PreviewHeader
          icon="link"
          title="Vista previa del enlace"
          description={youtubeEmbed ? 'Video embebido dentro de la app.' : 'Este enlace no permite vista previa embebida, pero puedes abrirlo desde aquí.'}
          url={material.url}
        />

        {youtubeEmbed ? (
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-black">
            <iframe
              title={material.title}
              src={youtubeEmbed}
              className="aspect-video w-full"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <a
              href={material.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-black text-[#003B5C] underline"
            >
              <span className="material-symbols-rounded text-lg">open_in_new</span>
              Abrir enlace
            </a>
          </div>
        )}
      </Card>
    )
  }

  const mime = material.file_mime_type || ''

  return (
    <Card>
      <PreviewHeader
        icon="upload_file"
        title="Vista previa del archivo"
        description={`${material.file_name || 'Archivo subido'} · ${formatFileSize(material.file_size)}`}
        url={signedUrl}
      />

      {previewError && <Notice tone="red">{previewError}</Notice>}

      {!signedUrl && !previewError && (
        <p className="mt-5 font-semibold text-slate-500">
          Preparando vista previa...
        </p>
      )}

      {signedUrl && mime.startsWith('image/') && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <img
            src={signedUrl}
            alt={material.title}
            className="max-h-[75vh] w-full object-contain"
          />
        </div>
      )}

      {signedUrl && mime === 'application/pdf' && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <iframe
            title={material.title}
            src={signedUrl}
            className="h-[75vh] w-full"
          />
        </div>
      )}

      {signedUrl && mime.startsWith('video/') && (
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-black">
          <video src={signedUrl} controls className="w-full" />
        </div>
      )}

      {signedUrl && mime.startsWith('audio/') && (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <audio src={signedUrl} controls className="w-full" />
        </div>
      )}

      {signedUrl &&
        !mime.startsWith('image/') &&
        mime !== 'application/pdf' &&
        !mime.startsWith('video/') &&
        !mime.startsWith('audio/') && (
          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-sm font-semibold text-slate-600">
              Este tipo de archivo no siempre se puede previsualizar en el navegador.
            </p>

            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#003B5C] px-4 py-3 text-sm font-black text-white"
            >
              <span className="material-symbols-rounded text-lg">download</span>
              Abrir / descargar archivo
            </a>
          </div>
        )}
    </Card>
  )
}

function PreviewHeader({ icon, title, description, url }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex gap-3">
        <div className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#EAF4F8] text-[#003B5C]">
          <span className="material-symbols-rounded">{icon}</span>
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{description}</p>
        </div>
      </div>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#EAF4F8] px-4 py-3 text-sm font-black text-[#003B5C] transition hover:bg-[#D8ECF4]"
        >
          <span className="material-symbols-rounded text-lg">open_in_new</span>
          Abrir aparte
        </a>
      )}
    </div>
  )
}

function MaterialBlock({ title, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h4>
      <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
        {value || 'No registrado.'}
      </p>
    </div>
  )
}
