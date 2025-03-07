import '/styles/globals.css';

import { Inter } from 'next/font/google';

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
      <body className={inter.className}>{children}</body>
    </html>
  )
}