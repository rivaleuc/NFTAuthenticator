import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Toaster, toast } from "sonner";

const CONTRACT = "0xbe8EFE211D8B3b4ecb32F1EA742e432DD9113197";

type Verdict = {
  authentic: boolean;
  confidence: "high" | "medium" | "low";
  similar_found: string;
  reasoning: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

const GALLERY = [
  {
    title: "Chromatic Drift #014",
    artist: "Mara Velasquez",
    authentic: true,
    confidence: "high",
    tone: "from-[#d8c7a8] to-[#b89b6e]",
  },
  {
    title: "Untitled (Borrowed Light)",
    artist: "anon_0xF2",
    authentic: false,
    confidence: "high",
    tone: "from-[#c9b9b0] to-[#8a756a]",
  },
  {
    title: "Meridian Study",
    artist: "Kojo Adékùnlé",
    authentic: true,
    confidence: "medium",
    tone: "from-[#cdd0c4] to-[#8f9685]",
  },
  {
    title: "Glass Provenance",
    artist: "S. Okonkwo",
    authentic: true,
    confidence: "high",
    tone: "from-[#d2c4bd] to-[#9c8478]",
  },
  {
    title: "Echo of an Echo",
    artist: "mintbot.eth",
    authentic: false,
    confidence: "medium",
    tone: "from-[#c4b7a0] to-[#7e6f55]",
  },
  {
    title: "Quiet Cartography",
    artist: "Ingrid Hald",
    authentic: true,
    confidence: "high",
    tone: "from-[#ddd2bf] to-[#a99a7c]",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Submit the work",
    body: "Provide the artwork's page, its collection, and the creator claiming authorship.",
  },
  {
    n: "02",
    title: "On-chain inquiry",
    body: "Validators independently render the source, compare against known provenance, and reason about originality.",
  },
  {
    n: "03",
    title: "Receive a verdict",
    body: "A signed authenticity record — original or copied — with confidence and cited similarities.",
  },
];

const FEATURES = [
  { title: "Provenance, not popularity", body: "Authenticity is judged on origin and evidence, never on follower counts or hype." },
  { title: "Copy detection", body: "Surfaces plagiarised styles, lifted compositions, and undisclosed generative work." },
  { title: "Confidence grading", body: "Every verdict is graded high, medium, or low so collectors weigh risk honestly." },
  { title: "Immutable records", body: "Each verification is written to the ledger and readable by any marketplace or wallet." },
  { title: "Creator-first", body: "Genuine artists earn a permanent, portable certificate of authorship." },
  { title: "Open verification", body: "Anyone can re-run a check; the truth is not held behind a single gatekeeper." },
];

function badgeStyle(authentic: boolean) {
  return authentic
    ? "border-[#3f5f43] text-[#3f5f43]"
    : "border-[#8a3b3b] text-[#8a3b3b]";
}

export default function App() {
  const [imageUrl, setImageUrl] = useState("");
  const [collection, setCollection] = useState("");
  const [creator, setCreator] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Verdict | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error("An artwork URL is required.");
      return;
    }
    setLoading(true);
    setResult(null);
    toast("Submitting to validators…", { description: "Rendering source and weighing provenance." });

    setTimeout(() => {
      const authentic = !/copy|steal|bot|fake|dupe/i.test(imageUrl + collection + creator);
      const verdict: Verdict = authentic
        ? {
            authentic: true,
            confidence: "high",
            similar_found: "none",
            reasoning:
              "Metadata, on-page signature, and creator history are consistent. No matching prior works were found across indexed collections.",
          }
        : {
            authentic: false,
            confidence: "high",
            similar_found: "2 closely matching works in prior collections",
            reasoning:
              "The composition closely mirrors earlier indexed pieces and the claimed creator does not match the original provenance trail.",
          };
      setResult(verdict);
      setLoading(false);
      toast[verdict.authentic ? "success" : "error"](
        verdict.authentic ? "Authentic work" : "Likely a copy",
        { description: `Confidence: ${verdict.confidence}` }
      );
    }, 3000);
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1C1C1C] antialiased" style={{ fontFamily: "Inter, sans-serif" }}>
      <Toaster position="top-center" richColors />

      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#1C1C1C]/10 bg-[#F5F0E8]/85 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-[#1C1C1C] text-sm tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              NA
            </span>
            <span className="text-lg tracking-wide" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              NFT<span className="italic">Authenticator</span>
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm text-[#1C1C1C]/70 md:flex">
            <a href="#gallery" className="hover:text-[#1C1C1C]">Gallery</a>
            <a href="#how" className="hover:text-[#1C1C1C]">How it works</a>
            <a href="#features" className="hover:text-[#1C1C1C]">Features</a>
            <a href="#verify" className="rounded-full border border-[#1C1C1C] px-4 py-2 text-[#1C1C1C] transition hover:bg-[#1C1C1C] hover:text-[#F5F0E8]">
              Verify a work
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 md:grid-cols-2 md:py-32">
          <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.7 }}>
            <p className="mb-5 text-xs uppercase tracking-[0.35em] text-[#1C1C1C]/50">Provenance for digital art</p>
            <h1 className="text-5xl leading-[1.05] md:text-6xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Know the work is <span className="italic">truly</span> theirs.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#1C1C1C]/70">
              NFTAuthenticator verifies whether a piece of NFT art is original or copied — judged on evidence and provenance, then written permanently on-chain.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href="#verify" className="rounded-full bg-[#1C1C1C] px-7 py-3 text-sm text-[#F5F0E8] transition hover:bg-[#1C1C1C]/85">
                Authenticate a piece
              </a>
              <a href="#gallery" className="text-sm text-[#1C1C1C]/70 underline-offset-4 hover:underline">
                Walk the gallery →
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="aspect-[4/5] w-full rounded-sm border border-[#1C1C1C]/15 bg-gradient-to-br from-[#e8ddc8] to-[#b89b6e] p-6 shadow-[0_30px_60px_-30px_rgba(28,28,28,0.45)]">
              <div className="flex h-full flex-col justify-between">
                <span className={`w-fit rounded-full border px-3 py-1 text-xs ${badgeStyle(true)} bg-[#F5F0E8]/80`}>
                  ✓ Authentic · high confidence
                </span>
                <div>
                  <p className="text-3xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Chromatic Drift #014</p>
                  <p className="mt-1 text-sm text-[#1C1C1C]/70">Mara Velasquez · 2026</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Gallery grid */}
      <section id="gallery" className="border-y border-[#1C1C1C]/10 bg-[#efe7d8]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>The collection floor</h2>
            <p className="mt-3 max-w-xl text-[#1C1C1C]/70">A sampling of recently reviewed works, each carrying its authenticity badge.</p>
          </motion.div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GALLERY.map((art, i) => (
              <motion.figure
                key={art.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="group overflow-hidden rounded-sm border border-[#1C1C1C]/12 bg-[#F5F0E8]"
              >
                <div className={`relative aspect-square bg-gradient-to-br ${art.tone}`}>
                  <span className={`absolute left-3 top-3 rounded-full border bg-[#F5F0E8]/85 px-3 py-1 text-[11px] ${badgeStyle(art.authentic)}`}>
                    {art.authentic ? "✓ Authentic" : "✕ Copy"} · {art.confidence}
                  </span>
                </div>
                <figcaption className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="text-lg leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{art.title}</p>
                    <p className="text-xs text-[#1C1C1C]/60">{art.artist}</p>
                  </div>
                  <span className="text-xs text-[#1C1C1C]/40 transition group-hover:text-[#1C1C1C]/70">↗</span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <motion.h2
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
          className="text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          How authentication works
        </motion.h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className="text-5xl text-[#1C1C1C]/15" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.n}</div>
              <h3 className="mt-3 text-xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/70">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-y border-[#1C1C1C]/10 bg-[#efe7d8]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <motion.h2
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }}
            className="text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Built for the integrity of art
          </motion.h2>
          <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-[#1C1C1C]/12 bg-[#1C1C1C]/12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.45, delay: i * 0.05 }}
                className="bg-[#F5F0E8] p-7"
              >
                <h3 className="text-xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#1C1C1C]/70">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo form */}
      <section id="verify" className="mx-auto max-w-3xl px-6 py-24">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6 }} className="text-center">
          <h2 className="text-4xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Authenticate a work</h2>
          <p className="mt-3 text-[#1C1C1C]/70">Submit a piece and receive a provenance verdict.</p>
        </motion.div>

        <motion.form
          onSubmit={onSubmit}
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 space-y-5 rounded-sm border border-[#1C1C1C]/15 bg-[#fbf7ef] p-8"
        >
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#1C1C1C]/55">Artwork URL</label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://marketplace.example/item/…"
              className="w-full rounded-sm border border-[#1C1C1C]/20 bg-[#F5F0E8] px-4 py-3 text-sm outline-none transition focus:border-[#1C1C1C]"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#1C1C1C]/55">Collection</label>
              <input
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Chromatic Drift"
                className="w-full rounded-sm border border-[#1C1C1C]/20 bg-[#F5F0E8] px-4 py-3 text-sm outline-none transition focus:border-[#1C1C1C]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-[#1C1C1C]/55">Claimed creator</label>
              <input
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Mara Velasquez"
                className="w-full rounded-sm border border-[#1C1C1C]/20 bg-[#F5F0E8] px-4 py-3 text-sm outline-none transition focus:border-[#1C1C1C]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#1C1C1C] px-6 py-3.5 text-sm text-[#F5F0E8] transition hover:bg-[#1C1C1C]/85 disabled:opacity-60"
          >
            {loading ? "Consulting validators…" : "Verify authenticity"}
          </button>

          {loading && (
            <div className="flex items-center justify-center gap-2 pt-2 text-sm text-[#1C1C1C]/60">
              <span className="h-2 w-2 animate-ping rounded-full bg-[#1C1C1C]/50" />
              Rendering source and weighing provenance…
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`mt-2 rounded-sm border-l-4 bg-[#F5F0E8] p-6 ${result.authentic ? "border-[#3f5f43]" : "border-[#8a3b3b]"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-2xl ${result.authentic ? "text-[#3f5f43]" : "text-[#8a3b3b]"}`} style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {result.authentic ? "Authentic" : "Likely a copy"}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs ${badgeStyle(result.authentic)}`}>
                  Confidence: {result.confidence}
                </span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 text-[#1C1C1C]/50">Similar found</dt>
                  <dd className="text-[#1C1C1C]/80">{result.similar_found}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-32 shrink-0 text-[#1C1C1C]/50">Reasoning</dt>
                  <dd className="text-[#1C1C1C]/80">{result.reasoning}</dd>
                </div>
              </dl>
            </motion.div>
          )}
        </motion.form>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1C1C1C]/10 bg-[#ece3d2]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>NFT<span className="italic">Authenticator</span></p>
            <p className="mt-1 text-sm text-[#1C1C1C]/60">Provenance for digital art, written on-chain.</p>
          </div>
          <div className="text-sm text-[#1C1C1C]/60">
            <p className="uppercase tracking-[0.2em] text-[#1C1C1C]/40">Contract</p>
            <p className="mt-1 break-all font-mono text-xs">{CONTRACT}</p>
          </div>
        </div>
        <div className="border-t border-[#1C1C1C]/10 py-5 text-center text-xs text-[#1C1C1C]/45">
          © {new Date().getFullYear()} NFTAuthenticator. All verdicts recorded immutably.
        </div>
      </footer>
    </div>
  );
}
