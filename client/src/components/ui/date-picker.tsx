"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerInputProps = {
  id: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromDate?: Date;
  toDate?: Date;
};

function formatDisplayDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function parseDateValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (isNaN(parsedDate.getTime())) {
    return undefined;
  }

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return undefined;
  }

  return parsedDate;
}

function formatDateValue(date: Date | undefined) {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePickerInput({
  id,
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  fromDate,
  toDate,
}: DatePickerInputProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = React.useMemo(() => parseDateValue(value), [value]);
  const [month, setMonth] = React.useState<Date | undefined>(selectedDate);

  React.useEffect(() => {
    if (selectedDate) {
      setMonth(selectedDate);
    }
  }, [selectedDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup
        className={cn(
          "h-11 rounded-xs border border-muted-foreground/60 !bg-white dark:!bg-white shadow-none",
          className
        )}
      >
        <InputGroupInput
          id={id}
          value={formatDisplayDate(selectedDate)}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className="h-11 cursor-pointer placeholder:text-foreground/60"
          onClick={() => {
            if (!disabled) {
              setOpen(true);
            }
          }}
          onKeyDown={(event) => {
            if (
              event.key === "ArrowDown" ||
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();
              if (!disabled) {
                setOpen(true);
              }
            }
          }}
        />

        <InputGroupAddon align="inline-end">
          <PopoverTrigger asChild>
            <InputGroupButton
              id={`${id}-date-picker`}
              variant="ghost"
              size="icon-xs"
              disabled={disabled}
              aria-label="Select date"
              className="cursor-pointer"
            >
              <CalendarIcon />
              <span className="sr-only">Select date</span>
            </InputGroupButton>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={selectedDate}
              month={month}
              fromDate={fromDate}
              toDate={toDate}
              onMonthChange={setMonth}
              onSelect={(nextDate) => {
                onChange?.(formatDateValue(nextDate));
                if (nextDate) {
                  setMonth(nextDate);
                }
                setOpen(false);
              }}
            />
          </PopoverContent>
        </InputGroupAddon>
      </InputGroup>
    </Popover>
  );
}
