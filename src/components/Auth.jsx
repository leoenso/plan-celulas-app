import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import ThemeToggle from './ThemeToggle'

export default function Auth() {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'
  const isRegister = mode === 'register'
  const isReset = mode === 'reset'

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!email.trim()) {
      setMessage('Escribe tu correo electrónico.')
      return
    }

    if (!isReset && !password.trim()) {
      setMessage('Escribe tu contraseña.')
      return
    }

    if (isRegister && password !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.')
      return
    }

    if (isRegister && password.length < 6) {
      setMessage('La contraseña debe tener mínimo 6 caracteres.')
      return
    }

    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      setLoading(false)

      if (error) {
        setMessage('No pudimos iniciar sesión. Revisa tu correo y contraseña.')
        return
      }

      setMessage('Entrando al sistema...')
      return
    }

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      })

      setLoading(false)

      if (error) {
        setMessage(error.message)
        return
      }

      if (data?.user && !data?.session) {
        setMessage('Cuenta creada. Revisa tu correo para confirmar el acceso.')
        return
      }

      setMessage('Cuenta creada correctamente. Entrando al sistema...')
      return
    }

    if (isReset) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      })

      setLoading(false)

      if (error) {
        setMessage(error.message)
        return
      }

      setMessage('Te enviamos un correo para restablecer tu contraseña.')
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode)
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="auth-page-shell">
      <section className="auth-visual-panel">
        <div className="auth-church-brand">
          <div className="auth-logo-frame">
            <img
              src="/inp-logo.png"
              alt="Iglesia Nacional Presbiteriana"
              className="auth-logo"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          </div>

          <div>
            <p className="auth-kicker">Iglesia Nacional Presbiteriana</p>
            <h1>El Divino Salvador</h1>
            <p className="auth-subtitle">Plan de Grupos Pequeños 2026</p>
          </div>
        </div>

        <div className="auth-hero-copy">
          <p className="eyebrow">Gestión ministerial</p>
          <h2>Organiza, acompaña y da seguimiento a cada grupo pequeño.</h2>
          <p>
            Registra asistencia, informes, necesidades, temas, materiales y el avance de cada grupo desde un solo lugar.
          </p>
        </div>

        <div className="auth-feature-grid">
          <article>
            <span className="material-symbols-rounded">groups</span>
            <strong>Grupos pequeños</strong>
            <p>Familias, personas y líderes asignados.</p>
          </article>

          <article>
            <span className="material-symbols-rounded">fact_check</span>
            <strong>Asistencia</strong>
            <p>Control semanal claro y ordenado.</p>
          </article>

          <article>
            <span className="material-symbols-rounded">volunteer_activism</span>
            <strong>Seguimiento</strong>
            <p>Necesidades, oración e informes pastorales.</p>
          </article>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-theme-row">
          <ThemeToggle />
        </div>

        <div className="auth-mobile-brand">
          <img
            src="/inp-logo.png"
            alt="Iglesia Nacional Presbiteriana"
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
          />
          <div>
            <strong>El Divino Salvador</strong>
            <span>Plan de Grupos Pequeños</span>
          </div>
        </div>

        <div className="auth-card-modern">
          <div className="auth-form-heading">
            <p className="eyebrow">
              {isLogin && 'Acceso al sistema'}
              {isRegister && 'Crear cuenta'}
              {isReset && 'Recuperar acceso'}
            </p>

            <h2>
              {isLogin && 'Bienvenido de nuevo'}
              {isRegister && 'Regístrate en el plan'}
              {isReset && 'Restablece tu contraseña'}
            </h2>

            <p>
              {isLogin && 'Ingresa con tu correo y contraseña para continuar.'}
              {isRegister && 'Crea tu cuenta. Después un administrador podrá asignarte rol y grupo pequeño.'}
              {isReset && 'Escribe tu correo y te enviaremos instrucciones para recuperar tu acceso.'}
            </p>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              className={isLogin ? 'active' : ''}
              onClick={() => changeMode('login')}
            >
              Iniciar sesión
            </button>

            <button
              type="button"
              className={isRegister ? 'active' : ''}
              onClick={() => changeMode('register')}
            >
              Registrarme
            </button>
          </div>

          <form className="auth-form-modern" onSubmit={handleSubmit}>
            {isRegister && (
              <label>
                Nombre completo
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ej. Leonardo Collí"
                  autoComplete="name"
                />
              </label>
            )}

            <label>
              Correo electrónico
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
              />
            </label>

            {!isReset && (
              <label>
                Contraseña
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                />
              </label>
            )}

            {isRegister && (
              <label>
                Confirmar contraseña
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  required
                />
              </label>
            )}

            {message && (
              <p className="auth-message">
                {message}
              </p>
            )}

            <button className="auth-submit-button" disabled={loading}>
              <span className="material-symbols-rounded">
                {isLogin ? 'login' : isRegister ? 'person_add' : 'mail'}
              </span>

              {loading && 'Procesando...'}
              {!loading && isLogin && 'Entrar al sistema'}
              {!loading && isRegister && 'Crear cuenta'}
              {!loading && isReset && 'Enviar correo'}
            </button>
          </form>

          <div className="auth-helper-actions">
            {!isReset ? (
              <button type="button" onClick={() => changeMode('reset')}>
                Olvidé mi contraseña
              </button>
            ) : (
              <button type="button" onClick={() => changeMode('login')}>
                Volver a iniciar sesión
              </button>
            )}
          </div>
        </div>

        <p className="auth-footer-note">
          Iglesia Nacional Presbiteriana de México A.R. · El Divino Salvador
        </p>
      </section>
    </main>
  )
}