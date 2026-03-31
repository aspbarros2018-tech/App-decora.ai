import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export default function Logo({ className = "h-10", showText = true }: LogoProps) {
  const [imageError, setImageError] = useState(false);

  if (!imageError) {
    return (
      <img 
        src="/logo.png" 
        alt="Decora.ai" 
        className={`object-contain ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 100 100" className="h-full aspect-square" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="48" fill="white" />
        <circle cx="50" cy="50" r="42" stroke="#c5a059" strokeWidth="12" />
        <circle cx="50" cy="50" r="26" stroke="#1a1a1a" strokeWidth="12" />
        <circle cx="50" cy="50" r="14" fill="#1a1a1a" />
        <path d="M36 52 L46 62 L68 36" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      
      {showText && (
        <div className="flex flex-col justify-center">
          <h1 className="text-white text-xl font-extrabold leading-none tracking-tight">
            Decora<span className="text-[#c5a059]">.ai</span>
          </h1>
          <span className="text-[#c5a059] text-[9px] font-bold tracking-[0.15em] mt-1 uppercase">
            FLASHCARDS E QUESTÕES - EAP PMMG
          </span>
        </div>
      )}
    </div>
  );
}
