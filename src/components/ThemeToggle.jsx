import React from 'react'
import { useAppStore } from '../context/AppContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${isDark ? 'dark-active' : ''}`}
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <span className="material-symbols-rounded" aria-hidden="true">
        {isDark ? 'dark_mode' : 'light_mode'}
      </span>

      <span className="theme-toggle-text">
        {isDark ? 'Modo oscuro' : 'Modo claro'}
      </span>
    </button>
  )
}