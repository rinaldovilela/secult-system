import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Header from "@/components/layout/Header";
import { SocketProvider } from "@/lib/SocketContext";
import { Providers } from "./providers";
import { AuthProvider } from "@/lib/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-inter",
});

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
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full bg-background flex flex-col`}>
        <AuthProvider>
          <Providers>
            <SocketProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Toaster position="top-right" />
            </SocketProvider>
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
