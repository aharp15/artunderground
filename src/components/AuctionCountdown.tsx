'use client'

import { useEffect, useState } from 'react'

export function AuctionCountdown({ closesAt }: { closesAt: string }) {
  const [display, setDisplay] = useState('--:--:--')

  useEffect(() => {
    function tick() {
      const diff = new Date(closesAt).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Ended'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0')
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [closesAt])

  return (
    <div style={{ color: '#D85A30', fontSize: '13px', fontWeight: 500, marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </div>
  )
}
