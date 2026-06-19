import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Tracks from "@/components/Tracks";
import Process from "@/components/Process";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import LiveBanner from "@/components/LiveBanner";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-100/40 via-transparent to-transparent pointer-events-none z-0" />

      {/* Main navigation header */}
      <Navbar />

      {/* Main landing sections */}
      <main className="flex-grow">
        <Hero />
        
        {/* Live Session Banner — shows active/past live sessions */}
        <LiveBanner />

        <Tracks />
        <Process />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>

      {/* Page Footer */}
      <Footer />
    </div>
  );
}

