import { useState, useCallback } from 'react'

// ──────────────────────────────────────────────
// API 베이스 URL (로컬 개발 vs 배포)
// ──────────────────────────────────────────────
const API_BASE =
  window.location.hostname === 'localhost'
    ? 'http://localhost:8002'
    : `http://${window.location.hostname}:8002`

// ──────────────────────────────────────────────
// 유틸
// ──────────────────────────────────────────────
const YEARS = [2025, 2024, 2023]
const YEAR_STRS = ['2025', '2024', '2023']  // fin/ratios 키가 문자열
const TARGET_KEYS = ['매출액', '영업이익', '당기순이익', '자산총계', '부채총계', '자본총계']
const COLORS = ['#1e3a8a', '#0369a1', '#0f766e']   // 회사별 대표 색상

// 천단위 콤마 포함 정수 문자열
function comma(n) {
  return Math.round(n).toLocaleString('ko-KR')
}

function fmt(val) {
  if (val == null) return '-'
  const n = Number(val)
  if (isNaN(n)) return '-'
  const abs = Math.abs(n)
  if (abs >= 1e12) return comma(n / 1e8) + '억'   // 조 단위도 억으로 통일 표시
  if (abs >= 1e8)  return comma(n / 1e8) + '억'
  if (abs >= 1e4)  return comma(n / 1e4) + '만'
  return comma(n) + '원'
}

function fmtBil(val) {
  // 억 단위 표시, 천단위 콤마 포함 (재무제표 테이블용)
  if (val == null) return '-'
  const n = Number(val)
  if (isNaN(n)) return '-'
  return comma(n / 1e8) + '억'
}

function fmtPct(val) {
  if (val == null) return '-'
  const n = Number(val)
  if (isNaN(n)) return '-'
  return n.toFixed(1) + '%'
}

function growthBadge(val) {
  if (val == null) return null
  const n = Number(val)
  if (isNaN(n)) return null
  const cls = n >= 0 ? 'badge-positive' : 'badge-negative'
  return <span className={cls}>{n >= 0 ? '▲' : '▼'} {Math.abs(n).toFixed(1)}%</span>
}

function ratingColor(score) {
  if (score == null) return 'text-gray-400'
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  return 'text-red-500'
}

// ──────────────────────────────────────────────
// 검색 입력 + 선택 드롭다운
// ──────────────────────────────────────────────
function CompanySearchBox({ idx, value, onSelect, disabled }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const search = useCallback(async (q) => {
    setQuery(q)
    if (q.length < 1) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: q }),   // 백엔드 SearchReq.name
      })
      const data = await res.json()
      // 백엔드가 배열을 직접 반환
      setResults(Array.isArray(data) ? data : (data.results || []))
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const pick = (corp) => {
    onSelect(corp)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-navy-500 focus-within:border-navy-500">
        <span className="text-xs font-bold text-white px-2 py-0.5 rounded"
              style={{ background: COLORS[idx] }}>
          {idx + 1}
        </span>
        {value ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-800">{value.corp_name}</span>
            <span className="text-xs text-gray-400">{value.stock_code || value.corp_code}</span>
            <button
              className="ml-auto text-gray-400 hover:text-red-500 text-xs"
              onClick={() => onSelect(null)}
              disabled={disabled}
            >✕</button>
          </div>
        ) : (
          <input
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            placeholder={`회사명 검색 (${idx + 1}번째)`}
            value={query}
            onChange={e => search(e.target.value)}
            disabled={disabled}
          />
        )}
        {loading && <div className="spinner" />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {results.map(corp => (
            <button
              key={corp.corp_code}
              className="w-full text-left px-4 py-2 text-sm hover:bg-navy-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
              onClick={() => pick(corp)}
            >
              <span className="font-medium text-gray-800">{corp.corp_name}</span>
              <span className="text-xs text-gray-400 ml-auto">{corp.stock_code || corp.corp_code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// KPI 카드 (단일 수치)
// ──────────────────────────────────────────────
function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card flex flex-col gap-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  )
}

// ──────────────────────────────────────────────
// 재무제표 테이블 (단일 회사)
// ──────────────────────────────────────────────
function FinTable({ data, color }) {
  // data: { "2024": {매출액: n, ...}, "2023": {...}, "2022": {...} }  (문자열 키)
  if (!data) return <div className="text-sm text-gray-400 p-4">데이터 없음</div>

  const years = YEAR_STRS.filter(y => data[y])
  if (years.length === 0) return <div className="text-sm text-gray-400 p-4">데이터 없음</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header-left" style={{ background: color }}>항목</th>
            {years.map(y => (
              <th key={y} className="table-header text-right" style={{ background: color }}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TARGET_KEYS.map((key, i) => (
            <tr key={key} className={i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
              <td className="table-cell-left">{key}</td>
              {years.map(y => (
                <td key={y} className="table-cell">
                  {data[y] ? fmtBil(data[y][key]) : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────
// 재무비율 테이블 (단일 회사)
// ──────────────────────────────────────────────
function RatioTable({ ratios, color }) {
  if (!ratios) return null
  const RATIO_LABELS = {
    영업이익률: '영업이익률',
    순이익률: '순이익률',
    ROE: 'ROE',
    ROA: 'ROA',
    부채비율: '부채비율',
    자기자본비율: '자기자본비율',
    매출성장률: '매출성장률',
    영업이익성장률: '영업이익 성장률',
  }
  const years = YEAR_STRS.filter(y => ratios[y])
  if (years.length === 0) return null

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="table-header-left text-xs" style={{ background: color }}>비율 지표</th>
            {years.map(y => (
              <th key={y} className="table-header text-xs text-right" style={{ background: color }}>{y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(RATIO_LABELS).map(([key, label], i) => (
            <tr key={key} className={i % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
              <td className="table-cell-left text-xs">{label}</td>
              {years.map(y => (
                <td key={y} className="table-cell text-xs">
                  {ratios[y] ? fmtPct(ratios[y][key]) : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ──────────────────────────────────────────────
// AI 종합 의견 패널
// ──────────────────────────────────────────────
function OpinionPanel({ corpName, opinion, loading, color }) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 p-4 text-sm text-gray-500">
        <div className="spinner" style={{ borderTopColor: color }} />
        AI 의견 생성 중...
      </div>
    )
  }
  if (!opinion) return null

  return (
    <div className="p-4">
      <div className="text-xs font-semibold mb-2" style={{ color }}>
        {corpName} — AI 종합 의견
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {opinion}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────
// 3-컬럼 비교 그리드 (단일 섹션)
// ──────────────────────────────────────────────
function CompareGrid({ companies, renderCell }) {
  return (
    <div className={`grid gap-4 ${companies.length === 3 ? 'grid-cols-3' : companies.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {companies.map((c, i) => (
        <div key={c.corp_code} className="card">
          {renderCell(c, i)}
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────
// 메인 앱
// ──────────────────────────────────────────────
export default function App() {
  // 선택된 회사 (최대 3)
  const [selected, setSelected] = useState([null, null, null])
  // 분석 결과 { corp_code: { fin: {...}, ratios: {...}, corp_name } }
  const [results, setResults] = useState({})
  // AI 의견 { corp_code: string }
  const [opinions, setOpinions] = useState({})
  const [opinionLoading, setOpinionLoading] = useState({})
  // 로딩 / 에러
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // 다운로드
  const [exporting, setExporting] = useState(false)
  const [downloadFile, setDownloadFile] = useState(null)

  const activeCompanies = selected.filter(Boolean)

  // 회사 선택/해제
  const handleSelect = (idx, corp) => {
    setSelected(prev => {
      const next = [...prev]
      next[idx] = corp
      return next
    })
    // 해제 시 결과도 제거
    if (!corp) {
      const prevCorp = selected[idx]
      if (prevCorp) {
        setResults(r => { const n = { ...r }; delete n[prevCorp.corp_code]; return n })
        setOpinions(o => { const n = { ...o }; delete n[prevCorp.corp_code]; return n })
      }
    }
  }

  // 분석 실행
  const handleAnalyze = async () => {
    if (activeCompanies.length === 0) {
      setError('최소 1개 회사를 선택해주세요.')
      return
    }
    setError('')
    setLoading(true)
    setResults({})
    setOpinions({})

    try {
      const res = await fetch(`${API_BASE}/api/analyze-multi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companies: activeCompanies }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || '분석 실패')
      }
      const data = await res.json()
      // data.results: [{corp, fin:{"2024":{...},...}, ratios:{...}, yoy:{...}}]
      // → corp_code 기준 dict로 변환
      const resultMap = {}
      for (const item of (data.results || [])) {
        const code = item.corp?.corp_code
        if (code) resultMap[code] = item
      }
      setResults(resultMap)
      setDownloadFile(data.filename || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // 개별 AI 의견 요청
  const handleOpinion = async (corp) => {
    const fin = results[corp.corp_code]?.fin
    const ratios = results[corp.corp_code]?.ratios
    if (!fin) return

    setOpinionLoading(prev => ({ ...prev, [corp.corp_code]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/opinion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ corp_name: corp.corp_name, fin, ratios }),
      })
      if (!res.ok) throw new Error('의견 생성 실패')
      const data = await res.json()
      // 백엔드: {"opinions": [...lines]}
      const text = Array.isArray(data.opinions)
        ? data.opinions.join('\n')
        : (data.opinion || '')
      setOpinions(prev => ({ ...prev, [corp.corp_code]: text }))
    } catch (e) {
      setOpinions(prev => ({ ...prev, [corp.corp_code]: `오류: ${e.message}` }))
    } finally {
      setOpinionLoading(prev => ({ ...prev, [corp.corp_code]: false }))
    }
  }

  // 전체 AI 의견 (모든 분석된 회사)
  const handleAllOpinions = () => {
    activeCompanies.forEach(corp => {
      if (results[corp.corp_code] && !opinions[corp.corp_code]) {
        handleOpinion(corp)
      }
    })
  }

  // Excel 내보내기
  const handleExport = async () => {
    if (Object.keys(results).length === 0) return
    setExporting(true)
    try {
      // 백엔드 ExportReq: { results: list[dict], opinions: dict[str, list[str]] }
      const payload = {
        results: activeCompanies.map(c => ({
          corp: c,
          fin:    results[c.corp_code]?.fin    || {},
          ratios: results[c.corp_code]?.ratios || {},
          yoy:    results[c.corp_code]?.yoy    || {},
        })),
        opinions: Object.fromEntries(
          activeCompanies
            .filter(c => opinions[c.corp_code])
            .map(c => [c.corp_code, [opinions[c.corp_code]]])
        ),
      }
      const res = await fetch(`${API_BASE}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('내보내기 실패')
      const data = await res.json()
      if (data.filename) {
        window.location.href = `${API_BASE}/api/download/${data.filename}`
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setExporting(false)
    }
  }

  // 최신 연도 KPI (fin 키가 문자열 "2024" 등)
  const getLatestKpi = (corpCode) => {
    const fin = results[corpCode]?.fin
    if (!fin) return null
    for (const y of YEAR_STRS) {
      if (fin[y] && fin[y]['매출액'] != null) return fin[y]
    }
    return null
  }

  // 최신 연도 문자열 반환
  const getLatestYear = (corpCode) => {
    const fin = results[corpCode]?.fin
    if (!fin) return null
    return YEAR_STRS.find(y => fin[y] && fin[y]['매출액'] != null) || null
  }

  const hasResults = Object.keys(results).length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 헤더 ── */}
      <header className="bg-navy-900 text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">📊 DART 재무분석기</h1>
            <p className="text-xs text-navy-300 mt-0.5">전자공시 기반 3개 기업 비교분석</p>
          </div>
          {hasResults && (
            <button
              className="btn-secondary text-sm flex items-center gap-2"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? <div className="spinner h-4 w-4" /> : '📥'}
              Excel 다운로드
            </button>
          )}
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {/* ── 회사 검색 패널 ── */}
        <div className="card p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">기업 선택 (최대 3개)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[0, 1, 2].map(i => (
              <CompanySearchBox
                key={i}
                idx={i}
                value={selected[i]}
                onSelect={corp => handleSelect(i, corp)}
                disabled={loading}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              className="btn-primary text-sm px-6 flex items-center gap-2"
              onClick={handleAnalyze}
              disabled={loading || activeCompanies.length === 0}
            >
              {loading ? <><div className="spinner h-4 w-4" /> 분석 중...</> : '🔍 재무분석 실행'}
            </button>
            {hasResults && (
              <button
                className="btn-secondary text-sm flex items-center gap-2"
                onClick={handleAllOpinions}
                disabled={Object.values(opinionLoading).some(Boolean)}
              >
                🤖 AI 종합의견 생성
              </button>
            )}
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </div>

        {/* ── KPI 요약 (최신 연도) ── */}
        {hasResults && (
          <div>
            <h2 className="section-title">최근 연도 주요 지표</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeCompanies.map((corp, i) => {
                const kpi = getLatestKpi(corp.corp_code)
                const latestYear = getLatestYear(corp.corp_code)
                return (
                  <div key={corp.corp_code} className="card p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                      <span className="font-bold text-gray-800">{corp.corp_name}</span>
                      {latestYear && <span className="text-xs text-gray-400 ml-auto">{latestYear}년</span>}
                    </div>
                    {kpi ? (
                      <div className="grid grid-cols-2 gap-2">
                        <KpiCard label="매출액" value={fmt(kpi['매출액'])} color={COLORS[i]} />
                        <KpiCard label="영업이익" value={fmt(kpi['영업이익'])} color={COLORS[i]} />
                        <KpiCard label="당기순이익" value={fmt(kpi['당기순이익'])} color={COLORS[i]} />
                        <KpiCard label="자산총계" value={fmt(kpi['자산총계'])} color={COLORS[i]} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">데이터 없음</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 재무제표 비교 ── */}
        {hasResults && (
          <div>
            <h2 className="section-title">재무제표 비교 (억 원)</h2>
            <div className={`grid gap-4 ${activeCompanies.length === 3 ? 'grid-cols-3' : activeCompanies.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeCompanies.map((corp, i) => (
                <div key={corp.corp_code} className="card">
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-sm font-bold text-gray-800">{corp.corp_name}</span>
                  </div>
                  <FinTable
                    data={results[corp.corp_code]?.fin}
                    color={COLORS[i]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 재무비율 비교 ── */}
        {hasResults && (
          <div>
            <h2 className="section-title">재무비율 분석</h2>
            <div className={`grid gap-4 ${activeCompanies.length === 3 ? 'grid-cols-3' : activeCompanies.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeCompanies.map((corp, i) => (
                <div key={corp.corp_code} className="card px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-sm font-bold text-gray-800">{corp.corp_name}</span>
                  </div>
                  <RatioTable
                    ratios={results[corp.corp_code]?.ratios}
                    color={COLORS[i]}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 성장률 비교 테이블 ── */}
        {hasResults && activeCompanies.length >= 2 && (
          <div>
            <h2 className="section-title">재무항목 비교 ({YEAR_STRS[0]}년 기준)</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="table-header-left">항목</th>
                    {activeCompanies.map((corp, i) => (
                      <th key={corp.corp_code} className="table-header" style={{ background: COLORS[i] }}>
                        {corp.corp_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TARGET_KEYS.map((key, ki) => (
                    <tr key={key} className={ki % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                      <td className="table-cell-left">{key}</td>
                      {activeCompanies.map(corp => {
                        const fin = results[corp.corp_code]?.fin
                        const val = fin?.[YEAR_STRS[0]]?.[key]
                        return (
                          <td key={corp.corp_code} className="table-cell">
                            {fmtBil(val)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AI 종합 의견 ── */}
        {hasResults && (
          <div>
            <h2 className="section-title">AI 종합 의견</h2>
            <div className={`grid gap-4 ${activeCompanies.length === 3 ? 'grid-cols-3' : activeCompanies.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {activeCompanies.map((corp, i) => (
                <div key={corp.corp_code} className="card">
                  <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b border-gray-100">
                    <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-sm font-bold text-gray-800">{corp.corp_name}</span>
                    {!opinions[corp.corp_code] && !opinionLoading[corp.corp_code] && (
                      <button
                        className="ml-auto text-xs text-navy-700 hover:underline"
                        onClick={() => handleOpinion(corp)}
                      >
                        생성
                      </button>
                    )}
                  </div>
                  <OpinionPanel
                    corpName={corp.corp_name}
                    opinion={opinions[corp.corp_code]}
                    loading={opinionLoading[corp.corp_code]}
                    color={COLORS[i]}
                  />
                  {!opinions[corp.corp_code] && !opinionLoading[corp.corp_code] && (
                    <div className="px-4 pb-3 text-xs text-gray-400">
                      위 "생성" 버튼 또는 "AI 종합의견 생성" 버튼을 누르세요.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 초기 안내 ── */}
        {!hasResults && !loading && (
          <div className="card p-12 text-center text-gray-400">
            <div className="text-5xl mb-4">📈</div>
            <p className="text-lg font-semibold text-gray-600 mb-2">DART 재무분석기</p>
            <p className="text-sm">위에서 비교할 기업을 검색하고 <strong>재무분석 실행</strong>을 눌러주세요.</p>
            <p className="text-xs mt-2 text-gray-300">최근 3개년(2022~2024) 재무데이터를 자동으로 수집·분석합니다.</p>
          </div>
        )}

        {/* ── 로딩 오버레이 ── */}
        {loading && (
          <div className="card p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-navy-200 border-t-navy-700" />
            </div>
            <p className="text-gray-600 font-medium">DART에서 재무데이터를 수집 중입니다...</p>
            <p className="text-xs text-gray-400 mt-1">3개년 × {activeCompanies.length}개 회사 동시 조회 중</p>
          </div>
        )}
      </main>

      {/* ── 푸터 ── */}
      <footer className="mt-12 py-6 border-t border-gray-200 text-center text-xs text-gray-400">
        DART 재무분석기 · 금융감독원 전자공시시스템(DART) OpenAPI 기반 · 투자 참고용
      </footer>
    </div>
  )
}
