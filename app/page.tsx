import GithubUsernameForm from '@/components/GithubUsernameForm'
import StarTriviaGame from '@/components/StarTriviaGame'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import catalogData from '@/public/data/developer-catalog.json'

export default function Home() {
  return (
    <main className="relative overflow-hidden px-4 py-8 md:px-6">
      <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_30%)]" />

      <section className="mx-auto max-w-6xl space-y-8">
        <div className="flex justify-end">
          <Link href="/catalog">
            <Button variant="outline" className="text-sm">
              View Developer Catalog
            </Button>
          </Link>
        </div>

        <div className="space-y-3 text-center">
          <span className="inline-flex items-center rounded-full border border-slate-300 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground backdrop-blur">
            GitHub stars, with or without AI
          </span>
          <h1 className="text-4xl font-black tracking-tight text-slate-950 dark:text-slate-50 md:text-5xl">
            Sort your stars when the AI works.
            <br />
            Play with them when it doesn&apos;t.
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            The categorizer is still the main event. Until API keys are configured, the home page
            now includes a catalog-powered trivia mode so the app stays alive instead of feeling
            broken.
          </p>
        </div>

        <GithubUsernameForm />
        <StarTriviaGame developers={catalogData.topDevelopers} />
      </section>
    </main>
  )
}
