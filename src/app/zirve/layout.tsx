import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yapay Zeka Zirvesi',
  description: "Türkiye'nin en büyük yapay zeka etkinliği. Alanında uzman konuşmacılar ve networking fırsatları.",
  openGraph: {
    title: 'Yapay Zeka Zirvesi | UludagAIClub',
    description: "Türkiye'nin en büyük yapay zeka etkinliği",
  },
};

export default function ZirveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

