"use client";

import React from "react";
import PhoneInputWithCountrySelect from "react-phone-number-input";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import "react-phone-number-input/style.css";

interface PhoneInputProps {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  className?: string;
}

// Utility: sanitize phone input
function sanitizePhone(value: string | undefined): string | undefined {
  if (!value) return value;
  // Remove control/invisible chars
  let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g, "");
  // Limit length
  if (sanitized.length > 20) sanitized = sanitized.slice(0, 20);
  return sanitized;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  required = false,
  label,
  error,
  className,
}: PhoneInputProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label 
          htmlFor="phone-input" 
          className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}
        >
          {label}
        </Label>
      )}
      <div className="relative">
        <PhoneInputWithCountrySelect
          id="phone-input"
          international
          countryCallingCodeEditable={false}
          defaultCountry="US"
          value={value}
          onChange={v => onChange(sanitizePhone(v))}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            '--PhoneInputCountryFlag-height': '1rem',
            '--PhoneInputCountryFlag-borderRadius': '2px',
          } as React.CSSProperties}
          className={cn("w-full")}
          numberInputProps={{
            className: cn(
              // Base input styling to match shadcn/ui Input component
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-red-500 focus-visible:ring-red-500"
            ),
          }}
        />
        {/* Custom styling for the country selector overlay */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <div className="flex items-center gap-0 text-sm text-muted-foreground">
            {/* This space is used by the react-phone-number-input country selector */}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
