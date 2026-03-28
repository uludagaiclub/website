import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workshoplar',
  description: 'Her dönem, alanında deneyimli eğitmenlerle uygulamalı yapay zeka eğitimleri. Workshop programları ve içerikleri.',
  openGraph: {
    title: 'Workshoplar | UludagAIClub',
    description: 'Uygulamalı yapay zeka eğitimleri',
  },
};

export default function WorkshoplarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

