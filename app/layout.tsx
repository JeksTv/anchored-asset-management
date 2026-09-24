import type { Metadata } from 'next';
import './globals.css';
import '@/components/management.css';
import './responsive.css';
export const metadata: Metadata = { title: 'AnchorEd Asset Management', description: 'Employee assets, onboarding provisioning, and offboarding clearance in one workspace.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
