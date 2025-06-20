/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import styles from "./Calendar.module.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={`${styles.calendarRoot} ${className ?? ""}`}
      classNames={{
        months: styles.calendarMonths,
        month: styles.calendarMonth,
        caption: styles.calendarCaption,
        caption_label: styles.calendarCaptionLabel,
        nav: styles.calendarNav,
        nav_button: styles.calendarNavButton,
        nav_button_previous: styles.calendarNavButtonPrev,
        nav_button_next: styles.calendarNavButtonNext,
        table: styles.calendarTable,
        head_row: styles.calendarHeadRow,
        head_cell: styles.calendarHeadCell,
        row: styles.calendarRow,
        cell: styles.calendarCell,
        day: styles.calendarDay,
        day_range_end: styles.calendarDayRangeEnd,
        day_selected: styles.calendarDaySelected,
        day_today: styles.calendarDayToday,
        day_outside: styles.calendarDayOutside,
        day_disabled: styles.calendarDayDisabled,
        day_range_middle: styles.calendarDayRangeMiddle,
        day_hidden: styles.calendarDayHidden,
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className={styles.calendarNavButton} />,
        IconRight: ({ ..._props }) => <ChevronRight className={styles.calendarNavButton} />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };