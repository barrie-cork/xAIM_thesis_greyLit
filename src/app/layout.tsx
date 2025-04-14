import { Providers } from '@/components/Providers';
import '@/styles/globals.css';

export const metadata = {
  title: 'Grey Literature Search',
  description: 'Systematic search and review of grey literature',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
