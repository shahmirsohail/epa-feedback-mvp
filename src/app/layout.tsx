import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EPA",
  description: "Pre-filled EPA drafts from attending-resident conversations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-4 sm:py-6">
          <header className="mb-4">
            <div className="text-xl font-semibold">EPA</div>
          </header>

          {children}

          <footer className="mt-8 pt-4 border-t text-xs text-slate-500">
            Demo app. Do not use for real patient data without institutional approval, secure hosting, and consent.
          </footer>
        </div>
      </body>
    </html>
  );
}
