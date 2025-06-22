"use client";

import {
  Control,
  Controller,
  FieldValues,
  Path,
  PathValue,
} from "react-hook-form";
import {
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";

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
  const places = useMapsLibrary("places");

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const [input, setInput] = useState<HTMLInputElement | null>(null);
        const [autocomplete, setAutocomplete] =
          useState<google.maps.places.Autocomplete | null>(null);

        useEffect(() => {
          if (places && input) {
            const ac = new places.Autocomplete(input, {
              componentRestrictions: { country: "us" },
              fields: ["formatted_address", "name", "types"],
            });
            setAutocomplete(ac);
          }
        }, [places, input]);

        useEffect(() => {
          if (autocomplete) {
            const listener = autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace();
              let address = place.formatted_address;
              if (
                place.types?.some(
                  (t) =>
                    t === "airport" ||
                    t === "train_station" ||
                    t === "bus_station"
                ) &&
                place.name
              ) {
                address = place.name;
              }

              if (address) {
                field.onChange(address as PathValue<T, Path<T>>);
              }
            });
            return () => {
              google.maps.event.clearInstanceListeners(autocomplete);
            };
          }
        }, [autocomplete, field.onChange]);

        useEffect(() => {
          if (input && field.value !== input.value) {
            input.value = field.value as string;
          }
        }, [input, field.value]);

        return (
          <div className="space-y-2">
            <label htmlFor={name}>{label}</label>
            <Input
              id={name}
              placeholder={placeholder}
              ref={setInput}
              onChange={(e) => field.onChange(e.target.value)}
              defaultValue={field.value}
            />
          </div>
        );
      }}
    />
  );
}
