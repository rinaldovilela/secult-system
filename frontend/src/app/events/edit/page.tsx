// app/events/edit/page.tsx
import { Suspense } from "react";
import EditEventContent from "./EditEventContent";

export default function EditEvent() {
  return (
    <Suspense fallback={<div>Loading edit form...</div>}>
      <EditEventContent />
    </Suspense>
  );
}
