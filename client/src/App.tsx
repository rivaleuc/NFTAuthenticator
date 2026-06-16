import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { read, write, CONTRACT, connectWallet, isWalletConnected } from './genlayer'

type Verdict = 'authentic' | 'suspect' | 'forgery'

type Piece = {
  key: string
  imageUrl: string
  collection: string
  creator: string
  authentic: boolean
  confidence: string
  similarFound: string
  reasoning: string
  verdict: Verdict
}

const VERDICT_META: Record<Verdict, { label: string; ring: string; dot: string; note: string }> = {
  authentic: { label: 'Authentic', ring: 'border-emerald-700/40', dot: 'bg-emerald-600', note: 'No infringing source found; validator consensus accepts the work as original.' },
  suspect: { label: 'Under Review', ring: 'border-amber-700/40', dot: 'bg-amber-500', note: 'Not confirmed authentic and no concrete infringing source surfaced.' },
  forgery: { label: 'Flagged Forgery', ring: 'border-rose-800/40', dot: 'bg-rose-600', note: 'A real similar/infringing source was found; the work is not an original.' },
}

// Mirror the contract's deterministic "no infringing source" set.
const NO_SOURCE = ['', 'none', 'none found', 'no similar sources found', 'n/a']
function hasRealSource(sf: string): boolean {
  return !NO_SOURCE.includes((sf ?? '').trim().toLowerCase())
}
function deriveVerdict(authentic: boolean, similarFound: string): Verdict {
  if (authentic) return 'authentic'
  return hasRealSource(similarFound) ? 'forgery' : 'suspect'
}

function mapVerification(key: string, v: any): Piece {
  const authentic = Boolean(v?.authentic ?? v?.[4])
  const similarFound = String(v?.similar_found ?? v?.[6] ?? '')
  return {
    key,
    imageUrl: String(v?.image_url ?? v?.[1] ?? ''),
    collection: String(v?.collection ?? v?.[2] ?? ''),
    creator: String(v?.claimed_creator ?? v?.[3] ?? ''),
    authentic,
    confidence: String(v?.confidence ?? v?.[5] ?? 'low'),
    similarFound,
    reasoning: String(v?.reasoning ?? v?.[7] ?? ''),
    verdict: deriveVerdict(authentic, similarFound),
  }
}

function Artwork({ src, seed, height }: { src: string; seed: string; height: number }) {
  const [loaded, setLoaded] = useState(false)
  const fallback = `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}&size=480`
  return (
    <div className="relative w-full overflow-hidden bg-stone-200" style={{ height }}>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-200 to-stone-300" />}
      <img
        src={src || fallback}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          const img = e.target as HTMLImageElement
          if (img.src !== fallback) img.src = fallback
          setLoaded(true)
        }}
        className={`h-full w-full object-cover transition-all duration-700 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
      />
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
  const [pieces, setPieces] = useState<Piece[]>([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Piece | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [vUrl, setVUrl] = useState('')
  const [vCollection, setVCollection] = useState('')
  const [vCreator, setVCreator] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifCount, setVerifCount] = useState<number | null>(null)
  const [walletAddr, setWalletAddr] = useState<string | null>(null)

  async function handleConnect() {
    try {
      const a = await connectWallet()
      setWalletAddr(a.slice(0, 6) + '…' + a.slice(-4))
      toast.success('Wallet connected')
    } catch (e: any) {
      toast.error(e.message || 'Connect failed')
    }
  }

  async function loadGallery() {
    try {
      const s: any = await read('stats')
      const total = Number(s?.total_verifications ?? s?.[0] ?? 0)
      setVerifCount(total)
      const loaded: Piece[] = []
      for (let i = 0; i < total; i++) {
        try {
          const v: any = await read('get_verification', [String(i)])
          if (v?.exists === false) continue
          loaded.push(mapVerification(String(i), v))
        } catch {
          /* skip unreadable record */
        }
      }
      loaded.reverse()
      setPieces(loaded)
    } catch {
      /* keep empty gallery on read failure */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGallery()
  }, [])

  async function runVerify() {
    const url = vUrl.trim()
    const collection = vCollection.trim()
    const creator = vCreator.trim()
    if (!url) {
      toast.error('Enter an image URL to verify.')
      return
    }
    setVerifying(true)
    toast('🔎 Verifying on-chain — this can take 30–60s…')
    try {
      await write('verify_nft', [url, collection, creator])
      const s: any = await read('stats')
      const total = Number(s?.total_verifications ?? s?.[0] ?? 0)
      setVerifCount(total)

      const v: any = await read('get_verification', [String(total - 1)])
      const piece = mapVerification(String(total - 1), v)

      setPieces((ps) => [piece, ...ps])
      setActive(piece)
      setVerifyOpen(false)
      setVUrl('')
      setVCollection('')
      setVCreator('')
      const kind = piece.verdict === 'authentic' ? 'success' : piece.verdict === 'forgery' ? 'error' : 'warning'
      toast[kind](VERDICT_META[piece.verdict].label, { description: piece.reasoning || VERDICT_META[piece.verdict].note })
    } catch (e: any) {
      toast.error('Verification failed', { description: e?.message ?? String(e) })
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-stone-800 antialiased" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <Toaster theme="light" position="top-center" richColors />

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-300/70 bg-[#F5F0E8]/90 px-6 py-3 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg tracking-[0.2em] text-stone-900">THE AUTHENTICATOR</h1>
          <span className="hidden text-xs italic text-stone-500 sm:inline">a gallery of verified provenance</span>
        </div>
        <div className="flex items-center gap-4">
          {verifCount != null && (
            <span className="hidden text-xs italic text-stone-500 sm:inline">{verifCount} works verified</span>
          )}
          <button
            onClick={handleConnect}
            className={`rounded-sm border px-4 py-1.5 text-xs uppercase tracking-[0.15em] transition ${
              isWalletConnected()
                ? 'border-stone-800 bg-stone-800 text-[#F5F0E8]'
                : 'border-stone-400 text-stone-600 hover:border-stone-800 hover:text-stone-900'
            }`}
          >
            {walletAddr ? `● ${walletAddr}` : 'Connect Wallet'}
          </button>
          <button
            onClick={() => setVerifyOpen(true)}
            className="rounded-sm border border-stone-800 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-stone-800 transition hover:bg-stone-800 hover:text-[#F5F0E8]"
          >
            Verify New
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-10 pb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">On-chain record</p>
        <h2 className="mt-2 text-3xl text-stone-900">Verified Works</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          Every work below was submitted to <span className="font-mono not-italic text-xs">verify_nft</span> and carries an
          authenticity verdict reached by validator consensus on GenLayer. Select a piece to read its reasoning.
        </p>
      </div>

      <main className="mx-auto max-w-6xl px-6 pb-24">
        {loading && <p className="py-16 text-center text-sm italic text-stone-500">Loading verifications from chain…</p>}
        {!loading && pieces.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm italic text-stone-500">No works verified yet.</p>
            <button
              onClick={() => setVerifyOpen(true)}
              className="mt-4 rounded-sm border border-stone-800 px-5 py-2 text-xs uppercase tracking-[0.15em] text-stone-800 transition hover:bg-stone-800 hover:text-[#F5F0E8]"
            >
              Verify the first work
            </button>
          </div>
        )}
        <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6">
          {pieces.map((p) => (
            <motion.button
              key={p.key}
              layout
              onClick={() => setActive(p)}
              whileHover={{ y: -4 }}
              className="group block w-full break-inside-avoid overflow-hidden rounded-sm border border-stone-300/80 bg-white text-left shadow-[0_1px_0_rgba(0,0,0,0.04)] transition hover:shadow-xl"
            >
              <div className="relative">
                <Artwork src={p.imageUrl} seed={`nft${p.key}`} height={300} />
                <div className="absolute left-3 top-3">
                  <Badge verdict={p.verdict} small />
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="truncate text-base leading-tight text-stone-900">{p.collection || 'Untitled work'}</p>
                <p className="mt-0.5 truncate text-xs italic text-stone-500">
                  {p.creator || 'unknown creator'} · confidence: {p.confidence}
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
                Enter the artwork image URL, its collection, and the claimed creator. Validators render the page and
                check for infringing or duplicate sources.
              </p>
              <input
                value={vUrl}
                onChange={(e) => setVUrl(e.target.value)}
                placeholder="Image URL (https://…)"
                className="mt-4 w-full rounded-sm border border-stone-400 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-800"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              />
              <input
                value={vCollection}
                onChange={(e) => setVCollection(e.target.value)}
                placeholder="Collection name"
                className="mt-3 w-full rounded-sm border border-stone-400 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-800"
                style={{ fontFamily: 'ui-monospace, monospace' }}
              />
              <input
                value={vCreator}
                onChange={(e) => setVCreator(e.target.value)}
                placeholder="Claimed creator"
                className="mt-3 w-full rounded-sm border border-stone-400 bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-stone-800"
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
                  disabled={verifying}
                  className="flex-1 rounded-sm bg-stone-900 py-2.5 text-sm text-[#F5F0E8] transition hover:bg-stone-700 disabled:opacity-50"
                >
                  {verifying ? 'Authenticating…' : 'Authenticate'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL / RESULT LIGHTBOX */}
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
              <div className="min-h-[260px] bg-stone-200">
                <Artwork src={active.imageUrl} seed={`nft${active.key}`} height={420} />
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
                <h3 className="mt-4 text-2xl text-stone-900">
                  {active.authentic ? 'Authentic work' : VERDICT_META[active.verdict].label}
                </h3>
                <p className="mt-1 text-sm italic text-stone-500">
                  {active.collection || 'unknown collection'} · {active.creator || 'unknown creator'}
                </p>

                <div className="mt-5 rounded-sm border border-stone-300 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Confidence</p>
                    <p className="font-mono text-sm capitalize text-stone-800">{active.confidence}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Similar source</p>
                    <p className="max-w-[55%] truncate font-mono text-sm text-stone-800">
                      {hasRealSource(active.similarFound) ? active.similarFound : 'none'}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-stone-500">Validator reasoning</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {active.reasoning || VERDICT_META[active.verdict].note}
                </p>

                {active.imageUrl && (
                  <a
                    href={active.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-block text-xs text-stone-600 underline hover:text-stone-900"
                  >
                    View source page ↗
                  </a>
                )}

                <p className="mt-auto pt-6 font-mono text-[10px] text-stone-400">{CONTRACT}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
