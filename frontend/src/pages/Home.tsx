import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Globe2, Menu, ShieldCheck, Sparkles, Truck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BrandMark } from "@/components/brand/BrandMark";
import { DecisionCard, SectionHeading, SignalRow, StatusBadge } from "@/components/landing/LandingPrimitives";
import { ProductPreview } from "@/components/landing/ProductPreview";
import { MandiMap } from "@/components/mandi/MandiMap";
import { decisionCards } from "@/data/demo";
import { cropLensService } from "@/services/cropLensService";
import { useAuth } from "@/contexts/AuthContext";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "te", label: "తెలుగు" },
  { code: "ta", label: "தமிழ்" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" }
];

export default function Home() {
  const [, setLocation] = useLocation();
  const { status, user, updateProfile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [activeSignal, setActiveSignal] = useState(1);
  const [showProof, setShowProof] = useState(false);
  const [currentLang, setCurrentLang] = useState(user?.language || "English");

  const isAuthenticated = status === "authenticated" || status === "guest";
  const [tickerItems, setTickerItems] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [mandis, setMandis] = useState<any[]>([]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    
    // Fetch live ticker spot prices
    cropLensService.getTicker().then((items) => {
      setTickerItems(items);
    }).catch(() => {
      setTickerItems([]);
    });

    // Fetch dynamic signals and mandis for landing page preview
    cropLensService.getMarketSignals("Potato", "Agra").then(setSignals).catch(() => setSignals([]));
    cropLensService.getMandis("Potato", "Agra").then(setMandis).catch(() => setMandis([]));

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeNav = () => setNavOpen(false);

  const handleSelectLanguage = (langLabel: string) => {
    setCurrentLang(langLabel);
    updateProfile({ language: langLabel });
    setLangMenuOpen(false);
  };

  const handleAction = () => {
    if (isAuthenticated) {
      setLocation("/app");
    } else {
      setLocation("/login");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8F7F2] text-[#17201B]">
      {/* Top Header */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled || navOpen ? "border-b border-[#DDE4DE]/80 bg-[#F8F7F2]/95 shadow-[0_8px_24px_rgba(23,107,69,.06)] backdrop-blur-xl" : "bg-transparent"}`}>
        <div className="container flex h-[72px] items-center justify-between gap-6">
          <a href="#home" onClick={closeNav} aria-label="CropLens AI home"><BrandMark /></a>
          
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
            <a href="#home" className="text-sm font-semibold text-[#66716A] transition-colors hover:text-[#0E4D35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]">Home</a>
            <a href="#how-it-works" className="text-sm font-semibold text-[#66716A] transition-colors hover:text-[#0E4D35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]">How It Works</a>
            <a href="#markets" className="text-sm font-semibold text-[#66716A] transition-colors hover:text-[#0E4D35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]">Markets</a>
            <a href="#trust" className="text-sm font-semibold text-[#66716A] transition-colors hover:text-[#0E4D35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]">Trust</a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {/* Functional Language Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[#66716A] transition-colors hover:bg-white hover:text-[#0E4D35] border border-[#DDE4DE]/60 bg-white/60 cursor-pointer"
              >
                <Globe2 className="size-3.5 text-[#176B45]" />
                <span>{currentLang}</span>
                <ChevronDown className="size-3" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-2xl border border-[#DDE4DE] bg-white p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => handleSelectLanguage(l.label)}
                      className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        currentLang === l.label ? "bg-[#E8F4ED] text-[#176B45]" : "text-[#17201B] hover:bg-slate-50"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Login / Open App Button */}
            <Link
              href={isAuthenticated ? "/app" : "/login"}
              className="rounded-full px-4 py-2 text-sm font-bold text-[#0E4D35] transition-colors hover:bg-[#E8F4ED] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#176B45]"
            >
              {isAuthenticated ? "My Hub" : "Login"}
            </Link>

            {/* Get Started Button */}
            <button
              type="button"
              onClick={handleAction}
              className="rounded-full bg-[#176B45] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(23,107,69,.16)] transition-all duration-200 hover:bg-[#0E4D35] active:scale-[0.97] cursor-pointer"
            >
              {isAuthenticated ? "Open Kisan Hub" : "Get Started"} <ArrowRight className="ml-1 inline size-3.5" />
            </button>
          </div>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            onClick={() => setNavOpen(!navOpen)}
            className="grid size-10 place-items-center rounded-xl text-[#0E4D35] transition-colors hover:bg-[#E8F4ED] lg:hidden cursor-pointer"
          >
            {navOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {navOpen && (
            <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="border-t border-[#DDE4DE] bg-[#F8F7F2] px-4 pb-5 pt-3 lg:hidden">
              <div className="flex flex-col gap-1">
                {[["Home", "#home"], ["How It Works", "#how-it-works"], ["Markets", "#markets"], ["Trust", "#trust"]].map(([label, href]) => (
                  <a key={href} href={href} onClick={closeNav} className="rounded-xl px-3 py-3 text-sm font-bold text-[#0E4D35] hover:bg-white">
                    {label}
                  </a>
                ))}

                {/* Mobile Language Selector */}
                <div className="py-2 border-t border-[#DDE4DE] flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-[#66716A] flex items-center gap-1.5">
                    <Globe2 className="size-3.5 text-[#176B45]" /> Language:
                  </span>
                  <select
                    value={currentLang}
                    onChange={(e) => handleSelectLanguage(e.target.value)}
                    className="bg-white border border-[#DDE4DE] rounded-xl px-2.5 py-1 text-xs font-bold text-[#0E4D35] outline-none"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.label}>{l.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 border-t border-[#DDE4DE] pt-3">
                  <Link href={isAuthenticated ? "/app" : "/login"} onClick={closeNav} className="rounded-full border border-[#DDE4DE] px-4 py-2.5 text-center text-sm font-bold text-[#0E4D35] bg-white">
                    {isAuthenticated ? "My Hub" : "Login"}
                  </Link>
                  <button type="button" onClick={() => { closeNav(); handleAction(); }} className="rounded-full bg-[#176B45] px-4 py-2.5 text-sm font-bold text-white text-center">
                    {isAuthenticated ? "Kisan Hub" : "Check Crop"}
                  </button>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        {/* Hero Section */}
        <section id="home" className="relative isolate overflow-hidden pb-12 pt-32 sm:pb-20 sm:pt-40 lg:pb-28 lg:pt-44">
          <div className="pointer-events-none absolute inset-0 -z-10 contour-lines opacity-50" aria-hidden="true" />
          <div className="pointer-events-none absolute -right-20 top-20 -z-10 size-72 rounded-full bg-[#E8F4ED] blur-3xl" aria-hidden="true" />
          <div className="container grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.85fr)] lg:gap-20">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, ease: [0.23, 1, 0.32, 1] }}>
              <div className="section-kicker">Modern agricultural intelligence</div>
              <h1 className="mt-6 max-w-[680px] text-[clamp(2.55rem,6vw,5rem)] font-extrabold leading-[.98] tracking-[-0.07em] text-[#0E4D35]">
                Know when to sell.<br />Know where to sell.<br /><span className="text-[#176B45]">Keep more money.</span>
              </h1>
              <p className="mt-7 max-w-[590px] text-base leading-7 text-[#66716A] sm:text-lg sm:leading-8">
                CropLens AI helps farmers make better mandi decisions using market data, price forecasts, risk estimates, and transport costs.
              </p>
              
              {/* Working Hero CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAction}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#176B45] px-6 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(23,107,69,.18)] transition-all duration-200 hover:bg-[#0E4D35] hover:shadow-[0_14px_28px_rgba(23,107,69,.22)] active:scale-[0.97] cursor-pointer"
                >
                  {isAuthenticated ? "Go to Kisan Hub" : "Check My Crop"} <ArrowRight className="ml-2 size-4" />
                </button>
                <a
                  href="#markets"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#B8C9BC] bg-[#F8F7F2]/80 px-6 text-sm font-extrabold text-[#0E4D35] transition-all duration-200 hover:border-[#176B45] hover:bg-white active:scale-[0.97]"
                >
                  Explore Markets
                </a>
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-[#66716A]">
                <span className="inline-flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E8F4ED] text-[#176B45]"><Check className="size-3" /></span>Forecast ranges, not false certainty</span>
                <span className="inline-flex items-center gap-2"><span className="grid size-5 place-items-center rounded-full bg-[#E8F4ED] text-[#176B45]"><Check className="size-3" /></span>Transport-aware decisions</span>
              </div>
            </motion.div>

            {/* Rotating Product Showcase */}
            <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, delay: .12, ease: [0.23, 1, 0.32, 1] }} className="relative lg:pt-6">
              <div className="absolute -left-7 -top-7 hidden h-32 w-32 rounded-full border border-[#B8D8C5] sm:block" aria-hidden="true" />
              <div className="absolute -bottom-7 -right-7 hidden h-40 w-40 rounded-full border border-dashed border-[#B8D8C5] sm:block" aria-hidden="true" />
              <ProductPreview />
              <p className="mt-4 text-center text-[11px] font-semibold text-[#66716A]">A calm interface for a consequential decision.</p>
            </motion.div>
          </div>
        </section>

        {/* Live APMC Market Ticker */}
        <section aria-label="Live market ticker" className="overflow-hidden border-y border-[#DDE4DE] bg-[#0E4D35] py-3.5 text-white">
          <div className="flex min-w-max ticker-track items-center gap-8">
            {(tickerItems.length > 0 ? [...tickerItems, ...tickerItems] : []).map((item, index) => (
              <div key={`${item.market}-${index}`} className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B8D8C5]">
                  <span className="size-1.5 rounded-full bg-[#B8D8C5]" />APMC Spot
                </span>
                <span className="font-bold">{item.market}</span>
                <span className="font-extrabold">{item.price}</span>
                <span className={item.tone === "down" ? "text-[#F0B3A9]" : item.tone === "steady" ? "text-[#D9C98A]" : "text-[#B8D8C5]"}>
                  {item.change}
                </span>
              </div>
            ))}
            {tickerItems.length === 0 && (
              <div className="px-4 text-xs text-[#B8D8C5]">Loading live APMC spot market rates...</div>
            )}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="bg-white py-20 sm:py-28">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-[.65fr_1.35fr] lg:gap-20">
              <SectionHeading eyebrow="Start with the decision" title="What decision are you trying to make?" body="A field-ready answer should meet you where the uncertainty begins—not bury you under a dashboard." />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 mb-2 flex items-center gap-3 text-xs font-bold text-[#66716A]">
                  <span className="grid size-6 place-items-center rounded-full bg-[#0E4D35] text-[10px] text-white">01</span>
                  Answer → Explain → Protect → Compare → Act
                </div>
                {decisionCards.map((card) => (
                  <DecisionCard
                    key={card.title}
                    {...card}
                    onClick={() => {
                      if (card.href.startsWith("#")) {
                        document.querySelector(card.href)?.scrollIntoView({ behavior: "smooth" });
                      } else {
                        handleAction();
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Trade-off Narrative */}
        <section id="demo" className="relative overflow-hidden bg-[#F8F7F2] py-20 sm:py-28">
          <div className="container grid items-center gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
            <div className="relative order-2 overflow-hidden rounded-[24px] sm:min-h-[480px] lg:order-1">
              <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85" alt="Sunlit agricultural rows at the edge of a growing field" className="h-full min-h-[360px] w-full object-cover" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/40 bg-[#0E4D35]/90 p-4 text-white backdrop-blur-sm sm:inset-x-6 sm:bottom-6">
                <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#B8D8C5]">Field note 01</p>
                <p className="mt-2 text-base font-extrabold">The right day is a decision, not a guess.</p>
                <p className="mt-1 text-xs leading-5 text-[#D5E5DA]">CropLens turns scattered signals into a practical next step.</p>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <SectionHeading eyebrow="See the trade-off" title="One answer. Then the reasoning behind it." body="CropLens keeps the interface simple on the surface, while the supporting evidence stays close enough to inspect." />
              <div className="mt-9 grid gap-5">
                <div className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#176B45] text-sm font-extrabold text-white">1</span>
                  <div>
                    <h3 className="font-extrabold text-[#0E4D35]">Make the call</h3>
                    <p className="mt-1 text-sm leading-6 text-[#66716A]">See today's price, the 7-day price trajectory, and the optimal harvest day in one glance.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#B8D8C5] text-sm font-extrabold text-[#176B45]">2</span>
                  <div>
                    <h3 className="font-extrabold text-[#0E4D35]">Understand the why</h3>
                    <p className="mt-1 text-sm leading-6 text-[#66716A]">Tap signals like arrivals, demand, and weather to reveal a plain-language explanation.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#B8D8C5] text-sm font-extrabold text-[#176B45]">3</span>
                  <div>
                    <h3 className="font-extrabold text-[#0E4D35]">Protect the decision</h3>
                    <p className="mt-1 text-sm leading-6 text-[#66716A]">A range shows the safety floor, expected price, and potential upside—not a promise.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Risk & Safety Floor Section */}
        <section className="bg-white py-20 sm:py-28">
          <div className="container">
            <div className="mb-8 flex items-center gap-3 border-y border-[#DDE4DE] py-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#66716A]">
              <span className="text-[#176B45]">Decision log 02</span>
              <span className="h-px w-8 bg-[#B8D8C5]" />
              <span>Risk before recommendation</span>
            </div>
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
              <div className="rounded-[24px] border border-[#DDE4DE] bg-[#F8F7F2] p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="section-kicker">Protect the decision</div>
                    <h2 className="mt-4 text-3xl font-extrabold tracking-[-.055em] text-[#0E4D35]">Price outlook</h2>
                  </div>
                  <StatusBadge tone="neutral">Calibrated Range (P10 - P90)</StatusBadge>
                </div>
                <div className="mt-10 grid grid-cols-3 gap-2">
                  <div>
                    <p className="data-mono text-xl font-extrabold text-[#66716A] sm:text-2xl">{ticker[2]?.price || '₹1,360'}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#66716A]">Safety floor</p>
                  </div>
                  <div className="border-l border-[#DDE4DE] pl-3 sm:pl-5">
                    <p className="data-mono text-xl font-extrabold text-[#176B45] sm:text-2xl">{ticker[0]?.price || '₹1,480'}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#66716A]">Expected price</p>
                  </div>
                  <div className="border-l border-[#DDE4DE] pl-3 sm:pl-5">
                    <p className="data-mono text-xl font-extrabold text-[#0E4D35] sm:text-2xl">{ticker[1]?.price || '₹1,620'}</p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[.12em] text-[#66716A]">Potential upside</p>
                  </div>
                </div>
                <div className="relative mt-9 h-2 rounded-full bg-[#DDE4DE]">
                  <span className="absolute left-0 top-0 h-2 w-[38%] rounded-full bg-[#B8D8C5]" />
                  <span className="absolute left-[38%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F8F7F2] bg-[#176B45] shadow-sm" />
                  <span className="absolute left-[80%] top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#F8F7F2] bg-[#0E4D35] shadow-sm" />
                </div>
                <button
                  type="button"
                  onClick={() => setShowProof(!showProof)}
                  className="mt-8 flex w-full items-center justify-between border-t border-[#DDE4DE] pt-4 text-left text-sm font-extrabold text-[#176B45] cursor-pointer"
                >
                  Technical details <ChevronDown className={`size-4 transition-transform ${showProof ? "rotate-180" : ""}`} />
                </button>
                {showProof && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-[#66716A]">
                    <span className="rounded-xl bg-white p-3"><b className="block text-[#0E4D35]">P10</b>Floor</span>
                    <span className="rounded-xl bg-white p-3"><b className="block text-[#0E4D35]">P50</b>Expected</span>
                    <span className="rounded-xl bg-white p-3"><b className="block text-[#0E4D35]">P90</b>Upside</span>
                    <p className="col-span-3 leading-5">Mondrian Conformal Quantile Regression guarantees finite-sample coverage across price volatility bands.</p>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[#DDE4DE] bg-white p-6 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="section-kicker">Explain the outlook</div>
                    <h2 className="mt-4 text-3xl font-extrabold tracking-[-.055em] text-[#0E4D35]">Why this outlook?</h2>
                  </div>
                  <Sparkles className="size-5 text-[#176B45]" />
                </div>
                <div className="mt-5">
                  {signals.length > 0 ? signals.map((signal, index) => (
                    <SignalRow key={signal.label} signal={signal} active={activeSignal === index} onClick={() => setActiveSignal(activeSignal === index ? -1 : index)} />
                  )) : (
                    <p className="text-xs text-[#66716A]">Loading live market signals...</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mandi Spatial Comparison Section */}
        <section id="markets" className="bg-[#0E4D35] py-20 text-white sm:py-28">
          <div className="container">
            <div className="mb-8 flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#9DBDA8]">
              <span className="text-[#B8D8C5]">Market bulletin 03</span>
              <span className="h-px w-8 bg-[#9DBDA8]" />
              <span>Rate is only one part of the decision</span>
            </div>
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
              <div>
                <div className="section-kicker text-[#B8D8C5] before:bg-[#B8D8C5]">Compare before you load</div>
                <h2 className="mt-4 max-w-xl text-[clamp(2rem,4vw,3.4rem)] font-extrabold leading-[1.03] tracking-[-.06em]">The highest price is not always the most money.</h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-[#C5D9CA]">CropLens brings distance and transport into the decision so you can compare the net outcome—not just the mandi headline.</p>
              </div>
              <div className="flex items-center gap-3 text-sm font-semibold text-[#B8D8C5]">
                <Truck className="size-5" /> Net realization after distance-adjusted freight logistics
              </div>
            </div>
            <div className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-10">
              <div className="rounded-[24px] border border-white/15 bg-white/[.07] p-4 sm:p-6">
                <div className="hidden overflow-hidden rounded-2xl border border-white/10 sm:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[.06] text-[10px] font-extrabold uppercase tracking-[.15em] text-[#B8D8C5]">
                      <tr>
                        <th className="px-4 py-4">Mandi</th>
                        <th className="px-4 py-4">Distance</th>
                        <th className="px-4 py-4">Rate</th>
                        <th className="px-4 py-4">Transport</th>
                        <th className="px-4 py-4">Net money</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mandis.length > 0 ? mandis.map((mandi) => (
                        <tr key={mandi.name} className="border-t border-white/10">
                          <td className="px-4 py-4 font-extrabold">
                            {mandi.name}
                            {mandi.featured && <span className="ml-2 rounded-full bg-[#D99A21] px-2 py-1 text-[9px] uppercase tracking-[.1em] text-white">Best net</span>}
                          </td>
                          <td className="px-4 py-4 text-[#C5D9CA]">{mandi.distance}</td>
                          <td className="px-4 py-4 font-bold">{money(mandi.rate)}</td>
                          <td className="px-4 py-4 text-[#C5D9CA]">{money(mandi.transport)}</td>
                          <td className="px-4 py-4 font-extrabold text-[#B8D8C5]">{money(mandi.net)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-[#C5D9CA]">Loading live mandi data...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-3 sm:hidden">
                  {mandis.length > 0 ? mandis.map((mandi) => (
                    <div key={mandi.name} className="rounded-2xl border border-white/10 bg-white/[.06] p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold">{mandi.name}</span>
                        {mandi.featured && <span className="rounded-full bg-[#D99A21] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.1em]">Best net</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[#C5D9CA]">
                        <span>{mandi.distance}<b className="mt-1 block text-sm text-white">Distance</b></span>
                        <span>{money(mandi.rate)}<b className="mt-1 block text-sm text-white">Rate</b></span>
                        <span>{money(mandi.transport)}<b className="mt-1 block text-sm text-white">Transport</b></span>
                        <span className="col-span-2 border-t border-white/10 pt-3 font-extrabold text-[#B8D8C5]">{money(mandi.net)}<b className="mt-1 block text-[10px] font-bold uppercase tracking-[.1em] text-[#C5D9CA]">Estimated net realization</b></span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-xs text-[#C5D9CA]">Loading live mandi data...</p>
                  )}
                </div>
                <p className="mt-4 text-[11px] font-semibold text-[#9DBDA8]">APMC mandi comparison after deducting distance-adjusted freight logistics.</p>
              </div>
              <MandiMap mandis={mandis} />
            </div>
          </div>
        </section>

        {/* Trust & Scientific Transparency */}
        <section id="trust" className="bg-white py-20 sm:py-28">
          <div className="container">
            <div className="mb-8 flex items-center gap-3 border-y border-[#DDE4DE] py-3 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#66716A]">
              <span className="text-[#176B45]">Field note 04</span>
              <span className="h-px w-8 bg-[#B8D8C5]" />
              <span>Show the method without hiding the answer</span>
            </div>
            <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
              <div>
                <SectionHeading eyebrow="Scientific transparency" title="Trust the method, not a magic number." body="The product is designed to show where the signal comes from and where uncertainty begins." />
                <button
                  type="button"
                  onClick={() => setShowProof(!showProof)}
                  className="mt-8 inline-flex items-center gap-2 rounded-full border border-[#B8C9BC] px-4 py-2.5 text-sm font-extrabold text-[#0E4D35] transition-colors hover:border-[#176B45] hover:bg-[#E8F4ED] cursor-pointer"
                >
                  {showProof ? "Hide" : "See"} technical layers <ArrowRight className="size-4" />
                </button>
              </div>
              <div className="rounded-[24px] border border-[#DDE4DE] bg-[#F8F7F2] p-6 sm:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  {["Real mandi data", "Forecast ranges", "Risk estimates", "Calibrated uncertainty", "Transport-aware profit"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0E4D35]">
                      <span className="grid size-6 place-items-center rounded-full bg-[#E8F4ED] text-[#176B45]"><Check className="size-3.5" /></span>
                      {item}
                    </div>
                  ))}
                </div>
                <AnimatePresence initial={false}>
                  {showProof && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-6 border-t border-[#DDE4DE] pt-5">
                        <p className="eyebrow">Progressive disclosure</p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-[#DDE4DE] bg-white p-4">
                            <p className="font-extrabold text-[#0E4D35]">P10 / P50 / P90</p>
                            <p className="mt-1 text-xs leading-5 text-[#66716A]">Farmer-friendly labels first; quantiles when you want the technical detail.</p>
                          </div>
                          <div className="rounded-xl border border-[#DDE4DE] bg-white p-4">
                            <p className="font-extrabold text-[#0E4D35]">Conformal calibration</p>
                            <p className="mt-1 text-xs leading-5 text-[#66716A]">Mondrian Conformal Quantile Regression for distribution-free empirical coverage.</p>
                          </div>
                          <div className="rounded-xl border border-[#DDE4DE] bg-white p-4">
                            <p className="font-extrabold text-[#0E4D35]">Forecast methodology</p>
                            <p className="mt-1 text-xs leading-5 text-[#66716A]">LightGBM Gradient Boosted Trees trained on multi-decade Agmarknet time-series.</p>
                          </div>
                          <div className="rounded-xl border border-[#DDE4DE] bg-white p-4">
                            <p className="font-extrabold text-[#0E4D35]">Data sources</p>
                            <p className="mt-1 text-xs leading-5 text-[#66716A]">Agmarknet APMC feeds, NASA POWER climatology, and regional diesel logistics.</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Card */}
        <section className="relative overflow-hidden bg-[#E8F4ED] py-20 sm:py-28">
          <div className="absolute inset-0 field-grid opacity-30" aria-hidden="true" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl rounded-[28px] border border-[#B8D8C5] bg-white/70 px-6 py-12 text-center shadow-[0_20px_60px_rgba(23,107,69,.08)] backdrop-blur-sm sm:px-12 sm:py-16">
              <ShieldCheck className="mx-auto size-8 text-[#176B45]" />
              <h2 className="mt-5 text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-[1] tracking-[-.06em] text-[#0E4D35]">
                I have a crop.<br />I need to decide what to do with it.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#66716A]">
                Start with a clear answer, see the trade-off, and keep more of what your crop is worth.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAction}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#176B45] px-6 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(23,107,69,.18)] transition-all hover:bg-[#0E4D35] active:scale-[.97] cursor-pointer"
                >
                  {isAuthenticated ? "Open Kisan Hub" : "Check My Crop"} <ArrowRight className="ml-2 size-4" />
                </button>
                <a
                  href="#markets"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#B8C9BC] bg-white px-6 text-sm font-extrabold text-[#0E4D35] transition-colors hover:border-[#176B45]"
                >
                  Explore Markets
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#0E4D35] py-12 text-[#C5D9CA]">
        <div className="container">
          <div className="flex flex-col justify-between gap-8 border-b border-white/15 pb-9 sm:flex-row sm:items-start">
            <div>
              <BrandMark inverse />
              <p className="mt-4 max-w-xs text-sm leading-6 text-[#9DBDA8]">Modern agricultural intelligence for clearer mandi decisions.</p>
            </div>
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm font-semibold sm:grid-cols-3">
              <a href="#how-it-works" className="hover:text-white">How It Works</a>
              <a href="#markets" className="hover:text-white">Markets</a>
              <a href="#trust" className="hover:text-white">Trust</a>
              <Link href="/login" className="hover:text-white">Login</Link>
              <Link href="/onboarding" className="hover:text-white">Onboarding</Link>
              <a href="#trust" className="hover:text-white">Privacy & Math</a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 pt-6 text-xs text-[#9DBDA8] sm:flex-row">
            <span>© 2026 CropLens AI · Production Agricultural Intelligence</span>
            <span>Built for decisions that start in the field.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
