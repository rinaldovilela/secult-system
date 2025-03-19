import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="bg-neutral-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h2 className="text-xl font-bold">Secult System</h2>
        <div>
          <Button variant="outline" className="mr-2">
            Login
          </Button>
          <Button>Registrar</Button>
        </div>
      </div>
    </header>
  );
}
