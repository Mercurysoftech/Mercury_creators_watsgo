import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  registerCreator,
  loginCreator,
  verifyOtp,
  resendOtp,
  logout,
  getStoredUser,
  type AuthUser,
} from './api/auth'

type View =
  | 'overview'
  | 'products'
  | 'product-detail'
  | 'campaigns'
  | 'campaign-detail'
  | 'my-campaigns'
  | 'links'
  | 'link-analytics'
  | 'storefront'
  | 'orders'
  | 'order-detail'
  | 'earnings'
  | 'wallet'
  | 'payouts'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'support'

const path = (d: string, props: Record<string, string | number> = {}) => (
  <path d={d} {...props} />
)

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const icons: Record<string, ReactNode> = {
    grid: path('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
    search: <><circle cx="11" cy="11" r="7" />{path('m20 20-4-4')}</>,
    box: <><rect x="3" y="5" width="18" height="14" rx="2" />{path('M3 10h18M8 5v14')}</>,
    megaphone: <>{path('m3 11 15-6v14L3 13zM11 16l1 5H7l-1-7')}</>,
    link: <>{path('M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1')}</>,
    store: <>{path('M3 9h18l-2-5H5zM5 9v11h14V9M9 20v-6h6v6')}</>,
    chart: <>{path('M4 20V10M10 20V4M16 20v-7M22 20H2')}</>,
    cart: <>{path('M3 4h2l2 11h11l2-7H6M9 20h.01M17 20h.01')}</>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" />{path('M16 13h5M3 9h14')}</>,
    bell: <>{path('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4')}</>,
    user: <><circle cx="12" cy="8" r="4" />{path('M4 21a8 8 0 0 1 16 0')}</>,
    help: <><circle cx="12" cy="12" r="9" />{path('M9.5 9a2.7 2.7 0 1 1 3.5 2.6c-.8.35-1 1-1 2M12 17h.01')}</>,
    logout: <>{path('M10 5H5v14h5M14 8l4 4-4 4M8 12h10')}</>,
    arrow: path('m9 18 6-6-6-6'),
    check: path('m5 12 4 4L19 6'),
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    menu: path('M4 7h16M4 12h16M4 17h16'),
    close: path('m6 6 12 12M18 6 6 18'),
    plus: path('M12 5v14M5 12h14'),
    eye: <>{path('M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12')}<circle cx="12" cy="12" r="2.5" /></>,
    filter: path('M4 5h16l-6 7v6l-4 2v-8z'),
    download: path('M12 3v12m0 0 4-4m-4 4-4-4M5 21h14'),
    settings: <><circle cx="12" cy="12" r="3" />{path('M19 13.5v-3l2-1-2-3.5-2.2.7-2.6-1.5L14 3h-4l-.2 2.2-2.6 1.5L5 6 3 9.5l2 1v3l-2 1L5 18l2.2-.7 2.6 1.5L10 21h4l.2-2.2 2.6-1.5 2.2.7 2-3.5z')}</>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name] || icons.grid}</svg>
}

function Logo({ dark = false }: { dark?: boolean }) {
  return <button className="logo" onClick={() => location.reload()} aria-label="WatsGo home">
    <span className="logo-mark">W</span>
    <span><b style={{ color: dark ? 'white' : undefined }}>WatsGo</b><small style={{ color: dark ? '#93a4bd' : undefined }}>CREATOR HUB</small></span>
  </button>
}

const Button = ({ children, kind = 'primary', onClick, icon, type = 'button', disabled = false }: {
  children: ReactNode; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; onClick?: () => void; icon?: string; type?: 'button' | 'submit'; disabled?: boolean
}) => <button type={type} className={`btn ${kind}`} onClick={onClick} disabled={disabled}>{icon && <Icon name={icon} size={17} />} {children}</button>

function Landing({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const categories = ['Fashion', 'Beauty', 'Technology', 'Fitness', 'Home & Living', 'Travel']
  return <div className="landing">
    <header className="public-nav"><Logo /><nav><a href="#how">How it works</a><a href="#discover">Discover products</a><a href="#benefits">Creator benefits</a><a href="#faq">FAQ</a></nav><div className="nav-actions"><Button kind="ghost" onClick={onLogin}>Log in</Button><Button onClick={onStart}>Join as creator <Icon name="arrow" size={16} /></Button></div></header>
    <main>
      <section className="hero">
        <div className="hero-copy"><span className="eyebrow">THE SMARTER WAY TO MONETIZE</span><h1>Turn your content<br />into <em>income.</em></h1><p>Discover products your audience will love, share trackable smart links, and earn every time your influence drives a sale.</p><div className="hero-actions"><Button onClick={onStart}>Start earning today <Icon name="arrow" size={17} /></Button><Button kind="secondary" onClick={() => document.querySelector('#how')?.scrollIntoView()}>See how it works</Button></div><div className="trust-row"><span className="avatars">MK</span><span><b>12,000+ creators</b><small>already earning with WatsGo</small></span></div></div>
        <div className="hero-dashboard">
          <div className="float-card float-one"><span className="success-dot">↑</span><div><small>Commission earned</small><b>₹18,420</b></div></div>
          <div className="mock-window"><div className="mock-top"><Logo /><span>•••</span></div><div className="mock-body"><div className="mock-side" /><div className="mock-content"><small>GOOD MORNING, PRIYA</small><h3>Your influence is growing.</h3><div className="mock-metrics"><span><small>Total earnings</small><b>₹48,260</b><i>+18.2%</i></span><span><small>Clicks</small><b>24.8K</b><i>+12.4%</i></span><span><small>Orders</small><b>1,284</b><i>+8.7%</i></span></div><div className="mock-chart"><svg viewBox="0 0 500 130" preserveAspectRatio="none"><defs><linearGradient id="blueFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".25" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs><path d="M0 110 C55 95,80 100,120 72 S190 95,225 55 S290 74,330 36 S410 55,500 15 V130 H0Z" fill="url(#blueFade)" /><path d="M0 110 C55 95,80 100,120 72 S190 95,225 55 S290 74,330 36 S410 55,500 15" fill="none" stroke="#2563eb" strokeWidth="4" /></svg></div></div></div></div>
          <div className="float-card float-two"><Icon name="link" /><div><small>Smart link generated</small><b>watsgo.in/s/priya24</b></div><Icon name="check" /></div>
        </div>
      </section>
      <section className="brand-strip"><span>Built for creators on</span><b>Instagram</b><b>YouTube</b><b>WhatsApp</b><b>Telegram</b><b>Facebook</b><b>Websites</b></section>
      <section className="how" id="how"><div className="section-title"><span className="eyebrow">SIMPLE BY DESIGN</span><h2>From content to commission<br />in four easy steps.</h2><p>No complex tools. No spreadsheets. Just your content and products your audience already wants.</p></div><div className="steps">{[['search', 'Discover', 'Find high-converting products from trusted brands.'], ['link', 'Promote', 'Create smart links tailored to every channel.'], ['chart', 'Track', 'See every click, order and commission live.'], ['wallet', 'Earn', 'Withdraw your earnings securely, on time.']].map((x, i) => <article key={x[1]}><span className="step-number">0{i + 1}</span><div className="step-icon"><Icon name={x[0]} /></div><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></section>
      <section className="category-section" id="discover"><div className="category-copy"><span className="eyebrow">YOUR NICHE, YOUR CHOICE</span><h2>Products worth<br />talking about.</h2><p>Curated products, transparent commissions, and brands that value your influence.</p><Button onClick={onStart}>Explore marketplace</Button></div><div className="product-collage"><img src="/watsgo-products.png" alt="Curated creator products" /><div className="category-tags">{categories.map(x => <span key={x}>{x}</span>)}</div></div></section>
      <section className="benefits" id="benefits"><div className="section-title"><span className="eyebrow">BUILT AROUND YOU</span><h2>More than links. A creator business.</h2></div><div className="benefit-grid"><article><Icon name="chart" size={27} /><h3>Clear, real-time attribution</h3><p>Know what converts with link, channel and campaign-level reporting.</p></article><article><Icon name="wallet" size={27} /><h3>Transparent payouts</h3><p>Track every rupee from pending commission to your bank account.</p></article><article><Icon name="store" size={27} /><h3>Your own storefront</h3><p>Build a beautiful, shoppable home for everything you recommend.123</p></article></div></section>
      <section className="quote"><blockquote>“WatsGo turned the content I was already making into a reliable income stream. The analytics make it so easy to see what my audience loves.”</blockquote><p><b>Priya Malhotra</b> · Lifestyle creator, 184K followers</p></section>
      <section className="faq" id="faq"><div><span className="eyebrow">QUESTIONS, ANSWERED</span><h2>Everything you need to know.</h2></div><div>{['Who can join WatsGo Creator Hub?', 'How and when do I get paid?', 'What is a WatsGo Smart Link?', 'Do I need a minimum follower count?'].map((x, i) => <details key={x} open={i === 0}><summary>{x}<Icon name="plus" /></summary><p>{i === 0 ? 'Anyone creating quality content with an engaged audience can apply. We welcome creators across every platform and niche.' : 'Find full details in our creator help center. Our support team is always here to help.'}</p></details>)}</div></section>
      <section className="final-cta"><span className="eyebrow">YOUR NEXT POST COULD PAY</span><h2>Ready to turn influence<br />into income?</h2><p>Join thousands of creators building sustainable businesses with WatsGo.</p><Button onClick={onStart}>Create your free account <Icon name="arrow" /></Button></section>
    </main>
    <footer><Logo dark /><p>Create. Share. Earn.</p><div><a>Terms</a><a>Privacy</a><a>Support</a><a>Contact</a></div><small>© 2025 WatsGo Technologies</small></footer>
  </div>
}

function Auth({
  mode,
  setMode,
  onDone,
}: {
  mode: 'login' | 'register'
  setMode: (m: 'login' | 'register') => void
  onDone: (user?: AuthUser) => void
}) {
  const [show, setShow] = useState(false)
  const [otp, setOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fullName, setFullName] = useState('Priya Malhotra')
  const [mobile, setMobile] = useState('9876543210')
  const [email, setEmail] = useState('priya@email.com')
  const [password, setPassword] = useState('Password123!')
  const [rememberMe, setRememberMe] = useState(true)
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [otpDigits, setOtpDigits] = useState(['4', '8', '2', '7', '1', '6'])
  const [otpPreview, setOtpPreview] = useState('')
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    if (!otp || countdown <= 0) return
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [otp, countdown])

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.')
      return
    }
    setLoading(true)
    try {
      const res = await registerCreator({
        full_name: fullName,
        email,
        mobile_number: mobile,
        password,
      })
      setLoading(false)
      if (res.requires_otp) {
        if (res.otp_preview) {
          setOtpPreview(res.otp_preview)
          setOtpDigits(res.otp_preview.split(''))
        }
        setOtp(true)
        setCountdown(30)
      }
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await loginCreator({
        email,
        password,
        remember_me: rememberMe,
      })
      setLoading(false)
      if (res.requires_otp) {
        if (res.otp_preview) {
          setOtpPreview(res.otp_preview)
          setOtpDigits(res.otp_preview.split(''))
        }
        setOtp(true)
        setCountdown(30)
      } else if (res.user) {
        onDone(res.user)
      }
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  const handleVerifySubmit = async () => {
    setError('')
    const code = otpDigits.join('')
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP code.')
      return
    }
    setLoading(true)
    try {
      const res = await verifyOtp({
        email,
        otp_code: code,
      })
      setLoading(false)
      if (res.user) {
        onDone(res.user)
      }
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'OTP verification failed. Please try again.')
    }
  }

  const handleResend = async () => {
    if (countdown > 0) return
    setError('')
    try {
      const res = await resendOtp(email)
      if (res.otp_preview) {
        setOtpPreview(res.otp_preview)
        setOtpDigits(res.otp_preview.split(''))
      }
      setCountdown(30)
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.')
    }
  }

  const handleOtpDigit = (idx: number, val: string) => {
    const digit = val.slice(-1)
    const copy = [...otpDigits]
    copy[idx] = digit
    setOtpDigits(copy)
    if (digit && idx < 5) {
      const nextEl = document.getElementById(`otp-box-${idx + 1}`)
      nextEl?.focus()
    }
  }

  if (otp)
    return (
      <div className="auth-page">
        <div className="auth-brand">
          <Logo dark />
          <div>
            <span className="eyebrow">ONE LAST STEP</span>
            <h1>
              Verify your
              <br />
              creator account.
            </h1>
            <p>Secure access. Trusted creators. Better partnerships.</p>
          </div>
        </div>
        <div className="auth-panel">
          <button
            className="back-link"
            onClick={() => {
              setOtp(false)
              setError('')
            }}
          >
            ← Back
          </button>
          <div className="auth-box">
            <div className="auth-icon">
              <Icon name="bell" />
            </div>
            <h2>Check your inbox</h2>
            <p>
              We sent a 6-digit verification code to <b>{email}</b>
            </p>

            {otpPreview && (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  margin: '14px 0 0',
                }}
              >
                💡 Live OTP code: <b>{otpPreview}</b>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  marginTop: '12px',
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div className="otp-row">
              {otpDigits.map((x, i) => (
                <input
                  key={i}
                  id={`otp-box-${i}`}
                  value={x}
                  onChange={(e) => handleOtpDigit(i, e.target.value)}
                  maxLength={1}
                />
              ))}
            </div>

            <Button onClick={handleVerifySubmit} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & continue'}
            </Button>

            <small>
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0}
                style={{ cursor: countdown > 0 ? 'not-allowed' : 'pointer', opacity: countdown > 0 ? 0.7 : 1 }}
              >
                {countdown > 0 ? `Resend in 00:${countdown < 10 ? '0' : ''}${countdown}` : 'Resend OTP'}
              </button>
            </small>
          </div>
        </div>
      </div>
    )

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <Logo dark />
        <div>
          <span className="eyebrow">
            {mode === 'register' ? 'JOIN THE CREATOR ECONOMY' : 'WELCOME BACK'}
          </span>
          <h1>
            {mode === 'register'
              ? 'Your content has value. Start earning from it.'
              : 'Your creator business, all in one place.'}
          </h1>
          <p>Join thousands of creators earning from the products they genuinely recommend.</p>
          <div className="auth-proof">
            <b>₹8.4Cr+</b>
            <span>paid to creators</span>
            <b>2.8M+</b>
            <span>orders attributed</span>
          </div>
        </div>
        <small>Trusted by 12,000+ creators across India</small>
      </div>
      <div className="auth-panel">
        <button className="back-link" onClick={() => location.reload()}>
          ← Back to WatsGo
        </button>
        <form
          className="auth-form"
          onSubmit={mode === 'register' ? handleRegisterSubmit : handleLoginSubmit}
        >
          <h2>{mode === 'register' ? 'Create your creator account' : 'Log in to Creator Hub'}</h2>
          <p>
            {mode === 'register'
              ? 'Start for free. No credit card required.'
              : 'Welcome back — let’s keep growing.'}
          </p>

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                margin: '12px 0',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button type="button" className="google-btn">
            <b>G</b> Continue with Google
          </button>
          <div className="or">
            <span>or continue with email</span>
          </div>

          {mode === 'register' && (
            <>
              <label>
                Full name
                <input
                  required
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              <label>
                Mobile number
                <div className="phone">
                  <span>+91</span>
                  <input
                    required
                    placeholder="98765 43210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                  />
                </div>
              </label>
            </>
          )}

          <label>
            Email address
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <div className="password">
              <input
                type={show ? 'text' : 'password'}
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)}>
                <Icon name="eye" />
              </button>
            </div>
          </label>

          {mode === 'login' && (
            <div className="form-row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />{' '}
                Remember me
              </label>
              <button type="button">Forgot password?</button>
            </div>
          )}

          {mode === 'register' && (
            <label className="check">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />{' '}
              I agree to the Terms of Service and Privacy Policy.
            </label>
          )}

          <Button type="submit" disabled={loading}>
            {loading
              ? 'Please wait…'
              : mode === 'register'
                ? 'Create creator account'
                : 'Log in'}
          </Button>

          <p className="switch">
            {mode === 'register' ? 'Already have an account?' : 'New to WatsGo?'}{' '}
            <button
              type="button"
              onClick={() => {
                setError('')
                setMode(mode === 'register' ? 'login' : 'register')
              }}
            >
              {mode === 'register' ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}

const onboardingSteps = ['About you', 'Creator niche', 'Social accounts', 'Your audience', 'Payout details', 'Review']
function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(['Lifestyle', 'Travel'])
  const next = () => step < 5 ? setStep(step + 1) : onDone()
  return <div className="onboarding"><aside><Logo dark /><div className="onboard-progress">{onboardingSteps.map((x, i) => <div className={i === step ? 'active' : i < step ? 'done' : ''} key={x}><span>{i < step ? <Icon name="check" size={14} /> : i + 1}</span><div><b>{x}</b><small>{i < step ? 'Completed' : i === step ? 'In progress' : 'Upcoming'}</small></div></div>)}</div><p>Need help? <button>Chat with support</button></p></aside><main><header><span>STEP {step + 1} OF 6</span><button onClick={onDone}>Save & exit</button></header><div className="onboard-card">{step === 0 && <><h1>Tell us about yourself</h1><p>This helps brands know who they're partnering with.</p><div className="avatar-upload">PM <button><Icon name="plus" size={14} /></button></div><div className="form-grid"><label>Creator display name<input defaultValue="Priya Moves" /></label><label>Full legal name<input defaultValue="Priya Malhotra" /></label><label>Date of birth<input type="date" defaultValue="1996-04-14" /></label><label>Country<select defaultValue="India"><option>India</option></select></label><label>City<input defaultValue="Mumbai" /></label><label>Preferred language<select><option>English</option><option>Hindi</option></select></label><label className="full">Short bio<textarea defaultValue="Lifestyle, mindful travel and everyday wellness." /></label></div></>}{step === 1 && <><h1>What do you create?</h1><p>Select all categories that reflect your content.</p><div className="niche-grid">{['Fashion', 'Beauty', 'Technology', 'Food', 'Lifestyle', 'Travel', 'Education', 'Fitness', 'Finance', 'Gaming', 'Entertainment', 'Parenting', 'Business', 'Other'].map(x => <button className={selected.includes(x) ? 'selected' : ''} onClick={() => setSelected(selected.includes(x) ? selected.filter(s => s !== x) : [...selected, x])} key={x}>{x}{selected.includes(x) && <Icon name="check" size={15} />}</button>)}</div></>}{step === 2 && <><h1>Connect your channels</h1><p>Add your creator accounts so brands can understand your reach.</p><div className="social-list">{[['Instagram', '@priyamoves', '184K followers', 'Connected'], ['YouTube', 'youtube.com/@priyamoves', '62K subscribers', 'Connected'], ['Telegram', 'Add your channel', '', 'Connect'], ['Website / Blog', 'Add your website', '', 'Add manually']].map(x => <div key={x[0]}><span className="social-logo">{x[0][0]}</span><div><b>{x[0]}</b><small>{x[1]} {x[2] && `· ${x[2]}`}</small></div><Button kind={x[3] === 'Connected' ? 'secondary' : 'primary'}>{x[3]}</Button></div>)}</div></>}{step === 3 && <><h1>Tell us about your audience</h1><p>Help us recommend the most relevant opportunities.</p><div className="form-grid"><label>Audience size<select><option>100K – 250K</option></select></label><label>Primary audience location<select><option>India</option></select></label><label>Primary age range<select><option>18 – 34</option></select></label><label>Content language<select><option>English & Hindi</option></select></label><label>Main platform<select><option>Instagram</option></select></label></div></>}{step === 4 && <><h1>Set up your payouts</h1><p>Your information is encrypted and only used for creator payments.</p><div className="secure-note">🔒 Bank-grade encryption protects your financial details.</div><div className="form-grid"><label>Account holder name<input defaultValue="Priya Malhotra" /></label><label>Bank name<input defaultValue="HDFC Bank" /></label><label>Account number<input type="password" defaultValue="789045621893" /></label><label>Confirm account number<input type="password" defaultValue="789045621893" /></label><label>IFSC code<input defaultValue="HDFC0001234" /></label><label>UPI ID (optional)<input defaultValue="priya@okhdfcbank" /></label></div></>}{step === 5 && <><h1>Your profile is ready</h1><p>Review your details before submitting for verification.</p><div className="profile-preview"><div className="profile-head"><span>PM</span><div><h2>Priya Moves <b>✓</b></h2><p>Lifestyle, mindful travel and everyday wellness.</p></div></div><div className="profile-stats"><span><b>246K</b>Combined audience</span><span><b>2</b>Connected channels</span><span><b>India</b>Primary market</span></div><div className="review-lines"><p><span>Categories</span><b>{selected.join(', ')}</b></p><p><span>Payout account</span><b>HDFC •••• 1893</b></p><p><span>Profile strength</span><b className="green">Excellent · 100%</b></p></div></div></>}<div className="onboard-actions"><Button kind="secondary" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0}>Back</Button><Button onClick={next}>{step === 5 ? 'Submit for verification' : 'Continue'} <Icon name="arrow" /></Button></div></div></main></div>
}

const nav = [
  ['overview', 'grid', 'Overview'], ['products', 'search', 'Discover products'], ['campaigns', 'megaphone', 'Campaign marketplace'], ['my-campaigns', 'box', 'My campaigns'], ['links', 'link', 'My smart links'], ['storefront', 'store', 'My storefront'], ['earnings', 'chart', 'Analytics'], ['orders', 'cart', 'Orders & sales'], ['wallet', 'wallet', 'Earnings & wallet'], ['payouts', 'download', 'Payouts'], ['notifications', 'bell', 'Notifications'], ['profile', 'user', 'Profile & settings'], ['support', 'help', 'Help & support']
] as [View, string, string][]

const products = [
  { name: 'AirBeat Pro Headphones', brand: 'Nova Audio', price: '₹8,999', commission: '14%', earn: '₹1,260', pos: '0% 8%', tag: 'Best seller' },
  { name: 'Glow Ritual Skin Set', brand: 'Aster & Co.', price: '₹2,499', commission: '18%', earn: '₹450', pos: '25% 5%', tag: 'High commission' },
  { name: 'Stride Cloud Runners', brand: 'Aero Athletics', price: '₹5,799', commission: '12%', earn: '₹696', pos: '55% 8%', tag: 'Trending' },
  { name: 'Pulse S2 Smartwatch', brand: 'Orbit Labs', price: '₹6,499', commission: '15%', earn: '₹975', pos: '5% 72%', tag: 'Creator pick' },
  { name: 'Terra Thermal Bottle', brand: 'Terra Home', price: '₹1,299', commission: '20%', earn: '₹260', pos: '52% 55%', tag: '20% commission' },
  { name: 'Frame Mini Camera', brand: 'Lumen', price: '₹42,999', commission: '8%', earn: '₹3,440', pos: '90% 62%', tag: 'Top earning' }
]

function Status({ children, tone = 'green' }: { children: ReactNode; tone?: string }) { return <span className={`status ${tone}`}>{children}</span> }
function Metric({ title, value, change, icon }: { title: string; value: string; change: string; icon: string }) { return <article className="metric"><div><span>{title}</span><b>{value}</b><small>{change}</small></div><i><Icon name={icon} /></i></article> }

function Overview({ go, user }: { go: (v: View) => void; user?: AuthUser | null }) {
  const firstName = user?.full_name?.split(' ')[0] || 'Priya'
  return <><div className="page-heading"><div><span className="eyebrow">TUESDAY, 24 JUNE</span><h1>Welcome back, {firstName}.</h1><p>Here’s how your creator business is performing.</p></div><div><select><option>Last 30 days</option><option>Last 7 days</option><option>Last 90 days</option></select><Button onClick={() => go('products')} icon="plus">Create smart link</Button></div></div><div className="sample-note"><Icon name="help" size={15} /> You’re viewing sample data for this interactive prototype.</div><div className="metrics"><Metric title="Total clicks" value="24,892" change="↑ 12.4% vs last period" icon="search" /><Metric title="Total orders" value="1,284" change="↑ 8.7% vs last period" icon="cart" /><Metric title="Revenue generated" value="₹8.42L" change="↑ 18.2% vs last period" icon="chart" /><Metric title="Commission earned" value="₹48,260" change="↑ 14.8% vs last period" icon="wallet" /></div><div className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><h3>Revenue performance</h3><p>Revenue and commission over time</p></div><div className="legend"><span>● Revenue</span><span>● Commission</span></div></div><div className="big-chart"><div className="chart-y"><span>₹30K</span><span>₹20K</span><span>₹10K</span><span>₹0</span></div><svg viewBox="0 0 700 210" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#2563eb" stopOpacity=".2" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs><path d="M0 180 C50 150 80 170 125 125 S200 150 250 100 S330 120 385 72 S470 105 525 48 S620 80 700 22 V210H0Z" fill="url(#area)" /><path d="M0 180 C50 150 80 170 125 125 S200 150 250 100 S330 120 385 72 S470 105 525 48 S620 80 700 22" fill="none" stroke="#2563eb" strokeWidth="3" /><path d="M0 195 C90 180 130 190 200 165 S330 180 400 145 S540 155 700 115" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6 6" /></svg><div className="chart-x"><span>1 Jun</span><span>7 Jun</span><span>14 Jun</span><span>21 Jun</span><span>24 Jun</span></div></div></article><article className="panel balance-card"><div className="panel-head"><div><h3>Available balance</h3><p>Ready to withdraw</p></div><Icon name="wallet" /></div><b>₹32,840</b><span>₹8,420 pending confirmation</span><Button onClick={() => go('payouts')}>Request payout</Button><small>Next automatic payout: 1 July</small></article></div><div className="dashboard-grid lower"><article className="panel"><div className="panel-head"><div><h3>Top performing products</h3><p>By commission earned</p></div><button onClick={() => go('products')}>View all →</button></div><div className="mini-products">{products.slice(0, 3).map((p, i) => <div key={p.name}><span className="mini-img" style={{ backgroundPosition: p.pos }} /><div><b>{p.name}</b><small>{p.brand}</small></div><span><b>{['₹12,480', '₹8,920', '₹6,760'][i]}</b><small>{['342', '216', '148'][i]} orders</small></span></div>)}</div></article><article className="panel activity"><div className="panel-head"><div><h3>Recent activity</h3><p>Latest updates from your account</p></div></div>{[['cart', 'New order from AirBeat Pro', 'Commission +₹1,260', '2 min'], ['megaphone', 'Campaign application approved', 'Nova Summer Sound', '1 hr'], ['wallet', 'Commission confirmed', 'Order #WG-89241 · +₹450', '3 hr'], ['link', 'Smart link reached 1,000 clicks', 'Summer Travel Essentials', 'Yesterday']].map(x => <div key={x[1]}><i><Icon name={x[0]} size={17} /></i><span><b>{x[1]}</b><small>{x[2]}</small></span><time>{x[3]}</time></div>)}</article></div></>
}

function Products({ go, toast }: { go: (v: View) => void; toast: (s: string) => void }) {
  return <><div className="page-heading"><div><span className="eyebrow">MARKETPLACE</span><h1>Find your next best-seller.</h1><p>Curated products with transparent commissions.</p></div></div><div className="market-tools"><div className="search-box"><Icon name="search" /><input placeholder="Search products, brands or categories…" /></div><Button kind="secondary" icon="filter">Filters</Button><select><option>Recommended</option><option>Highest commission</option><option>Newest</option></select></div><div className="filter-chips">{['All products', 'Lifestyle', 'Beauty', 'Technology', 'Fitness', 'Fashion', 'Travel'].map((x, i) => <button className={i === 0 ? 'active' : ''} key={x}>{x}</button>)}</div><div className="product-grid">{products.map(p => <article className="product-card" key={p.name}><div className="product-image" style={{ backgroundPosition: p.pos }}><Status tone={p.tag.includes('20') ? 'violet' : 'blue'}>{p.tag}</Status><button>♡</button></div><div className="product-info"><small>{p.brand}</small><h3>{p.name}</h3><b>{p.price}</b><div className="commission"><span><small>COMMISSION</small><b>{p.commission}</b></span><span><small>EST. EARNING</small><b>{p.earn}</b></span></div><div className="product-actions"><Button kind="secondary" onClick={() => go('product-detail')}>Details</Button><Button onClick={() => { toast('Smart link created and copied'); go('links') }}>Promote</Button></div></div></article>)}</div></>
}

function ProductDetail({ go, toast }: { go: (v: View) => void; toast: (s: string) => void }) {
  return <><button className="back-page" onClick={() => go('products')}>← Back to marketplace</button><div className="detail-layout"><div className="detail-image" style={{ backgroundPosition: '0% 8%' }}><span>Creator favorite</span></div><div className="detail-copy"><small>NOVA AUDIO · AUDIO</small><h1>AirBeat Pro Headphones</h1><div className="rating">★★★★★ <span>4.8 · 1,248 reviews</span></div><p className="price">₹8,999 <del>₹11,999</del> <Status>25% off</Status></p><p>Immersive over-ear headphones with adaptive noise cancellation, 40-hour battery life and studio-grade sound engineered for life in motion.</p><div className="earning-box"><div><span>Your commission</span><b>14%</b></div><div><span>You earn per sale</span><b>₹1,260</b></div><div><span>Avg. conversion</span><b>5.8%</b></div></div><h3>Why creators love it</h3><ul><li>High audience demand with proven conversion</li><li>30-day attribution window</li><li>Eligible for Nova Summer Sound campaign</li></ul><Button onClick={() => { toast('Smart link watsgo.in/s/priya24 copied'); go('links') }}>Generate smart link <Icon name="arrow" /></Button></div></div><div className="panel rules"><h3>Campaign & promotion details</h3><div><span><b>Nova Summer Sound</b><small>Active until 31 August</small></span><Status>Open campaign</Status></div><div><span><b>Allowed channels</b><small>Instagram, YouTube, WhatsApp, Telegram, Web</small></span></div><div><span><b>Promotion rules</b><small>Paid search and misleading price claims are not permitted. #ad disclosure required.</small></span></div></div></>
}

function Campaigns({ go }: { go: (v: View) => void }) {
  const campaigns = [['Nova Summer Sound', 'Nova Audio', '14%', '31 Aug', 'Open'], ['Glow From Within', 'Aster & Co.', '18%', '15 Sep', 'Open'], ['Move Better Challenge', 'Aero Athletics', '₹850 / sale', '30 Jul', 'Invite only'], ['Monsoon Travel Edit', 'Roamly', '12%', '20 Aug', 'Open']]
  return <><div className="page-heading"><div><span className="eyebrow">CAMPAIGN MARKETPLACE</span><h1>Partner with brands you love.</h1><p>Exclusive campaigns, better rates, bigger opportunities.</p></div></div><div className="market-tools"><div className="search-box"><Icon name="search" /><input placeholder="Search campaigns or brands…" /></div><Button kind="secondary" icon="filter">Filters</Button></div><div className="campaign-grid">{campaigns.map((c, i) => <article className={`campaign-card campaign-${i}`} key={c[0]}><div className="campaign-banner"><span>{c[1]}</span><Status tone={c[4] === 'Open' ? 'green' : 'violet'}>{c[4]}</Status></div><div><small>{['AUDIO & TECH', 'BEAUTY', 'FITNESS', 'TRAVEL'][i]}</small><h3>{c[0]}</h3><p>{['Share the sound of summer with your audience.', 'Make daily rituals glow with creator-led stories.', 'Inspire your audience to move every day.', 'Curate the perfect monsoon escape.'][i]}</p><div className="campaign-stats"><span><small>COMMISSION</small><b>{c[2]}</b></span><span><small>ENDS</small><b>{c[3]}</b></span></div><Button kind="secondary" onClick={() => go('campaign-detail')}>View campaign <Icon name="arrow" /></Button></div></article>)}</div></>
}

function CampaignDetail({ go, toast }: { go: (v: View) => void; toast: (s: string) => void }) {
  return <><button className="back-page" onClick={() => go('campaigns')}>← Back to campaigns</button><div className="campaign-hero"><span>NOVA AUDIO</span><h1>Summer Sound</h1><p>Turn up the moments that make summer unforgettable.</p><div><Status>Open campaign</Status><span>24 Jun — 31 Aug 2025</span></div></div><div className="campaign-detail-grid"><article className="panel article"><h2>About the campaign</h2><p>Nova Audio is inviting lifestyle, travel and tech creators to show how great sound transforms everyday summer moments. Create authentic content featuring AirBeat Pro and inspire your audience to listen differently.</p><h3>What we're looking for</h3><ul><li>High-quality, authentic product storytelling</li><li>One short-form video and supporting stories</li><li>Clear product experience and honest recommendation</li></ul><h3>Content guidelines</h3><div className="dos"><span><b>✓ Do</b> Use #NovaSummerSound and clear ad disclosure</span><span><b>× Avoid</b> Competitor comparisons or unverified claims</span></div></article><aside className="panel apply-card"><h3>Campaign overview</h3><p><span>Commission</span><b>14% per sale</b></p><p><span>Avg. earning</span><b>₹1,260 / order</b></p><p><span>Attribution</span><b>30 days</b></p><p><span>Platforms</span><b>Instagram, YouTube</b></p><hr /><p><span>Applications close</span><b>12 days left</b></p><Button onClick={() => { toast('Application submitted — we’ll keep you updated'); go('my-campaigns') }}>Apply to join campaign</Button><small>Applications are typically reviewed within 3 business days.</small></aside></div></>
}

function MyCampaigns({ go }: { go: (v: View) => void }) { return <><div className="page-heading"><div><h1>My campaigns</h1><p>Manage partnerships and track performance.</p></div><Button onClick={() => go('campaigns')}>Discover campaigns</Button></div><div className="tabs">{['All  8', 'Active  3', 'Pending  2', 'Completed  2', 'Rejected  1'].map((x, i) => <button className={i === 0 ? 'active' : ''} key={x}>{x}</button>)}</div><div className="panel table-wrap"><table><thead><tr><th>Campaign</th><th>Status</th><th>Duration</th><th>Commission</th><th>Clicks</th><th>Orders</th><th>Earnings</th><th></th></tr></thead><tbody>{[['Nova Summer Sound', 'Active', '24 Jun – 31 Aug', '14%', '4,820', '186', '₹18,480'], ['Glow From Within', 'Active', '10 Jun – 15 Sep', '18%', '3,142', '92', '₹8,920'], ['Move Better Challenge', 'Under review', '—', '₹850', '—', '—', '—'], ['Summer Travel Edit', 'Completed', '01 Apr – 31 May', '12%', '8,914', '274', '₹24,650']].map((r, i) => <tr key={r[0]}><td><b>{r[0]}</b><small>{['Nova Audio', 'Aster & Co.', 'Aero Athletics', 'Roamly'][i]}</small></td><td><Status tone={i === 2 ? 'amber' : i === 3 ? 'gray' : 'green'}>{r[1]}</Status></td>{r.slice(2).map(x => <td key={x}>{x}</td>)}<td><button onClick={() => go('campaign-detail')}>•••</button></td></tr>)}</tbody></table></div></> }

function Links({ go, toast }: { go: (v: View) => void; toast: (s: string) => void }) {
  return <><div className="page-heading"><div><h1>My smart links</h1><p>Create, share and measure every recommendation.</p></div><Button onClick={() => go('products')} icon="plus">Create smart link</Button></div><div className="metrics compact"><Metric title="Active links" value="24" change="3 created this month" icon="link" /><Metric title="Total clicks" value="24,892" change="↑ 12.4% this month" icon="search" /><Metric title="Link revenue" value="₹8.42L" change="↑ 18.2% this month" icon="chart" /><Metric title="Avg. conversion" value="5.16%" change="↑ 0.8% this month" icon="cart" /></div><div className="market-tools"><div className="search-box"><Icon name="search" /><input placeholder="Search link or product…" /></div><Button kind="secondary" icon="filter">Filter</Button></div><div className="panel table-wrap"><table><thead><tr><th>Link / Product</th><th>Channel</th><th>Short URL</th><th>Clicks</th><th>Orders</th><th>Revenue</th><th>Commission</th><th>Status</th><th></th></tr></thead><tbody>{products.slice(0, 5).map((p, i) => <tr key={p.name}><td><b>{['Summer Sound Reel', 'Morning Glow Routine', 'Marathon Essentials', 'Daily Tech Edit', 'Hydration Reset'][i]}</b><small>{p.name}</small></td><td>{['Instagram', 'YouTube', 'Instagram', 'Website', 'WhatsApp'][i]}</td><td><button className="short-link" onClick={() => toast('Link copied to clipboard')}>watsgo.in/s/{['priya24', 'glow8', 'run42', 'tech7', 'terra2'][i]} <Icon name="copy" size={13} /></button></td><td>{['8,420', '5,816', '4,210', '3,148', '2,090'][i]}</td><td>{['342', '216', '148', '94', '68'][i]}</td><td>{['₹3.08L', '₹1.82L', '₹1.28L', '₹1.10L', '₹72K'][i]}</td><td><b>{['₹18,480', '₹8,920', '₹6,760', '₹4,960', '₹3,140'][i]}</b></td><td><Status>Active</Status></td><td><button onClick={() => go('link-analytics')}>•••</button></td></tr>)}</tbody></table></div></>
}

function LinkAnalytics({ go }: { go: (v: View) => void }) { return <><button className="back-page" onClick={() => go('links')}>← Back to smart links</button><div className="page-heading"><div><span className="eyebrow">LINK ANALYTICS</span><h1>Summer Sound Reel</h1><p>watsgo.in/s/priya24 · Instagram · Created 12 Jun 2025</p></div><Button kind="secondary" icon="copy">Copy link</Button></div><div className="metrics"><Metric title="Total clicks" value="8,420" change="↑ 18.2%" icon="search" /><Metric title="Unique visitors" value="7,284" change="86.5% unique" icon="user" /><Metric title="Orders" value="342" change="↑ 12.8%" icon="cart" /><Metric title="Commission" value="₹18,480" change="4.06% conversion" icon="wallet" /></div><div className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><h3>Clicks & orders</h3><p>Performance over the last 30 days</p></div></div><div className="bar-chart">{[35, 48, 42, 70, 58, 82, 65, 88, 74, 95, 80, 100].map((h, i) => <span key={i} style={{ height: `${h}%` }}><i style={{ height: `${Math.max(8, h / 5)}%` }} /></span>)}</div></article><article className="panel journey"><h3>Attribution journey</h3>{[['First click', '8,420', '100%'], ['Product view', '6,184', '73.4%'], ['Add to cart', '1,024', '12.1%'], ['Purchase', '342', '4.06%']].map((x, i) => <div key={x[0]}><span>{i + 1}</span><p><b>{x[0]}</b><small>{x[1]} people · {x[2]}</small></p></div>)}</article></div><div className="info-note"><Icon name="help" /> Attribution may not match cross-device journeys or visitors who clear cookies. Reporting only uses permitted, privacy-safe data.</div></> }

function Storefront({ toast }: { toast: (s: string) => void }) {
  const [published, setPublished] = useState(true)
  return <><div className="page-heading"><div><span className="eyebrow">CREATOR STOREFRONT</span><h1>Your recommendations, beautifully curated.</h1><p>watsgo.in/@priyamoves</p></div><div><Button kind="secondary" onClick={() => toast('Storefront URL copied')} icon="copy">Copy URL</Button><Button onClick={() => { setPublished(!published); toast(published ? 'Storefront unpublished' : 'Storefront published') }}>{published ? 'Published' : 'Publish'}</Button></div></div><div className="storefront-editor"><article className="panel editor"><div className="tabs"><button className="active">Profile</button><button>Products</button><button>Appearance</button></div><label>Storefront name<input defaultValue="Priya’s Everyday Edit" /></label><label>Bio<textarea defaultValue="Mindful finds for better days — tried, loved and shared honestly." /></label><label>Button label<select><option>Shop my picks</option><option>View product</option></select></label><h3>Featured products</h3>{products.slice(0, 3).map(p => <div className="featured-row" key={p.name}><span className="mini-img" style={{ backgroundPosition: p.pos }} /><b>{p.name}</b><span>⋮⋮</span></div>)}</article><article className="phone-preview"><div className="phone-screen"><div className="store-cover" /><span className="store-avatar">PM</span><h2>Priya’s Everyday Edit</h2><p>Mindful finds for better days — tried, loved and shared honestly.</p><div className="store-socials">◎ ◉ ◇</div><h3>My latest favorites</h3><div className="store-products">{products.slice(0, 3).map(p => <div key={p.name}><span className="mini-img" style={{ backgroundPosition: p.pos }} /><b>{p.name}</b><small>{p.price}</small><button>Shop my pick</button></div>)}</div></div></article></div></>
}

function Orders({ go }: { go: (v: View) => void }) {
  return <><div className="page-heading"><div><h1>Orders & sales</h1><p>Track every attributed order and commission.</p></div><Button kind="secondary" icon="download">Export</Button></div><div className="tabs">{['All orders', 'Pending', 'Confirmed', 'Delivered', 'Cancelled', 'Refunded'].map((x, i) => <button className={i === 0 ? 'active' : ''} key={x}>{x}</button>)}</div><div className="panel table-wrap"><table><thead><tr><th>Order</th><th>Product</th><th>Campaign</th><th>Order date</th><th>Order value</th><th>Commission</th><th>Status</th><th></th></tr></thead><tbody>{products.slice(0, 5).map((p, i) => <tr key={p.name}><td><b>#WG-{89241 - i * 37}</b><small>watsgo.in/s/{['priya24', 'glow8', 'run42', 'tech7', 'terra2'][i]}</small></td><td><b>{p.name}</b><small>{p.brand}</small></td><td>{i < 2 ? ['Summer Sound', 'Glow From Within'][i] : 'Always-on'}</td><td>{24 - i} Jun, 2025</td><td>{p.price}</td><td><b>{p.earn}</b></td><td><Status tone={i === 0 ? 'amber' : i === 4 ? 'gray' : 'green'}>{i === 0 ? 'Pending' : i === 4 ? 'Refunded' : 'Confirmed'}</Status></td><td><button onClick={() => go('order-detail')}><Icon name="arrow" /></button></td></tr>)}</tbody></table></div></>
}

function OrderDetail({ go }: { go: (v: View) => void }) { return <><button className="back-page" onClick={() => go('orders')}>← Back to orders</button><div className="page-heading"><div><span className="eyebrow">ORDER #WG-89241</span><h1>Order details</h1><p>Placed 24 June 2025 at 10:42 AM</p></div><Status tone="amber">Commission pending</Status></div><div className="order-grid"><article className="panel"><h3>Product</h3><div className="order-product"><span className="mini-img" style={{ backgroundPosition: products[0].pos }} /><div><b>{products[0].name}</b><small>Nova Audio · Qty 1</small></div><b>₹8,999</b></div><hr /><p className="summary-line"><span>Order value</span><b>₹8,999</b></p><p className="summary-line green"><span>Your commission (14%)</span><b>+ ₹1,260</b></p></article><article className="panel"><h3>Status timeline</h3><div className="timeline">{[['Order placed', '24 Jun · 10:42 AM'], ['Attribution confirmed', '24 Jun · 10:43 AM'], ['Awaiting return window', 'Available after 24 Jul']].map((x, i) => <div className={i < 2 ? 'done' : ''} key={x[0]}><span>{i < 2 ? <Icon name="check" size={13} /> : i + 1}</span><p><b>{x[0]}</b><small>{x[1]}</small></p></div>)}</div></article><article className="panel"><h3>Attribution</h3><p className="summary-line"><span>Smart link</span><b>Summer Sound Reel</b></p><p className="summary-line"><span>Channel</span><b>Instagram</b></p><p className="summary-line"><span>Campaign</span><b>Nova Summer Sound</b></p><p className="summary-line"><span>Attribution window</span><b>30 days</b></p></article></div><div className="info-note"><Icon name="help" /> Cancelled or refunded orders may have commission reversed according to the campaign policy.</div></> }

function Wallet({ view, go, toast }: { view: View; go: (v: View) => void; toast: (s: string) => void }) {
  const [modal, setModal] = useState(false)
  if (view === 'payouts') return <><div className="page-heading"><div><h1>Payouts</h1><p>Withdraw and track your creator earnings.</p></div><Button onClick={() => setModal(true)}>Request payout</Button></div><div className="wallet-hero"><span>AVAILABLE TO WITHDRAW</span><b>₹32,840</b><small>Minimum withdrawal ₹1,000 · No processing fee</small><Button onClick={() => setModal(true)}>Withdraw funds</Button></div><div className="panel table-wrap"><div className="panel-head"><div><h3>Payout history</h3><p>Your recent withdrawals</p></div></div><table><thead><tr><th>Payout ID</th><th>Amount</th><th>Method</th><th>Request date</th><th>Processed</th><th>Status</th><th>Reference</th></tr></thead><tbody>{[['#PAY-2841', '₹18,000', 'HDFC •••• 1893', '02 Jun', '04 Jun', 'Paid', 'UTR89340128'], ['#PAY-2694', '₹12,500', 'UPI · priya@okhdfcbank', '02 May', '03 May', 'Paid', 'UTR72184590'], ['#PAY-2512', '₹9,800', 'HDFC •••• 1893', '01 Apr', '03 Apr', 'Paid', 'UTR69281723']].map(r => <tr key={r[0]}>{r.map((x, i) => <td key={x}>{i === 5 ? <Status>{x}</Status> : i === 1 ? <b>{x}</b> : x}</td>)}</tr>)}</tbody></table></div>{modal && <div className="modal-backdrop"><div className="modal"><button className="modal-close" onClick={() => setModal(false)}><Icon name="close" /></button><span className="auth-icon"><Icon name="wallet" /></span><h2>Request a payout</h2><p>Withdraw your available earnings securely.</p><label>Withdrawal amount<div className="amount-input"><span>₹</span><input defaultValue="10,000" /></div></label><div className="balance-line"><span>Available balance</span><b>₹32,840</b></div><label>Payment method<select><option>HDFC Bank •••• 1893</option><option>UPI · priya@okhdfcbank</option></select></label><div className="payout-summary"><p><span>Processing fee</span><b>₹0</b></p><p><span>You'll receive</span><b>₹10,000</b></p><p><span>Estimated arrival</span><b>2–3 business days</b></p></div><Button onClick={() => { setModal(false); toast('Payout request submitted successfully') }}>Confirm withdrawal</Button></div></div>}</>
  return <><div className="page-heading"><div><h1>Earnings & wallet</h1><p>Every commission, clearly accounted for.</p></div><Button onClick={() => go('payouts')}>Request payout</Button></div><div className="metrics"><Metric title="Lifetime earnings" value="₹2,84,260" change="Since March 2024" icon="chart" /><Metric title="Pending commission" value="₹8,420" change="42 orders pending" icon="cart" /><Metric title="Available balance" value="₹32,840" change="Ready to withdraw" icon="wallet" /><Metric title="Total withdrawn" value="₹2,43,000" change="18 successful payouts" icon="download" /></div><div className="dashboard-grid"><article className="panel chart-panel"><div className="panel-head"><div><h3>Monthly earnings</h3><p>Commission over the last 6 months</p></div></div><div className="column-chart">{[42, 55, 47, 71, 65, 88].map((h, i) => <span key={i}><i style={{ height: `${h}%` }} /><small>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}</small></span>)}</div></article><article className="panel"><div className="panel-head"><div><h3>Earnings by campaign</h3><p>This month</p></div></div><div className="earning-list">{[['Nova Summer Sound', '₹18,480', '46%'], ['Glow From Within', '₹8,920', '23%'], ['Always-on products', '₹7,860', '20%'], ['Other campaigns', '₹4,280', '11%']].map((x, i) => <div key={x[0]}><p><span>{x[0]}</span><b>{x[1]}</b></p><i><span style={{ width: x[2], background: ['#2563eb', '#8b5cf6', '#06b6d4', '#cbd5e1'][i] }} /></i></div>)}</div></article></div></>
}

function Notifications() { const [read, setRead] = useState(false); return <><div className="page-heading"><div><h1>Notifications</h1><p>Stay current on campaigns, sales and payouts.</p></div><Button kind="secondary" onClick={() => setRead(true)}>Mark all as read</Button></div><div className="tabs">{['All', 'Campaigns', 'Sales', 'Earnings', 'Payouts', 'Account'].map((x, i) => <button className={i === 0 ? 'active' : ''} key={x}>{x}</button>)}</div><div className="notification-list">{[['megaphone', 'Your campaign application was approved', 'You’re now part of Nova Summer Sound. Start creating links today.', '12 min'], ['cart', 'You generated a new order', 'AirBeat Pro sold through Summer Sound Reel. Commission: ₹1,260.', '42 min'], ['wallet', 'Commission moved to confirmed balance', '₹450 from order #WG-89184 is now confirmed.', '3 hr'], ['download', 'Your payout was processed', '₹18,000 has been sent to HDFC •••• 1893.', '2 days'], ['user', 'Your profile verification is complete', 'Your creator profile now carries a verified badge.', '4 days']].map((x, i) => <article className={!read && i < 2 ? 'unread' : ''} key={x[1]}><i><Icon name={x[0]} /></i><div><b>{x[1]}</b><p>{x[2]}</p><small>{x[3]}</small></div>{!read && i < 2 && <span />}</article>)}</div></> }

function Profile({ view, go, toast }: { view: View; go: (v: View) => void; toast: (s: string) => void }) {
  if (view === 'settings') return <><div className="page-heading"><div><h1>Account settings</h1><p>Manage security, payments and preferences.</p></div></div><div className="settings-layout"><aside className="panel"><button className="active">Personal information</button><button>Social accounts</button><button>Payment settings</button><button>Security</button><button>Notifications</button><button>Privacy</button></aside><article className="panel settings-form"><h2>Personal information</h2><p>Update your account details and preferences.</p><div className="form-grid"><label>Full name<input defaultValue="Priya Malhotra" /></label><label>Display name<input defaultValue="Priya Moves" /></label><label>Email address<input defaultValue="priya@email.com" /></label><label>Mobile number<input defaultValue="+91 98765 43210" /></label><label>Language<select><option>English</option></select></label><label>Time zone<select><option>(GMT +5:30) India</option></select></label></div><hr /><h3>Security</h3><div className="setting-row"><div><b>Two-factor authentication</b><small>Add an extra layer of security to your account.</small></div><Button kind="secondary">Enable 2FA</Button></div><div className="setting-row"><div><b>Active sessions</b><small>2 devices currently signed in.</small></div><Button kind="secondary">Review devices</Button></div><Button onClick={() => toast('Settings saved')}>Save changes</Button></article></div></>
  return <><div className="page-heading"><div><h1>Creator profile</h1><p>Your public identity and partnership credentials.</p></div><Button onClick={() => go('settings')}>Edit profile</Button></div><div className="profile-layout"><article className="panel profile-main"><div className="profile-cover" /><div className="profile-info"><span className="big-avatar">PM</span><div><h2>Priya Moves <Status>Verified</Status></h2><p>@priyamoves · Mumbai, India</p></div><Button kind="secondary" onClick={() => go('settings')}>Edit profile</Button></div><p>Lifestyle, mindful travel and everyday wellness. Sharing honest recommendations for better everyday living.</p><div className="profile-stats"><span><b>246K</b>Combined audience</span><span><b>4.8%</b>Avg. engagement</span><span><b>5.2%</b>Conversion rate</span></div><h3>Creator categories</h3><div className="filter-chips"><button className="active">Lifestyle</button><button>Travel</button><button>Wellness</button></div><h3>Connected accounts</h3><div className="connected"><p><span className="social-logo">I</span><b>Instagram<small>@priyamoves · 184K followers</small></b><Status>Authenticated</Status></p><p><span className="social-logo">Y</span><b>YouTube<small>Priya Moves · 62K subscribers</small></b><Status>Authenticated</Status></p></div></article><aside><article className="panel completion"><div className="ring">92%</div><h3>Profile strength</h3><p>Your profile looks great. Add audience insights to reach 100%.</p><Button kind="secondary" onClick={() => go('settings')}>Complete profile</Button></article><article className="panel"><h3>Audience snapshot</h3><p className="summary-line"><span>Top location</span><b>India · 78%</b></p><p className="summary-line"><span>Primary age</span><b>18–34</b></p><p className="summary-line"><span>Top language</span><b>English, Hindi</b></p></article></aside></div></>
}

function Support({ toast }: { toast: (s: string) => void }) { return <><div className="support-hero"><span className="eyebrow">CREATOR SUPPORT</span><h1>How can we help?</h1><div className="search-box"><Icon name="search" /><input placeholder="Search help articles…" /></div></div><div className="help-grid">{[['link', 'Smart links', 'Create, share and troubleshoot links'], ['megaphone', 'Campaigns', 'Applications, briefs and guidelines'], ['wallet', 'Earnings & payouts', 'Commissions, wallet and withdrawals'], ['user', 'Account & verification', 'Profile, security and approvals']].map(x => <article className="panel" key={x[1]}><Icon name={x[0]} size={28} /><h3>{x[1]}</h3><p>{x[2]}</p><button>Browse articles →</button></article>)}</div><div className="panel ticket"><div><h2>Still need help?</h2><p>Our creator support team typically replies within one business day.</p></div><Button onClick={() => toast('Support ticket created')}>Submit support ticket</Button></div><div className="faq in-app"><div><h2>Popular questions</h2></div><div>{['How do commissions become available?', 'Why is an order missing?', 'How do I update payout details?', 'Can I promote outside social media?'].map(x => <details key={x}><summary>{x}<Icon name="plus" /></summary><p>Visit the complete help article for step-by-step guidance and policy details.</p></details>)}</div></div></> }

function AppShell({ user, onLogout }: { user?: AuthUser | null; onLogout: () => void }) {
  const [view, setView] = useState<View>('overview')
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [toast, setToast] = useState('')
  const notify = (s: string) => {
    setToast(s)
    setTimeout(() => setToast(''), 3000)
  }
  const go = (v: View) => {
    setView(v)
    setOpen(false)
    window.scrollTo(0, 0)
  }
  const title = useMemo(() => nav.find((x) => x[0] === view)?.[2] || 'Creator Hub', [view])

  const displayName = user?.full_name || 'Priya Moves'
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'PM'

  let content: ReactNode
  if (view === 'overview') content = <Overview go={go} user={user} />
  else if (view === 'products') content = <Products go={go} toast={notify} />
  else if (view === 'product-detail') content = <ProductDetail go={go} toast={notify} />
  else if (view === 'campaigns') content = <Campaigns go={go} />
  else if (view === 'campaign-detail') content = <CampaignDetail go={go} toast={notify} />
  else if (view === 'my-campaigns') content = <MyCampaigns go={go} />
  else if (view === 'links') content = <Links go={go} toast={notify} />
  else if (view === 'link-analytics') content = <LinkAnalytics go={go} />
  else if (view === 'storefront') content = <Storefront toast={notify} />
  else if (view === 'orders') content = <Orders go={go} />
  else if (view === 'order-detail') content = <OrderDetail go={go} />
  else if (view === 'earnings' || view === 'wallet' || view === 'payouts')
    content = <Wallet view={view} go={go} toast={notify} />
  else if (view === 'notifications') content = <Notifications />
  else if (view === 'profile' || view === 'settings')
    content = <Profile view={view} go={go} toast={notify} />
  else content = <Support toast={notify} />
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-head">
          <Logo dark />
          <button onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav>
          {nav.map((x) => (
            <button
              className={
                view === x[0] || (view.includes(x[0]) && x[0] !== 'overview') ? 'active' : ''
              }
              onClick={() => go(x[0])}
              key={x[0]}
            >
              <Icon name={x[1]} size={18} />
              <span>{x[2]}</span>
              {x[0] === 'notifications' && <i>3</i>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="mini-profile">
            <span>{initials}</span>
            <div>
              <b>{displayName}</b>
              <small>Verified creator</small>
            </div>
            <button onClick={() => setLogoutOpen(true)}>•••</button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="mobile-title">{title}</span>
          <div className="top-search">
            <Icon name="search" size={18} />
            <input placeholder="Search anything…" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="top-actions">
            <button onClick={() => go('support')}>
              <Icon name="help" />
            </button>
            <button className="notification-button" onClick={() => go('notifications')}>
              <Icon name="bell" />
              <i />
            </button>
            <button className="top-profile" onClick={() => setProfileOpen(!profileOpen)}>
              <span>{initials}</span>
              <div>
                <b>{displayName}</b>
                <small>Verified creator</small>
              </div>
              <span>⌄</span>
            </button>
          </div>
          {profileOpen && (
            <div className="profile-menu">
              <button onClick={() => go('profile')}>
                <Icon name="user" /> My profile
              </button>
              <button onClick={() => go('settings')}>
                <Icon name="settings" /> Account settings
              </button>
              <button onClick={() => go('wallet')}>
                <Icon name="wallet" /> Wallet
              </button>
              <button onClick={() => go('support')}>
                <Icon name="help" /> Help & support
              </button>
              <hr />
              <button className="red" onClick={() => setLogoutOpen(true)}>
                <Icon name="logout" /> Log out
              </button>
            </div>
          )}
        </header>
        <main className="page-content">{content}</main>
        <nav className="mobile-bottom">
          {nav.slice(0, 4).map((x) => (
            <button
              className={view === x[0] ? 'active' : ''}
              onClick={() => go(x[0])}
              key={x[0]}
            >
              <Icon name={x[1]} />
              <span>{x[2].split(' ')[0]}</span>
            </button>
          ))}
          <button onClick={() => setOpen(true)}>
            <Icon name="menu" />
            <span>More</span>
          </button>
        </nav>
      </div>
      {open && <div className="nav-overlay" onClick={() => setOpen(false)} />}{' '}
      {toast && (
        <div className="toast">
          <Icon name="check" />
          <span>{toast}</span>
          <button onClick={() => setToast('')}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {logoutOpen && (
        <div className="modal-backdrop">
          <div className="modal small">
            <span className="logout-icon">
              <Icon name="logout" />
            </span>
            <h2>Log out of WatsGo?</h2>
            <p>You’ll need to sign in again to access your creator workspace.</p>
            <div className="modal-actions">
              <Button kind="secondary" onClick={() => setLogoutOpen(false)}>
                Cancel
              </Button>
              <Button kind="danger" onClick={onLogout}>
                Log out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredUser())
  const [screen, setScreen] = useState<'landing' | 'auth' | 'onboarding' | 'app'>(() => {
    return getStoredUser() ? 'app' : 'landing'
  })
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register')

  const handleAuthDone = (user?: AuthUser) => {
    if (user) setCurrentUser(user)
    if (authMode === 'register' && !user?.onboarding_completed) {
      setScreen('onboarding')
    } else {
      setScreen('app')
    }
  }

  const handleLogout = () => {
    logout()
    setCurrentUser(null)
    setAuthMode('login')
    setScreen('auth')
  }

  if (screen === 'landing')
    return (
      <Landing
        onStart={() => {
          setAuthMode('register')
          setScreen('auth')
        }}
        onLogin={() => {
          setAuthMode('login')
          setScreen('auth')
        }}
      />
    )
  if (screen === 'auth')
    return <Auth mode={authMode} setMode={setAuthMode} onDone={handleAuthDone} />
  if (screen === 'onboarding') return <Onboarding onDone={() => setScreen('app')} />
  return <AppShell user={currentUser} onLogout={handleLogout} />
}
