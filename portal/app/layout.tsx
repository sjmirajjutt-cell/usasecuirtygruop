import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'USA Security & Protection Group',
  description: 'Guard operations, worksheets, and invoice management portal.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <head>
      {/*
        Bizzark integration: copy Html/dist/assets into public/bizzark/assets.
        CSS belongs in <head> so its Bootstrap and Material Design Kit rules are
        available before the first paint. Keep new portal styling in globals.css
        and Tailwind so the template can be upgraded independently.
      */}
      <link rel="stylesheet" href="/bizzark/assets/css/app.css" />
    </head>
    <body>
      {children}
      {/* Load legacy Bizzark plugins after hydration; do not import jQuery in Server Components. */}
      <Script src="/bizzark/assets/vendor/jquery.min.js" strategy="afterInteractive" />
      <Script src="/bizzark/assets/vendor/popper.min.js" strategy="afterInteractive" />
      <Script src="/bizzark/assets/vendor/bootstrap.min.js" strategy="afterInteractive" />
      <Script src="/bizzark/assets/js/app.js" strategy="afterInteractive" />
    </body>
  </html>
}
