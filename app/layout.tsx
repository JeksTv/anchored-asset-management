import type { Metadata } from 'next';
import './globals.css';
import '@/components/management.css';
import './responsive.css';
import './brand-theme.css';
import './dark-theme.css';
export const metadata: Metadata = { title: 'AnchorEd Asset Management', description: 'Employee assets, onboarding provisioning, and offboarding clearance in one workspace.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{var t=localStorage.getItem('anchored-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}"}}/></head><body>{children}</body></html>; }
