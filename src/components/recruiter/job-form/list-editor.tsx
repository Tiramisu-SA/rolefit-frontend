"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldMessage } from "@/components/seeker/profile/shared";
import { useRowKeys } from "@/lib/use-row-keys";

/** An editable list of short text items (responsibilities, accepted fields). */
export function ListEditor({
  legend,
  itemLabel,
  value,
  onChange,
  placeholder,
  error,
}: {
  legend: string;
  itemLabel: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  const rows = useRowKeys(value.length);
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium">{legend}</legend>
      {value.map((item, i) => (
        <div key={rows.keys[i]} className="flex items-center gap-2">
          <Input
            aria-label={`${itemLabel} ${i + 1}`}
            value={item}
            placeholder={placeholder}
            onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))}
          />
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={`Remove ${itemLabel.toLowerCase()} ${i + 1}`}
            onClick={() => {
              rows.remove(i);
              onChange(value.filter((_, j) => j !== i));
            }}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ))}
      <FieldMessage message={error} />
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-fit"
        onClick={() => {
          rows.add();
          onChange([...value, ""]);
        }}
      >
        <Plus className="size-4" aria-hidden />
        Add {itemLabel.toLowerCase()}
      </Button>
    </fieldset>
  );
}
