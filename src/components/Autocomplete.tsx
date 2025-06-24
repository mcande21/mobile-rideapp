"use client";

import { useEffect, useRef, useState } from "react";
import { Control, FieldValues, Path, useController } from "react-hook-form";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AutocompleteProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
}

export function Autocomplete<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: AutocompleteProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { field } = useController({
    name,
    control,
  });
  // Update the suggestion type to match the API response
  const [suggestions, setSuggestions] = useState<{ text: { text: string; matches: any[] }; placeId: string }[]>([]);

  const fetchSuggestions = async (input: string) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(input)}`);
    const data = await res.json();
    if (data.suggestions) {
      setSuggestions(data.suggestions.map((s: any) => ({
        text: s.placePrediction.text, // text is an object
        placeId: s.placePrediction.placeId,
      })));
    } else {
      setSuggestions([]);
    }
  };

  return (
    <div className="space-y-2 relative">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        placeholder={placeholder}
        ref={inputRef}
        value={field.value ?? ""}
        onChange={e => {
          field.onChange(e);
          fetchSuggestions(e.target.value);
        }}
        onBlur={field.onBlur}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="bg-white border rounded shadow mt-1 max-h-48 overflow-auto z-50 absolute w-full">
          {suggestions.map((suggestion, idx) => (
            <li
              key={suggestion.placeId}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
              onMouseDown={() => {
                field.onChange(suggestion.text.text);
                setSuggestions([]);
              }}
            >
              {suggestion.text.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
