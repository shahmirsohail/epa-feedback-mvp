import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EPA Feedback MVP",
  description: "Draft EPA feedback from attending-resident conversations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <header className="flex items-center justify-between mb-6">
            <div>
              <div className="text-xl font-semibold">EPA Feedback MVP</div>
              <div className="text-sm text-slate-600">
                Upload/paste a feedback conversation → de-identify → map EPA → draft → approve → email
              </div>
            </div>
            <nav className="text-sm flex gap-4">
              <a href="/">Home</a>
              <a href="/upload">New session</a>
              <a href="/sessions">Sessions</a>
            </nav>
          </header>
          {children}
          <footer className="mt-10 pt-6 border-t text-xs text-slate-500">
            MVP demo. Do not use for real patient data without institutional approval, secure hosting, and consent.
          </footer>
        </div>
      </body>
    </html>
  );
}
