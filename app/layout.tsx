import { Inter } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const ChatBubble = dynamic(() => import('./components/ChatBubble'), { ssr: false })

export const metadata = {
  title: 'SayHey',
  description: 'iMessage inspired live chat app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
        <ChatBubble />
      </body>
    </html>
  )
}