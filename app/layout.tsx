import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Congressional Committee Meetings',
  description: 'Track upcoming U.S. House and Senate committee meetings',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
