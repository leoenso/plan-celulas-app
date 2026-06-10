import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const emptyFamily = {
  family_name: '',
  contact_name: '',
  phone: '',
  member_count: 1,
  active: true,
  notes: ''
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function FamiliesManager({ cell, canManage }) {
  const [families, setFamilies] = useState([])
  const [form, setForm] = useState(emptyFamily)
  const [editingFamily, setEditingFamily] = useState(null)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function loadFamilies(options = {}) {
    setLoading(true)
    if (!options.keepMessage) setMessage('')

    const { data, error } = await supabase
      .from('cell_families')
      .select('*')
      .eq('cell_id', cell.id)
      .order('family_name')

    if (error) {
      setMessage(error.message)
      setFamilies([])
    } else {
      setFamilies(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (cell?.id) loadFamilies()
  }, [cell?.id])

  const filteredFamilies = useMemo(() => {
    const normalizedQuery = normalizeText(query)

    return families.filter((family) => {
      const searchable = normalizeText([
        family.family_name,
        family.contact_name,
        family.phone,
        family.member_count,
        family.notes
      ].join(' '))

      return !normalizedQuery || searchable.includes(normalizedQuery)
    })
  }, [families, query])

  const summary = useMemo(() => {
    return {
      totalFamilies: families.length,
      activeFamilies: families.filter((family) => family.active).length,
      totalPeople: families.reduce((sum, family) => sum + Number(family.member_count || 0), 0)
    }
  }, [families])

  function resetForm() {
    setForm(emptyFamily)
    setEditingFamily(null)
    setMessage('')
  }

  function startEdit(family) {
    setEditingFamily(family)
    setForm({
      family_name: family.family_name || '',
      contact_name: family.contact_name || '',
      phone: family.phone || '',
      member_count: family.member_count || 1,
      active: family.active !== false,
      notes: family.notes || ''
    })
    setMessage('')
  }

  async function saveFamily(event) {
    event.preventDefault()
    setMessage('')

    if (!form.family_name.trim()) {
      setMessage('Escribe el nombre de la familia.')
      return
    }

    const memberCount = Number(form.member_count)

    if (!memberCount || memberCount < 1) {
      setMessage('El número de integrantes debe ser mínimo 1.')
      return
    }

    setSaving(true)

    const payload = {
      cell_id: cell.id,
      family_name: form.family_name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      member_count: memberCount,
      active: Boolean(form.active),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString()
    }

    const response = editingFamily?.id
      ? await supabase.from('cell_families').update(payload).eq('id', editingFamily.id)
      : await supabase.from('cell_families').insert(payload)

    setSaving(false)

    if (response.error) {
      setMessage(response.error.message)
      return
    }

    setMessage(editingFamily ? 'Familia actualizada correctamente.' : 'Familia agregada correctamente.')
    resetForm()
    loadFamilies({ keepMessage: true })
  }

  async function toggleFamily(family) {
    const { error } = await supabase
      .from('cell_families')
      .update({
        active: !family.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', family.id)

    if (error) {
      setMessage(error.message)
      return
    }

    loadFamilies()
  }

  async function deleteFamily(family) {
    const confirmation = window.confirm(`¿Eliminar a la familia "${family.family_name}"?`)
    if (!confirmation) return

    const { error } = await supabase
      .from('cell_families')
      .delete()
      .eq('id', family.id)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Familia eliminada correctamente.')
    loadFamilies({ keepMessage: true })
  }

  return (
    <section className="card">
      <div className="section-heading row-between wrap">
        <div>
          <h3>Familias del grupo pequeño</h3>
          <p className="muted">
            Registra familias completas con el número total de integrantes.
          </p>
        </div>

        <div className="row-gap">
          <span className="pill">{summary.activeFamilies} familias activas</span>
          <span className="pill">{summary.totalPeople} personas en familias</span>
        </div>
      </div>

      {message && <p className="notice">{message}</p>}

      {canManage && (
        <form className="grid-form" onSubmit={saveFamily}>
          <label>
            Nombre de la familia
            <input
              value={form.family_name}
              onChange={(event) => setForm({ ...form, family_name: event.target.value })}
              placeholder="Ej. Collí Espinosa"
              required
            />
          </label>

          <label>
            Número de integrantes
            <input
              type="number"
              min="1"
              value={form.member_count}
              onChange={(event) => setForm({ ...form, member_count: event.target.value })}
              required
            />
          </label>

          <label>
            Contacto principal
            <input
              value={form.contact_name}
              onChange={(event) => setForm({ ...form, contact_name: event.target.value })}
              placeholder="Ej. Hna. María Collí"
            />
          </label>

          <label>
            Teléfono
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="Opcional"
            />
          </label>

          <label className="checkbox-label span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm({ ...form, active: event.target.checked })}
            />
            Familia activa
          </label>

          <label className="span-2">
            Notas
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Ej. Familia anfitriona, requiere seguimiento, niños pequeños, etc."
            />
          </label>

          <div className="span-2 form-actions">
            <button className="primary-button" disabled={saving}>
              {saving ? 'Guardando...' : editingFamily ? 'Guardar familia' : 'Agregar familia'}
            </button>

            {editingFamily && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Cancelar edición
              </button>
            )}
          </div>
        </form>
      )}

      <div className="family-search">
        <label>
          Buscar familia
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por familia, contacto o teléfono"
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando familias...</p>
      ) : filteredFamilies.length === 0 ? (
        <p className="muted">Todavía no hay familias registradas en este grupo pequeño.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Familia</th>
                <th>Integrantes</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th>Notas</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredFamilies.map((family) => (
                <tr key={family.id}>
                  <td>
                    <strong>Familia {family.family_name}</strong>
                  </td>

                  <td>
                    <span className="pill">{family.member_count} personas</span>
                  </td>

                  <td>
                    <p className="small table-text">{family.contact_name || 'Sin contacto'}</p>
                    <p className="small muted table-text">{family.phone || 'Sin teléfono'}</p>
                  </td>

                  <td>
                    <span className={`pill ${family.active ? 'resuelto' : 'danger'}`}>
                      {family.active ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>

                  <td className="small muted">
                    {family.notes || '—'}
                  </td>

                  {canManage && (
                    <td>
                      <div className="row-gap">
                        <button className="secondary-button compact-button" onClick={() => startEdit(family)}>
                          Editar
                        </button>

                        <button className="secondary-button compact-button" onClick={() => toggleFamily(family)}>
                          {family.active ? 'Desactivar' : 'Activar'}
                        </button>

                        <button className="secondary-button compact-button danger-button" onClick={() => deleteFamily(family)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}