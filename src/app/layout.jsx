import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "DMX Academy | The Creative & Tech Learning Platform",
  description: "Master creative motion design, machine learning, and advanced frontend engineering with interactive, project-driven tracks.",
};

// Inline script to read localStorage before first paint → prevents theme flash
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('academy_theme') || 'theme-light';
    var valid = ['theme-light', 'theme-dark', 'theme-mint', 'theme-violet'];
    if (valid.indexOf(t) === -1) t = 'theme-light';
    document.documentElement.classList.add(t);
  } catch(e) {
    document.documentElement.classList.add('theme-light');
  }
})();
`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning={true}
    >
      <head>
        {/* Google Fonts Link - Resilient build-time implementation */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Theme initialiser – runs before React hydration to prevent flash */}
        <Script id="theme-initializer" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
