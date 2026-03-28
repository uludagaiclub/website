import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Junior Plus Seviye',
  description: 'Python ile ileri seviye programlama. OOP, modüller, hata yönetimi. Junior Plus seviye AI eğitimi.',
};

export default function JuniorPlusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

