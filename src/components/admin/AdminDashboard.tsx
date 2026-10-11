import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Zap,
  Users,
  Key,
  Clock,
  RotateCw,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Upload,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  PauseCircle,
  PlayCircle,
  Search,
  Filter,
  X,
  LogOut,
  AlertTriangle,
  History,
  Settings,
  Activity,
  Globe,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onLogout: () => void;
}

type TabType =
  | 'overview'
  | 'generate'
  | 'codes'
  | 'active_visitors'
  | 'all_visitors'
  | 'audit_logs'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  token,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Overview Stats
  const [stats, setStats] = useState<any>(null);

  // Codes Tab State
  const [codes, setCodes] = useState<any[]>([]);
  const [codesPage, setCodesPage] = useState<number>(1);
  const [codesTotalPages, setCodesTotalPages] = useState<number>(1);
  const [codesTotal, setCodesTotal] = useState<number>(0);
  const [codesSearch, setCodesSearch] = useState<string>('');
  const [codesStatusFilter, setCodesStatusFilter] = useState<string>('all');
  const [revealedCodes, setRevealedCodes] = useState<{ [id: string]: string }>({});
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<any | null>(null);

  // Code Generator State
  const [genCount, setGenCount] = useState<number>(5);
  const [genDurationType, setGenDurationType] = useState<string>('24h');
  const [genCustomHours, setGenCustomHours] = useState<number>(48);
  const [genStartsOn, setGenStartsOn] = useState<'first_activation' | 'creation'>('first_activation');
  const [genMaxActivations, setGenMaxActivations] = useState<number>(1);
  const [genBatchName, setGenBatchName] = useState<string>('');
  const [genNote, setGenNote] = useState<string>('');
  const [generatedResult, setGeneratedResult] = useState<{ batch: any; plainCodes: string[] } | null>(null);

  // Visitors State
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [allVisitors, setAllVisitors] = useState<any[]>([]);
  const [visitorsPage, setVisitorsPage] = useState<number>(1);
  const [visitorsTotalPages, setVisitorsTotalPages] = useState<number>(1);
  const [visitorsSearch, setVisitorsSearch] = useState<string>('');
  const [visitorsStatusFilter, setVisitorsStatusFilter] = useState<string>('all');
  const [autoRefreshVisitors, setAutoRefreshVisitors] = useState<boolean>(true);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [storageDiag, setStorageDiag] = useState<any>(null);
  const [currentAdminPass, setCurrentAdminPass] = useState<string>('');
  const [newAdminPass, setNewAdminPass] = useState<string>('');
  const [confirmAdminPass, setConfirmAdminPass] = useState<string>('');
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [sessionHours, setSessionHours] = useState<number>(24);
  const [restoreJsonText, setRestoreJsonText] = useState<string>('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const refreshTimerRef = useRef<any>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionError(msg);
      setActionSuccess(null);
    } else {
      setActionSuccess(msg);
      setActionError(null);
    }
    setTimeout(() => {
      setActionSuccess(null);
      setActionError(null);
    }, 4000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Auth fetch helper
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      };
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        onLogout();
        throw new Error('جلسة الإدارة غير صالحة');
      }
      return res;
    },
    [token, onLogout]
  );

  // 1. Fetch Overview Stats
  const fetchOverview = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/overview');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // 2. Fetch Codes
  const fetchCodes = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: String(codesPage),
        limit: '15',
        search: codesSearch,
        status: codesStatusFilter,
      });
      const res = await authFetch(`/api/admin/codes?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCodes(data.codes);
        setCodesTotalPages(data.totalPages);
        setCodesTotal(data.total);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [authFetch, codesPage, codesSearch, codesStatusFilter]);

  // 3. Fetch Active Visitors
  const fetchActiveVisitors = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/visitors/active');
      const data = await res.json();
      if (data.success) {
        setActiveVisitors(data.visitors);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // 4. Fetch All Visitors
  const fetchAllVisitors = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        page: String(visitorsPage),
        limit: '15',
        search: visitorsSearch,
        status: visitorsStatusFilter,
      });
      const res = await authFetch(`/api/admin/visitors?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAllVisitors(data.visitors);
        setVisitorsTotalPages(data.totalPages);
      }
    } catch {
      // ignore
    }
  }, [authFetch, visitorsPage, visitorsSearch, visitorsStatusFilter]);

  // 5. Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // 6. Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setRetentionDays(data.settings.visitorRetentionDays || 30);
        setSessionHours(data.settings.adminSessionHours || 24);
      }
      const diagRes = await authFetch('/api/admin/storage-diagnostics');
      const diagData = await diagRes.json();
      if (diagData.success) {
        setStorageDiag(diagData.diagnostics);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // Initial tab loading
  useEffect(() => {
    if (!isOpen) return;
    fetchOverview();

    if (activeTab === 'overview') {
      fetchOverview();
      fetchActiveVisitors();
    } else if (activeTab === 'codes') {
      fetchCodes();
    } else if (activeTab === 'active_visitors') {
      fetchActiveVisitors();
    } else if (activeTab === 'all_visitors') {
      fetchAllVisitors();
    } else if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [isOpen, activeTab, fetchOverview, fetchCodes, fetchActiveVisitors, fetchAllVisitors, fetchAuditLogs, fetchSettings]);

  // Auto-refresh active visitors
  useEffect(() => {
    if (!isOpen || !autoRefreshVisitors || activeTab !== 'active_visitors') return;
    refreshTimerRef.current = setInterval(() => {
      fetchActiveVisitors();
    }, 10000);
    return () => clearInterval(refreshTimerRef.current);
  }, [isOpen, autoRefreshVisitors, activeTab, fetchActiveVisitors]);

  if (!isOpen) return null;

  // Handle Generate Codes
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/codes/generate', {
        method: 'POST',
        body: JSON.stringify({
          count: genCount,
          durationType: genDurationType,
          customMinutes: genDurationType === 'custom' ? genCustomHours * 60 : undefined,
          startsOn: genStartsOn,
          maxActivations: genMaxActivations,
          batchName: genBatchName,
          note: genNote,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setGeneratedResult({ batch: data.batch, plainCodes: data.plainCodes });
        showNotification(`تم إنشاء دفعة بنجاح بعدد ${data.plainCodes.length} كود!`);
        fetchOverview();
      } else {
        showNotification(data.error || 'فشل إنشاء الأكواد', true);
      }
    } catch {
      showNotification('حدث خطأ في الاتصال أثناء التوليد', true);
    } finally {
      setLoading(false);
    }
  };

  // Toggle code status (active / suspended / revoked)
  const handleUpdateCodeStatus = async (id: string, newStatus: 'active' | 'suspended' | 'revoked') => {
    const actionName =
      newStatus === 'revoked' ? 'إلغاء نهائي' : newStatus === 'suspended' ? 'إيقاف مؤقت' : 'تفعيل';
    if (!window.confirm(`هل أنت متأكد من ${actionName} لهذا الكود؟`)) return;

    try {
      const res = await authFetch(`/api/admin/codes/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`تم ${actionName} للكود بنجاح`);
        fetchCodes();
        fetchOverview();
      } else {
        showNotification(data.error || 'فشل تعديل الحالة', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Reveal plain code for admin
  const handleRevealCode = async (id: string) => {
    if (revealedCodes[id]) {
      setRevealedCodes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    try {
      const res = await authFetch(`/api/admin/codes/${id}/reveal`);
      const data = await res.json();
      if (data.success && data.fullCode) {
        setRevealedCodes((prev) => ({ ...prev, [id]: data.fullCode }));
      }
    } catch {
      showNotification('تعذر استرجاع نص الكود', true);
    }
  };

  // Handle Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPass !== confirmAdminPass) {
      showNotification('كلمة المرور الجديدة غير متطابقة', true);
      return;
    }
    if (newAdminPass.length < 8) {
      showNotification('يجب أن تكون كلمة المرور 8 خانات على الأقل', true);
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: currentAdminPass,
          newPassword: newAdminPass,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('تم تحديث كلمة مرور الإدارة بنجاح. سجّل دخولك مجدداً.');
        setCurrentAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
        setTimeout(() => onLogout(), 1500);
      } else {
        showNotification(data.error || 'فشل تحديث كلمة المرور', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    } finally {
      setLoading(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          visitorRetentionDays: retentionDays,
          adminSessionHours: sessionHours,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('تم حفظ الإعدادات بنجاح');
      }
    } catch {
      showNotification('فشل حفظ الإعدادات', true);
    } finally {
      setLoading(false);
    }
  };

  // Prune visitors
  const handlePruneVisitors = async () => {
    if (!window.confirm(`هل أنت متأكد من تنظيف سجلات الزوار الأقدم من ${retentionDays} يوماً؟`)) return;
    try {
      const res = await authFetch('/api/admin/visitors/prune', {
        method: 'POST',
        body: JSON.stringify({ days: retentionDays }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`تم تنظيف ${data.prunedCount} سجل قديم بنجاح`);
        fetchAllVisitors();
        fetchOverview();
      }
    } catch {
      showNotification('فشل تنظيف السجلات', true);
    }
  };

  // Restore Database Backup
  const handleRestoreBackup = async () => {
    if (!restoreJsonText.trim()) {
      showNotification('يرجى لصق كود JSON للنسخة الاحتياطية', true);
      return;
    }
    if (!window.confirm('تحذير: استعادة النسخة الاحتياطية ستستبدل البيانات الحالية بالكامل. هل تريد المتابعة؟')) {
      return;
    }

    try {
      const parsed = JSON.parse(restoreJsonText);
      const res = await authFetch('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify({ backupData: parsed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('تم استعادة قاعدة البيانات بنجاح!');
        setRestoreJsonText('');
        fetchOverview();
      } else {
        showNotification(data.error || 'فشلت الاستعادة', true);
      }
    } catch {
      showNotification('صيغة ملف JSON غير صحيحة أو تالفة', true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md overflow-hidden"
      dir="rtl"
    >
      <div className="w-full max-w-5xl h-[94vh] bg-[#0c0905] border border-[#d4af37]/40 rounded-2xl shadow-[0_20px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden text-[#fbf7ee]">
        {/* Top Header Bar */}
        <header className="px-4 py-3 bg-[#140e07] border-b border-[#d4af37]/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#261d0d] border border-[#d4af37]/60 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <ShieldCheck className="w-5 h-5 text-[#ffd700]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black text-[#ffd700] leading-none">
                  لوحة تحكم وتراخيص العرين الذهبي
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#ffd700] font-mono">
                  PRO MASTER
                </span>
              </div>
              <p className="text-[11px] text-[#9c8963] mt-0.5 font-medium">
                إدارة الأكواد • رصد الزوار المباشر • أمن المنظومة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Visitors Pill Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0e1f13] border border-[#22c55e]/40 text-[11px] text-[#4ade80] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
              <span>نشط الآن:</span>
              <span className="font-mono text-white text-xs">{stats?.activeVisitors ?? '...'}</span>
            </div>

            {/* Quick Refresh */}
            <button
              onClick={() => {
                fetchOverview();
                if (activeTab === 'codes') fetchCodes();
                if (activeTab === 'active_visitors') fetchActiveVisitors();
                if (activeTab === 'all_visitors') fetchAllVisitors();
                showNotification('تم تحديث البيانات');
              }}
              title="تحديث البيانات"
              className="p-1.5 rounded-lg bg-[#1a140a] hover:bg-[#281e0f] text-[#d4af37] border border-[#d4af37]/30 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="تسجيل خروج الإدارة"
              className="p-1.5 rounded-lg bg-[#271010] hover:bg-[#3d1818] text-[#ff7979] border border-[#ff4d4d]/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="إغلاق اللوحة والعودة للمنصة"
              className="p-1.5 rounded-lg bg-[#1c1811] hover:bg-[#2b2419] text-[#9c8963] hover:text-[#ffd700] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global Notification Banner */}
        {actionSuccess && (
          <div className="bg-[#122e1a] border-b border-[#22c55e]/40 text-xs text-[#86efac] px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#22c55e]" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="bg-[#331111] border-b border-[#ef4444]/40 text-xs text-[#fca5a5] px-4 py-2 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body: Sidebar + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar / Mobile Scrollable Tab Bar */}
          <nav className="w-full md:w-56 bg-[#100b06] border-b md:border-b-0 md:border-l border-[#d4af37]/20 p-2 md:p-3 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Activity className="w-4 h-4 text-[#ffd700]" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#ffd700]" />
              <span>توليد الأكواد والتراخيص</span>
            </button>

            <button
              onClick={() => setActiveTab('codes')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-[#ffd700]" />
                <span>قائمة الأكواد والتراخيص</span>
              </div>
              {stats?.totalCodes !== undefined && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#20180c] font-mono text-[#ffd700]">
                  {stats.totalCodes}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('active_visitors')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'active_visitors'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#22c55e]" />
                <span>النشطون الآن</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#102a16] font-mono text-[#4ade80] font-bold">
                {stats?.activeVisitors ?? 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all_visitors')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'all_visitors'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Globe className="w-4 h-4 text-[#ffd700]" />
              <span>سجل الزوار وعناوين IP</span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit_logs'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <History className="w-4 h-4 text-[#ffd700]" />
              <span>سجل العمليات الإدارية</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#ffd700]/20 to-[#d4af37]/10 text-[#ffd700] border border-[#d4af37]/40 shadow-sm'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Settings className="w-4 h-4 text-[#ffd700]" />
              <span>إعدادات النظام والأمان</span>
            </button>

            <div className="mt-auto hidden md:block pt-3 border-t border-[#d4af37]/15">
              <a
                href="/api/admin/backup"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-[#ffd700] bg-[#1a140a] hover:bg-[#291e0d] border border-[#d4af37]/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل نسخة احتياطية</span>
              </a>
            </div>
          </nav>

          {/* Tab Content Panel */}
          <main className="flex-1 p-3 md:p-5 overflow-y-auto bg-[#070503]">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#120e08] border border-[#d4af37]/25 rounded-2xl p-3.5 relative overflow-hidden">
                    <div className="text-[11px] text-[#9c8963] font-semibold">إجمالي الأكواد</div>
                    <div className="text-2xl font-black font-mono text-[#ffd700] mt-1">
                      {stats?.totalCodes ?? 0}
                    </div>
                    <Key className="w-8 h-8 text-[#d4af37]/10 absolute -bottom-1 left-2 pointer-events-none" />
                  </div>

                  <div className="bg-[#120e08] border border-[#22c55e]/30 rounded-2xl p-3.5 relative overflow-hidden">
                    <div className="text-[11px] text-[#4ade80] font-semibold">أكواد نشطة سارية</div>
                    <div className="text-2xl font-black font-mono text-[#22c55e] mt-1">
                      {stats?.activeCodes ?? 0}
                    </div>
                    <Zap className="w-8 h-8 text-[#22c55e]/10 absolute -bottom-1 left-2 pointer-events-none" />
                  </div>

                  <div className="bg-[#120e08] border border-[#3b82f6]/30 rounded-2xl p-3.5 relative overflow-hidden">
                    <div className="text-[11px] text-[#93c5fd] font-semibold">جديدة لم تُفعل بعد</div>
                    <div className="text-2xl font-black font-mono text-[#60a5fa] mt-1">
                      {stats?.newCodes ?? 0}
                    </div>
                    <Clock className="w-8 h-8 text-[#3b82f6]/10 absolute -bottom-1 left-2 pointer-events-none" />
                  </div>

                  <div className="bg-[#120e08] border border-[#22c55e]/40 rounded-2xl p-3.5 relative overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.08)]">
                    <div className="text-[11px] text-[#4ade80] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                      <span>الزوار النشطون الآن</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-white mt-1">
                      {stats?.activeVisitors ?? 0}
                    </div>
                    <Users className="w-8 h-8 text-[#22c55e]/15 absolute -bottom-1 left-2 pointer-events-none" />
                  </div>
                </div>

                {/* Second Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#120e08] border border-[#ef4444]/25 rounded-2xl p-3">
                    <div className="text-[10px] text-[#f87171]">منتهية الصلاحية</div>
                    <div className="text-lg font-bold font-mono text-[#ef4444] mt-0.5">
                      {stats?.expiredCodes ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#120e08] border border-[#f97316]/25 rounded-2xl p-3">
                    <div className="text-[10px] text-[#fdba74]">استنفدت التفعيلات</div>
                    <div className="text-lg font-bold font-mono text-[#f97316] mt-0.5">
                      {stats?.exhaustedCodes ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#120e08] border border-[#eab308]/25 rounded-2xl p-3">
                    <div className="text-[10px] text-[#fde047]">ملغاة أو موقوفة</div>
                    <div className="text-lg font-bold font-mono text-[#eab308] mt-0.5">
                      {(stats?.revokedCodes ?? 0) + (stats?.suspendedCodes ?? 0)}
                    </div>
                  </div>
                  <div className="bg-[#120e08] border border-[#a855f7]/25 rounded-2xl p-3">
                    <div className="text-[10px] text-[#d8b4fe]">إجمالي الزوار المسجلين</div>
                    <div className="text-lg font-bold font-mono text-[#c084fc] mt-0.5">
                      {stats?.totalVisitors ?? 0}
                    </div>
                  </div>
                </div>

                {/* Quick Action Shortcuts Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#20180a] to-[#120e06] border border-[#d4af37]/35 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
                  <div>
                    <h3 className="text-sm font-bold text-[#ffd700]">إجراء سريع: إنشاء دفعة أكواد جديدة</h3>
                    <p className="text-xs text-[#a89670] mt-0.5">
                      حدد الصلاحية واطبع الأكواد مباشرة أو صدّرها لملف CSV لتوزيعها على المشتركين.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('generate')}
                      className="py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-[#ffd700] to-[#b38914] text-[#080705] hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>توليد الآن</span>
                    </button>
                    <a
                      href="/api/admin/codes/export-csv"
                      target="_blank"
                      className="py-2 px-3 rounded-xl font-bold text-xs bg-[#151008] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/30 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>تصدير CSV</span>
                    </a>
                  </div>
                </div>

                {/* Quick Live Visitors Preview */}
                <div className="bg-[#100d07] border border-[#d4af37]/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#22c55e]" />
                      <span>عينة من الزوار النشطين الآن</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('active_visitors')}
                      className="text-xs text-[#d4af37] hover:underline"
                    >
                      عرض الكل ({stats?.activeVisitors ?? 0})
                    </button>
                  </div>

                  {activeVisitors.length === 0 ? (
                    <div className="text-center py-6 text-xs text-[#786b51]">
                      لا يوجد زوار نشطون في اللحظة الحالية (يتم تحديث النبضات تلقائياً).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeVisitors.slice(0, 4).map((vis) => (
                        <div
                          key={vis.id}
                          className="p-2.5 rounded-xl bg-[#17120a] border border-[#d4af37]/15 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                            <span className="font-mono text-white font-bold">{vis.ip}</span>
                            <span className="text-[10px] text-[#9c8963] font-mono">
                              {vis.userAgent.split(' ')[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#cfb780]">
                            <span>الصفحة: {vis.lastPage || '/'}</span>
                            <span className="text-[10px] text-[#786b51]">
                              آخر نبضة: {new Date(vis.lastHeartbeatAt).toLocaleTimeString('ar-EG')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. GENERATE CODES TAB */}
            {activeTab === 'generate' && (
              <div className="space-y-4">
                <form
                  onSubmit={handleGenerate}
                  className="bg-[#100c07] border border-[#d4af37]/30 rounded-2xl p-4 md:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-[#ffd700]">توليد أكواد وتراخيص جديدة</h3>
                      <p className="text-xs text-[#9c8963] mt-0.5">
                        مولّد عشوائي تشفيري آمن غير قابل للتخمين (AREEN-XXXX-XXXX-XXXX)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Count */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        عدد الأكواد المراد توليدها
                      </label>
                      <div className="grid grid-cols-5 gap-1.5 mb-2">
                        {[1, 5, 10, 25, 50].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setGenCount(num)}
                            className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              genCount === num
                                ? 'bg-[#ffd700] text-[#080705] border-[#ffd700]'
                                : 'bg-[#151009] text-[#9c8963] border-[#312513] hover:text-[#ffd700]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={genCount}
                        onChange={(e) => setGenCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm"
                        placeholder="عدد مخصص..."
                      />
                    </div>

                    {/* Duration Picker */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        مدة الصلاحية
                      </label>
                      <select
                        value={genDurationType}
                        onChange={(e) => setGenDurationType(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-semibold focus:outline-none focus:border-[#ffd700]"
                      >
                        <option value="1h">ساعة واحدة (1h)</option>
                        <option value="3h">3 ساعات (3h)</option>
                        <option value="6h">6 ساعات (6h)</option>
                        <option value="12h">12 ساعة (12h)</option>
                        <option value="24h">24 ساعة / يوم واحد (24h)</option>
                        <option value="2d">يومان (48h)</option>
                        <option value="3d">3 أيام (72h)</option>
                        <option value="7d">7 أيام / أسبوع (7d)</option>
                        <option value="14d">14 يوماً / أسبوعان (14d)</option>
                        <option value="30d">30 يوماً / شهر (30d)</option>
                        <option value="60d">60 يوماً / شهران (60d)</option>
                        <option value="90d">90 يوماً / 3 أشهر (90d)</option>
                        <option value="custom">مدة مخصصة بالساعات...</option>
                      </select>

                      {genDurationType === 'custom' && (
                        <div className="mt-2">
                          <input
                            type="number"
                            min="1"
                            value={genCustomHours}
                            onChange={(e) => setGenCustomHours(parseInt(e.target.value, 10) || 1)}
                            className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-xs"
                            placeholder="عدد الساعات المخصصة..."
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Starts On + Max Activations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        متى يبدأ احتساب الوقت؟
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setGenStartsOn('first_activation')}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer ${
                            genStartsOn === 'first_activation'
                              ? 'bg-[#241a0d] border-[#ffd700] text-[#ffd700]'
                              : 'bg-[#120e08] border-[#291e0d] text-[#8e7e60]'
                          }`}
                        >
                          <div>من أول تفعيل ناجح</div>
                          <div className="text-[10px] text-[#786b51] font-normal mt-0.5">
                            الافتراضي والموصى به
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setGenStartsOn('creation')}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all cursor-pointer ${
                            genStartsOn === 'creation'
                              ? 'bg-[#241a0d] border-[#ffd700] text-[#ffd700]'
                              : 'bg-[#120e08] border-[#291e0d] text-[#8e7e60]'
                          }`}
                        >
                          <div>من وقت الإنشاء فوراً</div>
                          <div className="text-[10px] text-[#786b51] font-normal mt-0.5">
                            سريان فوري من الآن
                          </div>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        الحد الأقصى للتفعيلات (الأجهزة) لكل كود
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={genMaxActivations}
                        onChange={(e) => setGenMaxActivations(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-sm"
                      />
                      <span className="text-[10px] text-[#786b51] mt-1 block">
                        (1 = جهاز/تفعيل واحد، يمنع مشاركة الكود مع عدة أشخاص)
                      </span>
                    </div>
                  </div>

                  {/* Batch name and notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        اسم الدفعة (اختياري)
                      </label>
                      <input
                        type="text"
                        value={genBatchName}
                        onChange={(e) => setGenBatchName(e.target.value)}
                        placeholder="مثال: مشتركي VIP تيليجرام - دفعة رمضان"
                        className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        ملاحظة إدارية داخلية (اختياري)
                      </label>
                      <input
                        type="text"
                        value={genNote}
                        onChange={(e) => setGenNote(e.target.value)}
                        placeholder="مثال: خصم 50% أو ترويج خاص"
                        className="w-full py-2.5 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-[#ffd700] via-[#d4af37] to-[#aa820a] text-[#080705] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>{loading ? 'جارٍ التوليد والتشفير...' : `توليد ${genCount} كود الآن`}</span>
                  </button>
                </form>

                {/* Generated Results Box */}
                {generatedResult && (
                  <div className="bg-[#140e08] border-2 border-[#ffd700]/50 rounded-2xl p-4 md:p-5 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                    <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3 mb-3">
                      <div>
                        <h4 className="text-sm font-black text-[#ffd700]">
                          تم توليد الدفعة: {generatedResult.batch.name}
                        </h4>
                        <p className="text-xs text-[#a89670]">
                          العدد: {generatedResult.plainCodes.length} كود • المدة: {generatedResult.batch.durationType} • التفعيلات المسموحة: {generatedResult.batch.maxActivations}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            copyToClipboard(generatedResult.plainCodes.join('\n'), 'all_batch_codes');
                            showNotification('تم نسخ جميع الأكواد إلى الحافظة!');
                          }}
                          className="py-1.5 px-3 rounded-lg bg-[#2a1f0e] hover:bg-[#382a13] text-[#ffd700] border border-[#d4af37]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === 'all_batch_codes' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>نسخ الكل</span>
                        </button>
                        <a
                          href="/api/admin/codes/export-csv"
                          target="_blank"
                          className="py-1.5 px-3 rounded-lg bg-[#18120a] hover:bg-[#251b0e] text-[#ffd700] border border-[#d4af37]/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تصدير CSV</span>
                        </a>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                      {generatedResult.plainCodes.map((c, idx) => (
                        <div
                          key={c}
                          className="p-2 rounded-xl bg-[#080603] border border-[#d4af37]/25 flex items-center justify-between text-xs"
                        >
                          <span className="font-mono text-[#ffd700] font-bold tracking-wider">{c}</span>
                          <button
                            onClick={() => copyToClipboard(c, `code_${idx}`)}
                            title="نسخ هذا الكود"
                            className="p-1 rounded bg-[#1c150a] hover:bg-[#2c2110] text-[#cfb780] hover:text-[#ffd700] transition-colors cursor-pointer"
                          >
                            {copiedId === `code_${idx}` ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. CODES MANAGEMENT LIST TAB */}
            {activeTab === 'codes' && (
              <div className="space-y-4">
                {/* Search & Filter Header */}
                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="w-full md:w-72 relative">
                    <input
                      type="text"
                      value={codesSearch}
                      onChange={(e) => {
                        setCodesSearch(e.target.value);
                        setCodesPage(1);
                      }}
                      placeholder="بحث بكود، وصف، أو اسم الدفعة..."
                      className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#080603] border border-[#d4af37]/30 text-white text-xs placeholder-[#716143] focus:outline-none focus:border-[#ffd700]"
                    />
                    <Search className="w-4 h-4 text-[#d4af37]/60 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      value={codesStatusFilter}
                      onChange={(e) => {
                        setCodesStatusFilter(e.target.value);
                        setCodesPage(1);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#080603] border border-[#d4af37]/30 text-xs text-[#cfb780] focus:outline-none focus:border-[#ffd700]"
                    >
                      <option value="all">كافة الحالات ({codesTotal})</option>
                      <option value="active">نشط وساري</option>
                      <option value="new">جديد لم يُفعل</option>
                      <option value="expired">منتهي الصلاحية</option>
                      <option value="exhausted">استنفد التفعيلات</option>
                      <option value="revoked">ملغى</option>
                      <option value="suspended">موقوف مؤقتاً</option>
                    </select>

                    <a
                      href="/api/admin/codes/export-csv"
                      target="_blank"
                      className="py-2 px-3 rounded-xl bg-[#1c150a] hover:bg-[#2b200f] text-[#ffd700] border border-[#d4af37]/30 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير CSV</span>
                    </a>
                  </div>
                </div>

                {/* Codes Table */}
                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#171109] border-b border-[#d4af37]/20 text-[#a89670]">
                        <tr>
                          <th className="py-3 px-3">كود الترخيص</th>
                          <th className="py-3 px-3">الدفعة / الوصف</th>
                          <th className="py-3 px-3">المدة</th>
                          <th className="py-3 px-3">تاريخ الإنشاء</th>
                          <th className="py-3 px-3">أول تفعيل / الانتهاء</th>
                          <th className="py-3 px-3">التفعيلات</th>
                          <th className="py-3 px-3">الحالة</th>
                          <th className="py-3 px-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/10">
                        {codes.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-[#786b51]">
                              لا توجد أكواد مطابقة لمعايير البحث الحالية
                            </td>
                          </tr>
                        ) : (
                          codes.map((c) => {
                            const isRevealed = !!revealedCodes[c.id];
                            const displayCode = isRevealed ? revealedCodes[c.id] : c.codeMasked;

                            let statusBadge = (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/40">
                                جديد
                              </span>
                            );
                            if (c.status === 'active') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 font-bold">
                                  نشط
                                </span>
                              );
                            } else if (c.status === 'expired') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#ef4444]/20 text-[#f87171] border border-[#ef4444]/40">
                                  منتهي
                                </span>
                              );
                            } else if (c.status === 'exhausted') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f97316]/20 text-[#fb923c] border border-[#f97316]/40">
                                  مستنفد
                                </span>
                              );
                            } else if (c.status === 'revoked') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#7f1d1d] text-[#fca5a5] border border-[#ef4444]/60 line-through">
                                  ملغى
                                </span>
                              );
                            } else if (c.status === 'suspended') {
                              statusBadge = (
                                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#eab308]/20 text-[#fde047] border border-[#eab308]/40">
                                  موقوف
                                </span>
                              );
                            }

                            return (
                              <tr key={c.id} className="hover:bg-[#140e08] transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-[#ffd700]">{displayCode}</span>
                                    <button
                                      onClick={() => handleRevealCode(c.id)}
                                      title={isRevealed ? 'إخفاء' : 'إظهار الكود الصريح'}
                                      className="p-1 rounded text-[#9c8963] hover:text-[#ffd700] transition-colors cursor-pointer"
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const textToCopy = isRevealed ? revealedCodes[c.id] : c.codeMasked;
                                        copyToClipboard(textToCopy, c.id);
                                      }}
                                      title="نسخ"
                                      className="p-1 rounded text-[#9c8963] hover:text-[#ffd700] transition-colors cursor-pointer"
                                    >
                                      {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-[#cfb780]">
                                  <div className="font-semibold text-xs">{c.batchName}</div>
                                  {c.note && <div className="text-[10px] text-[#8e7e60]">{c.note}</div>}
                                </td>

                                <td className="py-2.5 px-3 font-mono text-[#a89670]">
                                  <div>{c.durationType}</div>
                                  <div className="text-[9px] text-[#716143]">
                                    {c.startsOn === 'first_activation' ? 'أول تفعيل' : 'فوري'}
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 font-mono text-[11px] text-[#8e7e60]">
                                  {new Date(c.createdAt).toLocaleDateString('ar-EG')}
                                </td>

                                <td className="py-2.5 px-3 font-mono text-[11px]">
                                  {c.firstActivatedAt ? (
                                    <>
                                      <div className="text-[#4ade80]">
                                        {new Date(c.firstActivatedAt).toLocaleDateString('ar-EG')}
                                      </div>
                                      <div className="text-[10px] text-[#f87171]">
                                        {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('ar-EG') : 'دائم'}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-[#786b51]">لم يُفعّل بعد</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 font-mono font-bold text-center">
                                  <span className={c.activationCount >= c.maxActivations ? 'text-[#f97316]' : 'text-[#4ade80]'}>
                                    {c.activationCount}
                                  </span>{' '}
                                  / {c.maxActivations}
                                </td>

                                <td className="py-2.5 px-3">{statusBadge}</td>

                                <td className="py-2.5 px-3">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Details Button */}
                                    <button
                                      onClick={() => setSelectedCodeDetails(c)}
                                      title="سجل التفعيلات والأجهزة"
                                      className="p-1 rounded bg-[#1e170b] hover:bg-[#2c2211] text-[#ffd700] transition-colors cursor-pointer"
                                    >
                                      <Users className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Suspend / Resume */}
                                    {c.status === 'suspended' ? (
                                      <button
                                        onClick={() => handleUpdateCodeStatus(c.id, 'active')}
                                        title="إعادة التفعيل"
                                        className="p-1 rounded bg-[#14281a] hover:bg-[#1d3d27] text-[#4ade80] transition-colors cursor-pointer"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUpdateCodeStatus(c.id, 'suspended')}
                                        title="إيقاف مؤقت"
                                        className="p-1 rounded bg-[#2a220b] hover:bg-[#3b300f] text-[#fde047] transition-colors cursor-pointer"
                                      >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Revoke */}
                                    {c.status !== 'revoked' && (
                                      <button
                                        onClick={() => handleUpdateCodeStatus(c.id, 'revoked')}
                                        title="إلغاء نهائي"
                                        className="p-1 rounded bg-[#2e1313] hover:bg-[#451b1b] text-[#fca5a5] transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {codesTotalPages > 1 && (
                    <div className="p-3 bg-[#140e07] border-t border-[#d4af37]/20 flex items-center justify-between text-xs">
                      <span className="text-[#9c8963]">
                        صفحة <b className="font-mono text-[#ffd700]">{codesPage}</b> من{' '}
                        <b className="font-mono">{codesTotalPages}</b> (إجمالي {codesTotal} كود)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={codesPage <= 1}
                          onClick={() => setCodesPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg bg-[#1e170c] border border-[#d4af37]/30 text-[#ffd700] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          disabled={codesPage >= codesTotalPages}
                          onClick={() => setCodesPage((p) => p + 1)}
                          className="p-1.5 rounded-lg bg-[#1e170c] border border-[#d4af37]/30 text-[#ffd700] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Code Activations History Modal */}
                {selectedCodeDetails && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-[#120e08] border border-[#d4af37]/50 rounded-2xl p-5 shadow-2xl space-y-3">
                      <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-2">
                        <h4 className="text-sm font-bold text-[#ffd700]">
                          سجل تفعيلات الكود: {selectedCodeDetails.codeMasked}
                        </h4>
                        <button
                          onClick={() => setSelectedCodeDetails(null)}
                          className="p-1 text-[#9c8963] hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-[#a89670] space-y-1">
                        <div>
                          الدفعة: <b className="text-white">{selectedCodeDetails.batchName}</b>
                        </div>
                        <div>
                          تاريخ الإنشاء:{' '}
                          <b className="font-mono text-white">
                            {new Date(selectedCodeDetails.createdAt).toLocaleString('ar-EG')}
                          </b>
                        </div>
                        <div>
                          تاريخ الانتهاء:{' '}
                          <b className="font-mono text-white">
                            {selectedCodeDetails.expiresAt
                              ? new Date(selectedCodeDetails.expiresAt).toLocaleString('ar-EG')
                              : 'مفتوح حتى التفعيل'}
                          </b>
                        </div>
                      </div>

                      <div className="pt-2">
                        <h5 className="text-xs font-bold text-[#ffd700] mb-2">الأجهزة وجلسات التفعيل:</h5>
                        {selectedCodeDetails.activations.length === 0 ? (
                          <div className="p-3 bg-[#080603] rounded-xl text-center text-xs text-[#786b51]">
                            لم يتم تفعيل هذا الكود على أي جهاز حتى الآن
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-56 overflow-y-auto">
                            {selectedCodeDetails.activations.map((act: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-[#080603] border border-[#d4af37]/20 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-[#4ade80]">{act.ip}</span>
                                  <span className="font-mono text-[10px] text-[#9c8963]">
                                    {new Date(act.timestamp).toLocaleString('ar-EG')}
                                  </span>
                                </div>
                                <div className="text-[10px] text-[#786b51] truncate">
                                  معرف الزائر: {act.visitorId}
                                </div>
                                <div className="text-[10px] text-[#786b51] truncate">
                                  المتصفح: {act.userAgent}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. ACTIVE VISITORS NOW TAB */}
            {activeTab === 'active_visitors' && (
              <div className="space-y-4">
                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] animate-ping" />
                    <h3 className="text-sm font-bold text-[#ffd700]">
                      الزوار المتصلون حالياً بالمنصة ({activeVisitors.length})
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-[#a89670] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefreshVisitors}
                        onChange={(e) => setAutoRefreshVisitors(e.target.checked)}
                        className="rounded accent-[#d4af37]"
                      />
                      <span>تحديث تلقائي كل 10ث</span>
                    </label>

                    <button
                      onClick={fetchActiveVisitors}
                      className="py-1 px-2.5 rounded-lg bg-[#1c150a] text-[#ffd700] border border-[#d4af37]/30 text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>تحديث</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#171109] border-b border-[#d4af37]/20 text-[#a89670]">
                        <tr>
                          <th className="py-3 px-3">عنوان IP</th>
                          <th className="py-3 px-3">معرف الزائر</th>
                          <th className="py-3 px-3">الصفحة الحالية</th>
                          <th className="py-3 px-3">أول ظهور</th>
                          <th className="py-3 px-3">آخر نبضة اتصال</th>
                          <th className="py-3 px-3">المتصفح / الجهاز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/10">
                        {activeVisitors.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#786b51]">
                              لا يوجد زوار نشطون في هذه اللحظة
                            </td>
                          </tr>
                        ) : (
                          activeVisitors.map((v) => (
                            <tr key={v.id} className="hover:bg-[#140e08] transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2 font-mono font-bold text-[#4ade80]">
                                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                                  <span>{v.ip}</span>
                                  <button
                                    onClick={() => copyToClipboard(v.ip, `ip_${v.id}`)}
                                    title="نسخ IP"
                                    className="p-1 rounded text-[#9c8963] hover:text-white"
                                  >
                                    {copiedId === `ip_${v.id}` ? (
                                      <Check className="w-3 h-3 text-[#22c55e]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#9c8963] truncate max-w-[120px]">
                                {v.id}
                              </td>

                              <td className="py-2.5 px-3 font-bold text-[#ffd700]">
                                {v.lastPage || '/'}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#a89670]">
                                {new Date(v.firstSeenAt).toLocaleTimeString('ar-EG')}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#22c55e]">
                                {new Date(v.lastHeartbeatAt).toLocaleTimeString('ar-EG')}
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-[#786b51] truncate max-w-[180px]">
                                {v.userAgent}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ALL VISITORS HISTORY TAB */}
            {activeTab === 'all_visitors' && (
              <div className="space-y-4">
                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="w-full md:w-72 relative">
                    <input
                      type="text"
                      value={visitorsSearch}
                      onChange={(e) => {
                        setVisitorsSearch(e.target.value);
                        setVisitorsPage(1);
                      }}
                      placeholder="بحث بـ IP أو معرف الزائر..."
                      className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#080603] border border-[#d4af37]/30 text-white text-xs placeholder-[#716143] focus:outline-none focus:border-[#ffd700]"
                    />
                    <Search className="w-4 h-4 text-[#d4af37]/60 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={visitorsStatusFilter}
                      onChange={(e) => {
                        setVisitorsStatusFilter(e.target.value);
                        setVisitorsPage(1);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#080603] border border-[#d4af37]/30 text-xs text-[#cfb780]"
                    >
                      <option value="all">كافة الحالات</option>
                      <option value="active">نشط الآن</option>
                      <option value="inactive">غير نشط</option>
                    </select>

                    <button
                      onClick={handlePruneVisitors}
                      className="py-2 px-3 rounded-xl bg-[#261313] hover:bg-[#3d1a1a] text-[#fca5a5] border border-[#ef4444]/30 text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تنظيف القديم</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#171109] border-b border-[#d4af37]/20 text-[#a89670]">
                        <tr>
                          <th className="py-3 px-3">عنوان IP</th>
                          <th className="py-3 px-3">الحالة</th>
                          <th className="py-3 px-3">أول ظهور</th>
                          <th className="py-3 px-3">آخر ظهور</th>
                          <th className="py-3 px-3">الزيارات</th>
                          <th className="py-3 px-3">المتصفح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/10">
                        {allVisitors.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#786b51]">
                              لا توجد سجلات زوار
                            </td>
                          </tr>
                        ) : (
                          allVisitors.map((v) => (
                            <tr key={v.id} className="hover:bg-[#140e08] transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#ffd700]">
                                <div className="flex items-center gap-1.5">
                                  <span>{v.ip}</span>
                                  <button
                                    onClick={() => copyToClipboard(v.ip, `ip_all_${v.id}`)}
                                    className="p-1 text-[#8e7e60] hover:text-white"
                                  >
                                    {copiedId === `ip_all_${v.id}` ? (
                                      <Check className="w-3 h-3 text-[#22c55e]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td className="py-2.5 px-3">
                                {v.isActive ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 font-bold">
                                    نشط الآن
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#3a3022]/40 text-[#8e7e60]">
                                    غير نشط
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#a89670]">
                                {new Date(v.firstSeenAt).toLocaleString('ar-EG')}
                              </td>

                              <td className="py-2.5 px-3 font-mono text-[11px] text-[#cfb780]">
                                {new Date(v.lastSeenAt).toLocaleString('ar-EG')}
                              </td>

                              <td className="py-2.5 px-3 font-mono font-bold text-center">
                                {v.visitCount || 1}
                              </td>

                              <td className="py-2.5 px-3 text-[11px] text-[#786b51] truncate max-w-[200px]">
                                {v.userAgent}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {visitorsTotalPages > 1 && (
                    <div className="p-3 bg-[#140e07] border-t border-[#d4af37]/20 flex items-center justify-between text-xs">
                      <span className="text-[#9c8963]">
                        صفحة <b className="font-mono text-[#ffd700]">{visitorsPage}</b> من{' '}
                        <b className="font-mono">{visitorsTotalPages}</b>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={visitorsPage <= 1}
                          onClick={() => setVisitorsPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg bg-[#1e170c] border border-[#d4af37]/30 text-[#ffd700] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          disabled={visitorsPage >= visitorsTotalPages}
                          onClick={() => setVisitorsPage((p) => p + 1)}
                          className="p-1.5 rounded-lg bg-[#1e170c] border border-[#d4af37]/30 text-[#ffd700] disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. AUDIT LOGS TAB */}
            {activeTab === 'audit_logs' && (
              <div className="space-y-4">
                <div className="bg-[#100c07] border border-[#d4af37]/25 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-[#ffd700] mb-3">سجل العمليات الإدارية والأنشطة</h3>
                  <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                    {auditLogs.length === 0 ? (
                      <div className="py-8 text-center text-xs text-[#786b51]">لا توجد سجلات بعد</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-[#140f08] border border-[#d4af37]/15 flex flex-col md:flex-row md:items-center justify-between gap-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#22180b] border border-[#d4af37]/30 text-[#ffd700] font-bold">
                              {log.action}
                            </span>
                            <span className="text-[#e2d5bd]">{log.details}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[#786b51] font-mono shrink-0">
                            <span>IP: {log.ip}</span>
                            <span>{new Date(log.timestamp).toLocaleString('ar-EG')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 7. SETTINGS & SECURITY TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-4 max-w-2xl">
                {/* Change Admin Password */}
                <form
                  onSubmit={handleChangePassword}
                  className="bg-[#100c07] border border-[#d4af37]/30 rounded-2xl p-4 md:p-5 space-y-3.5"
                >
                  <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>تغيير كلمة مرور الإدارة المركزية</span>
                  </h3>

                  <div>
                    <label className="block text-xs text-[#cfb780] mb-1 font-semibold">
                      كلمة المرور الحالية
                    </label>
                    <input
                      type="password"
                      value={currentAdminPass}
                      onChange={(e) => setCurrentAdminPass(e.target.value)}
                      required
                      placeholder="كلمة مرور الإدارة الحالية..."
                      className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#cfb780] mb-1 font-semibold">
                        كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={newAdminPass}
                        onChange={(e) => setNewAdminPass(e.target.value)}
                        required
                        minLength={8}
                        placeholder="8 خانات على الأقل..."
                        className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#cfb780] mb-1 font-semibold">
                        تأكيد كلمة المرور الجديدة
                      </label>
                      <input
                        type="password"
                        value={confirmAdminPass}
                        onChange={(e) => setConfirmAdminPass(e.target.value)}
                        required
                        minLength={8}
                        placeholder="أعد إدخال الكلمة..."
                        className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-[#ffd700] to-[#b38914] text-[#080705] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                  >
                    تحديث كلمة مرور الإدارة
                  </button>
                </form>

                {/* System Policies */}
                <form
                  onSubmit={handleSaveSettings}
                  className="bg-[#100c07] border border-[#d4af37]/30 rounded-2xl p-4 md:p-5 space-y-3.5"
                >
                  <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    <span>سياسات الاحتفاظ والجلسات</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#cfb780] mb-1 font-semibold">
                        مدة الاحتفاظ بسجلات الزوار (أيام)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={retentionDays}
                        onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 30)}
                        className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#cfb780] mb-1 font-semibold">
                        مدة بقاء جلسة المدير (ساعات)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={sessionHours}
                        onChange={(e) => setSessionHours(parseInt(e.target.value, 10) || 24)}
                        className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="py-2.5 px-4 rounded-xl text-xs font-black bg-[#1f170c] hover:bg-[#2b2010] text-[#ffd700] border border-[#d4af37]/40 transition-all cursor-pointer"
                  >
                    حفظ السياسات
                  </button>
                </form>

                {/* Storage & Runtime Diagnostics Card */}
                {storageDiag && (
                  <div className="bg-[#100c07] border border-[#d4af37]/35 rounded-2xl p-4 md:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
                        <Globe className="w-4 h-4 text-[#ffd700]" />
                        <span>تشخيص بيئة التشغيل واستمرارية التخزين (database.ts)</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/40 font-bold">
                        {storageDiag.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#140e08] border border-[#d4af37]/15">
                        <span className="text-[#8e7e60] block text-[10px]">البيئة المكتشفة تلقائياً:</span>
                        <span className="font-bold text-[#ffd700]">{storageDiag.environment}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#140e08] border border-[#d4af37]/15">
                        <span className="text-[#8e7e60] block text-[10px]">نمط التخزين الدائم:</span>
                        <span className="font-mono text-[#4ade80]">{storageDiag.storageMode}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#140e08] border border-[#d4af37]/15 md:col-span-2">
                        <span className="text-[#8e7e60] block text-[10px]">مسار ملف قاعدة البيانات:</span>
                        <span className="font-mono text-[11px] text-[#cfb780] break-all">{storageDiag.databaseFile}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Database Backup & Vercel Persistence Restore */}
                <div className="bg-[#100c07] border border-[#d4af37]/30 rounded-2xl p-4 md:p-5 space-y-3">
                  <h3 className="text-sm font-bold text-[#ffd700] flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>النسخ الاحتياطي الدائم واستعادة البيانات (للنشر على Vercel)</span>
                  </h3>
                  <p className="text-xs text-[#9c8963] leading-relaxed">
                    يدعم النظام تصدير قاعدة البيانات بالكامل (كافة الأكواد، التفعيلات، الزوار، الإعدادات) كملف JSON لضمان بقائها واستعادتها بضغطة زر واحدة في أي وقت.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href="/api/admin/backup"
                      target="_blank"
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-[#1a140a] hover:bg-[#2a1f0f] text-[#ffd700] border border-[#d4af37]/40 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>تحميل نسخة احتياطية JSON الآن</span>
                    </a>
                  </div>

                  <div className="pt-2 border-t border-[#d4af37]/15">
                    <label className="block text-xs font-semibold text-[#cfb780] mb-1">
                      استعادة قاعدة البيانات من نص JSON:
                    </label>
                    <textarea
                      rows={3}
                      value={restoreJsonText}
                      onChange={(e) => setRestoreJsonText(e.target.value)}
                      placeholder="الصق كود JSON للنسخة الاحتياطية هنا..."
                      className="w-full py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white font-mono text-[11px] focus:outline-none focus:border-[#ffd700]"
                    />
                    <button
                      type="button"
                      onClick={handleRestoreBackup}
                      disabled={!restoreJsonText.trim()}
                      className="mt-2 py-2 px-3.5 rounded-xl text-xs font-bold bg-[#2d1515] hover:bg-[#421d1d] text-[#fca5a5] border border-[#ef4444]/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>استعادة البيانات من الـ JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
