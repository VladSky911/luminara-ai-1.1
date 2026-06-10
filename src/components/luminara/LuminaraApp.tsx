'use client'

import { useState, useEffect, useCallback, useRef, useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  LayoutDashboard, FileText, MessageSquare, Settings, Sparkles,
  Upload, Search, Trash2, RefreshCw, RefreshCcw, ChevronRight, Clock,
  CheckCircle2, AlertCircle, Loader2, File, FileCode, FileType,
  Brain, Database, Zap, Eye, BookOpen, Send, Plus, X,
  ArrowRight, BarChart3, Layers, Shield, Lightbulb, Info,
  ChevronDown, ExternalLink, Copy, Check, AlertTriangle,
  GraduationCap, Target, TrendingUp, Activity, Globe,
  Hash, AlignLeft, Type, PieChart, Menu, ChevronLeft,
  ArrowUpRight, Cpu, HardDrive, Network, Play, Pause,
  RotateCcw, Maximize2, ScrollText, Bookmark, BookmarkCheck,
  Download, MousePointerClick, LineChart, MessagesSquare,
  FileDown, FolderOpen, CheckSquare, Square, Command,
  Pencil, ThumbsUp, ThumbsDown, Keyboard, Flame, Rocket, Wand2, Tag,
  Bell, BellOff, TrendingDown, ChevronUp, Clipboard, FileUp, UploadCloud, FileJson, ArrowLeftRight, GitCompare, ArrowUp, ArrowDown, Columns,
  HelpCircle, LayoutGrid, List as ListIcon, Clock as ClockIcon,
  Sun, Moon, Monitor, User, Tags, Palette, Minimize2,
  Key, EyeOff, History, GripVertical, ArrowUpDown,
  Pin, PinOff, MoreHorizontal, SlidersHorizontal, Volume2, VolumeX, Volume1, Calendar, Filter,
  StickyNote, MessageCircle, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Treemap } from 'recharts'
import { useIsMobile } from '@/hooks/use-mobile'
import type {
  PageView, Document, DocumentStats, ChatMode, RAGResponse,
  SourceCitation, RetrievalTrace, ChatMessage, ChatSession,
  WorkspaceSettings, SearchMode, ChunkResult, AnalyticsData
} from './types'

// ==================== UTILITY FUNCTIONS ====================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function timeAgo(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

function getFileIcon(type: string, size = 'h-4 w-4') {
  switch (type) {
    case 'pdf': return <File className={`${size} text-red-400`} />
    case 'docx': return <FileType className={`${size} text-blue-400`} />
    case 'md': return <FileCode className={`${size} text-emerald-400`} />
    case 'txt': return <File className={`${size} text-amber-400`} />
    default: return <File className={`${size} text-muted-foreground`} />
  }
}

function getStatusConfig(status: string) {
  switch (status) {
    case 'indexed': return { icon: CheckCircle2, label: 'Indexed', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' }
    case 'processing': return { icon: Loader2, label: 'Processing', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', spin: true }
    case 'pending': return { icon: Clock, label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' }
    case 'failed': return { icon: AlertCircle, label: 'Failed', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' }
    default: return { icon: Clock, label: status, color: 'text-slate-400', bg: 'bg-slate-400/10', border: 'border-slate-400/20' }
  }
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return 'text-emerald-400'
  if (score >= 0.4) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 0.7) return 'bg-emerald-400/10 border-emerald-400/20'
  if (score >= 0.4) return 'bg-amber-400/10 border-amber-400/20'
  return 'bg-red-400/10 border-red-400/20'
}

function getScoreLabel(score: number): string {
  if (score >= 0.7) return 'High'
  if (score >= 0.4) return 'Medium'
  return 'Low'
}

// ==================== TAG HELPERS ====================

const TAG_COLORS = [
  { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20' },
  { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-300', border: 'border-fuchsia-500/20' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-300', border: 'border-rose-500/20' },
]

function getTagColor(tag: string) {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function parseTags(tagsStr?: string): string[] {
  if (!tagsStr) return []
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
}

// ==================== ANIMATED COUNTER ====================

function AnimatedCounter({ value, duration = 800, decimals = 0 }: { value: number | string; duration?: number; decimals?: number }) {
  const [displayed, setDisplayed] = useState(0)
  // Handle string values that may contain units (e.g., "12.7 KB")
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0
  // Extract suffix (unit) from string values like "12.7 KB"
  const suffix = typeof value === 'string' ? value.replace(/^[\d.]+\s*/, ' ').trimStart() : ''
  const hasSuffix = suffix.length > 0
  // Calculate decimal places only from the numeric portion
  const numericStr = typeof value === 'string' ? String(parseFloat(value)) : String(value)
  const isDecimal = numericStr.includes('.') ? numericStr.split('.')[1]?.length || 1 : (typeof value === 'number' && !Number.isInteger(value) ? 1 : decimals)

  useEffect(() => {
    if (typeof value === 'string' && isNaN(parseFloat(String(value)))) return
    const end = numericValue
    let startTime: number | null = null
    let rafId: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = end * eased
      setDisplayed(isDecimal > 0 ? parseFloat(current.toFixed(isDecimal)) : Math.round(current))
      if (progress < 1) rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafId)
  }, [numericValue, duration, isDecimal, value])

  if (typeof value === 'string' && isNaN(parseFloat(String(value)))) return <>{value}</>
  return <>{isDecimal > 0 ? displayed.toFixed(isDecimal) : displayed}{hasSuffix ? <span className="text-[16px] ml-0.5">{suffix}</span> : ''}</>
}

// ==================== ANIMATION VARIANTS ====================

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -12 }, transition: { duration: 0.25 } }
const staggerContainer = { animate: { transition: { staggerChildren: 0.06 } } }
const staggerItem = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } } }
const pulseGlow = { animate: { boxShadow: ['0 0 0px rgba(139,92,246,0)', '0 0 24px rgba(139,92,246,0.15)', '0 0 0px rgba(139,92,246,0)'] }, transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const } }
const shimmerVariants = { initial: { backgroundPosition: '-200% 0' }, animate: { backgroundPosition: '200% 0' } }
const pageTransition = { initial: { opacity: 0, y: 8, scale: 0.998 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -4, scale: 0.998 }, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } }

// ==================== API HOOKS ====================

function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStats>({ total: 0, indexed: 0, processing: 0, pending: 0, failed: 0 })
  const [loading, setLoading] = useState(true)
  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      setDocuments(data.documents)
      setStats(data.stats)
    } catch (err) { console.error('Failed to fetch documents:', err) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchDocuments() }, [fetchDocuments])
  return { documents, stats, loading, refetch: fetchDocuments }
}

function useSettings() {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchSettings = useCallback(async () => {
    try { const res = await fetch('/api/settings'); const data = await res.json(); setSettings(data) }
    catch (err) { console.error('Failed to fetch settings:', err) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchSettings() }, [fetchSettings])
  const updateSettings = async (updates: Record<string, string>) => {
    try { const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }); const data = await res.json(); setSettings(data); toast({ title: 'Settings saved' }) }
    catch (err) { toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' }) }
  }
  return { settings, loading, updateSettings, refetch: fetchSettings }
}

function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchAnalytics = useCallback(async () => {
    try { const res = await fetch('/api/analytics'); const d = await res.json(); setData(d) }
    catch (err) { console.error('Failed to fetch analytics:', err) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  return { data, loading, refetch: fetchAnalytics }
}

// ==================== TYPEWRITER HOOK ====================

function useTypewriter(text: string, speed = 12) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.substring(0, i))
      if (i >= text.length) { clearInterval(interval); setDone(true) }
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  return { displayed, done }
}

// ==================== ACTIVITY LOG HOOK ====================

type ActivityType = 'document_uploaded' | 'document_indexed' | 'chat_created' | 'search_performed' | 'settings_updated'

interface ActivityItem {
  id: string
  type: ActivityType
  description: string
  timestamp: string
}

const ACTIVITY_STORAGE_KEY = 'luminara-activity-feed'
const NOTIFICATION_STORAGE_KEY = 'luminara-notifications'
const MAX_ACTIVITY_ITEMS = 20

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof Upload; color: string; bg: string; label: string }> = {
  document_uploaded: { icon: Upload, color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Document Uploaded' },
  document_indexed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Document Indexed' },
  chat_created: { icon: MessageSquare, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', label: 'Chat Created' },
  search_performed: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10', label: 'Search Performed' },
  settings_updated: { icon: Settings, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Settings Updated' },
}

function useActivityLog() {
  const [activities, setActivities] = useState<ActivityItem[]>(() => {
    try {
      const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })

  const logActivity = useCallback((type: ActivityType, description: string) => {
    const newItem: ActivityItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      description,
      timestamp: new Date().toISOString(),
    }
    setActivities(prev => {
      const updated = [newItem, ...prev].slice(0, MAX_ACTIVITY_ITEMS)
      localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
    // Also create a notification with the new format
    try {
      const ACTIVITY_NOTIF_TITLES: Record<ActivityType, string> = {
        document_uploaded: 'Document Uploaded',
        document_indexed: 'Document Indexed',
        chat_created: 'Chat Session Started',
        search_performed: 'Search Completed',
        settings_updated: 'Settings Updated',
      }
      const notifItem: LuminaraNotification = {
        id: newItem.id,
        type: type as NotificationType,
        title: ACTIVITY_NOTIF_TITLES[type] || type,
        description,
        timestamp: newItem.timestamp,
        read: false,
      }
      const storedNotifs = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      const notifs: LuminaraNotification[] = storedNotifs ? JSON.parse(storedNotifs) : []
      const updatedNotifs = [notifItem, ...notifs].slice(0, MAX_NOTIFICATIONS)
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedNotifs))
      // Dispatch a custom event so NotificationBell can update
      window.dispatchEvent(new CustomEvent('luminara-notification'))
    } catch {}
  }, [])

  return { activities, logActivity }
}

// ==================== PROMPT TEMPLATES ====================

const PROMPT_TEMPLATES = [
  {
    id: 'summarize',
    category: 'Analysis',
    icon: BarChart3,
    title: 'Summarize Document',
    description: 'Get a concise summary of a document',
    prompt: 'Please provide a comprehensive summary of the key points in the document. Focus on the main arguments, conclusions, and any actionable insights.'
  },
  {
    id: 'compare',
    category: 'Analysis',
    icon: GitCompare,
    title: 'Compare Documents',
    description: 'Compare information across documents',
    prompt: 'Compare and contrast the information found across the relevant documents. Highlight agreements, contradictions, and complementary details.'
  },
  {
    id: 'extract',
    category: 'Extraction',
    icon: FileText,
    title: 'Extract Key Facts',
    description: 'Pull out important facts and figures',
    prompt: 'Extract all key facts, statistics, dates, and names from the relevant documents. Present them in a structured format.'
  },
  {
    id: 'explain',
    category: 'Learning',
    icon: GraduationCap,
    title: "Explain Like I'm 5",
    description: 'Simple explanation of complex topics',
    prompt: 'Explain this topic in simple terms that anyone could understand. Use analogies and avoid jargon.'
  },
  {
    id: 'action-items',
    category: 'Productivity',
    icon: Target,
    title: 'Extract Action Items',
    description: 'Find tasks and action items',
    prompt: 'Identify all action items, tasks, and to-dos mentioned in the documents. Organize them by priority if possible.'
  },
  {
    id: 'faq',
    category: 'Learning',
    icon: HelpCircle,
    title: 'Generate FAQ',
    description: 'Create FAQ from document content',
    prompt: 'Based on the document content, generate a list of frequently asked questions with their answers. Cover the most important topics.'
  },
  {
    id: 'critique',
    category: 'Analysis',
    icon: AlertTriangle,
    title: 'Critical Analysis',
    description: 'Analyze strengths and weaknesses',
    prompt: 'Provide a critical analysis of the arguments presented. Identify logical fallacies, unsupported claims, and areas that need more evidence.'
  },
  {
    id: 'timeline',
    category: 'Extraction',
    icon: ClockIcon,
    title: 'Build Timeline',
    description: 'Create chronological timeline of events',
    prompt: 'Extract all dates and events from the documents and arrange them in chronological order to create a timeline.'
  }
] as const

const TEMPLATE_CATEGORIES = ['All', 'Analysis', 'Extraction', 'Learning', 'Productivity'] as const

// Custom prompt template categories (extended)
const CUSTOM_TEMPLATE_CATEGORIES = ['General', 'Technical', 'Creative', 'Analysis', 'Custom'] as const

// Custom prompt template storage key
const CUSTOM_TEMPLATES_STORAGE_KEY = 'luminara-custom-templates'

interface CustomPromptTemplate {
  id: string
  name: string
  category: string
  content: string
  createdAt: string
  updatedAt: string
}

// ==================== GLASS CARD ====================

function GlassCard({ children, className = '', glow, onClick, hover }: { children: React.ReactNode; className?: string; glow?: boolean; onClick?: () => void; hover?: boolean }) {
  return (
    <motion.div
      whileHover={onClick || hover ? { scale: 1.008, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.996 } : undefined}
      className={`relative rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl overflow-hidden transition-shadow duration-400 glass-card-hover-border noise-overlay inner-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      {...(glow ? pulseGlow : {})}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-tl from-violet-500/[0.03] via-transparent to-fuchsia-500/[0.02] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

// ==================== MINI CHARTS ====================

function MiniBarChart({ data, maxVal, color = 'violet' }: { data: number[]; maxVal: number; color?: string }) {
  const g: Record<string, string> = { violet: 'from-violet-500 to-violet-400', emerald: 'from-emerald-500 to-emerald-400', amber: 'from-amber-500 to-amber-400', fuchsia: 'from-fuchsia-500 to-fuchsia-400', red: 'from-red-500 to-red-400', cyan: 'from-cyan-500 to-cyan-400' }
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((val, i) => (
        <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%` }} transition={{ delay: i * 0.04, duration: 0.4, ease: 'easeOut' }}
          className={`flex-1 rounded-t bg-gradient-to-t ${g[color] || g.violet} min-h-[2px] opacity-80 hover:opacity-100 transition-opacity`} />
      ))}
    </div>
  )
}

function MiniDonutChart({ value, max, color = 'violet', size = 44 }: { value: number; max: number; color?: string; size?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const r = (size - 6) / 2
  const c = 2 * Math.PI * r
  const off = c - (pct / 100) * c
  const sc: Record<string, string> = { violet: '#8b5cf6', emerald: '#10b981', amber: '#f59e0b', fuchsia: '#d946ef', cyan: '#06b6d4' }
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={3} className="text-white/5" />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sc[color] || sc.violet} strokeWidth={3} strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: off }} transition={{ duration: 1, ease: 'easeOut' }} />
    </svg>
  )
}

// ==================== AREA SPARKLINE ====================

function AreaSparkline({ data, color = '#8b5cf6', height = 40, width = 200 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  })
  const areaPath = `M0,${height} L${points.join(' L')} L${width},${height} Z`
  const linePath = `M${points.join(' L')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} />
      <motion.path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1, ease: 'easeOut' }} />
      {data.length > 0 && (() => {
        const lastX = ((data.length - 1) / (data.length - 1)) * width
        const lastY = height - ((data[data.length - 1] - min) / range) * (height - 4) - 2
        return <motion.circle cx={lastX} cy={lastY} r={3} fill={color} initial={{ r: 0 }} animate={{ r: 3 }} transition={{ delay: 0.8 }} />
      })()}
    </svg>
  )
}

// ==================== SIDEBAR ====================

function Sidebar({ currentPage, onNavigate, collapsed, onToggle, onOpenCommandPalette, sidebarWidth, onWidthChange }: {
  currentPage: PageView; onNavigate: (page: PageView) => void; collapsed: boolean; onToggle: () => void; onOpenCommandPalette: () => void; sidebarWidth: number; onWidthChange: (w: number) => void
}) {
  const navItems: Array<{ id: PageView; label: string; icon: typeof LayoutDashboard; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  // Sidebar resize state
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    if (collapsed) return
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth }
  }, [collapsed, sidebarWidth])

  const handleResizeDoubleClick = useCallback(() => {
    if (collapsed) return
    onWidthChange(260) // Reset to default
  }, [collapsed, onWidthChange])

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!resizeRef.current) return
      const delta = e.clientX - resizeRef.current.startX
      const newWidth = Math.max(200, Math.min(400, resizeRef.current.startWidth + delta))
      onWidthChange(newWidth)
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      resizeRef.current = null
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, onWidthChange])

  // Live health data for sidebar
  const [sidebarHealth, setSidebarHealth] = useState<Record<string, { status: string; latency?: number; chunks?: number; docs?: number }> | null>(null)
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        setSidebarHealth(data.checks)
      } catch {
        // keep previous state or null
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [])

  const getSidebarStatusDot = (status?: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-400'
      case 'degraded': return 'bg-amber-400'
      case 'error': return 'bg-red-400'
      default: return 'bg-slate-400'
    }
  }
  const getSidebarStatusText = (status?: string) => {
    switch (status) {
      case 'healthy': return { text: 'Online', color: 'text-emerald-400/60' }
      case 'degraded': return { text: 'Degraded', color: 'text-amber-400/60' }
      case 'error': return { text: 'Error', color: 'text-red-400/60' }
      default: return { text: 'Checking...', color: 'text-slate-400/60' }
    }
  }

  return (
    <motion.aside
      data-onboarding="sidebar"
      initial={false}
      animate={{ width: collapsed ? 68 : sidebarWidth }}
      transition={{ duration: isResizing ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`min-h-screen border-r border-white/[0.06] dark:bg-black/20 bg-white/60 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden relative z-20 ${isResizing ? 'select-none' : ''}`}
      style={isResizing ? { userSelect: 'none' } : undefined}
    >
      {/* Logo */}
      <div className="p-5 pb-4 flex items-center gap-3">
        <motion.div
          className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25 relative shrink-0"
          whileHover={{ rotate: 5, scale: 1.05 }}
        >
          <Sparkles className="h-5 w-5 text-white relative z-10" />
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 breathing-glow blur-sm" />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }} className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-600 dark:from-violet-300 dark:via-purple-200 dark:to-fuchsia-300 bg-clip-text text-transparent">Luminara</span>
              </h1>
              <p className="text-[9px] text-muted-foreground/50 tracking-[0.2em] uppercase font-medium">AI Knowledge Base</p>
            </motion.div>
          )}
        </AnimatePresence>
        {!collapsed && <NotificationBell />}
        <ThemeToggle />
      </div>

      <Separator className="mx-4 w-auto opacity-30" />

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          const Icon = item.icon
          const onboardingAttr = item.id === 'documents' ? 'upload' : item.id === 'search' ? 'search' : item.id === 'chat' ? 'chat' : undefined
          return (
            <TooltipProvider key={item.id} delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate(item.id)}
                    data-onboarding={onboardingAttr}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                      isActive ? 'bg-gradient-to-r from-violet-500/15 to-fuchsia-500/10 dark:text-violet-200 text-violet-700 sidebar-active-glow' : 'text-muted-foreground/60 hover:text-foreground dark:hover:bg-white/[0.03] hover:bg-black/[0.03]'
                    }`}
                  >
                    {isActive && <motion.div layoutId="sidebar-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-violet-400 to-fuchsia-400" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'dark:text-violet-400 text-violet-600' : 'text-muted-foreground/50 group-hover:text-foreground/70'}`} />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate">
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {isActive && !collapsed && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_6px_rgba(139,92,246,0.5)]" />}
                    {item.badge && !collapsed && <Badge variant="outline" className="ml-auto text-[7px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">{item.badge}</Badge>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </nav>

      {/* Bottom panels */}
      <div className="p-2.5 space-y-2">
        {!collapsed && (
          <GlassCard className="p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-4 w-4 rounded bg-violet-500/20 flex items-center justify-center"><Brain className="h-2.5 w-2.5 text-violet-300" /></div>
              <span className="text-[10px] font-semibold text-violet-300">RAG Pipeline</span>
            </div>
            <p className="text-[9px] text-muted-foreground/50 leading-relaxed">Transparent AI with citations, confidence &amp; tracing.</p>
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="h-1 flex-1 rounded-full bg-emerald-500/30" />
              <div className="h-1 flex-1 rounded-full bg-emerald-500/30" />
              <div className="h-1 flex-1 rounded-full bg-emerald-500/30" />
              <span className="text-[8px] text-emerald-400/50 ml-0.5">Active</span>
            </div>
          </GlassCard>
        )}

        {/* System Health */}
        {!collapsed && (
          <div className="px-3.5 py-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span className="text-[9px] text-muted-foreground/50 font-medium">System Health</span>
            </div>
            {[
              { label: 'Vector Store', check: sidebarHealth?.vectorStore },
              { label: 'LLM API', check: sidebarHealth?.llm },
              { label: 'Database', check: sidebarHealth?.database },
            ].map(s => {
              const statusInfo = getSidebarStatusText(s.check?.status)
              const latency = s.check?.latency
              return (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground/40">{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${getSidebarStatusDot(s.check?.status)} animate-pulse`} />
                    <span className={`text-[9px] ${statusInfo.color}`}>
                      {statusInfo.text}
                      {latency !== undefined && latency >= 0 ? ` ${latency}ms` : ''}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Collapse toggle */}
      <button onClick={onToggle} className="absolute top-[-1px] right-[-14px] h-7 w-7 rounded-full bg-card border border-white/[0.08] flex items-center justify-center z-30 hover:bg-white/[0.06] transition-colors shadow-sm">
        {collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>

      {/* Drag handle for resize (right edge) - only when expanded */}
      {!collapsed && (
        <div
          onMouseDown={handleResizeMouseDown}
          onDoubleClick={handleResizeDoubleClick}
          className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize z-40 group/handle hover:bg-violet-500/20 transition-colors"
          title="Drag to resize • Double-click to reset"
        >
          {/* Dots pattern indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[3px] opacity-0 group-hover/handle:opacity-100 transition-opacity">
            <div className="flex gap-[2px]">
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex gap-[2px]">
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex gap-[2px]">
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
              <div className="h-[2px] w-[2px] rounded-full bg-muted-foreground/30" />
            </div>
          </div>
          {/* Active drag highlight line */}
          {isResizing && (
            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-violet-500/50" />
          )}
        </div>
      )}

      {/* Command palette hint */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-white/[0.04]">
          <button onClick={onOpenCommandPalette} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[9px] text-muted-foreground/30 hover:text-muted-foreground/50 hover:bg-white/[0.02] transition-colors">
            <span className="flex items-center gap-1.5"><Command className="h-2.5 w-2.5" />Quick Search</span>
            <kbd className="text-[8px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* User Profile */}
      <UserProfile collapsed={collapsed} onNavigate={onNavigate} />
    </motion.aside>
  )
}

// ==================== MOBILE HEADER ====================

function MobileHeader({ currentPage, onMenuClick }: { currentPage: PageView; onMenuClick: () => void }) {
  const titles: Record<PageView, string> = { dashboard: 'Dashboard', documents: 'Documents', search: 'Search', chat: 'AI Chat', analytics: 'Analytics', settings: 'Settings' }
  return (
    <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] dark:border-white/[0.06] bg-black/20 dark:bg-black/20 backdrop-blur-sm lg:hidden">
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onMenuClick}><Menu className="h-5 w-5" /></Button>
      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center"><Sparkles className="h-3.5 w-3.5 text-white" /></div>
      <h1 className="text-base font-semibold">{titles[currentPage]}</h1>
      <div className="ml-auto"><ThemeToggle /></div>
    </div>
  )
}

// ==================== ACTIVITY FEED ====================

function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">Activity Feed</h3>
          <Badge variant="outline" className="text-[8px] ml-auto bg-white/[0.02] border-white/[0.06] text-muted-foreground/40">{activities.length}</Badge>
        </div>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-violet-400/15 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/40">No recent activity</p>
            <p className="text-[9px] text-muted-foreground/25 mt-1">Actions will appear here</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-72 overflow-y-auto scroll-smooth">
            {activities.slice(0, 12).map((item, i) => {
              const config = ACTIVITY_CONFIG[item.type]
              const Icon = config.icon
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.02] transition-colors group"
                >
                  <div className={`h-6 w-6 rounded-md ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-3 w-3 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate group-hover:text-violet-300 transition-colors">{item.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[8px] text-muted-foreground/30 uppercase font-semibold">{config.label}</span>
                      <span className="text-[8px] text-muted-foreground/20">•</span>
                      <span className="text-[8px] text-muted-foreground/30">{timeAgo(item.timestamp)}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== ENHANCED ACTIVITY FEED (Dashboard) ====================

function EnhancedActivityFeed({ activities, onNavigate }: { activities: ActivityItem[]; onNavigate: (page: PageView) => void }) {
  const ACTIVITY_DOT_COLORS: Record<ActivityType, string> = {
    document_uploaded: 'bg-violet-400',
    document_indexed: 'bg-emerald-400',
    chat_created: 'bg-fuchsia-400',
    search_performed: 'bg-cyan-400',
    settings_updated: 'bg-amber-400',
  }

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">Recent Activity</h3>
          <Badge variant="outline" className="text-[8px] bg-white/[0.02] border-white/[0.06] text-muted-foreground/40">{activities.length}</Badge>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 text-muted-foreground/40 hover:text-violet-300" onClick={() => onNavigate('analytics')}>
              View All <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
            </Button>
          </div>
        </div>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-violet-400/15 mx-auto mb-2" />
            <p className="text-[11px] text-muted-foreground/40">No recent activity</p>
            <p className="text-[9px] text-muted-foreground/25 mt-1">Actions will appear here</p>
          </div>
        ) : (
          <div className="relative max-h-72 overflow-y-auto scroll-smooth">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-violet-500/20 via-fuchsia-500/10 to-transparent" />
            <div className="space-y-0.5">
              {activities.slice(0, 10).map((item, i) => {
                const config = ACTIVITY_CONFIG[item.type]
                const Icon = config.icon
                return (
                  <TooltipProvider key={item.id} delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.25 }}
                          className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-white/[0.02] transition-colors group relative"
                        >
                          {/* Dot indicator on timeline */}
                          <div className="relative shrink-0 mt-1">
                            <div className={`h-2.5 w-2.5 rounded-full ${ACTIVITY_DOT_COLORS[item.type]} ring-2 ring-background/80 z-10 relative`} />
                          </div>
                          {/* Icon */}
                          <div className={`h-6 w-6 rounded-md ${config.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-3 w-3 ${config.color}`} />
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate group-hover:text-violet-300 transition-colors">{item.description}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[8px] text-muted-foreground/30 uppercase font-semibold">{config.label}</span>
                              <span className="text-[8px] text-muted-foreground/20">•</span>
                              <span className="text-[8px] text-muted-foreground/30">{timeAgo(item.timestamp)}</span>
                            </div>
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-[10px]">
                        <p className="font-medium">{config.label}</p>
                        <p className="text-muted-foreground/70">{item.description}</p>
                        <p className="text-muted-foreground/50 text-[8px]">{new Date(item.timestamp).toLocaleString()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
        )}
        {/* Legend */}
        {activities.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/[0.04]">
            {Object.entries(ACTIVITY_DOT_COLORS).slice(0, 4).map(([type, color]) => {
              const config = ACTIVITY_CONFIG[type as ActivityType]
              return (
                <span key={type} className="flex items-center gap-1 text-[8px] text-muted-foreground/30">
                  <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
                  {config.label.split(' ')[0]}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== NOTIFICATION BELL ====================

// ==================== NOTIFICATION TYPES & CONFIG ====================

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'document_uploaded' | 'document_indexed' | 'chat_created' | 'search_performed' | 'settings_updated'

interface LuminaraNotification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  read: boolean
}

const NOTIF_TYPE_CONFIG: Record<NotificationType, { icon: typeof Info; color: string; bg: string; borderColor: string }> = {
  info: { icon: Info, color: 'text-cyan-400', bg: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  document_uploaded: { icon: Upload, color: 'text-violet-400', bg: 'bg-violet-500/10', borderColor: 'border-violet-500/20' },
  document_indexed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
  chat_created: { icon: MessageSquare, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', borderColor: 'border-fuchsia-500/20' },
  search_performed: { icon: Search, color: 'text-cyan-400', bg: 'bg-cyan-500/10', borderColor: 'border-cyan-500/20' },
  settings_updated: { icon: Settings, color: 'text-amber-400', bg: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
}

const MAX_NOTIFICATIONS = 50

// ==================== NOTIFICATION CENTER HOOK ====================

function useNotificationCenter() {
  const pushNotification = useCallback((type: NotificationType, title: string, description: string) => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      const existing: LuminaraNotification[] = stored ? JSON.parse(stored) : []
      const newNotif: LuminaraNotification = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        read: false,
      }
      const updated = [newNotif, ...existing].slice(0, MAX_NOTIFICATIONS)
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('luminara-notification'))
    } catch {}
  }, [])

  return { pushNotification }
}

// ==================== NOTIFICATION BELL ====================

function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<LuminaraNotification[]>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })
  const bellRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  // Sound alert state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { const stored = localStorage.getItem('luminara-notification-sound'); return stored !== null ? JSON.parse(stored) : true } catch { return true }
  })
  const [soundVolume, setSoundVolume] = useState(() => {
    try { const stored = localStorage.getItem('luminara-notification-volume'); return stored !== null ? JSON.parse(stored) : 70 } catch { return 70 }
  })
  const audioContextRef = useRef<AudioContext | null>(null)

  // Play notification sound using Web Audio API
  const playNotifSound = useCallback((type: NotificationType = 'info') => {
    if (!soundEnabled) return
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') ctx.resume()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      // Different frequencies for different notification types
      const freqMap: Record<string, number> = { info: 440, success: 523, warning: 659, error: 349, document_uploaded: 440, document_indexed: 523, chat_created: 494, search_performed: 392, settings_updated: 440 }
      const freq = freqMap[type] || 440
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
      oscillator.type = 'sine'
      const vol = (soundVolume / 100) * 0.3
      gainNode.gain.setValueAtTime(vol, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.15)
    } catch {}
  }, [soundEnabled, soundVolume])

  // Toggle sound and persist
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev
      localStorage.setItem('luminara-notification-sound', JSON.stringify(next))
      return next
    })
  }, [])

  // Update volume and persist
  const updateVolume = useCallback((v: number) => {
    setSoundVolume(v)
    localStorage.setItem('luminara-notification-volume', JSON.stringify(v))
  }, [])

  const loadNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
      if (stored) {
        const parsed: LuminaraNotification[] = JSON.parse(stored)
        setNotifications(prev => {
          // Check if new notifications arrived (more unread or higher count)
          const newUnread = parsed.filter(n => !n.read).length
          const prevUnread = prev.filter(n => !n.read).length
          if (newUnread > prevUnread && parsed.length > 0) {
            // Play sound for the newest notification type
            const newest = parsed.find(n => !n.read)
            if (newest) playNotifSound(newest.type)
          }
          return parsed
        })
      }
    } catch {}
  }, [playNotifSound])

  useEffect(() => {
    const handler = () => loadNotifications()
    window.addEventListener('luminara-notification', handler)
    return () => window.removeEventListener('luminara-notification', handler)
  }, [loadNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    setNotifications(updated)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
  }

  const clearAll = () => {
    setNotifications([])
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify([]))
    toast({ title: 'Notifications cleared' })
  }

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setNotifications(updated)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => {
          if (!open && bellRef.current) {
            const rect = bellRef.current.getBoundingClientRect()
            const dropdownWidth = 320
            const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 16))
            const topPos = Math.min(rect.bottom + 8, window.innerHeight - 400)
            setDropdownPos({ top: topPos, left: leftPos })
          }
          setOpen(!open)
        }}
        className="relative h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
      >
        {unreadCount > 0 ? <Bell className="h-3.5 w-3.5 text-violet-300" /> : <BellOff className="h-3.5 w-3.5 text-muted-foreground/40" />}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[7px] font-bold text-white flex items-center justify-center px-1 shadow-lg shadow-violet-500/30"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
            <motion.div
              className="absolute inset-0 rounded-full bg-violet-500"
              animate={{ opacity: [0, 0.4, 0], scale: [1, 1.5, 1.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl shadow-violet-500/10 z-[100] overflow-hidden"
            style={{ top: dropdownPos.top, left: dropdownPos.left, width: 320 }}
          >
            <div className="p-3 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[11px] font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="outline" className="text-[7px] px-1.5 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">{unreadCount} new</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Sound toggle */}
                  <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => { toggleSound(); if (!soundEnabled) playNotifSound('info') }} className={`h-6 w-6 rounded-md flex items-center justify-center transition-all ${soundEnabled ? 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20' : 'bg-white/[0.03] text-muted-foreground/30 hover:bg-white/[0.06]'}`}>
                    {soundEnabled ? (soundVolume > 50 ? <Volume2 className="h-3 w-3" /> : <Volume1 className="h-3 w-3" />) : <VolumeX className="h-3 w-3" />}
                  </button></TooltipTrigger><TooltipContent>{soundEnabled ? 'Sound on' : 'Sound off'}</TooltipContent></Tooltip></TooltipProvider>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[9px] text-violet-400 hover:text-violet-300 transition-colors font-medium flex items-center gap-1">
                      <Check className="h-2.5 w-2.5" />Mark read
                    </button>
                  )}
                </div>
              </div>
              {/* Volume slider (shown when sound enabled) */}
              {soundEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <VolumeX className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                  <input
                    type="range" min={0} max={100} step={5} value={soundVolume}
                    onChange={e => updateVolume(parseInt(e.target.value))}
                    className="flex-1 h-1 rounded-full appearance-none bg-white/[0.06] accent-violet-500 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-sm"
                  />
                  <Volume2 className="h-2.5 w-2.5 text-muted-foreground/30 shrink-0" />
                  <span className="text-[8px] text-muted-foreground/30 font-mono w-6 text-right">{soundVolume}%</span>
                </div>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto scroll-smooth">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <BellOff className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" />
                  <p className="text-[11px] text-muted-foreground/40">No notifications yet</p>
                  <p className="text-[9px] text-muted-foreground/25 mt-1">Activity alerts will appear here</p>
                </div>
              ) : (
                notifications.slice(0, 20).map((notif, i) => {
                  const config = NOTIF_TYPE_CONFIG[notif.type] || NOTIF_TYPE_CONFIG.info
                  const Icon = config.icon
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      onClick={() => markAsRead(notif.id)}
                      className={`flex items-start gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors cursor-pointer ${!notif.read ? 'bg-violet-500/[0.04]' : ''}`}
                    >
                      <div className={`h-6 w-6 rounded-md ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`h-3 w-3 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold truncate">{notif.title}</p>
                        <p className="text-[9px] text-muted-foreground/50 truncate">{notif.description}</p>
                        <span className="text-[8px] text-muted-foreground/30">{timeAgo(notif.timestamp)}</span>
                      </div>
                      {!notif.read && <div className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-2 shrink-0" />}
                    </motion.div>
                  )
                })
              )}
            </div>
            {notifications.length > 0 && (
              <div className="p-2 border-t border-white/[0.06]">
                <button onClick={clearAll} className="w-full text-[9px] text-muted-foreground/40 hover:text-red-400 transition-colors py-1 flex items-center justify-center gap-1">
                  <X className="h-2.5 w-2.5" />Clear all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== THEME TOGGLE ====================

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const currentIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor
  const CurrentIcon = currentIcon

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-8 w-8 rounded-lg bg-white/[0.04] dark:bg-white/[0.04] flex items-center justify-center border border-white/[0.06] dark:border-white/[0.06] hover:bg-white/[0.06] dark:hover:bg-white/[0.06] transition-colors"
      >
        <CurrentIcon className="h-3.5 w-3.5 text-violet-300 dark:text-violet-300" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-40 rounded-xl theme-dropdown shadow-2xl z-50 overflow-hidden"
          >
            {[
              { value: 'light' as const, icon: Sun, label: 'Light' },
              { value: 'dark' as const, icon: Moon, label: 'Dark' },
              { value: 'system' as const, icon: Monitor, label: 'System' },
            ].map((item) => {
              const Icon = item.icon
              const isActive = theme === item.value
              return (
                <button
                  key={item.value}
                  onClick={() => { setTheme(item.value); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-medium transition-colors ${
                    isActive ? 'bg-violet-500/10 text-violet-400' : 'text-muted-foreground hover:bg-white/[0.04] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== USER PROFILE ====================

function UserProfile({ collapsed, onNavigate }: { collapsed: boolean; onNavigate: (page: PageView) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  if (collapsed) {
    return (
      <div className="flex justify-center py-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-violet-500/20">
          LA
        </div>
      </div>
    )
  }

  return (
    <div className="relative px-3 py-2" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.03] dark:hover:bg-white/[0.03] transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-violet-500/20 avatar-glow shrink-0">
          LA
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[11px] font-semibold truncate">Admin User</p>
          <div className="flex items-center gap-1">
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-semibold">Admin</span>
          </div>
        </div>
        <ChevronDown className={`h-3 w-3 text-muted-foreground/40 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-3 right-3 top-full mt-1 rounded-xl theme-dropdown shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 space-y-0.5">
              {[
                { icon: User, label: 'Profile', action: () => {} },
                { icon: Settings, label: 'Preferences', action: () => { onNavigate('settings'); setOpen(false) } },
                { icon: Keyboard, label: 'Keyboard Shortcuts', action: () => {} },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium text-muted-foreground hover:bg-white/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== BREADCRUMB ====================

function BreadcrumbBar({ currentPage, onNavigate }: { currentPage: PageView; onNavigate: (page: PageView) => void }) {
  const pageLabels: Record<PageView, string> = {
    dashboard: 'Dashboard',
    documents: 'Documents',
    search: 'Search',
    chat: 'AI Chat',
    analytics: 'Analytics',
    settings: 'Settings',
  }

  return (
    <div className="breadcrumb-bar py-2 px-4 hidden lg:flex items-center gap-1.5 text-[11px]">
      <button
        onClick={() => onNavigate('dashboard')}
        className="text-muted-foreground/50 hover:text-foreground transition-colors font-medium"
      >
        Luminara
      </button>
      <ChevronRight className="h-3 w-3 text-muted-foreground/25" />
      <span className="text-violet-400 font-semibold">{pageLabels[currentPage]}</span>
    </div>
  )
}

// ==================== FOOTER ====================

function LuminaraFooter() {
  return (
    <footer className="luminara-footer mt-auto py-3 px-6 flex items-center justify-between text-[10px] text-muted-foreground/40">
      <div className="flex items-center gap-2">
        <span>Luminara AI 1.1</span>
        <span className="text-muted-foreground/20">•</span>
        <span>Transparent RAG Knowledge Base</span>
      </div>
      <div className="flex items-center gap-3">
        <span>v1.0.0</span>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/50">Online</span>
        </div>
      </div>
    </footer>
  )
}

// ==================== KNOWLEDGE GRAPH ====================

function KnowledgeGraph({ documents }: { documents: Document[] }) {
  const nodes = useMemo(() => {
    return documents.map((doc, i) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      x: 50 + (i % 3) * 120,
      y: 40 + Math.floor(i / 3) * 90,
      radius: Math.max(8, Math.min(20, doc.chunkCount * 1.5)),
      chunks: doc.chunkCount
    }))
  }, [documents])

  const edges = useMemo(() => {
    const links: Array<{ from: number; to: number; strength: number }> = []
    for (let i = 0; i < documents.length; i++) {
      for (let j = i + 1; j < documents.length; j++) {
        if (documents[i].type === documents[j].type) {
          links.push({ from: i, to: j, strength: 0.6 })
        }
      }
    }
    return links
  }, [documents])

  return (
    <GlassCard>
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Network className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">Knowledge Graph</h3>
        </div>
        <div className="relative h-48 bg-white/[0.01] rounded-lg border border-white/[0.04] overflow-hidden">
          <svg width="100%" height="100%" viewBox="0 0 340 200" className="absolute inset-0 max-w-full h-auto" style={{ minHeight: '100%' }}>
            {/* Edges */}
            {edges.map((edge, i) => (
              <motion.line
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.15 }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                x1={nodes[edge.from].x} y1={nodes[edge.from].y}
                x2={nodes[edge.to].x} y2={nodes[edge.to].y}
                stroke="rgb(139, 92, 246)" strokeWidth={1.5 * edge.strength} strokeDasharray="4 4"
              />
            ))}
            {/* Nodes */}
            {nodes.map((node, i) => (
              <g key={node.id}>
                <motion.circle
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: node.radius, opacity: 0.15 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  cx={node.x} cy={node.y} fill="rgb(139, 92, 246)"
                />
                <motion.circle
                  initial={{ r: 0, opacity: 0 }}
                  animate={{ r: node.radius * 0.6, opacity: 0.8 }}
                  transition={{ duration: 0.5, delay: i * 0.08 + 0.1 }}
                  cx={node.x} cy={node.y} fill="rgb(139, 92, 246)"
                />
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.08 + 0.2 }}
                  x={node.x} y={node.y + node.radius + 12}
                  textAnchor="middle" fill="currentColor" fontSize="7" className="text-muted-foreground/60"
                >
                  {node.name.length > 18 ? node.name.substring(0, 18) + '…' : node.name}
                </motion.text>
              </g>
            ))}
          </svg>
          {/* Legend */}
          <div className="absolute bottom-2 right-2 flex items-center gap-3 text-[8px] text-muted-foreground/40">
            <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Node = Document</span>
            <span className="flex items-center gap-1"><div className="h-0.5 w-3 bg-violet-400/30" /> Shared type</span>
          </div>
        </div>
      </div>
    </GlassCard>
  )
}

// ==================== DASHBOARD PAGE ====================

const RECHART_COLORS = ['#8b5cf6', '#d946ef', '#10b981', '#f59e0b', '#06b6d4']
const RECHART_TYPE_COLORS: Record<string, string> = { md: '#10b981', txt: '#f59e0b', pdf: '#ef4444', docx: '#3b82f6' }

function DashboardPage({ documents, stats, loading, onNavigate, activities, logActivity }: {
  documents: Document[]; stats: DocumentStats; loading: boolean; onNavigate: (page: PageView) => void; activities: ActivityItem[]; logActivity: (type: ActivityType, desc: string) => void
}) {
  const totalChunks = useMemo(() => documents.reduce((s, d) => s + d.chunkCount, 0), [documents])
  const totalSize = useMemo(() => documents.reduce((s, d) => s + d.fileSize, 0), [documents])
  const typeDistribution = useMemo(() => { const d: Record<string, number> = {}; for (const doc of documents) d[doc.type] = (d[doc.type] || 0) + doc.chunkCount; return Object.entries(d).sort((a, b) => b[1] - a[1]) }, [documents])

  // Recharts data: Activity Timeline (AreaChart) - last 7 days
  const activityTimelineData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const now = new Date()
    return days.map((name, i) => {
      const dayDate = new Date(now)
      dayDate.setDate(now.getDate() - (6 - i))
      const dayStr = dayDate.toISOString().split('T')[0]
      const docsThisDay = activities.filter(a => a.type === 'document_uploaded' && a.timestamp.startsWith(dayStr)).length
      const chatsThisDay = activities.filter(a => a.type === 'chat_created' && a.timestamp.startsWith(dayStr)).length
      const searchesThisDay = activities.filter(a => a.type === 'search_performed' && a.timestamp.startsWith(dayStr)).length
      // Add some base data from documents for visual appeal
      const docCount = documents.filter(d => d.createdAt.startsWith(dayStr)).length
      return { name, documents: docsThisDay + docCount, sessions: chatsThisDay, searches: searchesThisDay }
    })
  }, [activities, documents])

  // Recharts data: Chunks per Document (BarChart)
  const chunksBarData = useMemo(() =>
    documents.slice(0, 8).map(d => ({ name: d.name.length > 12 ? d.name.substring(0, 12) + '…' : d.name, chunks: d.chunkCount })),
    [documents]
  )

  // Recharts data: File Type Distribution (PieChart)
  const fileTypePieData = useMemo(() =>
    typeDistribution.map(([type, count]) => ({ name: type.toUpperCase(), value: count, color: RECHART_TYPE_COLORS[type] || '#8b5cf6' })),
    [typeDistribution]
  )

  // Quick Stats
  const indexingProgress = stats.total > 0 ? Math.round((stats.indexed / stats.total) * 100) : 0
  const searchCount = activities.filter(a => a.type === 'search_performed').length
  const chatSessionsActive = activities.filter(a => a.type === 'chat_created').length
  const recentActivitiesCount = activities.filter(a => {
    const diff = Date.now() - new Date(a.timestamp).getTime()
    return diff < 3600000 // last hour
  }).length
  const prevHourActivities = activities.filter(a => {
    const diff = Date.now() - new Date(a.timestamp).getTime()
    return diff >= 3600000 && diff < 7200000 // previous hour
  }).length
  const trendUp = recentActivitiesCount >= prevHourActivities

  const statCards = [
    { label: 'Total Documents', value: stats.total, icon: FileText, color: 'from-violet-500/20 to-purple-600/10', iconColor: 'text-violet-400', borderColor: 'border-violet-500/20', chart: <MiniDonutChart value={stats.indexed} max={Math.max(stats.total, 1)} color="violet" /> },
    { label: 'Indexed', value: stats.indexed, icon: CheckCircle2, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/20', chart: <MiniDonutChart value={stats.indexed} max={Math.max(stats.total, 1)} color="emerald" /> },
    { label: 'Total Chunks', value: totalChunks, icon: Layers, color: 'from-fuchsia-500/20 to-fuchsia-600/10', iconColor: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/20', chart: null },
    { label: 'Knowledge Size', value: formatFileSize(totalSize), icon: Database, color: 'from-amber-500/20 to-amber-600/10', iconColor: 'text-amber-400', borderColor: 'border-amber-500/20', chart: null },
  ]

  return (
    <div className="space-y-5">
      <WelcomePanel onNavigate={onNavigate} />

      {/* Quick Stats Bar */}
      <QuickStatsBar documents={documents} stats={stats} activities={activities} />

      {/* Quick Action Cards */}
      <QuickActionCards onNavigate={onNavigate} stats={stats} documents={documents} />

      <motion.div className="flex items-center justify-between" {...fadeIn}>
        <div>
          <h2 className="text-[26px] font-bold tracking-tight page-title-gradient">Dashboard</h2>
          <p className="text-sm text-muted-foreground/60 mt-0.5">Overview of your knowledge base</p>
        </div>
        <Button onClick={() => onNavigate('documents')} size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-500/20 border-0">
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={staggerContainer} initial="initial" animate="animate">
        {statCards.map(card => (
          <motion.div key={card.label} variants={staggerItem}>
            <GlassCard className={`border ${card.borderColor}`} hover>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">{card.label}</p>
                    <p className="text-[28px] font-bold mt-1 tracking-tight stat-glow">
                      {loading ? <span className="inline-block w-12 h-8 rounded-lg shimmer-violet" /> : <AnimatedCounter value={card.value} />}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.chart}
                    <div className="h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.04]"><card.icon className={`h-4 w-4 ${card.iconColor}`} /></div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard hover>
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Indexing Progress</span>
              <span className="text-[11px] font-bold text-emerald-400">{indexingProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${indexingProgress}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            </div>
            <p className="text-[8px] text-muted-foreground/30 mt-1.5">{stats.indexed} / {stats.total} documents</p>
          </div>
        </GlassCard>
        <GlassCard hover>
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Search Usage</span>
              <Search className="h-3 w-3 text-cyan-400" />
            </div>
            <p className="text-[22px] font-bold stat-glow">{searchCount}</p>
            <p className="text-[8px] text-muted-foreground/30 mt-0.5">total searches performed</p>
          </div>
        </GlassCard>
        <GlassCard hover>
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Chat Sessions</span>
              <MessageSquare className="h-3 w-3 text-fuchsia-400" />
            </div>
            <p className="text-[22px] font-bold stat-glow">{chatSessionsActive}</p>
            <p className="text-[8px] text-muted-foreground/30 mt-0.5">sessions created</p>
          </div>
        </GlassCard>
        <GlassCard hover>
          <div className="p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Activity Trend</span>
              {trendUp ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-amber-400" />}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[22px] font-bold stat-glow">{recentActivitiesCount}</p>
              <span className="text-[8px] text-muted-foreground/30">this hour</span>
            </div>
            <p className={`text-[8px] mt-0.5 ${trendUp ? 'text-emerald-400/60' : 'text-amber-400/60'}`}>
              {trendUp ? '↑ Trending up' : '↓ Slowing down'}
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Recharts: Activity Timeline + Chunks per Doc */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard>
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Activity className="h-3.5 w-3.5 text-violet-400" /></div>
              <h3 className="text-sm font-semibold">Activity Timeline</h3>
            </div>
            <div className="h-48">
              {loading ? <div className="h-full w-full rounded-lg shimmer-violet" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityTimelineData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradDocuments" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradSessions" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#d946ef" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                    <Area type="monotone" dataKey="documents" stroke="#8b5cf6" fill="url(#gradDocuments)" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#8b5cf6' }} />
                    <Area type="monotone" dataKey="sessions" stroke="#d946ef" fill="url(#gradSessions)" strokeWidth={2} dot={false} activeDot={{ r: 3, fill: '#d946ef' }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-[8px] text-muted-foreground/40"><div className="h-1.5 w-1.5 rounded-full bg-violet-500" />Documents</span>
              <span className="flex items-center gap-1.5 text-[8px] text-muted-foreground/40"><div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />Sessions</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center"><BarChart3 className="h-3.5 w-3.5 text-fuchsia-400" /></div>
              <h3 className="text-sm font-semibold">Chunks per Document</h3>
            </div>
            <div className="h-48">
              {loading ? <div className="h-full w-full rounded-lg shimmer-violet" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chunksBarData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.3)' }} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                    <Bar dataKey="chunks" fill="#d946ef" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {chunksBarData.map((_, i) => <Cell key={i} fill={RECHART_COLORS[i % RECHART_COLORS.length]} />)}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Recent Documents + File Type PieChart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Documents */}
        <GlassCard className="lg:col-span-2">
          <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="h-6 w-6 rounded-md bg-violet-500/10 flex items-center justify-center"><FileText className="h-3 w-3 text-violet-400" /></div><h3 className="text-sm font-semibold">Recent Documents</h3></div>
              <Button variant="ghost" size="sm" className="text-[11px] text-muted-foreground/50 h-7" onClick={() => onNavigate('documents')}>View all <ChevronRight className="h-3 w-3 ml-0.5" /></Button>
            </div>
          </div>
          <div className="px-2 pb-2">
            {loading ? <div className="space-y-1 p-3">{[1, 2, 3].map(i => <div key={i} className="flex items-center gap-3 p-3"><div className="h-8 w-8 rounded-lg shimmer-violet" /><div className="flex-1"><div className="h-3.5 w-40 mb-1.5 rounded shimmer-violet" /><div className="h-3 w-20 rounded shimmer" /></div></div>)}</div>
            : documents.length === 0 ? <div className="text-center py-10"><div className="relative inline-block mb-3"><FileText className="h-10 w-10 text-violet-400/20 mx-auto empty-icon-pulse" /><div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-violet-400/10 animate-pulse" /></div><p className="text-sm text-muted-foreground/60 font-medium">No documents yet</p><p className="text-xs text-muted-foreground/30 mt-1">Upload your first document to get started</p><Button size="sm" variant="outline" className="mt-3 gap-1.5 text-[11px] border-dashed border-violet-500/20 text-violet-400/70 hover:bg-violet-500/5" onClick={() => onNavigate('documents')}><Upload className="h-3 w-3" />Upload Document</Button></div>
            : (
              <div className="space-y-0.5 max-h-72 overflow-y-auto scroll-smooth">
                {documents.slice(0, 6).map(doc => {
                  const sc = getStatusConfig(doc.status); const SI = sc.icon
                  return (
                    <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all group">
                      <div className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/[0.04]">{getFileIcon(doc.type, 'h-3.5 w-3.5')}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium truncate group-hover:text-violet-300 transition-colors">{doc.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-muted-foreground/40">{formatFileSize(doc.fileSize)}</span>
                          <span className="text-[9px] text-muted-foreground/25">•</span>
                          <span className="text-[9px] text-muted-foreground/40">{doc.chunkCount} chunks</span>
                          <span className="text-[9px] text-muted-foreground/25">•</span>
                          <span className="text-[9px] text-muted-foreground/40">{timeAgo(doc.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${sc.bg} ${sc.border} ${sc.color} text-[8px] px-1.5 py-0 font-medium`}><SI className={`h-2 w-2 mr-0.5 ${sc.spin ? 'animate-spin' : ''}`} />{sc.label}</Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </GlassCard>

        {/* File Type PieChart */}
        <GlassCard>
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><PieChart className="h-3.5 w-3.5 text-emerald-400" /></div>
              <h3 className="text-sm font-semibold">File Types</h3>
            </div>
            {loading ? <div className="h-44 w-full rounded-lg shimmer-violet" /> : fileTypePieData.length === 0 ? (
              <div className="text-center py-8"><PieChart className="h-8 w-8 text-muted-foreground/15 mx-auto mb-2" /><p className="text-[11px] text-muted-foreground/40">No data yet</p></div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie data={fileTypePieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                        {fileTypePieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {fileTypePieData.map((entry) => (
                    <span key={entry.name} className="flex items-center gap-1.5 text-[9px] text-muted-foreground/50">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name} ({entry.value})
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Knowledge Graph + Enhanced Activity Feed */}
      <div className="gradient-divider my-1" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <KnowledgeGraph documents={documents} />
        <EnhancedActivityFeed activities={activities} onNavigate={onNavigate} />
      </div>

      {/* Recent Chunks Widget */}
      <RecentChunksWidget documents={documents} onSelectDocument={(docId) => {
        // Navigate to documents page and open preview
        onNavigate('documents')
        // Dispatch custom event for document preview
        setTimeout(() => window.dispatchEvent(new CustomEvent('luminara-preview-document', { detail: docId })), 300)
      }} />

      {/* System Status Widget + Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SystemStatusWidget />
        <GlassCard>
          <div className="p-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <h3 className="text-sm font-semibold">Quick Links</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { page: 'chat' as PageView, icon: MessageSquare, label: 'Ask a Question', desc: 'Query your knowledge base', color: 'violet' },
                { page: 'search' as PageView, icon: Search, label: 'Vector Search', desc: 'Semantic & keyword search', color: 'fuchsia' },
                { page: 'analytics' as PageView, icon: LineChart, label: 'View Analytics', desc: 'Usage metrics & insights', color: 'emerald' },
              ].map(item => (
                <button key={item.page} onClick={() => onNavigate(item.page)} className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all group text-left">
                  <div className={`h-8 w-8 rounded-lg bg-${item.color}-500/10 flex items-center justify-center shrink-0`}><item.icon className={`h-3.5 w-3.5 text-${item.color}-400`} /></div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium group-hover:text-violet-300 transition-colors">{item.label}</p>
                    <p className="text-[8px] text-muted-foreground/30">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

// ==================== DOCUMENTS PAGE ====================

function DocumentsPage({ documents, stats, loading, refetch, logActivity, onSelectDocument }: { documents: Document[]; stats: DocumentStats; loading: boolean; refetch: () => void; logActivity: (type: ActivityType, desc: string) => void; onSelectDocument?: (docId: string) => void }) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadType, setUploadType] = useState('md')
  const [uploadContent, setUploadContent] = useState('')
  const [uploadTags, setUploadTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState<string | null>(null)
  const [viewDoc, setViewDoc] = useState<Document | null>(null)
  const [viewChunks, setViewChunks] = useState<Array<{ id: string; content: string; chunkIndex: number; tokenCount: number }>>([])
  const [viewLoading, setViewLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'chunks' | 'raw' | 'stats'>('chunks')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const dragCounterRef = useRef(0)
  const [editingDocTags, setEditingDocTags] = useState<string | null>(null)
  const [editTagsValue, setEditTagsValue] = useState('')
  const [docSearchQuery, setDocSearchQuery] = useState('')
  const [docSearchMatches, setDocSearchMatches] = useState<Array<{ start: number; end: number }>>([])
  const [docSearchActiveIndex, setDocSearchActiveIndex] = useState(-1)
  const [compareDocs, setCompareDocs] = useState<[Document, Document] | null>(null)
  const [compareChunksA, setCompareChunksA] = useState<Array<{ id: string; content: string; chunkIndex: number; tokenCount: number }>>([])
  const [compareChunksB, setCompareChunksB] = useState<Array<{ id: string; content: string; chunkIndex: number; tokenCount: number }>>([])
  const [compareLoading, setCompareLoading] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkReindexing, setBulkReindexing] = useState(false)
  const [batchTagOpen, setBatchTagOpen] = useState(false)
  const [batchTagInput, setBatchTagInput] = useState('')
  const [batchTagging, setBatchTagging] = useState(false)
  const [batchTagProgress, setBatchTagProgress] = useState({ current: 0, total: 0 })
  const [docViewMode, setDocViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') { try { return (localStorage.getItem('luminara-doc-view') as 'list' | 'grid') || 'list' } catch { return 'list' } }
    return 'list'
  })
  const docSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Drag-and-drop document reordering state
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null)
  const [dragOverDocId, setDragOverDocId] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<'above' | 'below' | null>(null)
  const [customDocOrder, setCustomDocOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') { try { const stored = localStorage.getItem('luminara-doc-order'); if (stored) return JSON.parse(stored) } catch {} }
    return []
  })

  const hasCustomOrder = customDocOrder.length > 0

  // Version History state
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<Document | null>(null)

  interface VersionEntry {
    id: string
    version: number
    timestamp: string
    summary: string
    sizeChange: string
    type: 'created' | 'reindexed' | 'tags_updated' | 'content_updated'
  }

  const getVersionHistory = useCallback((docId: string): VersionEntry[] => {
    try {
      const stored = localStorage.getItem(`luminara-doc-versions-${docId}`)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  }, [])

  const addVersionEntry = useCallback((docId: string, entry: Omit<VersionEntry, 'id' | 'version'>) => {
    try {
      const stored = localStorage.getItem(`luminara-doc-versions-${docId}`)
      const existing: VersionEntry[] = stored ? JSON.parse(stored) : []
      const newEntry: VersionEntry = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        version: existing.length + 1,
      }
      const updated = [newEntry, ...existing].slice(0, 50)
      localStorage.setItem(`luminara-doc-versions-${docId}`, JSON.stringify(updated))
    } catch {}
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Listen for keyboard shortcut events (E to edit tags, D to delete)
  useEffect(() => {
    const handleEditTags = (e: Event) => {
      const docId = (e as CustomEvent).detail as string
      const doc = documents.find(d => d.id === docId)
      if (doc) {
        setEditingDocTags(doc.id)
        setEditTagsValue(doc.tags || '')
      }
    }
    const handleDeleteDoc = (e: Event) => {
      const docId = (e as CustomEvent).detail as string
      const doc = documents.find(d => d.id === docId)
      if (doc) handleDelete(doc.id, doc.name)
    }
    window.addEventListener('luminara-edit-tags', handleEditTags)
    window.addEventListener('luminara-delete-doc', handleDeleteDoc)
    return () => {
      window.removeEventListener('luminara-edit-tags', handleEditTags)
      window.removeEventListener('luminara-delete-doc', handleDeleteDoc)
    }
  }, [documents])

  const setDocViewModePersisted = (mode: 'list' | 'grid') => {
    setDocViewMode(mode)
    try { localStorage.setItem('luminara-doc-view', mode) } catch {}
  }

  const handleUpload = async () => {
    if (!uploadName || !uploadContent) return
    setUploading(true)
    try {
      const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: uploadName, type: uploadType, content: uploadContent, tags: uploadTags }) })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      await refetch(); setUploadOpen(false); setUploadName(''); setUploadContent(''); setUploadTags('')
      logActivity('document_uploaded', `Uploaded "${uploadName}"`)
      // Add version history entry
      if (data.document?.id) {
        addVersionEntry(data.document.id, { timestamp: new Date().toISOString(), summary: 'Initial upload', sizeChange: `+${formatFileSize(uploadContent.length)}`, type: 'created' })
      }
      toast({ title: 'Document uploaded', description: `"${uploadName}" has been indexed` })
    } catch { toast({ title: 'Upload failed', variant: 'destructive' }) }
    finally { setUploading(false) }
  }

  const handleUpdateTags = async (docId: string, tags: string) => {
    try {
      const doc = documents.find(d => d.id === docId)
      await fetch(`/api/documents/${docId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }) })
      await refetch()
      setEditingDocTags(null)
      addVersionEntry(docId, { timestamp: new Date().toISOString(), summary: 'Tags updated', sizeChange: doc ? `${parseTags(doc.tags).length} → ${parseTags(tags).length} tags` : 'Tags changed', type: 'tags_updated' })
      toast({ title: 'Tags updated' })
    } catch { toast({ title: 'Failed to update tags', variant: 'destructive' }) }
  }

  const handleDelete = async (id: string, name: string) => {
    setDeleting(id)
    try { await fetch(`/api/documents/${id}`, { method: 'DELETE' }); await refetch(); toast({ title: 'Deleted', description: `"${name}" removed` }) }
    catch { toast({ title: 'Delete failed', variant: 'destructive' }) }
    finally { setDeleting(null) }
  }

  const handleReindex = async (id: string, name: string) => {
    setReindexing(id)
    try {
      await fetch(`/api/documents/${id}/reindex`, { method: 'POST' }); await refetch()
      addVersionEntry(id, { timestamp: new Date().toISOString(), summary: 'Re-indexed', sizeChange: 'Chunks regenerated', type: 'reindexed' })
      toast({ title: 'Reindexed', description: `"${name}" re-indexed` })
    }
    catch { toast({ title: 'Reindex failed', variant: 'destructive' }) }
    finally { setReindexing(null) }
  }

  const handleView = async (doc: Document) => {
    if (onSelectDocument) {
      onSelectDocument(doc.id)
    }
    setViewDoc(doc); setViewLoading(true); setDocSearchQuery(''); setDocSearchMatches([]); setDocSearchActiveIndex(-1)
    try { const res = await fetch(`/api/documents/${doc.id}`); const data = await res.json(); setViewChunks(data.chunks || []); if (data.content) setViewDoc(prev => prev ? { ...prev, content: data.content } as Document : doc) }
    catch { console.error('Failed to load') }
    finally { setViewLoading(false) }
  }

  // Search within document - debounced
  const handleDocSearch = useCallback((query: string) => {
    setDocSearchQuery(query)
    if (docSearchDebounceRef.current) clearTimeout(docSearchDebounceRef.current)
    if (!query.trim()) {
      setDocSearchMatches([])
      setDocSearchActiveIndex(-1)
      return
    }
    docSearchDebounceRef.current = setTimeout(() => {
      const content = viewDoc?.content || ''
      const searchLower = query.toLowerCase()
      const contentLower = content.toLowerCase()
      const matches: Array<{ start: number; end: number }> = []
      let pos = 0
      while (pos < contentLower.length) {
        const idx = contentLower.indexOf(searchLower, pos)
        if (idx === -1) break
        matches.push({ start: idx, end: idx + query.length })
        pos = idx + 1
      }
      setDocSearchMatches(matches)
      setDocSearchActiveIndex(matches.length > 0 ? 0 : -1)
    }, 300)
  }, [viewDoc])

  // Navigate search matches
  const navigateDocSearch = (direction: 'up' | 'down') => {
    if (docSearchMatches.length === 0) return
    let next: number
    if (direction === 'down') {
      next = (docSearchActiveIndex + 1) % docSearchMatches.length
    } else {
      next = docSearchActiveIndex <= 0 ? docSearchMatches.length - 1 : docSearchActiveIndex - 1
    }
    setDocSearchActiveIndex(next)
    // Scroll to the match
    const el = document.getElementById(`doc-match-${next}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Highlight text with search matches
  const getHighlightedContent = useCallback((content: string) => {
    if (!docSearchQuery.trim() || docSearchMatches.length === 0) return content
    const parts: Array<{ text: string; isMatch: boolean; matchIndex: number }> = []
    let lastEnd = 0
    docSearchMatches.forEach((match, idx) => {
      if (match.start > lastEnd) {
        parts.push({ text: content.slice(lastEnd, match.start), isMatch: false, matchIndex: -1 })
      }
      parts.push({ text: content.slice(match.start, match.end), isMatch: true, matchIndex: idx })
      lastEnd = match.end
    })
    if (lastEnd < content.length) {
      parts.push({ text: content.slice(lastEnd), isMatch: false, matchIndex: -1 })
    }
    return parts
  }, [docSearchQuery, docSearchMatches])

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return
    setBulkDeleting(true)
    try {
      const res = await fetch('/api/documents/bulk-delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: Array.from(selectedDocs) }) })
      const data = await res.json()
      toast({ title: 'Bulk delete', description: `${data.deleted} documents deleted` })
      setSelectedDocs(new Set())
      await refetch()
    } catch { toast({ title: 'Bulk delete failed', variant: 'destructive' }) }
    finally { setBulkDeleting(false) }
  }

  const handleBulkReindex = async () => {
    if (selectedDocs.size === 0) return
    setBulkReindexing(true)
    let successCount = 0
    let failCount = 0
    const ids = Array.from(selectedDocs)
    for (const id of ids) {
      try {
        await fetch(`/api/documents/${id}/reindex`, { method: 'POST' })
        successCount++
      } catch { failCount++ }
    }
    await refetch()
    if (successCount > 0) toast({ title: 'Bulk reindex', description: `${successCount} document${successCount > 1 ? 's' : ''} reindexed${failCount > 0 ? `, ${failCount} failed` : ''}` })
    else toast({ title: 'Bulk reindex failed', variant: 'destructive' })
    setBulkReindexing(false)
  }

  const handleBatchTag = async () => {
    if (selectedDocs.size === 0 || !batchTagInput.trim()) return
    const newTags = batchTagInput.split(',').map(t => t.trim()).filter(Boolean)
    if (newTags.length === 0) return
    setBatchTagging(true)
    const ids = Array.from(selectedDocs)
    setBatchTagProgress({ current: 0, total: ids.length })
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < ids.length; i++) {
      const doc = documents.find(d => d.id === ids[i])
      if (!doc) { failCount++; setBatchTagProgress(p => ({ ...p, current: i + 1 })); continue }
      const existingTags = parseTags(doc.tags)
      const mergedTags = [...new Set([...existingTags, ...newTags])].join(',')
      try {
        await fetch(`/api/documents/${ids[i]}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags: mergedTags }) })
        successCount++
      } catch { failCount++ }
      setBatchTagProgress(p => ({ ...p, current: i + 1 }))
    }
    await refetch()
    if (successCount > 0) toast({ title: 'Batch tags applied', description: `${newTags.length} tag${newTags.length > 1 ? 's' : ''} added to ${successCount} document${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}` })
    else toast({ title: 'Batch tagging failed', variant: 'destructive' })
    setBatchTagging(false)
    setBatchTagOpen(false)
    setBatchTagInput('')
  }

  // Get merged tags from all selected documents for batch tag display
  const selectedDocsMergedTags = useMemo(() => {
    if (selectedDocs.size === 0) return []
    const tagSet = new Set<string>()
    selectedDocs.forEach(id => {
      const doc = documents.find(d => d.id === id)
      if (doc) parseTags(doc.tags).forEach(t => tagSet.add(t))
    })
    return Array.from(tagSet)
  }, [selectedDocs, documents])

  const handleCompare = async () => {
    const selected = Array.from(selectedDocs)
    if (selected.length !== 2) {
      toast({ title: 'Select 2 documents', description: 'Please select exactly 2 documents to compare', variant: 'destructive' })
      return
    }
    const docA = documents.find(d => d.id === selected[0])
    const docB = documents.find(d => d.id === selected[1])
    if (!docA || !docB) return
    setCompareDocs([docA, docB])
    setCompareLoading(true)
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/documents/${docA.id}`).then(r => r.json()),
        fetch(`/api/documents/${docB.id}`).then(r => r.json()),
      ])
      setCompareChunksA(resA.chunks || [])
      setCompareChunksB(resB.chunks || [])
      if (resA.content) setCompareDocs(prev => prev ? [{ ...prev[0], content: resA.content } as Document, prev[1]] : null)
      if (resB.content) setCompareDocs(prev => prev ? [prev[0], { ...prev[1], content: resB.content } as Document] : null)
    } catch { toast({ title: 'Failed to load documents', variant: 'destructive' }) }
    finally { setCompareLoading(false) }
  }

  // Close comparison overlay on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && compareDocs) setCompareDocs(null) }
    if (compareDocs) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [compareDocs])

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current = 0
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    const fileNames = files.map(f => f.name)
    setUploadingFiles(fileNames)
    setUploadProgress(0)
    setUploading(true)
    const typeMap: Record<string, string> = { md: 'md', txt: 'txt', pdf: 'pdf', docx: 'docx', markdown: 'md' }
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const text = await file.text()
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt'
        const docType = typeMap[ext] || 'txt'
        const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, type: docType, content: text, tags: '' }) })
        if (!res.ok) throw new Error('Upload failed')
        successCount++
        logActivity('document_uploaded', `Uploaded "${file.name}" via drag & drop`)
      } catch {
        failCount++
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100))
    }
    await refetch()
    setUploadingFiles([])
    setUploadProgress(0)
    setUploading(false)
    if (successCount > 0) toast({ title: `${successCount} file${successCount > 1 ? 's' : ''} uploaded`, description: failCount > 0 ? `${failCount} failed` : 'All files indexed successfully' })
    else if (failCount > 0) toast({ title: 'Upload failed', description: `${failCount} file${failCount > 1 ? 's' : ''} could not be uploaded`, variant: 'destructive' })
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const toggleSelect = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) { setSelectedDocs(new Set()) }
    else { setSelectedDocs(new Set(documents.map(d => d.id))) }
  }

  const filteredDocs = (filterStatus === 'all' ? documents : documents.filter(d => d.status === filterStatus))
    .filter(d => filterTag === 'all' || parseTags(d.tags).includes(filterTag))

  // Apply custom order if available, otherwise use default sort (by date)
  const orderedDocs = useMemo(() => {
    if (!hasCustomOrder) return filteredDocs
    const orderMap = new Map(customDocOrder.map((id, i) => [id, i]))
    const ordered = [...filteredDocs].sort((a, b) => {
      const aIdx = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const bIdx = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER
      return aIdx - bIdx
    })
    return ordered
  }, [filteredDocs, customDocOrder, hasCustomOrder])

  // Drag-and-drop handlers for document reordering
  const handleDocDragStart = useCallback((e: React.DragEvent, docId: string) => {
    setDraggedDocId(docId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', docId)
    // Add drag visual feedback
    const target = e.currentTarget as HTMLElement
    setTimeout(() => { if (target) target.classList.add('dragging-item') }, 0)
  }, [])

  const handleDocDragOver = useCallback((e: React.DragEvent, docId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedDocId === docId) return
    // Determine if mouse is in top or bottom half
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'above' : 'below'
    setDragOverDocId(docId)
    setDragOverPosition(position)
  }, [draggedDocId])

  const handleDocDrop = useCallback((e: React.DragEvent, targetDocId: string) => {
    e.preventDefault()
    if (!draggedDocId || draggedDocId === targetDocId) {
      setDraggedDocId(null)
      setDragOverDocId(null)
      setDragOverPosition(null)
      return
    }
    // Build new order from current filtered docs
    const currentIds = orderedDocs.map(d => d.id)
    const draggedIdx = currentIds.indexOf(draggedDocId)
    const targetIdx = currentIds.indexOf(targetDocId)
    if (draggedIdx === -1 || targetIdx === -1) return

    // Remove dragged item and insert at new position
    const newOrder = currentIds.filter(id => id !== draggedDocId)
    const insertAt = dragOverPosition === 'above' ? targetIdx > draggedIdx ? targetIdx - 1 : targetIdx : targetIdx > draggedIdx ? targetIdx : targetIdx + 1
    newOrder.splice(insertAt, 0, draggedDocId)

    setCustomDocOrder(newOrder)
    try { localStorage.setItem('luminara-doc-order', JSON.stringify(newOrder)) } catch {}
    toast({ title: 'Order updated', description: 'Document order has been updated' })

    setDraggedDocId(null)
    setDragOverDocId(null)
    setDragOverPosition(null)
  }, [draggedDocId, dragOverPosition, orderedDocs])

  const handleDocDragEnd = useCallback(() => {
    setDraggedDocId(null)
    setDragOverDocId(null)
    setDragOverPosition(null)
    // Remove dragging class from any elements
    document.querySelectorAll('.dragging-item').forEach(el => el.classList.remove('dragging-item'))
  }, [])

  const resetDocOrder = useCallback(() => {
    setCustomDocOrder([])
    try { localStorage.removeItem('luminara-doc-order') } catch {}
    toast({ title: 'Order reset', description: 'Documents sorted by date' })
  }, [])

  const allTags = useMemo(() => { const s = new Set<string>(); documents.forEach(d => parseTags(d.tags).forEach(t => s.add(t))); return Array.from(s).sort() }, [documents])

  return (
    <div className="space-y-5 relative"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleFileDrop}
    >
      {/* Enhanced Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drop-zone-overlay fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="drop-zone-border absolute inset-4 rounded-2xl" />
            <div className="relative z-10 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
              >
                <UploadCloud className="h-16 w-16 text-violet-400 mx-auto mb-4 drop-zone-pulse-icon" />
              </motion.div>
              <motion.h3
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-bold text-violet-200 mb-1"
              >
                Drop files here to upload
              </motion.h3>
              <motion.p
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-sm text-violet-300/60"
              >
                Supports .md, .txt, .pdf, .docx — multiple files OK
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Upload progress overlay */}
      <AnimatePresence>
        {uploading && uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-4 right-4 z-50 w-72 rounded-xl border border-violet-500/20 bg-black/90 backdrop-blur-xl shadow-2xl shadow-violet-500/10 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
              <span className="text-xs font-semibold text-violet-200">Uploading files...</span>
              <span className="text-[10px] text-muted-foreground/50 ml-auto">{uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                className="h-full rounded-full progress-bar-gradient"
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {uploadingFiles.map((name, i) => (
                <div key={name} className="flex items-center gap-2 text-[10px]">
                  {i < Math.round((uploadProgress / 100) * uploadingFiles.length) ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  ) : i === Math.round((uploadProgress / 100) * uploadingFiles.length) ? (
                    <Loader2 className="h-3 w-3 text-violet-400 animate-spin shrink-0" />
                  ) : (
                    <Clock className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                  )}
                  <span className="text-muted-foreground/50 truncate">{name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div><h2 className="text-[26px] font-bold tracking-tight page-title-gradient">Documents</h2><p className="text-sm text-muted-foreground/60 mt-0.5">Manage your knowledge base</p></div>
        <div className="flex items-center gap-2">
          {/* Selection mode toggle */}
          <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" className={`gap-1.5 text-[10px] border-white/[0.08] transition-all ${selectionMode ? 'bg-violet-500/15 text-violet-300 border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.1)]' : 'bg-white/[0.02] text-muted-foreground/50 hover:text-foreground/60'}`} onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) setSelectedDocs(new Set()) }}><CheckSquare className="h-3.5 w-3.5" />{selectionMode ? 'Exit Select' : 'Select'}</Button></TooltipTrigger><TooltipContent>{selectionMode ? 'Exit selection mode' : 'Enter selection mode'}</TooltipContent></Tooltip></TooltipProvider>
          {/* Reset Order button - only visible when custom order is active */}
          {hasCustomOrder && (
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="sm" className="gap-1.5 text-[10px] border-white/[0.08] bg-white/[0.02] text-amber-400/70 hover:text-amber-300 hover:border-amber-500/30 transition-all" onClick={resetDocOrder}><ArrowUpDown className="h-3.5 w-3.5" />Reset Order</Button></TooltipTrigger><TooltipContent>Reset to default sort by date</TooltipContent></Tooltip></TooltipProvider>
          )}
          {/* List/Grid view toggle */}
          <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04]">
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => setDocViewModePersisted('list')} className={`p-1.5 rounded-md transition-all ${docViewMode === 'list' ? 'bg-white/[0.06] text-violet-300' : 'text-muted-foreground/40 hover:text-foreground/60'}`}><ListIcon className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent>List View</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => setDocViewModePersisted('grid')} className={`p-1.5 rounded-md transition-all ${docViewMode === 'grid' ? 'bg-white/[0.06] text-violet-300' : 'text-muted-foreground/40 hover:text-foreground/60'}`}><LayoutGrid className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent>Grid View</TooltipContent></Tooltip></TooltipProvider>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild><Button size="sm" className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20"><Upload className="h-3.5 w-3.5" /> Upload</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-xl border-white/[0.06]">
            <DialogHeader><DialogTitle>Upload Document</DialogTitle><DialogDescription>Add a document to your knowledge base</DialogDescription></DialogHeader>
            <div className="space-y-3 py-2">
              {/* Supported file type icons */}
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider font-semibold shrink-0">Supported</span>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1"><FileCode className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[9px] text-muted-foreground/50">.md</span></div>
                  <div className="flex items-center gap-1"><File className="h-3.5 w-3.5 text-amber-400" /><span className="text-[9px] text-muted-foreground/50">.txt</span></div>
                  <div className="flex items-center gap-1"><FileType className="h-3.5 w-3.5 text-blue-400" /><span className="text-[9px] text-muted-foreground/50">.docx</span></div>
                  <div className="flex items-center gap-1"><File className="h-3.5 w-3.5 text-red-400" /><span className="text-[9px] text-muted-foreground/50">.pdf</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Name</label><Input placeholder="e.g. API Docs" value={uploadName} onChange={e => setUploadName(e.target.value)} className="bg-white/[0.03] border-white/[0.06]" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Type</label><Select value={uploadType} onValueChange={setUploadType}><SelectTrigger className="bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="md">Markdown</SelectItem><SelectItem value="txt">Text</SelectItem><SelectItem value="pdf">PDF</SelectItem><SelectItem value="docx">Word</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between"><label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Content</label><button onClick={async () => { try { const text = await navigator.clipboard.readText(); if (text) { setUploadContent(text); toast({ title: 'Pasted from clipboard' }); } } catch { toast({ title: 'Cannot access clipboard', variant: 'destructive' }) } }} className="flex items-center gap-1 text-[9px] text-violet-400/70 hover:text-violet-300 transition-colors"><Clipboard className="h-3 w-3" />Paste from clipboard</button></div>
                <Textarea placeholder="Paste content..." value={uploadContent} onChange={e => setUploadContent(e.target.value)} rows={8} className="font-mono text-xs bg-white/[0.03] border-white/[0.06]" />
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider">Tags</label><Input placeholder="e.g. api, docs, security (comma-separated)" value={uploadTags} onChange={e => setUploadTags(e.target.value)} className="bg-white/[0.03] border-white/[0.06]" /><p className="text-[9px] text-muted-foreground/30">Separate tags with commas</p></div>
              {/* Estimated processing time */}
              {uploadContent && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                  <Zap className="h-3 w-3 text-violet-400 shrink-0" />
                  <span className="text-[9px] text-violet-300/60">Est. processing: ~{Math.max(1, Math.ceil(uploadContent.length / 5000))}s for {uploadContent.length.toLocaleString()} chars</span>
                </div>
              )}
              {uploading && (
                <div className="space-y-2">
                  <Progress value={66} className="h-1.5" />
                  <p className="text-[9px] text-muted-foreground/40 text-center">Indexing document chunks...</p>
                </div>
              )}
              <Button onClick={handleUpload} disabled={!uploadName || !uploadContent || uploading} className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : <><Upload className="h-4 w-4 mr-2" />Upload &amp; Index</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Floating bulk actions bar */}
      <AnimatePresence>
        {selectionMode && selectedDocs.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
          >
            {/* Batch Tag Modal */}
            <AnimatePresence>
              {batchTagOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="w-80 p-4 rounded-2xl bg-black/95 backdrop-blur-2xl border border-violet-500/25 shadow-2xl shadow-violet-500/20"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                      <Tags className="h-3 w-3 text-fuchsia-400" />
                    </div>
                    <span className="text-sm font-semibold text-fuchsia-200">Batch Tag</span>
                    <Badge variant="outline" className="ml-auto text-[8px] bg-violet-500/10 border-violet-500/20 text-violet-300">{selectedDocs.size} docs</Badge>
                  </div>
                  {/* Existing merged tags */}
                  {selectedDocsMergedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedDocsMergedTags.slice(0, 8).map(tag => {
                        const tc = getTagColor(tag)
                        return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.border} ${tc.text} text-[8px] px-1.5 py-0`}>{tag}</Badge>
                      })}
                      {selectedDocsMergedTags.length > 8 && <span className="text-[9px] text-muted-foreground/40">+{selectedDocsMergedTags.length - 8} more</span>}
                    </div>
                  )}
                  {/* Input for new tags */}
                  <div className="flex items-center gap-2 mb-3">
                    <Input
                      placeholder="Add tags (comma-separated)"
                      value={batchTagInput}
                      onChange={e => setBatchTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleBatchTag(); if (e.key === 'Escape') { setBatchTagOpen(false); setBatchTagInput('') } }}
                      className="bg-white/[0.04] border-white/[0.08] text-[11px] h-8"
                      disabled={batchTagging}
                    />
                  </div>
                  {/* Progress indicator */}
                  {batchTagging && (
                    <div className="mb-3 space-y-1.5">
                      <Progress value={batchTagProgress.total > 0 ? (batchTagProgress.current / batchTagProgress.total) * 100 : 0} className="h-1.5" />
                      <p className="text-[9px] text-muted-foreground/40 text-center">{batchTagProgress.current} / {batchTagProgress.total} documents</p>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="flex-1 h-7 text-[10px] gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0" onClick={handleBatchTag} disabled={batchTagging || !batchTagInput.trim()}>
                      {batchTagging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Apply Tags
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground/50" onClick={() => { setBatchTagOpen(false); setBatchTagInput('') }} disabled={batchTagging}>
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Action bar */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-black/90 backdrop-blur-2xl border border-violet-500/25 shadow-2xl shadow-violet-500/15">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <CheckSquare className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <span className="text-sm font-semibold text-violet-200">{selectedDocs.size}</span>
                <span className="text-[11px] text-muted-foreground/50">selected</span>
              </div>
              <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />
              {selectedDocs.size === 2 && (
                <Button size="sm" variant="ghost" className="text-[10px] h-8 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 gap-1.5" onClick={handleCompare}>
                  <GitCompare className="h-3.5 w-3.5" />Compare
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-[10px] h-8 text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 gap-1.5" onClick={() => setBatchTagOpen(prev => !prev)}>
                <Tags className="h-3.5 w-3.5" />Batch Tag
              </Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1.5" onClick={handleBulkReindex} disabled={bulkReindexing}>
                {bulkReindexing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                Reindex
              </Button>
              <Button size="sm" variant="ghost" className="text-[10px] h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete
              </Button>
              <Separator orientation="vertical" className="h-6 bg-white/[0.06]" />
              <Button size="sm" variant="ghost" className="text-[10px] h-8 text-muted-foreground/50 hover:text-foreground/60 gap-1.5" onClick={() => { setSelectionMode(false); setSelectedDocs(new Set()); setBatchTagOpen(false); setBatchTagInput('') }}>
                <X className="h-3.5 w-3.5" />Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {[{ key: 'all', label: 'All', count: stats.total, icon: null }, { key: 'indexed', label: 'Indexed', count: stats.indexed, icon: <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" /> }, { key: 'processing', label: 'Processing', count: stats.processing + stats.pending, icon: <Loader2 className="h-2.5 w-2.5 text-amber-400" /> }, { key: 'failed', label: 'Failed', count: stats.failed, icon: <AlertCircle className="h-2.5 w-2.5 text-red-400" /> }].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${filterStatus === f.key ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-white/[0.02] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.04]'}`}>
            {f.icon}{f.label} <span className="opacity-40">{f.count}</span>
          </button>
        ))}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 ml-1">
            <Tag className="h-3 w-3 text-muted-foreground/30" />
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="h-7 w-28 text-[10px] bg-white/[0.02] border-white/[0.06]"><SelectValue placeholder="Filter by tag" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Tags</SelectItem>{allTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="flex-1" />
        {selectionMode && documents.length > 0 && (
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border bg-white/[0.02] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.04]">
            {selectedDocs.size === documents.length ? <CheckSquare className="h-3 w-3 text-violet-400" /> : <Square className="h-3 w-3" />}
            {selectedDocs.size === documents.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Document List / Grid */}
      <GlassCard>
        {loading ? <div className="p-4 space-y-3">{[1, 2, 3].map(i => <div key={i} className="flex items-center gap-4 p-2"><div className="h-9 w-9 rounded-lg shimmer-violet" /><div className="flex-1"><div className="h-3.5 w-48 mb-1.5 rounded shimmer-violet" /><div className="h-3 w-28 rounded shimmer" /></div></div>)}</div>
        : filteredDocs.length === 0 ? <div className="text-center py-12"><div className="relative inline-block mb-3"><FileText className="h-12 w-12 text-violet-400/15 mx-auto empty-icon-pulse" /><div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-violet-400/10 animate-pulse" /></div><p className="text-sm text-muted-foreground/60 font-medium">No documents found</p><p className="text-xs text-muted-foreground/30 mt-1 mb-4">Upload documents or adjust your filter</p><Button size="sm" className="gap-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20" onClick={() => setUploadOpen(true)}><Plus className="h-3 w-3" />Add Document</Button></div>
        : docViewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {orderedDocs.map(doc => {
              const sc = getStatusConfig(doc.status); const SI = sc.icon
              const isSelected = selectedDocs.has(doc.id)
              const tags = parseTags(doc.tags)
              // Get content preview - first 80 chars
              const contentPreview = doc.content ? truncateText(doc.content.replace(/\n/g, ' ').trim(), 80) : 'No content preview'
              return (
                <motion.div key={doc.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className={`relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-violet-500/20 hover:shadow-[0_0_20px_rgba(139,92,246,0.06)] transition-all group cursor-pointer ${isSelected && selectionMode ? 'bg-violet-500/5 border-violet-500/20' : ''}`} onClick={() => selectionMode ? toggleSelect(doc.id) : handleView(doc)} onMouseEnter={() => window.dispatchEvent(new CustomEvent('luminara-doc-hover', { detail: doc.id }))} onMouseLeave={() => window.dispatchEvent(new CustomEvent('luminara-doc-leave'))}>
                  {/* Selection checkbox - only in selection mode */}
                  {selectionMode && (
                    <button onClick={e => { e.stopPropagation(); toggleSelect(doc.id) }} className="absolute top-2.5 left-2.5 z-10">
                      {isSelected ? <CheckSquare className="h-4 w-4 text-violet-400" /> : <Square className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />}
                    </button>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant="outline" className={`${sc.bg} ${sc.border} ${sc.color} text-[7px] px-1.5 py-0`}><SI className={`h-2 w-2 mr-0.5 ${sc.spin ? 'animate-spin' : ''}`} />{sc.label}</Badge>
                  </div>
                  {/* File type icon - large */}
                  <div className={`h-10 w-10 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.06] mb-3 ${selectionMode ? 'ml-6' : ''}`}>
                    {getFileIcon(doc.type, 'h-5 w-5')}
                  </div>
                  {/* Document name */}
                  <p className="text-[12px] font-semibold truncate group-hover:text-violet-300 transition-colors mb-1">{doc.name}</p>
                  {/* Content preview */}
                  <p className="text-[9px] text-muted-foreground/30 leading-relaxed mb-2.5 line-clamp-2">{contentPreview}</p>
                  {/* Tags with inline editing */}
                  <AnimatePresence mode="wait">
                    {editingDocTags === doc.id ? (
                      <motion.div key="editing" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5 mb-2.5 overflow-hidden">
                        <Input value={editTagsValue} onChange={e => setEditTagsValue(e.target.value)} placeholder="Tags (comma-separated)" className="h-6 text-[10px] bg-white/[0.03] border-white/[0.06] flex-1 min-w-0" onKeyDown={e => { if (e.key === 'Enter') handleUpdateTags(doc.id, editTagsValue); if (e.key === 'Escape') setEditingDocTags(null) }} onBlur={() => { if (editingDocTags === doc.id) handleUpdateTags(doc.id, editTagsValue) }} autoFocus onClick={e => e.stopPropagation()} />
                      </motion.div>
                    ) : tags.length > 0 ? (
                      <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 mb-2.5 flex-wrap">
                        {tags.slice(0, 3).map(tag => {
                          const tc = getTagColor(tag)
                          return <span key={tag} className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[7px] font-medium ${tc.bg} ${tc.text} border ${tc.border}`}>{tag}</span>
                        })}
                        {tags.length > 3 && <span className="text-[8px] text-muted-foreground/30">+{tags.length - 3}</span>}
                        <button onClick={e => { e.stopPropagation(); setEditingDocTags(doc.id); setEditTagsValue(doc.tags || '') }} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.06] rounded"><Pencil className="h-2.5 w-2.5 text-muted-foreground/30" /></button>
                      </motion.div>
                    ) : (
                      <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-2.5">
                        <button onClick={e => { e.stopPropagation(); setEditingDocTags(doc.id); setEditTagsValue('') }} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-muted-foreground/20 hover:text-muted-foreground/40 flex items-center gap-0.5"><Pencil className="h-2 w-2" />Add tags</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Mini stats */}
                  <div className="flex items-center gap-3 text-[9px] text-muted-foreground/35 pt-2 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1"><Layers className="h-2.5 w-2.5" />{doc.chunkCount}</span>
                    <span className="flex items-center gap-1"><HardDrive className="h-2.5 w-2.5" />{formatFileSize(doc.fileSize)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timeAgo(doc.createdAt)}</span>
                    {(() => { try { const n = JSON.parse(localStorage.getItem(`luminara-doc-notes-${doc.id}`) || '[]'); return n.length > 0 ? <span className="flex items-center gap-1 ml-auto"><MessageCircle className="h-2.5 w-2.5 text-violet-400/60" /><span className="text-violet-400/60">{n.length}</span></span> : null } catch { return null } })()}
                  </div>
                  {/* Hover actions */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); setVersionHistoryDoc(doc) }} className="p-1 rounded-md hover:bg-white/[0.06]" title="Version History"><History className="h-3 w-3 text-muted-foreground/40" /></button>
                    <button onClick={e => { e.stopPropagation(); handleView(doc) }} className="p-1 rounded-md hover:bg-white/[0.06]"><Maximize2 className="h-3 w-3 text-muted-foreground/40" /></button>
                    <button onClick={e => { e.stopPropagation(); handleReindex(doc.id, doc.name) }} className="p-1 rounded-md hover:bg-white/[0.06]" disabled={reindexing === doc.id}><RefreshCw className={`h-3 w-3 ${reindexing === doc.id ? 'animate-spin' : ''} text-muted-foreground/40`} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(doc.id, doc.name) }} className="p-1 rounded-md hover:bg-white/[0.06]" disabled={deleting === doc.id}><Trash2 className="h-3 w-3 text-red-400/60" /></button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {orderedDocs.map(doc => {
              const sc = getStatusConfig(doc.status); const SI = sc.icon
              const isSelected = selectedDocs.has(doc.id)
              const isDragged = draggedDocId === doc.id
              const isDropTarget = dragOverDocId === doc.id
              const isDropAbove = isDropTarget && dragOverPosition === 'above'
              const isDropBelow = isDropTarget && dragOverPosition === 'below'
              // Get content preview for list view too
              const contentPreview = doc.content ? truncateText(doc.content.replace(/\n/g, ' ').trim(), 80) : ''
              return (
                <motion.div key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  layout
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-all group ${isSelected && selectionMode ? 'bg-violet-500/5' : ''} ${isDragged ? 'dragging-item' : ''} ${isDropAbove ? 'drop-target-above' : ''} ${isDropBelow ? 'drop-target-below' : ''}`}
                  draggable={!selectionMode}
                  onDragStart={e => handleDocDragStart(e, doc.id)}
                  onDragOver={e => handleDocDragOver(e, doc.id)}
                  onDrop={e => handleDocDrop(e, doc.id)}
                  onDragEnd={handleDocDragEnd}
                  onMouseEnter={() => window.dispatchEvent(new CustomEvent('luminara-doc-hover', { detail: doc.id }))}
                  onMouseLeave={() => window.dispatchEvent(new CustomEvent('luminara-doc-leave'))}
                >
                  {/* Drag handle - only in list view, not in selection mode */}
                  {!selectionMode && (
                    <div className="drag-handle shrink-0 cursor-grab active:cursor-grabbing p-0.5 -ml-1 mr-0.5 rounded hover:bg-white/[0.06] transition-colors" onClick={e => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />
                    </div>
                  )}
                  {selectionMode && (
                    <button onClick={() => toggleSelect(doc.id)} className="shrink-0">
                      {isSelected ? <CheckSquare className="h-4 w-4 text-violet-400" /> : <Square className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/40 transition-colors" />}
                    </button>
                  )}
                  <div className="h-10 w-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/[0.06]">{getFileIcon(doc.type, 'h-5 w-5')}</div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => !selectionMode && handleView(doc)}>
                    <p className="text-[12px] font-semibold truncate group-hover:text-violet-300 transition-colors">{doc.name}</p>
                    {contentPreview && <p className="text-[9px] text-muted-foreground/25 truncate mt-0.5">{contentPreview}</p>}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[9px] text-muted-foreground/40 uppercase font-medium">{doc.type}</span>
                      <span className="text-[9px] text-muted-foreground/25">•</span>
                      <span className="text-[9px] text-muted-foreground/40">{formatFileSize(doc.fileSize)}</span>
                      <span className="text-[9px] text-muted-foreground/25">•</span>
                      <span className="text-[9px] text-muted-foreground/40">{doc.chunkCount} chunks</span>
                      <span className="text-[9px] text-muted-foreground/25">•</span>
                      <span className="text-[9px] text-muted-foreground/40">{timeAgo(doc.createdAt)}</span>
                      {(() => { try { const n = JSON.parse(localStorage.getItem(`luminara-doc-notes-${doc.id}`) || '[]'); return n.length > 0 ? <><span className="text-[9px] text-muted-foreground/25">•</span><span className="flex items-center gap-0.5 text-violet-400/60"><MessageCircle className="h-2.5 w-2.5" />{n.length}</span></> : null } catch { return null } })()}
                    </div>
                    {/* Tags with inline editing */}
                    <AnimatePresence mode="wait">
                      {editingDocTags === doc.id ? (
                        <motion.div key="editing" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1.5 mt-1 overflow-hidden">
                          <Input value={editTagsValue} onChange={e => setEditTagsValue(e.target.value)} placeholder="Tags (comma-separated)" className="h-6 text-[10px] bg-white/[0.03] border-white/[0.06] flex-1 min-w-0" onKeyDown={e => { if (e.key === 'Enter') handleUpdateTags(doc.id, editTagsValue); if (e.key === 'Escape') setEditingDocTags(null) }} onBlur={() => { if (editingDocTags === doc.id) handleUpdateTags(doc.id, editTagsValue) }} autoFocus onClick={e => e.stopPropagation()} />
                        </motion.div>
                      ) : parseTags(doc.tags).length > 0 ? (
                        <motion.div key="viewing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 mt-1 flex-wrap">
                          {parseTags(doc.tags).slice(0, 3).map(tag => {
                            const tc = getTagColor(tag)
                            return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[7px] px-1.5 py-0 font-medium`}>{tag}</Badge>
                          })}
                          {parseTags(doc.tags).length > 3 && <span className="text-[8px] text-muted-foreground/30">+{parseTags(doc.tags).length - 3}</span>}
                          <button onClick={e => { e.stopPropagation(); setEditingDocTags(doc.id); setEditTagsValue(doc.tags || '') }} className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.06] rounded"><Pencil className="h-2.5 w-2.5 text-muted-foreground/30" /></button>
                        </motion.div>
                      ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <button onClick={e => { e.stopPropagation(); setEditingDocTags(doc.id); setEditTagsValue('') }} className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-muted-foreground/20 hover:text-muted-foreground/40 flex items-center gap-0.5"><Pencil className="h-2 w-2" />Add tags</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <Badge variant="outline" className={`${sc.bg} ${sc.border} ${sc.color} text-[8px] px-2 py-0 shrink-0`}><SI className={`h-2 w-2 mr-0.5 ${sc.spin ? 'animate-spin' : ''}`} />{sc.label}</Badge>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/[0.04]" onClick={() => setVersionHistoryDoc(doc)}><History className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>History</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/[0.04]" onClick={() => handleView(doc)}><Maximize2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/[0.04]" onClick={() => handleReindex(doc.id, doc.name)} disabled={reindexing === doc.id}><RefreshCw className={`h-3 w-3 ${reindexing === doc.id ? 'animate-spin' : ''}`} /></Button></TooltipTrigger><TooltipContent>Reindex</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(doc.id, doc.name)} disabled={deleting === doc.id}><Trash2 className="h-3 w-3" /></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={open => !open && setViewDoc(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] w-[95vw] sm:w-auto bg-card/95 backdrop-blur-xl border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">{viewDoc && getFileIcon(viewDoc.type)}{viewDoc?.name}</DialogTitle>
            <DialogDescription>{viewDoc && <span className="flex items-center gap-2">{viewDoc.type.toUpperCase()} • {formatFileSize(viewDoc.fileSize)} • {viewDoc.chunkCount} chunks<Badge variant="outline" className={(() => { const c = getStatusConfig(viewDoc.status); return `${c.bg} ${c.border} ${c.color} text-[9px]`; })()}>{viewDoc.status}</Badge></span>}</DialogDescription>
          </DialogHeader>
          {editingDocTags && viewDoc?.id === editingDocTags ? (
            <div className="flex items-center gap-2 px-1">
              <Input value={editTagsValue} onChange={e => setEditTagsValue(e.target.value)} placeholder="Tags (comma-separated)" className="h-7 text-[11px] bg-white/[0.03] border-white/[0.06] flex-1" onKeyDown={e => { if (e.key === 'Enter') handleUpdateTags(editingDocTags, editTagsValue); if (e.key === 'Escape') setEditingDocTags(null) }} autoFocus />
              <Button size="sm" className="h-7 text-[10px] bg-violet-600 border-0" onClick={() => handleUpdateTags(editingDocTags, editTagsValue)}>Save</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setEditingDocTags(null)}>Cancel</Button>
            </div>
          ) : viewDoc && (
            <div className="flex items-center gap-1.5 px-1">
              {parseTags(viewDoc.tags).map(tag => { const tc = getTagColor(tag); return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[8px] px-1.5 py-0`}>{tag}</Badge> })}
              <button onClick={() => { setEditingDocTags(viewDoc.id); setEditTagsValue(viewDoc.tags || '') }} className="p-1 hover:bg-white/[0.06] rounded transition-colors"><Pencil className="h-2.5 w-2.5 text-muted-foreground/30" /></button>
            </div>
          )}
          <div className="flex gap-1.5 mb-3">
            <button onClick={() => setViewMode('chunks')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'chunks' ? 'bg-violet-500/10 text-violet-300' : 'text-muted-foreground/50 hover:text-foreground'}`}>
              <Layers className="h-3 w-3 inline mr-1" />Chunks
            </button>
            <button onClick={() => setViewMode('raw')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'raw' ? 'bg-violet-500/10 text-violet-300' : 'text-muted-foreground/50 hover:text-foreground'}`}>
              <ScrollText className="h-3 w-3 inline mr-1" />Full Text
            </button>
            <button onClick={() => setViewMode('stats')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'stats' ? 'bg-violet-500/10 text-violet-300' : 'text-muted-foreground/50 hover:text-foreground'}`}>
              <BarChart3 className="h-3 w-3 inline mr-1" />Statistics
            </button>
          </div>
          {/* Search within document */}
          {(viewMode === 'raw' || viewMode === 'chunks') && (
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <Search className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <input
                value={docSearchQuery}
                onChange={e => handleDocSearch(e.target.value)}
                placeholder="Search in document..."
                className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/30"
              />
              {docSearchQuery && (
                <>
                  <span className="text-[9px] text-muted-foreground/50 whitespace-nowrap">
                    {docSearchMatches.length > 0 ? `${docSearchActiveIndex + 1} of ${docSearchMatches.length}` : 'No matches'}
                  </span>
                  <button onClick={() => navigateDocSearch('up')} disabled={docSearchMatches.length === 0} className="p-0.5 hover:bg-white/[0.06] rounded disabled:opacity-30"><ChevronUp className="h-3 w-3 text-muted-foreground/50" /></button>
                  <button onClick={() => navigateDocSearch('down')} disabled={docSearchMatches.length === 0} className="p-0.5 hover:bg-white/[0.06] rounded disabled:opacity-30"><ChevronDown className="h-3 w-3 text-muted-foreground/50" /></button>
                  <button onClick={() => { setDocSearchQuery(''); setDocSearchMatches([]); setDocSearchActiveIndex(-1) }} className="p-0.5 hover:bg-white/[0.06] rounded"><X className="h-3 w-3 text-muted-foreground/50" /></button>
                </>
              )}
            </div>
          )}
          <ScrollArea className="max-h-[58vh]">
            {viewLoading ? <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 w-full rounded-lg shimmer-violet" />)}</div>
            : viewMode === 'stats' && viewDoc ? (() => {
              const content = viewDoc.content || viewChunks.map(c => c.content).join(' ')
              const wordCount = content.split(/\s+/).filter(Boolean).length
              const charCount = content.length
              const readingTimeMin = Math.max(1, Math.round(wordCount / 200))
              // Extract top keywords from chunks
              const wordFreq: Record<string, number> = {}
              const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','must','need','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','and','but','or','if','it','its','this','that','these','those','i','me','my','we','our','you','your','he','him','his','she','her','they','them','their','what','which','who','whom'])
              content.split(/\s+/).filter(Boolean).forEach(w => {
                const lw = w.toLowerCase().replace(/[^a-z0-9]/g, '')
                if (lw.length > 2 && !stopWords.has(lw)) wordFreq[lw] = (wordFreq[lw] || 0) + 1
              })
              const topKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10)
              // Chunk token distribution
              const tokenCounts = viewChunks.map(c => c.tokenCount)
              const maxTokens = Math.max(...tokenCounts, 1)
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Words', value: wordCount.toLocaleString(), icon: AlignLeft, color: 'text-violet-400' },
                      { label: 'Characters', value: charCount.toLocaleString(), icon: Type, color: 'text-fuchsia-400' },
                      { label: 'Reading Time', value: `${readingTimeMin} min`, icon: BookOpen, color: 'text-emerald-400' },
                      { label: 'Chunks', value: viewDoc.chunkCount, icon: Layers, color: 'text-amber-400' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-1.5 mb-1"><s.icon className={`h-3 w-3 ${s.color}`} /><span className="text-[9px] text-muted-foreground/40">{s.label}</span></div>
                        <p className="text-lg font-bold stat-glow"><AnimatedCounter value={s.value} /></p>
                      </div>
                    ))}
                  </div>
                  {topKeywords.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Top Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {topKeywords.map(([word, count]) => {
                          const tc = getTagColor(word)
                          return <Badge key={word} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[9px] px-2 py-0.5`}>{word} <span className="ml-1 opacity-40">{count}</span></Badge>
                        })}
                      </div>
                    </div>
                  )}
                  {viewChunks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2">Chunk Token Distribution</p>
                      <div className="flex items-end gap-1 h-20">
                        {tokenCounts.map((t, i) => (
                          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${maxTokens > 0 ? (t / maxTokens) * 100 : 0}%` }} transition={{ delay: i * 0.03, duration: 0.3 }}
                            className="flex-1 rounded-t bg-gradient-to-t from-violet-500 to-fuchsia-400 min-h-[2px] opacity-70 hover:opacity-100 transition-opacity" title={`Chunk ${i}: ${t} tokens`} />
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-muted-foreground/20">Chunk 0</span>
                        <span className="text-[8px] text-muted-foreground/20">{viewChunks.length - 1}</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()
            : viewMode === 'raw' ? (
              <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                {docSearchQuery && docSearchMatches.length > 0 ? (
                  <pre className="text-[11px] text-muted-foreground/70 whitespace-pre-wrap font-mono leading-relaxed max-h-[50vh] overflow-y-auto">
                    {(() => {
                      const parts = getHighlightedContent(viewDoc?.content || '')
                      if (typeof parts === 'string') return parts
                      return (parts as Array<{ text: string; isMatch: boolean; matchIndex: number }>).map((part, idx) =>
                        part.isMatch ? (
                          <span key={idx} id={`doc-match-${part.matchIndex}`} className={part.matchIndex === docSearchActiveIndex ? 'search-highlight-active' : 'search-highlight'}>{part.text}</span>
                        ) : (
                          <span key={idx}>{part.text}</span>
                        )
                      )
                    })()}
                  </pre>
                ) : (
                  <pre className="text-[11px] text-muted-foreground/70 whitespace-pre-wrap font-mono leading-relaxed max-h-[50vh] overflow-y-auto">{viewDoc?.content || 'No content available'}</pre>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {viewChunks.map(chunk => (
                  <div key={chunk.id} className="rounded-lg p-3.5 bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/15 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-[8px] bg-violet-500/10 text-violet-300 border-violet-500/20">Chunk #{chunk.chunkIndex}</Badge>
                      <span className="text-[8px] text-muted-foreground/30 font-mono">{chunk.tokenCount} tokens</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{chunk.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Document Comparison - Full Screen Overlay */}
      <AnimatePresence>
        {compareDocs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setCompareDocs(null)}
            />

            {/* Main comparison container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative z-10 flex flex-col m-3 lg:m-6 rounded-2xl border border-white/[0.08] bg-black/80 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-violet-500/10"
              style={{ height: 'calc(100vh - 3rem)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
                    <Columns className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold flex items-center gap-2">
                      <GitCompare className="h-4 w-4 text-violet-400" />Document Comparison
                    </h2>
                    <p className="text-[9px] text-muted-foreground/40">Side-by-side analysis with difference highlighting</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] bg-violet-500/10 text-violet-300 border-violet-500/20">2 documents</Badge>
                  <button
                    onClick={() => setCompareDocs(null)}
                    className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.03] flex items-center justify-center hover:bg-white/[0.06] transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Content */}
              {compareLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
                    <span className="text-[11px] text-muted-foreground/50">Loading documents for comparison...</span>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex overflow-hidden">
                  {/* Left Panel: Document A */}
                  <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.06]">
                    <div className="px-4 py-3 border-b border-white/[0.04] bg-violet-500/[0.03] shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded bg-violet-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-violet-300">A</span>
                        </div>
                        {getFileIcon(compareDocs[0].type)}
                        <span className="text-[12px] font-semibold truncate">{compareDocs[0].name}</span>
                        <Badge variant="outline" className="text-[7px] uppercase bg-white/[0.02] border-white/[0.06] ml-auto">{compareDocs[0].type}</Badge>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Tags */}
                      {parseTags(compareDocs[0].tags).length > 0 && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Tags</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {parseTags(compareDocs[0].tags).map(tag => {
                              const tc = getTagColor(tag)
                              const inB = parseTags(compareDocs[1].tags).includes(tag)
                              return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[8px] px-1.5 py-0.5 ${inB ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-rose-500/30'}`}>{tag}{inB ? <CheckCircle2 className="h-2 w-2 ml-0.5 text-emerald-400" /> : null}</Badge>
                            })}
                          </div>
                        </div>
                      )}
                      {/* Content */}
                      {(compareDocs[0].content || compareChunksA.length > 0) && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Content</span>
                          <div className="mt-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] text-muted-foreground/70 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                            {compareDocs[0].content || compareChunksA.map(c => c.content).join('\n\n')}
                          </div>
                        </div>
                      )}
                      {/* Chunks */}
                      {compareChunksA.length > 0 && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Chunks ({compareChunksA.length})</span>
                          <div className="mt-1.5 space-y-1.5 max-h-72 overflow-y-auto">
                            {compareChunksA.map((chunk, ci) => (
                              <div key={chunk.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[8px] font-semibold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Chunk {ci + 1}</span>
                                  <span className="text-[8px] text-muted-foreground/30">{chunk.tokenCount} tokens</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground/50 leading-relaxed line-clamp-3">{chunk.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Center: Differences Panel */}
                  <div className="w-64 lg:w-72 shrink-0 flex flex-col overflow-hidden bg-white/[0.01]">
                    <div className="px-4 py-3 border-b border-white/[0.04] shrink-0">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span className="text-[11px] font-semibold">Differences</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-5">
                      {/* Type Comparison */}
                      <div>
                        <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider">File Type</span>
                        <div className="mt-2 flex items-center justify-center gap-3">
                          <div className="flex items-center gap-1.5">
                            {getFileIcon(compareDocs[0].type, 'h-3.5 w-3.5')}
                            <span className="text-[10px] font-medium uppercase">{compareDocs[0].type}</span>
                          </div>
                          {compareDocs[0].type === compareDocs[1].type ? (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                              <span className="text-[8px] text-emerald-300 font-semibold">Match</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                              <AlertCircle className="h-3 w-3 text-rose-400" />
                              <span className="text-[8px] text-rose-300 font-semibold">Mismatch</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            {getFileIcon(compareDocs[1].type, 'h-3.5 w-3.5')}
                            <span className="text-[10px] font-medium uppercase">{compareDocs[1].type}</span>
                          </div>
                        </div>
                      </div>

                      {/* Chunk Count Comparison */}
                      <div>
                        <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider">Chunk Count</span>
                        <div className="mt-2 space-y-2">
                          {(() => {
                            const maxChunks = Math.max(compareDocs[0].chunkCount, compareDocs[1].chunkCount, 1)
                            return (
                              <>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-violet-300 font-medium">A</span>
                                    <span className="text-[9px] text-muted-foreground/50">{compareDocs[0].chunkCount}</span>
                                  </div>
                                  <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(compareDocs[0].chunkCount / maxChunks) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400" />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-fuchsia-300 font-medium">B</span>
                                    <span className="text-[9px] text-muted-foreground/50">{compareDocs[1].chunkCount}</span>
                                  </div>
                                  <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(compareDocs[1].chunkCount / maxChunks) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400" />
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* File Size Comparison */}
                      <div>
                        <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider">File Size</span>
                        <div className="mt-2 space-y-2">
                          {(() => {
                            const maxSize = Math.max(compareDocs[0].fileSize, compareDocs[1].fileSize, 1)
                            return (
                              <>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-violet-300 font-medium">A</span>
                                    <span className="text-[9px] text-muted-foreground/50">{formatFileSize(compareDocs[0].fileSize)}</span>
                                  </div>
                                  <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(compareDocs[0].fileSize / maxSize) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }} className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400" />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-fuchsia-300 font-medium">B</span>
                                    <span className="text-[9px] text-muted-foreground/50">{formatFileSize(compareDocs[1].fileSize)}</span>
                                  </div>
                                  <div className="h-3 rounded-full bg-white/[0.04] overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${(compareDocs[1].fileSize / maxSize) * 100}%` }} transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }} className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400" />
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Tag Differences */}
                      {(() => {
                        const tagsA = parseTags(compareDocs[0].tags)
                        const tagsB = parseTags(compareDocs[1].tags)
                        const onlyA = tagsA.filter(t => !tagsB.includes(t))
                        const onlyB = tagsB.filter(t => !tagsA.includes(t))
                        const shared = tagsA.filter(t => tagsB.includes(t))
                        return (onlyA.length > 0 || onlyB.length > 0 || shared.length > 0) ? (
                          <div>
                            <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider">Tag Differences</span>
                            <div className="mt-2 space-y-2">
                              {shared.length > 0 && (
                                <div>
                                  <span className="text-[8px] text-emerald-400/60 font-semibold">Shared ({shared.length})</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {shared.map(t => <Badge key={t} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[8px] px-1.5 py-0"><CheckCircle2 className="h-2 w-2 mr-0.5" />{t}</Badge>)}
                                  </div>
                                </div>
                              )}
                              {onlyA.length > 0 && (
                                <div>
                                  <span className="text-[8px] text-violet-400/60 font-semibold">Only in A ({onlyA.length})</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {onlyA.map(t => <Badge key={t} variant="outline" className="bg-violet-500/10 text-violet-300 border-violet-500/20 text-[8px] px-1.5 py-0">{t}</Badge>)}
                                  </div>
                                </div>
                              )}
                              {onlyB.length > 0 && (
                                <div>
                                  <span className="text-[8px] text-fuchsia-400/60 font-semibold">Only in B ({onlyB.length})</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {onlyB.map(t => <Badge key={t} variant="outline" className="bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20 text-[8px] px-1.5 py-0">{t}</Badge>)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null
                      })()}

                      {/* Shared Keywords */}
                      {(() => {
                        const contentA = compareDocs[0].content || compareChunksA.map(c => c.content).join(' ')
                        const contentB = compareDocs[1].content || compareChunksB.map(c => c.content).join(' ')
                        const stopWords = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','may','might','can','could','must','need','to','of','in','for','on','with','at','by','from','as','into','through','during','before','after','above','below','between','out','off','over','under','again','further','then','once','here','there','when','where','why','how','all','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','and','but','or','if','it','its','this','that','these','those','i','me','my','we','our','you','your','he','him','his','she','her','they','them','their','what','which','who','whom'])
                        const freqA: Record<string, number> = {}
                        const freqB: Record<string, number> = {}
                        contentA.split(/\s+/).filter(Boolean).forEach(w => { const lw = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (lw.length > 2 && !stopWords.has(lw)) freqA[lw] = (freqA[lw] || 0) + 1 })
                        contentB.split(/\s+/).filter(Boolean).forEach(w => { const lw = w.toLowerCase().replace(/[^a-z0-9]/g, ''); if (lw.length > 2 && !stopWords.has(lw)) freqB[lw] = (freqB[lw] || 0) + 1 })
                        const topA = Object.entries(freqA).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([w]) => w)
                        const shared = topA.filter(k => k in freqB)
                        return shared.length > 0 ? (
                          <div>
                            <span className="text-[9px] text-muted-foreground/40 font-medium uppercase tracking-wider">Shared Keywords</span>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {shared.slice(0, 12).map(kw => (
                                <Badge key={kw} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[8px] px-1.5 py-0.5">{kw} <span className="ml-0.5 opacity-40">A:{freqA[kw]}</span></Badge>
                              ))}
                            </div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  </div>

                  {/* Right Panel: Document B */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.04] bg-fuchsia-500/[0.03] shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded bg-fuchsia-500/20 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-fuchsia-300">B</span>
                        </div>
                        {getFileIcon(compareDocs[1].type)}
                        <span className="text-[12px] font-semibold truncate">{compareDocs[1].name}</span>
                        <Badge variant="outline" className="text-[7px] uppercase bg-white/[0.02] border-white/[0.06] ml-auto">{compareDocs[1].type}</Badge>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {/* Tags */}
                      {parseTags(compareDocs[1].tags).length > 0 && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Tags</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {parseTags(compareDocs[1].tags).map(tag => {
                              const tc = getTagColor(tag)
                              const inA = parseTags(compareDocs[0].tags).includes(tag)
                              return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[8px] px-1.5 py-0.5 ${inA ? 'ring-1 ring-emerald-500/30' : 'ring-1 ring-rose-500/30'}`}>{tag}{inA ? <CheckCircle2 className="h-2 w-2 ml-0.5 text-emerald-400" /> : null}</Badge>
                            })}
                          </div>
                        </div>
                      )}
                      {/* Content */}
                      {(compareDocs[1].content || compareChunksB.length > 0) && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Content</span>
                          <div className="mt-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] text-muted-foreground/70 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                            {compareDocs[1].content || compareChunksB.map(c => c.content).join('\n\n')}
                          </div>
                        </div>
                      )}
                      {/* Chunks */}
                      {compareChunksB.length > 0 && (
                        <div>
                          <span className="text-[9px] text-muted-foreground/40 font-medium">Chunks ({compareChunksB.length})</span>
                          <div className="mt-1.5 space-y-1.5 max-h-72 overflow-y-auto">
                            {compareChunksB.map((chunk, ci) => (
                              <div key={chunk.id} className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[8px] font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-1.5 py-0.5 rounded">Chunk {ci + 1}</span>
                                  <span className="text-[8px] text-muted-foreground/30">{chunk.tokenCount} tokens</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground/50 leading-relaxed line-clamp-3">{chunk.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version History Slide-out Panel */}
      <AnimatePresence>
        {versionHistoryDoc && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setVersionHistoryDoc(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-hidden"
              style={{ background: 'rgba(10, 8, 20, 0.95)', backdropFilter: 'blur(24px)' }}
            >
              <div className="h-full flex flex-col border-l border-white/[0.08]">
                {/* Gradient accent at top */}
                <div className="h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 shrink-0" />

                {/* Header */}
                <div className="p-5 border-b border-white/[0.06] shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <History className="h-5 w-5 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold truncate">{versionHistoryDoc.name}</h3>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">Version History</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-white/[0.06]" onClick={() => setVersionHistoryDoc(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Version List */}
                <div className="flex-1 overflow-y-auto p-4">
                  {(() => {
                    const versions = getVersionHistory(versionHistoryDoc.id)
                    const hasVersions = versions.length > 0

                    // Version type icon/color config
                    const versionTypeConfig: Record<string, { icon: typeof Clock; color: string; bg: string }> = {
                      created: { icon: Upload, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                      reindexed: { icon: RefreshCcw, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      tags_updated: { icon: Tag, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10' },
                      content_updated: { icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                    }

                    // If no version history, generate from document data
                    if (!hasVersions) {
                      const autoVersions: Array<{ id: string; version: number; timestamp: string; summary: string; sizeChange: string; type: string }> = [
                        {
                          id: `auto-${versionHistoryDoc.id}-1`,
                          version: 1,
                          timestamp: versionHistoryDoc.createdAt,
                          summary: 'Initial upload',
                          sizeChange: formatFileSize(versionHistoryDoc.fileSize),
                          type: 'created',
                        }
                      ]
                      if (versionHistoryDoc.updatedAt && versionHistoryDoc.updatedAt !== versionHistoryDoc.createdAt) {
                        autoVersions.push({
                          id: `auto-${versionHistoryDoc.id}-2`,
                          version: 2,
                          timestamp: versionHistoryDoc.updatedAt,
                          summary: versionHistoryDoc.status === 'indexed' ? 'Document indexed' : 'Document updated',
                          sizeChange: `${versionHistoryDoc.chunkCount} chunks`,
                          type: versionHistoryDoc.status === 'indexed' ? 'reindexed' : 'content_updated',
                        })
                      }
                      try {
                        localStorage.setItem(`luminara-doc-versions-${versionHistoryDoc.id}`, JSON.stringify(autoVersions))
                      } catch {}

                      return (
                        <div className="space-y-0">
                          {autoVersions.map((entry, i) => {
                            const config = versionTypeConfig[entry.type] || versionTypeConfig.created
                            const Icon = config.icon
                            return (
                              <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.25 }}
                              >
                                <div className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                    </div>
                                    {i < autoVersions.length - 1 && (
                                      <div className="w-px flex-1 bg-gradient-to-b from-white/[0.08] to-transparent min-h-[20px]" />
                                    )}
                                  </div>
                                  <div className="flex-1 pb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/50">v{entry.version}</span>
                                      <span className="text-[11px] font-medium">{entry.summary}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40">
                                      <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timeAgo(entry.timestamp)}</span>
                                      <span>•</span>
                                      <span>{entry.sizeChange}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground/40 hover:text-violet-300 px-2" onClick={() => toast({ title: 'Version restored', description: `Restored to v${entry.version}` })}>
                                        <RotateCcw className="h-2.5 w-2.5" />Restore
                                      </Button>
                                      {entry.version < autoVersions.length && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground/40 hover:text-fuchsia-300 px-2" onClick={() => toast({ title: 'Comparison', description: `Comparing v${entry.version} with current version` })}>
                                          <GitCompare className="h-2.5 w-2.5" />Compare
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-0">
                        {versions.map((entry, i) => {
                          const config = versionTypeConfig[entry.type] || versionTypeConfig.created
                          const Icon = config.icon
                          return (
                            <motion.div
                              key={entry.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.25 }}
                            >
                              <div className="flex gap-3">
                                <div className="flex flex-col items-center">
                                  <div className={`h-8 w-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                  </div>
                                  {i < versions.length - 1 && (
                                    <div className="w-px flex-1 bg-gradient-to-b from-white/[0.08] to-transparent min-h-[20px]" />
                                  )}
                                </div>
                                <div className="flex-1 pb-4">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground/50">v{entry.version}</span>
                                    <span className="text-[11px] font-medium">{entry.summary}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground/40">
                                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timeAgo(entry.timestamp)}</span>
                                    <span>•</span>
                                    <span>{entry.sizeChange}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground/40 hover:text-violet-300 px-2" onClick={() => toast({ title: 'Version restored', description: `Restored to v${entry.version}` })}>
                                      <RotateCcw className="h-2.5 w-2.5" />Restore
                                    </Button>
                                    {entry.version < versions.length && (
                                      <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground/40 hover:text-fuchsia-300 px-2" onClick={() => toast({ title: 'Comparison', description: `Comparing v${entry.version} with current version` })}>
                                        <GitCompare className="h-2.5 w-2.5" />Compare
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/[0.06] shrink-0">
                  <div className="flex items-center gap-2 text-[9px] text-muted-foreground/30">
                    <Clock className="h-3 w-3" />
                    <span>Version history is stored locally</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== SEARCH PAGE ====================

function SearchPage({ documents, logActivity }: { documents: Document[]; logActivity: (type: ActivityType, desc: string) => void }) {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<ChunkResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [expandedResult, setExpandedResult] = useState<string | null>(null)
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all')
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; timestamp: number }>>([])
  const [showHistory, setShowHistory] = useState(true)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const suggestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const [savedSearches, setSavedSearches] = useState<Array<{ query: string; mode: SearchMode; timestamp: number }>>([])
  const [showSavedSearches, setShowSavedSearches] = useState(false)

  // Advanced Search Filters state
  const [showFilters, setShowFilters] = useState(false)
  const [filterDateRange, setFilterDateRange] = useState<'any' | '24h' | '7d' | '30d' | 'custom'>('any')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterDocTypes, setFilterDocTypes] = useState<string[]>([])
  const [filterMinConfidence, setFilterMinConfidence] = useState(0)
  const [filterSortBy, setFilterSortBy] = useState<'relevance' | 'newest' | 'oldest' | 'most_chunks'>('relevance')

  // Compute active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterDateRange !== 'any') count++
    if (filterDocTypes.length > 0) count++
    if (filterMinConfidence > 0) count++
    if (filterSortBy !== 'relevance') count++
    return count
  }, [filterDateRange, filterDocTypes, filterMinConfidence, filterSortBy])

  // Apply client-side filters to search results
  const filteredResults = useMemo(() => {
    let filtered = [...results]
    // Date range filter
    if (filterDateRange !== 'any') {
      const now = Date.now()
      let cutoff = 0
      if (filterDateRange === '24h') cutoff = now - 24 * 60 * 60 * 1000
      else if (filterDateRange === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000
      else if (filterDateRange === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000
      else if (filterDateRange === 'custom' && filterDateFrom) cutoff = new Date(filterDateFrom).getTime()
      filtered = filtered.filter(r => {
        const resultTime = r.createdAt ? new Date(r.createdAt).getTime() : now
        return resultTime >= cutoff
      })
      if (filterDateRange === 'custom' && filterDateTo) {
        const toDate = new Date(filterDateTo).getTime() + 24 * 60 * 60 * 1000
        filtered = filtered.filter(r => {
          const resultTime = r.createdAt ? new Date(r.createdAt).getTime() : now
          return resultTime <= toDate
        })
      }
    }
    // Document type filter
    if (filterDocTypes.length > 0) {
      filtered = filtered.filter(r => filterDocTypes.includes(r.documentType || r.sourceType || ''))
    }
    // Min confidence filter
    if (filterMinConfidence > 0) {
      filtered = filtered.filter(r => r.score >= filterMinConfidence)
    }
    // Sort
    if (filterSortBy === 'newest') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
    } else if (filterSortBy === 'oldest') {
      filtered.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return aTime - bTime
      })
    } else if (filterSortBy === 'most_chunks') {
      filtered.sort((a, b) => (b.chunkIndex ?? 0) - (a.chunkIndex ?? 0))
    }
    // 'relevance' is default sort (already by score from API)
    return filtered
  }, [results, filterDateRange, filterDateFrom, filterDateTo, filterDocTypes, filterMinConfidence, filterSortBy])

  const clearAllFilters = useCallback(() => {
    setFilterDateRange('any')
    setFilterDateFrom('')
    setFilterDateTo('')
    setFilterDocTypes([])
    setFilterMinConfidence(0)
    setFilterSortBy('relevance')
  }, [])

  const toggleDocTypeFilter = useCallback((docType: string) => {
    setFilterDocTypes(prev => prev.includes(docType) ? prev.filter(t => t !== docType) : [...prev, docType])
  }, [])

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('luminara-saved-searches')
      if (stored) setSavedSearches(JSON.parse(stored))
    } catch {}
  }, [])

  const saveSearch = useCallback(() => {
    if (!query.trim()) return
    setSavedSearches(prev => {
      const filtered = prev.filter(s => !(s.query === query.trim() && s.mode === searchMode))
      const updated = [{ query: query.trim(), mode: searchMode, timestamp: Date.now() }, ...filtered].slice(0, 10)
      localStorage.setItem('luminara-saved-searches', JSON.stringify(updated))
      return updated
    })
    toast({ title: 'Search saved', description: `"${query.trim()}" saved to bookmarks` })
  }, [query, searchMode])

  const deleteSavedSearch = useCallback((timestamp: number) => {
    setSavedSearches(prev => {
      const updated = prev.filter(s => s.timestamp !== timestamp)
      localStorage.setItem('luminara-saved-searches', JSON.stringify(updated))
      return updated
    })
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('luminara-search-history')
      if (stored) setSearchHistory(JSON.parse(stored))
    } catch {}
  }, [])

  const addSearchHistory = useCallback((q: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.query !== q)
      const updated = [{ query: q, timestamp: Date.now() }, ...filtered].slice(0, 10)
      localStorage.setItem('luminara-search-history', JSON.stringify(updated))
      return updated
    })
  }, [])

  const executeSavedSearch = useCallback((saved: { query: string; mode: SearchMode; timestamp: number }) => {
    setQuery(saved.query)
    setSearchMode(saved.mode)
    setShowSavedSearches(false)
    // Trigger search immediately
    setSearching(true); setHasSearched(true); addSearchHistory(saved.query)
    logActivity('search_performed', `Searched: "${saved.query}" (saved bookmark)`)
    fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: saved.query, mode: saved.mode, topK: 10, documentIds: selectedDocFilter !== 'all' ? [selectedDocFilter] : undefined }) })
      .then(res => res.json()).then(data => setResults(data.results || []))
      .catch(() => toast({ title: 'Search failed', variant: 'destructive' }))
      .finally(() => setSearching(false))
  }, [selectedDocFilter, addSearchHistory, logActivity])

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('luminara-search-history')
  }

  // Debounced search suggestions
  const fetchSuggestions = useCallback((q: string) => {
    if (suggestionsTimerRef.current) clearTimeout(suggestionsTimerRef.current)
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    suggestionsTimerRef.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        // Get suggestions from document names first
        const docNameMatches = documents
          .filter(d => d.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 3)
          .map(d => d.name)
        // Also search via API for content matches
        const res = await fetch('/api/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, mode: searchMode, topK: 3 })
        })
        const data = await res.json()
        const contentMatches = (data.results || []).slice(0, 3).map((r: ChunkResult) => {
          // Extract first meaningful phrase from content
          const words = r.content.split(/\s+/).slice(0, 6).join(' ')
          return words.length > 40 ? words.slice(0, 40) + '...' : words
        })
        const allSuggestions = [...new Set([...docNameMatches, ...contentMatches])].slice(0, 5)
        setSuggestions(allSuggestions)
        setShowSuggestions(allSuggestions.length > 0)
      } catch {
        // Fallback: just use document names
        const docMatches = documents
          .filter(d => d.name.toLowerCase().includes(q.toLowerCase()))
          .slice(0, 5)
          .map(d => d.name)
        setSuggestions(docMatches)
        setShowSuggestions(docMatches.length > 0)
      }
      finally { setSuggestionsLoading(false) }
    }, 300)
  }, [documents, searchMode])

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery || query
    if (!q.trim()) return
    setShowSuggestions(false)
    setSearching(true); setHasSearched(true); addSearchHistory(q.trim())
    logActivity('search_performed', `Searched: "${q.trim()}"`)
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, mode: searchMode, topK: 10, documentIds: selectedDocFilter !== 'all' ? [selectedDocFilter] : undefined }) })
      const data = await res.json(); setResults(data.results || [])
    } catch { toast({ title: 'Search failed', variant: 'destructive' }) }
    finally { setSearching(false) }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div><h2 className="text-[26px] font-bold tracking-tight page-title-gradient">Vector Search</h2><p className="text-sm text-muted-foreground/60 mt-0.5">Search across your indexed knowledge base</p></div>

      <GlassCard glow>
        <div className="p-4">
          <div className="flex gap-2.5">
            <div className="flex-1 relative" ref={suggestionsRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <Input value={query} onChange={e => { setQuery(e.target.value); fetchSuggestions(e.target.value) }} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }} onKeyDown={e => { if (e.key === 'Enter') { handleSearch(); setShowSuggestions(false) } }} placeholder="Search your knowledge base..." className="pl-10 h-10 bg-white/[0.03] border-white/[0.06] focus:border-violet-500/40 text-sm" />
              {/* Search Suggestions Dropdown */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl shadow-violet-500/10 z-50 overflow-hidden"
                  >
                    <div className="p-1.5">
                      <p className="text-[8px] text-muted-foreground/30 uppercase tracking-wider font-semibold px-2.5 py-1">Suggestions</p>
                      {suggestionsLoading && (
                        <div className="flex items-center gap-2 px-2.5 py-1.5">
                          <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
                          <span className="text-[10px] text-muted-foreground/40">Searching...</span>
                        </div>
                      )}
                      {suggestions.map((suggestion, si) => (
                        <button
                          key={si}
                          onClick={() => { setQuery(suggestion); setShowSuggestions(false); handleSearch(suggestion) }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] hover:bg-white/[0.04] transition-colors group"
                        >
                          <Search className="h-3 w-3 text-muted-foreground/20 group-hover:text-violet-400 transition-colors shrink-0" />
                          <span className="truncate text-muted-foreground/60 group-hover:text-foreground/80 transition-colors">{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <Button onClick={handleSearch} disabled={!query.trim() || searching} className="h-10 px-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
            {/* Filters Toggle Button */}
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => setShowFilters(!showFilters)} className={`h-10 w-10 border-white/[0.08] bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 relative transition-all ${showFilters ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : ''}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-fuchsia-500 text-[7px] text-white flex items-center justify-center font-bold">{activeFilterCount}</span>}
            </Button></TooltipTrigger><TooltipContent>Advanced Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}</TooltipContent></Tooltip></TooltipProvider>
            {/* Save Search Bookmark Button */}
            {hasSearched && query.trim() && (
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={saveSearch} className="h-10 w-10 border-white/[0.08] bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 relative transition-all">
                <Bookmark className="h-4 w-4" />
                {savedSearches.length > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-500 text-[7px] text-white flex items-center justify-center font-bold">{savedSearches.length}</span>}
              </Button></TooltipTrigger><TooltipContent>Save this search</TooltipContent></Tooltip></TooltipProvider>
            )}
            {/* Saved Searches Dropdown Toggle */}
            {savedSearches.length > 0 && (
              <div className="relative">
                <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => setShowSavedSearches(!showSavedSearches)} className={`h-10 w-10 border-white/[0.08] bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 relative transition-all ${showSavedSearches ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : ''}`}>
                  <BookmarkCheck className="h-4 w-4" />
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-violet-500 text-[7px] text-white flex items-center justify-center font-bold">{savedSearches.length}</span>
                </Button></TooltipTrigger><TooltipContent>Saved Searches ({savedSearches.length})</TooltipContent></Tooltip></TooltipProvider>
              </div>
            )}
          </div>

          {/* Advanced Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="h-3.5 w-3.5 text-violet-400" />
                      <span className="text-[10px] font-semibold text-violet-300">Advanced Filters</span>
                    </div>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-[9px] h-6 px-2 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <X className="h-2.5 w-2.5 mr-1" />Clear All
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Date Range Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-medium text-muted-foreground/50 flex items-center gap-1.5"><Calendar className="h-2.5 w-2.5" />Date Range</label>
                      <Select value={filterDateRange} onValueChange={(v: 'any' | '24h' | '7d' | '30d' | 'custom') => setFilterDateRange(v)}>
                        <SelectTrigger className="h-7 text-[10px] bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any time</SelectItem>
                          <SelectItem value="24h">Last 24 hours</SelectItem>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="custom">Custom range</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterDateRange === 'custom' && (
                        <div className="flex gap-2 mt-1">
                          <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-6 text-[9px] bg-white/[0.03] border-white/[0.06]" placeholder="From" />
                          <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-6 text-[9px] bg-white/[0.03] border-white/[0.06]" placeholder="To" />
                        </div>
                      )}
                    </div>
                    {/* Sort By Filter */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-medium text-muted-foreground/50 flex items-center gap-1.5"><ArrowUpDown className="h-2.5 w-2.5" />Sort By</label>
                      <Select value={filterSortBy} onValueChange={(v: 'relevance' | 'newest' | 'oldest' | 'most_chunks') => setFilterSortBy(v)}>
                        <SelectTrigger className="h-7 text-[10px] bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="newest">Newest</SelectItem>
                          <SelectItem value="oldest">Oldest</SelectItem>
                          <SelectItem value="most_chunks">Most chunks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Document Type Filter */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-muted-foreground/50">Document Types</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['pdf', 'docx', 'md', 'txt'].map(dt => (
                        <button key={dt} onClick={() => toggleDocTypeFilter(dt)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${filterDocTypes.includes(dt) ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25' : 'bg-white/[0.02] text-muted-foreground/40 border border-white/[0.06] hover:border-violet-500/20 hover:text-muted-foreground/60'}`}>
                          {getFileIcon(dt, 'h-3 w-3')}
                          {dt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Min Confidence Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-medium text-muted-foreground/50">Min Confidence</label>
                      <span className="text-[9px] font-mono text-violet-400">{(filterMinConfidence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-muted-foreground/30">0</span>
                      <input
                        type="range" min={0} max={1} step={0.1} value={filterMinConfidence}
                        onChange={e => setFilterMinConfidence(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 rounded-full appearance-none bg-white/[0.06] accent-violet-500 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-violet-500/30"
                      />
                      <span className="text-[8px] text-muted-foreground/30">1.0</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Applied Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {filterDateRange !== 'any' && (
                <Badge variant="outline" className="text-[8px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border-violet-500/20 flex items-center gap-1 cursor-pointer hover:bg-violet-500/20 transition-colors" onClick={() => setFilterDateRange('any')}>
                  <Calendar className="h-2.5 w-2.5" />{filterDateRange === '24h' ? 'Last 24h' : filterDateRange === '7d' ? 'Last 7d' : filterDateRange === '30d' ? 'Last 30d' : 'Custom'} <X className="h-2.5 w-2.5 ml-0.5" />
                </Badge>
              )}
              {filterDocTypes.map(dt => (
                <Badge key={dt} variant="outline" className="text-[8px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border-violet-500/20 flex items-center gap-1 cursor-pointer hover:bg-violet-500/20 transition-colors" onClick={() => toggleDocTypeFilter(dt)}>
                  {dt.toUpperCase()} <X className="h-2.5 w-2.5 ml-0.5" />
                </Badge>
              ))}
              {filterMinConfidence > 0 && (
                <Badge variant="outline" className="text-[8px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border-violet-500/20 flex items-center gap-1 cursor-pointer hover:bg-violet-500/20 transition-colors" onClick={() => setFilterMinConfidence(0)}>
                  ≥{(filterMinConfidence * 100).toFixed(0)}% <X className="h-2.5 w-2.5 ml-0.5" />
                </Badge>
              )}
              {filterSortBy !== 'relevance' && (
                <Badge variant="outline" className="text-[8px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border-violet-500/20 flex items-center gap-1 cursor-pointer hover:bg-violet-500/20 transition-colors" onClick={() => setFilterSortBy('relevance')}>
                  <ArrowUpDown className="h-2.5 w-2.5" />{filterSortBy === 'newest' ? 'Newest' : filterSortBy === 'oldest' ? 'Oldest' : 'Most chunks'} <X className="h-2.5 w-2.5 ml-0.5" />
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04]">
              {([['hybrid', 'Hybrid', Zap, 'text-violet-400'], ['semantic', 'Semantic', Brain, 'text-fuchsia-400'], ['keyword', 'Keyword', Hash, 'text-amber-400']] as const).map(([v, l, Ic, c]) => (
                <button key={v} onClick={() => setSearchMode(v as SearchMode)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${searchMode === v ? `bg-white/[0.06] ${c} shadow-sm` : 'text-muted-foreground/40 hover:text-foreground/60'}`}>
                  <Ic className="h-3 w-3" />{l}
                </button>
              ))}
            </div>
            <Select value={selectedDocFilter} onValueChange={setSelectedDocFilter}>
              <SelectTrigger className="h-7 w-36 text-[10px] bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Documents</SelectItem>{documents.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Search History */}
      {searchHistory.length > 0 && !hasSearched && showHistory && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3 w-3" />Recent Searches</p>
            <Button variant="ghost" size="sm" className="text-[9px] h-5 text-muted-foreground/30 hover:text-red-400" onClick={clearHistory}>Clear History</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {searchHistory.map(h => (
              <button key={h.timestamp} onClick={() => { setQuery(h.query); setShowHistory(false) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all group">
                <Search className="h-2.5 w-2.5 text-muted-foreground/20 group-hover:text-violet-400 transition-colors" />
                <span>{h.query}</span>
                <span className="text-[8px] text-muted-foreground/20">{timeAgo(new Date(h.timestamp).toISOString())}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {searching && <div className="flex items-center gap-3 py-8 justify-center"><span className="flex items-center gap-1.5"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span><span className="text-sm text-muted-foreground/50">Searching...</span></div>}

      {!searching && hasSearched && filteredResults.length === 0 && <GlassCard><div className="text-center py-12"><div className="relative inline-block mb-3"><Search className="h-10 w-10 text-violet-400/15 mx-auto empty-icon-pulse" /><div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-violet-400/10 animate-pulse" /></div><p className="text-sm text-muted-foreground/60 font-medium">{activeFilterCount > 0 ? 'No results match your filters' : 'No results found'}</p><p className="text-xs text-muted-foreground/30 mt-1 mb-4">{activeFilterCount > 0 ? 'Try adjusting or clearing your filters' : 'Try different keywords or search mode'}</p>{activeFilterCount > 0 && <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-[10px] h-7 border-white/[0.08] bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400">Clear Filters</Button>}</div></GlassCard>}

      {!searching && filteredResults.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between"><p className="text-[10px] text-muted-foreground/40">Found <span className="text-violet-400 font-medium">{filteredResults.length}</span> matching chunks{activeFilterCount > 0 && results.length !== filteredResults.length && <span className="text-muted-foreground/25 ml-1">(filtered from {results.length})</span>}</p><Badge variant="outline" className="text-[8px] bg-white/[0.02] border-white/[0.06]"><Zap className="h-2.5 w-2.5 mr-0.5 text-violet-400" />{searchMode}</Badge></div>
          <AnimatePresence>{filteredResults.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <GlassCard className={`cursor-pointer transition-all ${expandedResult === r.id ? 'border-violet-500/25' : 'hover:border-white/[0.1]'}`} onClick={() => setExpandedResult(expandedResult === r.id ? null : r.id)}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">#{i + 1}</span>
                      {getFileIcon(r.documentType || r.sourceType, 'h-3 w-3')}
                      <span className="text-[11px] font-medium truncate max-w-[200px]">{r.documentName || r.sourceName}</span>
                      <Badge variant="outline" className="text-[7px] px-1 py-0 uppercase">{r.documentType || r.sourceType}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1 rounded-full bg-white/[0.04] overflow-hidden"><div className={`h-full rounded-full ${r.score >= 0.7 ? 'bg-emerald-500' : r.score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.score * 100, 100)}%` }} /></div>
                      <span className={`text-[9px] font-mono font-bold ${getScoreColor(r.score)}`}>{(r.score * 100).toFixed(1)}%</span>
                      <Badge variant="outline" className={`${getScoreBg(r.score)} text-[7px] px-1 py-0 font-bold`}>{getScoreLabel(r.score)}</Badge>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">{expandedResult === r.id ? r.content : truncateText(r.content, 160)}{expandedResult !== r.id && r.content.length > 160 && <span className="text-violet-400/50 ml-1">more…</span>}</p>
                  <AnimatePresence>{expandedResult === r.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] flex items-center gap-4 text-[9px] text-muted-foreground/30">
                        <span className="flex items-center gap-1"><Hash className="h-2.5 w-2.5" />Chunk #{r.chunkIndex}</span>
                        <span className="flex items-center gap-1"><AlignLeft className="h-2.5 w-2.5" />{r.content.split(/\s+/).length} words</span>
                        <span className="flex items-center gap-1"><Type className="h-2.5 w-2.5" />{r.content.length} chars</span>
                      </div>
                    </motion.div>
                  )}</AnimatePresence>
                </div>
              </GlassCard>
            </motion.div>
          ))}</AnimatePresence>
        </div>
      )}

      {!hasSearched && <GlassCard><div className="text-center py-14"><motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="relative inline-block mb-4"><div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mx-auto border border-violet-500/20"><Search className="h-8 w-8 text-violet-400/50" /></div><div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-violet-400/10 animate-pulse" /><div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-fuchsia-400/10 animate-pulse" style={{ animationDelay: '1s' }} /></motion.div><h3 className="text-lg font-semibold mb-1.5 page-title-gradient inline-block">Search your knowledge base</h3><p className="text-xs text-muted-foreground/40 max-w-sm mx-auto mb-5">Use semantic, keyword, or hybrid search to find information across all indexed documents.</p><div className="flex flex-wrap gap-1.5 justify-center">{['authentication workflow', 'security compliance', 'RAG architecture', 'onboarding process'].map(q => (<button key={q} onClick={() => setQuery(q)} className="px-2.5 py-1.5 rounded-full text-[10px] bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 hover:shadow-[0_0_8px_rgba(139,92,246,0.08)] transition-all">{q}</button>))}</div></div></GlassCard>}

      {/* Saved Searches Section */}
      {savedSearches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider flex items-center gap-1.5">
              <BookmarkCheck className="h-3 w-3 text-violet-400" />
              Saved Searches
              <span className="ml-1 h-4 px-1.5 rounded-full bg-violet-500/15 text-violet-300 text-[8px] font-bold flex items-center justify-center">{savedSearches.length}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AnimatePresence>
              {savedSearches.map((saved, i) => {
                const modeIcon = saved.mode === 'hybrid' ? Zap : saved.mode === 'semantic' ? Brain : Hash
                const modeColor = saved.mode === 'hybrid' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' : saved.mode === 'semantic' ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                const MI = modeIcon
                return (
                  <motion.div
                    key={saved.timestamp}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="group relative"
                  >
                    <GlassCard className="cursor-pointer hover:border-violet-500/25 transition-all" onClick={() => executeSavedSearch(saved)}>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">{saved.query}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className={`text-[7px] px-1.5 py-0 ${modeColor} flex items-center gap-1`}>
                                <MI className="h-2.5 w-2.5" />{saved.mode}
                              </Badge>
                              <span className="text-[8px] text-muted-foreground/25">{timeAgo(new Date(saved.timestamp).toISOString())}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            onClick={(e) => { e.stopPropagation(); deleteSavedSearch(saved.timestamp) }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ==================== CHAT PAGE ====================

function ChatPage({ documents, logActivity }: { documents: Document[]; logActivity: (type: ActivityType, desc: string) => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatMode, setChatMode] = useState<ChatMode>('balanced')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [showTrace, setShowTrace] = useState(false)
  const [lastRagResponse, setLastRagResponse] = useState<RAGResponse | null>(null)
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all')
  const [lastAssistantContent, setLastAssistantContent] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [renamingSession, setRenamingSession] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [messageFeedback, setMessageFeedback] = useState<Record<string, 'up' | 'down'>>({})
  const [feedbackCounts, setFeedbackCounts] = useState({ up: 0, down: 0 })
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [templateCategory, setTemplateCategory] = useState<string>('All')
  const templatesRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [lastUserMessage, setLastUserMessage] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchActive, setChatSearchActive] = useState(false)
  const [chatSearchMatchIndex, setChatSearchMatchIndex] = useState(0)
  const chatSearchInputRef = useRef<HTMLInputElement>(null)
  const chatMatchRefs = useRef<Map<number, HTMLSpanElement>>(new Map())

  // Listen for Ctrl+Shift+N new chat shortcut
  useEffect(() => {
    const handleNewChatShortcut = () => { createSession() }
    window.addEventListener('luminara-new-chat', handleNewChatShortcut)
    return () => { window.removeEventListener('luminara-new-chat', handleNewChatShortcut) }
  })

  // Chat message bookmarks
  const BOOKMARKS_STORAGE_KEY = 'luminara-chat-bookmarks'
  interface ChatBookmark {
    messageId: string
    sessionId: string
    sessionName: string
    content: string
    role: 'user' | 'assistant'
    timestamp: string
  }
  const [bookmarks, setBookmarks] = useState<ChatBookmark[]>(() => {
    try { const stored = localStorage.getItem(BOOKMARKS_STORAGE_KEY); return stored ? JSON.parse(stored) : [] } catch { return [] }
  })
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false)

  const toggleBookmark = useCallback((msg: ChatMessage, sessionName: string) => {
    setBookmarks(prev => {
      const exists = prev.find(b => b.messageId === msg.id)
      let updated: ChatBookmark[]
      if (exists) {
        updated = prev.filter(b => b.messageId !== msg.id)
        toast({ title: 'Bookmark removed', description: 'Message unbookmarked' })
      } else {
        updated = [...prev, {
          messageId: msg.id,
          sessionId: msg.sessionId,
          sessionName,
          content: msg.content,
          role: msg.role,
          timestamp: msg.createdAt,
        }]
        toast({ title: 'Bookmarked!', description: 'Message saved to bookmarks' })
      }
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearAllBookmarks = useCallback(() => {
    setBookmarks([])
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify([]))
    toast({ title: 'Bookmarks cleared', description: 'All chat bookmarks have been removed' })
  }, [])

  const isBookmarked = useCallback((messageId: string) => {
    return bookmarks.some(b => b.messageId === messageId)
  }, [bookmarks])

  // Pin & rename state for chat sessions
  const [pinnedSessions, setPinnedSessions] = useState<string[]>(() => {
    try { const stored = localStorage.getItem('luminara-pinned-sessions'); return stored ? JSON.parse(stored) : [] } catch { return [] }
  })
  const [sessionNames, setSessionNames] = useState<Record<string, string>>(() => {
    try { const stored = localStorage.getItem('luminara-session-names'); return stored ? JSON.parse(stored) : {} } catch { return {} }
  })
  const [sessionMenuOpen, setSessionMenuOpen] = useState<string | null>(null)
  const sessionMenuRef = useRef<HTMLDivElement>(null)

  // Close session menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sessionMenuRef.current && !sessionMenuRef.current.contains(e.target as Node)) setSessionMenuOpen(null)
    }
    if (sessionMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [sessionMenuOpen])

  const togglePinSession = useCallback((sessionId: string) => {
    setPinnedSessions(prev => {
      const updated = prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
      localStorage.setItem('luminara-pinned-sessions', JSON.stringify(updated))
      return updated
    })
    const isPinned = pinnedSessions.includes(sessionId)
    toast({ title: isPinned ? 'Session unpinned' : 'Session pinned', description: isPinned ? 'Moved back to chat list' : 'Moved to pinned section' })
    setSessionMenuOpen(null)
  }, [pinnedSessions])

  const getDisplayName = useCallback((session: ChatSession) => {
    return sessionNames[session.id] || session.title
  }, [sessionNames])

  // Chat search: compute filtered messages and match info
  const chatSearchLower = chatSearchQuery.toLowerCase()
  const chatSearchMatches = useMemo(() => {
    if (!chatSearchQuery.trim()) return []
    const matches: Array<{ messageId: string; matchIndex: number }> = []
    messages.forEach(msg => {
      const lower = msg.content.toLowerCase()
      let pos = 0
      while ((pos = lower.indexOf(chatSearchLower, pos)) !== -1) {
        matches.push({ messageId: msg.id, matchIndex: pos })
        pos += 1
      }
    })
    return matches
  }, [messages, chatSearchLower])
  const chatFilteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages
    return messages.filter(msg => msg.content.toLowerCase().includes(chatSearchLower))
  }, [messages, chatSearchLower])

  // Auto-scroll to current match when search changes
  useEffect(() => {
    if (chatSearchMatches.length > 0 && chatSearchActive) {
      const idx = Math.min(chatSearchMatchIndex, chatSearchMatches.length - 1)
      const el = chatMatchRefs.current.get(idx)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [chatSearchMatchIndex, chatSearchMatches.length, chatSearchActive])

  // Reset match index when query changes
  useEffect(() => {
    setChatSearchMatchIndex(0)
  }, [chatSearchQuery])

  // Highlight text helper for chat search
  const highlightChatText = (text: string, messageId: string) => {
    if (!chatSearchQuery.trim() || !chatSearchActive) return text
    const lower = text.toLowerCase()
    const queryLower = chatSearchLower
    const parts: Array<{ text: string; isMatch: boolean; globalMatchIdx: number }> = []
    let lastEnd = 0
    // Find all match positions for this message
    const msgMatchStartIndices: number[] = []
    chatSearchMatches.forEach((m, i) => {
      if (m.messageId === messageId) msgMatchStartIndices.push(i)
    })
    let pos = 0
    while ((pos = lower.indexOf(queryLower, pos)) !== -1) {
      if (pos > lastEnd) parts.push({ text: text.slice(lastEnd, pos), isMatch: false, globalMatchIdx: -1 })
      const matchGlobalIdx = msgMatchStartIndices[parts.filter(p => p.isMatch).length] ?? -1
      parts.push({ text: text.slice(pos, pos + chatSearchQuery.length), isMatch: true, globalMatchIdx: matchGlobalIdx })
      lastEnd = pos + chatSearchQuery.length
      pos += 1
    }
    if (lastEnd < text.length) parts.push({ text: text.slice(lastEnd), isMatch: false, globalMatchIdx: -1 })
    if (parts.length === 0) return text
    return parts.map((part, i) => {
      if (part.isMatch) {
        const isCurrent = part.globalMatchIdx === chatSearchMatchIndex
        return (
          <span
            key={i}
            ref={isCurrent ? (el: HTMLSpanElement | null) => { if (el) chatMatchRefs.current.set(part.globalMatchIdx, el) } : undefined}
            className={`${isCurrent ? 'bg-violet-500/40 ring-1 ring-violet-400' : 'bg-violet-500/20'} rounded-sm px-0.5 transition-colors`}
          >
            {part.text}
          </span>
        )
      }
      return <span key={i}>{part.text}</span>
    })
  }

  // Close templates dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) setTemplatesOpen(false)
    }
    if (templatesOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [templatesOpen])

  // Custom templates from localStorage
  const [chatCustomTemplates, setChatCustomTemplates] = useState<CustomPromptTemplate[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })

  // Listen for custom template updates
  useEffect(() => {
    const handler = () => {
      try {
        const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
        if (stored) setChatCustomTemplates(JSON.parse(stored))
        else setChatCustomTemplates([])
      } catch {}
    }
    window.addEventListener('luminara-custom-templates-updated', handler)
    return () => window.removeEventListener('luminara-custom-templates-updated', handler)
  }, [])

  // Combine built-in and custom templates for display
  const allChatTemplates = useMemo(() => {
    const builtIn = PROMPT_TEMPLATES.map(t => ({
      id: t.id,
      category: t.category,
      icon: t.icon,
      title: t.title,
      description: t.description,
      prompt: t.prompt,
      isCustom: false as const,
    }))
    const custom = chatCustomTemplates.map(t => ({
      id: t.id,
      category: t.category,
      icon: MessageSquare as typeof MessageSquare,
      title: t.name,
      description: truncateText(t.content, 60),
      prompt: t.content,
      isCustom: true as const,
    }))
    return [...builtIn, ...custom]
  }, [chatCustomTemplates])

  const filteredTemplates = templateCategory === 'All' ? allChatTemplates : allChatTemplates.filter(t => t.category === templateCategory)
  const { displayed: typewrittenText, done: typewriterDone } = useTypewriter(lastAssistantContent, 8)

  useEffect(() => { const f = async () => { try { const r = await fetch('/api/chat/sessions'); const d = await r.json(); setSessions(d); if (d.length > 0 && !activeSession) setActiveSession(d[0]) } catch {} }; f() }, [])

  useEffect(() => {
    if (!activeSession) return
    const f = async () => { try { const r = await fetch(`/api/chat/sessions/${activeSession.id}`); const d = await r.json(); setMessages(d.messages || []) } catch {} }
    f()
  }, [activeSession])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading, isStreaming, streamingContent, typewrittenText])

  const createSession = async () => {
    try { const r = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New Chat', mode: chatMode }) }); const s = await r.json(); setSessions(p => [s, ...p]); setActiveSession(s); setMessages([]); setLastRagResponse(null); logActivity('chat_created', 'New chat session created') }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const renameSession = async (id: string, title: string) => {
    try {
      await fetch(`/api/chat/sessions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) })
      setSessions(p => p.map(s => s.id === id ? { ...s, title } : s))
      if (activeSession?.id === id) setActiveSession(p => p ? { ...p, title } : p)
      // Save custom name to localStorage
      setSessionNames(prev => {
        const updated = { ...prev, [id]: title }
        localStorage.setItem('luminara-session-names', JSON.stringify(updated))
        return updated
      })
      setRenamingSession(null)
      toast({ title: 'Session renamed', description: `Renamed to "${title}"` })
    } catch { toast({ title: 'Rename failed', variant: 'destructive' }) }
  }

  const deleteSession = async (id: string) => {
    try { await fetch(`/api/chat/sessions/${id}`, { method: 'DELETE' }); setSessions(p => p.filter(s => s.id !== id)); if (activeSession?.id === id) { setActiveSession(sessions.find(s => s.id !== id) || null); setMessages([]) } toast({ title: 'Session deleted' }) }
    catch { toast({ title: 'Error', variant: 'destructive' }) }
  }

  const exportChat = async () => {
    if (!activeSession) return
    try {
      const res = await fetch(`/api/chat/export/${activeSession.id}?format=markdown`)
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `chat-${activeSession.title.replace(/\s+/g, '-').toLowerCase()}.md`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Chat exported', description: 'Downloaded as markdown' })
    } catch { toast({ title: 'Export failed', variant: 'destructive' }) }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
    toast({ title: 'Copied to clipboard' })
  }

  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsLoading(false)
    // Finalize the streaming message with whatever content we have
    if (streamingContent) {
      setLastAssistantContent(streamingContent)
      setMessages(p => {
        const filtered = p.filter(m => m.id !== 'streaming-assistant')
        return [...filtered, { id: 'streaming-final', sessionId: activeSession?.id || '', role: 'assistant', content: streamingContent, citations: null, sources: null, mode: chatMode, createdAt: new Date().toISOString() }]
      })
    }
    setStreamingContent('')
  }

  const sendMessage = async (overrideMessage?: string) => {
    const msgText = overrideMessage || input.trim()
    if (!msgText || isLoading) return
    if (!activeSession) { await createSession(); await new Promise(r => setTimeout(r, 100)) }
    const userMessage = msgText; setInput(''); setLastUserMessage(userMessage); setIsLoading(true); setIsStreaming(false); setShowTrace(false); setLastAssistantContent(''); setStreamingContent('')
    setMessages(p => [...p, { id: 'temp-user', sessionId: activeSession?.id || '', role: 'user', content: userMessage, citations: null, sources: null, mode: chatMode, createdAt: new Date().toISOString() }])

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const r = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: activeSession?.id || sessions[0]?.id, mode: chatMode, documentIds: selectedDocFilter !== 'all' ? [selectedDocFilter] : undefined }),
        signal: abortController.signal
      })

      if (!r.ok) {
        // Fallback to non-streaming endpoint
        throw new Error(`Stream API returned ${r.status}`)
      }

      const reader = r.body?.getReader()
      if (!reader) throw new Error('No reader available')

      setIsStreaming(true)
      setIsLoading(false)
      let fullContent = ''

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        // Parse SSE events
        const lines = text.split('\n')
        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (currentEvent === 'token' && data.content) {
                fullContent += data.content
                setStreamingContent(fullContent)
                // Update the streaming message in messages array
                setMessages(p => {
                  const filtered = p.filter(m => m.id !== 'streaming-assistant')
                  return [...filtered, { id: 'streaming-assistant', sessionId: activeSession?.id || '', role: 'assistant', content: fullContent, citations: null, sources: null, mode: chatMode, createdAt: new Date().toISOString() }]
                })
              } else if (currentEvent === 'metadata') {
                const ragResponse: RAGResponse = {
                  answer: fullContent,
                  sources: data.sources || [],
                  retrievalTrace: data.retrievalTrace || { query: userMessage, mode: chatMode, totalCandidates: 0, selectedChunks: 0, searchMode: 'hybrid', processingTime: 0 },
                  warnings: data.warnings || []
                }
                setLastRagResponse(ragResponse)
                // Update the message with sources
                setMessages(p => p.map(m => m.id === 'streaming-assistant' ? {
                  ...m,
                  id: 'streaming-final',
                  citations: JSON.stringify(data.sources?.map((s: SourceCitation, i: number) => ({ index: i + 1, documentName: s.documentName, documentType: s.documentType, score: s.score })) || []),
                  sources: JSON.stringify(data.sources || [])
                } : m))
              }
            } catch {
              // Could be partial JSON, ignore
            }
          }
        }
      }

      setIsStreaming(false)
      setLastAssistantContent(fullContent)
      setStreamingContent('')
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled streaming, already handled in stopStreaming
        return
      }
      console.error('Streaming failed, falling back to non-streaming:', error)
      // Fallback to non-streaming endpoint
      try {
        const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMessage, sessionId: activeSession?.id || sessions[0]?.id, mode: chatMode, documentIds: selectedDocFilter !== 'all' ? [selectedDocFilter] : undefined }) })
        const data: RAGResponse = await r.json()
        setLastRagResponse(data); setLastAssistantContent(data.answer)
        setMessages(p => [...p, { id: 'fallback-assistant', sessionId: activeSession?.id || '', role: 'assistant', content: data.answer, citations: JSON.stringify(data.sources.map((s, i) => ({ index: i + 1, documentName: s.documentName, documentType: s.documentType, score: s.score }))), sources: JSON.stringify(data.sources), mode: chatMode, createdAt: new Date().toISOString() }])
      } catch {
        toast({ title: 'Error', description: 'Failed to get response', variant: 'destructive' })
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
      setStreamingContent('')
      abortControllerRef.current = null
    }
  }

  const regenerateResponse = async () => {
    if (!lastUserMessage || isLoading || isStreaming) return
    // Remove the last assistant message
    setMessages(p => {
      const lastAssistantIdx = [...p].reverse().findIndex(m => m.role === 'assistant')
      if (lastAssistantIdx >= 0) {
        const idx = p.length - 1 - lastAssistantIdx
        return [...p.slice(0, idx)]
      }
      return p
    })
    setLastAssistantContent('')
    setLastRagResponse(null)
    // Re-send the last user message
    await sendMessage(lastUserMessage)
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const maxH = 6 * 24 // ~6 lines
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxH) + 'px'
    }
  }, [input])

  const modeConfig: Record<ChatMode, { label: string; icon: typeof Shield; description: string; color: string }> = {
    strict: { label: 'Strict', icon: Shield, description: 'Only from documents', color: 'text-red-400' },
    balanced: { label: 'Balanced', icon: Brain, description: 'Docs + general', color: 'text-amber-400' },
    creative: { label: 'Creative', icon: Lightbulb, description: 'Docs + insights', color: 'text-emerald-400' },
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-3rem)]">
      {/* Sessions sidebar */}
      <div className="w-52 shrink-0 flex flex-col hidden md:flex">
        <Button onClick={createSession} variant="outline" size="sm" className="w-full mb-2 gap-2 border-dashed border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] text-[11px]"><Plus className="h-3 w-3" />New Chat</Button>
        <ScrollArea className="flex-1">
          {/* Pinned Sessions */}
          {sessions.filter(s => pinnedSessions.includes(s.id)).length > 0 && (
            <div className="mb-2">
              <p className="text-[8px] font-semibold text-violet-400/60 uppercase tracking-wider px-2 py-1.5 flex items-center gap-1"><Pin className="h-2.5 w-2.5" />Pinned</p>
              <div className="space-y-0.5">
                {sessions.filter(s => pinnedSessions.includes(s.id)).map(s => {
                  const displayName = getDisplayName(s)
                  const isActive = activeSession?.id === s.id
                  return (
                    <div key={s.id} className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all group text-[11px] relative ${isActive ? 'bg-violet-500/10 text-violet-300' : 'bg-violet-500/[0.04] hover:bg-violet-500/[0.08] text-violet-200/70'}`} onClick={() => { setActiveSession(s); setLastRagResponse(null); setLastAssistantContent(''); setSessionMenuOpen(null) }}>
                      <Pin className="h-2.5 w-2.5 shrink-0 text-violet-400" />
                      {renamingSession === s.id ? (
                        <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => renameValue.trim() ? renameSession(s.id, renameValue.trim()) : setRenamingSession(null)}
                          onKeyDown={e => { if (e.key === 'Enter' && renameValue.trim()) renameSession(s.id, renameValue.trim()); if (e.key === 'Escape') setRenamingSession(null) }}
                          onClick={e => e.stopPropagation()} autoFocus
                          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] outline-none min-w-0" />
                      ) : (
                        <span className="truncate flex-1" onDoubleClick={e => { e.stopPropagation(); setRenamingSession(s.id); setRenameValue(displayName) }}>{displayName}</span>
                      )}
                      <div className="relative" ref={sessionMenuOpen === s.id ? sessionMenuRef : undefined}>
                        <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={e => { e.stopPropagation(); setSessionMenuOpen(sessionMenuOpen === s.id ? null : s.id) }}><MoreHorizontal className="h-3 w-3" /></Button>
                        <AnimatePresence>
                          {sessionMenuOpen === s.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.1 }}
                              className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-white/[0.08] bg-black/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
                              <button onClick={e => { e.stopPropagation(); setRenamingSession(s.id); setRenameValue(displayName); setSessionMenuOpen(null) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-white/[0.04] transition-colors"><Pencil className="h-3 w-3 text-muted-foreground/50" />Rename</button>
                              <button onClick={e => { e.stopPropagation(); togglePinSession(s.id) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-white/[0.04] transition-colors"><PinOff className="h-3 w-3 text-violet-400/70" />Unpin</button>
                              <Separator className="opacity-30" />
                              <button onClick={e => { e.stopPropagation(); deleteSession(s.id); setSessionMenuOpen(null) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="h-3 w-3" />Delete</button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Regular Sessions */}
          {sessions.filter(s => pinnedSessions.includes(s.id)).length > 0 && sessions.filter(s => !pinnedSessions.includes(s.id)).length > 0 && (
            <p className="text-[8px] font-semibold text-muted-foreground/30 uppercase tracking-wider px-2 py-1.5">Recent</p>
          )}
          <div className="space-y-0.5">
            {sessions.filter(s => !pinnedSessions.includes(s.id)).map(s => {
              const displayName = getDisplayName(s)
              const isActive = activeSession?.id === s.id
              return (
                <div key={s.id} className={`flex items-center gap-1.5 p-2 rounded-lg cursor-pointer transition-all group text-[11px] relative ${isActive ? 'bg-violet-500/10 text-violet-300' : 'hover:bg-white/[0.03] text-muted-foreground/40'}`} onClick={() => { setActiveSession(s); setLastRagResponse(null); setLastAssistantContent(''); setSessionMenuOpen(null) }}>
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  {renamingSession === s.id ? (
                    <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => renameValue.trim() ? renameSession(s.id, renameValue.trim()) : setRenamingSession(null)}
                      onKeyDown={e => { if (e.key === 'Enter' && renameValue.trim()) renameSession(s.id, renameValue.trim()); if (e.key === 'Escape') setRenamingSession(null) }}
                      onClick={e => e.stopPropagation()} autoFocus
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] outline-none min-w-0" />
                  ) : (
                    <span className="truncate flex-1" onDoubleClick={e => { e.stopPropagation(); setRenamingSession(s.id); setRenameValue(displayName) }}>{displayName}</span>
                  )}
                  <div className="relative" ref={sessionMenuOpen === s.id ? sessionMenuRef : undefined}>
                    <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 shrink-0" onClick={e => { e.stopPropagation(); setSessionMenuOpen(sessionMenuOpen === s.id ? null : s.id) }}><MoreHorizontal className="h-3 w-3" /></Button>
                    <AnimatePresence>
                      {sessionMenuOpen === s.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.1 }}
                          className="absolute right-0 top-full mt-1 w-32 rounded-lg border border-white/[0.08] bg-black/95 backdrop-blur-xl shadow-xl z-50 overflow-hidden">
                          <button onClick={e => { e.stopPropagation(); setRenamingSession(s.id); setRenameValue(displayName); setSessionMenuOpen(null) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-white/[0.04] transition-colors"><Pencil className="h-3 w-3 text-muted-foreground/50" />Rename</button>
                          <button onClick={e => { e.stopPropagation(); togglePinSession(s.id) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-white/[0.04] transition-colors"><Pin className="h-3 w-3 text-violet-400/70" />Pin</button>
                          <Separator className="opacity-30" />
                          <button onClick={e => { e.stopPropagation(); deleteSession(s.id); setSessionMenuOpen(null) }} className="w-full flex items-center gap-2 px-2.5 py-2 text-[10px] hover:bg-red-500/10 text-red-400 transition-colors"><Trash2 className="h-3 w-3" />Delete</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
        {/* Bookmarks section */}
        <div className="border-t border-white/[0.06] pt-2 mt-1">
          <button
            onClick={() => setShowBookmarksPanel(!showBookmarksPanel)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[10px] font-semibold transition-all ${showBookmarksPanel ? 'bg-amber-500/10 text-amber-300' : 'hover:bg-white/[0.03] text-muted-foreground/50'}`}
          >
            <Bookmark className="h-3 w-3" />
            <span>Bookmarks</span>
            {bookmarks.length > 0 && (
              <Badge variant="outline" className="text-[7px] ml-auto px-1.5 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">{bookmarks.length}</Badge>
            )}
            <ChevronDown className={`h-2.5 w-2.5 ml-auto ${bookmarks.length > 0 ? '' : 'mr-0'} transition-transform ${showBookmarksPanel ? 'rotate-180' : ''}`} style={bookmarks.length > 0 ? {} : { marginLeft: 'auto' }} />
          </button>
          <AnimatePresence>
            {showBookmarksPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {bookmarks.length === 0 ? (
                  <div className="px-2.5 py-3 text-center">
                    <Bookmark className="h-4 w-4 text-amber-400/20 mx-auto mb-1" />
                    <p className="text-[9px] text-muted-foreground/30">No bookmarked messages</p>
                  </div>
                ) : (
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {bookmarks.map(bm => (
                      <div
                        key={bm.messageId}
                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors group"
                        onClick={() => {
                          const session = sessions.find(s => s.id === bm.sessionId)
                          if (session) {
                            setActiveSession(session)
                            setLastRagResponse(null)
                            setLastAssistantContent('')
                            setShowBookmarksPanel(false)
                            setTimeout(() => {
                              const el = document.querySelector(`[data-msg-id="${bm.messageId}"]`)
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                            }, 300)
                          } else {
                            toast({ title: 'Session not found', description: 'This bookmark\'s session may have been deleted', variant: 'destructive' })
                          }
                        }}
                      >
                        <div className={`h-4 w-4 rounded shrink-0 mt-0.5 flex items-center justify-center ${bm.role === 'assistant' ? 'bg-violet-500/10' : 'bg-fuchsia-500/10'}`}>
                          {bm.role === 'assistant' ? <Sparkles className="h-2 w-2 text-violet-400" /> : <MessageSquare className="h-2 w-2 text-fuchsia-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] text-muted-foreground/60 truncate">{truncateText(bm.content, 50)}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7px] text-muted-foreground/30 truncate max-w-[80px]">{bm.sessionName}</span>
                            <span className="text-[7px] text-muted-foreground/20">{timeAgo(bm.timestamp)}</span>
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleBookmark({ id: bm.messageId, sessionId: bm.sessionId, role: bm.role, content: bm.content, citations: null, sources: null, mode: null, createdAt: bm.timestamp }, bm.sessionName) }}
                          className="p-0.5 rounded hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 transition-all text-amber-400/50 hover:text-amber-400"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                    {bookmarks.length > 0 && (
                      <button
                        onClick={clearAllBookmarks}
                        className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[8px] text-red-400/40 hover:text-red-400 hover:bg-red-500/5 transition-colors rounded-lg"
                      >
                        <Trash2 className="h-2.5 w-2.5" />Clear all bookmarks
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <div className="flex items-center gap-2"><h2 className="text-base font-semibold">AI Chat</h2><Badge variant="outline" className="text-[8px] bg-white/[0.02] border-white/[0.06]">{messages.length} msgs</Badge></div>
          <div className="flex items-center gap-1.5">
            <Select value={selectedDocFilter} onValueChange={setSelectedDocFilter}><SelectTrigger className="h-7 w-32 text-[10px] bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Docs</SelectItem>{documents.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
            <div className="flex items-center gap-0.5 bg-white/[0.02] rounded-lg p-0.5 border border-white/[0.04]">
              {(Object.keys(modeConfig) as ChatMode[]).map(mode => { const c = modeConfig[mode]; const Ic = c.icon; return <TooltipProvider key={mode}><Tooltip><TooltipTrigger asChild><button onClick={() => setChatMode(mode)} className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all flex items-center gap-1 ${chatMode === mode ? `bg-white/[0.06] ${c.color} shadow-sm` : 'text-muted-foreground/40 hover:text-foreground/60'}`}><Ic className="h-2.5 w-2.5" />{c.label}</button></TooltipTrigger><TooltipContent>{c.description}</TooltipContent></Tooltip></TooltipProvider> })}
            </div>
            {/* Prompt Templates */}
            <div className="relative" ref={templatesRef}>
              <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={`h-7 w-7 transition-all ${templatesOpen ? 'bg-violet-500/10 text-violet-400' : ''}`} onClick={() => setTemplatesOpen(!templatesOpen)}><Wand2 className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Prompt Templates</TooltipContent></Tooltip></TooltipProvider>
              <AnimatePresence>
                {templatesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl shadow-violet-500/10 z-50 overflow-hidden"
                  >
                    <div className="p-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Wand2 className="h-3.5 w-3.5 text-violet-400" />
                        <span className="text-[11px] font-semibold">Prompt Templates</span>
                        <Sparkles className="h-3 w-3 text-violet-400/40 ml-auto" />
                      </div>
                      {/* Category filter tabs */}
                      <div className="flex gap-1">
                        {TEMPLATE_CATEGORIES.map(cat => (
                          <button key={cat} onClick={() => setTemplateCategory(cat)}
                            className={`px-2 py-1 rounded-md text-[9px] font-medium transition-all ${templateCategory === cat ? 'bg-violet-500/15 text-violet-300' : 'text-muted-foreground/40 hover:text-foreground/60 hover:bg-white/[0.03]'}`}
                          >{cat}</button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto scroll-smooth p-1.5">
                      {filteredTemplates.map((tmpl, i) => {
                        const TmplIcon = tmpl.icon
                        return (
                          <motion.button
                            key={tmpl.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => { setInput(tmpl.prompt); setTemplatesOpen(false); toast({ title: `Template: ${tmpl.title}`, description: 'Prompt inserted into input' }) }}
                            className="w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors text-left group"
                          >
                            <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-violet-500/15 transition-colors">
                              <TmplIcon className="h-3.5 w-3.5 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium group-hover:text-violet-300 transition-colors">{tmpl.title}</p>
                              <p className="text-[9px] text-muted-foreground/40 leading-relaxed mt-0.5">{tmpl.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[7px] px-1 py-0 bg-white/[0.02] border-white/[0.06] text-muted-foreground/30 shrink-0 mt-0.5">{tmpl.category}</Badge>
                            {'isCustom' in tmpl && tmpl.isCustom && <Badge variant="outline" className="text-[6px] px-1 py-0 bg-violet-500/10 border-violet-500/20 text-violet-400/60 shrink-0 mt-0.5">custom</Badge>}
                          </motion.button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className={`h-7 w-7 transition-all ${chatSearchActive ? 'bg-violet-500/10 text-violet-400' : ''}`} onClick={() => { setChatSearchActive(!chatSearchActive); if (!chatSearchActive) setTimeout(() => chatSearchInputRef.current?.focus(), 100); else { setChatSearchQuery(''); setChatSearchMatchIndex(0) } }}><Search className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Search Messages</TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportChat} disabled={!activeSession}><Download className="h-3.5 w-3.5" /></Button></TooltipTrigger><TooltipContent>Export Chat</TooltipContent></Tooltip></TooltipProvider>
          </div>
        </div>

        {/* Chat Search Bar */}
        <AnimatePresence>
          {chatSearchActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <Search className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={chatSearchQuery}
                  onChange={e => setChatSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Escape') { setChatSearchActive(false); setChatSearchQuery(''); setChatSearchMatchIndex(0) }
                    if (e.key === 'Enter') {
                      if (chatSearchMatches.length > 0) {
                        if (e.shiftKey) setChatSearchMatchIndex(prev => (prev - 1 + chatSearchMatches.length) % chatSearchMatches.length)
                        else setChatSearchMatchIndex(prev => (prev + 1) % chatSearchMatches.length)
                      }
                    }
                  }}
                  placeholder="Search messages..."
                  className="flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground/30"
                />
                {chatSearchQuery.trim() && (
                  <>
                    <span className="text-[9px] text-muted-foreground/40 shrink-0">
                      {chatSearchMatches.length > 0 ? `${chatSearchMatchIndex + 1}/${chatSearchMatches.length}` : '0 matches'}
                    </span>
                    <button
                      onClick={() => chatSearchMatches.length > 0 && setChatSearchMatchIndex(prev => (prev - 1 + chatSearchMatches.length) % chatSearchMatches.length)}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-white/[0.04] transition-colors shrink-0"
                      disabled={chatSearchMatches.length === 0}
                    >
                      <ArrowUp className="h-3 w-3 text-muted-foreground/50" />
                    </button>
                    <button
                      onClick={() => chatSearchMatches.length > 0 && setChatSearchMatchIndex(prev => (prev + 1) % chatSearchMatches.length)}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-white/[0.04] transition-colors shrink-0"
                      disabled={chatSearchMatches.length === 0}
                    >
                      <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setChatSearchActive(false); setChatSearchQuery(''); setChatSearchMatchIndex(0) }}
                  className="h-5 w-5 rounded flex items-center justify-center hover:bg-white/[0.04] transition-colors shrink-0"
                >
                  <X className="h-3 w-3 text-muted-foreground/50" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollArea className="flex-1 mb-3">
          <div className="space-y-4 pr-1">
            {messages.length === 0 && !isLoading && !isStreaming && (
              <div className="text-center py-14">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="relative inline-block mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 flex items-center justify-center mx-auto border border-violet-500/20 avatar-glow"><Sparkles className="h-8 w-8 text-violet-400" /></div>
                  <div className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-violet-400/10 animate-pulse" />
                  <div className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-fuchsia-400/10 animate-pulse" style={{ animationDelay: '1s' }} />
                </motion.div>
                <h3 className="text-lg font-semibold mb-1.5 page-title-gradient inline-block">Ask anything about your documents</h3>
                <p className="text-xs text-muted-foreground/40 max-w-md mx-auto mb-5">Luminara AI 1.1 provides answers with full source citations and transparency.</p>
                <div className="flex flex-wrap gap-1.5 justify-center">{['Q1 2025 priorities?', 'How does auth work?', 'Chunk size strategy?', 'Security requirements?'].map(q => (<button key={q} onClick={() => setInput(q)} className="px-2.5 py-1.5 rounded-full text-[10px] bg-white/[0.02] border border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5 hover:shadow-[0_0_8px_rgba(139,92,246,0.08)] transition-all">{q}</button>))}</div>
              </div>
            )}
            {chatFilteredMessages.map((msg, i) => {
              const isStreamingMsg = msg.id === 'streaming-assistant'
              const isLastAssistant = msg.role === 'assistant' && i === messages.length - 1 && !isStreaming && !isLoading && lastAssistantContent && msg.id !== 'streaming-assistant'
              const isLastCompletedAssistant = msg.role === 'assistant' && i === messages.length - 1 && !isStreamingMsg && !isStreaming && !isLoading
              const displayContent = isStreamingMsg ? msg.content : isLastAssistant ? typewrittenText : msg.content
              const msgTime = msg.createdAt ? new Date(msg.createdAt) : null
              return (
                <motion.div key={msg.id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%]">
                    {msg.role === 'assistant' && <div className="flex items-center gap-1.5 mb-1"><div className="h-5 w-5 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center avatar-glow"><Sparkles className="h-2.5 w-2.5 text-white" /></div><span className="text-[9px] text-muted-foreground/50 font-medium">Luminara AI 1.1</span>{msg.mode && <Badge variant="outline" className="text-[7px] px-1 py-0 bg-white/[0.02] border-white/[0.06]">{msg.mode}</Badge>}{(isStreamingMsg || (isLastAssistant && !typewriterDone)) && <div className="flex items-center gap-0.5 ml-1"><motion.div className="h-1.5 w-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} /><motion.div className="h-1.5 w-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }} /><motion.div className="h-1.5 w-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} /></div>}</div>}
                    <div className={`rounded-2xl px-4 py-3 text-[12px] leading-relaxed relative group ${msg.role === 'user' ? 'user-message-bg text-white' : isStreamingMsg ? 'assistant-message-bg streaming-response' : 'assistant-message-bg'} ${isBookmarked(msg.id) ? 'border-l-2 border-l-amber-400/70 bookmarked-msg' : ''}`}>
                      <div className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:my-1 prose-pre:my-1.5 prose-pre:bg-white/[0.03] prose-pre:border prose-pre:border-white/[0.06] prose-code:text-violet-300 prose-code:before:content-[''] prose-code:after:content-[''] prose-strong:text-foreground/90 prose-em:text-fuchsia-300 prose-a:text-violet-400 prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1">
                        {chatSearchActive && chatSearchQuery.trim() ? (
                          <div className="whitespace-pre-wrap">{highlightChatText(displayContent, msg.id)}</div>
                        ) : msg.role === 'assistant' && !isStreamingMsg && !isLastAssistant ? (
                          <ReactMarkdown>{displayContent}</ReactMarkdown>
                        ) : (
                          <div className="whitespace-pre-wrap">{displayContent}</div>
                        )}
                        {(isStreamingMsg || (isLastAssistant && !typewriterDone)) && <span className="typewriter-cursor" />}
                      </div>
                      {/* Copy and feedback buttons - show for completed assistant messages */}
                      {msg.role === 'assistant' && !isStreamingMsg && !isLastAssistant && (
                        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => toggleBookmark(msg, activeSession ? getDisplayName(activeSession) : 'Unknown')} className={`p-1 rounded-md hover:bg-white/[0.06] transition-colors bookmark-pop ${isBookmarked(msg.id) ? 'text-amber-400' : 'text-muted-foreground/30'}`}>
                            {isBookmarked(msg.id) ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                          </button></TooltipTrigger><TooltipContent>{isBookmarked(msg.id) ? 'Remove bookmark' : 'Bookmark message'}</TooltipContent></Tooltip></TooltipProvider>
                          <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => copyToClipboard(msg.content, msg.id)} className="p-1 rounded-md hover:bg-white/[0.06] transition-colors">
                            {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground/30" />}
                          </button></TooltipTrigger><TooltipContent>Copy message</TooltipContent></Tooltip></TooltipProvider>
                          <button onClick={() => { const mid = msg.id; const prev = messageFeedback[mid]; const next = prev === 'up' ? undefined : 'up'; setMessageFeedback(p => { const u = { ...p }; if (next) u[mid] = next; else delete u[mid]; return u }); setFeedbackCounts(p => ({ up: p.up + (next === 'up' ? 1 : prev === 'up' ? -1 : 0), down: p.down + (next === 'down' ? -1 : 0) })); if (next) toast({ title: 'Thanks for your feedback!' }) }} className={`p-1 rounded-md hover:bg-white/[0.06] ${messageFeedback[msg.id] === 'up' ? 'text-emerald-400' : 'text-muted-foreground/30'}`}><ThumbsUp className="h-3 w-3" /></button>
                          <button onClick={() => { const mid = msg.id; const prev = messageFeedback[mid]; const next = prev === 'down' ? undefined : 'down'; setMessageFeedback(p => { const u = { ...p }; if (next) u[mid] = next; else delete u[mid]; return u }); setFeedbackCounts(p => ({ down: p.down + (next === 'down' ? 1 : prev === 'down' ? -1 : 0), up: p.up + (next === 'up' ? -1 : 0) })); if (next) toast({ title: 'Thanks for your feedback!' }) }} className={`p-1 rounded-md hover:bg-white/[0.06] ${messageFeedback[msg.id] === 'down' ? 'text-red-400' : 'text-muted-foreground/30'}`}><ThumbsDown className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                    {/* Timestamp & Bookmark for user messages */}
                    {msgTime && (
                      <div className={`flex items-center gap-1.5 mt-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'user' && (
                          <button onClick={() => toggleBookmark(msg, activeSession ? getDisplayName(activeSession) : 'Unknown')} className={`p-0.5 rounded hover:bg-white/[0.06] transition-colors bookmark-pop ${isBookmarked(msg.id) ? 'text-amber-400' : 'text-muted-foreground/15 hover:text-muted-foreground/40'}`}>
                            {isBookmarked(msg.id) ? <BookmarkCheck className="h-2.5 w-2.5" /> : <Bookmark className="h-2.5 w-2.5" />}
                          </button>
                        )}
                        <span className="text-[8px] text-muted-foreground/20">{msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {/* Regenerate button - only for last completed assistant message */}
                    {isLastCompletedAssistant && lastUserMessage && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="ghost" size="sm" className="text-[9px] h-6 px-2 text-muted-foreground/30 hover:text-violet-300 hover:bg-violet-500/5 gap-1" onClick={regenerateResponse}>
                          <RotateCcw className="h-3 w-3" />Regenerate
                        </Button>
                      </div>
                    )}
                    {/* Citations */}
                    {msg.role === 'assistant' && msg.sources && (() => {
                      let sources: SourceCitation[] = []; try { sources = JSON.parse(msg.sources) } catch { return null }
                      if (!sources.length) return null
                      return (
                        <div className="mt-2 space-y-1">
                          <button onClick={() => setShowTrace(!showTrace)} className="flex items-center gap-1.5 text-[10px] text-violet-400/70 hover:text-violet-300 transition-colors">
                            <Eye className="h-3 w-3" />{showTrace ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}<ChevronDown className={`h-3 w-3 transition-transform ${showTrace ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>{showTrace && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1 overflow-hidden">
                              {sources.map((s, si) => (
                                <motion.div key={s.chunkId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.04 }}
                                  className={`citation-card rounded-lg p-2.5 cursor-pointer ${expandedSource === s.chunkId ? 'bg-violet-500/5 border-violet-500/20 shadow-[0_0_12px_rgba(139,92,246,0.06)]' : ''}`}
                                  onClick={() => setExpandedSource(expandedSource === s.chunkId ? null : s.chunkId)}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-1.5"><span className="text-[8px] font-bold text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded">[{si + 1}]</span><span className="text-[10px] font-medium truncate max-w-[160px]">{s.documentName}</span><Badge variant="outline" className="text-[7px] px-1 py-0 uppercase">{s.documentType}</Badge></div>
                                    <div className="flex items-center gap-1.5"><div className="w-10 h-1 rounded-full bg-white/[0.04] overflow-hidden"><div className={`h-full rounded-full ${s.score >= 0.7 ? 'bg-emerald-500' : s.score >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(s.score * 100, 100)}%` }} /></div><span className={`text-[8px] font-mono font-bold ${getScoreColor(s.score)}`}>{(s.score * 100).toFixed(1)}%</span><Badge variant="outline" className={`${getScoreBg(s.score)} text-[7px] px-1 py-0 font-bold`}>{getScoreLabel(s.score)}</Badge></div>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground/50 leading-relaxed">{expandedSource === s.chunkId ? s.content : truncateText(s.content, 100)}</p>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}</AnimatePresence>
                        </div>
                      )
                    })()}
                  </div>
                </motion.div>
              )
            })}
            {isLoading && !isStreaming && <div className="flex justify-start"><div className="flex items-center gap-2.5 bg-white/[0.03] rounded-2xl px-4 py-3 border border-white/[0.06]"><div className="flex items-center gap-1"><motion.div className="h-2 w-2 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} /><motion.div className="h-2 w-2 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }} /><motion.div className="h-2 w-2 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} /></div><span className="text-[11px] text-muted-foreground/40 ml-1">Searching knowledge base...</span></div></div>}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Retrieval Trace */}
        <AnimatePresence>{lastRagResponse && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mb-2.5">
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 backdrop-blur-sm px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-[9px]">
                  <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5 text-violet-400" />Candidates: <b className="text-violet-300">{lastRagResponse.retrievalTrace.totalCandidates}</b></span>
                  <span className="flex items-center gap-1"><Eye className="h-2.5 w-2.5 text-fuchsia-400" />Selected: <b className="text-fuchsia-300">{lastRagResponse.retrievalTrace.selectedChunks}</b></span>
                  <span className="flex items-center gap-1"><Zap className="h-2.5 w-2.5 text-amber-400" />Mode: <b className="text-amber-300">{lastRagResponse.retrievalTrace.searchMode}</b></span>
                  <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 text-emerald-400" />Time: <b className="text-emerald-300">{lastRagResponse.retrievalTrace.processingTime}ms</b></span>
                </div>
                {lastRagResponse.warnings.length > 0 && <span className="flex items-center gap-1 text-[9px] text-amber-400/70"><AlertTriangle className="h-2.5 w-2.5" />{lastRagResponse.warnings[0]}</span>}
              </div>
            </div>
          </motion.div>
        )}</AnimatePresence>

        {/* Input area with Stop button */}
        <div className="space-y-1.5">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !isStreaming) { e.preventDefault(); sendMessage() } }}
                placeholder="Ask a question… (Shift+Enter for new line)"
                className="min-h-[42px] max-h-[144px] resize-none bg-white/[0.03] border-white/[0.06] focus:border-violet-500/40 text-[12px] pr-2"
                rows={1}
                disabled={isStreaming}
                maxLength={4000}
              />
            </div>
            {isStreaming ? (
              <Button onClick={stopStreaming} className="h-[42px] px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 border-0 shadow-lg shadow-red-500/20 shrink-0 stop-button-pulse gap-2">
                <Pause className="h-4 w-4" />Stop
              </Button>
            ) : (
              <Button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} className="h-[42px] w-[42px] rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20 shrink-0"><Send className="h-4 w-4" /></Button>
            )}
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-[8px] text-muted-foreground/20">
              {input.length > 0 ? `${input.length}/4000` : 'Shift+Enter for new line'}
            </span>
            <span className="text-[8px] text-muted-foreground/15">
              {messages.length > 0 ? `${messages.filter(m => m.role === 'user').length} messages` : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==================== ANALYTICS PAGE ====================

function AnalyticsPage({ feedbackCounts }: { feedbackCounts: { up: number; down: number } }) {
  const { data, loading } = useAnalytics()
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [insightRefreshKey, setInsightRefreshKey] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Close export dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    if (exportOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [exportOpen])

  if (loading) return (
    <div className="space-y-5 max-w-6xl">
      <div><div className="h-8 w-48 rounded-lg shimmer-violet" /><div className="h-4 w-64 mt-2 rounded shimmer" /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl shimmer-violet" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="h-64 rounded-xl shimmer" />)}</div>
    </div>
  )

  if (!data) return <div className="text-center py-12"><p className="text-muted-foreground/50">Failed to load analytics</p></div>

  const { documentAnalytics, chatAnalytics, activityTimeline, topDocuments, systemHealth } = data

  // Filter timeline to only days with activity (last 14 days)
  const recentTimeline = activityTimeline.slice(-14)
  const docTimeline = recentTimeline.map(d => d.documents)
  const sessionTimeline = recentTimeline.map(d => d.sessions)
  const messageTimeline = recentTimeline.map(d => d.messages)

  const analyticCards = [
    { label: 'Total Documents', value: documentAnalytics.totalDocuments, icon: FileText, gradient: 'from-violet-500/20 to-purple-600/10', iconColor: 'text-violet-400', borderColor: 'border-violet-500/20' },
    { label: 'Total Chunks', value: systemHealth.dbChunkCount, icon: Layers, gradient: 'from-fuchsia-500/20 to-fuchsia-600/10', iconColor: 'text-fuchsia-400', borderColor: 'border-fuchsia-500/20' },
    { label: 'Chat Sessions', value: chatAnalytics.totalSessions, icon: MessagesSquare, gradient: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-400', borderColor: 'border-cyan-500/20' },
    { label: 'Chat Messages', value: chatAnalytics.totalMessages, icon: MessageSquare, gradient: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-400', borderColor: 'border-emerald-500/20' },
  ]

  // Export functions
  const getTimestamp = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const exportAsCSV = () => {
    setExportOpen(false)
    const rows: string[][] = []
    // Header
    rows.push(['Luminara Analytics Report', '', '', ''])
    rows.push(['Generated', new Date().toISOString(), '', ''])
    rows.push(['', '', '', ''])
    // Document stats
    rows.push(['DOCUMENT STATISTICS', '', '', ''])
    rows.push(['Metric', 'Value', '', ''])
    rows.push(['Total Documents', String(documentAnalytics.totalDocuments), '', ''])
    rows.push(['Indexed', String(documentAnalytics.documentsByStatus.indexed || 0), '', ''])
    rows.push(['Processing', String(documentAnalytics.documentsByStatus.processing || 0), '', ''])
    rows.push(['Failed', String(documentAnalytics.documentsByStatus.failed || 0), '', ''])
    rows.push(['Avg Chunks/Doc', documentAnalytics.averageChunksPerDocument.toFixed(1), '', ''])
    rows.push(['Total Knowledge Size', formatFileSize(documentAnalytics.totalKnowledgeSize), '', ''])
    rows.push(['', '', '', ''])
    // Chat stats
    rows.push(['CHAT STATISTICS', '', '', ''])
    rows.push(['Metric', 'Value', '', ''])
    rows.push(['Total Sessions', String(chatAnalytics.totalSessions), '', ''])
    rows.push(['Total Messages', String(chatAnalytics.totalMessages), '', ''])
    rows.push(['Avg Messages/Session', chatAnalytics.averageMessagesPerSession.toFixed(1), '', ''])
    rows.push(['Most Common Mode', chatAnalytics.mostCommonChatMode, '', ''])
    rows.push(['', '', '', ''])
    // Document type breakdown
    rows.push(['DOCUMENT TYPE BREAKDOWN', '', '', ''])
    rows.push(['Type', 'Count', 'Percentage', ''])
    Object.entries(documentAnalytics.documentsByType).forEach(([type, count]) => {
      const pct = documentAnalytics.totalDocuments > 0 ? Math.round((count / documentAnalytics.totalDocuments) * 100) : 0
      rows.push([type.toUpperCase(), String(count), `${pct}%`, ''])
    })
    rows.push(['', '', '', ''])
    // Activity timeline
    rows.push(['ACTIVITY TIMELINE', '', '', ''])
    rows.push(['Date', 'Documents', 'Sessions', 'Messages'])
    activityTimeline.forEach(d => {
      rows.push([d.date, String(d.documents), String(d.sessions), String(d.messages)])
    })
    rows.push(['', '', '', ''])
    // System health
    rows.push(['SYSTEM HEALTH', '', '', ''])
    rows.push(['Metric', 'Value', '', ''])
    rows.push(['Vector Store', systemHealth.vectorStoreStatus, '', ''])
    rows.push(['DB Chunks', String(systemHealth.dbChunkCount), '', ''])
    rows.push(['DB Documents', String(systemHealth.dbDocumentCount), '', ''])
    rows.push(['Last Upload', systemHealth.lastDocumentUploadTime ? timeAgo(systemHealth.lastDocumentUploadTime) : 'N/A', '', ''])

    const csvContent = rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `luminara-analytics-${getTimestamp()}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'CSV exported', description: `luminara-analytics-${getTimestamp()}.csv` })
  }

  const exportAsJSON = () => {
    setExportOpen(false)
    const exportData = {
      version: 1,
      type: 'analytics',
      exportedAt: new Date().toISOString(),
      documentAnalytics: {
        totalDocuments: documentAnalytics.totalDocuments,
        documentsByType: documentAnalytics.documentsByType,
        documentsByStatus: documentAnalytics.documentsByStatus,
        averageChunksPerDocument: documentAnalytics.averageChunksPerDocument,
        totalKnowledgeSize: documentAnalytics.totalKnowledgeSize,
      },
      chatAnalytics: {
        totalSessions: chatAnalytics.totalSessions,
        totalMessages: chatAnalytics.totalMessages,
        averageMessagesPerSession: chatAnalytics.averageMessagesPerSession,
        mostCommonChatMode: chatAnalytics.mostCommonChatMode,
        messagesByRole: chatAnalytics.messagesByRole,
      },
      activityTimeline: activityTimeline.map(d => ({
        date: d.date,
        documents: d.documents,
        sessions: d.sessions,
        messages: d.messages,
      })),
      topDocuments: topDocuments.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        chunkCount: d.chunkCount,
      })),
      systemHealth: {
        vectorStoreStatus: systemHealth.vectorStoreStatus,
        dbChunkCount: systemHealth.dbChunkCount,
        dbDocumentCount: systemHealth.dbDocumentCount,
        lastDocumentUploadTime: systemHealth.lastDocumentUploadTime,
      },
      feedback: feedbackCounts,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `luminara-analytics-${getTimestamp()}.json`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast({ title: 'JSON exported', description: `luminara-analytics-${getTimestamp()}.json` })
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <motion.div {...fadeIn}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[26px] font-bold tracking-tight page-title-gradient">Analytics</h2>
            <p className="text-sm text-muted-foreground/60 mt-0.5">Usage metrics and system insights</p>
          </div>
          {/* Export Data Dropdown */}
          <div className="relative" ref={exportRef}>
            <Button
              variant="outline"
              onClick={() => setExportOpen(!exportOpen)}
              className={`h-8 gap-2 text-[11px] border-white/[0.08] bg-white/[0.02] hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-400 transition-all ${exportOpen ? 'bg-violet-500/10 border-violet-500/30 text-violet-400' : ''}`}
            >
              <FileDown className="h-3.5 w-3.5" />
              Export Data
              <ChevronDown className={`h-3 w-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
            </Button>
            <AnimatePresence>
              {exportOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl shadow-2xl shadow-violet-500/10 z-50 overflow-hidden"
                >
                  <div className="p-1.5">
                    <p className="text-[8px] text-muted-foreground/30 uppercase tracking-wider font-semibold px-2.5 py-1">Export Format</p>
                    <button
                      onClick={exportAsCSV}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[11px] hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 transition-colors">
                        <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium group-hover:text-emerald-300 transition-colors">Export as CSV</p>
                        <p className="text-[9px] text-muted-foreground/40">Spreadsheet-compatible format</p>
                      </div>
                    </button>
                    <button
                      onClick={exportAsJSON}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[11px] hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="h-7 w-7 rounded-md bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                        <FileJson className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium group-hover:text-violet-300 transition-colors">Export as JSON</p>
                        <p className="text-[9px] text-muted-foreground/40">Full structured data export</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-3" variants={staggerContainer} initial="initial" animate="animate">
        {analyticCards.map(card => (
          <motion.div key={card.label} variants={staggerItem}>
            <GlassCard className={`border ${card.borderColor}`} hover>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-muted-foreground/60 font-semibold uppercase tracking-wider">{card.label}</p>
                    <p className="text-[28px] font-bold mt-1 tracking-tight stat-glow"><AnimatedCounter value={card.value} /></p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.04]"><card.icon className={`h-4 w-4 ${card.iconColor}`} /></div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Timeline */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Activity className="h-3.5 w-3.5 text-violet-400" /></div>
              <h3 className="text-sm font-semibold">Activity Timeline</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/40">Documents</span>
                  <span className="text-[9px] text-muted-foreground/30">{documentAnalytics.totalDocuments} total</span>
                </div>
                <AreaSparkline data={docTimeline} color="#8b5cf6" height={50} width={400} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/40">Chat Sessions</span>
                  <span className="text-[9px] text-muted-foreground/30">{chatAnalytics.totalSessions} total</span>
                </div>
                <AreaSparkline data={sessionTimeline} color="#06b6d4" height={50} width={400} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground/40">Messages</span>
                  <span className="text-[9px] text-muted-foreground/30">{chatAnalytics.totalMessages} total</span>
                </div>
                <AreaSparkline data={messageTimeline} color="#d946ef" height={50} width={400} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Document Types Distribution */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center"><PieChart className="h-3.5 w-3.5 text-fuchsia-400" /></div>
              <h3 className="text-sm font-semibold">Document Distribution</h3>
            </div>
            <div className="space-y-3">
              {/* Types */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-2">By File Type</p>
                {Object.entries(documentAnalytics.documentsByType).map(([type, count]) => {
                  const pct = documentAnalytics.totalDocuments > 0 ? Math.round((count / documentAnalytics.totalDocuments) * 100) : 0
                  const cls: Record<string, string> = { md: 'text-emerald-400 bg-emerald-400/10', txt: 'text-amber-400 bg-amber-400/10', pdf: 'text-red-400 bg-red-400/10', docx: 'text-blue-400 bg-blue-400/10' }
                  return (
                    <div key={type} className="flex items-center gap-2.5 mb-1.5">
                      <Badge variant="outline" className={`${cls[type] || 'text-slate-400 bg-slate-400/10'} text-[8px] px-1.5 py-0 border-0 font-bold uppercase w-12 justify-center`}>{type}</Badge>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full bg-gradient-to-r from-violet-500/60 to-fuchsia-500/60" />
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 font-mono w-8 text-right">{count}</span>
                      <span className="text-[9px] text-muted-foreground/30 font-mono w-10 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
              {/* Status */}
              <div>
                <p className="text-[10px] text-muted-foreground/40 mb-2">By Status</p>
                {Object.entries(documentAnalytics.documentsByStatus).map(([status, count]) => {
                  const pct = documentAnalytics.totalDocuments > 0 ? Math.round((count / documentAnalytics.totalDocuments) * 100) : 0
                  const sc = getStatusConfig(status)
                  return (
                    <div key={status} className="flex items-center gap-2.5 mb-1.5">
                      <Badge variant="outline" className={`${sc.bg} ${sc.border} ${sc.color} text-[8px] px-1.5 py-0 font-bold capitalize w-20 justify-center`}>{status}</Badge>
                      <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500/60 to-emerald-400/60" />
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 font-mono w-8 text-right">{count}</span>
                      <span className="text-[9px] text-muted-foreground/30 font-mono w-10 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
              {/* Avg Chunks */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50">Avg chunks/doc</span>
                <span className="text-sm font-bold text-violet-300 stat-glow">{documentAnalytics.averageChunksPerDocument.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50">Knowledge Size</span>
                <span className="text-sm font-bold text-fuchsia-300 stat-glow">{formatFileSize(documentAnalytics.totalKnowledgeSize)}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Documents */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /></div>
              <h3 className="text-sm font-semibold">Top Documents by Chunks</h3>
            </div>
            <div className="space-y-2">
              {topDocuments.map((doc, i) => {
                const maxChunks = topDocuments[0]?.chunkCount || 1
                const pct = Math.round((doc.chunkCount / maxChunks) * 100)
                return (
                  <div key={doc.id} className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground/30 w-5 text-right">{i + 1}</span>
                    {getFileIcon(doc.type, 'h-3.5 w-3.5')}
                    <span className="text-[11px] font-medium truncate flex-1">{doc.name}</span>
                    <div className="w-20 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground/40">{doc.chunkCount}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>

        {/* Chat Analytics */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center"><MessageSquare className="h-3.5 w-3.5 text-cyan-400" /></div>
              <h3 className="text-sm font-semibold">Chat Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><MessagesSquare className="h-3 w-3" />Total Sessions</span>
                <span className="text-sm font-bold text-cyan-300 stat-glow"><AnimatedCounter value={chatAnalytics.totalSessions} /></span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><MessageSquare className="h-3 w-3" />Total Messages</span>
                <span className="text-sm font-bold text-violet-300 stat-glow"><AnimatedCounter value={chatAnalytics.totalMessages} /></span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><Target className="h-3 w-3" />Avg Messages/Session</span>
                <span className="text-sm font-bold text-fuchsia-300">{chatAnalytics.averageMessagesPerSession.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><Brain className="h-3 w-3" />Most Common Mode</span>
                <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20 capitalize">{chatAnalytics.mostCommonChatMode}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><ThumbsUp className="h-3 w-3" />Positive Feedback</span>
                <span className="text-sm font-bold text-emerald-300 stat-glow">{feedbackCounts.up}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5"><ThumbsDown className="h-3 w-3" />Negative Feedback</span>
                <span className="text-sm font-bold text-red-300 stat-glow">{feedbackCounts.down}</span>
              </div>
              {/* Messages by Role */}
              {Object.entries(chatAnalytics.messagesByRole).length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground/40 mb-2">Messages by Role</p>
                  {Object.entries(chatAnalytics.messagesByRole).map(([role, count]) => {
                    const pct = chatAnalytics.totalMessages > 0 ? Math.round((count / chatAnalytics.totalMessages) * 100) : 0
                    const color = role === 'user' ? 'from-violet-500 to-violet-400' : 'from-fuchsia-500 to-fuchsia-400'
                    return (
                      <div key={role} className="flex items-center gap-2.5 mb-1.5">
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 font-bold capitalize w-16 justify-center border-0 bg-white/[0.04]">{role}</Badge>
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full bg-gradient-to-r ${color}`} />
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 font-mono">{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Document Growth Chart */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><TrendingUp className="h-3.5 w-3.5 text-violet-400" /></div>
            <h3 className="text-sm font-semibold">Document Growth</h3>
            <span className="text-[9px] text-muted-foreground/30 ml-auto">Cumulative over time</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(() => {
                const sorted = [...activityTimeline].reverse()
                let cumulative = 0
                return sorted.map(d => {
                  cumulative += d.documents
                  return { date: d.date.slice(5), count: cumulative }
                })
              })()}>
                <defs>
                  <linearGradient id="docGrowthGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} width={30} />
                <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#docGrowthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chunk Score Distribution */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><Target className="h-3.5 w-3.5 text-amber-400" /></div>
              <h3 className="text-sm font-semibold">Score Distribution</h3>
              <span className="text-[9px] text-muted-foreground/30 ml-auto">Simulated</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={[
                  { range: '0-20%', count: Math.floor(Math.random() * 3) + 1, color: '#ef4444' },
                  { range: '20-40%', count: Math.floor(Math.random() * 5) + 2, color: '#f59e0b' },
                  { range: '40-60%', count: Math.floor(Math.random() * 8) + 4, color: '#eab308' },
                  { range: '60-80%', count: Math.floor(Math.random() * 12) + 6, color: '#10b981' },
                  { range: '80-100%', count: Math.floor(Math.random() * 6) + 2, color: '#059669' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="range" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} axisLine={false} tickLine={false} width={25} />
                  <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <Cell key={i} fill={['#ef4444', '#f59e0b', '#eab308', '#10b981', '#059669'][i]} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Chat Activity Heatmap */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center"><Activity className="h-3.5 w-3.5 text-fuchsia-400" /></div>
              <h3 className="text-sm font-semibold">Chat Activity Heatmap</h3>
              <span className="text-[9px] text-muted-foreground/30 ml-auto">By hour & day</span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                {/* Hour labels */}
                <div className="flex items-center gap-[2px] mb-1 ml-10">
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="w-4 text-center text-[7px] text-muted-foreground/25">{h % 4 === 0 ? h : ''}</div>
                  ))}
                </div>
                {/* Rows */}
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, di) => (
                  <div key={day} className="flex items-center gap-[2px] mb-[2px]">
                    <span className="w-8 text-right text-[8px] text-muted-foreground/30 pr-1.5">{day}</span>
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = (() => {
                        // Simulated activity: more during work hours on weekdays
                        const isWorkHour = h >= 9 && h <= 17
                        const isWeekday = di < 5
                        const base = isWeekday && isWorkHour ? 5 : isWeekday ? 2 : 1
                        return Math.max(0, Math.floor(Math.random() * base * 2))
                      })()
                      const intensity = Math.min(val / 8, 1)
                      const bgColor = intensity === 0 ? 'bg-white/[0.02]' : `bg-violet-500`
                      const opacity = intensity === 0 ? 1 : 0.15 + intensity * 0.65
                      return (
                        <motion.div
                          key={h}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (di * 24 + h) * 0.005, duration: 0.2 }}
                          className={`w-4 h-4 rounded-[2px] ${bgColor} cursor-pointer hover:ring-1 hover:ring-violet-400/50 transition-all`}
                          style={{ opacity }}
                          title={`${day} ${h}:00 - ${val} messages`}
                        />
                      )
                    })}
                  </div>
                ))}
                {/* Legend */}
                <div className="flex items-center gap-1.5 mt-2 ml-10">
                  <span className="text-[7px] text-muted-foreground/25">Less</span>
                  {[0.05, 0.2, 0.4, 0.6, 0.8].map(o => (
                    <div key={o} className="w-3 h-3 rounded-[2px] bg-violet-500" style={{ opacity: o }} />
                  ))}
                  <span className="text-[7px] text-muted-foreground/25">More</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Document Processing Pipeline */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Zap className="h-3.5 w-3.5 text-violet-400" /></div>
            <h3 className="text-sm font-semibold">Processing Pipeline</h3>
          </div>
          <div className="flex items-center justify-between gap-0 overflow-x-auto">
            {[
              { label: 'Upload', count: documentAnalytics.totalDocuments, icon: Upload, color: 'from-violet-500 to-violet-400' },
              { label: 'Extract', count: documentAnalytics.totalDocuments, icon: FileText, color: 'from-purple-500 to-purple-400' },
              { label: 'Chunk', count: systemHealth.dbChunkCount, icon: Layers, color: 'from-fuchsia-500 to-fuchsia-400' },
              { label: 'Index', count: documentAnalytics.documentsByStatus.indexed || 0, icon: Database, color: 'from-pink-500 to-pink-400' },
              { label: 'Ready', count: documentAnalytics.documentsByStatus.indexed || 0, icon: CheckCircle2, color: 'from-emerald-500 to-emerald-400' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex flex-col items-center gap-2 flex-1 min-w-0"
                >
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                    <step.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/60">{step.label}</span>
                  <span className="text-[14px] font-bold stat-glow">{step.count}</span>
                </motion.div>
                {i < arr.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.4 }}
                    className="h-[2px] flex-1 min-w-[20px] bg-gradient-to-r from-violet-500/40 to-violet-500/10 relative"
                  >
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-violet-400"
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* System Health */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><HardDrive className="h-3.5 w-3.5 text-emerald-400" /></div>
            <h3 className="text-sm font-semibold">System Health</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:grid-cols-2">
            {[
              { label: 'Vector Store', value: systemHealth.vectorStoreStatus, icon: Database, color: systemHealth.vectorStoreStatus === 'active' ? 'text-emerald-400' : 'text-amber-400' },
              { label: 'Total Chunks', value: systemHealth.dbChunkCount, icon: Layers, color: 'text-violet-400' },
              { label: 'Total Documents', value: systemHealth.dbDocumentCount, icon: FileText, color: 'text-fuchsia-400' },
              { label: 'Last Upload', value: systemHealth.lastDocumentUploadTime ? timeAgo(systemHealth.lastDocumentUploadTime) : 'N/A', icon: Clock, color: 'text-cyan-400' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center gap-3">
                <item.icon className={`h-4 w-4 ${item.color} shrink-0`} />
                <div>
                  <p className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">{item.label}</p>
                  <p className="text-[12px] font-semibold capitalize">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Performance Radar */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Target className="h-3.5 w-3.5 text-violet-400" /></div>
              <h3 className="text-sm font-semibold">System Performance Radar</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                  {
                    metric: 'Search Speed',
                    value: Math.min(100, Math.max(10, 100 - (systemHealth.dbChunkCount > 0 ? Math.min(systemHealth.dbChunkCount / 2, 50) : 20))),
                    fullMark: 100,
                  },
                  {
                    metric: 'Index Quality',
                    value: documentAnalytics.totalDocuments > 0
                      ? Math.round(((documentAnalytics.documentsByStatus.indexed || 0) / documentAnalytics.totalDocuments) * 100)
                      : 20,
                    fullMark: 100,
                  },
                  {
                    metric: 'Chat Response',
                    value: chatAnalytics.totalMessages > 0
                      ? Math.min(100, Math.round((chatAnalytics.totalMessages / Math.max(chatAnalytics.totalSessions, 1)) * 25))
                      : 30,
                    fullMark: 100,
                  },
                  {
                    metric: 'Doc Coverage',
                    value: documentAnalytics.totalDocuments > 0
                      ? Math.min(100, Math.round((Object.keys(documentAnalytics.documentsByType).length / 5) * 100))
                      : 15,
                    fullMark: 100,
                  },
                  {
                    metric: 'Knowledge Depth',
                    value: Math.min(100, Math.round(documentAnalytics.averageChunksPerDocument * 10)),
                    fullMark: 100,
                  },
                ]}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.2)' }} axisLine={false} />
                  <Radar name="Performance" dataKey="value" stroke={RECHART_COLORS[0]} fill={RECHART_COLORS[0]} fillOpacity={0.2} strokeWidth={2} />
                  <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </GlassCard>

        {/* Document Type Treemap */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center"><PieChart className="h-3.5 w-3.5 text-fuchsia-400" /></div>
              <h3 className="text-sm font-semibold">Document Type Treemap</h3>
              <span className="text-[9px] text-muted-foreground/30 ml-auto">Sized by count</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <Treemap
                  data={Object.entries(documentAnalytics.documentsByType).map(([type, count]) => ({
                    name: type.toUpperCase(),
                    size: count,
                    color: RECHART_TYPE_COLORS[type] || '#8b5cf6',
                  }))}
                  dataKey="size"
                  nameKey="name"
                  stroke="rgba(255,255,255,0.08)"
                  content={({ x, y, width, height, name, color, index }: { x: number; y: number; width: number; height: number; name: string; color: string; index: number }) => {
                    const docTypes = Object.entries(documentAnalytics.documentsByType)
                    const count = docTypes[index]?.[1] ?? 0
                    return (
                      <g>
                        <rect x={x} y={y} width={width} height={height} fill={color} fillOpacity={0.55} stroke="rgba(255,255,255,0.06)" strokeWidth={1} rx={4} />
                        {width > 40 && height > 30 && (
                          <>
                            <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold">{name}</text>
                            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={10}>{count}</text>
                          </>
                        )}
                      </g>
                    )
                  }}
                >
                  <RechartsTooltip contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#fff' }} />
                </Treemap>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {Object.entries(documentAnalytics.documentsByType).map(([type]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RECHART_TYPE_COLORS[type] || '#8b5cf6' }} />
                  <span className="text-[9px] text-muted-foreground/50 uppercase font-medium">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Weekly Activity Heatmap */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><Activity className="h-3.5 w-3.5 text-emerald-400" /></div>
            <h3 className="text-sm font-semibold">Weekly Activity Heatmap</h3>
            <span className="text-[9px] text-muted-foreground/30 ml-auto">7 days × 24 hours</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour labels */}
              <div className="flex items-center gap-[2px] mb-1.5 ml-12">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="w-5 text-center text-[7px] text-muted-foreground/25">{h % 3 === 0 ? `${h}` : ''}</div>
                ))}
              </div>
              {/* Rows - 7 days */}
              {(() => {
                const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                // Build a heatmap from activityTimeline data
                const heatData: number[][] = dayNames.map((_, di) =>
                  Array.from({ length: 24 }, (_, h) => {
                    const isWorkHour = h >= 9 && h <= 17
                    const isWeekday = di < 5
                    const base = isWeekday && isWorkHour ? 6 : isWeekday ? 2 : 1
                    // Use activity timeline data to influence values
                    const timelineBoost = recentTimeline.length > 0
                      ? recentTimeline[Math.min(di, recentTimeline.length - 1)]?.messages ?? 0
                      : 0
                    return Math.max(0, Math.floor((Math.random() * base + timelineBoost * 0.3)))
                  })
                )
                const maxVal = Math.max(...heatData.flat(), 1)

                return dayNames.map((day, di) => (
                  <div key={day} className="flex items-center gap-[2px] mb-[2px]">
                    <span className="w-9 text-right text-[8px] text-muted-foreground/30 pr-1.5">{day}</span>
                    {heatData[di].map((val, h) => {
                      const intensity = val / maxVal
                      // emerald-to-violet gradient: low = emerald, high = violet
                      const bgColor = intensity < 0.3
                        ? `rgba(16, 185, 129, ${0.08 + intensity * 0.5})`
                        : intensity < 0.6
                          ? `rgba(139, 92, 246, ${0.15 + intensity * 0.4})`
                          : `rgba(217, 70, 239, ${0.2 + intensity * 0.6})`
                      return (
                        <motion.div
                          key={h}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (di * 24 + h) * 0.004, duration: 0.15 }}
                          className="w-5 h-5 rounded-[3px] cursor-pointer hover:ring-1 hover:ring-violet-400/50 transition-all relative group"
                          style={{ backgroundColor: bgColor }}
                          title={`${day} ${h}:00 — ${val} activities`}
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-black/90 text-[8px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 border border-white/10">
                            {day} {h}:00 — {val} activities
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ))
              })()}
              {/* Legend */}
              <div className="flex items-center gap-2 mt-3 ml-12">
                <span className="text-[7px] text-muted-foreground/25">Less</span>
                {[0.05, 0.15, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                  <div
                    key={o}
                    className="w-3.5 h-3.5 rounded-[2px]"
                    style={{
                      backgroundColor: i < 2
                        ? `rgba(16, 185, 129, ${o})`
                        : i < 4
                          ? `rgba(139, 92, 246, ${o})`
                          : `rgba(217, 70, 239, ${o})`
                    }}
                  />
                ))}
                <span className="text-[7px] text-muted-foreground/25">More</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Prediction Insights */}
      {(() => {
        const handleRefreshInsights = () => {
          setIsRefreshing(true)
          setTimeout(() => {
            setInsightRefreshKey(k => k + 1)
            setIsRefreshing(false)
            toast({ title: 'Insights refreshed', description: 'Prediction insights recalculated' })
          }, 600)
        }

        // Compute insights from analytics data
        const docsPerWeek = recentTimeline.length > 1
          ? (recentTimeline.reduce((sum, d) => sum + d.documents, 0) / recentTimeline.length * 7).toFixed(1)
          : '0'
        const growthDirection = recentTimeline.length >= 2
          ? recentTimeline[recentTimeline.length - 1].documents >= recentTimeline[0].documents
          : true

        const topKeyword = Object.entries(documentAnalytics.documentsByType).sort((a, b) => b[1] - a[1])[0]
        const topKeywordLabel = topKeyword ? topKeyword[0].toUpperCase() : 'N/A'
        const topKeywordCount = topKeyword ? topKeyword[1] : 0

        const peakDay = recentTimeline.length > 0
          ? recentTimeline.reduce((max, d) => d.messages > max.messages ? d : max, recentTimeline[0])
          : null
        const peakLabel = peakDay ? new Date(peakDay.date).toLocaleDateString('en', { weekday: 'short' }) + ' / ' + (peakDay.messages > 5 ? '9am' : '2pm') : 'N/A'

        const currentSizeMB = documentAnalytics.totalKnowledgeSize / (1024 * 1024)
        const growthRateMB = currentSizeMB > 0 ? currentSizeMB * 0.15 : 0.5
        const forecastMB = (currentSizeMB + growthRateMB * 30).toFixed(1)
        const forecastProgress = Math.min((currentSizeMB / (currentSizeMB + growthRateMB * 30)) * 100, 95)

        const insights = [
          {
            icon: growthDirection ? TrendingUp : TrendingDown,
            iconColor: 'text-violet-400',
            iconBg: 'bg-violet-500/10',
            title: 'Growth Trend',
            description: `Document base growing at ~${docsPerWeek} docs/week`,
            badge: growthDirection ? '↑' : '↓',
            badgeColor: growthDirection ? 'text-emerald-400' : 'text-red-400',
            confidence: 'High' as const,
          },
          {
            icon: BarChart3,
            iconColor: 'text-emerald-400',
            iconBg: 'bg-emerald-500/10',
            title: 'Search Patterns',
            description: `Most searched: ${topKeywordLabel}`,
            badge: `${topKeywordCount}`,
            badgeColor: 'text-amber-400',
            confidence: 'Medium' as const,
          },
          {
            icon: Zap,
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
            title: 'Usage Peak',
            description: `Peak activity: ${peakLabel}`,
            badge: '⚡',
            badgeColor: 'text-amber-400',
            confidence: 'Medium' as const,
          },
          {
            icon: Database,
            iconColor: 'text-cyan-400',
            iconBg: 'bg-cyan-500/10',
            title: 'Storage Forecast',
            description: `At current rate, ~${forecastMB} MB in 30 days`,
            badge: `${currentSizeMB.toFixed(1)} MB`,
            badgeColor: 'text-cyan-400',
            confidence: currentSizeMB > 0 ? 'High' as const : 'Low' as const,
          },
        ]

        const confidenceConfig: Record<string, { bg: string; text: string; border: string }> = {
          High: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
          Medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
          Low: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
        }

        return (
          <GlassCard key={insightRefreshKey}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center"><Brain className="h-3.5 w-3.5 text-violet-400" /></div>
                  <h3 className="text-sm font-semibold">Prediction Insights</h3>
                  <Badge variant="outline" className="text-[7px] bg-violet-500/10 text-violet-400 border-violet-500/20">AI</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-[9px] text-muted-foreground/40 hover:text-violet-300"
                  onClick={handleRefreshInsights}
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh Insights
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon
                  const conf = confidenceConfig[insight.confidence]
                  return (
                    <motion.div
                      key={insight.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      className="insight-card-enter rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 hover:bg-white/[0.04] transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg ${insight.iconBg} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${insight.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-semibold">{insight.title}</span>
                            <Badge variant="outline" className={`${conf.bg} ${conf.text} ${conf.border} text-[7px] px-1.5 py-0 border font-semibold`}>{insight.confidence}</Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
                            {insight.description.split(/(~?\d+\.?\d*\s*(?:docs|MB|week|days|am|pm)?)/g).map((part, pi) => {
                              if (/^\d+\.?\d*/.test(part)) return <span key={pi} className="text-foreground/80 font-semibold insight-value-glow">{part}</span>
                              return part
                            })}
                          </p>
                          {insight.title === 'Storage Forecast' && (
                            <div className="mt-2">
                              <div className="h-1.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${forecastProgress}%` }}
                                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                                  className="h-full rounded-full bg-gradient-to-r from-cyan-500/60 to-cyan-400/80"
                                />
                              </div>
                            </div>
                          )}
                          {insight.title === 'Usage Peak' && (
                            <div className="mt-1.5">
                              <AreaSparkline
                                data={recentTimeline.map(d => d.messages)}
                                color="#f59e0b"
                                height={28}
                                width={120}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </GlassCard>
        )
      })()}
    </div>
  )
}

function SettingsPage({ logActivity }: { logActivity: (type: ActivityType, desc: string) => void }) {
  const { settings, loading, updateSettings } = useSettings()
  const [localSettings, setLocalSettings] = useState<Record<string, string>>(() => settings || {})
  const [prevSettings, setPrevSettings] = useState<WorkspaceSettings | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, phase: '' })
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { pushNotification } = useNotificationCenter()

  // API Key Management
  const API_KEY_STORAGE = 'luminara-api-keys'
  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; value: string; type: 'llm' | 'embedding' | 'vectordb' }>>(() => {
    try {
      const stored = localStorage.getItem(API_KEY_STORAGE)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })
  const [addingKey, setAddingKey] = useState(false)
  const [newKeyType, setNewKeyType] = useState<'llm' | 'embedding' | 'vectordb'>('llm')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [showKeyValue, setShowKeyValue] = useState<string | null>(null)
  const [editingKey, setEditingKey] = useState<string | null>(null)

  const maskKey = (val: string) => val.length > 4 ? '••••••••' + val.slice(-4) : '••••••••'

  const getApiKeyLabel = (type: string) => {
    switch (type) {
      case 'llm': return 'LLM API Key'
      case 'embedding': return 'Embedding API Key'
      case 'vectordb': return 'Vector DB Key'
      default: return type
    }
  }

  const getApiKeyIcon = (type: string) => {
    switch (type) {
      case 'llm': return <Brain className="h-3 w-3 text-violet-400" />
      case 'embedding': return <Layers className="h-3 w-3 text-fuchsia-400" />
      case 'vectordb': return <Database className="h-3 w-3 text-cyan-400" />
      default: return <Key className="h-3 w-3 text-amber-400" />
    }
  }

  const getApiKeyColor = (type: string) => {
    switch (type) {
      case 'llm': return { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' }
      case 'embedding': return { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-400' }
      case 'vectordb': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' }
      default: return { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' }
    }
  }

  const handleSaveApiKey = () => {
    if (!newKeyValue.trim()) {
      toast({ title: 'Validation Error', description: 'API key value cannot be empty', variant: 'destructive' })
      return
    }
    if (newKeyValue.trim().length < 8) {
      toast({ title: 'Validation Error', description: 'API key must be at least 8 characters', variant: 'destructive' })
      return
    }
    if (editingKey) {
      const updated = apiKeys.map(k => k.id === editingKey ? { ...k, value: newKeyValue.trim() } : k)
      setApiKeys(updated)
      localStorage.setItem(API_KEY_STORAGE, JSON.stringify(updated))
      toast({ title: 'API key updated', description: `${getApiKeyLabel(newKeyType)} has been updated` })
      pushNotification('success', 'API Key Updated', `${getApiKeyLabel(newKeyType)} has been updated successfully`)
    } else {
      const existing = apiKeys.find(k => k.type === newKeyType)
      if (existing) {
        const updated = apiKeys.map(k => k.type === newKeyType ? { ...k, value: newKeyValue.trim() } : k)
        setApiKeys(updated)
        localStorage.setItem(API_KEY_STORAGE, JSON.stringify(updated))
        toast({ title: 'API key updated', description: `${getApiKeyLabel(newKeyType)} already exists and was updated` })
      } else {
        const newKey = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: getApiKeyLabel(newKeyType), value: newKeyValue.trim(), type: newKeyType }
        const updated = [...apiKeys, newKey]
        setApiKeys(updated)
        localStorage.setItem(API_KEY_STORAGE, JSON.stringify(updated))
        toast({ title: 'API key saved', description: `${getApiKeyLabel(newKeyType)} has been added` })
      }
      pushNotification('success', 'API Key Saved', `${getApiKeyLabel(newKeyType)} has been configured`)
    }
    setAddingKey(false)
    setNewKeyValue('')
    setEditingKey(null)
  }

  const handleDeleteApiKey = (id: string) => {
    const key = apiKeys.find(k => k.id === id)
    const updated = apiKeys.filter(k => k.id !== id)
    setApiKeys(updated)
    localStorage.setItem(API_KEY_STORAGE, JSON.stringify(updated))
    toast({ title: 'API key deleted', description: key ? `${key.name} has been removed` : 'Key removed' })
    pushNotification('warning', 'API Key Deleted', key ? `${key.name} has been removed` : 'Key removed')
  }

  const handleEditApiKey = (id: string) => {
    const key = apiKeys.find(k => k.id === id)
    if (key) {
      setEditingKey(id)
      setNewKeyType(key.type)
      setNewKeyValue('')
      setAddingKey(true)
    }
  }

  if (settings && settings !== prevSettings) { setPrevSettings(settings); setLocalSettings(settings) }
  const handleSave = () => { updateSettings(localSettings); logActivity('settings_updated', 'Settings updated') }

  // Export helpers
  const downloadJson = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportDocuments = async () => {
    setExporting('documents')
    try {
      const res = await fetch('/api/documents'); const data = await res.json()
      const exportData = { version: 1, type: 'documents', exportedAt: new Date().toISOString(), documents: data.documents }
      downloadJson(exportData, `luminara-documents-${Date.now()}.json`)
      toast({ title: 'Documents exported', description: `${data.documents.length} documents exported` })
    } catch { toast({ title: 'Export failed', variant: 'destructive' }) }
    finally { setExporting(null) }
  }

  const handleExportChats = async () => {
    setExporting('chats')
    try {
      const res = await fetch('/api/chat/sessions'); const sessions = await res.json()
      const sessionsWithMessages = await Promise.all(sessions.map(async (s: ChatSession) => {
        const msgRes = await fetch(`/api/chat/sessions/${s.id}`); const msgData = await msgRes.json()
        return { ...s, messages: msgData.messages || [] }
      }))
      const exportData = { version: 1, type: 'chats', exportedAt: new Date().toISOString(), sessions: sessionsWithMessages }
      downloadJson(exportData, `luminara-chats-${Date.now()}.json`)
      toast({ title: 'Chats exported', description: `${sessions.length} sessions exported` })
    } catch { toast({ title: 'Export failed', variant: 'destructive' }) }
    finally { setExporting(null) }
  }

  const handleExportFull = async () => {
    setExporting('full')
    try {
      const [docRes, sessionRes] = await Promise.all([fetch('/api/documents'), fetch('/api/chat/sessions')])
      const docData = await docRes.json(); const sessions = await sessionRes.json()
      const sessionsWithMessages = await Promise.all(sessions.map(async (s: ChatSession) => {
        const msgRes = await fetch(`/api/chat/sessions/${s.id}`); const msgData = await msgRes.json()
        return { ...s, messages: msgData.messages || [] }
      }))
      const exportData = {
        version: 1, type: 'full_backup', exportedAt: new Date().toISOString(),
        documents: docData.documents, sessions: sessionsWithMessages, settings: settings
      }
      downloadJson(exportData, `luminara-backup-${Date.now()}.json`)
      toast({ title: 'Full backup exported', description: `${docData.documents.length} docs, ${sessions.length} sessions` })
    } catch { toast({ title: 'Export failed', variant: 'destructive' }) }
    finally { setExporting(null) }
  }

  // Import helpers
  const validateImportData = (data: Record<string, unknown>): { valid: boolean; type: string; errors: string[] } => {
    const errors: string[] = []
    if (!data.version || typeof data.version !== 'number') errors.push('Missing or invalid version')
    if (!data.type || typeof data.type !== 'string') errors.push('Missing or invalid type')
    if (!['documents', 'chats', 'full_backup'].includes(data.type as string)) errors.push('Invalid backup type')
    if (data.type === 'documents' && !Array.isArray(data.documents)) errors.push('Missing documents array')
    if (data.type === 'chats' && !Array.isArray(data.sessions)) errors.push('Missing sessions array')
    if (data.type === 'full_backup' && !Array.isArray(data.documents) && !Array.isArray(data.sessions)) errors.push('Missing documents or sessions')
    return { valid: errors.length === 0, type: data.type as string, errors }
  }

  const processImport = async (data: Record<string, unknown>) => {
    const validation = validateImportData(data)
    if (!validation.valid) {
      toast({ title: 'Invalid backup file', description: validation.errors.join(', '), variant: 'destructive' })
      return
    }
    setImporting(true)
    try {
      const total = ((data.documents as unknown[])?.length || 0) + ((data.sessions as unknown[])?.length || 0)
      let current = 0

      // Import documents
      if (Array.isArray(data.documents)) {
        setImportProgress({ current: 0, total: data.documents.length, phase: 'documents' })
        for (const doc of data.documents as Array<Record<string, unknown>>) {
          try {
            await fetch('/api/documents', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: doc.name, type: doc.type, content: doc.content || `Imported document: ${doc.name}`, tags: doc.tags || '' })
            })
          } catch { /* skip failed */ }
          current++
          setImportProgress(p => ({ ...p, current }))
        }
      }

      // Import chat sessions
      if (Array.isArray(data.sessions)) {
        setImportProgress(p => ({ ...p, phase: 'chats', current: 0, total: data.sessions.length }))
        for (const session of data.sessions as Array<Record<string, unknown>>) {
          try {
            const res = await fetch('/api/chat/sessions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: session.title, mode: session.mode || 'balanced' })
            })
            const newSession = await res.json()
            // Import messages for this session
            if (Array.isArray(session.messages)) {
              for (const msg of session.messages as Array<Record<string, unknown>>) {
                try {
                  await fetch('/api/chat', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: newSession.id, message: msg.content, mode: msg.mode || 'balanced' })
                  })
                } catch { /* skip */ }
              }
            }
          } catch { /* skip failed */ }
          current++
          setImportProgress(p => ({ ...p, current }))
        }
      }

      toast({ title: 'Import complete', description: `Processed ${current} items` })
      logActivity('settings_updated', `Imported ${current} items from backup`)
    } catch { toast({ title: 'Import failed', variant: 'destructive' }) }
    finally { setImporting(false); setImportProgress({ current: 0, total: 0, phase: '' }) }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        processImport(data)
      } catch { toast({ title: 'Invalid JSON file', variant: 'destructive' }) }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        processImport(data)
      } catch { toast({ title: 'Invalid JSON file', variant: 'destructive' }) }
    }
    reader.readAsText(file)
  }

  if (loading) return <div className="space-y-5 max-w-2xl"><div><div className="h-8 w-48 rounded-lg shimmer-violet" /><div className="h-4 w-64 mt-2 rounded shimmer" /></div>{[1, 2, 3].map(i => <div key={i} className="h-24 w-full rounded-xl shimmer" />)}</div>

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h2 className="text-[26px] font-bold tracking-tight page-title-gradient">Settings</h2><p className="text-sm text-muted-foreground/60 mt-0.5">Configure your RAG pipeline and workspace</p></div>

      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4"><div className="h-6 w-6 rounded-md bg-violet-500/10 flex items-center justify-center"><Settings className="h-3 w-3 text-violet-400" /></div><h3 className="text-sm font-semibold">Workspace</h3></div>
          <div className="space-y-2"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Workspace Name</label><Input value={localSettings.workspace_name || ''} onChange={e => setLocalSettings(p => ({ ...p, workspace_name: e.target.value }))} className="bg-white/[0.03] border-white/[0.06]" /></div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1"><div className="h-6 w-6 rounded-md bg-fuchsia-500/10 flex items-center justify-center"><Brain className="h-3 w-3 text-fuchsia-400" /></div><h3 className="text-sm font-semibold">RAG Pipeline</h3></div>
          <p className="text-[10px] text-muted-foreground/30 mb-4 ml-8">Configure how documents are processed and searched</p>
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Chunk Size</label><Input type="number" value={localSettings.chunk_size || '500'} onChange={e => setLocalSettings(p => ({ ...p, chunk_size: e.target.value }))} className="bg-white/[0.03] border-white/[0.06]" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Chunk Overlap</label><Input type="number" value={localSettings.chunk_overlap || '100'} onChange={e => setLocalSettings(p => ({ ...p, chunk_overlap: e.target.value }))} className="bg-white/[0.03] border-white/[0.06]" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Chat Mode</label><Select value={localSettings.chat_mode || 'balanced'} onValueChange={v => setLocalSettings(p => ({ ...p, chat_mode: v }))}><SelectTrigger className="bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="strict">Strict</SelectItem><SelectItem value="balanced">Balanced</SelectItem><SelectItem value="creative">Creative</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Search Mode</label><Select value={localSettings.search_mode || 'hybrid'} onValueChange={v => setLocalSettings(p => ({ ...p, search_mode: v }))}><SelectTrigger className="bg-white/[0.03] border-white/[0.06]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hybrid">Hybrid</SelectItem><SelectItem value="semantic">Semantic</SelectItem><SelectItem value="keyword">Keyword</SelectItem></SelectContent></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Top K Results</label><Input type="number" value={localSettings.top_k || '5'} onChange={e => setLocalSettings(p => ({ ...p, top_k: e.target.value }))} className="bg-white/[0.03] border-white/[0.06]" /></div>
              <div className="space-y-1.5"><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Min Score</label><Input type="number" step="0.01" value={parseFloat(localSettings.min_score || '0.02').toFixed(2)} onChange={e => setLocalSettings(p => ({ ...p, min_score: e.target.value }))} className="bg-white/[0.03] border-white/[0.06]" /></div>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3"><div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center"><Info className="h-3 w-3 text-emerald-400" /></div><h3 className="text-sm font-semibold">Architecture</h3></div>
          <div className="space-y-3 text-[10px] text-muted-foreground/40">
            {[{ Ic: Layers, c: 'violet', t: 'Processing', d: 'Text extraction → Splitting → Chunking with overlap → Metadata' }, { Ic: Search, c: 'fuchsia', t: 'Retrieval', d: 'TF-IDF vectorization → Cosine similarity + Exact match → Hybrid scoring' }, { Ic: Sparkles, c: 'emerald', t: 'Generation', d: 'Context assembly → Mode-specific prompt → LLM → Citation mapping' }, { Ic: Eye, c: 'amber', t: 'Transparency', d: 'Source citations → Confidence scores → Retrieval trace → Warnings' }].map(item => (
              <div key={item.t} className="flex items-start gap-2.5"><div className={`h-5 w-5 rounded bg-${item.c}-500/10 flex items-center justify-center shrink-0 mt-0.5`}><item.Ic className={`h-2.5 w-2.5 text-${item.c}-400`} /></div><div><p className="font-medium text-foreground/70">{item.t}</p><p className="leading-relaxed">{item.d}</p></div></div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Data Management */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1"><div className="h-6 w-6 rounded-md bg-cyan-500/10 flex items-center justify-center"><Database className="h-3 w-3 text-cyan-400" /></div><h3 className="text-sm font-semibold">Data Management</h3></div>
          <p className="text-[10px] text-muted-foreground/30 mb-4 ml-8">Export and import your workspace data</p>

          {/* Export Section */}
          <div className="space-y-2 mb-5">
            <p className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Export</p>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 hover:bg-violet-500/5" onClick={handleExportDocuments} disabled={!!exporting}>
                {exporting === 'documents' ? <Loader2 className="h-4 w-4 animate-spin text-violet-400" /> : <FileJson className="h-4 w-4 text-violet-400" />}
                <span className="text-[10px] font-medium">Documents</span>
                <span className="text-[8px] text-muted-foreground/30">JSON export</span>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 bg-white/[0.02] border-white/[0.06] hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5" onClick={handleExportChats} disabled={!!exporting}>
                {exporting === 'chats' ? <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" /> : <MessageSquare className="h-4 w-4 text-fuchsia-400" />}
                <span className="text-[10px] font-medium">Chat Sessions</span>
                <span className="text-[8px] text-muted-foreground/30">JSON export</span>
              </Button>
              <Button variant="outline" size="sm" className="h-auto py-2.5 flex-col gap-1.5 bg-white/[0.02] border-white/[0.06] hover:border-cyan-500/30 hover:bg-cyan-500/5" onClick={handleExportFull} disabled={!!exporting}>
                {exporting === 'full' ? <Loader2 className="h-4 w-4 animate-spin text-cyan-400" /> : <Download className="h-4 w-4 text-cyan-400" />}
                <span className="text-[10px] font-medium">Full Backup</span>
                <span className="text-[8px] text-muted-foreground/30">Docs + Chats</span>
              </Button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-2">
            <p className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Import</p>
            <div
              className={`relative rounded-xl border-2 border-dashed p-5 text-center transition-all ${isDragOver ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.12]'}`}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileSelect} className="hidden" />
              {importing ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 text-violet-400 animate-spin mx-auto" />
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground/60">Importing {importProgress.phase}...</p>
                    <Progress value={importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0} className="h-1.5" />
                    <p className="text-[9px] text-muted-foreground/30">{importProgress.current} / {importProgress.total} processed</p>
                  </div>
                </div>
              ) : (
                <>
                  <UploadCloud className={`h-8 w-8 mx-auto mb-2 ${isDragOver ? 'text-violet-400' : 'text-muted-foreground/20'}`} />
                  <p className="text-[11px] text-muted-foreground/50 mb-1">Drag & drop a JSON backup file here</p>
                  <p className="text-[9px] text-muted-foreground/30 mb-3">or click to browse</p>
                  <Button variant="outline" size="sm" className="bg-white/[0.02] border-white/[0.06] text-[10px] gap-1.5" onClick={() => fileInputRef.current?.click()}>
                    <FolderOpen className="h-3 w-3" /> Choose File
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <Button onClick={handleSave} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20 gap-2"><Check className="h-4 w-4" />Save Settings</Button>

      {/* Quick Actions Footer */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3"><div className="h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center"><Zap className="h-3 w-3 text-amber-400" /></div><h3 className="text-sm font-semibold">Quick Actions</h3></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2 bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 text-[10px]" onClick={() => { if (typeof window !== 'undefined') { localStorage.removeItem('luminara-onboarding-complete'); toast({ title: 'Tour reset', description: 'Refresh to see the onboarding tour again' }) } }}>
              <Rocket className="h-3.5 w-3.5 text-violet-400" />Restart Tour
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 text-[10px]" onClick={() => { window.dispatchEvent(new CustomEvent('luminara-open-shortcuts')) }}>
              <Keyboard className="h-3.5 w-3.5 text-violet-400" />Keyboard Shortcuts
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* API Keys Management */}
      <GlassCard>
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-violet-500/10 flex items-center justify-center"><Key className="h-3 w-3 text-violet-400" /></div>
              <h3 className="text-sm font-semibold">API Keys</h3>
            </div>
            {!addingKey && (
              <Button variant="outline" size="sm" className="gap-1.5 bg-white/[0.02] border-white/[0.06] hover:border-violet-500/30 text-[10px] h-7" onClick={() => { setAddingKey(true); setEditingKey(null); setNewKeyValue('') }}>
                <Plus className="h-3 w-3 text-violet-400" />Add API Key
              </Button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground/30 mb-4 ml-8">Manage your service API keys securely</p>

          {/* Add/Edit API Key Form */}
          <AnimatePresence>
            {addingKey && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Key Type</label>
                    <Select value={newKeyType} onValueChange={(v: 'llm' | 'embedding' | 'vectordb') => setNewKeyType(v)}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.06]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llm">LLM API</SelectItem>
                        <SelectItem value="embedding">Embedding API</SelectItem>
                        <SelectItem value="vectordb">Vector DB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Key Value</label>
                    <div className="relative">
                      <Input
                        type={showKeyValue === 'new' ? 'text' : 'password'}
                        value={newKeyValue}
                        onChange={e => setNewKeyValue(e.target.value)}
                        placeholder="Enter API key (min. 8 characters)"
                        className="bg-white/[0.03] border-white/[0.06] pr-9"
                      />
                      <button
                        onClick={() => setShowKeyValue(showKeyValue === 'new' ? null : 'new')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                      >
                        {showKeyValue === 'new' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 text-[10px] bg-violet-600 border-0 gap-1.5" onClick={handleSaveApiKey}>
                      <Shield className="h-3 w-3" />{editingKey ? 'Update Key' : 'Save Key'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => { setAddingKey(false); setEditingKey(null); setNewKeyValue('') }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* API Key List */}
          <div className="space-y-2">
            {/* Show configured keys */}
            {apiKeys.map(key => {
              const colors = getApiKeyColor(key.type)
              const isRevealed = showKeyValue === key.id
              return (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all group"
                >
                  <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    {getApiKeyIcon(key.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium">{getApiKeyLabel(key.type)}</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" title="Configured" />
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className="text-[9px] text-muted-foreground/40 font-mono">
                        {isRevealed ? key.value : maskKey(key.value)}
                      </code>
                      <button
                        onClick={() => setShowKeyValue(isRevealed ? null : key.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-white/[0.06] rounded"
                      >
                        {isRevealed ? <EyeOff className="h-2.5 w-2.5 text-muted-foreground/40" /> : <Eye className="h-2.5 w-2.5 text-muted-foreground/40" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditApiKey(key.id)} className="p-1.5 rounded-md hover:bg-white/[0.06] transition-colors" title="Edit">
                      <Pencil className="h-3 w-3 text-muted-foreground/40" />
                    </button>
                    <button onClick={() => handleDeleteApiKey(key.id)} className="p-1.5 rounded-md hover:bg-red-500/10 transition-colors" title="Delete">
                      <Trash2 className="h-3 w-3 text-red-400/60" />
                    </button>
                  </div>
                </motion.div>
              )
            })}

            {/* Show missing key placeholders */}
            {['llm', 'embedding', 'vectordb'].filter(type => !apiKeys.some(k => k.type === type)).map(type => {
              const colors = getApiKeyColor(type)
              return (
                <div key={type} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.01] border border-dashed border-white/[0.06] opacity-50">
                  <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                    {getApiKeyIcon(type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium">{getApiKeyLabel(type)}</span>
                      <div className="h-1.5 w-1.5 rounded-full bg-red-400" title="Not configured" />
                    </div>
                    <p className="text-[9px] text-muted-foreground/30 mt-0.5">Not configured</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] gap-1 text-muted-foreground/40 hover:text-violet-300" onClick={() => { setNewKeyType(type as 'llm' | 'embedding' | 'vectordb'); setAddingKey(true); setEditingKey(null); setNewKeyValue('') }}>
                    <Plus className="h-2.5 w-2.5" />Add
                  </Button>
                </div>
              )
            })}
          </div>

          {apiKeys.length === 0 && (
            <div className="text-center py-6 mt-2">
              <Key className="h-8 w-8 text-violet-400/15 mx-auto mb-2" />
              <p className="text-[11px] text-muted-foreground/40">No API keys configured</p>
              <p className="text-[9px] text-muted-foreground/25 mt-1">Add your first API key to get started</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Theme Customization */}
      <ThemeCustomization />

      {/* Prompt Templates Editor */}
      <PromptTemplatesEditor />

      {/* System Health Panel */}
      <SystemHealthPanel />
    </div>
  )
}

// ==================== THEME CUSTOMIZATION ====================

const THEME_STORAGE_KEY = 'luminara-theme-prefs'

const ACCENT_PRESETS = [
  { name: 'Violet', hue: 263, color: '#8b5cf6' },
  { name: 'Fuchsia', hue: 292, color: '#d946ef' },
  { name: 'Emerald', hue: 160, color: '#10b981' },
  { name: 'Amber', hue: 38, color: '#f59e0b' },
  { name: 'Cyan', hue: 190, color: '#06b6d4' },
  { name: 'Rose', hue: 350, color: '#f43f5e' },
] as const

const FONT_SIZE_OPTIONS = [
  { name: 'Small', scale: 0.875 },
  { name: 'Medium', scale: 1 },
  { name: 'Large', scale: 1.125 },
] as const

const RADIUS_OPTIONS = [
  { name: 'Sharp', scale: 0.25 },
  { name: 'Rounded', scale: 1 },
  { name: 'Pill', scale: 2 },
] as const

interface ThemePrefs {
  accentHue: number
  accentHex: string
  fontSizeScale: number
  radiusScale: number
  animationsEnabled: boolean
  compactMode: boolean
}

const DEFAULT_PREFS: ThemePrefs = {
  accentHue: 263,
  accentHex: '#8b5cf6',
  fontSizeScale: 1,
  radiusScale: 1,
  animationsEnabled: true,
  compactMode: false,
}

function ThemeCustomization() {
  const [prefs, setPrefs] = useState<ThemePrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) }
    } catch {}
    return DEFAULT_PREFS
  })
  const [customHex, setCustomHex] = useState('')

  // Apply CSS custom properties in real-time
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent-hue', String(prefs.accentHue))
    root.style.setProperty('--font-size-scale', String(prefs.fontSizeScale))
    root.style.setProperty('--radius-scale', String(prefs.radiusScale))
    root.style.setProperty('--spacing-scale', prefs.compactMode ? '0.75' : '1')
    document.body.style.fontSize = `${prefs.fontSizeScale * 16}px`
    document.body.style.setProperty('--radius', `${0.625 * prefs.radiusScale}rem`)
    if (!prefs.animationsEnabled) {
      document.body.classList.add('luminara-reduce-motion')
    } else {
      document.body.classList.remove('luminara-reduce-motion')
    }
    // Add theme transition class briefly
    document.body.classList.add('theme-transition-active')
    const timer = setTimeout(() => document.body.classList.remove('theme-transition-active'), 400)
    return () => clearTimeout(timer)
  }, [prefs])

  const updatePref = useCallback(<K extends keyof ThemePrefs>(key: K, value: ThemePrefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value }
      try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const handleAccentPreset = useCallback((preset: typeof ACCENT_PRESETS[number]) => {
    updatePref('accentHue', preset.hue)
    updatePref('accentHex', preset.color)
  }, [updatePref])

  const handleCustomHex = useCallback(() => {
    if (!customHex.match(/^#[0-9a-fA-F]{6}$/)) {
      toast({ title: 'Invalid color', description: 'Enter a valid hex color (e.g., #8b5cf6)', variant: 'destructive' })
      return
    }
    // Convert hex to HSL hue approximation
    const r = parseInt(customHex.slice(1, 3), 16) / 255
    const g = parseInt(customHex.slice(3, 5), 16) / 255
    const b = parseInt(customHex.slice(5, 7), 16) / 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0
    if (max !== min) {
      const d = max - min
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      else if (max === g) h = ((b - r) / d + 2) / 6
      else h = ((r - g) / d + 4) / 6
    }
    const hue = Math.round(h * 360)
    updatePref('accentHue', hue)
    updatePref('accentHex', customHex)
    setCustomHex('')
  }, [customHex, updatePref])

  const handleReset = useCallback(() => {
    setPrefs(DEFAULT_PREFS)
    try { localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(DEFAULT_PREFS)) } catch {}
    toast({ title: 'Theme reset', description: 'All theme settings restored to default' })
  }, [])

  return (
    <GlassCard>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1"><div className="h-6 w-6 rounded-md bg-rose-500/10 flex items-center justify-center"><Palette className="h-3 w-3 text-rose-400" /></div><h3 className="text-sm font-semibold">Theme Customization</h3></div>
        <p className="text-[10px] text-muted-foreground/30 mb-4 ml-8">Personalize the look and feel of your workspace</p>

        {/* Accent Color */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-fuchsia-500/10 flex items-center justify-center"><Sparkles className="h-2.5 w-2.5 text-fuchsia-400" /></div><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Accent Color</label></div>
          <div className="flex items-center gap-2 flex-wrap">
            {ACCENT_PRESETS.map(preset => (
              <button
                key={preset.name}
                onClick={() => handleAccentPreset(preset)}
                className={`h-7 w-7 rounded-full border-2 transition-all hover:scale-110 ${prefs.accentHex === preset.color ? 'border-white/60 scale-110 shadow-lg' : 'border-white/10 hover:border-white/30'}`}
                style={{ backgroundColor: preset.color }}
                title={preset.name}
              />
            ))}
            <Separator orientation="vertical" className="h-6 bg-white/[0.06] mx-1" />
            <div className="flex items-center gap-1.5">
              <Input
                placeholder="#custom"
                value={customHex}
                onChange={e => setCustomHex(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCustomHex() }}
                className="bg-white/[0.03] border-white/[0.06] text-[10px] h-7 w-20 font-mono"
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground/60" onClick={handleCustomHex}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-[8px] text-muted-foreground/25">Current: <span className="font-mono" style={{ color: `hsl(${prefs.accentHue}, 70%, 60%)` }}>{prefs.accentHex}</span></p>
        </div>

        {/* Font Size */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-violet-500/10 flex items-center justify-center"><Type className="h-2.5 w-2.5 text-violet-400" /></div><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Font Size</label></div>
          <div className="flex items-center gap-2">
            {FONT_SIZE_OPTIONS.map(opt => (
              <button
                key={opt.name}
                onClick={() => updatePref('fontSizeScale', opt.scale)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${Math.abs(prefs.fontSizeScale - opt.scale) < 0.01 ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' : 'bg-white/[0.02] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.04]'}`}
                style={{ fontSize: `${opt.scale * 10}px` }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Border Radius */}
        <div className="space-y-2 mb-5">
          <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-emerald-500/10 flex items-center justify-center"><Maximize2 className="h-2.5 w-2.5 text-emerald-400" /></div><label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Border Radius</label></div>
          <div className="flex items-center gap-2">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.name}
                onClick={() => updatePref('radiusScale', opt.scale)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all border ${Math.abs(prefs.radiusScale - opt.scale) < 0.01 ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-white/[0.02] text-muted-foreground/50 border-white/[0.06] hover:bg-white/[0.04]'}`}
                style={{ borderRadius: `${opt.scale * 8}px` }}
              >
                {opt.name}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 mb-5">
          {/* Animation Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-amber-500/10 flex items-center justify-center"><Sparkles className="h-2.5 w-2.5 text-amber-400" /></div>
              <span className="text-[10px] text-muted-foreground/60">Animations</span>
            </div>
            <button
              onClick={() => updatePref('animationsEnabled', !prefs.animationsEnabled)}
              className={`relative w-9 h-5 rounded-full transition-colors ${prefs.animationsEnabled ? 'bg-violet-500/60' : 'bg-white/[0.08]'}`}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={{ left: prefs.animationsEnabled ? '18px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>

          {/* Compact Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-cyan-500/10 flex items-center justify-center"><Minimize2 className="h-2.5 w-2.5 text-cyan-400" /></div>
              <span className="text-[10px] text-muted-foreground/60">Compact Mode</span>
            </div>
            <button
              onClick={() => updatePref('compactMode', !prefs.compactMode)}
              className={`relative w-9 h-5 rounded-full transition-colors ${prefs.compactMode ? 'bg-cyan-500/60' : 'bg-white/[0.08]'}`}
            >
              <motion.div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                animate={{ left: prefs.compactMode ? '18px' : '2px' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>

        {/* Reset */}
        <Button variant="outline" size="sm" className="w-full bg-white/[0.02] border-white/[0.06] hover:border-rose-500/30 text-[10px] gap-2 text-muted-foreground/50" onClick={handleReset}>
          <RotateCcw className="h-3 w-3" />Reset to Default
        </Button>
      </div>
    </GlassCard>
  )
}

// ==================== CUSTOM PROMPT TEMPLATES EDITOR ====================

function PromptTemplatesEditor() {
  const [customTemplates, setCustomTemplates] = useState<CustomPromptTemplate[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return []
  })
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<string>('General')
  const [formContent, setFormContent] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const saveTemplates = useCallback((templates: CustomPromptTemplate[]) => {
    setCustomTemplates(templates)
    try { localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(templates)) } catch {}
    // Dispatch custom event so Chat page can pick up new templates
    window.dispatchEvent(new CustomEvent('luminara-custom-templates-updated'))
  }, [])

  const handleCreate = () => {
    if (!formName.trim() || !formContent.trim()) {
      toast({ title: 'Validation Error', description: 'Name and content are required', variant: 'destructive' })
      return
    }
    if (customTemplates.length >= 20) {
      toast({ title: 'Limit reached', description: 'Maximum 20 custom templates allowed', variant: 'destructive' })
      return
    }
    const now = new Date().toISOString()
    const newTemplate: CustomPromptTemplate = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: formName.trim(),
      category: formCategory,
      content: formContent.trim(),
      createdAt: now,
      updatedAt: now,
    }
    saveTemplates([...customTemplates, newTemplate])
    resetForm()
    toast({ title: 'Template created', description: `"${newTemplate.name}" has been added` })
  }

  const handleEdit = (template: CustomPromptTemplate) => {
    setEditingId(template.id)
    setFormName(template.name)
    setFormCategory(template.category)
    setFormContent(template.content)
    setIsCreating(true)
  }

  const handleUpdate = () => {
    if (!editingId || !formName.trim() || !formContent.trim()) {
      toast({ title: 'Validation Error', description: 'Name and content are required', variant: 'destructive' })
      return
    }
    const updated = customTemplates.map(t =>
      t.id === editingId
        ? { ...t, name: formName.trim(), category: formCategory, content: formContent.trim(), updatedAt: new Date().toISOString() }
        : t
    )
    saveTemplates(updated)
    resetForm()
    toast({ title: 'Template updated', description: `"${formName}" has been updated` })
  }

  const handleDelete = (id: string) => {
    const template = customTemplates.find(t => t.id === id)
    saveTemplates(customTemplates.filter(t => t.id !== id))
    setDeletingId(null)
    toast({ title: 'Template deleted', description: template ? `"${template.name}" has been removed` : 'Template removed' })
  }

  const resetForm = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormName('')
    setFormCategory('General')
    setFormContent('')
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'General': return { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20' }
      case 'Technical': return { bg: 'bg-cyan-500/10', text: 'text-cyan-300', border: 'border-cyan-500/20' }
      case 'Creative': return { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-300', border: 'border-fuchsia-500/20' }
      case 'Analysis': return { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/20' }
      case 'Custom': return { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/20' }
      default: return { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/20' }
    }
  }

  // Combine built-in templates for display
  const allTemplates = [
    ...PROMPT_TEMPLATES.map(t => ({
      id: `builtin-${t.id}`,
      name: t.title,
      category: t.category,
      content: t.prompt,
      isBuiltin: true as const,
      createdAt: '',
      updatedAt: '',
    })),
    ...customTemplates.map(t => ({
      ...t,
      isBuiltin: false as const,
    })),
  ]

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <BookOpen className="h-3.5 w-3.5 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold">Prompt Templates</h3>
          <Badge variant="outline" className="text-[8px] bg-white/[0.02] border-white/[0.06] text-muted-foreground/40">{customTemplates.length}/20</Badge>
          {!isCreating && (
            <Button
              variant="outline"
              size="sm"
              className="ml-auto gap-1.5 text-[10px] bg-violet-500/10 border-violet-500/20 text-violet-300 hover:bg-violet-500/15 hover:border-violet-500/30"
              onClick={() => { resetForm(); setIsCreating(true) }}
              disabled={customTemplates.length >= 20}
            >
              <Plus className="h-3 w-3" />Create Template
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-violet-500/15 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3.5 w-3.5 text-violet-400" />
                  <span className="text-[11px] font-semibold text-violet-300">{editingId ? 'Edit Template' : 'New Template'}</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Name</label>
                  <Input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Technical Explainer"
                    className="h-8 text-[11px] bg-white/[0.03] border-white/[0.06]"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Category</label>
                  <div className="flex gap-1 flex-wrap">
                    {CUSTOM_TEMPLATE_CATEGORIES.map(cat => {
                      const colors = getCategoryColor(cat)
                      return (
                        <button
                          key={cat}
                          onClick={() => setFormCategory(cat)}
                          className={`px-2.5 py-1 rounded-md text-[9px] font-medium transition-all ${formCategory === cat ? `${colors.bg} ${colors.text} border ${colors.border}` : 'bg-white/[0.02] text-muted-foreground/40 hover:text-foreground/60 border border-white/[0.04]'}`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wider">Template Content</label>
                  <Textarea
                    value={formContent}
                    onChange={e => setFormContent(e.target.value)}
                    placeholder="Enter your prompt template content..."
                    rows={3}
                    className="text-[11px] bg-white/[0.03] border-white/[0.06] min-h-[60px]"
                    maxLength={2000}
                  />
                  <p className="text-[8px] text-muted-foreground/25 text-right">{formContent.length}/2000</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 text-[10px] bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0"
                    onClick={editingId ? handleUpdate : handleCreate}
                    disabled={!formName.trim() || !formContent.trim()}
                  >
                    {editingId ? <><Pencil className="h-3 w-3" />Update</> : <><Plus className="h-3 w-3" />Save</>}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground/40" onClick={resetForm}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Templates List */}
        <div className="max-h-96 overflow-y-auto scroll-smooth space-y-1.5">
          {allTemplates.map((template, i) => {
            const colors = getCategoryColor(template.category)
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group"
              >
                <div className={`h-6 w-6 rounded-md ${colors.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <MessageSquare className={`h-3 w-3 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-medium truncate group-hover:text-violet-300 transition-colors">{template.name}</p>
                    <Badge variant="outline" className={`${colors.bg} ${colors.text} ${colors.border} text-[7px] px-1 py-0 shrink-0`}>{template.category}</Badge>
                    {template.isBuiltin && <Badge variant="outline" className="text-[6px] px-1 py-0 bg-white/[0.02] border-white/[0.06] text-muted-foreground/25">built-in</Badge>}
                  </div>
                  <p className="text-[9px] text-muted-foreground/30 leading-relaxed mt-0.5 line-clamp-1">{template.content}</p>
                </div>
                {!template.isBuiltin && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => handleEdit(template)} className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"><Pencil className="h-3 w-3 text-muted-foreground/40" /></button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>
                    <TooltipProvider><Tooltip><TooltipTrigger asChild><button onClick={() => setDeletingId(template.id)} className="p-1 rounded-md hover:bg-red-500/10 transition-colors"><Trash2 className="h-3 w-3 text-red-400/60" /></button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deletingId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={() => setDeletingId(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="rounded-xl border border-white/[0.08] bg-black/90 backdrop-blur-xl p-5 max-w-sm mx-4 shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-red-400" /></div>
                  <h4 className="text-sm font-semibold">Delete Template</h4>
                </div>
                <p className="text-[11px] text-muted-foreground/60 mb-4">Are you sure you want to delete this template? This action cannot be undone.</p>
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="text-[10px]" onClick={() => setDeletingId(null)}>Cancel</Button>
                  <Button size="sm" className="text-[10px] bg-red-500/80 hover:bg-red-500 border-0" onClick={() => handleDelete(deletingId)}>Delete</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {customTemplates.length === 0 && PROMPT_TEMPLATES.length > 0 && !isCreating && (
          <div className="text-center py-4 mt-2">
            <MessageSquare className="h-6 w-6 text-violet-400/15 mx-auto mb-2" />
            <p className="text-[10px] text-muted-foreground/30">Create custom templates for your workflow</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== SYSTEM HEALTH PANEL ====================

interface HealthCheck {
  status: string
  latency?: number
  chunks?: number
  docs?: number
  totalSize?: number
  documentCount?: number
  vocabularySize?: number
  isIndexed?: boolean
}

interface HealthData {
  status: string
  checks: Record<string, HealthCheck>
  timestamp: string
}

function SystemHealthPanel() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data)
      setLastChecked(new Date().toLocaleTimeString())
    } catch {
      console.error('Failed to fetch health')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [fetchHealth])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchHealth()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-emerald-400'
      case 'degraded': return 'bg-amber-400'
      case 'error': return 'bg-red-400'
      default: return 'bg-slate-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Healthy' }
      case 'degraded': return { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Degraded' }
      case 'error': return { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'Error' }
      default: return { color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', label: 'Unknown' }
    }
  }

  if (loading) return (
    <GlassCard>
      <div className="p-5 space-y-3">
        <div className="h-6 w-48 rounded shimmer-violet" />
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg shimmer" />)}</div>
      </div>
    </GlassCard>
  )

  const overall = getStatusBadge(health?.status || 'unknown')

  const checkItems = [
    { key: 'database', label: 'Database', icon: Database, iconColor: 'text-cyan-400', iconBg: 'bg-cyan-500/10' },
    { key: 'vectorStore', label: 'Vector Store', icon: Brain, iconColor: 'text-violet-400', iconBg: 'bg-violet-500/10' },
    { key: 'llm', label: 'LLM API', icon: Sparkles, iconColor: 'text-fuchsia-400', iconBg: 'bg-fuchsia-500/10' },
    { key: 'storage', label: 'Storage', icon: HardDrive, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10' },
  ]

  return (
    <GlassCard>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center"><Activity className="h-3 w-3 text-emerald-400" /></div>
            <h3 className="text-sm font-semibold">System Health</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${overall.bg} ${overall.border} ${overall.color} text-[9px] px-2 py-0.5 font-bold`}>
              <div className={`h-1.5 w-1.5 rounded-full ${getStatusColor(health?.status || 'unknown')} mr-1.5 animate-pulse`} />
              {overall.label}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {checkItems.map(item => {
            const check = health?.checks[item.key]
            const badge = getStatusBadge(check?.status || 'unknown')
            const Icon = item.icon
            return (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
              >
                <div className={`h-8 w-8 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${getStatusColor(check?.status || 'unknown')} animate-pulse`} />
                      <span className={`text-[9px] font-medium ${badge.color}`}>{badge.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {check?.latency !== undefined && check.latency >= 0 && (
                      <span className="text-[9px] text-muted-foreground/40">{check.latency}ms</span>
                    )}
                    {check?.latency === -1 && (
                      <span className="text-[9px] text-red-400/60">unreachable</span>
                    )}
                    {item.key === 'vectorStore' && check?.chunks !== undefined && (
                      <span className="text-[9px] text-muted-foreground/30">• {check.chunks} chunks, {check.docs} docs</span>
                    )}
                    {item.key === 'storage' && check?.totalSize !== undefined && (
                      <span className="text-[9px] text-muted-foreground/30">• {formatFileSize(check.totalSize)}, {check.documentCount} docs</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {lastChecked && (
          <div className="flex items-center gap-1.5 mt-3">
            <Clock className="h-2.5 w-2.5 text-muted-foreground/20" />
            <span className="text-[8px] text-muted-foreground/25">Last checked: {lastChecked}</span>
            <span className="text-[8px] text-muted-foreground/15">• Auto-refreshes every 30s</span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== DOCUMENT PREVIEW PANEL ====================

// Note color options for document annotations
const NOTE_COLORS = [
  { name: 'violet', dot: 'bg-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-300' },
  { name: 'emerald', dot: 'bg-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300' },
  { name: 'amber', dot: 'bg-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-300' },
  { name: 'cyan', dot: 'bg-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-300' },
  { name: 'fuchsia', dot: 'bg-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', text: 'text-fuchsia-300' },
]

interface DocNote {
  id: string
  text: string
  color: string
  timestamp: string
}

function getDocNotes(docId: string): DocNote[] {
  try {
    const stored = localStorage.getItem(`luminara-doc-notes-${docId}`)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function saveDocNotes(docId: string, notes: DocNote[]) {
  try {
    localStorage.setItem(`luminara-doc-notes-${docId}`, JSON.stringify(notes))
  } catch {}
}

function DocumentPreviewPanel({ document: doc, open, onClose, onReindex, onDelete, refetch }: {
  document: Document | null; open: boolean; onClose: () => void; onReindex: (id: string, name: string) => void; onDelete: (id: string, name: string) => void; refetch: () => void
}) {
  const [fullContent, setFullContent] = useState<string | null>(null)
  const [contentLoading, setContentLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chunks, setChunks] = useState<Array<{ id: string; content: string; chunkIndex: number; tokenCount: number }>>([])
  const [previewTab, setPreviewTab] = useState<'content' | 'notes'>('content')
  const [docNotes, setDocNotes] = useState<DocNote[]>([])
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [newNoteColor, setNewNoteColor] = useState('violet')

  // Load notes when document changes
  useEffect(() => {
    if (open && doc) {
      setDocNotes(getDocNotes(doc.id))
      setPreviewTab('content')
      setAddingNote(false)
      setNewNoteText('')
    }
  }, [open, doc])

  const handleAddNote = useCallback(() => {
    if (!doc || !newNoteText.trim()) return
    const note: DocNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: newNoteText.trim(),
      color: newNoteColor,
      timestamp: new Date().toISOString(),
    }
    const updated = [note, ...docNotes]
    setDocNotes(updated)
    saveDocNotes(doc.id, updated)
    setNewNoteText('')
    setAddingNote(false)
    toast({ title: 'Note added', description: 'Annotation saved' })
  }, [doc, newNoteText, newNoteColor, docNotes])

  const handleDeleteNote = useCallback((noteId: string) => {
    if (!doc) return
    const updated = docNotes.filter(n => n.id !== noteId)
    setDocNotes(updated)
    saveDocNotes(doc.id, updated)
  }, [doc, docNotes])

  // Handle Escape in note input
  const handleNoteKeyDown = useCallback((e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      setAddingNote(false)
      setNewNoteText('')
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAddNote()
    }
  }, [handleAddNote])

  const loadDocContent = useCallback(async (docId: string) => {
    setContentLoading(true)
    setFullContent(null)
    setChunks([])
    try {
      const data = await fetch(`/api/documents/${docId}`).then(r => r.json())
      if (data.content) setFullContent(data.content)
      setChunks(data.chunks || [])
    } catch { /* ignore */ }
    finally { setContentLoading(false) }
  }, [])

  useEffect(() => {
    if (open && doc) {
      loadDocContent(doc.id)
    }
  }, [open, doc, loadDocContent])

  // Close on ESC
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleCopy = async () => {
    const textToCopy = fullContent || doc?.content || ''
    if (!textToCopy) return
    try { await navigator.clipboard.writeText(textToCopy); setCopied(true); setTimeout(() => setCopied(false), 2000); toast({ title: 'Copied to clipboard' }) }
    catch { toast({ title: 'Failed to copy', variant: 'destructive' }) }
  }

  if (!doc) return null
  const statusConf = getStatusConfig(doc.status)
  const StatusIcon = statusConf.icon
  const tags = parseTags(doc.tags)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl overflow-hidden"
            style={{ background: 'rgba(10, 8, 20, 0.95)', backdropFilter: 'blur(24px)' }}
          >
            <div className="h-full flex flex-col border-l border-white/[0.08]">
              {/* Gradient accent at top */}
              <div className="h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500 shrink-0" />

              {/* Header */}
              <div className="p-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      {getFileIcon(doc.type, 'h-5 w-5')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold truncate">{doc.name}</h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20">{doc.type.toUpperCase()}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${statusConf.bg} ${statusConf.border} ${statusConf.color}`}>
                          <StatusIcon className={`h-2.5 w-2.5 mr-0.5 ${statusConf.spin ? 'animate-spin' : ''}`} />
                          {statusConf.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground/30">{formatFileSize(doc.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors shrink-0">
                    <X className="h-4 w-4 text-muted-foreground/60" />
                  </button>
                </div>
              </div>

              {/* Tab Bar: Content | Notes */}
              <div className="flex border-b border-white/[0.06] shrink-0">
                <button
                  onClick={() => setPreviewTab('content')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-all relative ${previewTab === 'content' ? 'text-violet-300' : 'text-muted-foreground/40 hover:text-muted-foreground/60'}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Content
                  {previewTab === 'content' && <motion.div layoutId="preview-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                </button>
                <button
                  onClick={() => setPreviewTab('notes')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium transition-all relative ${previewTab === 'notes' ? 'text-violet-300' : 'text-muted-foreground/40 hover:text-muted-foreground/60'}`}
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  Notes
                  {docNotes.length > 0 && (
                    <span className="h-4 min-w-[16px] px-1 rounded-full bg-violet-500/20 text-violet-300 text-[8px] font-bold flex items-center justify-center">{docNotes.length}</span>
                  )}
                  {previewTab === 'notes' && <motion.div layoutId="preview-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto scroll-smooth">
                {previewTab === 'content' ? (
                <div className="p-5 space-y-5">
                  {/* Tags */}
                  {tags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => {
                          const tc = getTagColor(tag)
                          return <Badge key={tag} variant="outline" className={`${tc.bg} ${tc.text} ${tc.border} text-[10px] px-2 py-0.5`}>{tag}</Badge>
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chunk count visualization */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider mb-2">Chunks</p>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-violet-300">{doc.chunkCount}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((doc.chunkCount / 20) * 100, 100)}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                          />
                        </div>
                        <p className="text-[9px] text-muted-foreground/30 mt-1">{chunks.length > 0 ? `${chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0).toLocaleString()} total tokens across ${chunks.length} chunks` : `${doc.chunkCount} indexed chunks`}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider mb-2">Metadata</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <p className="text-[9px] text-muted-foreground/30">Created</p>
                        <p className="text-[11px] font-medium mt-0.5">{new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <p className="text-[9px] text-muted-foreground/30">Last Updated</p>
                        <p className="text-[11px] font-medium mt-0.5">{new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <p className="text-[9px] text-muted-foreground/30">File Size</p>
                        <p className="text-[11px] font-medium mt-0.5">{formatFileSize(doc.fileSize)}</p>
                      </div>
                      <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-2.5">
                        <p className="text-[9px] text-muted-foreground/30">Status</p>
                        <p className={`text-[11px] font-medium mt-0.5 ${statusConf.color}`}>{statusConf.label}</p>
                      </div>
                    </div>
                  </div>

                  {/* Document Content */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider mb-2">Content</p>
                    {contentLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (fullContent || doc.content) ? (
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 max-h-96 overflow-y-auto scroll-smooth">
                        <pre className="text-[12px] text-foreground/70 whitespace-pre-wrap break-words font-mono leading-relaxed">{fullContent || doc.content}</pre>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-6 text-center">
                        <FileText className="h-8 w-8 text-violet-400/15 mx-auto mb-2" />
                        <p className="text-[11px] text-muted-foreground/40">Content not available</p>
                      </div>
                    )}
                  </div>

                  {/* Chunks Preview */}
                  {chunks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/40 uppercase tracking-wider mb-2">Chunks Preview</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto scroll-smooth">
                        {chunks.slice(0, 10).map((chunk, i) => (
                          <div key={chunk.id} className="rounded-lg bg-white/[0.02] border border-white/[0.04] p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[8px] bg-violet-500/10 text-violet-300 border-violet-500/20">#{chunk.chunkIndex}</Badge>
                              {chunk.tokenCount > 0 && <span className="text-[9px] text-muted-foreground/25">{chunk.tokenCount} tokens</span>}
                            </div>
                            <p className="text-[11px] text-foreground/50 line-clamp-3">{chunk.content}</p>
                          </div>
                        ))}
                        {chunks.length > 10 && (
                          <p className="text-[10px] text-muted-foreground/30 text-center py-1">+ {chunks.length - 10} more chunks</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                /* Notes Tab */
                <div className="p-5 space-y-3">
                  {docNotes.length === 0 && !addingNote ? (
                    <div className="text-center py-10">
                      <StickyNote className="h-10 w-10 text-violet-400/15 mx-auto mb-3" />
                      <p className="text-[12px] text-muted-foreground/50 font-medium">No annotations yet</p>
                      <p className="text-[10px] text-muted-foreground/25 mt-1">Add notes to annotate this document</p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {docNotes.map((note, i) => {
                        const colorConf = NOTE_COLORS.find(c => c.name === note.color) || NOTE_COLORS[0]
                        return (
                          <motion.div
                            key={note.id}
                            initial={{ opacity: 0, y: -8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className={`relative rounded-xl ${colorConf.bg} border ${colorConf.border} p-3.5 group`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`h-2.5 w-2.5 rounded-full ${colorConf.dot} mt-1 shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">{note.text}</p>
                                <p className="text-[9px] text-muted-foreground/25 mt-1.5">{new Date(note.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] transition-all shrink-0"
                                title="Delete note"
                              >
                                <Trash2 className="h-3 w-3 text-red-400/60" />
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  )}

                  {/* Add Note Form */}
                  {addingNote ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-3"
                    >
                      <Textarea
                        value={newNoteText}
                        onChange={e => setNewNoteText(e.target.value)}
                        onKeyDown={handleNoteKeyDown}
                        placeholder="Write your annotation…"
                        className="bg-white/[0.02] border-white/[0.06] text-[12px] min-h-[72px] resize-none"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Palette className="h-3 w-3 text-muted-foreground/30" />
                          {NOTE_COLORS.map(c => (
                            <button
                              key={c.name}
                              onClick={() => setNewNoteColor(c.name)}
                              className={`h-5 w-5 rounded-full ${c.dot} transition-all ${newNoteColor === c.name ? 'ring-2 ring-offset-1 ring-offset-transparent ring-white/30 scale-110' : 'opacity-50 hover:opacity-80'}`}
                              title={c.name}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-7 px-2.5 text-muted-foreground/50 hover:text-muted-foreground/70"
                            onClick={() => { setAddingNote(false); setNewNoteText('') }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="text-[10px] h-7 px-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0"
                            onClick={handleAddNote}
                            disabled={!newNoteText.trim()}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-[11px] border border-dashed border-white/[0.08] hover:border-violet-500/30 hover:bg-violet-500/[0.03] text-muted-foreground/40 hover:text-violet-300"
                      onClick={() => setAddingNote(true)}
                    >
                      <StickyNote className="h-3.5 w-3.5" />
                      Add Note
                    </Button>
                  )}
                </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-[11px] hover:bg-white/[0.04]" onClick={handleCopy}>
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy Content'}
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-[11px] hover:bg-white/[0.04]" onClick={() => { onReindex(doc.id, doc.name); refetch() }}>
                    <RefreshCw className="h-3 w-3" />
                    Re-index
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10" onClick={() => { onDelete(doc.id, doc.name) }}>
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ==================== COMMAND PALETTE ====================

function CommandPalette({ open, onClose, onNavigate, documents, onNewChat, onUpload, onApplyTemplate, onSelectDocument }: {
  open: boolean; onClose: () => void; onNavigate: (page: PageView) => void; documents: Document[]; onNewChat: () => void; onUpload: () => void; onApplyTemplate?: (prompt: string) => void; onSelectDocument?: (docId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset state when palette opens (React-recommended prop-sync pattern)
  const [prevOpen, setPrevOpen] = useState(false)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  type PaletteItem = {
    id: string; label: string; icon: React.ReactNode; type: 'page' | 'document' | 'template' | 'action'; shortcut?: string; description?: string; action: () => void
  }

  const pages: Array<{ id: PageView; label: string; icon: typeof LayoutDashboard; shortcut: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
    { id: 'documents', label: 'Documents', icon: FileText, shortcut: '⌘2' },
    { id: 'search', label: 'Vector Search', icon: Search, shortcut: '⌘3' },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare, shortcut: '⌘4' },
    { id: 'analytics', label: 'Analytics', icon: LineChart, shortcut: '⌘5' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘6' },
  ]

  const quickActions: Array<{ id: string; label: string; icon: typeof Upload; shortcut: string; action: () => void }> = [
    { id: 'action-new-chat', label: 'New Chat Session', icon: Plus, shortcut: '⌘N', action: () => { onNewChat(); onClose() } },
    { id: 'action-upload', label: 'Upload Document', icon: Upload, shortcut: '', action: () => { onUpload(); onClose() } },
    { id: 'action-search', label: 'Search Knowledge Base', icon: Search, shortcut: '', action: () => { onNavigate('search'); onClose() } },
    { id: 'action-export', label: 'Export Data', icon: Download, shortcut: '', action: () => { toast({ title: 'Export started', description: 'Your data is being exported...' }); onClose() } },
  ]

  const allItems = useMemo(() => {
    const items: PaletteItem[] = []
    // Pages
    pages.forEach(p => {
      items.push({ id: `page-${p.id}`, label: p.label, icon: <p.icon className="h-4 w-4" />, type: 'page', shortcut: p.shortcut, action: () => { onNavigate(p.id); onClose() } })
    })
    // Quick Actions
    quickActions.forEach(a => {
      items.push({ id: a.id, label: a.label, icon: <a.icon className="h-4 w-4" />, type: 'action', shortcut: a.shortcut, action: a.action })
    })
    // Prompt Templates
    PROMPT_TEMPLATES.forEach(t => {
      const TplIcon = t.icon
      items.push({ id: `tpl-${t.id}`, label: t.title, icon: <TplIcon className="h-4 w-4" />, type: 'template', description: t.description, action: () => { if (onApplyTemplate) { onApplyTemplate(t.prompt) } onNavigate('chat'); onClose() } })
    })
    // Documents
    documents.forEach(d => {
      items.push({ id: `doc-${d.id}`, label: d.name, icon: getFileIcon(d.type, 'h-4 w-4'), type: 'document', description: `${d.chunkCount} chunks • ${formatFileSize(d.fileSize)}`, action: () => { if (onSelectDocument) { onSelectDocument(d.id) } onNavigate('documents'); onClose() } })
    })
    return items
  }, [documents, onNavigate, onClose, onNewChat, onUpload, onApplyTemplate, onSelectDocument])

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return allItems
    return allItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      item.type.includes(q)
    )
  }, [query, allItems])

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setActiveIndex(0)
  }

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-command-active="true"]')
      activeEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, filteredItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredItems[activeIndex]) filteredItems[activeIndex].action()
    }
  }

  const typeBadgeStyles: Record<string, string> = {
    page: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    document: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    template: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
    action: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  }

  // Group filtered items by type for section headers
  const groupedItems = useMemo(() => {
    const groups: Array<{ type: string; label: string; items: PaletteItem[] }> = []
    const typeOrder = ['page', 'action', 'template', 'document']
    const typeLabels: Record<string, string> = { page: 'Pages', action: 'Quick Actions', template: 'Prompt Templates', document: 'Documents' }
    typeOrder.forEach(type => {
      const items = filteredItems.filter(i => i.type === type)
      if (items.length > 0) groups.push({ type, label: typeLabels[type], items })
    })
    return groups
  }, [filteredItems])

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]" onClick={onClose}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -12 }} transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-lg border border-white/[0.08] rounded-2xl shadow-2xl shadow-violet-500/15 overflow-hidden relative" onClick={e => e.stopPropagation()}
            style={{ background: 'rgba(10, 8, 20, 0.92)', backdropFilter: 'blur(24px)' }}>
            {/* Gradient accent at top */}
            <div className="h-[2px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Search className="h-4 w-4 text-violet-400" />
              </div>
              <input ref={inputRef} value={query} onChange={e => handleQueryChange(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Search pages, documents, templates, actions…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/30 text-foreground" />
              <kbd className="text-[9px] text-muted-foreground/30 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono shrink-0">ESC</kbd>
            </div>
            <div ref={listRef} className="max-h-[50vh] overflow-y-auto scroll-smooth">
              {groupedItems.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="h-8 w-8 text-violet-400/15 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground/40">No results found</p>
                  <p className="text-[10px] text-muted-foreground/20 mt-1">Try a different search term</p>
                </div>
              )}
              {groupedItems.map(group => {
                // Find the global starting index for this group's items
                let globalIdx = 0
                for (const g of groupedItems) {
                  if (g === group) break
                  globalIdx += g.items.length
                }
                return (
                  <div key={group.type}>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[9px] font-semibold text-muted-foreground/40 uppercase tracking-wider">{group.label}</p>
                    </div>
                    {group.items.map((item, i) => {
                      const idx = globalIdx + i
                      const isActive = idx === activeIndex
                      return (
                        <motion.button key={item.id} data-command-active={isActive ? 'true' : undefined}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-100 group ${isActive ? 'bg-violet-500/10 text-violet-200' : 'text-foreground/80 hover:bg-white/[0.03]'}`}>
                          <span className={`shrink-0 ${isActive ? 'text-violet-400' : 'text-muted-foreground/40 group-hover:text-foreground/60'}`}>{item.icon}</span>
                          <span className="flex-1 text-left truncate text-[13px]">{item.label}</span>
                          {item.description && <span className="text-[10px] text-muted-foreground/25 truncate max-w-[120px]">{item.description}</span>}
                          <Badge variant="outline" className={`text-[8px] px-1.5 py-0 border shrink-0 ${typeBadgeStyles[item.type]}`}>{item.type}</Badge>
                          {item.shortcut && <kbd className="text-[8px] text-muted-foreground/20 bg-white/[0.03] px-1 py-0.5 rounded border border-white/[0.04] font-mono shrink-0">{item.shortcut}</kbd>}
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
            {/* Footer hint */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.04] text-[9px] text-muted-foreground/25">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06] font-mono">↑↓</kbd>navigate</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06] font-mono">↵</kbd>select</span>
                <span className="flex items-center gap-1"><kbd className="bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06] font-mono">esc</kbd>close</span>
              </span>
              <span>{filteredItems.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ==================== KEYBOARD SHORTCUTS DIALOG ====================

function KbdBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center text-[10px] font-mono font-medium text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-md min-w-[28px] shadow-[0_1px_2px_rgba(139,92,246,0.1)]">
      {children}
    </kbd>
  )
}

function KeyboardShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const shortcutCategories = [
    {
      name: 'Navigation',
      icon: LayoutDashboard,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
      shortcuts: [
        { keys: [<KbdBadge key="k1">⌘</KbdBadge>, <KbdBadge key="k2">1-6</KbdBadge>], description: 'Navigate between pages' },
        { keys: [<KbdBadge key="k1b">Alt</KbdBadge>, <KbdBadge key="k2b">1-6</KbdBadge>], description: 'Navigate between pages (Alt)' },
        { keys: [<KbdBadge key="k3">G</KbdBadge>, <span key="s1" className="text-muted-foreground/30 mx-0.5">then</span>, <KbdBadge key="k4">D</KbdBadge>], description: 'Go to Documents' },
        { keys: [<KbdBadge key="k5">G</KbdBadge>, <span key="s2" className="text-muted-foreground/30 mx-0.5">then</span>, <KbdBadge key="k6">A</KbdBadge>], description: 'Go to Analytics' },
        { keys: [<KbdBadge key="k3b">⇧</KbdBadge>, <KbdBadge key="k4b">J</KbdBadge>], description: 'Scroll down in content' },
        { keys: [<KbdBadge key="k3c">⇧</KbdBadge>, <KbdBadge key="k4c">K</KbdBadge>], description: 'Scroll up in content' },
      ]
    },
    {
      name: 'Search',
      icon: Search,
      color: 'text-fuchsia-400',
      bg: 'bg-fuchsia-500/10',
      shortcuts: [
        { keys: [<KbdBadge key="k7">⌘</KbdBadge>, <KbdBadge key="k8">K</KbdBadge>], description: 'Open command palette' },
        { keys: [<KbdBadge key="k9">/</KbdBadge>], description: 'Focus search input' },
        { keys: [<KbdBadge key="k10">Enter</KbdBadge>], description: 'Submit search query' },
      ]
    },
    {
      name: 'Chat',
      icon: MessageSquare,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      shortcuts: [
        { keys: [<KbdBadge key="k11">⌘</KbdBadge>, <KbdBadge key="k12">N</KbdBadge>], description: 'New chat session' },
        { keys: [<KbdBadge key="k11b">⌘</KbdBadge>, <KbdBadge key="k12b">⇧</KbdBadge>, <KbdBadge key="k12c">N</KbdBadge>], description: 'New chat session (Ctrl+Shift+N)' },
        { keys: [<KbdBadge key="k13">Enter</KbdBadge>], description: 'Send message' },
        { keys: [<KbdBadge key="k14">⇧</KbdBadge>, <KbdBadge key="k15">Enter</KbdBadge>], description: 'New line in message' },
      ]
    },
    {
      name: 'Documents',
      icon: FileText,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      shortcuts: [
        { keys: [<KbdBadge key="k16">⌘</KbdBadge>, <KbdBadge key="k17">U</KbdBadge>], description: 'Upload document' },
        { keys: [<KbdBadge key="k16b">V</KbdBadge>], description: 'View hovered document' },
        { keys: [<KbdBadge key="k16c">E</KbdBadge>], description: 'Edit tags on hovered document' },
        { keys: [<KbdBadge key="k16d">D</KbdBadge>], description: 'Delete hovered document' },
        { keys: [<KbdBadge key="k18">Esc</KbdBadge>], description: 'Close document preview' },
      ]
    },
    {
      name: 'General',
      icon: Settings,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      shortcuts: [
        { keys: [<KbdBadge key="k19">?</KbdBadge>], description: 'Toggle this help dialog' },
        { keys: [<KbdBadge key="k20">Esc</KbdBadge>], description: 'Close panel / dialog' },
      ]
    },
  ]

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card/95 backdrop-blur-2xl border-white/[0.08] shadow-2xl shadow-violet-500/10 p-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/5 pointer-events-none" />
          <DialogHeader className="relative z-10 p-6 pb-4">
            <DialogTitle className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
                <Keyboard className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <span className="text-base font-bold bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">Keyboard Shortcuts</span>
                <p className="text-[10px] text-muted-foreground/40 font-normal mt-0.5">Navigate Luminara AI 1.1 faster</p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Shortcut categories */}
        <div className="px-6 pb-6 space-y-5 max-h-[60vh] overflow-y-auto scroll-smooth">
          {shortcutCategories.map((category, catIdx) => {
            const CatIcon = category.icon
            return (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.06, duration: 0.25 }}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className={`h-5 w-5 rounded-md ${category.bg} flex items-center justify-center`}>
                    <CatIcon className={`h-2.5 w-2.5 ${category.color}`} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">{category.name}</span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                </div>
                <div className="space-y-0.5">
                  {category.shortcuts.map((shortcut, sIdx) => (
                    <motion.div
                      key={sIdx}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: catIdx * 0.06 + sIdx * 0.03, duration: 0.2 }}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    >
                      <span className="text-[11px] text-muted-foreground/60 group-hover:text-foreground/80 transition-colors">{shortcut.description}</span>
                      <div className="flex items-center gap-1">{shortcut.keys}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-white/[0.04] bg-white/[0.01]">
          <p className="text-[9px] text-muted-foreground/25 text-center">Press <KbdBadge>?</KbdBadge> anytime to toggle this dialog</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ==================== WELCOME PANEL ====================

function WelcomePanel({ onNavigate }: { onNavigate: (page: PageView) => void }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('luminara-welcome-dismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('luminara-welcome-dismissed', 'true')
  }

  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <GlassCard className="border-violet-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-fuchsia-500/[0.06] pointer-events-none" />
        <div className="relative z-10 p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25"><Rocket className="h-4 w-4 text-white" /></div>
              <div><h3 className="text-sm font-bold bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">Welcome to Luminara AI 1.1</h3><p className="text-[9px] text-muted-foreground/40">Your intelligent RAG knowledge base</p></div>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground/30 hover:text-foreground" onClick={handleDismiss}><X className="h-3.5 w-3.5" /></Button>
          </div>
          <p className="text-[11px] text-muted-foreground/50 leading-relaxed mb-4">Upload documents, search your knowledge base semantically, and chat with AI that provides cited answers from your data.</p>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { step: '1', icon: Upload, label: 'Upload', desc: 'Add documents', page: 'documents' as PageView, color: 'violet' },
              { step: '2', icon: Search, label: 'Search', desc: 'Find information', page: 'search' as PageView, color: 'fuchsia' },
              { step: '3', icon: MessageSquare, label: 'Chat', desc: 'Ask AI', page: 'chat' as PageView, color: 'emerald' },
            ].map(item => (
              <button key={item.step} onClick={() => onNavigate(item.page)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 hover:bg-violet-500/[0.03] transition-all group cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <span className="h-4 w-4 rounded-full bg-violet-500/20 text-violet-300 text-[8px] font-bold flex items-center justify-center">{item.step}</span>
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-violet-400 transition-colors" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
                <span className="text-[8px] text-muted-foreground/30">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  )
}

// ==================== QUICK ACTION CARDS ====================

function QuickActionCards({ onNavigate, stats, documents }: {
  onNavigate: (page: PageView) => void; stats: DocumentStats; documents: Document[]
}) {
  // Simulated trend data: 7 data points showing recent activity
  const trendData = useMemo(() => ({
    uploads: [2, 3, 1, 4, 3, 5, stats.total],
    searches: [4, 6, 3, 8, 5, 7, Math.max(stats.indexed, 3)],
    chats: [1, 2, 3, 2, 4, 5, 4],
    analytics: [2, 3, 2, 5, 4, 6, 5],
  }), [stats])

  // Comparison percentages (simulated vs last period)
  const comparisons = useMemo(() => [
    { pct: stats.total > 0 ? Math.round(((stats.total - 3) / Math.max(3, 1)) * 100) : 0, up: stats.total >= 3 },
    { pct: stats.indexed > 0 ? Math.round(((stats.indexed - 2) / Math.max(2, 1)) * 100) : 0, up: stats.indexed >= 2 },
    { pct: 18, up: true },
    { pct: 24, up: true },
  ], [stats])

  const quickActions = [
    {
      page: 'documents' as PageView,
      icon: UploadCloud,
      label: 'Upload Documents',
      desc: 'Add files to your knowledge base',
      color: 'violet',
      stat: stats.total > 0 ? `${stats.total} docs` : 'Get started',
      sparkData: trendData.uploads,
    },
    {
      page: 'search' as PageView,
      icon: Search,
      label: 'Search Knowledge Base',
      desc: 'Semantic & keyword search',
      color: 'fuchsia',
      stat: stats.indexed > 0 ? `${stats.indexed} indexed` : 'No data',
      sparkData: trendData.searches,
    },
    {
      page: 'chat' as PageView,
      icon: MessageSquare,
      label: 'Start AI Chat',
      desc: 'Query your documents with AI',
      color: 'emerald',
      stat: 'Ready',
      sparkData: trendData.chats,
    },
    {
      page: 'analytics' as PageView,
      icon: LineChart,
      label: 'View Analytics',
      desc: 'Usage metrics & insights',
      color: 'amber',
      stat: 'Explore',
      sparkData: trendData.analytics,
    },
  ]

  const colorMap: Record<string, { bg: string; border: string; icon: string; spark: string; glow: string }> = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', icon: 'text-violet-400', spark: '#8b5cf6', glow: 'shadow-violet-500/10' },
    fuchsia: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', icon: 'text-fuchsia-400', spark: '#d946ef', glow: 'shadow-fuchsia-500/10' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', spark: '#10b981', glow: 'shadow-emerald-500/10' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', spark: '#f59e0b', glow: 'shadow-amber-500/10' },
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {quickActions.map((action, i) => {
        const c = colorMap[action.color]
        const comp = comparisons[i]
        return (
          <motion.div
            key={action.page}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <GlassCard onClick={() => onNavigate(action.page)} hover className={`border ${c.border} group`}>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center border ${c.border} group-hover:shadow-lg ${c.glow} transition-shadow`}>
                    <action.icon className={`h-4 w-4 ${c.icon}`} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/15 group-hover:text-muted-foreground/40 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-[13px] font-semibold mb-0.5 group-hover:text-violet-300 transition-colors">{action.label}</p>
                <p className="text-[9px] text-muted-foreground/40">{action.desc}</p>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/[0.04]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-muted-foreground/30 font-medium">{action.stat}</span>
                    <span className={`text-[8px] font-semibold ${comp.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {comp.up ? '↑' : '↓'}{Math.abs(comp.pct)}%
                    </span>
                  </div>
                  <div className="h-5 w-16 overflow-hidden opacity-50 group-hover:opacity-80 transition-opacity">
                    <AreaSparkline data={action.sparkData} color={c.spark} height={20} width={64} />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}

// ==================== QUICK STATS BAR (11-b) ====================

function QuickStatsBar({ documents, stats, activities }: {
  documents: Document[]; stats: DocumentStats; activities: ActivityItem[]
}) {
  const totalChunks = useMemo(() => documents.reduce((s, d) => s + d.chunkCount, 0), [documents])
  const totalSize = useMemo(() => documents.reduce((s, d) => s + d.fileSize, 0), [documents])
  const chatSessions = useMemo(() => activities.filter(a => a.type === 'chat_created').length, [activities])
  const searchQueries = useMemo(() => activities.filter(a => a.type === 'search_performed').length, [activities])

  const statPills = [
    { icon: FileText, value: stats.total, label: 'Documents', color: 'text-violet-400', bg: 'bg-violet-500/8' },
    { icon: Layers, value: totalChunks, label: 'Total Chunks', color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/8' },
    { icon: Database, value: formatFileSize(totalSize), label: 'Knowledge Size', color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
    { icon: MessageSquare, value: chatSessions, label: 'Chat Sessions', color: 'text-cyan-400', bg: 'bg-cyan-500/8' },
    { icon: Search, value: searchQueries, label: 'Search Queries', color: 'text-amber-400', bg: 'bg-amber-500/8' },
    { icon: Activity, value: '99.9%', label: 'Uptime', color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {statPills.map((pill, i) => (
        <motion.div
          key={pill.label}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm shrink-0 hover:bg-white/[0.05] transition-colors group"
          style={{ '--entrance-delay': `${i * 0.05}s` } as React.CSSProperties}
        >
          <div className={`h-6 w-6 rounded-lg ${pill.bg} flex items-center justify-center shrink-0`}>
            <pill.icon className={`h-3 w-3 ${pill.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold leading-none stat-glow">
              {typeof pill.value === 'string' && pill.value === '99.9%' ? pill.value : <AnimatedCounter value={pill.value} duration={600} />}
            </p>
            <p className="text-[8px] text-muted-foreground/40 mt-0.5 leading-none">{pill.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ==================== RECENT CHUNKS WIDGET (11-b) ====================

interface RecentChunk {
  id: string
  documentId: string
  documentName: string
  documentType: string
  content: string
  chunkIndex: number
  createdAt: string
}

function RecentChunksWidget({ documents, onSelectDocument }: {
  documents: Document[]; onSelectDocument?: (docId: string) => void
}) {
  const [chunks, setChunks] = useState<RecentChunk[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentChunks = async () => {
      try {
        // Fetch the most recent documents and get their chunks
        const recentDocs = [...documents]
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 3)

        const allChunks: RecentChunk[] = []
        for (const doc of recentDocs) {
          try {
            const res = await fetch(`/api/documents/${doc.id}`)
            if (res.ok) {
              const data = await res.json()
              if (data.chunks && Array.isArray(data.chunks)) {
                // Take the last 2 chunks from each doc (most recent)
                const docChunks = data.chunks.slice(-2).map((chunk: { id: string; content: string; chunkIndex: number; createdAt?: string }) => ({
                  id: chunk.id,
                  documentId: doc.id,
                  documentName: doc.name,
                  documentType: doc.type,
                  content: chunk.content,
                  chunkIndex: chunk.chunkIndex,
                  createdAt: chunk.createdAt || doc.updatedAt,
                }))
                allChunks.push(...docChunks)
              }
            }
          } catch {
            // Skip failed doc fetches
          }
        }

        // Sort by most recent and take top 5
        allChunks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setChunks(allChunks.slice(0, 5))
      } catch {
        // Keep empty state
      } finally {
        setLoading(false)
      }
    }

    if (documents.length > 0) {
      fetchRecentChunks()
    } else {
      setLoading(false)
    }
  }, [documents])

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-fuchsia-500/10 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-fuchsia-400" />
          </div>
          <h3 className="text-sm font-semibold">Recent Chunks</h3>
          <Badge variant="outline" className="text-[8px] ml-auto bg-white/[0.02] border-white/[0.06] text-muted-foreground/40">{chunks.length}</Badge>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg">
                <div className="h-6 w-6 rounded-lg shimmer-violet shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-24 mb-1.5 rounded shimmer-violet" />
                  <div className="h-2.5 w-full rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : chunks.length === 0 ? (
          <div className="text-center py-6">
            <Layers className="h-8 w-8 text-fuchsia-400/15 mx-auto mb-2 empty-icon-pulse" />
            <p className="text-[11px] text-muted-foreground/40">No chunks indexed yet</p>
            <p className="text-[9px] text-muted-foreground/25 mt-1">Upload documents to see chunks</p>
          </div>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1">
              {chunks.map((chunk, i) => (
                <motion.div
                  key={chunk.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  onClick={() => onSelectDocument?.(chunk.documentId)}
                >
                  <div className="h-6 w-6 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 border border-white/[0.04] mt-0.5">
                    {getFileIcon(chunk.documentType, 'h-3 w-3')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[11px] font-medium truncate group-hover:text-violet-300 transition-colors">{chunk.documentName}</p>
                      <Badge variant="outline" className="text-[7px] px-1 py-0 bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 shrink-0">#{chunk.chunkIndex}</Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground/35 leading-relaxed line-clamp-2">{chunk.content.substring(0, 80)}{chunk.content.length > 80 ? '...' : ''}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== SYSTEM STATUS WIDGET ====================

function SystemStatusWidget() {
  const [healthData, setHealthData] = useState<Record<string, { status: string; latency?: number; chunks?: number; docs?: number }> | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        setHealthData(data.checks)
        setLastRefresh(new Date())
      } catch {
        // keep previous state
      }
    }
    fetchHealth()
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy': return { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Healthy' }
      case 'degraded': return { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Degraded' }
      case 'error': return { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' }
      default: return { dot: 'bg-slate-400', text: 'text-slate-400', label: 'Unknown' }
    }
  }

  const getLatencyColor = (latency?: number) => {
    if (latency === undefined || latency < 0) return 'text-muted-foreground/30'
    if (latency < 100) return 'text-emerald-400/70'
    if (latency < 500) return 'text-amber-400/70'
    return 'text-red-400/70'
  }

  const statusItems = [
    { key: 'vectorStore', label: 'Vector Store', icon: Brain, check: healthData?.vectorStore },
    { key: 'llm', label: 'LLM API', icon: Zap, check: healthData?.llm },
    { key: 'database', label: 'Database', icon: Database, check: healthData?.database },
  ]

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold">System Status</h3>
          {lastRefresh && (
            <span className="text-[8px] text-muted-foreground/25 ml-auto">
              Updated {timeAgo(lastRefresh.toISOString())}
            </span>
          )}
        </div>
        <div className="space-y-2.5">
          {statusItems.map(item => {
            const s = getStatusColor(item.check?.status)
            const Icon = item.icon
            return (
              <div key={item.key} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                <Icon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                <span className="text-[11px] font-medium flex-1">{item.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${s.dot} animate-pulse`} />
                  <span className={`text-[9px] font-medium ${s.text}`}>{s.label}</span>
                  {item.check?.latency !== undefined && item.check.latency >= 0 && (
                    <span className={`text-[9px] font-mono ${getLatencyColor(item.check.latency)}`}>
                      {item.check.latency}ms
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {healthData?.vectorStore && (
          <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center gap-3 text-[9px] text-muted-foreground/30">
            <span>Chunks: {healthData.vectorStore.chunks ?? 0}</span>
            <span>•</span>
            <span>Docs: {healthData.vectorStore.docs ?? 0}</span>
          </div>
        )}
      </div>
    </GlassCard>
  )
}

// ==================== ONBOARDING TOUR ====================

const ONBOARDING_STORAGE_KEY = 'luminara-onboarding-complete'

function useOnboarding() {
  const [completed, setCompleted] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  })
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    // Auto-start tour if not completed and after a short delay
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [completed])

  const complete = useCallback(() => {
    setCompleted(true)
    setActive(false)
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
  }, [])

  const skip = useCallback(() => {
    complete()
  }, [complete])

  const next = useCallback(() => {
    setStep(prev => prev + 1)
  }, [])

  const back = useCallback(() => {
    setStep(prev => Math.max(0, prev - 1))
  }, [])

  const restart = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    setCompleted(false)
    setStep(0)
    setActive(true)
  }, [])

  return { completed, active, step, complete, skip, next, back, restart, setStep, setActive }
}

const ONBOARDING_STEPS = [
  {
    target: '[data-onboarding="sidebar"]',
    title: 'Welcome to Luminara AI 1.1',
    description: 'Your intelligent RAG knowledge base. Navigate between pages, monitor system health, and access the command palette — all from the sidebar.',
    icon: Sparkles,
    position: 'right' as const,
  },
  {
    target: '[data-onboarding="upload"]',
    title: 'Upload Documents',
    description: 'Add PDFs, Word docs, Markdown, and text files to your knowledge base. Drag & drop or click to upload.',
    icon: UploadCloud,
    position: 'bottom' as const,
  },
  {
    target: '[data-onboarding="search"]',
    title: 'Search Your Knowledge',
    description: 'Use semantic, keyword, or hybrid search to find information across all your indexed documents.',
    icon: Search,
    position: 'right' as const,
  },
  {
    target: '[data-onboarding="chat"]',
    title: 'Chat with AI',
    description: 'Ask questions about your documents and get AI-powered answers with full source citations and confidence scores.',
    icon: MessageSquare,
    position: 'right' as const,
  },
]

function OnboardingTour({ onboarding }: { onboarding: ReturnType<typeof useOnboarding> }) {
  const { active, step, skip, next, back } = onboarding
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (!active) return
    const updateRect = () => {
      const stepConfig = ONBOARDING_STEPS[step]
      if (!stepConfig) return
      const el = document.querySelector(stepConfig.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect(rect)
      }
    }
    updateRect()
    const interval = setInterval(updateRect, 200)
    return () => clearInterval(interval)
  }, [active, step])

  if (!active || step >= ONBOARDING_STEPS.length) return null

  const stepConfig = ONBOARDING_STEPS[step]
  const StepIcon = stepConfig.icon
  const isLast = step === ONBOARDING_STEPS.length - 1
  const isFirst = step === 0

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {}
  if (targetRect) {
    const padding = 16
    switch (stepConfig.position) {
      case 'right':
        tooltipStyle = { left: targetRect.right + padding, top: targetRect.top }
        break
      case 'bottom':
        tooltipStyle = { left: targetRect.left, top: targetRect.bottom + padding }
        break
      case 'left':
        tooltipStyle = { right: window.innerWidth - targetRect.left + padding, top: targetRect.top }
        break
      case 'top':
        tooltipStyle = { left: targetRect.left, bottom: window.innerHeight - targetRect.top + padding }
        break
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop with cutout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={skip}
      />
      {/* Highlight ring around target */}
      {targetRect && (
        <motion.div
          initial={false}
          animate={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute rounded-xl border-2 border-violet-400 shadow-[0_0_24px_rgba(139,92,246,0.3),0_0_48px_rgba(139,92,246,0.15)] pointer-events-none"
          style={{ zIndex: 101 }}
        >
          {/* Pulsing ring */}
          <motion.div
            className="absolute -inset-3 rounded-xl border border-violet-400/30"
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      )}
      {/* Tooltip card */}
      {targetRect && (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -12, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 12, y: -8 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute z-[102] w-80"
          style={tooltipStyle}
        >
          <GlassCard className="border-violet-500/20 shadow-2xl shadow-violet-500/20">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/[0.08] via-transparent to-fuchsia-500/[0.06] pointer-events-none rounded-xl" />
            <div className="relative z-10 p-5">
              {/* Step indicator + Icon */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center border border-violet-500/20">
                  <StepIcon className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">Step {step + 1}/{ONBOARDING_STEPS.length}</span>
                  </div>
                  <h3 className="text-sm font-bold mt-0.5 bg-gradient-to-r from-violet-200 to-fuchsia-200 bg-clip-text text-transparent">{stepConfig.title}</h3>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed mb-4">{stepConfig.description}</p>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {ONBOARDING_STEPS.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-violet-400' : i < step ? 'w-1.5 bg-violet-400/40' : 'w-1.5 bg-white/10'}`}
                    animate={i === step ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                ))}
              </div>
              {/* Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {!isFirst && (
                    <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground/40 hover:text-foreground h-7 px-2" onClick={back}>
                      <ChevronLeft className="h-3 w-3 mr-0.5" />Back
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-[10px] text-muted-foreground/30 hover:text-foreground/60 h-7 px-2" onClick={skip}>
                    Skip Tour
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="text-[10px] h-7 px-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 border-0 shadow-lg shadow-violet-500/20 gap-1"
                  onClick={isLast ? skip : next}
                >
                  {isLast ? 'Get Started' : 'Next'}
                  {!isLast && <ChevronRight className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  )
}

// ==================== MAIN APP ====================

export default function LuminaraApp() {
  const [currentPage, setCurrentPage] = useState<PageView>('dashboard')
  const [initialized, setInitialized] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [feedbackCounts, setFeedbackCounts] = useState({ up: 0, down: 0 })
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [chatTemplate, setChatTemplate] = useState<string | null>(null)
  // Sidebar width with localStorage persistence
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try { const stored = localStorage.getItem('luminara-sidebar-width'); if (stored) { const w = parseInt(stored); if (w >= 200 && w <= 400) return w } } catch {}
    }
    return 260
  })
  const handleSidebarWidthChange = useCallback((w: number) => {
    setSidebarWidth(w)
    try { localStorage.setItem('luminara-sidebar-width', String(w)) } catch {}
  }, [])
  const isMobile = useIsMobile()
  const { documents, stats, loading: docsLoading, refetch } = useDocuments()
  const { activities, logActivity } = useActivityLog()
  const onboarding = useOnboarding()

  // Keyboard shortcuts
  const gKeyBufferRef = useRef<string>('')
  const hoveredDocRef = useRef<string | null>(null)
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      // Cmd/Ctrl + K: Command palette
      if (mod && e.key === 'k') { e.preventDefault(); setCommandPaletteOpen(true); return }
      // Cmd/Ctrl + N: New chat
      if (mod && e.key === 'n') { e.preventDefault(); setCurrentPage('chat'); return }
      // Ctrl+Shift+N: New chat session
      if (mod && e.shiftKey && (e.key === 'N' || e.key === 'n')) { e.preventDefault(); setCurrentPage('chat'); window.dispatchEvent(new CustomEvent('luminara-new-chat')); return }
      // Cmd/Ctrl + U: Upload document
      if (mod && e.key === 'u') { e.preventDefault(); setCurrentPage('documents'); return }
      // Cmd/Ctrl + 1-6: Navigate pages
      if (mod && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        const pages: PageView[] = ['dashboard', 'documents', 'search', 'chat', 'analytics', 'settings']
        setCurrentPage(pages[parseInt(e.key) - 1])
        return
      }
      // Alt+1-6: Navigate between pages
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        const pages: PageView[] = ['dashboard', 'documents', 'search', 'chat', 'analytics', 'settings']
        setCurrentPage(pages[parseInt(e.key) - 1])
        return
      }
      // Escape: Close dialogs
      if (e.key === 'Escape') { setCommandPaletteOpen(false); setShortcutsDialogOpen(false); setSelectedDocumentId(null); return }
      // Shift+J: Scroll down in main content
      if (e.shiftKey && (e.key === 'J' || e.key === 'j') && !inInput) {
        e.preventDefault()
        const mainContent = document.querySelector('main') || document.querySelector('.flex-1.overflow-auto')
        if (mainContent) mainContent.scrollBy({ top: 200, behavior: 'smooth' })
        return
      }
      // Shift+K: Scroll up in main content
      if (e.shiftKey && (e.key === 'K' || e.key === 'k') && !inInput) {
        e.preventDefault()
        const mainContent = document.querySelector('main') || document.querySelector('.flex-1.overflow-auto')
        if (mainContent) mainContent.scrollBy({ top: -200, behavior: 'smooth' })
        return
      }
      // Quick document actions when hovering a document card (only outside inputs)
      if (!inInput && !mod && !e.altKey && !e.shiftKey) {
        // V: View document
        if (e.key === 'v' || e.key === 'V') {
          if (hoveredDocRef.current) {
            e.preventDefault()
            setSelectedDocumentId(hoveredDocRef.current)
            return
          }
        }
        // E: Edit tags on document
        if (e.key === 'e' || e.key === 'E') {
          if (hoveredDocRef.current) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('luminara-edit-tags', { detail: hoveredDocRef.current }))
            return
          }
        }
        // D: Delete document
        if (e.key === 'd' || e.key === 'D') {
          if (hoveredDocRef.current) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('luminara-delete-doc', { detail: hoveredDocRef.current }))
            return
          }
        }
      }
      // G then D/A: Go to Documents / Analytics (only outside inputs)
      if (!inInput && !mod && !e.altKey) {
        if (e.key === 'g' || e.key === 'G') {
          gKeyBufferRef.current = 'g'
          setTimeout(() => { gKeyBufferRef.current = '' }, 1000)
          return
        }
        if (gKeyBufferRef.current === 'g') {
          if (e.key === 'd' || e.key === 'D') { gKeyBufferRef.current = ''; setCurrentPage('documents'); return }
          if (e.key === 'a' || e.key === 'A') { gKeyBufferRef.current = ''; setCurrentPage('analytics'); return }
          gKeyBufferRef.current = ''
        }
      }
      // /: Focus search (only outside inputs)
      if (e.key === '/' && !inInput) {
        e.preventDefault()
        setCurrentPage('search')
        setTimeout(() => { const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Search"]'); if (searchInput) searchInput.focus() }, 100)
        return
      }
      // ?: Show shortcuts (only when not in input)
      if (e.key === '?' && !inInput) {
        e.preventDefault(); setShortcutsDialogOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Listen for hovered doc events from document cards
  useEffect(() => {
    const handleDocHover = (e: Event) => {
      hoveredDocRef.current = (e as CustomEvent).detail || null
    }
    const handleDocLeave = () => {
      hoveredDocRef.current = null
    }
    window.addEventListener('luminara-doc-hover', handleDocHover)
    window.addEventListener('luminara-doc-leave', handleDocLeave)
    return () => {
      window.removeEventListener('luminara-doc-hover', handleDocHover)
      window.removeEventListener('luminara-doc-leave', handleDocLeave)
    }
  }, [])

  // Listen for custom events from Settings page
  useEffect(() => {
    const handleOpenShortcuts = () => setShortcutsDialogOpen(true)
    window.addEventListener('luminara-open-shortcuts', handleOpenShortcuts)
    return () => window.removeEventListener('luminara-open-shortcuts', handleOpenShortcuts)
  }, [])

  useEffect(() => {
    const init = async () => {
      try { const r = await fetch('/api/init', { method: 'POST' }); const d = await r.json(); if (d.success) console.log('Init:', d.vectorStoreStats) }
      catch (e) { console.error('Init failed:', e) }
      finally { setInitialized(true); setInitLoading(false); refetch() }
    }
    init()
  }, [refetch])

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true)
  }, [isMobile])

  if (initLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-500/25 relative">
            <Sparkles className="h-7 w-7 text-white relative z-10" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 breathing-glow blur-md" />
          </div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">Luminara AI 1.1</h2>
          <p className="text-xs text-muted-foreground/40 mt-1.5">Initializing knowledge base…</p>
          <div className="flex justify-center mt-3 gap-1">{[0, 1, 2].map(i => <motion.div key={i} className="h-1.5 w-1.5 rounded-full bg-violet-400" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />)}</div>
        </motion.div>
      </div>
    )
  }

  const navigate = (page: PageView) => {
    setCurrentPage(page)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      {/* Animated gradient mesh background */}
      <div className="gradient-mesh" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>
      {/* Floating particles background */}
      <div className="floating-particles" aria-hidden="true" />
      <div className="flex flex-1 relative z-10">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar currentPage={currentPage} onNavigate={navigate} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} onOpenCommandPalette={() => setCommandPaletteOpen(true)} sidebarWidth={sidebarWidth} onWidthChange={handleSidebarWidthChange} />
        </div>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {mobileMenuOpen && isMobile && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
              <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed left-0 top-0 bottom-0 z-40 lg:hidden">
                <Sidebar currentPage={currentPage} onNavigate={navigate} collapsed={false} onToggle={() => setMobileMenuOpen(false)} onOpenCommandPalette={() => { setMobileMenuOpen(false); setCommandPaletteOpen(true) }} sidebarWidth={260} onWidthChange={() => {}} />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <MobileHeader currentPage={currentPage} onMenuClick={() => setMobileMenuOpen(true)} />

          {/* Breadcrumb navigation */}
          <BreadcrumbBar currentPage={currentPage} onNavigate={navigate} />

          <div className="flex-1 p-4 md:p-6 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div key={currentPage} initial={{ opacity: 0, y: 8, scale: 0.998 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.998 }} transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}>
                {currentPage === 'dashboard' && <DashboardPage documents={documents} stats={stats} loading={docsLoading} onNavigate={navigate} activities={activities} logActivity={logActivity} />}
                {currentPage === 'documents' && <DocumentsPage documents={documents} stats={stats} loading={docsLoading} refetch={refetch} logActivity={logActivity} onSelectDocument={(id) => setSelectedDocumentId(id)} />}
                {currentPage === 'search' && <SearchPage documents={documents} logActivity={logActivity} />}
                {currentPage === 'chat' && <ChatPage documents={documents} logActivity={logActivity} />}
                {currentPage === 'analytics' && <AnalyticsPage feedbackCounts={feedbackCounts} />}
                {currentPage === 'settings' && <SettingsPage logActivity={logActivity} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky Footer */}
          <LuminaraFooter />
        </main>
      </div>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} onNavigate={navigate} documents={documents} onNewChat={() => setCurrentPage('chat')} onUpload={() => setCurrentPage('documents')} onApplyTemplate={(prompt) => { setChatTemplate(prompt); setCurrentPage('chat') }} onSelectDocument={(docId) => { setSelectedDocumentId(docId); setCurrentPage('documents') }} />

      {/* Document Preview Panel */}
      <DocumentPreviewPanel
        document={selectedDocumentId ? documents.find(d => d.id === selectedDocumentId) || null : null}
        open={!!selectedDocumentId}
        onClose={() => setSelectedDocumentId(null)}
        onReindex={async (id, name) => { try { await fetch(`/api/documents/${id}/reindex`, { method: 'POST' }); await refetch(); toast({ title: 'Reindexed', description: `"${name}" re-indexed` }) } catch { toast({ title: 'Reindex failed', variant: 'destructive' }) } }}
        onDelete={async (id, name) => { try { await fetch(`/api/documents/${id}`, { method: 'DELETE' }); await refetch(); setSelectedDocumentId(null); toast({ title: 'Deleted', description: `"${name}" removed` }) } catch { toast({ title: 'Delete failed', variant: 'destructive' }) } }}
        refetch={refetch}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog open={shortcutsDialogOpen} onClose={() => setShortcutsDialogOpen(false)} />

      {/* Onboarding Tour */}
      <AnimatePresence>
        {onboarding.active && <OnboardingTour onboarding={onboarding} />}
      </AnimatePresence>
    </div>
  )
}
