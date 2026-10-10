import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      return this.connect();
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinNetwork(name?: string, device?: string, pin?: string) {
    this.getSocket().emit('join_network', {
      name,
      device: device || (window.innerWidth < 768 ? 'mobile' : 'desktop'),
      pin,
    });
  }

  sendText(text: string, targetPeerId?: string | null) {
    this.getSocket().emit('send_text', {
      text,
      target_peer_id: targetPeerId,
    });
  }

  sendFileMeta(fileMeta: any, targetPeerId?: string | null) {
    this.getSocket().emit('send_file_meta', {
      file: fileMeta,
      target_peer_id: targetPeerId,
    });
  }

  sendWebRTCSignal(targetPeerId: string, signal: any, type: 'offer' | 'answer' | 'ice_candidate', fileId: string) {
    this.getSocket().emit('webrtc_signal', {
      target_peer_id: targetPeerId,
      signal,
      type,
      file_id: fileId,
    });
  }

  markSeen(itemId: string) {
    this.getSocket().emit('mark_seen', { item_id: itemId });
  }

  updatePeerName(name: string) {
    this.getSocket().emit('update_peer_name', { name });
  }

  setRoomConfig(name?: string, pin?: string | null) {
    this.getSocket().emit('set_room_config', { name, pin });
  }

  verifyPin(pin: string) {
    this.getSocket().emit('verify_pin', { pin });
  }
}

export const socketService = new SocketService();
