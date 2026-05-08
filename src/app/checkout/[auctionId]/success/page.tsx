import { SiteNav } from '@/components/SiteNav'
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <SiteNav />
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '48px 32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0a1f18', border: '0.5px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '24px' }}>
            ✓
          </div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: 500, marginBottom: '8px' }}>Payment confirmed</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '28px' }}>
            Your purchase is complete. The seller will be in touch to arrange delivery.
          </p>
          <Link href='/dashboard'
            style={{ display: 'inline-block', padding: '10px 24px', background: 'var(--purple)', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
