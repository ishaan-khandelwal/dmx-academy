"use client";

import { motion } from "framer-motion";
import { Star, MessageSquare, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Marcus Vance",
    role: "Senior Creative Developer",
    company: "Vercel",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop",
    quote: "DMX Academy completely changed how I study. The interactive code sandboxes made complex WebGL matrix math and shader math click immediately. Highly recommended!",
    rating: 5,
  },
  {
    id: 2,
    name: "Aria Chen",
    role: "Interaction Designer",
    company: "Framer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    quote: "The interactive feedback loop is incredible. The AI mentor evaluates layout efficiency and framer-motion stagger delays faster and with more depth than traditional courses.",
    rating: 5,
  },
  {
    id: 3,
    name: "Devon Reynolds",
    role: "Frontend Engineer",
    company: "Stripe",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    quote: "I launched my entire creative portfolio while working through the advanced tracks. The platform makes educational design feel like a high-end AAA game.",
    rating: 5,
  },
  {
    id: 4,
    name: "Elena Rostova",
    role: "Technical Artist",
    company: "Epic Games",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
    quote: "The shader math tracks and layoutId animations are masterfully explained. Truly standard-setting documentation and interactive playgrounds.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-24 overflow-hidden transition-colors duration-300" style={{ backgroundColor: "var(--bg-secondary)" }}>
      {/* Background Gradients */}
      <div className="absolute top-1/4 right-0 h-[400px] w-[400px] rounded-full blur-[120px] pointer-events-none transition-colors duration-300" style={{ backgroundColor: "var(--accent-glow)" }} />
      <div className="absolute bottom-1/4 left-0 h-[400px] w-[400px] rounded-full blur-[120px] pointer-events-none transition-colors duration-300" style={{ backgroundColor: "var(--accent-glow)" }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl space-y-4 mb-16"
        >
          <div 
            className="inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-300"
            style={{
              backgroundColor: "var(--bg-badge)",
              borderColor: "var(--border-accent)",
              color: "var(--text-accent)"
            }}
          >
            <MessageSquare size={12} />
            <span>Success Stories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight transition-colors duration-300" style={{ color: "var(--text-primary)" }}>
            Endorsed by Top Creators
          </h2>
          <p className="text-sm sm:text-base transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
            Read how developers, designers, and creative technologists around the globe level up their day-to-day skills with DMX Academy.
          </p>
        </motion.div>

        {/* Static Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.slice(0, 3).map((test) => (
            <div
              key={test.id}
              className="w-full select-none rounded-2xl p-6 sm:p-8 flex flex-col justify-between shadow-md relative group transition-colors duration-300"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
            >
              <Quote size={48} className="absolute top-6 right-6 pointer-events-none opacity-40 transition-colors duration-300" style={{ color: "var(--border-primary)" }} />

              {/* Rating & Quote */}
              <div className="space-y-6 relative z-10">
                <div className="flex items-center space-x-1">
                  {[...Array(test.rating)].map((_, i) => (
                    <Star key={i} size={14} style={{ fill: "var(--accent-primary)", color: "var(--accent-primary)" }} />
                  ))}
                </div>
                <p className="text-sm sm:text-base leading-relaxed font-medium transition-colors duration-300" style={{ color: "var(--text-secondary)" }}>
                  "{test.quote}"
                </p>
              </div>

              {/* Profile Row */}
              <div className="flex items-center space-x-4 mt-8 pt-6 relative z-10" style={{ borderTop: "1px solid var(--border-primary)" }}>
                <div className="relative h-12 w-12 overflow-hidden rounded-full shrink-0" style={{ border: "2px solid var(--border-accent)" }}>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white uppercase" style={{ background: "var(--accent-gradient)" }}>
                    {test.name.charAt(0)}{test.name.split(" ")[1]?.charAt(0)}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold font-display transition-colors duration-300" style={{ color: "var(--text-primary)" }}>{test.name}</h4>
                  <p className="text-xs transition-colors duration-300" style={{ color: "var(--text-muted)" }}>
                    {test.role} at <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{test.company}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
