"use client";

import { useEffect, useRef, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { bffApi, BffApiService } from "@/lib/bff-api";

interface AutocompleteProps<T extends FieldValues> {
  control?: Control<T>;
  name?: Path<T>;
  label?: string;
  placeholder: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function Autocomplete<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  value: propValue,
  onChange: propOnChange,
}: AutocompleteProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Only use useController if control and name are provided
  const { field } = control && name ? useController({ name, control }) : { field: undefined };
  const [suggestions, setSuggestions] = useState<{ text: { text: string; matches: any[] }; placeId: string }[]>([]);

  const fetchSuggestions = async (input: string) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await bffApi.getPlacesAutocomplete({ input });
      
      if (response.success && response.data) {
        if (response.data.suggestions) {
          setSuggestions(response.data.suggestions.map((s: any) => ({
            text: s.placePrediction.text, // text is an object
            placeId: s.placePrediction.placeId,
          })));
        } else if (response.data.predictions) {
          // Fallback for different response format
          setSuggestions(response.data.predictions.map((p: any) => ({
            text: { text: p.description, matches: [] },
            placeId: p.place_id,
          })));
        } else {
          setSuggestions([]);
        }
      } else {
        console.error("Failed to fetch suggestions:", response.error);
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    }
  };

  // Determine value and onChange based on mode
  const value = field ? field.value : propValue ?? "";
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field) {
      field.onChange(e);
      fetchSuggestions(e.target.value);
    } else if (propOnChange) {
      propOnChange(e.target.value);
      fetchSuggestions(e.target.value);
    }
  };
  const handleSelect = (text: string) => {
    if (field) {
      field.onChange(text);
    } else if (propOnChange) {
      propOnChange(text);
    }
    setSuggestions([]);
  };

  return (
    <div className="space-y-2 relative">
      {label && <Label htmlFor={name || label}>{label}</Label>}
      <Input
        id={name || label || 'autocomplete'}
        placeholder={placeholder}
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onBlur={field ? field.onBlur : undefined}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="bg-white border rounded shadow mt-1 max-h-48 overflow-auto z-50 absolute w-full">
          {suggestions.map((suggestion, idx) => (
            <li
              key={suggestion.placeId}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => handleSelect(suggestion.text.text)}
            >
              {suggestion.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
