"use client";

import { Control, FieldValues, Path, useController } from "react-hook-form";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
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
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);

  const { field } = useController({
    name,
    control,
  });

  const onChangeRef = useRef(field.onChange);
  useEffect(() => {
    onChangeRef.current = field.onChange;
  }, [field.onChange]);

  useEffect(() => {
    if (!places || !inputRef.current) {
      return;
    }

    const autocomplete = new places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "name", "types"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place) {
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
          onChangeRef.current(address);
        }
      }
    });

    return () => {
      if (autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [places]);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        placeholder={placeholder}
        ref={(instance) => {
          field.ref(instance);
          (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = instance;
        }}
        value={field.value ?? ""}
        onChange={field.onChange}
        onBlur={field.onBlur}
      />
    </div>
  );
}
