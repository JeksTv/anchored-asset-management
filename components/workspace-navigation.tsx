'use client';
import type {ReactNode} from 'react';
import {useSidebar} from './ui/sidebar';
export function WorkspaceNavigation({children}:{children:ReactNode}) {
  const {setOpenMobile}=useSidebar();
  return <nav aria-label="Main navigation" onClick={()=>setOpenMobile(false)}>{children}</nav>;
}
