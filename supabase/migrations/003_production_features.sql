-- Migration: Add production board features for Dashboard B (Video Production)
-- Run this in Dashboard B's Supabase: jiorvtskypelmdpffddc.supabase.co

-- Add video_type column to solicitudes table
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS video_type TEXT
CHECK (video_type IN ('Stock', 'Hibrido', 'Original'));

-- Add board_number column (1-4 for each designer)
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS board_number INTEGER DEFAULT 1
CHECK (board_number BETWEEN 1 AND 4);

-- Add completed_at for auto-archive tracking
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add logos storage (array of logo objects)
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS logos JSONB DEFAULT '[]'::jsonb;

-- Track original creator for cross-project notifications
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES usuarios(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_solicitudes_board_number ON solicitudes(board_number);
CREATE INDEX IF NOT EXISTS idx_solicitudes_completed_at ON solicitudes(completed_at);
CREATE INDEX IF NOT EXISTS idx_solicitudes_video_type ON solicitudes(video_type);
CREATE INDEX IF NOT EXISTS idx_solicitudes_created_by ON solicitudes(created_by_user_id);

-- Add soft delete columns if not exists
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE solicitudes ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Create notificaciones table if it doesn't exist
CREATE TABLE IF NOT EXISTS notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES usuarios(id),
  solicitud_id UUID REFERENCES solicitudes(id),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('solicitud_creada', 'solicitud_lista', 'correccion', 'info')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on notificaciones
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own notifications
CREATE POLICY IF NOT EXISTS "Users can view their own notifications"
  ON notificaciones FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications
CREATE POLICY IF NOT EXISTS "System can insert notifications"
  ON notificaciones FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY IF NOT EXISTS "Users can update their own notifications"
  ON notificaciones FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable real-time for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
