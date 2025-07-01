import '/styles/globals.css';

import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Star Categorizer - Organize GitHub Stars',
  description: 'Automatically organize your GitHub starred repositories into meaningful categories',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="bg-background shadow-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                  <a href="/" className="text-lg font-bold text-foreground">Star Categorizer</a>
                </div>
                <div className="flex items-center space-x-4">
                  <nav className="flex space-x-4">
                    <a href="/" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Home
                    </a>
                    <a href="/saved-lists" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Saved Lists
                    </a>
                    <a href="/catalog" className="text-muted-foreground hover:text-foreground px-3 py-2 rounded-md text-sm font-medium transition-colors">
                      Developer Catalog
                    </a>
                  </nav>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          <main className="bg-background min-h-screen">
            {children}
          </main>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
