import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'

const CONTRACT = '0xbe8EFE211D8B3b4ecb32F1EA742e432DD9113197'

type Verdict = 'authentic' | 'suspect' | 'forgery'

type Piece = {
  id: number
  title: string
  artist: string
  collection: string
  year: string
  height: number
  hue: number
  verdict: Verdict
  provenance: string[]
}

const VERDICT_META: Record<Verdict, { label: string; ring: string; dot: string; note: string }> = {
  authentic: { label: 'Authentic', ring: 'border-emerald-700/40', dot: 'bg-emerald-600', note: 'Provenance chain unbroken; mint signature verified.' },
  suspect: { label: 'Under Review', ring: 'border-amber-700/40', dot: 'bg-amber-500', note: 'Metadata anomaly detected; awaiting validator quorum.' },
  forgery: { label: 'Flagged Forgery', ring: 'border-rose-800/40', dot: 'bg-rose-600', note: 'Image hash matches a known prior mint on another chain.' },
}

const PIECES: Piece[] = [
  { id: 1, title: 'Meridian No. 7', artist: 'A. Vasari', collection: 'Cartographies', year: '2024', height: 360, hue: 28, verdict: 'authentic', provenance: ['Minted by 0x4f…a1c', 'Sold via Foundation', 'Held 412 days', 'Signature verified'] },
  { id: 2, title: 'Salt & Static', artist: 'R. Mbeki', collection: 'Noise Studies', year: '2023', height: 240, hue: 200, verdict: 'suspect', provenance: ['Minted by 0x9b…77e', 'Metadata edited post-mint', 'Quorum pending'] },
  { id: 3, title: 'The Long Field', artist: 'I. Sokolova', collection: 'Pastoral', year: '2025', height: 300, hue: 96, verdict: 'authentic', provenance: ['Minted by 0x2a…0d4', 'Never transferred', 'On-chain signature valid'] },
  { id: 4, title: 'Counterfeit Bloom', artist: 'unknown', collection: '—', year: '2022', height: 280, hue: 330, verdict: 'forgery', provenance: ['Image hash collision', 'Original on Tezos 2021', 'Flagged by 3 validators'] },
  { id: 5, title: 'Ochre Interval', artist: 'A. Vasari', collection: 'Cartographies', year: '2024', height: 420, hue: 44, verdict: 'authentic', provenance: ['Minted by 0x4f…a1c', 'Provenance unbroken', 'Verified'] },
  { id: 6, title: 'Glass Reliquary', artist: 'T. Nakamura', collection: 'Vessels', year: '2025', height: 260, hue: 168, verdict: 'authentic', provenance: ['Minted by 0xc1…ef9', 'Auction house attested', 'Verified'] },
  { id: 7, title: 'Untitled (Drift)', artist: 'R. Mbeki', collection: 'Noise Studies', year: '2023', height: 340, hue: 268, verdict: 'suspect', provenance: ['Minted by 0x9b…77e', 'Creator wallet disputed', 'Review open'] },
  { id: 8, title: 'Harvest Index', artist: 'I. Sokolova', collection: 'Pastoral', year: '2025', height: 300, hue: 12, verdict: 'authentic', provenance: ['Minted by 0x2a…0d4', 'Single owner', 'Verified'] },
  { id: 9, title: 'Mirror Forgery #2', artist: 'unknown', collection: '—', year: '2021', height: 220, hue: 350, verdict: 'forgery', provenance: ['Duplicate of Meridian No.3', 'Hash match 0.98', 'Flagged'] },
]

function Artwork({ hue, height }: { hue: number; height: number }) {
  return (
    <div
      className="w-full"
      style={{
        height,
        background: `linear-gradient(150deg, hsl(${hue} 45% 78%), hsl(${(hue + 40) % 360} 35% 58%) 55%, hsl(${(hue + 80) % 360} 30% 38%))`,
      }}
    >
      <div className="flex h-full w-full items-center justify-center">
        <div
          className="rounded-full border-2"
          style={{
            width: height * 0.32,
            height: height * 0.32,
            borderColor: `hsl(${(hue + 180) % 360} 40% 92% / 0.5)`,
            background: `hsl(${(hue + 180) % 360} 50% 85% / 0.18)`,
          }}
        />
      </div>
    </div>
  )
}

function Badge({ verdict, small }: { verdict: Verdict; small?: boolean }) {
  const m = VERDICT_META[verdict]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-[#F5F0E8]/90 backdrop-blur ${m.ring} ${
        small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
      } font-medium text-stone-700`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

function App() {
  const [pieces] = useState<Piece[]>(PIECES)
  const [active, setActive] = useState<Piece | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  function runVerify() {
    if (!tokenInput.trim()) {
      toast.error('Enter a token ID or contract address to verify.')
      return
    }
    toast('🔎 Tracing provenance across chains…')
    setTimeout(() => {
      const outcomes: Verdict[] = ['authentic', 'suspect', 'forgery']
      const v = outcomes[Math.floor(Math.random() * outcomes.length)]
      toast[v === 'authentic' ? 'success' : v === 'forgery' ? 'error' : 'warning'](
        `${VERDICT_META[v].label}: ${VERDICT_META[v].note}`,
      )
      setVerifyOpen(false)
      setTokenInput('')
    }, 2200)
  }

  return (
    <div
      className="min-h-screen bg-[#F5F0E8] text-stone-800 antialiased"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <Toaster theme="light" position="top-center" richColors />

      {/* SLIM TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-300/70 bg-[#F5F0E8]/90 px-6 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg tracking-[0.2em] text-stone-900">THE AUTHENTICATOR</h1>
          <span className="hidden text-xs italic text-stone-500 sm:inline">a gallery of verified provenance</span>
        </div>
        <button
          onClick={() => setVerifyOpen(true)}
          className="rounded-sm border border-stone-800 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-stone-800 transition hover:bg-stone-800 hover:text-[#F5F0E8]"
        >
          Verify New
        </button>
      </header>

      {/* GALLERY LABEL */}
      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Current exhibition</p>
        <h2 className="mt-2 text-3xl text-stone-900">On-Chain Provenance, Room I</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Each work below carries an authenticity badge issued by validator consensus. Select a piece to read its
          provenance verdict.
        </p>
      </div>

      {/* MASONRY GRID */}
      <main className="mx-auto max-w-6xl px-6 pb-24">
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
          {pieces.map((p) => (
            <motion.button
              key={p.id}
              layout
              onClick={() => setActive(p)}
              whileHover={{ y: -4 }}
              className="group block w-full break-inside-avoid overflow-hidden rounded-sm border border-stone-300/80 bg-white text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:shadow-xl"
            >
              <div className="relative">
                <Artwork hue={p.hue} height={p.height} />
                <div className="absolute left-3 top-3">
                  <Badge verdict={p.verdict} small />
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-base leading-tight text-stone-900">{p.title}</p>
                <p className="mt-0.5 text-xs italic text-stone-500">
                  {p.artist} · {p.collection} · {p.year}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      <footer className="border-t border-stone-300/70 px-6 py-6 text-center">
        <p className="text-xs italic text-stone-500">
          Authenticated on GenLayer · <span className="font-mono not-italic">{CONTRACT}</span>
        </p>
      </footer>

      {/* VERIFY MODAL */}
      <AnimatePresence>
        {verifyOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVerifyOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-sm border border-stone-300 bg-[#F5F0E8] p-7 shadow-2xl"
            >
              <p className="text-xs uppercase tracking-[0.25em] text-stone-500">Provenance check</p>
              <h3 className="mt-1 text-2xl text-stone-900">Verify a work</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Enter a token ID or contract address. Validators trace the mint signature and cross-chain history.
              </p>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Token ID or 0x contract…"
                className="mt-4 w-full rounded-sm border border-stone-400 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-800"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              />
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setVerifyOpen(false)}
                  className="flex-1 rounded-sm border border-stone-400 py-2.5 text-sm text-stone-600 transition hover:bg-stone-200"
                >
                  Cancel
                </button>
                <button
                  onClick={runVerify}
                  className="flex-1 rounded-sm bg-stone-900 py-2.5 text-sm text-[#F5F0E8] transition hover:bg-stone-700"
                >
                  Authenticate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL LIGHTBOX */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 px-4 backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-sm bg-[#F5F0E8] shadow-2xl md:grid-cols-2"
            >
              <div className="bg-stone-200">
                <Artwork hue={active.hue} height={Math.min(active.height + 80, 480)} />
              </div>
              <div className="flex flex-col p-7">
                <div className="flex items-start justify-between">
                  <Badge verdict={active.verdict} />
                  <button
                    onClick={() => setActive(null)}
                    className="text-stone-400 transition hover:text-stone-800"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="mt-4 text-2xl text-stone-900">{active.title}</h3>
                <p className="mt-1 text-sm italic text-stone-500">
                  {active.artist} · {active.collection} · {active.year}
                </p>

                <div className="mt-5 rounded-sm border border-stone-300 bg-white/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Verdict</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-700">{VERDICT_META[active.verdict].note}</p>
                </div>

                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-stone-500">Provenance chain</p>
                <ol className="mt-2 space-y-2">
                  {active.provenance.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-stone-700">
                      <span className="font-mono text-xs text-stone-400">{String(i + 1).padStart(2, '0')}</span>
                      {step}
                    </li>
                  ))}
                </ol>

                <p className="mt-auto pt-6 font-mono text-[10px] text-stone-400">
                  {CONTRACT}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
