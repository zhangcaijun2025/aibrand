export const metadata = {
  title: 'AiBrand',
  description: 'AiBrand',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
