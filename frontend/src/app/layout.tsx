"use client";
import { Inter } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "../contexts/SocketContext";
import { getUsername } from "../utils/localStorage";
import { useState, useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [username, setUsername] = useState<string | null>(null);
  const [hasCheckedUsername, setHasCheckedUsername] = useState(false);

  useEffect(() => {
    // On mount, get username from localStorage
    const storedUsername = getUsername();
    setUsername(storedUsername);
    setHasCheckedUsername(true);

    // Handler to update username state when localStorage changes
    const handleUsernameChange = () => {
      const updatedUsername = getUsername();
      setUsername(updatedUsername);
    };

    // Listen for both storage (other tabs) and custom usernameSet (this tab)
    window.addEventListener("storage", handleUsernameChange);
    window.addEventListener("usernameSet", handleUsernameChange);

    return () => {
      window.removeEventListener("storage", handleUsernameChange);
      window.removeEventListener("usernameSet", handleUsernameChange);
    };
  }, []); // Only run once on mount

  // Do not render children until username check is complete
  if (!hasCheckedUsername) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {/* Optionally, show a loading spinner here */}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <SocketProvider username={username ?? ""}>{children}</SocketProvider>
      </body>
    </html>
  );
}
