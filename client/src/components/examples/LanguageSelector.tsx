import LanguageSelector from '../LanguageSelector';
import { useState } from 'react';
import type { Language } from '@shared/schema';

export default function LanguageSelectorExample() {
  const [language, setLanguage] = useState<Language>('hindi');
  
  return (
    <LanguageSelector 
      language={language} 
      onLanguageChange={(lang) => {
        setLanguage(lang);
        console.log('Language changed to:', lang);
      }} 
    />
  );
}
