import React, { createContext, useContext } from 'react'

const AppContext = createContext(null)

export function AppProvider({ children, value }) {
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppStore() {
  const context = useContext(AppContext)

  if (!context) {
    return {
      session: null,
      user: null,
      profile: null,
      assignedCells: [],
      activeCell: null,
      activeCellId: '',
      setActiveCellId: () => {},
      refreshAssignedCells: () => {},
      theme: 'light',
      setTheme: () => {},
      toggleTheme: () => {}
    }
  }

  return context
}