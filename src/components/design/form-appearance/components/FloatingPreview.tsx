import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Move } from "lucide-react";
import AppearancePreviewWrapper from "./AppearancePreviewWrapper";
import { FormAppearance } from "../types";
import { Button } from "@/components/ui/button";

interface FloatingPreviewProps {
  appearance: FormAppearance;
  activeLang?: string;
}

const FloatingPreview: React.FC<FloatingPreviewProps> = ({ 
  appearance, 
  activeLang 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return (
      <div className="fixed top-[100px] right-6 z-50">
        <Button 
          onClick={() => setIsVisible(true)}
          className="shadow-lg rounded-full px-6 bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
        >
          <Maximize2 className="h-4 w-4" />
          Show Preview
        </Button>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {/* Full size draggable preview */}
        {isExpanded ? (
          <motion.div
            key="expanded"
            layoutId="preview-card"
            drag
            dragMomentum={false}
            className="pointer-events-auto absolute left-1/2 top-1/2 -ml-[250px] -mt-[300px] w-[500px] z-50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden relative group">
              {/* Drag Handle Overlay (Visible on Hover) */}
              <div className="absolute inset-x-0 top-0 h-10 flex items-center justify-center pointer-events-none bg-gradient-to-b from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <Move className="h-4 w-4 text-muted-foreground/60" />
              </div>

              {/* Toolbar */}
              <div className="absolute right-3 top-3 z-10 flex gap-2">
                <button
                  type="button"
                  aria-label="Close expanded preview"
                  title="Close expanded preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="p-1.5 bg-black/5 hover:bg-black/10 rounded-full transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-1">
                <AppearancePreviewWrapper appearance={appearance} activeLang={activeLang} isMini={false} />
              </div>
            </div>
          </motion.div>
        ) : (
          /* Mini PIP thumbnail */
          <motion.div
            key="mini"
            layoutId="preview-card"
            onClick={() => setIsExpanded(true)}
            className="pointer-events-auto absolute top-[100px] right-6 w-[220px] cursor-pointer group transition-transform hover:scale-[1.02]"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="bg-white rounded-xl shadow-xl border border-border/60 overflow-hidden relative">
              {/* Tooltip hint on hover */}
              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 flex items-center justify-center transition-all z-10">
                <div className="bg-primary text-white text-[10px] font-bold py-1 px-3 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center gap-1.5 shadow-lg">
                  <Maximize2 className="h-3 w-3" />
                  Expand Preview
                </div>
              </div>
              
              {/* Close (Hide) Button */}
              <button
                type="button"
                aria-label="Hide preview"
                title="Hide preview"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsVisible(false);
                }}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded-full z-20 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:opacity-100"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>

              <div className="p-0.5">
                <AppearancePreviewWrapper appearance={appearance} activeLang={activeLang} isMini={true} />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default FloatingPreview;
