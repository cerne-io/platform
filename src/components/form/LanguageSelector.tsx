import React from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SUPPORTED_LANGUAGES } from "@/services/formLanguageService";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
    enabledLanguages: string[];
    activeLang: string;
    onLanguageChange: (lang: string) => void;
    disabled?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    enabledLanguages,
    activeLang,
    onLanguageChange,
    disabled = false,
}) => {
    if (enabledLanguages.length <= 1) return null;

    return (
        <div className="flex items-center gap-1 group">
            <Select value={activeLang} onValueChange={onLanguageChange} disabled={disabled}>
                <SelectTrigger className="w-auto h-auto min-w-[40px] px-2.5 py-1.5 rounded-lg bg-background/50 hover:bg-muted/80 border border-border/50 shadow-xs focus:ring-1 focus:ring-primary gap-2 transition-all active:scale-95">
                    <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <SelectValue>
                        <span className="text-xs font-medium text-foreground">
                            {SUPPORTED_LANGUAGES.find(l => l.code === activeLang)?.name}
                        </span>
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-md border border-border/80 text-popover-foreground rounded-xl shadow-lg">
                    {enabledLanguages.map((langCode) => {
                        const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === langCode);
                        return (
                            <SelectItem key={langCode} value={langCode} className="text-xs rounded-lg cursor-pointer">
                                <span>{langInfo?.name}</span>
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </div>
    );
};

export default LanguageSelector;
