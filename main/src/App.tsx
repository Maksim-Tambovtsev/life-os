import { useState, useEffect } from 'react'
import { content } from './content'
import type { Lang } from './content'
import { useStats } from './hooks/useStats'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './components/Auth/LoginScreen'
import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Intro from './components/Intro/Intro'
import Features from './components/Features/Features'
import HowItWorks from './components/HowItWorks/HowItWorks'
import Testimonial from './components/Testimonial/Testimonial'
import Preview from './components/Preview/Preview'
import Footer from './components/Footer/Footer'
import Dashboard from './components/Dashboard/Dashboard'
import AgentsPanel from './components/Agents/AgentsPanel'
import Reveal from './components/ui/Reveal'

type View = 'landing' | 'dashboard' | 'agents'

export default function App() {
  const [lang, setLang] = useState<Lang>('ru')
  const [view, setView] = useState<View>('landing')
  const c = content[lang]

  const { token, user, loginTelegram, loginDev, loginWithToken, updateProfile } = useAuth()
  const { data: statsData, loading: statsLoading, error: statsError } = useStats(token)
  const [tokenLoginError, setTokenLoginError] = useState<string | null>(null)

  // Одноразовая ссылка из бота (/login): ?login_token=... логинит сразу,
  // без Telegram Login Widget.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const loginToken = params.get('login_token')
    if (!loginToken) return

    const url = new URL(window.location.href)
    url.searchParams.delete('login_token')
    window.history.replaceState({}, '', url.toString())

    setView('dashboard')
    loginWithToken(loginToken).catch((e: Error) => setTokenLoginError(e.message))
  }, [loginWithToken])

  if (view === 'dashboard' || view === 'agents') {
    if (!token) {
      return (
        <LoginScreen
          onTelegramLogin={loginTelegram}
          onDevLogin={loginDev}
          onBack={() => setView('landing')}
          lang={lang}
          externalError={tokenLoginError}
        />
      )
    }
    if (view === 'agents') {
      return (
        <AgentsPanel
          profile={user}
          onSave={updateProfile}
          onBack={() => setView('dashboard')}
          lang={lang}
        />
      )
    }
    return (
      <Dashboard
        data={statsData}
        loading={statsLoading}
        error={statsError}
        onBack={() => setView('landing')}
        onOpenAgents={() => setView('agents')}
        lang={lang}
        name={user?.name ?? null}
      />
    )
  }

  return (
    <>
      <Navbar
        lang={lang}
        onLangChange={setLang}
        links={c.nav.links}
        githubLabel={c.nav.github}
        onOpenDashboard={() => setView('dashboard')}
      />

      {/* Hero анимируется сам через CSS @keyframes reveal */}
      <Hero
        badge={c.hero.badge}
        title1={c.hero.title1}
        title2={c.hero.title2}
        subtitle={c.hero.subtitle}
        cta1={c.hero.cta1}
        cta2={c.hero.cta2}
        ctaTg={c.hero.ctaTg}
        mock={c.heroMock}
      />

      <Reveal>
        <Intro
          badge={c.intro.badge}
          title={c.intro.title}
          sub={c.intro.sub}
          lines={c.intro.lines}
        />
      </Reveal>

      <Reveal>
        <Features
          kicker={c.features.kicker}
          title={c.features.title}
          sub={c.features.sub}
          cards={c.features.cards}
        />
      </Reveal>

      <Reveal>
        <HowItWorks
          kicker={c.howItWorks.kicker}
          title={c.howItWorks.title}
          sub={c.howItWorks.sub}
          steps={c.howItWorks.steps}
        />
      </Reveal>

      <Reveal>
        <Testimonial
          quote={c.testimonial.quote}
          author={c.testimonial.author}
          role={c.testimonial.role}
        />
      </Reveal>

      <Reveal>
        <Preview
          kicker={c.preview.kicker}
          title={c.preview.title}
          sub={c.preview.sub}
          tabs={c.preview.tabs}
          dashTab={c.dashTab}
          tgTab={c.tgTab}
          aiTab={c.aiTab}
          weekData={statsData?.week}
        />
      </Reveal>

      <Footer
        tgLabel={c.footer.tgLabel}
        tgLink={c.footer.tgLink}
        copy={c.footer.copy}
      />
    </>
  )
}
