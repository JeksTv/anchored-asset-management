'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
export function ThemeToggle(){
 const [dark,setDark]=useState(false);
 useEffect(()=>{setDark(document.documentElement.classList.contains('dark'))},[]);
 function toggle(){const next=!dark;document.documentElement.classList.toggle('dark',next);document.documentElement.style.colorScheme=next?'dark':'light';setDark(next);try{localStorage.setItem('anchored-theme',next?'dark':'light')}catch{}}
 return <button type="button" className="theme-toggle" onClick={toggle} aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Switch to light mode':'Switch to dark mode'}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'Light mode':'Dark mode'}</span></button>
}
