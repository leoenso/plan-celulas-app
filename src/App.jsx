import React, { useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabaseClient'
import { canAccessView, getDefaultViewForRole } from './lib/permissions'

import Auth from './components/Auth'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import Cells from './components/Cells'
import Attendance from './components/Attendance'
import Reports from './components/Reports'
import Needs from './components/Needs'
import Topics from './components/Topics'
import Materials from './components/Materials'
import AdminUsers from './components/AdminUsers'

const views = {
  dashboard: Dashboard,
  cells: Cells,
  attendance: Attendance,
  reports: Reports,
  needs: Needs,
  topics: Topics,
  materials: Materials,
  users: AdminUsers
}

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)

      if (!nextSession) {
        setProfile(null)
        setView('dashboard')
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }

    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error) console.error(error)
      setProfile(data || null)
    }

    loadProfile()
  }, [session])

  useEffect(() => {
    if (!profile?.role) return

    if (!canAccessView(profile.role, view)) {
      setView(getDefaultViewForRole(profile.role))
    }
  }, [profile, view])

  function safeSetView(nextView) {
    if (!profile?.role) {
      setView(nextView)
      return
    }

    if (canAccessView(profile.role, nextView)) {
      setView(nextView)
      return
    }

    setView(getDefaultViewForRole(profile.role))
  }

  const CurrentView = useMemo(() => {
    if (!profile?.role) return Dashboard

    if (!canAccessView(profile.role, view)) {
      return Dashboard
    }

    return views[view] || Dashboard
  }, [view, profile])

  async function handleLogout() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
    setView('dashboard')
  }

  if (loading) {
    return (
      <main className="center-screen">
        <div className="loader">Cargando...</div>
      </main>
    )
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="center-screen">
        <section className="auth-card">
          <div className="brand-badge">Plan de Células</div>
          <h1>Falta conectar DB</h1>
        </section>
      </main>
    )
  }

  if (!session) return <Auth />

  if (profile && profile.active === false) {
    return (
      <main className="center-screen">
        <section className="auth-card">
          <h1>Cuenta desactivada</h1>
          <p className="muted">
            Tu acceso está desactivado. Contacta a un administrador para revisar tu cuenta.
          </p>
          <button className="primary-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </section>
      </main>
    )
  }

  return (
    <Layout
      user={session.user}
      profile={profile}
      currentView={view}
      setCurrentView={safeSetView}
      onLogout={handleLogout}
    >
      {!profile ? (
        <section className="card">
          <h2>Tu perfil aún se está preparando</h2>
          <p>
            Si acabas de registrarte, espera unos segundos y recarga la página.
          </p>
        </section>
      ) : (
        <CurrentView
          user={session.user}
          profile={profile}
          currentView={view}
          setCurrentView={safeSetView}
          setCurrentPage={safeSetView}
          setActivePage={safeSetView}
          setActiveView={safeSetView}
        />
      )}
    </Layout>
  )
}