import { format } from "date-fns";

export function formatPKR(amount: number | null | undefined): string {
  if (amount == null) return "Rs 0";
  return "Rs " + amount.toLocaleString("en-PK");
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    return format(new Date(dateString), "MMM dd, yyyy");
  } catch (e) {
    return dateString;
  }
}
