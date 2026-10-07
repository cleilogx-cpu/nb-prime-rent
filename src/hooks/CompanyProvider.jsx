import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from './useAuth.jsx'
import { CompanyContext } from './useCompany.js'
import { EMPTY_SETTINGS, getCompanySettings, isAdminUser } from '../services/settingsService.js'

/**
 * Configurações da empresa (nome no topo do sistema etc.) carregadas uma
 * vez depois do login e atualizadas quando o administrador salva.
 */
export function CompanyProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [settings, setSettings] = useState(EMPTY_SETTINGS)

  const reload = useCallback(async () => {
    const { data } = await getCompanySettings()
    setSettings(data)
  }, [])

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    let cancelled = false
    getCompanySettings().then(({ data }) => {
      if (!cancelled) {
        setSettings(data)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = useMemo(
    () => ({
      settings,
      displayName: (settings.company_trade_name || settings.company_name || '').trim(),
      isAdmin: isAdminUser(user),
      reload,
    }),
    [settings, user, reload],
  )

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
}
