import { createContext, useContext } from 'react'
import { EMPTY_SETTINGS } from '../services/settingsService.js'

export const CompanyContext = createContext({
  settings: EMPTY_SETTINGS,
  displayName: '',
  isAdmin: false,
  reload: async () => {},
})

export function useCompany() {
  return useContext(CompanyContext)
}
