import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster, toast } from 'sonner'
import { read, write, CONTRACT, connectWallet, isWalletConnected } from './genlayer'

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

function Artwork({ id, height }: { id: number; height: number }) {
  const [loaded, setLoaded] = useState(false)
  // Real, existing on-chain NFTs — Nouns DAO. Each id maps to a distinct real Noun.
  const nounIds = [11, 40, 99, 142, 200, 256, 333, 404, 512, 64, 7, 888]
  const nounId = nounIds[id % nounIds.length]
  const primary = `https://noun.pics/${nounId}`
  const fallback = `https://api.dicebear.com/9.x/shapes/svg?seed=noun${nounId}&size=480`
  return (
    <div className="relative w-full overflow-hidden bg-stone-200" style={{ height }}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-stone-200 to-stone-300" />
      )}
      <img
        src={primary}
        alt=""
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          const img = e.target as HTMLImageElement
          if (img.src !== fallback) { img.src = fallback }
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
  const [pieces] = useState<Piece[]>(PIECES)
  const [active, setActive] = useState<Piece | null>(null)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [vUrl, setVUrl] = useState('')
  const [vCollection, setVCollection] = useState('')
  const [vCreator, setVCreator] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifCount, setVerifCount] = useState<number | null>(null)
  const [verifyResult, setVerifyResult] = useState<any | null>(null)
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

  useEffect(() => {
    read('stats')
      .then((s: any) => setVerifCount(Number(s?.total_verifications ?? s?.[0] ?? 0)))
      .catch(() => {
        /* keep fallback on read failure */
      })
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
      const authentic = Boolean(v?.authentic ?? v?.[0])
      const rawConf = Number(v?.confidence ?? v?.[1] ?? 0)
      const confidence = Math.round(rawConf <= 1 ? rawConf * 100 : rawConf)
      const similar = Boolean(v?.similar_found ?? v?.[2])
      const reasoning = String(v?.reasoning ?? v?.[3] ?? '')
      const imageUrl = String(v?.image_url ?? v?.[4] ?? url)
      const collectionName = String(v?.collection ?? v?.[5] ?? collection)
      const claimedCreator = String(v?.claimed_creator ?? v?.[6] ?? creator)
      const verdict: Verdict = authentic ? 'authentic' : similar ? 'forgery' : 'suspect'

      setVerifyResult({ verdict, authentic, confidence, similar, reasoning, imageUrl, collection: collectionName, claimedCreator })
      setVerifyOpen(false)
      setVUrl('')
      setVCollection('')
      setVCreator('')
      toast[authentic ? 'success' : similar ? 'error' : 'warning'](VERDICT_META[verdict].label, {
        description: reasoning || VERDICT_META[verdict].note,
      })
    } catch (e: any) {
      toast.error('Verification failed', { description: e?.message ?? String(e) })
    } finally {
      setVerifying(false)
    }
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
                <Artwork id={p.id} height={p.height} />
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
                Enter the artwork image URL, its collection, and the claimed creator. Validators trace the mint
                signature and cross-chain history.
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

      {/* VERIFICATION RESULT LIGHTBOX */}
      <AnimatePresence>
        {verifyResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVerifyResult(null)}
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
                {verifyResult.imageUrl ? (
                  <img src={verifyResult.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-stone-400">no image</div>
                )}
              </div>
              <div className="flex flex-col p-7">
                <div className="flex items-start justify-between">
                  <Badge verdict={verifyResult.verdict as Verdict} />
                  <button
                    onClick={() => setVerifyResult(null)}
                    className="text-stone-400 transition hover:text-stone-800"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
                <h3 className="mt-4 text-2xl text-stone-900">
                  {verifyResult.authentic ? 'Authentic work' : VERDICT_META[verifyResult.verdict as Verdict].label}
                </h3>
                <p className="mt-1 text-sm italic text-stone-500">
                  {verifyResult.collection || 'unknown collection'} · {verifyResult.claimedCreator || 'unknown creator'}
                </p>

                <div className="mt-5 rounded-sm border border-stone-300 bg-white/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Confidence</p>
                    <p className="font-mono text-sm text-stone-800">{verifyResult.confidence}%</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Similar found</p>
                    <p className="font-mono text-sm text-stone-800">{verifyResult.similar ? 'yes' : 'no'}</p>
                  </div>
                </div>

                <p className="mt-5 text-xs uppercase tracking-[0.2em] text-stone-500">Validator reasoning</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-700">
                  {verifyResult.reasoning || VERDICT_META[verifyResult.verdict as Verdict].note}
                </p>

                <p className="mt-auto pt-6 font-mono text-[10px] text-stone-400">{CONTRACT}</p>
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
                <Artwork id={active.id} height={Math.min(active.height + 80, 480)} />
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
