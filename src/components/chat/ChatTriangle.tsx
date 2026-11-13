
import React, { useState } from "react";
import TrianglePicker from "@/components/collect/form-fields/TrianglePicker";
import { DEFAULT_TRIANGLE_POSITION } from "@/components/collect/form-fields/trianglePickerConstants";
import { Button } from "@/components/ui/button";
import { Check, SkipForward } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ChatTriangleProps {
    questionId: number;
    question: string;
    topLabel: string;
    bottomLeftLabel: string;
    bottomRightLabel: string;
    onSubmit: (questionId: number, x: number, y: number) => void;
    onSkip: (questionId: number) => void;
    disabled?: boolean;
}

const ChatTriangle: React.FC<ChatTriangleProps> = ({
    questionId,
    question,
    topLabel,
    bottomLeftLabel,
    bottomRightLabel,
    onSubmit,
    onSkip,
    disabled = false
}) => {
    const { t } = useTranslation('translation', { keyPrefix: 'public.button' });
    const [position, setPosition] = useState<{ x: number; y: number }>(DEFAULT_TRIANGLE_POSITION);
    const [hasInteracted, setHasInteracted] = useState(false);

    const handlePositionChange = (x: number, y: number) => {
        setPosition({ x, y });
        setHasInteracted(true);
    };

    const handleSubmit = () => {
        onSubmit(questionId, position.x, position.y);
    };

    const handleSkip = () => {
        onSkip(questionId);
    };

    return (
        <div className="space-y-4 p-4 bg-card rounded-xl border border-border/80 shadow-xs">
            <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground leading-snug [text-wrap:pretty]">{question}</p>

                <div className="flex justify-center">
                    <TrianglePicker
                        topLabel={topLabel}
                        bottomLeftLabel={bottomLeftLabel}
                        bottomRightLabel={bottomRightLabel}
                        position={position}
                        onChange={handlePositionChange}
                        disabled={disabled}
                        compact={true}
                    />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSkip}
                        disabled={disabled}
                        className="active:scale-[0.98] transition-transform duration-150"
                    >
                        <SkipForward className="h-3 w-3 mr-1" />
                        {t('skip')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={disabled || !hasInteracted}
                        className="active:scale-[0.98] transition-transform duration-150 shadow-xs"
                    >
                        <Check className="h-3 w-3 mr-1" />
                        {t('submit_response')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChatTriangle;
