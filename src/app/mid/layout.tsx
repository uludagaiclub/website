import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mid Seviye',
  description: 'Makine öğrenmesi temelleri. Scikit-learn ile model eğitimi, değerlendirme ve optimizasyon. Mid seviye AI eğitimi.',
};

export default function MidLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

