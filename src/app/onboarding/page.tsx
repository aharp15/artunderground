'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'artist' | 'collector' | 'curator'
type Step = 'role' | 'profile' | 'verify' | 'specific' | 'terms' | 'done'

const ROLES = [
  { id: 'artist',    icon: 'A', title: 'Artist',           desc: 'List works, enter auctions, build your portfolio' },
  { id: 'collector', icon: 'C', title: 'Collector',         desc: 'Buy, bid, and build private collections' },
  { id: 'curator',   icon: 'G', title: 'Curator / gallery', desc: 'Plan exhibitions, manage artists, host auctions' },
  { id: 'both',      icon: '+', title: 'Artist + collector', desc: 'Create and collect - full access to both sides' },
]

const DISCIPLINES_ARTIST   = ['Painting','Sculpture','Photography','Mixed media','Digital','Printmaking','Ceramics','Textile','Other']
const DISCIPLINES_CURATOR  = ['Contemporary','Modern','Photography','Sculpture','Printmaking','Emerging artists','Mixed']

export default function OnboardingPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,        setStep]        = useState<Step>('role')
  const [role,        setRole]        = useState<string>('artist')
  const [firstName,   setFirstName]   = useState('')
  const [lastName,    setLastName]    = useState('')
  const [displayName, setDisplayName] = useState('')
  const [location,    setLocation]    = useState('')
  const [discipline,  setDiscipline]  = useState('')
  const [bio,         setBio]         = useState('')
  const [agreed,      setAgreed]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [otpSent,     setOtpSent]     = useState(false)
  const [verifyMsg,   setVerifyMsg]   = useState<string | null>(null)

  // Derived roles array
  const rolesArray: Role[] = role === 'both'
    ? ['artist', 'collector']
    : role === 'curator'
    ? ['curator']
    : role === 'collector'
    ? ['collector']
    : ['artist']

  const steps: Step[] = ['role', 'profile', 'verify', 'specific', 'terms', 'done']
  const stepIndex = steps.indexOf(step)
  const stepLabels = ['Role', 'Profile', 'Verify email', getRoleStepLabel(), 'Terms']

  function getRoleStepLabel() {
    if (role === 'collector') return 'Preferences'
    if (role === 'curator')   return 'Gallery'
    return 'Portfolio'
  }

  async function goToVerify() {
    if (!firstName.trim()) { setError('Please enter your first name'); return }
    if (!displayName.trim()) { setError('Please enter a display name'); return }
    setError(null)
    setLoading(true)
    // Send OTP to the user's email (already authenticated via sign up)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setVerifyMsg('We sent a 6-digit code to ' + user.email)
      setOtpSent(true)
    }
    setLoading(false)
    setStep('verify')
  }

  async function createProfile() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim() || `${firstName} ${lastName}`.trim(),
          roles:        rolesArray,
          bio:          bio.trim() || undefined,
          location:     location.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create profile')
        setLoading(false)
        return false
      }
      return true
    } catch {
      setError('Something went wrong')
      setLoading(false)
      return false
    }
  }

  async function handleFinish() {
    if (!agreed) { setError('Please agree to the terms to continue'); return }
    setLoading(true)
    const ok = await createProfile()
    if (ok) {
      setStep('done')
      setLoading(false)
    }
  }

  const progress = Math.round((stepIndex / (steps.length - 1)) * 100)

  // Step: role
  if (step === 'role') return (
    <Shell>
      <StepTag>Welcome</StepTag>
      <h1 className='text-xl font-medium text-gray-900 mb-2'>How will you use ArtUNDERGROUND?</h1>
      <p className='text-gray-500 text-sm mb-6'>Pick your role. You can add more later.</p>
      <div className='grid grid-cols-2 gap-3 mb-5'>
        {ROLES.map(r => (
          <button key={r.id} onClick={() => setRole(r.id)}
            className={[
              'text-left p-4 rounded-xl border-2 transition-colors',
              role === r.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
            ].join(' ')}>
            <div className='w-8 h-8 rounded-lg bg-purple-100 text-purple-600 font-bold text-sm flex items-center justify-center mb-2'>
              {r.icon}
            </div>
            <div className='font-medium text-gray-900 text-sm'>{r.title}</div>
            <div className='text-xs text-gray-500 mt-1'>{r.desc}</div>
          </button>
        ))}
      </div>
      <div className='bg-purple-50 rounded-xl p-3 text-xs text-purple-700 mb-5'>
        <strong>Free to join.</strong> We earn only when you do - 8% on direct sales, 12% on auction lots. Buyer's premium confirmed before each auction.
      </div>
      <NavRow
        onNext={() => setStep('profile')}
        nextLabel='Continue'
        showBack={false}
      />
    </Shell>
  )

  // Step: profile
  if (step === 'profile') return (
    <Shell progress={progress} stepLabels={stepLabels} stepIndex={1}>
      <StepTag>Step 2 of 5 - Profile</StepTag>
      <h1 className='text-xl font-medium text-gray-900 mb-1'>
        {role === 'curator' ? 'Set up your gallery profile' : 'Build your profile'}
      </h1>
      <p className='text-gray-500 text-sm mb-6'>This is your public page on ArtUNDERGROUND.</p>

      {error && <ErrorBox msg={error} />}

      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-3'>
          <Field label='First name' value={firstName} onChange={setFirstName} placeholder='e.g. Yara' />
          <Field label='Last name'  value={lastName}  onChange={setLastName}  placeholder='e.g. Mohammed' />
        </div>
        <Field
          label={role === 'curator' ? 'Gallery / institution name' : 'Display name'}
          value={displayName} onChange={setDisplayName}
          placeholder={role === 'curator' ? 'e.g. The Whitechapel Collective' : 'How you appear to collectors'}
        />
        <div className='grid grid-cols-2 gap-3'>
          <Field label='City' value={location} onChange={setLocation} placeholder='e.g. London' />
          <div>
            <label className='block text-xs font-medium text-gray-600 mb-1.5'>
              {role === 'curator' ? 'Focus area' : 'Discipline'}
            </label>
            <select value={discipline} onChange={e => setDiscipline(e.target.value)}
              className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 bg-white text-gray-700'>
              <option value=''>Select...</option>
              {(role === 'curator' ? DISCIPLINES_CURATOR : DISCIPLINES_ARTIST).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className='block text-xs font-medium text-gray-600 mb-1.5'>
            {role === 'artist' || role === 'both' ? 'Artist statement' : role === 'curator' ? 'Gallery description' : 'Collecting interests (optional)'}
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            placeholder={
              role === 'collector'
                ? 'What draws you to art? Curators use this to recommend works.'
                : role === 'curator'
                ? 'Describe your programme, focus, and the artists you work with'
                : 'Tell collectors and curators who you are'
            }
            className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-purple-400' />
        </div>
      </div>

      <NavRow
        onBack={() => setStep('role')}
        onNext={goToVerify}
        nextLabel={loading ? 'Please wait...' : 'Continue'}
        disabled={loading}
      />
    </Shell>
  )

  // Step: verify email
  if (step === 'verify') return (
    <Shell progress={progress} stepLabels={stepLabels} stepIndex={2}>
      <StepTag>Step 3 of 5 - Verify email</StepTag>
      <div className='text-center py-4'>
        <div className='w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4 text-2xl'>
          @
        </div>
        <h1 className='text-xl font-medium text-gray-900 mb-2'>Check your inbox</h1>
        <p className='text-gray-500 text-sm mb-6'>
          {verifyMsg ?? 'We sent a confirmation to your email address.'}
        </p>
        <div className='bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-6'>
          For the prototype - your email was verified at sign up. Click Continue to proceed.
        </div>
      </div>
      <NavRow
        onBack={() => setStep('profile')}
        onNext={() => setStep('specific')}
        nextLabel='Continue'
        skipLabel='Skip'
        onSkip={() => setStep('specific')}
      />
    </Shell>
  )

  // Step: role-specific
  if (step === 'specific') return (
    <Shell progress={progress} stepLabels={stepLabels} stepIndex={3}>
      <StepTag>Step 4 of 5 - {getRoleStepLabel()}</StepTag>
      <h1 className='text-xl font-medium text-gray-900 mb-1'>
        {role === 'collector' ? 'Set your collecting preferences'
         : role === 'curator' ? 'Start your first collection'
         : 'Add your first works'}
      </h1>
      <p className='text-gray-500 text-sm mb-6'>
        {role === 'collector' ? 'Help us surface the right works and auctions for you.'
         : role === 'curator' ? 'Create a curated collection to showcase on your gallery page.'
         : 'Upload up to 6 works to launch your portfolio. You can add more after joining.'}
      </p>

      {(role === 'artist' || role === 'both') && (
        <div className='bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center mb-4'>
          <div className='text-2xl mb-2'>+</div>
          <div className='font-medium text-sm text-gray-700 mb-1'>Upload works after joining</div>
          <p className='text-xs text-gray-400'>You will be taken straight to your portfolio after setup. You can upload images from there.</p>
        </div>
      )}

      {role === 'collector' && (
        <div className='space-y-4'>
          <div>
            <label className='block text-xs font-medium text-gray-600 mb-2'>Disciplines you collect</label>
            <div className='grid grid-cols-3 gap-2'>
              {['Painting','Sculpture','Photography','Digital','Mixed media','Ceramics'].map(d => (
                <button key={d} className='text-xs border border-gray-200 rounded-lg px-3 py-2 hover:border-purple-300 hover:text-purple-600 transition-colors'>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Field label='Artists or movements you follow' value='' onChange={() => {}} placeholder='e.g. post-war British, contemporary African' />
        </div>
      )}

      {role === 'curator' && (
        <div className='space-y-4'>
          <Field label='Collection name' value='' onChange={() => {}} placeholder='e.g. Summer Show 2026' />
          <div>
            <label className='block text-xs font-medium text-gray-600 mb-1.5'>Collection type</label>
            <select className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700 focus:outline-none focus:border-purple-400'>
              <option>Thematic exhibition</option>
              <option>Artist solo show</option>
              <option>Group show</option>
              <option>Auction catalogue</option>
            </select>
          </div>
        </div>
      )}

      <div className='mt-4 space-y-2 text-xs text-gray-400'>
        {['Visible to collectors on day one','Each work gets a shareable provenance record','Mark any work as available for auction'].map(p => (
          <div key={p} className='flex items-center gap-2'>
            <div className='w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0' />
            {p}
          </div>
        ))}
      </div>

      <NavRow
        onBack={() => setStep('verify')}
        onNext={() => setStep('terms')}
        nextLabel='Continue'
        skipLabel='Skip for now'
        onSkip={() => setStep('terms')}
      />
    </Shell>
  )

  // Step: terms
  if (step === 'terms') return (
    <Shell progress={progress} stepLabels={stepLabels} stepIndex={4}>
      <StepTag>Step 5 of 5 - Fees and terms</StepTag>
      <h1 className='text-xl font-medium text-gray-900 mb-1'>Transparent from the start</h1>
      <p className='text-gray-500 text-sm mb-5'>No surprises. We earn only when you do.</p>

      {error && <ErrorBox msg={error} />}

      <div className='bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm'>
        {(rolesArray.includes('artist') || rolesArray.includes('curator')) && <>
          <FeeRow label='Direct sale commission'   value='8%' />
          <FeeRow label='Auction lot fee'           value='12%' />
        </>}
        {rolesArray.includes('collector') && (
          <FeeRow label="Buyer's premium per auction" value='TBC - confirmed before each auction' highlight />
        )}
        <div className='border-t border-gray-200 my-2' />
        <FeeRow label='Monthly subscription' value='Free' green />
        <FeeRow label='Portfolio listing'    value='Free' green />
        {rolesArray.includes('artist') && (
          <>
            <div className='border-t border-gray-200 my-2' />
            <div className='flex justify-between text-xs text-gray-500'>
              <span>Example: GBP 2,000 sale - you receive</span>
              <span className='font-medium text-green-600'>GBP 1,840</span>
            </div>
          </>
        )}
      </div>

      <label className='flex items-start gap-3 cursor-pointer mb-3'>
        <input type='checkbox' checked={agreed} onChange={e => setAgreed(e.target.checked)}
          className='mt-0.5 flex-shrink-0 accent-purple-500' />
        <span className='text-sm text-gray-600'>
          I understand the fee structure and agree to the{' '}
          <span className='text-purple-500'>platform terms</span> and{' '}
          <span className='text-purple-500'>privacy policy</span>
        </span>
      </label>

      <NavRow
        onBack={() => setStep('specific')}
        onNext={handleFinish}
        nextLabel={loading ? 'Creating account...' : 'Create my account'}
        disabled={loading}
      />
    </Shell>
  )

  // Step: done
  if (step === 'done') return (
    <Shell>
      <div className='text-center py-6'>
        <div className='w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-2xl'>
          ok
        </div>
        <h1 className='text-xl font-medium text-gray-900 mb-2'>
          Welcome to ArtUNDERGROUND
        </h1>
        <p className='text-gray-500 text-sm mb-8'>
          {rolesArray.includes('artist')
            ? 'Your profile is live. Upload your first work to appear on the marketplace.'
            : rolesArray.includes('curator')
            ? 'Your gallery is ready. Start building exhibitions and discovering artists.'
            : 'Your collector profile is set up. Browse works and start bidding.'}
        </p>
        <div className='flex flex-col gap-3 max-w-xs mx-auto'>
          <button onClick={() => router.push('/dashboard')}
            className='w-full bg-purple-500 text-white py-3 rounded-xl text-sm font-medium hover:bg-purple-600'>
            Go to my dashboard
          </button>
          {rolesArray.includes('artist') && (
            <button onClick={() => router.push('/portfolio/upload')}
              className='w-full border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:border-gray-300'>
              Upload my first work
            </button>
          )}
          <button onClick={() => router.push('/')}
            className='text-gray-400 text-sm hover:text-gray-600'>
            Explore the marketplace
          </button>
        </div>
      </div>
    </Shell>
  )

  return null
}

// ── Sub-components ────────────────────────────────────────────────

function Shell({ children, progress, stepLabels, stepIndex }: {
  children: React.ReactNode
  progress?: number
  stepLabels?: string[]
  stepIndex?: number
}) {
  return (
    <div className='min-h-screen bg-black flex flex-col'>
      <nav className='h-14 flex items-center justify-between px-6 flex-shrink-0'>
        <a href='/' className='text-white font-medium tracking-wide text-sm'>
          art<span className='text-purple-400'>UNDERGROUND</span>
        </a>
        {stepLabels && stepIndex !== undefined && (
          <span className='text-gray-500 text-xs'>
            {stepLabels[stepIndex - 1] ?? ''}
          </span>
        )}
      </nav>

      {progress !== undefined && (
        <div className='h-0.5 bg-gray-800'>
          <div className='h-full bg-purple-500 transition-all duration-500' style={{ width: progress + '%' }} />
        </div>
      )}

      {stepLabels && (
        <div className='flex justify-center gap-1 px-6 py-3'>
          {stepLabels.map((label, i) => (
            <div key={label} className='flex items-center gap-1'>
              <div className={[
                'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                stepIndex !== undefined && i < stepIndex - 1  ? 'bg-green-500 text-white' :
                stepIndex !== undefined && i === stepIndex - 1 ? 'bg-purple-500 text-white' :
                'bg-gray-800 text-gray-500'
              ].join(' ')}>
                {stepIndex !== undefined && i < stepIndex - 1 ? 'v' : i + 1}
              </div>
              <span className={[
                'text-xs hidden sm:block',
                stepIndex !== undefined && i === stepIndex - 1 ? 'text-purple-400' : 'text-gray-600'
              ].join(' ')}>
                {label}
              </span>
              {i < stepLabels.length - 1 && <div className='w-4 h-px bg-gray-700 mx-1' />}
            </div>
          ))}
        </div>
      )}

      <div className='flex-1 flex items-start justify-center px-4 py-6 overflow-y-auto'>
        <div className='w-full max-w-md bg-white rounded-2xl p-6 shadow-sm'>
          {children}
        </div>
      </div>
    </div>
  )
}

function StepTag({ children }: { children: React.ReactNode }) {
  return <div className='text-xs font-medium text-purple-500 tracking-wide mb-2'>{children}</div>
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className='block text-xs font-medium text-gray-600 mb-1.5'>{label}</label>
      <input type='text' value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className='w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400' />
    </div>
  )
}

function FeeRow({ label, value, green, highlight }: { label: string; value: string; green?: boolean; highlight?: boolean }) {
  return (
    <div className='flex justify-between text-sm'>
      <span className='text-gray-500'>{label}</span>
      <span className={green ? 'text-green-600 font-medium' : highlight ? 'text-amber-600' : 'font-medium text-gray-800'}>
        {value}
      </span>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4'>
      {msg}
    </div>
  )
}

function NavRow({ onBack, onNext, nextLabel, showBack = true, disabled, skipLabel, onSkip }: {
  onBack?: () => void
  onNext: () => void
  nextLabel: string
  showBack?: boolean
  disabled?: boolean
  skipLabel?: string
  onSkip?: () => void
}) {
  return (
    <div className='flex items-center justify-between mt-6 pt-5 border-t border-gray-100'>
      <div>
        {showBack && onBack && (
          <button onClick={onBack} className='text-sm text-gray-400 hover:text-gray-600'>
            Back
          </button>
        )}
      </div>
      <div className='flex items-center gap-3'>
        {skipLabel && onSkip && (
          <button onClick={onSkip} className='text-sm text-gray-400 hover:text-gray-500'>
            {skipLabel}
          </button>
        )}
        <button onClick={onNext} disabled={disabled}
          className='bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors'>
          {nextLabel}
        </button>
      </div>
    </div>
  )
}
