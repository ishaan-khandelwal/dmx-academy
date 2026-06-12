import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Synapse Academy | The Creative & Tech Learning Platform",
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
      suppressHydrationWarning={true}
    >
      <head>
        {/* Theme initialiser – runs before React hydration to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${outfit.variable} min-h-full flex flex-col selection:bg-[var(--selection-bg)] selection:text-[var(--selection-text)]`}
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
