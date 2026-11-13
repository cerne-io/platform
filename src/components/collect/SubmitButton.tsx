
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SubmitButtonProps {
  isSubmitting: boolean;
  isPublic?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  isPublic = false
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'public' });
  return (
    <div className="flex justify-center">
      <Button
        type="submit"
        disabled={isSubmitting}
        className={`w-full md:w-2/3 lg:w-1/2 ${isPublic
          ? 'bg-blue-600 hover:bg-blue-700 text-white py-3'
          : 'bg-primary hover:bg-primary/90'
          }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('button.submitting', "Submitting...")}
          </>
        ) : (
          t('button.submit', "Submit Your Story")
        )}
      </Button>
    </div>
  );
};

export default SubmitButton;
