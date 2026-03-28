import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mid Plus Seviye',
  description: 'Derin öğrenme ve neural networks. TensorFlow ve PyTorch ile model geliştirme. Mid Plus seviye AI eğitimi.',
};

export default function MidPlusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

