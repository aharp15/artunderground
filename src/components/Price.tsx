'use client'

import { useCurrency } from '@/hooks/useCurrency'

export function Price({ gbp }: { gbp: number }) {
  const { format } = useCurrency()
  return <span suppressHydrationWarning>{format(gbp)}</span>
}
