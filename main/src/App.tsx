import { useState } from 'react'
import { content, stackGroups, archNodes } from './content'
import type { Lang } from './content'
import { useStats } from './hooks/useStats'
import Navbar from './components/Navbar/Navbar'
import Hero from './components/Hero/Hero'
import Intro from './components/Intro/Intro'
import Features from './components/Features/Features'
import HowItWorks from './components/HowItWorks/HowItWorks'
import Preview from './components/Preview/Preview'
import Architecture from './components/Architecture/Architecture'
import Stack from './components/Stack/Stack'
import Footer from './components/Footer/Footer'
import Dashboard from './components/Dashboard/Dashboard'

type View = 'landing' | 'dashboard'

export default function App() {
  const [lang, setLang] = useState<Lang>('ru')
  const [view, setView] = useState<View>('landing')
  const c = content[lang]

  // Один запрос к API на всё приложение — данные шарятся между лендингом и дашбордом
  const { data: statsData, loading: statsLoading, error: statsError } = useStats()

  if (view === 'dashboard') {
    return (
      <Dashboard
        data={statsData}
        loading={statsLoading}
        error={statsError}
        onBack={() => setView('landing')}
        lang={lang}
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
      <Hero
        badge={c.hero.badge}
        title1={c.hero.title1}
        title2={c.hero.title2}
        subtitle={c.hero.subtitle}
        cta1={c.hero.cta1}
        cta2={c.hero.cta2}
        mock={c.heroMock}
      />
      <Intro
        badge={c.intro.badge}
        title={c.intro.title}
        sub={c.intro.sub}
        lines={c.intro.lines}
      />
      <Features
        kicker={c.features.kicker}
        title={c.features.title}
        sub={c.features.sub}
        cards={c.features.cards}
      />
      <HowItWorks
        kicker={c.howItWorks.kicker}
        title={c.howItWorks.title}
        sub={c.howItWorks.sub}
        steps={c.howItWorks.steps}
      />
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
      <Architecture
        kicker={c.arch.kicker}
        title={c.arch.title}
        sub={c.arch.sub}
        nodes={archNodes}
      />
      <Stack
        kicker={c.stack.kicker}
        title={c.stack.title}
        sub={c.stack.sub}
        groups={stackGroups}
      />
      <Footer
        title={c.footer.title}
        desc={c.footer.desc}
        commands={c.footer.commands}
        githubLabel={c.footer.github}
        copy={c.footer.copy}
      />
    </>
  )
}
