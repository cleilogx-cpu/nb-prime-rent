import { useEffect, useState } from 'react'

/** Devolve `value` só depois de `delay` ms sem mudar (evita uma consulta por tecla digitada). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
