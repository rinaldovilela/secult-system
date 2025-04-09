// app/users/page.tsx
import { Suspense } from "react";
import UserDetailsContent from "./UserDetailsContent";

export default function UserDetails() {
  return (
    <Suspense fallback={<div>Loading user data...</div>}>
      <UserDetailsContent />
    </Suspense>
  );
}
