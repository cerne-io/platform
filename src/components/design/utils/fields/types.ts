
/**
 * Core type definitions for form fields
 */

/**
 * Form field type definition for rendering fields
 */
export interface FormField {
  id: string;
  label: string;
  isTextarea?: boolean;
  isList?: boolean;
  isSlider?: boolean;
  sliderValue?: number;
  leftLabel?: string;
  rightLabel?: string;
}

/**
 * Legacy ActivityField interface for backward compatibility
 * @deprecated Use FormField interface instead
 */
export interface ActivityField {
  id: string;
  label: string;
  isTextarea: boolean;
}
