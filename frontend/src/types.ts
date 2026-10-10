export interface Peer {
  id: string;
  name: string;
  avatar_color: string;
  device: 'desktop' | 'mobile' | 'tablet';
  joined_at: number;
}

export interface SharedFileMeta {
  file_id: string;
  name: string;
  size: number;
  type: string;
  inline_data?: string; // Optional base64 for small text/files
}

export interface SharedItem {
  id: string;
  type: 'text' | 'file';
  sender_id: string;
  sender_name: string;
  sender_color: string;
  content: string | SharedFileMeta;
  timestamp: number;
  seen_by: string[];
  target_peer_id?: string | null;
}

export interface TransferProgress {
  file_id: string;
  name: string;
  size: number;
  bytesTransferred: number;
  progress: number; // 0 to 100
  speed: number; // bytes per second
  status: 'connecting' | 'transferring' | 'completed' | 'failed' | 'cancelled';
  isSender: boolean;
  blobUrl?: string;
  error?: string;
}

export interface RoomState {
  room_id: string;
  room_name: string;
  subnet: string;
  has_pin: boolean;
  requires_pin?: boolean;
}
