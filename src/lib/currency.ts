export function timezoneToCode(tz: string): string {
  if (tz.startsWith('America/')) {
    if (/Toronto|Vancouver|Winnipeg|Halifax|St_Johns|Edmonton|Regina|Moncton|Whitehorse|Yellowknife/.test(tz)) return 'CAD'
    if (/Sao_Paulo|Manaus|Recife|Fortaleza|Belem|Porto_Velho/.test(tz)) return 'BRL'
    if (/Mexico_City|Monterrey|Merida|Cancun|Tijuana|Chihuahua/.test(tz)) return 'MXN'
    if (/Argentina/.test(tz)) return 'ARS'
    return 'USD'
  }
  if (tz.startsWith('Europe/')) {
    if (/London|Belfast|Guernsey|Jersey|Isle_of_Man/.test(tz)) return 'GBP'
    if (/Zurich|Geneva|Bern/.test(tz)) return 'CHF'
    if (/Stockholm/.test(tz)) return 'SEK'
    if (/Oslo/.test(tz)) return 'NOK'
    if (/Copenhagen/.test(tz)) return 'DKK'
    if (/Warsaw|Krakow/.test(tz)) return 'PLN'
    if (/Budapest/.test(tz)) return 'HUF'
    if (/Prague|Bratislava/.test(tz)) return 'CZK'
    if (/Bucharest/.test(tz)) return 'RON'
    return 'EUR'
  }
  if (tz.startsWith('Asia/')) {
    if (/Tokyo|Osaka/.test(tz)) return 'JPY'
    if (/Shanghai|Chongqing|Harbin|Urumqi|Kashgar/.test(tz)) return 'CNY'
    if (/Hong_Kong/.test(tz)) return 'HKD'
    if (/Singapore/.test(tz)) return 'SGD'
    if (/Seoul/.test(tz)) return 'KRW'
    if (/Dubai|Muscat/.test(tz)) return 'AED'
    if (/Kolkata|Calcutta|Mumbai|Delhi|Chennai|Hyderabad/.test(tz)) return 'INR'
    if (/Riyadh|Kuwait/.test(tz)) return 'SAR'
    if (/Bangkok|Phnom_Penh|Vientiane/.test(tz)) return 'THB'
    if (/Jakarta|Pontianak|Makassar|Jayapura/.test(tz)) return 'IDR'
    if (/Manila/.test(tz)) return 'PHP'
    if (/Kuala_Lumpur|Kuching/.test(tz)) return 'MYR'
    if (/Taipei/.test(tz)) return 'TWD'
    if (/Jerusalem|Tel_Aviv/.test(tz)) return 'ILS'
    if (/Karachi|Lahore/.test(tz)) return 'PKR'
    return 'USD'
  }
  if (tz.startsWith('Australia/')) return 'AUD'
  if (tz.startsWith('Pacific/')) {
    if (/Auckland|Fiji/.test(tz)) return 'NZD'
    return 'USD'
  }
  if (tz.startsWith('Africa/')) {
    if (/Johannesburg|Maseru|Mbabane/.test(tz)) return 'ZAR'
    if (/Lagos|Kano/.test(tz)) return 'NGN'
    if (/Cairo|Alexandria/.test(tz)) return 'EGP'
    if (/Nairobi|Kampala|Dar_es_Salaam/.test(tz)) return 'KES'
    return 'USD'
  }
  return 'GBP'
}

let rateCache: { rates: Record<string, number>; fetchedAt: number } | null = null

export async function fetchRatesFromGBP(): Promise<Record<string, number>> {
  const now = Date.now()
  if (rateCache && now - rateCache.fetchedAt < 3_600_000) return rateCache.rates
  try {
    const res  = await fetch('https://open.er-api.com/v6/latest/GBP')
    const data = await res.json()
    rateCache  = { rates: data.rates as Record<string, number>, fetchedAt: now }
    return rateCache.rates
  } catch {
    return rateCache?.rates ?? { GBP: 1 }
  }
}

export function formatCurrency(amount: number, code: string): string {
  return new Intl.NumberFormat(undefined, {
    style:                 'currency',
    currency:              code,
    maximumFractionDigits: ['JPY', 'KRW', 'IDR', 'CLP', 'VND'].includes(code) ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount)
}
