import { debugLog } from "@/utils/debugLogger";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { RefObject } from "react";
import { useToast } from "@/hooks/toast";

interface PrintButtonProps {
    contentRef: RefObject<HTMLDivElement>;
    disabled?: boolean;
}

const PrintButton = ({ contentRef, disabled }: PrintButtonProps) => {
    const { toast } = useToast();

    const handlePrint = useReactToPrint({
        contentRef: contentRef,
        documentTitle: "Cerne Stories Export",
        onAfterPrint: () => {
            // Optional: Logic after print window closes

            debugLog("Print window closed");
        },
        onPrintError: (errorLocation, error) => {
            console.error("Print failed", errorLocation, error);
            toast({
                title: "Print failed",
                description: "There was an error generating the print view.",
                variant: "destructive"
            });
        }
    });

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={() => handlePrint()}
            disabled={disabled}
        >
            <Printer className="h-4 w-4 mr-1" />
            Print PDF
        </Button>
    );
};

export default PrintButton;
