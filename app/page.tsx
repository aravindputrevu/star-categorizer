import GithubUsernameForm from '@/components/GithubUsernameForm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="relative">
      <div className="absolute top-4 right-4">
        <Link href="/catalog">
          <Button variant="outline" className="text-sm">
            View Developer Catalog
          </Button>
        </Link>
      </div>
      <GithubUsernameForm />
    </main>
  )
}