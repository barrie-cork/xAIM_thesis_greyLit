import { TRPCProvider } from '@/components/TRPCProvider';
import Link from 'next/link';

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
        <TRPCProvider>
          <div className="container mx-auto px-4 py-8">
            <nav className="flex justify-between items-center mb-10">
              <Link href="/" className="text-2xl font-bold">Grey Literature Search</Link>
              <div className="flex gap-4">
                <Link href="/search" className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                  Search
                </Link>
                <Link href="/results" className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors">
                  Results
                </Link>
                <Link href="/documentation" className="px-4 py-2 rounded bg-purple-500 text-white hover:bg-purple-600 transition-colors">
                  API Docs
                </Link>
              </div>
            </nav>
            {children}
          </div>
        </TRPCProvider>
      </body>
    </html>
  )
}
