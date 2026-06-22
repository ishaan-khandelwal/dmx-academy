"use client";

import React, { useState, useEffect } from "react";
import { getApiBase } from "@/utils/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, BookOpen, Clock, Layers, Server, Cpu, Database, Code, Sparkles, Globe, 
  ArrowRight, BookMarked, Filter, Compass 
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Lucide Icon mapping
const IconMap = {
  Layers: Layers,
  Server: Server,
  Cpu: Cpu,
  Database: Database,
  Code: Code,
  Sparkles: Sparkles,
  Globe: Globe
};

const categories = [
  "All Courses",
  "Web & Mobile Development",
  "Data & AI",
  "Cloud & DevOps",
  "Creative Tech"
];

export default function CoursesCatalogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Courses");
  const [hoveredCourseId, setHoveredCourseId] = useState(null);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scroll to top and load category from query parameter on page mount
  useEffect(() => {
    window.scrollTo(0, 0);
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const catParam = urlParams.get("category");
      // Map short category parameter variants if needed
      if (catParam && categories.includes(catParam)) {
        setSelectedCategory(catParam);
      }
    }
  }, []);

  // Fetch dynamic courses catalog
  useEffect(() => {
    async function loadCourses() {
      try {
        const apiBase = getApiBase();
        const res = await fetch(`${apiBase}/api/courses`);
        const data = await res.json();
        if (data.success && data.courses) {
          setCourses(data.courses);
        }
      } catch (err) {
        console.error("Failed to fetch dynamic courses:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCourses();
  }, []);

  // Filter courses based on category selection and search query
  const sourceCourses = courses;

  const filteredCourses = sourceCourses.filter(course => {
    const matchesCategory = selectedCategory === "All Courses" || course.category === selectedCategory;
    const matchesSearch = 
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      course.difficulty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Helper to resolve icon component dynamically
  const renderIcon = (iconName, accentColor) => {
    const IconComp = IconMap[iconName] || BookOpen;
    return <IconComp size={22} style={{ color: accentColor }} />;
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden" style={{ backgroundColor: "var(--bg-primary)" }}>
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-indigo-100/30 via-transparent to-transparent pointer-events-none z-0" />
      
      {/* Main navigation */}
      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative z-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8 space-y-16">
          
          {/* Hero Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto space-y-4"
          >
            <div 
              className="inline-flex items-center space-x-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
              style={{
                backgroundColor: "var(--bg-badge)",
                borderColor: "var(--border-accent)",
                color: "var(--text-accent)"
              }}
            >
              <Compass size={14} className="animate-spin-slow" />
              <span>Interactive Course Explorer</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black font-display tracking-tight" style={{ color: "var(--text-primary)" }}>
              Expand Your Tech Frontiers
            </h1>
            <p className="text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Deep dive into modular curricula crafted for modern tech teams. Complete code challenges, use interactive sandbox simulators, and build custom projects.
            </p>
          </motion.div>

          {/* Search and Filters Bar */}
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Filter Tabs */}
              <div 
                className="flex flex-wrap items-center gap-1.5 rounded-full border p-1.5 backdrop-blur-md w-full lg:w-auto justify-center"
                style={{
                  backgroundColor: "var(--glass-bg)",
                  borderColor: "var(--border-primary)"
                }}
              >
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="relative px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                    style={{
                      color: selectedCategory === cat ? "#ffffff" : "var(--text-secondary)"
                    }}
                  >
                    {selectedCategory === cat && (
                      <motion.div
                        layoutId="activeCatalogCategory"
                        className="absolute inset-0 rounded-full shadow-sm"
                        style={{
                          background: "var(--accent-gradient)"
                        }}
                        transition={{ type: "spring", stiffness: 350, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10">{cat === "All Courses" ? "All Tracks" : cat}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full lg:w-96">
                <Search size={16} className="absolute left-4 top-3.5" style={{ color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search titles, technologies, skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full py-3 pl-11 pr-4 text-xs outline-none border transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-primary)",
                    color: "var(--text-primary)"
                  }}
                />
              </div>

            </div>
          </div>

          {/* Course Catalog Grid */}
          {loading && courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-4 rounded-full border-t-transparent animate-spin" style={{ borderColor: "var(--text-accent)" }} />
              <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Querying catalog registry...</p>
            </div>
          ) : (
            <motion.div 
              layout
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredCourses.map((course, index) => {
                  const isHovered = hoveredCourseId === course.id;
                  
                  return (
                    <motion.div
                      key={course.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.4, delay: index * 0.03 }}
                      onMouseEnter={() => setHoveredCourseId(course.id)}
                      onMouseLeave={() => setHoveredCourseId(null)}
                      onClick={() => {
                        window.location.href = `/courses/${course.id}`;
                      }}
                      className="group relative flex flex-col justify-between h-full rounded-2xl p-6 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-card)"
                      }}
                    >
                      {/* Hover Glow Layer */}
                      <div 
                        className="absolute inset-0 z-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${course.accent}22 0%, transparent 80%)`
                        }}
                      />
                      
                      {/* Dynamic Accent Line */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
                        style={{
                          backgroundColor: isHovered ? course.accent : "transparent"
                        }}
                      />

                      {/* Card Content */}
                      <div className="relative z-10 space-y-5">
                        
                        {/* Top Header Row */}
                        <div className="flex items-center justify-between">
                          {/* Circular Icon Container */}
                          <div 
                            className="h-11 w-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
                            style={{
                              backgroundColor: `${course.accent}14`,
                              border: `1px solid ${course.accent}20`
                            }}
                          >
                            {renderIcon(course.icon, course.accent)}
                          </div>

                          {/* Category Badge */}
                          <span 
                            className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border"
                            style={{
                              color: "var(--text-muted)",
                              borderColor: "var(--border-primary)",
                              backgroundColor: "var(--bg-hover)"
                            }}
                          >
                            {course.category}
                          </span>
                        </div>

                        {/* Course Title and Description */}
                        <div className="space-y-2">
                          <h3 
                            className="text-base font-extrabold font-display leading-snug transition-colors duration-200"
                            style={{ color: isHovered ? course.accent : "var(--text-primary)" }}
                          >
                            {course.title}
                          </h3>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                            {course.desc}
                          </p>
                        </div>

                        {/* Tech Pills */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {course.tags.map(tag => (
                            <span 
                              key={tag}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                              style={{
                                color: "var(--text-secondary)",
                                borderColor: "var(--border-primary)",
                                backgroundColor: "var(--bg-hover)"
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                      </div>

                      {/* Card Footer */}
                      <div className="relative z-10 pt-5 mt-5 space-y-4" style={{ borderTop: "1px solid var(--border-primary)" }}>
                        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                          <div className="flex items-center space-x-1">
                            <Clock size={12} style={{ color: "var(--text-muted)" }} />
                            <span>{course.duration}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <BookOpen size={12} style={{ color: "var(--text-muted)" }} />
                            <span>{course.lessons} Lessons</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span 
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border"
                            style={{
                              color: course.accent,
                              borderColor: `${course.accent}20`,
                              backgroundColor: `${course.accent}10`
                            }}
                          >
                            {course.difficulty}
                          </span>

                          <motion.div
                            animate={{ x: isHovered ? 4 : 0 }}
                            className="inline-flex items-center space-x-1 text-xs font-bold"
                            style={{ color: isHovered ? course.accent : "var(--text-secondary)" }}
                          >
                            <span>Explore Syllabus</span>
                            <ArrowRight size={12} />
                          </motion.div>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty Search Fallback */}
              {filteredCourses.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-12 text-center space-y-3"
                >
                  <BookMarked size={36} className="mx-auto" style={{ color: "var(--text-muted)" }} />
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No courses matched your query.</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Try adjusting your keywords or selecting another category.</p>
                </motion.div>
              )}
            </motion.div>
          )}

        </div>
      </main>

      {/* Page footer */}
      <Footer />
    </div>
  );
}
