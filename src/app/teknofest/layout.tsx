import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Teknofest Takımları',
  description: 'UludagAIClub Teknofest yarışma takımları. Görüntü işleme, NLP, otonom sistemler ve daha fazlası.',
  openGraph: {
    title: 'Teknofest Takımları | UludagAIClub',
    description: 'Teknofest yarışma takımlarımız ve projeleri',
  },
};

export default function TeknofestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

