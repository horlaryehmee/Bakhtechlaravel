import React from "react";
import { cn } from "@/lib/utils";

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface CalendarDayProps {
  day: number | string;
  isHeader?: boolean;
  isAvailable?: boolean;
  isSelected?: boolean;
  isToday?: boolean;
  onClick?: () => void;
}

const CalendarDay: React.FC<CalendarDayProps> = ({
  day,
  isHeader,
  isAvailable,
  isSelected,
  isToday,
  onClick,
}) => {
  return (
    <div
      onClick={!isHeader && onClick ? onClick : undefined}
      className={cn(
        "col-span-1 row-span-1 flex items-center justify-center rounded-2xl cursor-pointer transition-all",
        "h-11 w-full border text-sm shadow-sm sm:h-12 md:h-14",
        isHeader && "h-8 cursor-default border-transparent bg-transparent py-2 text-xs font-black text-[var(--muted)] shadow-none",
        !isHeader && !isAvailable && "cursor-not-allowed border-transparent bg-[var(--surface-2)] text-[var(--muted)] opacity-45 shadow-none",
        !isHeader && isAvailable && !isSelected && "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--brand)] hover:bg-[color-mix(in_srgb,var(--brand)_9%,var(--surface))] hover:text-[var(--brand)]",
        !isHeader && isSelected && "border-[var(--brand)] bg-[var(--brand)] text-[var(--primary-foreground)] shadow-[0_16px_34px_rgba(88,125,159,0.22)]"
      )}
    >
      <div className="grid gap-1 items-center justify-center">
        <span className={cn("font-medium", isHeader && "text-sm")}>{day}</span>
        {isToday && !isSelected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] mx-auto" />}
        {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white mx-auto" />}
      </div>
    </div>
  );
};

interface CalendarProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  availableDates: string[];
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function Calendar({
  currentMonth,
  availableDates,
  selectedDate,
  onDateSelect,
}: CalendarProps) {
  const currentYear = currentMonth.getFullYear();
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = new Date(currentYear, currentMonth.getMonth() + 1, 0).getDate();

  const isDateAvailable = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return availableDates.includes(dateStr);
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isDateToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const renderCalendarDays = () => {
    const days: React.ReactNode[] = [
      ...dayNames.map((day) => (
        <CalendarDay key={`header-${day}`} day={day} isHeader />
      )),
      ...Array(firstDayOfWeek).fill(null).map((_, i) => (
        <div key={`empty-start-${i}`} className="col-span-1 row-span-1 h-10 w-full sm:h-12 md:h-14" />
      )),
      ...Array(daysInMonth)
        .fill(null)
        .map((_, i) => {
          const date = new Date(currentYear, currentMonth.getMonth(), i + 1);
          return (
            <CalendarDay
              key={`date-${i + 1}`}
              day={i + 1}
              isAvailable={isDateAvailable(date)}
              isSelected={isDateSelected(date)}
              isToday={isDateToday(date)}
              onClick={() => isDateAvailable(date) && onDateSelect(date)}
            />
          );
        }),
    ];

    return days;
  };

  return (
    <div className="grid grid-cols-7 gap-1.5 rounded-3xl border border-[var(--line)] bg-[var(--surface-2)] p-2 sm:gap-2 sm:p-3">
      {renderCalendarDays()}
    </div>
  );
}
