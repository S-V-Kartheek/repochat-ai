import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import NavigationProgress from "@/components/NavigationProgress";
import { ThemeProvider } from "@/lib/ThemeContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoTalk — AI-Powered Chat with Any GitHub Repository",
  description:
    "RepoTalk indexes any GitHub repository and lets you ask engineering questions with perfectly cited, grounded answers. AST-aware chunking, hybrid search, and RAGAS evaluation.",
  keywords: [
    "GitHub", "RAG", "AI", "codebase", "developer tool",
    "code search", "code intelligence", "LLM", "Llama", "Qdrant",
  ],
  authors: [{ name: "RepoTalk" }],
  openGraph: {
    title: "RepoTalk — Chat with Any GitHub Repository",
    description:
      "Ask questions about any codebase and get cited, grounded answers. Powered by RAG with AST-aware chunking and hybrid vector search.",
    type: "website",
  },
};

// Inline script runs synchronously before first paint — prevents theme flash on refresh.
const noFlashScript = `
  (function() {
    try {
      var t = localStorage.getItem('theme');
      document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
    } catch(e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning style={{ height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        <body
          className={inter.variable}
          style={{ fontFamily: "var(--font-sans)", height: "100%", display: "flex", flexDirection: "column" }}
          suppressHydrationWarning
        >
          <ThemeProvider>
            {/* Navigation progress bar — client only, needs Suspense for useSearchParams */}
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>

            <Navbar />

            <div
              style={{
                paddingTop: "var(--navbar-h)",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {children}
            </div>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
