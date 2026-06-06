import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getAllowedViews, getRoleLabel } from '../lib/permissions'

function getPageTitle(pageId, items) {
  const item = items.find((navItem) => navItem.id === pageId || navItem.key === pageId)
  return item?.label || 'Plan de Células'
}

function getPageDescription(pageId, items) {
  const item = items.find((navItem) => navItem.id === pageId || navItem.key === pageId)
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
    return getAllowedViews(profile?.role)
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
              const active = activeModule === item.id || activeModule === item.key

              return (
                <button
                  key={item.id || item.key}
                  type="button"
                  className={`nav-button ${active ? 'active' : ''}`}
                  onClick={() => handleNavigation(item.id || item.key)}
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
            <h2>{getPageTitle(activeModule, visibleNavItems)}</h2>
            <p>{getPageDescription(activeModule, visibleNavItems)}</p>
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