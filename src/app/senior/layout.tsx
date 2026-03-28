import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Senior Seviye',
  description: 'LLM, RAG, Advanced AI. Transformer modelleri, vector databases ve production AI sistemleri. Senior seviye AI eğitimi.',
};

export default function SeniorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

