import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const cleanEmail = email.trim().toLowerCase()

    const response = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      : await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName.trim() } }
        })

    setLoading(false)

    if (response.error) {
      const errorText = response.error.message || 'No se pudo procesar la solicitud.'

      if (errorText.toLowerCase().includes('invalid login credentials')) {
        setMessage('Correo o contraseña incorrectos. Si aún no tienes cuenta, presiona “Crear una cuenta nueva”.')
      } else if (errorText.toLowerCase().includes('email not confirmed')) {
        setMessage('Tu correo aún no está confirmado. Revisa tu email')
      } else {
        setMessage(errorText)
      }
      return
    }

    if (mode === 'signup') {
      setMessage('Cuenta creada. revisa tu email para confirmar tu cuenta y poder iniciar sesión.')
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-badge">Plan de Células</div>
        <h1>{mode === 'login' ? 'Bienvenida' : 'Crear cuenta'}</h1>
        <p className="muted">Sistema interno para células, asistencia, informes, necesidades y materiales.</p>

        <form onSubmit={handleSubmit} className="form-stack">
          {mode === 'signup' && (
            <label>
              Nombre completo
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ej. Cyntia Cabrera" />
            </label>
          )}

          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="correo@iglesia.com" />
          </label>

          <label>
            Contraseña
            <input type="password" minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" />
          </label>

          <button className="primary-button" disabled={loading}>{loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
        </form>

        {message && <p className="notice">{message}</p>}

        <button className="link-button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
        </button>
      </section>
    </main>
  )
}
