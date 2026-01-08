
export type RequestStatus = 'Pendiente' | 'En Producción' | 'Listo' | 'Entregado' | 'Corrección';
export type RequestPriority = 'Alta' | 'Media' | 'Baja' | 'Urgente';
export type RequestType = 'Video completo' | 'Agregado' | 'Variante' | 'Corrección';

// Video Type for production labeling
export type VideoType = 'Stock' | 'Hibrido' | 'Original';

export const VIDEO_TYPE_LABELS: Record<VideoType, string> = {
  'Stock': 'Stock',
  'Hibrido': 'Híbrido',
  'Original': 'Original'
};

// Board number for 4 production boards (each designer)
export type BoardNumber = 1 | 2 | 3 | 4;

// Board names mapping
export const BOARD_NAMES: Record<BoardNumber, string> = {
  1: 'Tablero Carlos',
  2: 'Tablero Moises',
  3: 'Tablero Angel',
  4: 'Tablero Giovany'
};

// Logo file metadata for uploads
export interface LogoFile {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export type Page = 'dashboard' | 'solicitudes' | 'produccion' | 'bitacora' | 'reportes' | 'usuarios' | 'ads-lab' | 'configuracion';

export type DateFilter = 'Hoy' | 'Este Mes' | 'Año' | string; // string ISO format for specific days

// Interface matching the UI requirements (Mapped from DB)
export interface RequestData {
  id: string; // This corresponds to 'folio' in UI
  uuid: string; // The real DB UUID
  client: string;
  clientInitials: string;
  clientColor: string;
  product: string;
  type: RequestType;
  priority: RequestPriority;
  status: RequestStatus;
  advisor: string;
  advisorId: string;
  advisorInitials: string;
  date: string; // Formatted date
  rawDate: string; // ISO String for filtering
  description?: string;
  escaleta?: string;
  downloadable_links?: string[];
  // Production board fields
  video_type?: VideoType;
  board_number?: BoardNumber;
  logos?: LogoFile[];
  completed_at?: string;
  created_by_user_id?: string;
  // Soft Delete Fields
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string; // Name of the user who deleted it
}

// Database Interfaces
export interface DBSolicitud {
  id: string; // uuid
  folio: number; // integer/serial in DB usually, or string if configured that way
  cliente: string;
  producto: string;
  tipo: string;
  prioridad: string | null;
  asesor_id: string;
  fecha_creacion: string;
  descripcion: string;
  escaleta_video: string; // Renamed to match schema
  material_descargable: string[]; // Renamed to match schema (JSON array)
  // Production board fields
  video_type?: string;
  board_number?: number;
  logos?: string; // JSON string
  completed_at?: string;
  created_by_user_id?: string;
  // Soft Delete
  is_deleted?: boolean;
  deleted_at?: string;
  deleted_by?: string;
}

export interface DBEstadoSolicitud {
  id: string;
  solicitud_id: string;
  estado: string;
  usuario_id: string;
  timestamp: string; // Correct column name
  nota?: string;
}

export interface DBUsuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  avatar_url?: string;
}

export interface DBNotificationLog {
  id: string;
  solicitud_id: string;
  tipo: string;
  destinatario: string;
  canal: 'in_app' | 'email' | 'whatsapp';
  timestamp: string;
  status: 'queued' | 'sent' | 'failed';
}

export interface InboxNotification {
  id: string;
  user_id: string;
  solicitud_id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  is_read: boolean;
  created_at: string;
}

export interface AppSettings {
  notifyProduction: boolean;
  notifyAdvisor: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  displayTime: string; // Formatted
  folio: string;
  user: string;
  status: string; // The specific status set in this event
  action: string; // Derived description
  solicitudId?: string; // Link to request UUID for metrics
}

export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  status: 'Activo' | 'Inactivo';
}

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  avatar_url?: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info';
}

export interface StatCardData {
  title: string;
  value: number;
  icon: string;
  colorClass: string; 
  bgClass: string;
}

export interface AdvisorStat {
  name: string;
  count: number;
  color: string;
  percent: number;
}

export interface ProductStat {
  name: string;
  value: number;
  color: string;
}

export interface VolumeStat {
  name: string;
  value: number;
  color: string;
}

// Productor (Designer) for workload tracking
export interface Productor {
  id: number;
  board_number: BoardNumber;
  nombre: string;
  created_at?: string;
}

// Workload per producer for display in Solicitudes section
export interface ProducerWorkload {
  productor: Productor;
  pendiente: number;
  enProduccion: number;
  correccion: number;
  listo: number;
  entregado: number;
  total: number;
}
