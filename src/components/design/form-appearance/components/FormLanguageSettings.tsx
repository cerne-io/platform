import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Check, GripVertical } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { formLanguageService } from '@/services/formLanguageService';
import { toast } from '@/components/ui/use-toast';
import { debugError, debugLog } from '@/utils/debugLogger';
import { Loader2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/contexts/ProjectContext';

interface FormLanguageSettingsProps {
  projectId: string;
  onSave?: () => void;
}

const FormLanguageSettings: React.FC<FormLanguageSettingsProps> = ({ projectId, onSave }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(['en']);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const { currentUserProjectRole } = useProject();
  const isReadOnly = currentUserProjectRole === 'viewer';

  useEffect(() => {
    const loadSettings = async () => {
      if (!projectId) return;
      try {
        debugLog("[FormLanguageSettings] Loading settings for project:", projectId);
        const config = await formLanguageService.getLanguageConfig(projectId);
        if (config) {
          setEnabledLanguages(config.enabledLanguages || ['en']);
          setDefaultLanguage(config.defaultLanguage || 'en');
        }
      } catch (error) {
        debugError("[FormLanguageSettings] Error loading language settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    void loadSettings();
  }, [projectId]);

  const handleAddLanguage = (langCode: string) => {
    if (!enabledLanguages.includes(langCode)) {
      setEnabledLanguages([...enabledLanguages, langCode]);
    }
  };

  const handleRemoveLanguage = (langCode: string) => {
    if (langCode === defaultLanguage) {
      toast({
        title: "Default language",
        description: "You cannot remove the default language. Set another as default first.",
        variant: "destructive"
      });
      return;
    }
    setEnabledLanguages(enabledLanguages.filter(l => l !== langCode));
  };

  const handleSetDefault = (langCode: string) => {
    setDefaultLanguage(langCode);
    toast({
      description: `${SUPPORTED_LANGUAGES.find(l => l.code === langCode)?.name} is now the default language.`
    });
  };

  const handleSave = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await formLanguageService.saveLanguageConfig(projectId, {
        enabledLanguages,
        defaultLanguage
      });
      
      // Invalidate the project-languages query to refresh all dependent components
      void queryClient.invalidateQueries({ queryKey: ['project-languages', projectId] });
      
      if (enabledLanguages.length > 1) {
        setShowSuccessDialog(true);
      } else {
        toast({
          title: "Settings saved",
          description: "Language configuration and order updated."
        });
      }
      
      if (onSave) onSave();
    } catch (error) {
      debugError("[FormLanguageSettings] Error saving language settings:", error);
      toast({
        title: "Save failed",
        description: "Failed to update language settings.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const availableLanguages = SUPPORTED_LANGUAGES.filter(
    lang => !enabledLanguages.includes(lang.code)
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">
          Multi-language Support
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          Drag to reorder languages. The first language is the first one participants will see. 
          Click on a language to set it as the <strong>Default</strong>.
        </p>

        <Reorder.Group 
          axis="y" 
          values={enabledLanguages} 
          onReorder={isReadOnly ? () => {} : setEnabledLanguages}
          className="space-y-2 mb-6"
        >
          {enabledLanguages.map(langCode => {
            const lang = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
            const isDefault = langCode === defaultLanguage;
            
            return (
              <Reorder.Item 
                key={langCode} 
                value={langCode}
                className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-2 rounded-md border border-gray-100 dark:border-white/10 group cursor-default"
              >
                <div className={`text-gray-400 p-1 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}>
                  <GripVertical className="h-4 w-4" />
                </div>
                
                <div 
                  className={`flex-1 ${!isReadOnly ? 'cursor-pointer' : ''}`}
                  onClick={() => !isReadOnly && !isDefault && handleSetDefault(langCode)}
                >
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {lang?.name || langCode}
                  </span>
                  {isDefault && (
                    <Badge variant="default" className="ml-3 text-[10px] py-0 px-1.5 h-4 bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                      Default
                    </Badge>
                  )}
                </div>

                {!isDefault && !isReadOnly ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveLanguage(langCode)}
                    aria-label="Remove language"
                    title="Remove language"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>
                ) : isDefault ? (
                  <div className="w-7 h-7 flex items-center justify-center text-emerald-500">
                    <Check className="h-4 w-4" />
                  </div>
                ) : <div className="w-7 h-7" />}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        {!isReadOnly && (
          <div className="flex gap-4 items-end bg-gray-50/50 dark:bg-white/5 p-4 rounded-lg border border-dashed border-gray-200 dark:border-white/10">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">
                Add Language
              </label>
              <Select onValueChange={handleAddLanguage} value="">
                <SelectTrigger className="h-10 bg-white dark:bg-[#0d1117]">
                  <SelectValue placeholder="Add another language..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                  {availableLanguages.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      All supported languages added
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={() => void handleSave()} 
              disabled={isSaving}
              className="h-10 px-6 font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Configuration
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Languages updated! 🎉</DialogTitle>
            <DialogDescription className="pt-2 text-sm text-gray-600 dark:text-gray-300">
              You now have multiple languages enabled. The next step is to add translations for your questions in the Form Builder.
              <br/><br/>
              <strong>Tip:</strong> You can use the AI assistant to instantly translate them for you!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:justify-start">
            <Button 
              onClick={() => {
                setShowSuccessDialog(false);
                navigate('?step=form-builder');
              }} 
              className="w-full sm:w-auto"
            >
              Go to Form Builder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormLanguageSettings;
