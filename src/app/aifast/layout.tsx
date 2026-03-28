import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI-FAST Programı',
  description: '6 haftada sıfırdan AI projesi geliştirin. Hızlı AI geliştirme programı ile kariyerinize başlayın.',
  openGraph: {
    title: 'AI-FAST Programı | UludagAIClub',
    description: '6 haftada sıfırdan AI projesi geliştirin',
  },
};

export default function AifastLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

