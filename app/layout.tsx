import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/Providers/Providers";
import { Sidebar } from '@/components/organisms/Sidebar';
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WowClass Class Management",
  description: "Class Management System for WowClass built by Shemil",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="grid min-h-screen grid-cols-1 md:grid-cols-[auto_1fr]">
            <Sidebar />
            <main className="p-4 md:p-8 w-full min-w-[calc(100vw-18rem)]">
              <header>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold" >WowClass</h1>
                </div>
              </header>
              {children}
            </main>
          </div>
        </Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}