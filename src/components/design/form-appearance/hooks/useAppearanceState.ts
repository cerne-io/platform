
import { useState, useCallback, useEffect } from "react";
import { FormAppearance } from "../types";
import { defaultAppearance } from "../types";

export const useAppearanceState = (initialAppearance: FormAppearance | null) => {
  const [appearance, setAppearance] = useState<FormAppearance>({...defaultAppearance});
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);

  // Update state when loaded appearance changes
  useEffect(() => {
    if (initialAppearance) {
      setAppearance(initialAppearance);
    }
  }, [initialAppearance]);

  // Reset appearance to defaults
  const resetAppearance = useCallback(() => {
    setAppearance({...defaultAppearance});
  }, []);

  // Memoized handlers to prevent unnecessary re-renders
  const handleBackgroundColorChange = useCallback((color: string) => {
    setAppearance(prev => ({ ...prev, backgroundColor: color }));
  }, []);

  const handleLogoChange = useCallback((url: string, file?: File) => {
    setAppearance(prev => ({ ...prev, logoUrl: url }));
    if (file) {
      setPendingLogoFile(file);
    }
  }, []);

  const handleHeaderTextChange = useCallback((text: string, lang?: string) => {
    setAppearance(prev => {
      // If lang is provided, handle multi-language dictionary
      if (lang) {
        let currentHeader: Record<string, string>;
        
        if (typeof prev.headerText === 'object' && prev.headerText !== null) {
          // It's already an object, just copy it
          currentHeader = { ...prev.headerText };
        } else {
          // It's a string (backward compatibility), treat it as 'en' 
          // unless it's empty, then use defaults if needed later
          currentHeader = { en: prev.headerText || "" };
        }
        
        return { ...prev, headerText: { ...currentHeader, [lang]: text } };
      }
      
      // If lang is NOT provided, we have to decide: overwrite or update 'en'?
      // To be safe and backward compatible, if it's already an object, update 'en'
      if (typeof prev.headerText === 'object' && prev.headerText !== null) {
        return { ...prev, headerText: { ...prev.headerText, en: text } };
      }
      
      // Otherwise, just update the string (legacy behavior)
      return { ...prev, headerText: text };
    });
  }, []);

  const handleSubheaderTextChange = useCallback((text: string, lang?: string) => {
    setAppearance(prev => {
      // If lang is provided, handle multi-language dictionary
      if (lang) {
        let currentSubheader: Record<string, string>;
        
        if (typeof prev.subheaderText === 'object' && prev.subheaderText !== null) {
          currentSubheader = { ...prev.subheaderText };
        } else {
          currentSubheader = { en: prev.subheaderText || "" };
        }
        
        return { ...prev, subheaderText: { ...currentSubheader, [lang]: text } };
      }
      
      // If lang is NOT provided, update 'en' if object, or overwrite if string
      if (typeof prev.subheaderText === 'object' && prev.subheaderText !== null) {
        return { ...prev, subheaderText: { ...prev.subheaderText, en: text } };
      }
      
      return { ...prev, subheaderText: text };
    });
  }, []);

  return {
    appearance,
    setAppearance,
    pendingLogoFile,
    setPendingLogoFile,
    resetAppearance,
    handleBackgroundColorChange,
    handleLogoChange,
    handleHeaderTextChange,
    handleSubheaderTextChange
  };
};
