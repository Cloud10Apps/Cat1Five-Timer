import dayjs from "dayjs";

export function isValidDateStr(value: string | undefined): boolean {
  if (!value) return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year  = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day   = parseInt(match[3], 10);
  if (year < 1900 || year > 2200) return false;
  if (month < 1   || month > 12)  return false;
  if (day < 1     || day > 31)    return false;
  return dayjs(value, "YYYY-MM-DD", true).isValid();
}

export const MONTH_OPTIONS = [
  { value: "01", label: "January" },  { value: "02", label: "February" },
  { value: "03", label: "March" },    { value: "04", label: "April" },
  { value: "05", label: "May" },      { value: "06", label: "June" },
  { value: "07", label: "July" },     { value: "08", label: "August" },
  { value: "09", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

export const AGING_BUCKET_OPTIONS = [
  { value: "due-future",    label: "Future (90+ Days)" },
  { value: "due-today",     label: "Due Today"   },
  { value: "due-1-7",       label: "Next 7 Days"  },
  { value: "due-8-14",      label: "Next 14 Days" },
  { value: "due-15-30",     label: "Next 30 Days" },
  { value: "due-31-60",     label: "Next 60 Days" },
  { value: "due-61-90",     label: "Next 90 Days" },
  { value: "overdue-1-30",  label: "Overdue 1–30 Days"   },
  { value: "overdue-31-60", label: "Overdue 31–60 Days"  },
  { value: "overdue-61-90", label: "Overdue 61–90 Days"  },
  { value: "overdue-91+",   label: "Overdue 91+ Days"    },
];

export function getAgingBucketValue(due: string | null | undefined, status?: string): string | null {
  if (status === "COMPLETED") return null;
  if (!due) return null;
  const days = dayjs().startOf("day").diff(dayjs(due).startOf("day"), "day");
  if (days === 0)   return "due-today";
  if (days > 90)    return "overdue-91+";
  if (days > 60)    return "overdue-61-90";
  if (days > 30)    return "overdue-31-60";
  if (days > 0)     return "overdue-1-30";
  if (days >= -7)   return "due-1-7";
  if (days >= -14)  return "due-8-14";
  if (days >= -30)  return "due-15-30";
  if (days >= -60)  return "due-31-60";
  if (days >= -90)  return "due-61-90";
  return "due-future";
}
