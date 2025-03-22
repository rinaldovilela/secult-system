import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Secult System",
  description: "Sistema de Gestão Cultural",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <body
        className={`${inter.className} h-full bg-neutral-100 flex flex-col`}
      >
        <Header />
        <main className="flex-1 ">{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
