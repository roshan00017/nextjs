// frontend/app/layout.tsx
"use client"; // Keep this line

import { Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../contexts/SocketContext";
import { getUsername } from "../utils/localStorage";
import { useState, useEffect } from "react";
import Script from "next/script"; // Import Next.js Script component
import { usePathname, useSearchParams } from "next/navigation"; // For tracking page views
import * as gtag from "../utils/gtag"; // Adjust path if you put gtag.js elsewhere

const inter = Inter({ subsets: ["latin"] });

// Your GA Tracking ID (from environment variable)
const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [username, setUsername] = useState<string | null>(null);
  const [hasCheckedUsername, setHasCheckedUsername] = useState(false);

  // For GA4 pageview tracking
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (GA_TRACKING_ID) {
      // Only track if ID is set
      const url = pathname + (searchParams?.toString() ?? "");
      gtag.pageview(url);
    }
  }, [pathname, searchParams]); // Re-run when path or search params change

  useEffect(() => {
    const storedUsername = getUsername();
    setUsername(storedUsername);
    setHasCheckedUsername(true);

    const handleUsernameChange = () => {
      const updatedUsername = getUsername();
      setUsername(updatedUsername);
    };

    window.addEventListener("storage", handleUsernameChange);
    window.addEventListener("usernameSet", handleUsernameChange);

    return () => {
      window.removeEventListener("storage", handleUsernameChange);
      window.removeEventListener("usernameSet", handleUsernameChange);
    };
  }, []);

  if (!hasCheckedUsername) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {/* Loading spinner or splash screen */}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Google Analytics Script */}
        {GA_TRACKING_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
            />
            <Script
              id="gtag-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_TRACKING_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}

        <SocketProvider username={username ?? ""}>{children}</SocketProvider>
      </body>
    </html>
  );
}
