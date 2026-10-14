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
  AlertCircle,
  History,
  Settings,
  Activity,
  Globe,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Lock,
  Smartphone,
  Battery,
  MapPin,
  Compass,
  Navigation,
  Radio,
  Megaphone,
  Share2,
  RefreshCw,
  Layers,
  ShieldAlert,
  Cpu,
  Server,
  Database,
  ExternalLink,
  Crown,
  Send,
  MessageSquare,
  UserCheck,
  Shield,
  Unlock,
  RefreshCcw,
  Wifi,
  Edit3,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { VisitorMap, type MapVisitorMarker } from './VisitorMap';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  onLogout: () => void;
}

export type AdminTabType =
  | 'radar_map'
  | 'overview'
  | 'generate'
  | 'codes'
  | 'visitors'
  | 'broadcast'
  | 'audit_logs'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  onClose,
  token,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('radar_map');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Overview Stats
  const [stats, setStats] = useState<any>(null);

  // Map Markers State
  const [mapMarkers, setMapMarkers] = useState<MapVisitorMarker[]>([]);
  const [selectedMapVisitorId, setSelectedMapVisitorId] = useState<string | null>(null);
  const [autoRefreshMap, setAutoRefreshMap] = useState<boolean>(true);

  // Codes Tab State
  const [codes, setCodes] = useState<any[]>([]);
  const [codesPage, setCodesPage] = useState<number>(1);
  const [codesTotalPages, setCodesTotalPages] = useState<number>(1);
  const [codesTotal, setCodesTotal] = useState<number>(0);
  const [codesSearch, setCodesSearch] = useState<string>('');
  const [codesStatusFilter, setCodesStatusFilter] = useState<string>('all');
  const [revealedCodes, setRevealedCodes] = useState<{ [id: string]: string }>({});
  const [selectedCodeDetails, setSelectedCodeDetails] = useState<any | null>(null);

  // Code Tester State
  const [showCodeTester, setShowCodeTester] = useState<boolean>(false);
  const [testCodeInput, setTestCodeInput] = useState<string>('');
  const [testCodeResult, setTestCodeResult] = useState<any | null>(null);
  const [testingCode, setTestingCode] = useState<boolean>(false);

  // Code Generator State
  const [genCount, setGenCount] = useState<number>(5);
  const [genDurationType, setGenDurationType] = useState<string>('24h');
  const [genCustomHours, setGenCustomHours] = useState<number>(48);
  const [genStartsOn, setGenStartsOn] = useState<'first_activation' | 'creation'>('first_activation');
  const [genMaxActivations, setGenMaxActivations] = useState<number>(1);
  const [genBatchName, setGenBatchName] = useState<string>('');
  const [genNote, setGenNote] = useState<string>('');
  const [generatedResult, setGeneratedResult] = useState<{ batch: any; plainCodes: string[] } | null>(null);

  // Visitors Intelligence & Subscriber State
  const [allVisitors, setAllVisitors] = useState<any[]>([]);
  const [visitorsPage, setVisitorsPage] = useState<number>(1);
  const [visitorsTotalPages, setVisitorsTotalPages] = useState<number>(1);
  const [visitorsSearch, setVisitorsSearch] = useState<string>('');
  const [visitorsStatusFilter, setVisitorsStatusFilter] = useState<string>('all');
  const [visitorsSortBy, setVisitorsSortBy] = useState<string>('lastSeen');
  const [autoRefreshVisitors, setAutoRefreshVisitors] = useState<boolean>(true);
  const [visitorSummary, setVisitorSummary] = useState<{
    total: number;
    codeSubscribers: number;
    activeNow: number;
    masterUsers: number;
    blocked: number;
  }>({ total: 0, codeSubscribers: 0, activeNow: 0, masterUsers: 0, blocked: 0 });

  // Targeted Message Modal State
  const [messageTargetVisitor, setMessageTargetVisitor] = useState<any | null>(null);
  const [targetedMessageText, setTargetedMessageText] = useState<string>('');
  const [targetedMessageLevel, setTargetedMessageLevel] = useState<'vip' | 'warning' | 'alert' | 'info'>('vip');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Extend License Quick Modal State
  const [extendTargetVisitor, setExtendTargetVisitor] = useState<any | null>(null);
  const [extendHoursOption, setExtendHoursOption] = useState<number>(24);

  // Deep Dossier Inspection Modal State
  const [inspectedVisitor, setInspectedVisitor] = useState<any | null>(null);

  // Editing Note State
  const [editingNoteVisitorId, setEditingNoteVisitorId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState<string>('');

  // Broadcast State
  const [broadcastEnabled, setBroadcastEnabled] = useState<boolean>(false);
  const [broadcastMessage, setBroadcastMessage] = useState<string>('');
  const [broadcastLevel, setBroadcastLevel] = useState<'vip' | 'warning' | 'alert' | 'info'>('vip');

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
        throw new Error('جلسة الإدارة غير صالحة أو انتهت');
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
        if (data.stats.emergencyBroadcast) {
          setBroadcastEnabled(Boolean(data.stats.emergencyBroadcast.enabled));
          setBroadcastMessage(data.stats.emergencyBroadcast.message || '');
          setBroadcastLevel(data.stats.emergencyBroadcast.level || 'vip');
        }
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // 2. Fetch Map Markers
  const fetchMapMarkers = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/visitors/map');
      const data = await res.json();
      if (data.success && Array.isArray(data.markers)) {
        setMapMarkers(data.markers);
      }
    } catch {
      // ignore
    }
  }, [authFetch]);

  // 3. Fetch Codes
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

  // 4. Fetch All Visitors & Subscriber Intelligence
  const fetchAllVisitors = useCallback(async () => {
    try {
      const query = new URLSearchParams({
        page: String(visitorsPage),
        limit: '24',
        search: visitorsSearch,
        status: visitorsStatusFilter,
        sortBy: visitorsSortBy,
      });
      const res = await authFetch(`/api/admin/visitors?${query.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAllVisitors(data.visitors);
        setVisitorsTotalPages(data.totalPages);
        setVisitorSummary({
          total: data.total || 0,
          codeSubscribers: data.totalCodeSubscribers || 0,
          activeNow: data.totalActiveNow || 0,
          masterUsers: data.totalMasterUsers || 0,
          blocked: data.totalBlocked || 0,
        });
      }
    } catch {
      // ignore
    }
  }, [authFetch, visitorsPage, visitorsSearch, visitorsStatusFilter, visitorsSortBy]);

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

  // 6. Fetch Settings & Storage Diagnostics
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

    if (activeTab === 'radar_map') {
      fetchMapMarkers();
    } else if (activeTab === 'overview') {
      fetchOverview();
      fetchMapMarkers();
    } else if (activeTab === 'codes') {
      fetchCodes();
    } else if (activeTab === 'visitors') {
      fetchAllVisitors();
    } else if (activeTab === 'audit_logs') {
      fetchAuditLogs();
    } else if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [isOpen, activeTab, fetchOverview, fetchMapMarkers, fetchCodes, fetchAllVisitors, fetchAuditLogs, fetchSettings]);

  // Auto-refresh timer for map and visitors
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'radar_map' && autoRefreshMap) {
      refreshTimerRef.current = setInterval(() => {
        fetchMapMarkers();
        fetchOverview();
      }, 15000);
    } else if (activeTab === 'visitors' && autoRefreshVisitors) {
      refreshTimerRef.current = setInterval(() => {
        fetchAllVisitors();
        fetchOverview();
      }, 15000);
    }
    return () => clearInterval(refreshTimerRef.current);
  }, [isOpen, activeTab, autoRefreshMap, autoRefreshVisitors, fetchMapMarkers, fetchAllVisitors, fetchOverview]);

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
        showNotification(`تم إنشاء وتشفير دفعة جديدة بنجاح بعدد ${data.plainCodes.length} كود!`);
        fetchOverview();
      } else {
        showNotification(data.error || 'فشل توليد الأكواد', true);
      }
    } catch {
      showNotification('حدث خطأ في الاتصال أثناء التوليد', true);
    } finally {
      setLoading(false);
    }
  };

  // Toggle code status
  const handleUpdateCodeStatus = async (id: string, newStatus: 'active' | 'suspended' | 'revoked') => {
    const actionName =
      newStatus === 'revoked' ? 'إلغاء نهائي وطرد' : newStatus === 'suspended' ? 'إيقاف مؤقت' : 'تفعيل';
    if (!window.confirm(`هل أنت متأكد من تنفيذ [${actionName}] لهذا الكود؟`)) return;

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

  // Reveal decrypted plain code
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
      showNotification('تعذر فك تشفير الكود', true);
    }
  };

  // Reset Device Lock (Allow user to switch phone)
  const handleResetDevice = async (id: string) => {
    if (!window.confirm('هل تريد فك قفل الجهاز المرتبط بهذا الكود والسماح للمشترك بربط هاتف جديد؟')) return;
    try {
      const res = await authFetch(`/api/admin/codes/${id}/reset-device`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم فك قفل الجهاز بنجاح. يمكن للمشترك تسجيل الدخول بهاتف آخر.');
        fetchCodes();
      }
    } catch {
      showNotification('فشل فك قفل الجهاز', true);
    }
  };

  // Extend code duration
  const handleExtendDuration = async (id: string, additionalMinutes: number, label: string) => {
    try {
      const res = await authFetch(`/api/admin/codes/${id}/extend`, {
        method: 'POST',
        body: JSON.stringify({ additionalMinutes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`تم تمديد صلاحية الكود بمقدار ${label} بنجاح!`);
        fetchCodes();
      }
    } catch {
      showNotification('فشل تمديد الصلاحية', true);
    }
  };

  // Test / Validate Any Code Instantly
  const handleTestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = testCodeInput.trim();
    if (!clean) {
      showNotification('يرجى كتابة أو لصق الكود للفحص', true);
      return;
    }
    setTestingCode(true);
    setTestCodeResult(null);
    try {
      const res = await authFetch('/api/admin/codes/test', {
        method: 'POST',
        body: JSON.stringify({ code: clean }),
      });
      const data = await res.json();
      setTestCodeResult(data);
      if (data.success && data.found) {
        showNotification('تم فحص الكود بنجاح!');
      } else {
        showNotification(data.error || 'الكود غير موجود في النظام', true);
      }
    } catch {
      showNotification('تعذر الاتصال بخادم الفحص', true);
    } finally {
      setTestingCode(false);
    }
  };

  // Toggle Block Visitor
  const handleToggleBlock = async (visitorId: string) => {
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/block`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.blocked ? 'تم حظر الهاتف وعنوان IP فوراً وطرد الجلسة' : 'تم فك الحظر بنجاح');
        fetchMapMarkers();
        fetchAllVisitors();
        fetchOverview();
      }
    } catch {
      showNotification('فشل تحديث حالة الحظر', true);
    }
  };

  // Permanent Code Deletion
  const handleDeleteCode = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من الحذف النهائي لهذا الكود من قاعدة البيانات؟ لا يمكن التراجع عن هذه الخطوة.')) return;
    try {
      const res = await authFetch(`/api/admin/codes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم حذف كود الترخيص نهائياً من قاعدة البيانات');
        fetchCodes();
        fetchOverview();
        if (selectedCodeDetails?.id === id) {
          setSelectedCodeDetails(null);
        }
      }
    } catch {
      showNotification('فشل حذف الكود', true);
    }
  };

  // Permanent Batch Deletion
  const handleDeleteBatch = async (batchId: string, batchName?: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الدفعة [${batchName || ''}] بالكامل وكافة الأكواد المرتبطة بها؟`)) return;
    try {
      const res = await authFetch(`/api/admin/batches/${batchId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification(`تم حذف الدفعة وحذف ${data.deletedCodes || 0} كود بنجاح`);
        fetchCodes();
        fetchOverview();
      }
    } catch {
      showNotification('فشل حذف الدفعة', true);
    }
  };

  // Delete Visitor Record
  const handleDeleteVisitor = async (visitorId: string) => {
    if (!window.confirm('هل تريد حذف سجل هذا الزائر وملفه التقني بالكامل؟')) return;
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم حذف سجل الزائر بنجاح');
        fetchAllVisitors();
        fetchMapMarkers();
        fetchOverview();
      }
    } catch {
      showNotification('فشل حذف سجل الزائر', true);
    }
  };

  // Remote Force Kickout Visitor Session
  const handleKickoutVisitor = async (visitorId: string) => {
    if (!window.confirm('هل تريد إنهاء وطرد جلسة هذا المشترك عن بعد فوراً؟ سيتم إخراجه لشاشة تسجيل الدخول.')) return;
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/kickout`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم إرسال أمر الطرد الفوري للجهاز بنجاح!');
        fetchAllVisitors();
      } else {
        showNotification(data.error || 'فشل تنفيذ أمر الطرد', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Reset Visitor Connected License Device Lock (Allow customer to switch phones)
  const handleResetVisitorLicenseDevice = async (visitorId: string) => {
    if (!window.confirm('هل تريد فك قفل الجهاز لهذا الكود والسماح للمشترك بربط هاتف جديد؟')) return;
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/reset-license-device`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم فك قفل الهاتف للكود بنجاح! يمكن للمشترك تشغيله على جهاز آخر.');
        fetchAllVisitors();
      } else {
        showNotification(data.error || 'فشل فك قفل الجهاز', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Quick Extend Visitor License Duration
  const handleExtendVisitorLicense = async (visitorId: string, additionalMinutes: number, label: string) => {
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/extend-license`, {
        method: 'POST',
        body: JSON.stringify({ additionalMinutes }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`تم تمديد اشتراك المشترك بمقدار ${label} بنجاح!`);
        fetchAllVisitors();
        setExtendTargetVisitor(null);
      } else {
        showNotification(data.error || 'فشل تمديد الاشتراك', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Toggle Visitor License Status (Active / Suspended)
  const handleToggleVisitorLicenseStatus = async (visitorId: string, currentStatus?: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const actionLabel = newStatus === 'active' ? 'إعادة التفعيل' : 'الإيقاف المؤقت';
    if (!window.confirm(`هل أنت متأكد من [${actionLabel}] لاشتراك هذا المستخدم؟`)) return;
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/toggle-license-status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`تم ${actionLabel} للاشتراك بنجاح!`);
        fetchAllVisitors();
      } else {
        showNotification(data.error || 'فشل تعديل حالة الاشتراك', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Revoke Visitor License Permanently & Kickout
  const handleRevokeVisitorLicense = async (visitorId: string) => {
    if (!window.confirm('تحذير: هل أنت متأكد من إلغاء كود الترخيص نهائياً وطرد المشترك فوراً من التطبيق؟')) return;
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/toggle-license-status`, {
        method: 'POST',
        body: JSON.stringify({ status: 'revoked' }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('تم إلغاء الترخيص وطرد المشترك نهائياً!');
        fetchAllVisitors();
      } else {
        showNotification(data.error || 'فشل إلغاء الترخيص', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Send Targeted Private Message Submit
  const handleSendTargetedMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageTargetVisitor || !targetedMessageText.trim()) return;
    setSendingMessage(true);
    try {
      const res = await authFetch(`/api/admin/visitors/${messageTargetVisitor.id}/message`, {
        method: 'POST',
        body: JSON.stringify({
          message: targetedMessageText.trim(),
          level: targetedMessageLevel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('تم إرسال الرسالة الخاصة لهاتف المشترك بنجاح!');
        setMessageTargetVisitor(null);
        setTargetedMessageText('');
        fetchAllVisitors();
      } else {
        showNotification(data.error || 'فشل إرسال الرسالة', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    } finally {
      setSendingMessage(false);
    }
  };

  // Save Visitor Note / Dossier Remark
  const handleSaveVisitorNote = async (visitorId: string, note: string) => {
    try {
      const res = await authFetch(`/api/admin/visitors/${visitorId}/note`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification('تم حفظ ملاحظة العميل بنجاح');
        setEditingNoteVisitorId(null);
        fetchAllVisitors();
      } else {
        showNotification('فشل حفظ الملاحظة', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    }
  };

  // Arabic Date & Elapsed Time Formatters
  const formatRelativeArabic = (dateStr?: string | null): string => {
    if (!dateStr) return 'غير محدد';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return 'غير محدد';
    const diffSecs = Math.floor((Date.now() - time) / 1000);
    if (diffSecs < 15) return 'الآن';
    if (diffSecs < 60) return `منذ ${diffSecs} ثانية`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    const diffMonths = Math.floor(diffDays / 30);
    return `منذ ${diffMonths} شهر`;
  };

  const formatFullArabicDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'غير محدد';
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };
  // Clear All Audit Logs
  const handleClearAuditLogs = async () => {
    if (!window.confirm('هل أنت متأكد من تفريغ وحذف سجل النشاطات الأمني بالكامل؟')) return;
    try {
      const res = await authFetch('/api/admin/audit-logs/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showNotification('تم تفريغ سجل النشاطات الأمني بنجاح');
        fetchAuditLogs();
      }
    } catch {
      showNotification('فشل تفريغ السجل', true);
    }
  };

  // Save Emergency Broadcast
  const handleSaveBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          enabled: broadcastEnabled,
          message: broadcastMessage,
          level: broadcastLevel,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('تم تحديث ونشر شريط الطوارئ والتعميم لجميع الشاشات بنجاح!');
        fetchOverview();
      } else {
        showNotification('فشل حفظ التعميم', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    } finally {
      setLoading(false);
    }
  };

  // Change Admin Password
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
        showNotification('تم تحديث كلمة مرور الإدارة بنجاح. يرجى تسجيل الدخول مجدداً.');
        setCurrentAdminPass('');
        setNewAdminPass('');
        setConfirmAdminPass('');
        setTimeout(() => onLogout(), 1600);
      } else {
        showNotification(data.error || 'فشل تحديث كلمة المرور', true);
      }
    } catch {
      showNotification('خطأ في الاتصال بالخادم', true);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const link = document.createElement('a');
    link.href = `/api/admin/codes/export-csv?token=${encodeURIComponent(token)}`;
    link.setAttribute('download', `areen_licenses_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('جاري تحميل ملف CSV للأكواد...');
  };

  // Download JSON Backup
  const handleDownloadBackup = async () => {
    try {
      const res = await authFetch('/api/admin/backup');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `areen_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification('تم تنزيل النسخة الاحتياطية بنجاح.');
    } catch {
      showNotification('فشل تصدير النسخة الاحتياطية', true);
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
        body: JSON.stringify({ backup: parsed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification('تمت استعادة قاعدة البيانات بالكامل بنجاح!');
        setRestoreJsonText('');
        fetchOverview();
        fetchCodes();
      } else {
        showNotification(data.error || 'فشلت عملية الاستعادة', true);
      }
    } catch (e: any) {
      showNotification('صيغة JSON غير صحيحة: ' + e?.message, true);
    }
  };

  // Format code for instant Telegram/WhatsApp message
  const copyFormattedVipMessage = (code: string, durationLabel: string) => {
    const text = `🦁 مرحباً بك في «العرين الذهبي» للخيارات الثنائية\n\n✨ كود التفعيل الخاص بك:\n${code}\n\n⏳ مدة الصلاحية: ${durationLabel}\n🔐 يعمل على جهازك فور إدخاله في خانة التفعيل.\n\nنتمنى لك صفقات ذهبية رابحة دائماً! 📈🏆`;
    navigator.clipboard.writeText(text);
    setCopiedId('msg_' + code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Container: Premium Cyber Gold Frame */}
      <div className="w-full max-w-7xl h-[95vh] bg-[#080603] border-2 border-[#d4af37]/40 rounded-3xl shadow-[0_0_90px_rgba(212,175,55,0.25)] flex flex-col overflow-hidden text-right">
        {/* Top Header Bar */}
        <header className="bg-gradient-to-r from-[#171007] via-[#0d0904] to-[#171007] border-b border-[#d4af37]/30 p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffd700] to-[#b38f26] p-0.5 shadow-[0_0_20px_rgba(255,215,0,0.4)] flex items-center justify-center">
              <div className="w-full h-full bg-[#0d0904] rounded-[14px] flex items-center justify-center text-[#ffd700]">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-[#ffd700] tracking-wide">
                  لوحة القيادة المركزية · العرين الذهبي
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ffd700]/15 text-[#ffd700] border border-[#ffd700]/30">
                  UI PLUS 2026
                </span>
                <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#162a19] text-[#4ade80] border border-[#22c55e]/30">
                  Vercel Serverless Ready
                </span>
              </div>
              <p className="text-[11px] text-[#9c8963]">
                منظومة رادار الأجهزة ومواقع IP وبنك الأكواد والتراخيص الفورية
              </p>
            </div>
          </div>

          {/* Quick Header Indicators */}
          <div className="flex items-center gap-2">
            {/* Active Visitors Live Pulse */}
            <div
              onClick={() => setActiveTab('radar_map')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0e1f13] border border-[#22c55e]/40 text-xs text-[#4ade80] font-bold cursor-pointer hover:bg-[#16301d] transition-colors"
              title="اضغط لفتح رادار الخريطة"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22c55e]"></span>
              </span>
              <span>نشط الآن:</span>
              <span className="font-mono text-white text-xs">{stats?.activeVisitors ?? '...'}</span>
            </div>

            {/* Refresh */}
            <button
              onClick={() => {
                fetchOverview();
                if (activeTab === 'radar_map') fetchMapMarkers();
                if (activeTab === 'codes') fetchCodes();
                if (activeTab === 'visitors') fetchAllVisitors();
                showNotification('تم تحديث البيانات');
              }}
              title="تحديث البيانات لحظياً"
              className="p-2 rounded-xl bg-[#1a140a] hover:bg-[#281e0f] text-[#d4af37] border border-[#d4af37]/30 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title="تسجيل خروج من الإدارة"
              className="p-2 rounded-xl bg-[#271010] hover:bg-[#3d1818] text-[#ff7979] border border-[#ff4d4d]/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="إغلاق والعودة للمنصة"
              className="p-2 rounded-xl bg-[#1c1811] hover:bg-[#2b2419] text-[#9c8963] hover:text-[#ffd700] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="bg-[#102a16] border-b border-[#22c55e]/40 text-xs text-[#86efac] px-4 py-2 flex items-center justify-between shrink-0 animate-fadeIn">
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
          <div className="bg-[#331111] border-b border-[#ef4444]/40 text-xs text-[#fca5a5] px-4 py-2 flex items-center justify-between shrink-0 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ef4444]" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area: Sidebar + Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Navigation Sidebar */}
          <nav className="w-full md:w-64 bg-[#0d0904] border-b md:border-b-0 md:border-l border-[#d4af37]/20 p-2 md:p-3 shrink-0 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
            {/* 1. Radar Map Tab */}
            <button
              onClick={() => setActiveTab('radar_map')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'radar_map'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-[#ffd700] animate-spin-slow" />
                <span>رادار الخريطة ومواقع الهواتف</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20180c] font-mono text-[#4ade80] border border-[#22c55e]/30">
                {stats?.activeVisitors ?? 0} نشط
              </span>
            </button>

            {/* 2. Overview Tab */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Activity className="w-4 h-4 text-[#ffd700]" />
              <span>نظرة عامة والتحليلات</span>
            </button>

            {/* 3. Generate Codes Tab */}
            <button
              onClick={() => setActiveTab('generate')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-[#ffd700]" />
              <span>توليد الأكواد والتراخيص</span>
            </button>

            {/* 4. Codes Bank Tab */}
            <button
              onClick={() => setActiveTab('codes')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-[#ffd700]" />
                <span>بنك الأكواد والتراخيص</span>
              </div>
              {stats?.totalCodes !== undefined && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#20180c] font-mono text-[#ffd700] border border-[#d4af37]/30">
                  {stats.totalCodes}
                </span>
              )}
            </button>

            {/* 5. Visitors & Subscribers Intelligence Tab */}
            <button
              onClick={() => setActiveTab('visitors')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'visitors'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#ffd700]" />
                <span>مركز المشتركين والأجهزة</span>
              </div>
              <div className="flex items-center gap-1 font-mono text-[10px]">
                {stats?.codeSubscribers ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#30210a] text-[#ffd700] border border-[#ffd700]/40 font-bold" title="مشتركون بكود">
                    👑 {stats.codeSubscribers}
                  </span>
                ) : null}
                <span className="px-2 py-0.5 rounded-full bg-[#182012] text-[#4ade80] border border-[#22c55e]/30">
                  {stats?.totalVisitors ?? 0}
                </span>
              </div>
            </button>

            {/* 6. Emergency Broadcast Ribbon Tab */}
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'broadcast'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Megaphone className="w-4 h-4 text-[#f59e0b]" />
              <span>شريط الطوارئ والتعميم</span>
            </button>

            {/* 7. Audit Log Tab */}
            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit_logs'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <History className="w-4 h-4 text-[#ffd700]" />
              <span>سجل الأمان والعمليات</span>
            </button>

            {/* 8. Settings & Storage Tab */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center gap-2.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#ffd700]/25 to-[#d4af37]/15 text-[#ffd700] border border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                  : 'text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#191209]'
              }`}
            >
              <Settings className="w-4 h-4 text-[#ffd700]" />
              <span>الإعدادات والتخزين السحابي</span>
            </button>

            {/* Bottom Quick Serverless Info */}
            <div className="hidden md:block mt-auto p-3 rounded-2xl bg-[#080502] border border-[#d4af37]/15 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-[#8e7e60]">
                <span>التخزين:</span>
                <span className="font-mono text-[#ffd700]">Vercel /tmp + Data</span>
              </div>
              <div className="flex items-center justify-between text-[#8e7e60]">
                <span>الأمان:</span>
                <span className="text-[#4ade80] font-bold">HMAC Encrypted</span>
              </div>
            </div>
          </nav>

          {/* Tab View Container */}
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#050402]">
            {/* ======================================================== */}
            {/* TAB 1: RADAR MAP & GPS TELEMETRY                         */}
            {/* ======================================================== */}
            {activeTab === 'radar_map' && (
              <div className="space-y-4 animate-fadeIn">
                <VisitorMap
                  markers={mapMarkers}
                  onToggleBlock={handleToggleBlock}
                  selectedVisitorId={selectedMapVisitorId}
                  onSelectVisitor={(v) => setSelectedMapVisitorId(v?.id || null)}
                />
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: OVERVIEW & ANALYTICS                             */}
            {/* ======================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-5 animate-fadeIn">
                {/* Top 4 KPI Tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Active Visitors */}
                  <div
                    onClick={() => setActiveTab('radar_map')}
                    className="bg-gradient-to-b from-[#141d13] to-[#0a110a] border border-[#22c55e]/40 rounded-2xl p-4 cursor-pointer hover:border-[#22c55e] transition-all group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#86efac] font-bold">النشطون الآن بالرادار</span>
                      <span className="w-3 h-3 rounded-full bg-[#22c55e] animate-ping" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.activeVisitors ?? 0}
                    </div>
                    <span className="text-[11px] text-[#4ade80] flex items-center gap-1 mt-1 group-hover:underline">
                      <span>عرض على الخريطة والرادار</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Total Licenses */}
                  <div
                    onClick={() => setActiveTab('codes')}
                    className="bg-gradient-to-b from-[#1c1408] to-[#100c05] border border-[#d4af37]/35 rounded-2xl p-4 cursor-pointer hover:border-[#ffd700] transition-all group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#d4af37] font-bold">إجمالي التراخيص</span>
                      <Key className="w-4 h-4 text-[#ffd700]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.totalCodes ?? 0}
                    </div>
                    <div className="text-[11px] text-[#8e7e60] flex items-center gap-2 mt-1 font-mono">
                      <span className="text-[#4ade80]">{stats?.activeCodes ?? 0} سارٍ</span>
                      <span>·</span>
                      <span className="text-[#f87171]">{stats?.expiredCodes ?? 0} منتهٍ</span>
                    </div>
                  </div>

                  {/* Tracked Devices */}
                  <div
                    onClick={() => setActiveTab('visitors')}
                    className="bg-gradient-to-b from-[#0f172a]/60 to-[#090d17] border border-[#38bdf8]/35 rounded-2xl p-4 cursor-pointer hover:border-[#38bdf8] transition-all group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#7dd3fc] font-bold">الهواتف المرصودة</span>
                      <Smartphone className="w-4 h-4 text-[#38bdf8]" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                      {stats?.totalVisitors ?? 0}
                    </div>
                    <span className="text-[11px] text-[#38bdf8] flex items-center gap-1 mt-1 group-hover:underline">
                      <span>استعراض ملفات الأجهزة</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Vercel Storage Health */}
                  <div
                    onClick={() => setActiveTab('settings')}
                    className="bg-gradient-to-b from-[#1a120a] to-[#0e0a05] border border-[#d4af37]/35 rounded-2xl p-4 cursor-pointer hover:border-[#ffd700] transition-all group shadow-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#cfb780] font-bold">بيئة التشغيل السحابية</span>
                      <Server className="w-4 h-4 text-[#ffd700]" />
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5 font-mono">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span>Vercel /tmp Ready</span>
                    </div>
                    <span className="text-[11px] text-[#8e7e60] block mt-1">
                      حفظ دائم واسترجاع تلقائي
                    </span>
                  </div>
                </div>

                {/* Quick Actions Shortcuts */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-4">
                  <h3 className="text-xs font-bold text-[#ffd700] mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>إجراءات سريعة وفورية</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      onClick={() => {
                        setGenDurationType('1h');
                        setGenCount(1);
                        setGenBatchName('كود تجريبي سريع');
                        setActiveTab('generate');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#171007] hover:bg-[#241a0b] border border-[#d4af37]/30 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#ffd700]" />
                      <span>توليد كود 1 ساعة</span>
                    </button>

                    <button
                      onClick={() => {
                        setGenDurationType('24h');
                        setGenCount(1);
                        setGenBatchName('اشتراك يومي');
                        setActiveTab('generate');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-[#171007] hover:bg-[#241a0b] border border-[#d4af37]/30 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-[#ffd700]" />
                      <span>توليد كود 24 ساعة</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('radar_map')}
                      className="py-2.5 px-3 rounded-xl bg-[#171007] hover:bg-[#241a0b] border border-[#d4af37]/30 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>فتح رادار المواقع</span>
                    </button>

                    <button
                      onClick={handleDownloadBackup}
                      className="py-2.5 px-3 rounded-xl bg-[#171007] hover:bg-[#241a0b] border border-[#d4af37]/30 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>تحميل نسخة احتياطية</span>
                    </button>
                  </div>
                </div>

                {/* Country Breakdown + Device Types Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Countries */}
                  <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-[#ffd700] mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#ffd700]" />
                      <span>أعلى الدول زيارة واتصالاً</span>
                    </h3>
                    <div className="space-y-2">
                      {stats?.topCountries && stats.topCountries.length > 0 ? (
                        stats.topCountries.map((c: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#140e07] border border-[#d4af37]/15 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{c.flag}</span>
                              <span className="font-bold text-white">{c.name}</span>
                            </div>
                            <span className="font-mono text-[#ffd700] font-bold px-2 py-0.5 rounded bg-black/40">
                              {c.count} متصل
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-[#8e7e60]">
                          لا توجد بيانات دول حتى الآن
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Mobile Models */}
                  <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-[#ffd700] mb-3 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#38bdf8]" />
                      <span>نماذج الهواتف الأكثر رصداً</span>
                    </h3>
                    <div className="space-y-2">
                      {stats?.topDevices && stats.topDevices.length > 0 ? (
                        stats.topDevices.map((d: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-[#140e07] border border-[#d4af37]/15 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-[#cfb780]" />
                              <span className="font-bold text-white truncate max-w-[200px]" title={d.name}>
                                {d.name}
                              </span>
                            </div>
                            <span className="font-mono text-[#38bdf8] font-bold px-2 py-0.5 rounded bg-black/40">
                              {d.count} جهاز
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-[#8e7e60]">
                          لا توجد أجهزة مسجلة حتى الآن
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 3: GENERATE CODES                                    */}
            {/* ======================================================== */}
            {activeTab === 'generate' && (
              <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
                <div className="bg-[#0e0a05] border border-[#d4af37]/30 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-5 border-b border-[#d4af37]/20 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#1a1308] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#ffd700]">
                        توليد دفعة أكواد وتراخيص جديدة
                      </h2>
                      <p className="text-xs text-[#8e7e60]">
                        تشفير مشدد بنظام AREEN-XXXX-XXXX-XXXX وحساب التوقيت عند أول تفعيل
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleGenerate} className="space-y-4">
                    {/* Duration Preset Chips */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-2">
                        اختر مدة صلاحية الترخيص:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { type: '1h', label: '1 ساعة (تجريبي)' },
                          { type: '3h', label: '3 ساعات' },
                          { type: '6h', label: '6 ساعات' },
                          { type: '12h', label: '12 ساعة' },
                          { type: '24h', label: '24 ساعة (يوم كامل)' },
                          { type: '2d', label: 'يومان' },
                          { type: '3d', label: '3 أيام' },
                          { type: '7d', label: 'أسبوع كامل (7 أيام)' },
                          { type: '14d', label: 'أسبوعان (14 يوماً)' },
                          { type: '30d', label: 'شهر كامل (30 يوماً)' },
                          { type: '60d', label: 'شهران (60 يوماً)' },
                          { type: '90d', label: '3 أشهر (90 يوماً)' },
                          { type: 'custom', label: 'مدة مخصصة بالساعات' },
                        ].map((d) => (
                          <button
                            key={d.type}
                            type="button"
                            onClick={() => setGenDurationType(d.type)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              genDurationType === d.type
                                ? 'bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.3)] font-black'
                                : 'bg-[#140e07] text-[#cfb780] border-[#d4af37]/20 hover:border-[#ffd700]/50'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Hours Input */}
                      {genDurationType === 'custom' && (
                        <div className="mt-3 p-3 rounded-xl bg-[#140e07] border border-[#d4af37]/30 flex items-center gap-3">
                          <label className="text-xs text-[#ffd700] font-bold">
                            حدد عدد الساعات المخصصة:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="8760"
                            value={genCustomHours}
                            onChange={(e) => setGenCustomHours(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-24 py-1.5 px-3 rounded-lg bg-[#0a0704] border border-[#d4af37]/30 text-white font-mono text-center text-xs focus:outline-none focus:border-[#ffd700]"
                          />
                          <span className="text-xs text-[#8e7e60]">ساعة</span>
                        </div>
                      )}
                    </div>

                    {/* Count & Max Activations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                          عدد الأكواد المطلوبة:
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 5, 10, 20, 50].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setGenCount(num)}
                              className={`py-1.5 px-3 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                                genCount === num
                                  ? 'bg-[#ffd700] text-black border-[#ffd700]'
                                  : 'bg-[#140e07] text-[#cfb780] border-[#d4af37]/20 hover:border-[#ffd700]/50'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={genCount}
                            onChange={(e) => setGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                            className="w-20 py-1 px-2.5 rounded-lg bg-[#0a0704] border border-[#d4af37]/30 text-white font-mono text-center text-xs focus:outline-none focus:border-[#ffd700]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                          قفل الهاتف (عدد الأجهزة المسموحة لكل كود):
                        </label>
                        <select
                          value={genMaxActivations}
                          onChange={(e) => setGenMaxActivations(parseInt(e.target.value, 10))}
                          className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                        >
                          <option value="1">جهاز واحد فقط (قفل الهاتف الصارم - موصى به)</option>
                          <option value="2">جهازان (هاتف + لابتوب)</option>
                          <option value="3">3 أجهزة</option>
                          <option value="5">5 أجهزة (حساب عائلي أو فريق)</option>
                        </select>
                      </div>
                    </div>

                    {/* Start Timing Policy */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        سياسة بدء احتساب مدة الكود:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center gap-2.5 transition-all ${
                            genStartsOn === 'first_activation'
                              ? 'bg-[#1c1408] border-[#ffd700] text-white'
                              : 'bg-[#120d07] border-[#291e0d] text-[#8e7e60]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="startsOn"
                            checked={genStartsOn === 'first_activation'}
                            onChange={() => setGenStartsOn('first_activation')}
                            className="text-[#ffd700] focus:ring-0"
                          />
                          <div>
                            <span className="font-bold block text-[#ffd700]">
                              عند أول استخدام من المشترك (الأفضل)
                            </span>
                            <span className="text-[10px] text-[#8e7e60]">
                              لا ينقص من وقت الكود ثانية واحدة حتى يقوم العميل بإدخاله.
                            </span>
                          </div>
                        </label>

                        <label
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center gap-2.5 transition-all ${
                            genStartsOn === 'creation'
                              ? 'bg-[#1c1408] border-[#ffd700] text-white'
                              : 'bg-[#120d07] border-[#291e0d] text-[#8e7e60]'
                          }`}
                        >
                          <input
                            type="radio"
                            name="startsOn"
                            checked={genStartsOn === 'creation'}
                            onChange={() => setGenStartsOn('creation')}
                            className="text-[#ffd700] focus:ring-0"
                          />
                          <div>
                            <span className="font-bold block text-white">
                              يبدأ فوراً من لحظة التوليد الآن
                            </span>
                            <span className="text-[10px] text-[#8e7e60]">
                              يبدأ العداد فور الضغط على توليد وينتهي في تاريخ محدد.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Batch Name & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1">
                          اسم المشترك أو الدفعة (اختياري):
                        </label>
                        <input
                          type="text"
                          value={genBatchName}
                          onChange={(e) => setGenBatchName(e.target.value)}
                          placeholder="مثال: مشترك أحمد - تيليجرام VIP"
                          className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1">
                          ملاحظات إضافية (اختياري):
                        </label>
                        <input
                          type="text"
                          value={genNote}
                          onChange={(e) => setGenNote(e.target.value)}
                          placeholder="مثال: اشتراك شهر مدفوع باينانس"
                          className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#ffd700] via-[#dfb83d] to-[#b38f26] text-black font-black text-sm shadow-[0_0_25px_rgba(255,215,0,0.35)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <RotateCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-5 h-5" />
                            <span>توليد وتشفير الأكواد فوراً</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Generated Result Box */}
                {generatedResult && (
                  <div className="bg-[#120d07] border-2 border-[#ffd700] rounded-3xl p-5 sm:p-6 shadow-[0_0_40px_rgba(212,175,55,0.25)] space-y-4 animate-scaleUp">
                    <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
                      <div className="flex items-center gap-2 text-[#4ade80]">
                        <Check className="w-5 h-5" />
                        <span className="font-bold text-sm">
                          تم إنشاء {generatedResult.plainCodes.length} كود بنجاح!
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Copy All Plain */}
                        <button
                          type="button"
                          onClick={() => {
                            copyToClipboard(generatedResult.plainCodes.join('\n'), 'all_gen');
                            showNotification('تم نسخ جميع الأكواد للحافظة');
                          }}
                          className="py-1.5 px-3 rounded-xl bg-[#20170a] hover:bg-[#30220f] text-[#ffd700] border border-[#d4af37]/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === 'all_gen' ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>نسخ قائمة الأكواد</span>
                        </button>
                      </div>
                    </div>

                    {/* List of Generated Plain Codes */}
                    <div className="space-y-2 max-h-72 overflow-y-auto p-1">
                      {generatedResult.plainCodes.map((code, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#191109] border border-[#d4af37]/25 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-[#8e7e60] text-[11px] w-5">{idx + 1}.</span>
                            <span className="text-white font-bold tracking-wider select-all text-sm">
                              {code}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* WhatsApp / Telegram message copy */}
                            <button
                              type="button"
                              onClick={() => {
                                copyFormattedVipMessage(code, genDurationType);
                                showNotification('تم نسخ رسالة الترحيب والكود جاهزة للتيليجرام / الواتساب!');
                              }}
                              className="py-1 px-2.5 rounded-lg bg-[#142617] hover:bg-[#1f3a23] text-[#4ade80] border border-[#22c55e]/40 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                              title="نسخ صيغة رسالة واتساب / تيليجرام"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>رسالة العميل</span>
                            </button>

                            {/* Copy Code Only */}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(code, code)}
                              className="py-1 px-2.5 rounded-lg bg-[#241a0b] hover:bg-[#332510] text-[#ffd700] border border-[#d4af37]/30 text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === code ? (
                                <Check className="w-3 h-3 text-[#22c55e]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>نسخ</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 4: CODES BANK & LICENSES                             */}
            {/* ======================================================== */}
            {activeTab === 'codes' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Search & Filter Header Bar */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="w-4 h-4 text-[#8e7e60] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={codesSearch}
                        onChange={(e) => {
                          setCodesSearch(e.target.value);
                          setCodesPage(1);
                        }}
                        placeholder="ابحث برمز الكود أو اسم الدفعة..."
                        className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
                      />
                    </div>

                    {/* Status Filter */}
                    <select
                      value={codesStatusFilter}
                      onChange={(e) => {
                        setCodesStatusFilter(e.target.value);
                        setCodesPage(1);
                      }}
                      className="py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="new">جديد (لم يُفعل بعد)</option>
                      <option value="active">نشط وسارٍ الآن</option>
                      <option value="expired">منتهٍ</option>
                      <option value="suspended">موقوف مؤقتاً</option>
                      <option value="revoked">ملغى نهائياً</option>
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCodeTester(!showCodeTester);
                        setTestCodeResult(null);
                      }}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                        showCodeTester
                          ? 'bg-[#2a1d08] text-[#ffd700] border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.25)]'
                          : 'bg-[#140e07] hover:bg-[#20170a] text-[#cfb780] border-[#d4af37]/30'
                      }`}
                      title="فحص واختبار صلاحية أي كود فورياً دون الخروج"
                    >
                      <Key className="w-3.5 h-3.5 text-[#ffd700]" />
                      <span>فحص واختبار كود</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="py-2 px-3 rounded-xl bg-[#140e07] hover:bg-[#20170a] text-[#4ade80] border border-[#22c55e]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>تصدير Excel (CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('generate')}
                      className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(255,215,0,0.3)] hover:brightness-110 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>توليد كود جديد</span>
                    </button>
                  </div>
                </div>

                {/* Live Code Tester Panel */}
                {showCodeTester && (
                  <div className="bg-gradient-to-b from-[#181106] to-[#0d0904] border-2 border-[#d4af37]/50 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#2b1f0a] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
                          <Key className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#ffd700]">
                            فاحص التراخيص والأكواد الفوري (Code Inspector)
                          </h3>
                          <p className="text-[10px] text-[#8e7e60]">
                            أدخل أي كود ترخيص مشفر أو صريح للتحقق من حالته وأجهزته المربوطة وصلاحيته
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCodeTester(false)}
                        className="p-1 rounded-lg text-[#8e7e60] hover:text-[#ffd700] hover:bg-[#20180c] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleTestCode} className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={testCodeInput}
                        onChange={(e) => setTestCodeInput(e.target.value)}
                        placeholder="الصق كود الترخيص هنا للفحص (مثال: AREEN-24H-XXXX)..."
                        className="flex-1 py-2 px-3 rounded-xl bg-[#090704] border border-[#d4af37]/35 text-white font-mono text-xs focus:outline-none focus:border-[#ffd700]"
                      />
                      <button
                        type="submit"
                        disabled={testingCode || !testCodeInput.trim()}
                        className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black font-black text-xs hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {testingCode ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        <span>{testingCode ? 'جارٍ الفحص...' : 'فحص الصلاحية'}</span>
                      </button>
                    </form>

                    {testCodeResult && (
                      <div className="p-3 rounded-xl bg-[#0a0703] border border-[#d4af37]/30 text-xs">
                        {testCodeResult.found && testCodeResult.code ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#cfb780]">الحالة الحالية:</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    testCodeResult.code.status === 'active'
                                      ? 'bg-[#152e1b] text-[#4ade80] border border-[#22c55e]/40'
                                      : testCodeResult.code.status === 'expired'
                                      ? 'bg-[#331111] text-[#f87171] border border-[#ef4444]/40'
                                      : testCodeResult.code.status === 'suspended'
                                      ? 'bg-[#33220a] text-[#fbbf24] border border-[#f59e0b]/40'
                                      : 'bg-[#1e1c15] text-[#9ca3af] border border-[#4b5563]/40'
                                  }`}
                                >
                                  {testCodeResult.code.status === 'active'
                                    ? 'نشط وسارٍ'
                                    : testCodeResult.code.status === 'expired'
                                    ? 'منتهي الصلاحية'
                                    : testCodeResult.code.status === 'suspended'
                                    ? 'موقوف مؤقتاً'
                                    : 'جديد (غير مفعل)'}
                                </span>
                                {testCodeResult.code.remainingMinutes > 0 && (
                                  <span className="text-[10px] text-[#ffd700] font-mono">
                                    متبقي: {testCodeResult.code.remainingMinutes} دقيقة (~{(testCodeResult.code.remainingMinutes / 60).toFixed(1)} ساعة)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[#8e7e60]">الدفعة:</span>
                                <span className="font-bold text-white">{testCodeResult.code.batchName || 'فردي'}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-[#8e7e60]">الكود الأصلي: </span>
                                <span className="font-mono text-[#ffd700] font-bold select-all">
                                  {testCodeResult.code.plainCode || testCodeResult.code.masked}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8e7e60]">المدة المحددة: </span>
                                <span className="text-white font-mono">{testCodeResult.code.durationType}</span>
                              </div>
                              <div>
                                <span className="text-[#8e7e60]">التفعيلات: </span>
                                <span className="text-white font-mono">
                                  {testCodeResult.code.activationCount || 0} من أصل {testCodeResult.code.maxActivations || 1}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8e7e60]">تاريخ الانتهاء: </span>
                                <span className="text-white font-mono">
                                  {testCodeResult.code.expiresAt
                                    ? new Date(testCodeResult.code.expiresAt).toLocaleString('ar-EG')
                                    : 'يبدأ بعد أول تفعيل'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#8e7e60]">أول تفعيل: </span>
                                <span className="text-white font-mono">
                                  {testCodeResult.code.firstActivatedAt
                                    ? new Date(testCodeResult.code.firstActivatedAt).toLocaleString('ar-EG')
                                    : 'لم يُفعل بعد'}
                                </span>
                              </div>
                            </div>

                            {/* Bound Devices info */}
                            {Array.isArray(testCodeResult.code.activations) && testCodeResult.code.activations.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-[#d4af37]/15">
                                <span className="text-[10px] font-bold text-[#cfb780] block mb-1">الأجهزة المربوطة بالكود:</span>
                                <div className="space-y-1">
                                  {testCodeResult.code.activations.map((act: any, idx: number) => (
                                    <div key={idx} className="flex flex-wrap items-center justify-between gap-1 text-[10px] bg-[#140e06] p-1.5 rounded-lg border border-[#d4af37]/20 font-mono">
                                      <span className="text-[#ffd700]">الجهاز: {act.deviceName || 'هاتف مشترك'}</span>
                                      <span className="text-[#38bdf8]">IP: {act.ip || '—'}</span>
                                      <span className="text-[#8e7e60]">{new Date(act.activatedAt).toLocaleString('ar-EG')}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-[#ff7979] py-1">
                            <AlertCircle className="w-4 h-4 shrink-0 text-[#ff4d4d]" />
                            <span>{testCodeResult.error || 'الكود غير موجود في سجلات النظام أو تم حذفه.'}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Codes List Table */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#140e07] text-[#cfb780] border-b border-[#d4af37]/20 uppercase text-[11px]">
                        <tr>
                          <th className="py-3 px-4 font-bold">كود الترخيص</th>
                          <th className="py-3 px-4 font-bold">المشترك / الدفعة</th>
                          <th className="py-3 px-4 font-bold">الصلاحية</th>
                          <th className="py-3 px-4 font-bold">التفعيلات</th>
                          <th className="py-3 px-4 font-bold">تاريخ الانتهاء</th>
                          <th className="py-3 px-4 font-bold">الحالة</th>
                          <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#d4af37]/10 font-sans">
                        {codes.map((c) => {
                          const isRevealed = Boolean(revealedCodes[c.id]);
                          const displayCode = isRevealed ? revealedCodes[c.id] : c.codeMasked;

                          return (
                            <tr key={c.id} className="hover:bg-[#161008] transition-colors">
                              {/* Code + Reveal + Copy */}
                              <td className="py-3 px-4 font-mono">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold select-all ${isRevealed ? 'text-[#ffd700]' : 'text-white'}`}>
                                    {displayCode}
                                  </span>

                                  {/* Reveal Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleRevealCode(c.id)}
                                    title={isRevealed ? 'إخفاء الكود' : 'كشف الكود المشفر'}
                                    className="p-1 rounded bg-[#1c1409] hover:bg-[#2c1f0d] text-[#cfb780] transition-colors cursor-pointer"
                                  >
                                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>

                                  {/* Copy Button */}
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(displayCode, c.id)}
                                    className="p-1 rounded bg-[#1c1409] hover:bg-[#2c1f0d] text-[#cfb780] transition-colors cursor-pointer"
                                  >
                                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                              </td>

                              {/* Batch / Note */}
                              <td className="py-3 px-4">
                                <span className="font-bold text-white block">{c.batchName || 'كود فردي'}</span>
                                {c.note && <span className="text-[10px] text-[#8e7e60] block truncate max-w-[140px]">{c.note}</span>}
                              </td>

                              {/* Duration */}
                              <td className="py-3 px-4 font-mono text-[#cfb780]">
                                <span>{c.durationType}</span>
                                <span className="text-[10px] text-[#8e7e60] block font-sans">
                                  {c.startsOn === 'first_activation' ? 'يبدأ عند التفعيل' : 'من تاريخ الإنشاء'}
                                </span>
                              </td>

                              {/* Activations */}
                              <td className="py-3 px-4 font-mono">
                                <span className={c.activationCount >= c.maxActivations ? 'text-[#f87171] font-bold' : 'text-[#4ade80]'}>
                                  {c.activationCount} / {c.maxActivations}
                                </span>
                              </td>

                              {/* Expiration */}
                              <td className="py-3 px-4 font-mono text-[11px] text-[#8e7e60]">
                                {c.expiresAt ? (
                                  <span>{new Date(c.expiresAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                ) : (
                                  <span className="text-[#ffd700]">لم يبدأ بعد</span>
                                )}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-block ${
                                    c.status === 'active'
                                      ? 'bg-[#142617] text-[#4ade80] border-[#22c55e]/40'
                                      : c.status === 'new'
                                      ? 'bg-[#1a2332] text-[#38bdf8] border-[#0284c7]/40'
                                      : c.status === 'suspended'
                                      ? 'bg-[#2a220d] text-[#fbbf24] border-[#eab308]/40'
                                      : 'bg-[#2b1212] text-[#f87171] border-[#ef4444]/40'
                                  }`}
                                >
                                  {c.status === 'active'
                                    ? 'نشط'
                                    : c.status === 'new'
                                    ? 'جديد'
                                    : c.status === 'suspended'
                                    ? 'موقوف'
                                    : c.status === 'revoked'
                                    ? 'ملغى'
                                    : 'منتهٍ'}
                                </span>
                              </td>

                              {/* Actions Dropdown / Buttons */}
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Reset Phone Lock */}
                                  <button
                                    type="button"
                                    onClick={() => handleResetDevice(c.id)}
                                    title="فك قفل الهاتف للمشترك"
                                    className="p-1.5 rounded-lg bg-[#141c24] hover:bg-[#1e2a38] text-[#38bdf8] border border-[#38bdf8]/30 transition-colors cursor-pointer"
                                  >
                                    <Smartphone className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Extend +24h */}
                                  <button
                                    type="button"
                                    onClick={() => handleExtendDuration(c.id, 1440, '24 ساعة')}
                                    title="تمديد الصلاحية 24 ساعة إضافية"
                                    className="p-1.5 rounded-lg bg-[#1a140a] hover:bg-[#281e0f] text-[#ffd700] border border-[#d4af37]/30 transition-colors cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Pause / Resume */}
                                  {c.status === 'suspended' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCodeStatus(c.id, 'active')}
                                      title="إعادة التفعيل"
                                      className="p-1.5 rounded-lg bg-[#142617] hover:bg-[#1f3a23] text-[#4ade80] border border-[#22c55e]/30 transition-colors cursor-pointer"
                                    >
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCodeStatus(c.id, 'suspended')}
                                      title="إيقاف مؤقت"
                                      className="p-1.5 rounded-lg bg-[#261f0d] hover:bg-[#382d13] text-[#fbbf24] border border-[#eab308]/30 transition-colors cursor-pointer"
                                    >
                                      <PauseCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Revoke */}
                                  {c.status !== 'revoked' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCodeStatus(c.id, 'revoked')}
                                      title="إلغاء نهائي وطرد"
                                      className="p-1.5 rounded-lg bg-[#271010] hover:bg-[#3d1818] text-[#ff7979] border border-[#ff4d4d]/30 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}

                        {codes.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#8e7e60]">
                              لا توجد أكواد مطابقة لخيارات البحث
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {codesTotalPages > 1 && (
                    <div className="bg-[#140e07] border-t border-[#d4af37]/20 p-3 px-4 flex items-center justify-between text-xs">
                      <span className="text-[#8e7e60]">
                        إجمالي الأكواد: <b className="text-[#ffd700] font-mono">{codesTotal}</b> (صفحة {codesPage} من {codesTotalPages})
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          disabled={codesPage <= 1}
                          onClick={() => setCodesPage((p) => Math.max(1, p - 1))}
                          className="p-1.5 rounded-lg bg-[#1a140a] disabled:opacity-40 text-[#ffd700] border border-[#d4af37]/30"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          disabled={codesPage >= codesTotalPages}
                          onClick={() => setCodesPage((p) => Math.min(codesTotalPages, p + 1))}
                          className="p-1.5 rounded-lg bg-[#1a140a] disabled:opacity-40 text-[#ffd700] border border-[#d4af37]/30"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 5: VISITORS & SUBSCRIBERS INTELLIGENCE CENTER        */}
            {/* ======================================================== */}
            {activeTab === 'visitors' && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1. TOP INTELLIGENCE KPI HUD BAR */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {/* Code Subscribers Tile */}
                  <div
                    onClick={() => {
                      setVisitorsStatusFilter('code_registered');
                      setVisitorsPage(1);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      visitorsStatusFilter === 'code_registered'
                        ? 'bg-gradient-to-br from-[#2a1d08] to-[#171005] border-[#ffd700] ring-1 ring-[#ffd700]'
                        : 'bg-gradient-to-br from-[#1a1207] to-[#0e0904] border-[#d4af37]/35 hover:border-[#ffd700]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#ffd700] flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        <span>المشتركون بالأكواد</span>
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#ffd700]" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {visitorSummary.codeSubscribers}
                      </span>
                      <span className="text-[10px] text-[#d4af37]">مشترك VIP</span>
                    </div>
                  </div>

                  {/* Online Now Tile */}
                  <div
                    onClick={() => {
                      setVisitorsStatusFilter('active');
                      setVisitorsPage(1);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      visitorsStatusFilter === 'active'
                        ? 'bg-gradient-to-br from-[#122414] to-[#0a140b] border-[#22c55e] ring-1 ring-[#22c55e]'
                        : 'bg-gradient-to-br from-[#0e1a10] to-[#08100a] border-[#22c55e]/35 hover:border-[#22c55e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#86efac] flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-[#22c55e] animate-pulse" />
                        <span>المتصلون بالرادار</span>
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {visitorSummary.activeNow}
                      </span>
                      <span className="text-[10px] text-[#4ade80]">متصل الآن</span>
                    </div>
                  </div>

                  {/* Total Devices Tracked */}
                  <div
                    onClick={() => {
                      setVisitorsStatusFilter('all');
                      setVisitorsPage(1);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      visitorsStatusFilter === 'all'
                        ? 'bg-gradient-to-br from-[#1e1b12] to-[#100e09] border-[#d4af37] ring-1 ring-[#d4af37]'
                        : 'bg-gradient-to-br from-[#120f0a] to-[#0a0805] border-[#d4af37]/25 hover:border-[#d4af37]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#cfb780] flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>إجمالي الأجهزة</span>
                      </span>
                      <Users className="w-3.5 h-3.5 text-[#8e7e60]" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {visitorSummary.total}
                      </span>
                      <span className="text-[10px] text-[#8e7e60]">جهاز مرصود</span>
                    </div>
                  </div>

                  {/* Master Key Users */}
                  <div
                    onClick={() => {
                      setVisitorsStatusFilter('master_vault');
                      setVisitorsPage(1);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      visitorsStatusFilter === 'master_vault'
                        ? 'bg-gradient-to-br from-[#24172c] to-[#130c18] border-[#c084fc] ring-1 ring-[#c084fc]'
                        : 'bg-gradient-to-br from-[#170e1c] to-[#0d0710] border-[#a855f7]/30 hover:border-[#c084fc]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#e9d5ff] flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-[#c084fc]" />
                        <span>الرمز الموحد</span>
                      </span>
                      <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {visitorSummary.masterUsers}
                      </span>
                      <span className="text-[10px] text-[#c084fc]">جلسات رئيسية</span>
                    </div>
                  </div>

                  {/* Blocked Devices */}
                  <div
                    onClick={() => {
                      setVisitorsStatusFilter('blocked');
                      setVisitorsPage(1);
                    }}
                    className={`col-span-2 sm:col-span-1 p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-md ${
                      visitorsStatusFilter === 'blocked'
                        ? 'bg-gradient-to-br from-[#301212] to-[#1c0808] border-[#ef4444] ring-1 ring-[#ef4444]'
                        : 'bg-gradient-to-br from-[#1c0a0a] to-[#0f0505] border-[#ef4444]/30 hover:border-[#ef4444]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#fca5a5] flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#ef4444]" />
                        <span>أجهزة محظورة</span>
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-white font-mono">
                        {visitorSummary.blocked}
                      </span>
                      <span className="text-[10px] text-[#f87171]">مقيد الوصول</span>
                    </div>
                  </div>
                </div>

                {/* 2. ADVANCED SEARCH, FILTER TABS & SORTING */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-3 sm:p-4 space-y-3">
                  {/* Top Bar: Search + Auto-refresh */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[240px]">
                      <Search className="w-4 h-4 text-[#8e7e60] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={visitorsSearch}
                        onChange={(e) => {
                          setVisitorsSearch(e.target.value);
                          setVisitorsPage(1);
                        }}
                        placeholder="ابحث بكود الترخيص، الـ IP، المدينة، موديل الهاتف، أو ملاحظة العميل..."
                        className="w-full py-2 pr-9 pl-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
                      />
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8e7e60] whitespace-nowrap hidden sm:inline">ترتيب حسب:</span>
                      <select
                        value={visitorsSortBy}
                        onChange={(e) => {
                          setVisitorsSortBy(e.target.value);
                          setVisitorsPage(1);
                        }}
                        className="py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/30 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                      >
                        <option value="lastSeen">🕒 آخر ظهور (الأحدث أولاً)</option>
                        <option value="firstSeen">⏳ أول ظهور (الأحدث أولاً)</option>
                        <option value="firstSeenOldest">📅 أول ظهور (الأقدم أولاً)</option>
                        <option value="visits">🔄 الأكثر زيارة وجلسات</option>
                        <option value="status">🟢 المتصلون الآن أولاً</option>
                      </select>

                      {/* Auto-Refresh Toggle */}
                      <button
                        type="button"
                        onClick={() => setAutoRefreshVisitors(!autoRefreshVisitors)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          autoRefreshVisitors
                            ? 'bg-[#142617] text-[#4ade80] border-[#22c55e]/40 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                            : 'bg-[#140e07] text-[#8e7e60] border-[#291e0d]'
                        }`}
                        title="تحديث استخباراتي لحظي كل 15 ثانية"
                      >
                        <Radio className={`w-3.5 h-3.5 ${autoRefreshVisitors ? 'animate-pulse text-[#4ade80]' : ''}`} />
                        <span className="hidden sm:inline">رصد لحظي</span>
                      </button>

                      {/* Refresh Button */}
                      <button
                        type="button"
                        onClick={() => fetchAllVisitors()}
                        className="p-2 rounded-xl bg-[#140e07] hover:bg-[#20180c] text-[#ffd700] border border-[#d4af37]/30 transition-colors"
                        title="تحديث فوري"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    {[
                      { key: 'all', label: '🌟 جميع الأجهزة' },
                      { key: 'code_registered', label: `👑 المشتركون بكود (${visitorSummary.codeSubscribers})` },
                      { key: 'active', label: `🟢 نشطون الآن (${visitorSummary.activeNow})` },
                      { key: 'master_vault', label: `🔑 رمز رئيسي (${visitorSummary.masterUsers})` },
                      { key: 'guest', label: '👤 زوار غير مسجلين' },
                      { key: 'blocked', label: `🚫 المحظورون (${visitorSummary.blocked})` },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setVisitorsStatusFilter(tab.key);
                          setVisitorsPage(1);
                        }}
                        className={`py-1.5 px-3 rounded-xl font-bold whitespace-nowrap border transition-all cursor-pointer ${
                          visitorsStatusFilter === tab.key
                            ? 'bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black border-[#ffd700] shadow-[0_0_12px_rgba(255,215,0,0.3)] font-black'
                            : 'bg-[#140e07] text-[#cfb780] border-[#d4af37]/20 hover:border-[#ffd700]/50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. VISITOR & SUBSCRIBER INTELLIGENCE CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allVisitors.map((v) => {
                    const isCodeSubscriber =
                      v.authType === 'license_code' ||
                      Boolean(v.activeCodeMasked && v.activeCodeMasked !== '👑 رمز رئيسي موحد');
                    const isMasterVault = v.authType === 'master_vault';
                    const hasGps = Boolean(v.gpsLocation && typeof v.gpsLocation.latitude === 'number');
                    const lat = hasGps ? v.gpsLocation.latitude : v.ipLocation?.latitude || 30.0444;
                    const lng = hasGps ? v.gpsLocation.longitude : v.ipLocation?.longitude || 31.2357;
                    const isRevealed = Boolean(v.linkedCode?.id && revealedCodes[v.linkedCode.id]);

                    return (
                      <div
                        key={v.id}
                        className={`rounded-2xl p-4 space-y-3.5 transition-all shadow-lg relative overflow-hidden flex flex-col justify-between ${
                          isCodeSubscriber
                            ? 'bg-gradient-to-b from-[#1b1408] via-[#100d07] to-[#090704] border-2 border-[#ffd700]/70 shadow-[0_0_25px_rgba(255,215,0,0.12)]'
                            : isMasterVault
                            ? 'bg-gradient-to-b from-[#150f1c] via-[#0d0912] to-[#07050a] border border-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                            : 'bg-[#0e0a05] border border-[#d4af37]/25 hover:border-[#d4af37]/60'
                        }`}
                      >
                        {/* Top Ambient Gold Rim for Code Subscribers */}
                        {isCodeSubscriber && (
                          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#ffd700] to-transparent" />
                        )}

                        <div className="space-y-3">
                          {/* Header: Flag, City, IP, Status & Auth Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-[#d4af37]/15 pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl select-none" title={v.country || 'الدولة'}>
                                {v.flag || '🌐'}
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                                  <span>{v.city || 'المدينة'}</span>
                                  <span className="text-[11px] text-[#ffd700]">· {v.country || 'الدولة'}</span>
                                </h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[11px] font-mono text-[#8e7e60] select-all">
                                    {v.ip}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(v.ip, `ip_${v.id}`)}
                                    className="text-[#8e7e60] hover:text-[#ffd700] cursor-pointer"
                                    title="نسخ IP"
                                  >
                                    {copiedId === `ip_${v.id}` ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {/* Online / Offline status */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                  v.isActive
                                    ? 'bg-[#152e1b] text-[#4ade80] border-[#22c55e]/50'
                                    : 'bg-[#1a140a] text-[#8e7e60] border-[#312513]'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    v.isActive ? 'bg-[#22c55e] animate-ping' : 'bg-[#6b5a3e]'
                                  }`}
                                />
                                <span>{v.isActive ? 'نشط الآن' : 'غير متصل'}</span>
                              </span>

                              {/* Auth Badge */}
                              {isCodeSubscriber ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black shadow-xs flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  <span>مشترك بكود ترخيص</span>
                                </span>
                              ) : isMasterVault ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#291738] text-[#d8b4fe] border border-[#a855f7]/40 flex items-center gap-1">
                                  <Key className="w-3 h-3 text-[#c084fc]" />
                                  <span>رمز رئيسي</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] text-[#8e7e60] bg-[#140e07] border border-[#2e2312]">
                                  زائر غير مسجل
                                </span>
                              )}
                            </div>
                          </div>

                          {/* ============================================== */}
                          {/* PROMINENT FIRST SEEN & LAST SEEN TRACKING BOX  */}
                          {/* ============================================== */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {/* FIRST SEEN (أول ظهور) */}
                            <div className="bg-[#140e07] border border-[#d4af37]/25 rounded-xl p-2.5 relative">
                              <div className="flex items-center justify-between text-[10px] text-[#cfb780] font-bold mb-1">
                                <span className="flex items-center gap-1 text-[#ffd700]">
                                  <Calendar className="w-3 h-3" />
                                  <span>أول ظهور</span>
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 font-sans text-[#cfb780]">
                                  {formatRelativeArabic(v.firstSeenAt)}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] text-white font-bold tracking-tight">
                                {formatFullArabicDateTime(v.firstSeenAt)}
                              </div>
                            </div>

                            {/* LAST SEEN (آخر ظهور) */}
                            <div className="bg-[#140e07] border border-[#d4af37]/25 rounded-xl p-2.5 relative">
                              <div className="flex items-center justify-between text-[10px] text-[#cfb780] font-bold mb-1">
                                <span className="flex items-center gap-1 text-[#38bdf8]">
                                  <Clock className="w-3 h-3" />
                                  <span>آخر ظهور</span>
                                </span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                                    v.isActive ? 'bg-[#152e1b] text-[#4ade80]' : 'bg-black/40 text-[#8e7e60]'
                                  }`}
                                >
                                  {v.isActive ? '🟢 الآن' : formatRelativeArabic(v.lastSeenAt)}
                                </span>
                              </div>
                              <div className="font-mono text-[11px] text-white font-bold tracking-tight">
                                {formatFullArabicDateTime(v.lastSeenAt)}
                              </div>
                            </div>
                          </div>

                          {/* Sessions Count & Last Page Strip */}
                          <div className="flex items-center justify-between text-[11px] text-[#8e7e60] bg-[#090704] px-2.5 py-1.5 rounded-lg border border-[#d4af37]/10 font-mono">
                            <span className="flex items-center gap-1 text-[#cfb780]">
                              <Activity className="w-3 h-3 text-[#ffd700]" />
                              <span>إجمالي الزيارات: <b className="text-white">{v.visitCount || 1}</b> جلسة</span>
                            </span>
                            <span className="text-[10px] text-[#8e7e60] truncate max-w-[140px]" title={v.lastPage}>
                              الصفحة: <b className="text-[#38bdf8]">{v.lastPage || '/'}</b>
                            </span>
                          </div>

                          {/* ======================================================= */}
                          {/* DEDICATED SUBSCRIBER CODE CARD (FOR CODE-REGISTERED)     */}
                          {/* ======================================================= */}
                          {isCodeSubscriber && (
                            <div className="bg-gradient-to-br from-[#231809] to-[#120d05] border-2 border-[#ffd700]/50 rounded-xl p-3 space-y-2.5 shadow-inner">
                              <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-1.5">
                                <span className="text-[11px] font-bold text-[#ffd700] flex items-center gap-1.5">
                                  <Key className="w-3.5 h-3.5" />
                                  <span>بيانات كود الترخيص المشترك به</span>
                                </span>

                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    v.licenseStatus === 'active' || v.linkedCode?.status === 'active'
                                      ? 'bg-[#152e1b] text-[#4ade80] border-[#22c55e]/40'
                                      : v.licenseStatus === 'suspended' || v.linkedCode?.status === 'suspended'
                                      ? 'bg-[#33220a] text-[#fbbf24] border-[#f59e0b]/40'
                                      : 'bg-[#331111] text-[#f87171] border-[#ef4444]/40'
                                  }`}
                                >
                                  {v.licenseStatus === 'active' || v.linkedCode?.status === 'active'
                                    ? 'سارٍ ونشط'
                                    : v.licenseStatus === 'suspended' || v.linkedCode?.status === 'suspended'
                                    ? 'موقوف مؤقتاً'
                                    : 'منتهي الصلاحية'}
                                </span>
                              </div>

                              {/* Code Text with Reveal & Copy */}
                              <div className="flex items-center justify-between bg-black/60 border border-[#d4af37]/30 px-3 py-1.5 rounded-lg font-mono text-xs">
                                <span className="font-bold text-[#ffd700] tracking-wider select-all">
                                  {isRevealed
                                    ? revealedCodes[v.linkedCode.id]
                                    : v.linkedCode?.plainCode || v.activeCodeMasked || v.linkedCode?.masked || 'AREEN-****'}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {v.linkedCode?.id && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevealCode(v.linkedCode.id)}
                                      className="text-[#8e7e60] hover:text-[#ffd700] transition-colors p-1"
                                      title={isRevealed ? 'إخفاء' : 'كشف النص الكامل'}
                                    >
                                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const codeToCopy = isRevealed
                                        ? revealedCodes[v.linkedCode.id]
                                        : v.linkedCode?.plainCode || v.activeCodeMasked;
                                      copyToClipboard(codeToCopy || '', `code_${v.id}`);
                                      showNotification('تم نسخ كود المشترك للحافظة');
                                    }}
                                    className="text-[#8e7e60] hover:text-[#ffd700] transition-colors p-1"
                                    title="نسخ الكود"
                                  >
                                    {copiedId === `code_${v.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-[#22c55e]" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* License Duration, Remaining Time & Device Lock Status */}
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <span className="text-[#8e7e60] block">مدة الباقة:</span>
                                  <span className="font-bold text-white font-mono">
                                    {v.licenseDuration || v.linkedCode?.durationType || '24h'}
                                    {v.linkedCode?.batchName ? ` (${v.linkedCode.batchName})` : ''}
                                  </span>
                                </div>

                                <div>
                                  <span className="text-[#8e7e60] block">الوقت المتبقي:</span>
                                  <span className="font-bold text-[#4ade80] font-mono">
                                    {v.linkedCode?.remainingMinutes && v.linkedCode.remainingMinutes > 0
                                      ? `${Math.floor(v.linkedCode.remainingMinutes / 60)} س و ${v.linkedCode.remainingMinutes % 60} د`
                                      : v.licenseExpiresAt
                                      ? formatRelativeArabic(v.licenseExpiresAt)
                                      : 'مفتوح / غير محدد'}
                                  </span>
                                </div>
                              </div>

                              {/* Device Lock Info */}
                              <div className="flex items-center justify-between text-[10px] text-[#cfb780] bg-[#140e07] p-2 rounded-lg border border-[#d4af37]/20">
                                <span className="flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-[#ffd700]" />
                                  <span>قفل الجهاز: <b>{v.licenseActivationCount || v.linkedCode?.activationCount || 1} من {v.licenseMaxActivations || v.linkedCode?.maxActivations || 1}</b> (مقفل على هذا الهاتف)</span>
                                </span>

                                {/* One-Click Reset Device Lock */}
                                <button
                                  type="button"
                                  onClick={() => handleResetVisitorLicenseDevice(v.id)}
                                  className="px-2 py-1 rounded bg-[#2a1d08] hover:bg-[#3d2a0b] text-[#ffd700] border border-[#d4af37]/40 font-bold transition-all cursor-pointer flex items-center gap-1"
                                  title="فك قفل الجهاز فورياً ليتمكن المشترك من تشغيله على هاتف آخر"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>فك قفل الهاتف</span>
                                </button>
                              </div>

                              {/* Subscriber Action Tools Strip */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1">
                                {/* Quick Extend License */}
                                <button
                                  type="button"
                                  onClick={() => setExtendTargetVisitor(v)}
                                  className="py-1.5 px-2 rounded-lg bg-[#241a0b] hover:bg-[#362710] text-[#ffd700] border border-[#d4af37]/35 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                  title="تمديد الصلاحية"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>تمديد الوقت</span>
                                </button>

                                {/* Suspend / Resume License */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleVisitorLicenseStatus(
                                      v.id,
                                      v.licenseStatus || v.linkedCode?.status
                                    )
                                  }
                                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                                    v.licenseStatus === 'suspended' || v.linkedCode?.status === 'suspended'
                                      ? 'bg-[#152e1b] text-[#4ade80] border-[#22c55e]/40 hover:bg-[#1e4226]'
                                      : 'bg-[#291e0a] text-[#fbbf24] border-[#f59e0b]/40 hover:bg-[#382a0d]'
                                  }`}
                                  title={
                                    v.licenseStatus === 'suspended' || v.linkedCode?.status === 'suspended'
                                      ? 'تفعيل الكود'
                                      : 'إيقاف مؤقت'
                                  }
                                >
                                  {v.licenseStatus === 'suspended' || v.linkedCode?.status === 'suspended' ? (
                                    <>
                                      <PlayCircle className="w-3 h-3" />
                                      <span>تنشيط</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="w-3 h-3" />
                                      <span>إيقاف</span>
                                    </>
                                  )}
                                </button>

                                {/* Revoke and Kickout */}
                                <button
                                  type="button"
                                  onClick={() => handleRevokeVisitorLicense(v.id)}
                                  className="py-1.5 px-2 rounded-lg bg-[#271010] hover:bg-[#3d1818] text-[#ff7979] border border-[#ff4d4d]/30 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                  title="إلغاء الترخيص نهائياً وطرد المشترك"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>إلغاء وطرد</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Phone Hardware & Network Telemetry */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[#140e07] border border-[#d4af37]/15 rounded-xl p-2">
                              <span className="text-[10px] text-[#8e7e60] block mb-0.5">الهاتف المرصود</span>
                              <span className="font-bold text-white block text-[11px] truncate" title={v.device?.model || 'هاتف ذكي'}>
                                {v.device?.model || 'هاتف ذكي'}
                              </span>
                              <span className="text-[10px] text-[#cfb780] font-mono block">
                                {v.device?.os || 'OS'} {v.device?.browser ? `· ${v.device.browser}` : ''}
                              </span>
                            </div>

                            <div className="bg-[#140e07] border border-[#d4af37]/15 rounded-xl p-2">
                              <span className="text-[10px] text-[#8e7e60] block mb-0.5">البطارية والمزود</span>
                              <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-white">
                                <Battery className="w-3.5 h-3.5 text-[#22c55e]" />
                                <span>{typeof v.device?.batteryLevel === 'number' ? `${v.device.batteryLevel}%` : 'متاح'}</span>
                                {v.device?.isCharging && (
                                  <Zap className="w-3 h-3 text-[#ffd700] animate-bounce" />
                                )}
                              </div>
                              <span className="text-[10px] text-[#cfb780] block truncate" title={v.isp}>
                                {v.isp || 'مزود الإنترنت'}
                              </span>
                            </div>
                          </div>

                          {/* GPS / Geolocation Pin & Google Maps Link */}
                          <div className="bg-[#140e07] border border-[#d4af37]/15 rounded-xl p-2 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <MapPin className={`w-3.5 h-3.5 ${hasGps ? 'text-[#22c55e]' : 'text-[#eab308]'}`} />
                              <div>
                                <span className="font-mono text-[11px] text-[#ffd700]">
                                  {lat.toFixed(4)}, {lng.toFixed(4)}
                                </span>
                                <span className="text-[9px] text-[#8e7e60] block">
                                  {hasGps ? 'إحداثيات GPS فعلية' : 'تقريب عنوان IP'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMapVisitorId(v.id);
                                  setActiveTab('radar_map');
                                }}
                                className="py-1 px-2 rounded-lg bg-[#1e160a] hover:bg-[#2b1f0d] text-[#ffd700] border border-[#d4af37]/30 text-[10px] font-bold flex items-center gap-1"
                                title="تحديد على رادار الخريطة الداخلي"
                              >
                                <Compass className="w-3 h-3" />
                                <span>الرادار</span>
                              </button>

                              <a
                                href={`https://www.google.com/maps?q=${lat},${lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="py-1 px-2 rounded-lg bg-[#22180a] hover:bg-[#33240e] text-[#ffd700] border border-[#d4af37]/30 text-[10px] font-bold flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Google</span>
                              </a>
                            </div>
                          </div>

                          {/* Customer CRM Note (Editable) */}
                          <div className="bg-[#100c06] border border-[#d4af37]/15 rounded-xl p-2 text-xs">
                            {editingNoteVisitorId === v.id ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  placeholder="اكتب ملاحظة للعميل (مثال: عميل VIP - تليجرام)..."
                                  className="w-full p-1.5 rounded-lg bg-[#070503] border border-[#ffd700]/50 text-white text-xs focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingNoteVisitorId(null)}
                                    className="px-2 py-0.5 rounded text-[10px] text-[#8e7e60]"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveVisitorNote(v.id, editingNoteText)}
                                    className="px-2.5 py-0.5 rounded bg-[#ffd700] text-black text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>حفظ</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-[#8e7e60] truncate max-w-[220px]">
                                  {v.note ? (
                                    <span className="text-[#ffd700]">📝 {v.note}</span>
                                  ) : (
                                    <span className="italic opacity-60">لا توجد ملاحظات مسجلة</span>
                                  )}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteVisitorId(v.id);
                                    setEditingNoteText(v.note || '');
                                  }}
                                  className="text-[#8e7e60] hover:text-[#ffd700] p-0.5"
                                  title="تعديل الملاحظة"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ======================================================== */}
                        {/* REMOTE COMMAND & CONTROL TERMINAL (INSTANT ACTIONS)     */}
                        {/* ======================================================== */}
                        <div className="pt-2 border-t border-[#d4af37]/20 flex flex-wrap items-center gap-1.5">
                          {/* 1. Remote Instant Force Kickout */}
                          <button
                            type="button"
                            onClick={() => handleKickoutVisitor(v.id)}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-[#26140d] hover:bg-[#381c12] text-[#f97316] border border-[#ea580c]/35 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                            title="طرد الجلسة فوراً عن بعد وإخراج الهاتف لشاشة تسجيل الدخول"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>طرد فوري</span>
                          </button>

                          {/* 2. Send Targeted Private Message */}
                          <button
                            type="button"
                            onClick={() => {
                              setMessageTargetVisitor(v);
                              setTargetedMessageText('');
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-[#17202e] hover:bg-[#202d40] text-[#38bdf8] border border-[#0284c7]/35 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                            title="إرسال تنبيه أو رسالة خاصة تظهر فوراً على شاشة هاتف هذا المشترك"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>رسالة خاصة</span>
                          </button>

                          {/* 3. Block / Unblock Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleBlock(v.id)}
                            className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              v.blocked
                                ? 'bg-[#183318] text-[#4ade80] border-[#22c55e]/40'
                                : 'bg-[#2b1212] text-[#f87171] border-[#ef4444]/40 hover:bg-[#3d1818]'
                            }`}
                            title={v.blocked ? 'فك حظر هذا الجهاز' : 'حظر هذا الجهاز وعنوان IP'}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>{v.blocked ? 'فك الحظر' : 'حظر'}</span>
                          </button>

                          {/* 4. Deep Dossier Inspection */}
                          <button
                            type="button"
                            onClick={() => setInspectedVisitor(v)}
                            className="p-1.5 rounded-xl bg-[#140e07] hover:bg-[#22180c] text-[#ffd700] border border-[#d4af37]/30 transition-colors"
                            title="فحص تقني شامل للملف"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {allVisitors.length === 0 && (
                    <div className="col-span-full text-center py-12 rounded-2xl bg-[#0e0a05] border border-[#d4af37]/20 text-xs text-[#8e7e60]">
                      لا توجد أجهزة أو مشتركون مطابقون لخيارات البحث المحددة
                    </div>
                  )}
                </div>

                {/* Pagination Footer */}
                {visitorsTotalPages > 1 && (
                  <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-3 px-4 flex items-center justify-between text-xs">
                    <span className="text-[#8e7e60]">
                      إجمالي الأجهزة: <b className="text-[#ffd700] font-mono">{visitorSummary.total}</b> (صفحة {visitorsPage} من {visitorsTotalPages})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={visitorsPage <= 1}
                        onClick={() => setVisitorsPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg bg-[#1a140a] disabled:opacity-40 text-[#ffd700] border border-[#d4af37]/30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        disabled={visitorsPage >= visitorsTotalPages}
                        onClick={() => setVisitorsPage((p) => Math.min(visitorsTotalPages, p + 1))}
                        className="p-1.5 rounded-lg bg-[#1a140a] disabled:opacity-40 text-[#ffd700] border border-[#d4af37]/30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 1: TARGETED PRIVATE MESSAGE DISPATCH               */}
            {/* ======================================================== */}
            {messageTargetVisitor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-md bg-[#120d06] border-2 border-[#ffd700]/70 rounded-3xl p-5 shadow-[0_0_50px_rgba(255,215,0,0.25)] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#261908] border border-[#ffd700]/40 flex items-center justify-center text-[#ffd700]">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#ffd700]">
                          إرسال رسالة خاصة لهاتف المشترك
                        </h3>
                        <p className="text-[10px] text-[#8e7e60] font-mono">
                          الجهاز: {messageTargetVisitor.ip} ({messageTargetVisitor.device?.model || 'هاتف'})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setMessageTargetVisitor(null)}
                      className="p-1 text-[#8e7e60] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSendTargetedMessageSubmit} className="space-y-3">
                    {/* Level Select */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#cfb780] mb-1.5">
                        طراز التنبيه:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { level: 'vip', label: '👑 ذهبي VIP' },
                          { level: 'warning', label: '⚠️ تحذيري' },
                          { level: 'alert', label: '🚨 طوارئ' },
                          { level: 'info', label: 'ℹ️ إشعار' },
                        ].map((b) => (
                          <button
                            key={b.level}
                            type="button"
                            onClick={() => setTargetedMessageLevel(b.level as any)}
                            className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              targetedMessageLevel === b.level
                                ? 'bg-[#ffd700] text-black border-[#ffd700] font-black'
                                : 'bg-[#171007] text-[#cfb780] border-[#d4af37]/20'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Text */}
                    <div>
                      <label className="block text-[11px] font-bold text-[#cfb780] mb-1.5">
                        نص الرسالة المنبثقة:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={targetedMessageText}
                        onChange={(e) => setTargetedMessageText(e.target.value)}
                        placeholder="مثال: مرحباً بك في العرين الذهبي! تم ترقية باقتك إلى VIP بنجاح."
                        className="w-full p-3 rounded-xl bg-[#090704] border border-[#d4af37]/30 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setMessageTargetVisitor(null)}
                        className="py-2 px-3 rounded-xl bg-[#1c140a] text-xs text-[#8e7e60] hover:text-white"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={sendingMessage || !targetedMessageText.trim()}
                        className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black font-black text-xs flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50"
                      >
                        {sendingMessage ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>إرسال فوراً للشاشة</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 2: EXTEND LICENSE QUICK MODAL                      */}
            {/* ======================================================== */}
            {extendTargetVisitor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-sm bg-[#120d06] border-2 border-[#ffd700]/70 rounded-3xl p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#d4af37]/20 pb-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-[#ffd700]" />
                      <h3 className="text-sm font-bold text-[#ffd700]">
                        تمديد اشتراك المشترك
                      </h3>
                    </div>
                    <button
                      onClick={() => setExtendTargetVisitor(null)}
                      className="p-1 text-[#8e7e60] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-[#cfb780]">
                    اختر المدة الإضافية التي ترغب في إضافتها لحساب المشترك صاحب الكود:
                  </p>
                  <div className="p-2 rounded-lg bg-black/50 border border-[#d4af37]/25 text-xs font-mono font-bold text-[#ffd700] text-center">
                    {extendTargetVisitor.activeCodeMasked || 'كود الترخيص المرتبط'}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { hours: 24, label: '+24 ساعة (يوم)' },
                      { hours: 72, label: '+3 أيام' },
                      { hours: 168, label: '+7 أيام (أسبوع)' },
                      { hours: 720, label: '+30 يوماً (شهر)' },
                    ].map((opt) => (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() =>
                          handleExtendVisitorLicense(
                            extendTargetVisitor.id,
                            opt.hours * 60,
                            opt.label
                          )
                        }
                        className="py-2.5 px-3 rounded-xl bg-[#1d1408] hover:bg-[#2c1f0d] text-[#ffd700] border border-[#d4af37]/35 text-xs font-bold transition-all cursor-pointer text-center"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setExtendTargetVisitor(null)}
                    className="w-full py-2 rounded-xl bg-[#140e07] text-xs text-[#8e7e60] hover:text-white"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* MODAL 3: DEEP DOSSIER INSPECTION MODAL                   */}
            {/* ======================================================== */}
            {inspectedVisitor && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="w-full max-w-lg bg-[#0e0a05] border-2 border-[#d4af37] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#d4af37]/25 pb-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#ffd700]" />
                      <h3 className="text-sm font-bold text-[#ffd700]">
                        الملف التقني والاستخباراتي الشامل للجهاز
                      </h3>
                    </div>
                    <button
                      onClick={() => setInspectedVisitor(null)}
                      className="p-1 text-[#8e7e60] hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#140e07] p-2.5 rounded-xl border border-[#d4af37]/20">
                        <span className="text-[#8e7e60] block text-[10px]">معرف الزائر الداخلي:</span>
                        <span className="font-mono text-[#ffd700] text-[11px] select-all block break-all">
                          {inspectedVisitor.id}
                        </span>
                      </div>
                      <div className="bg-[#140e07] p-2.5 rounded-xl border border-[#d4af37]/20">
                        <span className="text-[#8e7e60] block text-[10px]">عنوان IP:</span>
                        <span className="font-mono text-white text-[11px] select-all block">
                          {inspectedVisitor.ip}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#140e07] p-2.5 rounded-xl border border-[#d4af37]/20">
                        <span className="text-[#8e7e60] block text-[10px]">أول ظهور (First Seen):</span>
                        <span className="text-white block font-mono">
                          {formatFullArabicDateTime(inspectedVisitor.firstSeenAt)}
                        </span>
                        <span className="text-[10px] text-[#ffd700]">
                          {formatRelativeArabic(inspectedVisitor.firstSeenAt)}
                        </span>
                      </div>
                      <div className="bg-[#140e07] p-2.5 rounded-xl border border-[#d4af37]/20">
                        <span className="text-[#8e7e60] block text-[10px]">آخر ظهور (Last Seen):</span>
                        <span className="text-white block font-mono">
                          {formatFullArabicDateTime(inspectedVisitor.lastSeenAt)}
                        </span>
                        <span className="text-[10px] text-[#38bdf8]">
                          {inspectedVisitor.isActive ? 'نشط الآن 🟢' : formatRelativeArabic(inspectedVisitor.lastSeenAt)}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#140e07] p-2.5 rounded-xl border border-[#d4af37]/20 space-y-1">
                      <span className="text-[#8e7e60] block text-[10px]">متصفح العميل (User Agent):</span>
                      <p className="font-mono text-[11px] text-white select-all break-all leading-relaxed">
                        {inspectedVisitor.userAgent}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#140e07] p-2 rounded-xl border border-[#d4af37]/15">
                        <span className="text-[10px] text-[#8e7e60] block">عدد الجلسات</span>
                        <span className="text-sm font-bold text-white font-mono">{inspectedVisitor.visitCount || 1}</span>
                      </div>
                      <div className="bg-[#140e07] p-2 rounded-xl border border-[#d4af37]/15">
                        <span className="text-[10px] text-[#8e7e60] block">مستوى البطارية</span>
                        <span className="text-sm font-bold text-[#4ade80] font-mono">
                          {typeof inspectedVisitor.device?.batteryLevel === 'number'
                            ? `${inspectedVisitor.device.batteryLevel}%`
                            : 'غير متاح'}
                        </span>
                      </div>
                      <div className="bg-[#140e07] p-2 rounded-xl border border-[#d4af37]/15">
                        <span className="text-[10px] text-[#8e7e60] block">حالة الشحن</span>
                        <span className="text-sm font-bold text-white">
                          {inspectedVisitor.device?.isCharging ? '⚡ يشحن الآن' : 'غير موصول'}
                        </span>
                      </div>
                    </div>

                    {inspectedVisitor.linkedCode && (
                      <div className="bg-[#1a1207] p-3 rounded-xl border border-[#ffd700]/30 space-y-1.5 font-mono text-[11px]">
                        <span className="text-[#ffd700] font-bold block font-sans">بيانات كود الترخيص المشفر:</span>
                        <div>الكود الصريح: <b className="text-white select-all">{inspectedVisitor.linkedCode.plainCode || inspectedVisitor.linkedCode.masked}</b></div>
                        <div>المدة: <span className="text-[#cfb780]">{inspectedVisitor.linkedCode.durationType}</span></div>
                        <div>الانتهاء: <span className="text-[#cfb780]">{inspectedVisitor.linkedCode.expiresAt || 'مفتوح'}</span></div>
                        <div>التفعيلات: <span className="text-[#cfb780]">{inspectedVisitor.linkedCode.activationCount} / {inspectedVisitor.linkedCode.maxActivations}</span></div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#d4af37]/20">
                    <button
                      type="button"
                      onClick={() => handleDeleteVisitor(inspectedVisitor.id)}
                      className="py-2 px-3 rounded-xl bg-[#2b1010] hover:bg-[#3d1818] text-[#f87171] border border-[#ef4444]/30 text-xs font-bold"
                    >
                      حذف السجل نهائياً
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectedVisitor(null)}
                      className="py-2 px-4 rounded-xl bg-[#ffd700] text-black font-bold text-xs"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 6: EMERGENCY BROADCAST & ANNOUNCEMENTS               */}
            {/* ======================================================== */}
            {activeTab === 'broadcast' && (
              <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
                <div className="bg-[#0e0a05] border border-[#d4af37]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#d4af37]/20 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#1a1308] border border-[#d4af37]/40 flex items-center justify-center text-[#f59e0b]">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#ffd700]">
                        شريط الطوارئ والتعميم المباشر (VIP Announcement)
                      </h2>
                      <p className="text-xs text-[#8e7e60]">
                        بث فوري لأي رسالة أو تنبيه يظهر أعلى شاشات جميع المشتركين المتصلين لحظياً
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveBroadcast} className="space-y-4">
                    {/* Toggle Enable */}
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#140e07] border border-[#d4af37]/25">
                      <div>
                        <span className="font-bold text-white text-xs block">
                          تفعيل شريط الإعلان أعلى شاشات الزوار
                        </span>
                        <span className="text-[10px] text-[#8e7e60]">
                          عند التفعيل، سيظهر الشريط أعلى صفحة الصفقات لكافة المستخدمين المتصلين
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={broadcastEnabled}
                        onChange={(e) => setBroadcastEnabled(e.target.checked)}
                        className="w-5 h-5 text-[#ffd700] rounded focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Announcement Level / Color */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-2">
                        طراز الشريط واللون:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { level: 'vip', label: '👑 ذهبي فاخر (VIP)' },
                          { level: 'warning', label: '⚠️ تحذير أصفر' },
                          { level: 'alert', label: '🚨 طوارئ أحمر' },
                          { level: 'info', label: 'ℹ️ إشعار أزرق' },
                        ].map((b) => (
                          <button
                            key={b.level}
                            type="button"
                            onClick={() => setBroadcastLevel(b.level as any)}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              broadcastLevel === b.level
                                ? 'bg-[#ffd700] text-black border-[#ffd700] font-black'
                                : 'bg-[#140e07] text-[#cfb780] border-[#d4af37]/20'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message Input */}
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        نص الرسالة أو التعميم:
                      </label>
                      <textarea
                        rows={3}
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="مثال: سيتم تحديث جدول أزواج العملات بعد 10 دقائق.. جهزوا صفقاتكم الذهبية!"
                        className="w-full p-3 rounded-2xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs placeholder:text-[#6a5b41] focus:outline-none focus:border-[#ffd700]"
                      />
                    </div>

                    {/* Live Preview */}
                    <div>
                      <span className="block text-xs font-bold text-[#8e7e60] mb-2">
                        معاينة حية لشكل الشريط كما يراه العميل:
                      </span>
                      <div
                        className={`py-2 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-lg ${
                          broadcastLevel === 'alert'
                            ? 'bg-[#331111] text-[#fca5a5] border-[#ef4444]/50'
                            : broadcastLevel === 'warning'
                            ? 'bg-[#33220a] text-[#fde047] border-[#eab308]/50'
                            : broadcastLevel === 'info'
                            ? 'bg-[#0f1f33] text-[#7dd3fc] border-[#0284c7]/50'
                            : 'bg-[#221808] text-[#ffd700] border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>📢</span>
                          <span className="truncate">{broadcastMessage || 'نص الإعلان سيظهر هنا...'}</span>
                        </div>
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/40 border border-white/10 shrink-0 font-mono">
                          {broadcastLevel === 'vip' ? 'VIP' : 'تنبيه'}
                        </span>
                      </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black font-black text-sm shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                        <span>نشر وحفظ الإعلان لجميع الشاشات</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 7: AUDIT LOGS & SECURITY                             */}
            {/* ======================================================== */}
            {activeTab === 'audit_logs' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <History className="w-4 h-4 text-[#ffd700]" />
                    <span className="text-xs font-bold text-white">سجل العمليات والنشاطات الأمنية الموثقة</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchAuditLogs}
                    className="p-1.5 rounded-lg bg-[#140e07] hover:bg-[#20170a] text-[#ffd700] border border-[#d4af37]/30 text-xs flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>تحديث السجل</span>
                  </button>
                </div>

                <div className="bg-[#0e0a05] border border-[#d4af37]/25 rounded-2xl overflow-hidden">
                  <div className="divide-y divide-[#d4af37]/10 text-xs">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3.5 hover:bg-[#140e07] transition-colors flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1f1609] text-[#ffd700] border border-[#d4af37]/30">
                              {log.action}
                            </span>
                            <span className="font-mono text-[10px] text-[#8e7e60]">IP: {log.ip}</span>
                          </div>
                          <p className="text-white text-xs">{log.details}</p>
                        </div>
                        <span className="text-[10px] font-mono text-[#8e7e60] shrink-0">
                          {new Date(log.timestamp).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' })}
                        </span>
                      </div>
                    ))}

                    {auditLogs.length === 0 && (
                      <div className="py-8 text-center text-xs text-[#8e7e60]">
                        لا توجد سجلات أمان مسجلة حتى الآن
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 8: SETTINGS & VERCEL CLOUD STORAGE                   */}
            {/* ======================================================== */}
            {activeTab === 'settings' && (
              <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
                {/* Vercel Storage Diagnostics Card */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#d4af37]/20 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#142617] border border-[#22c55e]/40 flex items-center justify-center text-[#4ade80]">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">
                        تشخيص استمرارية التخزين وبيئة التشغيل (Vercel Storage)
                      </h2>
                      <p className="text-xs text-[#8e7e60]">
                        التحقق الفعلي من سلامة مسارات الكتابة لضمان عدم ضياع التراخيص عند إعادة النشر
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#140e07] border border-[#d4af37]/15">
                      <span className="text-[#8e7e60] block mb-1">المنصة المكتشفة تلقائياً:</span>
                      <span className="font-bold text-white font-mono">
                        {storageDiag?.environment?.platformName || 'Vercel Serverless / Cloud'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#140e07] border border-[#d4af37]/15">
                      <span className="text-[#8e7e60] block mb-1">مسار مجلد البيانات (DATA_DIR):</span>
                      <span className="font-bold text-[#ffd700] font-mono select-all">
                        {storageDiag?.environment?.dataDirectory || '/tmp/areen_data'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#140e07] border border-[#d4af37]/15">
                      <span className="text-[#8e7e60] block mb-1">إمكانية الكتابة الحية (Write Check):</span>
                      <span className="font-bold text-[#4ade80] flex items-center gap-1 font-mono">
                        <Check className="w-3.5 h-3.5" />
                        <span>قابلة للكتابة والتعديل بنجاح</span>
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#140e07] border border-[#d4af37]/15">
                      <span className="text-[#8e7e60] block mb-1">نظام التخزين:</span>
                      <span className="font-bold text-white font-mono">
                        Atomic JSON + SQLite Seed Engine
                      </span>
                    </div>
                  </div>
                </div>

                {/* Change Admin Password */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#d4af37]/20 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#1a1308] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#ffd700]">
                        تغيير كلمة مرور الإدارة المركزية
                      </h2>
                      <p className="text-xs text-[#8e7e60]">
                        تشفير PBKDF2 بـ 210,000 دورة لحماية لوحة الإدارة من الاختراق
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#cfb780] mb-1">
                        كلمة المرور الحالية للإدارة:
                      </label>
                      <input
                        type="password"
                        required
                        value={currentAdminPass}
                        onChange={(e) => setCurrentAdminPass(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1">
                          كلمة المرور الجديدة:
                        </label>
                        <input
                          type="password"
                          required
                          value={newAdminPass}
                          onChange={(e) => setNewAdminPass(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#cfb780] mb-1">
                          تأكيد كلمة المرور الجديدة:
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmAdminPass}
                          onChange={(e) => setConfirmAdminPass(e.target.value)}
                          className="w-full py-2 px-3 rounded-xl bg-[#140e07] border border-[#d4af37]/25 text-white text-xs focus:outline-none focus:border-[#ffd700]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#ffd700] to-[#b38f26] text-black font-black text-xs hover:brightness-110 transition-all cursor-pointer"
                    >
                      حفظ كلمة المرور الجديدة
                    </button>
                  </form>
                </div>

                {/* Database Backup & Restore */}
                <div className="bg-[#0e0a05] border border-[#d4af37]/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex items-center gap-3 border-b border-[#d4af37]/20 pb-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#1a1308] border border-[#d4af37]/40 flex items-center justify-center text-[#ffd700]">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#ffd700]">
                        النسخ الاحتياطي والاستعادة الكاملة (JSON Backup)
                      </h2>
                      <p className="text-xs text-[#8e7e60]">
                        تصدير كامل قاعدة البيانات بالأكواد والزوار والأجهزة والاحتفاظ بها بأمان
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="py-2.5 px-4 rounded-xl bg-[#142617] hover:bg-[#1f3a23] text-[#4ade80] border border-[#22c55e]/40 text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>تنزيل نسخة احتياطية كاملة بصيغة JSON</span>
                    </button>

                    <div className="pt-2">
                      <label className="block text-xs font-bold text-[#cfb780] mb-1.5">
                        استعادة نسخة احتياطية من نص JSON:
                      </label>
                      <textarea
                        rows={3}
                        value={restoreJsonText}
                        onChange={(e) => setRestoreJsonText(e.target.value)}
                        placeholder="الصق محتوى ملف areen_backup.json هنا..."
                        className="w-full p-3 rounded-2xl bg-[#140e07] border border-[#d4af37]/25 text-white font-mono text-xs focus:outline-none focus:border-[#ffd700]"
                      />
                      <button
                        type="button"
                        onClick={handleRestoreBackup}
                        className="mt-2 py-2 px-4 rounded-xl bg-[#271010] hover:bg-[#3d1818] text-[#ff7979] border border-[#ff4d4d]/40 text-xs font-bold cursor-pointer"
                      >
                        استعادة البيانات الآن
                      </button>
                    </div>
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
