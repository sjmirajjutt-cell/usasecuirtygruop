import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'USA Security & Protection Group',
  description: 'Guard operations, worksheets, and invoice management portal.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <head />
    <body>{children}</body>
  </html>
}
