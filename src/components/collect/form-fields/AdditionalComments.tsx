
import React from "react";
import { useForm } from "@/contexts/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";

interface AdditionalCommentsProps {

  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isPublic?: boolean;
}

const AdditionalComments: React.FC<AdditionalCommentsProps> = ({
  onChange,
  isPublic = false
}) => {
  const { additionalComments, setAdditionalComments } = useForm();
  const { t } = useTranslation('translation', { keyPrefix: 'public' });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalComments(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className={`border-t pt-4 mt-6 ${isPublic ? 'border-blue-100' : ''}`}>
      <Label
        htmlFor="additionalComments"
        className={`text-sm font-medium ${isPublic ? 'text-gray-800 dark:text-gray-100' : 'text-foreground'}`}
      >
        {t('form.comments.label', "Is there anything else you would like to share about this experience?")}
      </Label>
      <Textarea
        id="additionalComments"
        value={additionalComments}
        onChange={handleChange}
        placeholder={t('form.comments.placeholder', "Add any additional thoughts here...")}
        className={`mt-1 ${isPublic ? 'border-blue-200 focus:border-blue-400' : ''}`}
      />
    </div>
  );
};

export default AdditionalComments;
