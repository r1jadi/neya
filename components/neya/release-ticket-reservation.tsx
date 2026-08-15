"use client";

import { useEffect } from "react";
import { releaseTicketReservation } from "@/actions/bookings";

export function ReleaseTicketReservation({ orderId }: { orderId?: string }) {
  useEffect(() => {
    if (orderId) void releaseTicketReservation(orderId);
  }, [orderId]);

  return null;
}
