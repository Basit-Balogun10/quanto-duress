import {
  ArrowRight,
  Check,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'

const steps = [
  {
    number: '01',
    title: 'Set a duress PIN',
    body: 'Choose a second PIN that only you know. It looks and feels exactly like your normal PIN.',
  },
  {
    number: '02',
    title: 'Use it under pressure',
    body: 'If someone forces a transfer, enter the duress PIN. There is no panic button to find and no security prompt to explain.',
  },
  {
    number: '03',
    title: 'They see success. You stay safe.',
    body: 'The attacker gets a convincing receipt. The payment is silently held, and your trusted contact is alerted.',
  },
]

export function Landing() {
  return (
    <div className="overflow-hidden bg-lumen text-vast">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-lumen/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
            <a href="#problem" className="transition-colors hover:text-vast">
              The problem
            </a>
            <a href="#how" className="transition-colors hover:text-vast">
              How it works
            </a>
            <a href="#under-the-hood" className="transition-colors hover:text-vast">
              Under the hood
            </a>
          </nav>
          <Link to="/app" className="btn-primary px-5 py-2.5 text-sm">
            Open demo
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 sm:pb-24 sm:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(240,215,255,0.85),transparent_42%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_34%,rgba(255,169,70,0.18),transparent_36%)]" />
          <div className="pointer-events-none absolute -right-40 bottom-0 size-[30rem] rounded-full border border-fathom/10" />
          <div className="pointer-events-none absolute -right-24 bottom-20 size-[18rem] rounded-full border border-fathom/10" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-fathom/20 bg-lumen-deep px-3.5 py-2">
                <span className="size-1.5 rounded-full bg-fathom" />
                <span className="label-mono text-[0.58rem] text-fathom">
                  Duress-aware payments
                </span>
              </div>

              <h1 className="display mt-7 max-w-3xl text-[clamp(3.5rem,8.5vw,7.25rem)]">
                When saying no <span className="italic text-fathom">isn&apos;t safe.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
                A silent duress layer for mobile payments. Enter your duress PIN during a
                forced transfer and the attacker sees success — while your money stays
                exactly where it is.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/app" className="btn-primary px-6 py-4 text-base">
                  Try the duress demo
                  <ArrowRight className="size-5" />
                </Link>
                <a href="#how" className="btn-secondary px-6 py-4 text-base">
                  See how it works
                </a>
              </div>

              <div className="mt-10 grid max-w-lg grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-lumen/70">
                {[
                  ['₦0', 'moved on a hold'],
                  ['6 sec', 'attacker decoy'],
                  ['1 alert', 'to someone you trust'],
                ].map(([value, label]) => (
                  <div key={label} className="px-4 py-4 first:pl-5 last:pr-5">
                    <p className="font-display text-2xl font-semibold tracking-tight">{value}</p>
                    <p className="mt-1 text-[0.68rem] leading-snug text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md animate-fade-up delay-2">
              <div className="absolute -left-8 top-20 hidden size-24 rotate-[-9deg] rounded-3xl border border-line bg-dawn/70 p-4 sm:block">
                <Fingerprint className="size-8 text-fathom" strokeWidth={1.5} />
                <p className="label-mono mt-3 text-[0.5rem] text-fathom-deep">Silent signal</p>
              </div>

              <div className="absolute -right-5 -top-5 z-20 hidden rotate-3 rounded-2xl border border-pulse/20 bg-pulse-soft px-4 py-3 shadow-card sm:block">
                <p className="label-mono text-[0.5rem] text-pulse">Actually</p>
                <p className="mt-1 font-display text-xl font-semibold text-pulse">Payment held</p>
              </div>

              <div className="relative rounded-[2rem] border border-line bg-lumen-deep p-6 shadow-soft">
                <div className="rounded-[1.6rem] bg-vast p-5 text-lumen">
                  <div className="flex items-center justify-between">
                    <span className="label-mono text-[0.55rem] text-lumen/50">Send money</span>
                    <span className="rounded-full bg-lumen/10 px-2.5 py-1 font-mono text-[0.6rem] text-lumen/70">
                      Quanto
                    </span>
                  </div>

                  <p className="mt-8 text-center text-sm text-lumen/55">You are sending</p>
                  <p className="mt-1 text-center font-display text-6xl font-semibold tracking-[-0.06em]">
                    ₦180,000
                  </p>

                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-lumen/10 bg-lumen/5 p-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-dawn font-display text-lg font-semibold text-fathom-deep">
                      CO
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">Chidi Okafor</p>
                      <p className="text-xs text-lumen/45">Opay • 8123456789</p>
                    </div>
                    <Check className="ml-auto size-4 text-success" />
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map(
                      (digit, index) => (
                        <div
                          key={index}
                          className="flex h-11 items-center justify-center rounded-xl border border-lumen/10 text-sm text-lumen/70"
                        >
                          {digit}
                        </div>
                      ),
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-1.5 text-[0.6rem] text-lumen/35">
                    <LockKeyhole className="size-3" />
                    Entered with duress PIN
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 px-1">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">Receipt shown to attacker</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      Same animation. Same reference format. No visible security language.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="border-y border-line bg-lumen-deep/65 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <p className="label-mono text-[0.6rem] text-fathom">The problem</p>
                <h2 className="display mt-4 text-5xl sm:text-6xl">
                  A PIN can&apos;t tell consent from coercion.
                </h2>
              </div>
              <div className="space-y-8 lg:pt-12">
                <p className="max-w-2xl text-xl leading-relaxed text-muted sm:text-2xl">
                  When a fraudster is standing over you, refusing is dangerous and a
                  visible panic button can make things worse. Traditional banking leaves
                  the victim to choose between their money and their safety.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ['Silent', 'No alarm. No security popup. No reason to escalate.'],
                    ['Convincing', 'The attacker sees the same success screen as a real transfer.'],
                    ['Reversible', 'The real payment is held until you can safely review it.'],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-2xl border border-line bg-lumen p-5">
                      <p className="label-mono text-[0.55rem] text-fathom">{title}</p>
                      <p className="mt-3 text-sm leading-relaxed text-muted">{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <p className="label-mono text-[0.6rem] text-fathom">How it works</p>
                <h2 className="display mt-4 max-w-2xl text-5xl sm:text-6xl">
                  Three steps. One silent decision.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                The duress PIN is the decisive signal. Context signals strengthen the
                incident record without exposing more risk to the person under pressure.
              </p>
            </div>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {steps.map((step, index) => (
                <article
                  key={step.number}
                  className="group relative overflow-hidden rounded-3xl border border-line bg-lumen-deep/50 p-7 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-fathom">{step.number}</span>
                    <span className="flex size-10 items-center justify-center rounded-full border border-line bg-lumen">
                      {index === 0 && <LockKeyhole className="size-4 text-fathom" />}
                      {index === 1 && <Fingerprint className="size-4 text-fathom" />}
                      {index === 2 && <EyeOff className="size-4 text-fathom" />}
                    </span>
                  </div>
                  <h3 className="mt-10 font-display text-3xl font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="under-the-hood" className="border-y border-line bg-fathom px-4 py-20 text-lumen sm:px-6 sm:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-14 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="label-mono text-[0.6rem] text-dawn">Under the hood</p>
                <h2 className="display mt-4 max-w-xl text-5xl sm:text-6xl">
                  Deterministic where it matters.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-lumen/60">
                  The critical path does not wait for a model. The duress PIN triggers a
                  local hold immediately. Context only explains the decision.
                </p>
                <div className="mt-8 flex flex-wrap gap-2">
                  {['Duress PIN', 'Balance exposure', 'Recipient familiarity', 'PIN cadence', 'Corrections', 'Time anomaly'].map(
                    (signal) => (
                      <span
                        key={signal}
                        className="rounded-full border border-lumen/15 bg-lumen/5 px-3 py-1.5 text-xs text-lumen/70"
                      >
                        {signal}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-lumen/15 bg-fathom-deep/70 p-6 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-lumen/10 pb-4">
                  <span className="text-lumen/45">quanto / risk_trace</span>
                  <span className="rounded-full bg-flare/15 px-2 py-1 text-[0.55rem] text-flare">
                    CRITICAL
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  {[
                    ['duress_pin', 'MATCH', 'text-flare'],
                    ['balance_exposure', '42%', 'text-glow'],
                    ['recipient', 'FIRST_TIME', 'text-glow'],
                    ['pin_entry', '2.1s / FAST', 'text-lumen/70'],
                    ['hour', 'NORMAL', 'text-lumen/70'],
                  ].map(([label, value, color]) => (
                    <div key={label} className="flex items-center justify-between gap-4">
                      <span className="text-lumen/45">{label}</span>
                      <span className={color}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-flare/30 bg-flare/10 p-4">
                  <p className="label-mono text-[0.52rem] text-flare/80">Decision</p>
                  <p className="mt-2 font-sans text-sm font-semibold text-lumen">
                    HOLD · DECOY RECEIPT · ALERT GUARDIAN
                  </p>
                </div>
                <p className="mt-4 text-[0.6rem] leading-relaxed text-lumen/35">
                  Illustrative trace. This demo runs locally with mock timing and state.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-line bg-lumen-deep/50 p-7 sm:p-10">
              <p className="label-mono text-[0.58rem] text-muted">What the attacker sees</p>
              <div className="mt-8 rounded-2xl border border-line bg-lumen p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
                    <Check className="size-5" strokeWidth={3} />
                  </span>
                  <div>
                    <p className="font-semibold">Transfer successful</p>
                    <p className="text-sm text-muted">₦180,000 to Chidi Okafor</p>
                  </div>
                </div>
                <div className="mt-5 h-px bg-line" />
                <div className="mt-4 flex justify-between font-mono text-[0.65rem] text-muted">
                  <span>QX-7F3A9</span>
                  <span>Just now</span>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-muted">
                Familiar motion, familiar copy, familiar receipt. Nothing signals that a
                safety system has intervened.
              </p>
            </div>

            <div className="rounded-3xl border border-fathom/25 bg-fathom p-7 text-lumen sm:p-10">
              <p className="label-mono text-[0.58rem] text-dawn">What actually happens</p>
              <div className="mt-8 rounded-2xl border border-lumen/15 bg-lumen/5 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-flare/15 text-flare">
                    <LockKeyhole className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">Payment held</p>
                    <p className="text-sm text-lumen/55">₦180,000 remains in your account</p>
                  </div>
                </div>
                <div className="mt-5 h-px bg-lumen/10" />
                <div className="mt-4 flex items-center gap-2 text-[0.65rem] text-lumen/50">
                  <MessageSquareText className="size-3.5" />
                  Trusted contact alerted silently
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-lumen/55">
                After the attacker leaves, you can review the hold in your Safety Center,
                cancel it, or release it with your normal PIN.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-line bg-dawn/55 px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,235,0.9),transparent_55%)]" />
            <div className="relative mx-auto max-w-2xl">
              <Sparkles className="mx-auto size-7 text-fathom" />
              <h2 className="display mt-5 text-5xl sm:text-7xl">
                Safety should not require a scene.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted">
                Run the duress demo, enter the silent PIN, and watch the attacker-facing
                receipt diverge from what really happened.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/app" className="btn-primary px-7 py-4 text-base">
                  Open the demo
                  <ArrowRight className="size-5" />
                </Link>
                <span className="rounded-full border border-line bg-lumen/60 px-4 py-3 font-mono text-[0.65rem] text-muted">
                  Normal 1234 · Duress 9111
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <p className="text-xs leading-relaxed text-muted">
            Hackathon build. Holds and guardian alerts are simulated locally.
          </p>
          <div className="flex items-center gap-2 text-xs text-fathom">
            <ShieldCheck className="size-4" />
            Built for people under pressure
          </div>
        </div>
      </footer>
    </div>
  )
}
