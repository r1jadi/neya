export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "online":
      return "Pay online";
    case "pay_at_venue":
      return "Pay at venue";
    case "none":
      return "No payment";
    default:
      return "—";
  }
}

export function paymentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "paid":
      return "Paid";
    case "waived":
      return "Waived";
    case "due_at_venue":
      return "Due at venue";
    case "failed":
      return "Failed";
    case "refunded":
      return "Refunded";
    default:
      return status ?? "—";
  }
}

export function reservationStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "pending":
      return "Awaiting payment";
    case "pending_payment":
      return "Pay at venue";
    case "confirmed":
      return "Confirmed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status ?? "—";
  }
}
