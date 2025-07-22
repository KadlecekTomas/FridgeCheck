'use client';

import { useLayout } from '@/context/LayoutContext';
import AuthNavbar from './navbar/AuthNavbar';
import UnauthNavbar from './navbar/UnauthNavbar';

export default function Navbar() {
  const { layout } = useLayout();

  if (layout === 'auth') return <AuthNavbar />;
  if (layout === 'unauth') return <UnauthNavbar />;
  return null; // fallback
}
