import type { Viewport } from 'next';

export const viewport: Viewport = {
  width: 800,
  // We explicitly do not set initialScale so mobile browsers will zoom out to fit 800px
};

export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
