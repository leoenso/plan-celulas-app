import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    description: 'Resumen general'
  },
  {
    id: 'cells',
    label: 'Células',
    icon: 'groups',
    description: 'Familias y grupos'
  },
  {
    id: 'attendance',
    label: 'Asistencia',
    icon: 'fact_check',
    description: 'Registro semanal'
  },
  {
    id: 'reports',
    label: 'Informes',
    icon: 'assignment',
    description: 'Reportes de líderes'
  },
  {
    id: 'needs',
    label: 'Necesidades',
    icon: 'volunteer_activism',
    description: 'Seguimiento pastoral'
  },
  {
    id: 'topics',
    label: 'Calendario',
    icon: 'calendar_month',
    description: 'Temas y fechas'
  },
  {
    id: 'materials',
    label: 'Materiales',
    icon: 'folder_open',
    description: 'Recursos y guías'
  },
  {
    id: 'users',
    label: 'Usuarios',
    icon: 'admin_panel_settings',
    description: 'Roles y permisos',
    adminOnly: true
  }
]

function getRoleLabel(role) {
  if (role === 'admin') return 'Administrador'
  if (role === 'leader') return 'Líder'
  if (role === 'auxiliar') return 'Auxiliar'
  if (role === 'viewer') return 'Solo lectura'
  return 'Usuario'
}

function getPageTitle(pageId) {
  const item = navItems.find((navItem) => navItem.id === pageId)
  return item?.label || 'Plan de Células'
}

function getPageDescription(pageId) {
  const item = navItems.find((navItem) => navItem.id === pageId)
  return item?.description || 'Sistema de gestión ministerial'
}

export default function Layout({
  children,
  profile,
  user,

  currentPage,
  setCurrentPage,

  activePage,
  setActivePage,

  currentView,
  setCurrentView,

  activeView,
  setActiveView,

  activeTab,
  setActiveTab,

  selectedPage,
  setSelectedPage,

  page,
  setPage,

  onLogout,
  onSignOut
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const activeModule =
    currentPage ||
    activePage ||
    currentView ||
    activeView ||
    activeTab ||
    selectedPage ||
    page ||
    'dashboard'

  const changeModule =
    setCurrentPage ||
    setActivePage ||
    setCurrentView ||
    setActiveView ||
    setActiveTab ||
    setSelectedPage ||
    setPage ||
    (() => {})

  const visibleNavItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.adminOnly) return profile?.role === 'admin'
      return true
    })
  }, [profile?.role])

  const displayName =
    profile?.full_name ||
    user?.email ||
    profile?.email ||
    'Usuario'

  async function handleLogout() {
    if (onLogout) {
      await onLogout()
      return
    }

    if (onSignOut) {
      await onSignOut()
      return
    }

    await supabase.auth.signOut()
    window.location.reload()
  }

  function handleNavigation(id) {
    changeModule(id)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell inp-layout">
      <aside className={`sidebar inp-sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-inner">
          <div className="brand-block inp-brand">
            <div className="brand-logo-wrap">
              <img
                 src="/inp-logo.png"
                alt="Iglesia Nacional Presbiteriana"
                className="brand-logo"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
              <div className="brand-mark">
                INP
              </div>
            </div>

            <div>
              <p className="brand-kicker">El Divino Salvador</p>
              <h1 className="brand-title">Plan de Células</h1>
              <p className="brand-subtitle">2026</p>
            </div>
          </div>

          <nav className="nav-menu" aria-label="Navegación principal">
            {visibleNavItems.map((item) => {
              const active = activeModule === item.id

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-button ${active ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id)}
                >
                  <span className="material-symbols-rounded" aria-hidden="true">
                    {item.icon}
                  </span>

                  <span className="nav-text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="sidebar-footer inp-sidebar-footer">
            <div className="user-avatar">
              {String(displayName).slice(0, 1).toUpperCase()}
            </div>

            <div className="user-info">
              <p>{displayName}</p>
              <span>{getRoleLabel(profile?.role)}</span>
            </div>

            <button
              type="button"
              className="logout-icon-button"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area inp-main">
        <header className="topbar inp-topbar">
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-label="Abrir menú"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              menu
            </span>
          </button>

          <div>
            <p className="topbar-kicker">Gestión de células</p>
            <h2>{getPageTitle(activeModule)}</h2>
            <p>{getPageDescription(activeModule)}</p>
          </div>

          <div className="topbar-actions">
            <span className="role-chip">
              <span className="material-symbols-rounded" aria-hidden="true">
                verified_user
              </span>
              {getRoleLabel(profile?.role)}
            </span>

            <button
              type="button"
              className="secondary-button topbar-logout"
              onClick={handleLogout}
            >
              <span className="material-symbols-rounded" aria-hidden="true">
                logout
              </span>
              Salir
            </button>
          </div>
        </header>

        <main className="content-container">
          {children}
        </main>
      </div>
    </div>
  )
}