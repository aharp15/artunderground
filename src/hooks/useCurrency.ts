'use client'

import { useState, useEffect } from 'react'
import { timezoneToCode, fetchRatesFromGBP, formatCurrency } from '@/lib/currency'

export function useCurrency() {
  const [code, setCode] = useState('GBP')
  const [rate, setRate] = useState(1)

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const c  = timezoneToCode(tz)
    setCode(c)
    if (c !== 'GBP') {
      fetchRatesFromGBP().then(rates => {
        if (rates[c]) setRate(rates[c])
      })
    }
  }, [])

  function format(gbp: number): string {
    return formatCurrency(gbp * rate, code)
  }

  return { code, rate, format }
}
