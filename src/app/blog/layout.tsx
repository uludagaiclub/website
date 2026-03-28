import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'UludagAIClub blog - Yapay zeka, teknoloji, eğitim ve topluluk haberleri. Son gelişmeleri takip edin.',
  openGraph: {
    title: 'Blog | UludagAIClub',
    description: 'Yapay zeka, teknoloji, eğitim ve topluluk haberleri',
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

