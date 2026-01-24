import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
// import './lib/security'; // TEMPORARILY DISABLED FOR DEBUGGING
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './components/Login';
import StatsRow from './components/StatsRow';
import Widgets from './components/Widgets';
import RequestsTable from './components/RequestsTable';
import ProductionKanban from './components/ProductionKanban';
import AuditLogView from './components/AuditLogView';
import UsersView from './components/UsersView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import NewRequestModal from './components/NewRequestModal';
import RequestDetailModal from './components/RequestDetailModal';
import AdsLabView from './components/AdsLabView';

import { RequestData, RequestStatus, Page, AuditLogEntry, Notification, DateFilter, UserProfile, User, InboxNotification, AppSettings, BoardNumber, Productor, ProducerWorkload } from './types';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [crossLoginStatus, setCrossLoginStatus] = useState<'idle' | 'validating' | 'error'>('idle');
  const [crossLoginError, setCrossLoginError] = useState('');

  // --- APP STATE ---
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedBoard, setSelectedBoard] = useState<BoardNumber | null>(null);
  
  // DATA STATE
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [deletedRequests, setDeletedRequests] = useState<RequestData[]>([]); 
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [advisorsList, setAdvisorsList] = useState<User[]>([]);
  const [productores, setProductores] = useState<Productor[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Guard for race conditions
  const fetchIdRef = useRef(0);

  // Track local status changes to avoid redundant refetch from realtime
  // Using a Set to support multiple concurrent changes
  const localStatusChangesRef = useRef<Set<string>>(new Set());

  // Flag para saber si la carga inicial ya terminó (evita mostrar loader al navegar)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Notification Systems
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]); 
  const [inboxNotifications, setInboxNotifications] = useState<InboxNotification[]>([]); 
  const [unreadCount, setUnreadCount] = useState(0);

  // Settings State
  const [settings, setSettings] = useState<AppSettings>({
    notifyProduction: true,
    notifyAdvisor: true
  });

  const [dateFilter, setDateFilter] = useState<DateFilter>('Hoy');
  
  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestData | null>(null);
  const [detailModalRequest, setDetailModalRequest] = useState<RequestData | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [filterAdvisor, setFilterAdvisor] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  const addToast = (message: string, type: 'success' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToastNotifications(prev => [{ id, message, type }, ...prev]);
    setTimeout(() => {
      setToastNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (userProfile?.id) {
      const savedSettings = localStorage.getItem(`notif_settings_${userProfile.id}`);
      if (savedSettings) {
        try {
           setSettings(JSON.parse(savedSettings));
        } catch (e) {
           console.error("Error parsing settings", e);
        }
      }
    }
  }, [userProfile]);

  const updateSettings = (key: keyof AppSettings) => {
    if (!userProfile?.id) return;
    setSettings(prev => {
      const newSettings = { ...prev, [key]: !prev[key] };
      localStorage.setItem(`notif_settings_${userProfile.id}`, JSON.stringify(newSettings));
      return newSettings;
    });
  };

  // Handle cross-project login from Master Dashboard
  useEffect(() => {
    const handleCrossLogin = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) return;

      setCrossLoginStatus('validating');

      try {
        // Call validation Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-cross-project-token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
          }
        );

        const responseText = await response.text();

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseErr) {
          throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
        }

        if (!response.ok) {
          const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
          throw new Error(errorMsg || 'Error de validación');
        }

        // Clear token from URL
        window.history.replaceState({}, '', window.location.pathname);

        // Redirect to magic link to establish session
        if (data.redirectUrl) {
          window.location.href = data.redirectUrl;
        }

      } catch (err: any) {
        console.error('Cross-login error:', err);
        setCrossLoginStatus('error');
        setCrossLoginError(err.message || 'Error de autenticación');
        // Clear token from URL even on error
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    handleCrossLogin();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setUserProfile(null);
        setAuthLoading(false);
        setRequests([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (user: any) => {
    try {
      // Get the name from user_metadata (set by cross-project auth) as primary source
      const metadataName = user.user_metadata?.name;

      const { data, error } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
      if (error && error.code === 'PGRST116') {
        // User not found in usuarios table - create new profile
        const defaultName = metadataName || user.email?.split('@')[0] || 'Usuario';
        const newProfile = { id: user.id, nombre: defaultName, email: user.email, rol: 'Productor', estado: 'Activo' };
        const { data: insertedData } = await supabase.from('usuarios').insert([newProfile]).select().single();
        setUserProfile(insertedData || newProfile);
      } else if (data) {
        // User exists - use metadata name if available (always synced from Dashboard A)
        if (metadataName && metadataName !== data.nombre) {
          // Update the local profile with the name from Dashboard A
          const updatedProfile = { ...data, nombre: metadataName };
          setUserProfile(updatedProfile);
          // Also update the database to keep it in sync
          await supabase.from('usuarios').update({ nombre: metadataName }).eq('id', user.id);
        } else {
          setUserProfile(data);
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getDateRange = (filter: DateFilter) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let start = new Date();
    let end = new Date();

    if (filter === 'Hoy') {
       start = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0, 0);
       end = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
    } else if (filter === 'Este Mes') {
       start = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
       end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    } else if (filter === 'Año') {
       start = new Date(currentYear, 0, 1, 0, 0, 0, 0);
       end = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    } else {
       const parts = filter.split('-');
       if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const day = parseInt(parts[2]);
          start = new Date(year, month, day, 0, 0, 0, 0);
          end = new Date(year, month, day, 23, 59, 59, 999);
       } else {
          start = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0, 0);
          end = new Date(currentYear, currentMonth, now.getDate(), 23, 59, 59, 999);
       }
    }
    return { start: start.toISOString(), end: end.toISOString() };
  };

  const fetchInboxNotifications = useCallback(async () => {
    if (!userProfile?.id) return;
    const { count } = await supabase.from('notificaciones').select('*', { count: 'exact', head: true }).eq('user_id', userProfile.id).eq('is_read', false);
    if (count !== null) setUnreadCount(count);
    const { data } = await supabase.from('notificaciones').select('*').eq('user_id', userProfile.id).order('created_at', { ascending: false }).limit(20);
    if (data) setInboxNotifications(data);
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.id) {
        fetchInboxNotifications();
        const interval = setInterval(fetchInboxNotifications, 30000);
        return () => clearInterval(interval);
    }
  }, [userProfile, fetchInboxNotifications]);

  const markNotificationRead = async (id: string, solicitudId?: string) => {
    try {
        await supabase.from('notificaciones').update({ is_read: true }).eq('id', id);
        setInboxNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (solicitudId) {
            let req = requests.find(r => r.uuid === solicitudId);
            if (req) setDetailModalRequest(req);
            else setDetailModalRequest({ uuid: solicitudId } as RequestData);
        }
    } catch (e) {
        console.error("Error marking read", e);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!userProfile?.id) return;
    try {
        await supabase.from('notificaciones').update({ is_read: true }).eq('user_id', userProfile.id).eq('is_read', false);
        setInboxNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    } catch (e) {
        console.error("Error marking all read", e);
    }
  };

  const fetchDeletedData = useCallback(async () => {
    if (!session) return;
    try {
      const { data } = await supabase.from('solicitudes').select(`*, asesor:usuarios!asesor_id(id, nombre), deleted_by_user:usuarios!deleted_by(nombre)`).eq('is_deleted', true).order('deleted_at', { ascending: false }).limit(500);
      if (data) {
        const mappedDeleted = data.map((dbReq: any) => ({
          id: dbReq.folio ? `#REQ-${dbReq.folio}` : 'PENDING',
          uuid: dbReq.id,
          client: dbReq.cliente,
          product: dbReq.producto,
          type: dbReq.tipo,
          status: 'Eliminado' as any,
          deleted_at: dbReq.deleted_at,
          deleted_by: dbReq.deleted_by_user?.nombre || '—',
          date: new Date(dbReq.fecha_creacion).toLocaleDateString('en-US')
        } as RequestData));
        setDeletedRequests(mappedDeleted);
      }
    } catch (e) { console.error("Error fetching trash:", e); }
  }, [session]);

  const fetchAllData = useCallback(async () => {
    if (!session) return;

    // Increment fetch ID for this specific call
    const currentFetchId = ++fetchIdRef.current;

    setDataLoading(true);
    setDataError(null);

    try {
      const { data: usersData, error: usersError } = await supabase.from('usuarios').select('*').limit(500);
      if (usersError) throw usersError;

      // Fetch productores for workload cards
      const { data: productoresData } = await supabase
        .from('productores')
        .select('*')
        .order('board_number');
      if (productoresData) setProductores(productoresData);

      const userMap = (usersData || []).reduce((acc, user) => {
        acc[user.id] = user.nombre;
        return acc;
      }, {} as Record<string, string>);

      const activeAdvisors = usersData ? usersData.filter(u => u.estado === 'Activo').map(u => ({
        id: u.id,
        name: u.nombre,
        role: u.rol,
        email: u.email,
        status: u.estado as any,
        avatar: u.avatar_url || ''
      })) : [];

      let query = supabase.from('solicitudes').select(`*, asesor:usuarios!asesor_id(id, nombre)`).eq('is_deleted', false).order('fecha_creacion', { ascending: false });
      
      if (currentPage === 'dashboard' || currentPage === 'reportes') {
         const { start, end } = getDateRange(dateFilter);
         query = query.gte('fecha_creacion', start).lte('fecha_creacion', end);
      }
      
      const { data: solicitudesData, error: reqError } = await query;
      if (reqError) throw reqError;

      // Get only the latest status for each solicitud using a more efficient query
      // Order by timestamp DESC so the most recent status comes first for each solicitud_id
      const { data: statusData, error: statusError } = await supabase
        .from('estados_solicitud')
        .select('*')
        .order('timestamp', { ascending: false });
      if (statusError) throw statusError;

      const latestStatusMap: Record<string, RequestStatus> = {};
      if (statusData) {
        // Since we ordered DESC, the first occurrence of each solicitud_id is the latest
        statusData.forEach(event => {
          if (!latestStatusMap[event.solicitud_id]) {
            latestStatusMap[event.solicitud_id] = event.estado as RequestStatus;
          }
        });
      }


      // If this fetch is no longer the latest, abort updates
      if (currentFetchId !== fetchIdRef.current) return;

      if (solicitudesData) {
        const colors = ["bg-blue-900 text-blue-300", "bg-green-900 text-green-300", "bg-indigo-900 text-indigo-300", "bg-pink-900 text-pink-300", "bg-teal-900 text-teal-300"];

        // Deterministic hash function for consistent colors
        const hashString = (str: string): number => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
          }
          return Math.abs(hash);
        };

        const mappedRequests = solicitudesData.map((dbReq: any) => {
          const currentStatus = latestStatusMap[dbReq.id] || 'Pendiente';
          const initials = dbReq.cliente ? dbReq.cliente.substring(0, 1).toUpperCase() : 'C';
          // Use deterministic color based on client name hash
          const colorIndex = hashString(dbReq.cliente || dbReq.id) % colors.length;
          const clientColor = colors[colorIndex];
          const advisorName = dbReq.asesor?.nombre || 'Sin Asignar';
          const advisorInitials = advisorName !== 'Sin Asignar' ? advisorName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'NA';
          return {
            id: dbReq.folio ? `#REQ-${dbReq.folio}` : 'PENDING',
            uuid: dbReq.id,
            client: dbReq.cliente,
            clientInitials: initials,
            clientColor: clientColor,
            product: dbReq.producto,
            type: dbReq.tipo,
            priority: dbReq.prioridad || 'Media',
            status: currentStatus,
            advisor: advisorName,
            advisorId: dbReq.asesor_id,
            advisorInitials: advisorInitials,
            date: new Date(dbReq.fecha_creacion).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            rawDate: dbReq.fecha_creacion,
            description: dbReq.descripcion,
            escaleta: dbReq.escaleta_video,
            downloadable_links: dbReq.material_descargable || [],
            aparatologia_tecnica: dbReq.aparatologia_tecnica || '',
            wetransfer_link: dbReq.wetransfer_link || '',
            // Production board fields
            video_type: dbReq.video_type || undefined,
            board_number: dbReq.board_number ? Number(dbReq.board_number) as BoardNumber : undefined,
            logos: dbReq.logos || [],
            completed_at: dbReq.completed_at,
            created_by_user_id: dbReq.created_by_user_id
          } as RequestData;
        });
        setRequests(mappedRequests);
      }

      if (statusData && solicitudesData) {
         const folioMap = solicitudesData.reduce((acc: any, req: any) => {
            acc[req.id] = req.folio ? `#REQ-${req.folio}` : 'PENDING';
            return acc;
         }, {} as Record<string, string>);

         const logs: AuditLogEntry[] = statusData.map(st => ({
            id: st.id,
            timestamp: st.timestamp,
            displayTime: new Date(st.timestamp).toLocaleString(),
            folio: folioMap[st.solicitud_id] || 'Desconocido',
            user: userMap[st.usuario_id] || 'Usuario',
            status: st.estado,
            action: st.estado === 'Pendiente' && !st.nota ? 'Solicitud creada' : `Cambio de estado: ${st.estado}`,
            solicitudId: st.solicitud_id
         }));
         setAuditLogs(logs.reverse());
      }

      setAdvisorsList(activeAdvisors);
      if (currentPage === 'bitacora') fetchDeletedData();

    } catch (err: any) {
      if (currentFetchId === fetchIdRef.current) {
        console.error("Data fetch error:", err);
        setDataError(err.message || "Error al cargar datos");
      }
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setDataLoading(false);
        setInitialLoadComplete(true);
      }
    }
  }, [session, currentPage, dateFilter, fetchDeletedData]);

  useEffect(() => {
    if (session) fetchAllData();
  }, [session, fetchAllData]);

  // Real-time subscription for live updates with fallback polling
  useEffect(() => {
    if (!session) return;

    let isRealtimeConnected = false;

    const channel = supabase
      .channel('workload-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solicitudes' },
        (payload) => {
          // Skip refetch if this was a local status change (e.g., completed_at update for Entregado)
          const changedId = payload.new?.id || payload.old?.id;
          if (localStatusChangesRef.current.has(changedId)) {
            return;
          }
          fetchAllData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'estados_solicitud' },
        (payload) => {
          // Skip refetch if this was a local status change (already updated optimistically)
          const changedSolicitudId = payload.new?.solicitud_id;
          if (localStatusChangesRef.current.has(changedSolicitudId)) {
            return;
          }
          fetchAllData();
        }
      )
      .subscribe((status) => {
        isRealtimeConnected = status === 'SUBSCRIBED';
      });

    // Fallback polling every 30 seconds to ensure data sync
    // This guarantees updates even if realtime fails silently
    const pollingInterval = setInterval(() => {
      // Skip polling if there are recent local changes to prevent reverting optimistic updates
      if (localStatusChangesRef.current.size > 0) {
        return;
      }
      fetchAllData();
    }, 30000);

    return () => {
      clearInterval(pollingInterval);
      supabase.removeChannel(channel);
    };
  }, [session, fetchAllData]);

  const dashboardRequests = useMemo(() => requests, [requests]);

  // Calculate workload per producer for the workload cards
  const producerWorkloads = useMemo((): ProducerWorkload[] => {
    return productores.map(p => {
      const boardRequests = requests.filter(r => r.board_number === p.board_number);
      return {
        productor: p,
        pendiente: boardRequests.filter(r => r.status === 'Pendiente').length,
        enProduccion: boardRequests.filter(r => r.status === 'En Producción').length,
        correccion: boardRequests.filter(r => r.status === 'Corrección').length,
        entregado: boardRequests.filter(r => r.status === 'Entregado').length,
        total: boardRequests.length
      };
    });
  }, [productores, requests]);

  const dashboardStats = useMemo(() => ({
    total: dashboardRequests.length,
    pending: dashboardRequests.filter(r => r.status === 'Pendiente').length,
    production: dashboardRequests.filter(r => r.status === 'En Producción' || r.status === 'Corrección').length,
    completed: dashboardRequests.filter(r => r.status === 'Entregado').length,
  }), [dashboardRequests]);

  const filteredRequests = useMemo(() => requests.filter(req => {
    const matchesStatus = filterStatus === "Todos" || req.status === filterStatus;
    const matchesAdvisor = filterAdvisor === "Todos" || req.advisor === filterAdvisor;
    const matchesSearch = req.client.toLowerCase().includes(searchQuery.toLowerCase()) || req.id.toLowerCase().includes(searchQuery.toLowerCase()) || req.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesAdvisor && matchesSearch;
  }), [requests, filterStatus, filterAdvisor, searchQuery]);

  // Filtered dashboard requests for the dashboard table view
  const filteredDashboardRequests = useMemo(() => dashboardRequests.filter(req => {
    const matchesStatus = filterStatus === "Todos" || req.status === filterStatus;
    const matchesAdvisor = filterAdvisor === "Todos" || req.advisor === filterAdvisor;
    const matchesSearch = req.client.toLowerCase().includes(searchQuery.toLowerCase()) || req.id.toLowerCase().includes(searchQuery.toLowerCase()) || req.product.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesAdvisor && matchesSearch;
  }), [dashboardRequests, filterStatus, filterAdvisor, searchQuery]);

  const advisors = useMemo(() => Array.from(new Set(requests.map(r => r.advisor))), [requests]);

  const pageTitle = {
    dashboard: 'Dashboard Overview', solicitudes: 'Solicitudes', produccion: 'Tablero de Producción', bitacora: 'Bitácora Histórica', reportes: 'Reportes y Métricas', usuarios: 'Gestión de Usuarios', 'ads-lab': 'Ads Lab', configuracion: 'Configuración del Sistema'
  }[currentPage];

  const handleEditRequest = (request: RequestData) => {
    setEditingRequest(request);
    setIsNewModalOpen(true);
  };

  const handleSoftDelete = async (request: RequestData) => {
    if (!userProfile?.id) return;
    const prevRequests = [...requests];
    setRequests(requests.filter(r => r.uuid !== request.uuid));
    try {
      const { error } = await supabase.from('solicitudes').update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: userProfile.id }).eq('id', request.uuid);
      if (error) throw error;
      addToast("Solicitud eliminada (Papelera)", "success");
      fetchDeletedData();
    } catch (err: any) {
      addToast("Error al eliminar solicitud", "info");
      setRequests(prevRequests);
    }
  };

  const handleDuplicate = async (request: RequestData) => {
    if (!userProfile?.id) return;
    try {
      const payload = {
        cliente: request.client,
        producto: request.product,
        tipo: request.type,
        asesor_id: request.advisorId,
        prioridad: request.priority || 'Media',
        descripcion: request.description || '',
        fecha_creacion: new Date().toISOString(),
        escaleta_video: request.escaleta || '',
        material_descargable: request.downloadable_links || [],
        aparatologia_tecnica: request.aparatologia_tecnica || null,
        wetransfer_link: request.wetransfer_link || null,
        is_deleted: false,
        video_type: request.video_type || null,
        board_number: request.board_number || null,
        logos: request.logos || [],
        created_by_user_id: userProfile.id
      };
      const { data: insertedData, error } = await supabase.from('solicitudes').insert([payload]).select().single();
      if (error) throw error;
      addToast(`Solicitud ${request.id} duplicada exitosamente`, 'success');
      fetchAllData();
    } catch (err: any) {
      addToast(`Error al duplicar: ${err.message}`, "info");
    }
  };

  const handleRestore = async (uuid: string) => {
    try {
      const { error } = await supabase.from('solicitudes').update({ is_deleted: false, deleted_at: null, deleted_by: null }).eq('id', uuid);
      if (error) throw error;
      addToast("Solicitud restaurada exitosamente", "success");
      setDeletedRequests(prev => prev.filter(r => r.uuid !== uuid));
      fetchAllData();
    } catch (err: any) {
       addToast("Error al restaurar solicitud", "info");
    }
  };

  const handleStatusChange = async (id: string, newStatus: RequestStatus) => {
    const req = requests.find(r => r.id === id);
    if (!req) return;
    const internalId = req.uuid;
    if (!internalId || req.status === newStatus) return;

    // Track this as a local change to prevent redundant refetch from realtime
    localStatusChangesRef.current.add(internalId);

    const previousRequests = [...requests];
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));

    try {
      const { error } = await supabase.from('estados_solicitud').insert([{ solicitud_id: internalId, estado: newStatus, usuario_id: userProfile?.id, timestamp: new Date().toISOString() }]);
      if (error) throw error;

      // Update completed_at when status changes to 'Entregado' (for auto-archive after 30 days)
      if (newStatus === 'Entregado') {
        await supabase.from('solicitudes').update({ completed_at: new Date().toISOString() }).eq('id', internalId);
      }

      if (newStatus === 'Entregado' && settings.notifyAdvisor && req.advisorId) {
        await supabase.from('notificaciones').insert([{ user_id: req.advisorId, solicitud_id: internalId, titulo: "Solicitud entregada", mensaje: `${req.id} ha sido entregada.`, tipo: "solicitud_entregada", is_read: false }]);
      }

      // Send cross-project notification to Dashboard A for Corrección or Entregado status
      if ((newStatus === 'Corrección' || newStatus === 'Entregado') && req.created_by_user_id) {
        try {
          // Get the email of the original creator
          const { data: creatorData } = await supabase.from('usuarios').select('email').eq('id', req.created_by_user_id).single();
          if (creatorData?.email) {
            await supabase.functions.invoke('notify-cross-project', {
              body: {
                user_email: creatorData.email,
                request_id: req.id,
                request_uuid: internalId,
                type: newStatus === 'Corrección' ? 'correction' : 'ready',
                product_name: req.product,
                dashboard_source: 'video'
              }
            });
          }
        } catch (notifErr) {
          console.warn('Failed to send cross-project notification:', notifErr);
        }
      }

      addToast(`Estado de ${req.id} actualizado.`, 'success');
      // Note: Removed fetchAllData() - optimistic update already applied, realtime will sync if needed
    } catch (err) {
      addToast("Error al guardar el nuevo estado. Revertido.", "info");
      setRequests(previousRequests);
    } finally {
      // Clear this specific change from tracker after polling interval + buffer
      // Polling runs every 30s, so we need at least 35s to cover one full cycle
      setTimeout(() => {
        localStatusChangesRef.current.delete(internalId);
      }, 35000);
    }
  };

  const handleSaveRequest = async (data: Partial<RequestData>) => {
    if (!userProfile?.id) return;
    if (editingRequest) {
      try {
        const { error } = await supabase.from('solicitudes').update({
          cliente: data.client,
          producto: data.product,
          tipo: data.type,
          asesor_id: data.advisorId,
          descripcion: data.description,
          escaleta_video: data.escaleta,
          material_descargable: data.downloadable_links,
          aparatologia_tecnica: data.aparatologia_tecnica || null,
          wetransfer_link: data.wetransfer_link || null,
          video_type: data.video_type || null,
          board_number: data.board_number || null,
          logos: data.logos || []
        }).eq('id', editingRequest.uuid);
        if (error) throw error;
        addToast(`Solicitud ${editingRequest.id} actualizada.`, 'success');
        setEditingRequest(null); setIsNewModalOpen(false); fetchAllData();
      } catch (err: any) { addToast(`Error: ${err.message}`, "info"); }
    } else {
      try {
        const payload = {
          cliente: data.client,
          producto: data.product,
          tipo: data.type,
          asesor_id: data.advisorId,
          prioridad: 'Media',
          descripcion: data.description || '',
          fecha_creacion: new Date().toISOString(),
          escaleta_video: data.escaleta || '',
          material_descargable: data.downloadable_links || [],
          aparatologia_tecnica: data.aparatologia_tecnica || null,
          wetransfer_link: data.wetransfer_link || null,
          is_deleted: false,
          video_type: data.video_type || null,
          board_number: data.board_number || null,
          logos: data.logos || [],
          created_by_user_id: userProfile.id
        };
        const { data: insertedData, error: reqError } = await supabase.from('solicitudes').insert([payload]).select().single();
        if (reqError) throw reqError;

        // Create initial status entry for the new request
        if (insertedData) {
          await supabase.from('estados_solicitud').insert([{
            solicitud_id: insertedData.id,
            estado: 'Pendiente',
            usuario_id: userProfile.id,
            timestamp: new Date().toISOString()
          }]);
        }

        if (insertedData && settings.notifyProduction) {
           const folioDisplay = insertedData.folio ? `#REQ-${insertedData.folio}` : 'PENDING';
           const { data: recipients } = await supabase.from('usuarios').select('id').in('rol', ['Productor', 'Dirección']);
           if (recipients && recipients.length > 0) {
               const notifPayloads = recipients.map(r => ({ user_id: r.id, solicitud_id: insertedData.id, titulo: "Nueva solicitud", mensaje: `${folioDisplay} — ${insertedData.cliente} — ${insertedData.producto}`, tipo: "solicitud_creada", is_read: false }));
               await supabase.from('notificaciones').insert(notifPayloads);
           }
        }
        addToast(`Solicitud creada exitosamente.`, 'success');
        setIsNewModalOpen(false); fetchAllData();
      } catch (err: any) { addToast(`Error al crear solicitud: ${err.message}`, "info"); }
    }
  };

  const renderContent = () => {
    if (dataError) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <span className="material-icons-round text-4xl text-red-500 mb-2">error_outline</span>
          <p className="text-text-light dark:text-white font-medium mb-4">{dataError}</p>
          <button onClick={fetchAllData} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium">Reintentar</button>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
           <div className="space-y-8 animate-in fade-in duration-500">
             <StatsRow stats={dashboardStats} loading={dataLoading} />
             <Widgets requests={dashboardRequests} loading={dataLoading} />
             <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-1">
                <div className="px-5 py-4 border-b border-border-light dark:border-border-dark mb-0 flex justify-between items-center">
                  <h3 className="font-bold text-text-light dark:text-white">Dataset Filtrado del Dashboard</h3>
                  <span className="text-[10px] text-muted-dark bg-surface-darker px-2 py-0.5 rounded border border-border-dark">
                    Mostrando {dataLoading ? '...' : filteredDashboardRequests.length} resultados ({dateFilter})
                  </span>
                </div>
                <RequestsTable
                  requests={dataLoading ? [] : filteredDashboardRequests.slice(0, 5)}
                  onStatusChange={handleStatusChange}
                  onNewRequest={() => setIsNewModalOpen(true)}
                  onEditRequest={handleEditRequest}
                  onRowClick={setDetailModalRequest}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterAdvisor={filterAdvisor}
                  setFilterAdvisor={setFilterAdvisor}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  advisors={advisors}
                  onDelete={handleSoftDelete}
                  onDuplicate={handleDuplicate}
                />
             </div>
           </div>
        );
      case 'solicitudes':
        return (
          <RequestsTable
            requests={filteredRequests}
            onStatusChange={handleStatusChange}
            onNewRequest={() => setIsNewModalOpen(true)}
            onEditRequest={handleEditRequest}
            onRowClick={setDetailModalRequest}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterAdvisor={filterAdvisor}
            setFilterAdvisor={setFilterAdvisor}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            advisors={advisors}
            onDelete={handleSoftDelete}
            onDuplicate={handleDuplicate}
            producerWorkloads={producerWorkloads}
          />
        );
      case 'produccion':
        return <ProductionKanban requests={filteredRequests} onStatusChange={handleStatusChange} onViewDetail={setDetailModalRequest} onDuplicate={handleDuplicate} selectedBoard={selectedBoard} loading={dataLoading} />;
      case 'bitacora':
        return <AuditLogView logs={auditLogs} deletedRequests={deletedRequests} onRestore={handleRestore} />;
      case 'reportes':
        return <ReportsView requests={requests} history={auditLogs} dateFilter={dateFilter} loading={dataLoading} />;
      case 'usuarios':
        return <UsersView />;
      case 'ads-lab':
        return <AdsLabView currentUser={userProfile} />;
      case 'configuracion':
        return <SettingsView settings={settings} onToggle={updateSettings} />;
      default:
        return <div>Página no encontrada</div>;
    }
  };

  // Show loading screen during cross-project authentication
  if (crossLoginStatus === 'validating') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-white text-sm">Autenticando desde Master Dashboard...</p>
          <p className="text-gray-500 text-xs mt-2">Por favor espere</p>
        </div>
      </div>
    );
  }

  // Show error screen if cross-login failed
  if (crossLoginStatus === 'error') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center max-w-md px-4">
          <span className="material-icons-round text-5xl text-red-500 mb-4">error_outline</span>
          <p className="text-white text-lg mb-2">Error de autenticación</p>
          <p className="text-gray-400 text-sm mb-6 text-center">{crossLoginError}</p>
          <button
            onClick={() => setCrossLoginStatus('idle')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
          >
            Ir al login normal
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background-dark">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-white text-sm animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  // Loader global SOLO en carga inicial (no al navegar entre páginas)
  if (!initialLoadComplete) {
    return (
      <div className="h-screen w-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden font-sans text-text-light dark:text-text-dark">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} selectedBoard={selectedBoard} onSelectBoard={setSelectedBoard} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          title={pageTitle} notifications={inboxNotifications} unreadCount={unreadCount} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} dateFilter={dateFilter} onDateFilterChange={setDateFilter} showFilters={currentPage === 'dashboard' || currentPage === 'reportes'} userProfile={userProfile} onLogout={handleLogout}
        />
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
           <div className="max-w-[1600px] mx-auto pb-8 h-full">
             {renderContent()}
           </div>
        </div>
        <NewRequestModal isOpen={isNewModalOpen} onClose={() => { setIsNewModalOpen(false); setEditingRequest(null); }} onSave={handleSaveRequest} initialData={editingRequest} advisors={advisorsList} currentUser={userProfile} />
        <RequestDetailModal isOpen={!!detailModalRequest} onClose={() => setDetailModalRequest(null)} request={detailModalRequest} onUpdate={fetchAllData} />
        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2 pointer-events-none">
          {toastNotifications.map(n => (
            <div key={n.id} className="bg-surface-dark border border-border-dark text-white px-4 py-3 rounded-lg shadow-2xl flex items-center animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
              <span className={`material-icons-round mr-2 ${n.type === 'success' ? 'text-primary' : 'text-blue-400'}`}>{n.type === 'success' ? 'check_circle' : 'info'}</span>
              <span className="text-sm font-medium">{n.message}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
