// app/events/page.tsx
import { Suspense } from "react";
import EventDetailsContent from "./EventDetailsContent";

export default function EventDetails() {
  return (
    <Suspense fallback={<div>Loading event details...</div>}>
      <EventDetailsContent />
    </Suspense>
  );
}
