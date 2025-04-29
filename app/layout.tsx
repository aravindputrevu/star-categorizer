import '/styles/globals.css';

import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

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
    <html lang="en">
      <body className={inter.className}>
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <a href="/" className="text-lg font-bold text-gray-900">Star Categorizer</a>
              </div>
              <nav className="flex space-x-4">
                <a href="/" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Home
                </a>
                <a href="/saved-lists" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Saved Lists
                </a>
                <a href="/catalog" className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  Developer Catalog
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main>
          {children}
        </main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
