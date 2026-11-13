import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, QrCode } from "lucide-react";
import { useFormLink } from "@/hooks/collect/useFormLink";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme-provider";

interface QRCodeGeneratorProps {
    className?: string;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ className }) => {
    const { formId, isGenerating } = useFormLink();
    const downloadQrRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const formUrl = formId ? `${window.location.origin}/submit-story/${formId}` : "";

    const handleDownload = () => {
        if (!downloadQrRef.current) return;

        const canvas = downloadQrRef.current.querySelector("canvas");
        if (!canvas) return;

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `project-qr-code-${formId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Removed auto-generation side effect to prevent recreation after revoke
    // The parent component controls generation.


    // Determine colors based on theme
    // Note: ThemeProvider might return 'system', so we might need to handle that. 
    // For simplicity, we'll check if the class 'dark' exists on document root or rely on theme context if it resolves 'system'
    // But since we can't easily check 'system' resolution in JS without a hook that does media query, 
    // We will rely on the fact that the 'dark' class is present on the HTML element if it's dark mode.
    // However, for React rendering prop, we need state. 
    // Let's rely on the theme value. If 'system', we might default to light or try to detect.
    // Actually, `useTheme` returns the set theme. 
    // Let's refine: The best way to sync with CSS dark mode is to check if 'dark' or 'system' (and matchMedia) is active.
    // But for this component, let's try a simple heuristic or CSS dependency.
    // QRCodeCanvas unfortunately requires JS colors.

    // Helper to get current actual theme
    const [isDark, setIsDark] = React.useState(false);

    React.useEffect(() => {
        const checkDarkMode = () => {
            const isDarkClass = document.documentElement.classList.contains("dark");
            setIsDark(isDarkClass);
        };

        checkDarkMode(); // Initial check

        // precise observer for class changes on html element
        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        return () => observer.disconnect();
    }, [theme]);


    return (
        <Card className={cn("flex flex-col h-full bg-card border border-border/80 shadow-xs rounded-xl", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center">
                    <QrCode className="mr-2 h-5 w-5 inline text-primary" />
                    Form QR Code
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                    Scan or download a QR code to open the story submission form.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center space-y-6 pt-1">
                {isGenerating || !formId ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                        <p className="text-sm">Generating QR Code...</p>
                    </div>
                ) : (
                    <>
                        {/* Visible QR Code (Themed) */}
                        <div className="p-4 bg-background rounded-xl border border-border/60 shadow-xs flex justify-center">
                            <QRCodeCanvas
                                value={formUrl}
                                size={190}
                                level={"H"}
                                includeMargin={true}
                                bgColor={isDark ? "#090d16" : "#FFFFFF"}
                                fgColor={isDark ? "#f8fafc" : "#0f172a"}
                            />
                        </div>

                        {/* Hidden Standard QR Code for Download (Always Black on White) */}
                        <div ref={downloadQrRef} className="hidden">
                            <QRCodeCanvas
                                value={formUrl}
                                size={400} // Higher res for download
                                level={"H"}
                                includeMargin={true}
                                bgColor="#FFFFFF"
                                fgColor="#000000"
                            />
                        </div>

                        <p className="text-xs text-muted-foreground text-center max-w-xs">
                            Scan with a phone camera to open the submission form directly.
                        </p>
                        <Button onClick={handleDownload} variant="outline" className="w-full sm:w-auto shadow-xs border-border/80 hover:bg-accent/60">
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default QRCodeGenerator;
