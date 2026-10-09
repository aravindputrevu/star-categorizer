'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Developer {
  username: string
  displayName: string
  avatarUrl: string
  bio: string
  starCategories: Record<string, string[] | undefined>
}

interface StarQuestion {
  repo: string
  category: string
  correctUsername: string
}

interface StarTriviaGameProps {
  developers: Developer[]
}

const STORAGE_KEY = 'star-trivia-best-streak'

function buildQuestionPool(developers: Developer[]): StarQuestion[] {
  const repoOwners = new Map<
    string,
    { usernames: Set<string>; categories: Map<string, string> }
  >()

  for (const developer of developers) {
    for (const [category, repos] of Object.entries(developer.starCategories || {})) {
      for (const repo of repos || []) {
        const existing = repoOwners.get(repo) || {
          usernames: new Set<string>(),
          categories: new Map<string, string>(),
        }

        existing.usernames.add(developer.username)

        if (!existing.categories.has(developer.username)) {
          existing.categories.set(developer.username, category)
        }

        repoOwners.set(repo, existing)
      }
    }
  }

  return Array.from(repoOwners.entries())
    .filter(([, details]) => details.usernames.size === 1)
    .map(([repo, details]) => {
      const correctUsername = Array.from(details.usernames)[0]

      return {
        repo,
        category: details.categories.get(correctUsername) || 'Mystery Category',
        correctUsername,
      }
    })
}

function pickQuestion(
  questionPool: StarQuestion[],
  previousRepo?: string
): StarQuestion | null {
  if (questionPool.length === 0) return null

  const eligibleQuestions = questionPool.filter((question) => question.repo !== previousRepo)
  const source = eligibleQuestions.length > 0 ? eligibleQuestions : questionPool

  return source[Math.floor(Math.random() * source.length)]
}

export default function StarTriviaGame({ developers }: StarTriviaGameProps) {
  const [questionPool, setQuestionPool] = useState<StarQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<StarQuestion | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)

  useEffect(() => {
    const pool = buildQuestionPool(developers)
    setQuestionPool(pool)
    setCurrentQuestion(pickQuestion(pool))
  }, [developers])

  useEffect(() => {
    const storedBest = window.localStorage.getItem(STORAGE_KEY)
    if (!storedBest) return

    const parsed = Number.parseInt(storedBest, 10)
    if (!Number.isNaN(parsed)) {
      setBestStreak(parsed)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(bestStreak))
  }, [bestStreak])

  const correctDeveloper = developers.find(
    (developer) => developer.username === currentQuestion?.correctUsername
  )

  const answeredCorrectly =
    selectedUsername !== null && selectedUsername === currentQuestion?.correctUsername

  function handleGuess(username: string) {
    if (!currentQuestion || selectedUsername) return

    const isCorrect = username === currentQuestion.correctUsername
    const nextStreak = isCorrect ? streak + 1 : 0

    setSelectedUsername(username)
    setLastResult(isCorrect ? 'correct' : 'wrong')
    setStreak(nextStreak)

    if (isCorrect) {
      setScore((value) => value + 1)
    }

    if (nextStreak > bestStreak) {
      setBestStreak(nextStreak)
    }
  }

  function handleNextRound() {
    if (!currentQuestion) return

    setCurrentQuestion(pickQuestion(questionPool, currentQuestion.repo))
    setSelectedUsername(null)
    setShowHint(false)
    setLastResult(null)
    setRound((value) => value + 1)
  }

  if (developers.length < 2 || !currentQuestion || !correctDeveloper) {
    return (
      <Card className="w-full max-w-5xl mx-auto border-dashed">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Add at least two developers with distinct starred repos to unlock the trivia mode.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-5xl mx-auto overflow-hidden border-slate-300/70 bg-gradient-to-br from-amber-50 via-background to-sky-50 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <CardContent className="p-0">
        <div className="relative overflow-hidden p-6 md:p-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.28),_transparent_44%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.22),_transparent_38%)]" />

          <div className="relative space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <span className="inline-flex w-fit items-center rounded-full border border-amber-300/70 bg-amber-100/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Offline Mode
                </span>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
                    Who Starred This?
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                    While the AI lane is offline, play a lightning round with real starred repos
                    from the developer catalog. Guess which developer had the repo in their star
                    collection.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center md:min-w-[260px]">
                <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Score
                  </p>
                  <p className="mt-2 text-2xl font-bold">{score}</p>
                </div>
                <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Streak
                  </p>
                  <p className="mt-2 text-2xl font-bold">{streak}</p>
                </div>
                <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-950/70">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Best
                  </p>
                  <p className="mt-2 text-2xl font-bold">{bestStreak}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[28px] border border-slate-300/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-950/75">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    Round {round}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowHint((value) => !value)}
                  >
                    {showHint ? 'Hide Hint' : 'Reveal Hint'}
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    Mystery Repo
                  </p>
                  <div className="rounded-[24px] bg-slate-950 px-5 py-6 text-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-slate-900">
                    <p className="font-mono text-xl font-semibold leading-relaxed md:text-2xl">
                      {currentQuestion.repo}
                    </p>
                  </div>

                  <div
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-sm transition-all',
                      showHint
                        ? 'border-sky-300 bg-sky-100/80 text-sky-950 dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-100'
                        : 'border-dashed border-slate-300/80 bg-slate-100/70 text-muted-foreground dark:border-slate-700 dark:bg-slate-900/60'
                    )}
                  >
                    {showHint ? (
                      <span>
                        Category clue: <strong>{currentQuestion.category}</strong>
                      </span>
                    ) : (
                      <span>Need a nudge? The hint reveals the category this repo landed in.</span>
                    )}
                  </div>

                  {selectedUsername && (
                    <div
                      className={cn(
                        'rounded-2xl border px-4 py-4 text-sm',
                        answeredCorrectly
                          ? 'border-emerald-300 bg-emerald-100/80 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100'
                          : 'border-rose-300 bg-rose-100/80 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100'
                      )}
                    >
                      <p className="font-semibold">
                        {answeredCorrectly ? 'Correct.' : 'Not quite.'}{' '}
                        {correctDeveloper.displayName} had this starred under{' '}
                        <span className="font-bold">{currentQuestion.category}</span>.
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.24em] opacity-75">
                        {lastResult === 'correct'
                          ? 'Streak extended'
                          : 'Streak reset, but the repo radar stays alive'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {developers.map((developer) => {
                  const isSelected = selectedUsername === developer.username
                  const isCorrect = currentQuestion.correctUsername === developer.username

                  return (
                    <button
                      key={developer.username}
                      type="button"
                      disabled={Boolean(selectedUsername)}
                      onClick={() => handleGuess(developer.username)}
                      className={cn(
                        'group w-full rounded-[26px] border p-4 text-left transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        selectedUsername
                          ? 'cursor-default'
                          : 'hover:-translate-y-0.5 hover:shadow-lg',
                        isSelected && answeredCorrectly
                          ? 'border-emerald-400 bg-emerald-100/85 dark:border-emerald-500/60 dark:bg-emerald-500/10'
                          : null,
                        isSelected && !answeredCorrectly
                          ? 'border-rose-400 bg-rose-100/85 dark:border-rose-500/60 dark:bg-rose-500/10'
                          : null,
                        selectedUsername && !isSelected && isCorrect
                          ? 'border-sky-400 bg-sky-100/85 dark:border-sky-500/60 dark:bg-sky-500/10'
                          : null,
                        !selectedUsername
                          ? 'border-slate-300/80 bg-white/80 dark:border-slate-700 dark:bg-slate-950/75'
                          : null
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={developer.avatarUrl}
                          alt={developer.displayName}
                          className="h-14 w-14 rounded-2xl border border-slate-300 object-cover dark:border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-950 dark:text-slate-50">
                                {developer.displayName}
                              </p>
                              <p className="text-sm text-muted-foreground">@{developer.username}</p>
                            </div>
                            {selectedUsername && isCorrect && (
                              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-50 dark:bg-slate-50 dark:text-slate-950">
                                Answer
                              </span>
                            )}
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                            {developer.bio || 'Mystery builder with a suspiciously good repo radar.'}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}

                <div className="flex items-center justify-between rounded-[24px] border border-slate-300/80 bg-white/70 px-4 py-4 text-sm dark:border-slate-700 dark:bg-slate-950/70">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-50">
                      {selectedUsername
                        ? 'Ready for the next repo?'
                        : 'Pick the developer with the matching star.'}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      Question pool: {questionPool.length} unique repos
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={selectedUsername ? 'default' : 'outline'}
                    onClick={handleNextRound}
                  >
                    {selectedUsername ? 'Next Round' : 'Shuffle Repo'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
