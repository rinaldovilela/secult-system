import { Suspense } from "react";
import EditUserContent from "./EditUserContent";
import Loading from "@/components/ui/loading";

// Página principal que usa Suspense para lidar com useSearchParams
export default function EditUserPage() {
  return (
    <Suspense fallback={<Loading />}>
      <EditUserContent />
    </Suspense>
  );
}
