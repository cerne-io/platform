import React from "react";
import { useTranslation } from "react-i18next";

const FormHeader: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="mb-8 text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 mb-2">
                Form Studio
            </div>
            <h1 className="font-heading font-semibold text-3xl sm:text-4xl text-foreground tracking-[-0.03em] [text-wrap:balance]">
                {t('admin.form.preview_title', 'Form Preview')}
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto [text-wrap:pretty]">
                {t('admin.form.preview_description', 'Preview, test, and experience your story collection form exactly as participants will see it.')}
            </p>
        </div>
    );
};

export default FormHeader;
