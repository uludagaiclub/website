import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Junior Seviye',
  description: 'Python temelleri ile başlayın. Değişkenler, döngüler, fonksiyonlar ve daha fazlası. Junior seviye AI eğitimi.',
};

export default function JuniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

