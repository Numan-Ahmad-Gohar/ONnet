import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PeerGrid } from './components/PeerGrid';
import { DropZone } from './components/DropZone';
import { HistoryFeed } from './components/HistoryFeed';
import { PinModal } from './components/PinModal';
import { NameModal } from './components/NameModal';
import { TextModal } from './components/TextModal';
import { PinGateScreen } from './components/PinGateScreen';
import type { Peer, RoomState, SharedItem, SharedFileMeta, TransferProgress } from './types';
import { socketService } from './services/socket';
import { webrtcManager } from './services/webrtc';

export function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [history, setHistory] = useState<SharedItem[]>([]);
  const [currentPeer, setCurrentPeer] = useState<Peer | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const [transfers, setTransfers] = useState<TransferProgress[]>([]);

  // Modals state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [selectedTextSnippet, setSelectedTextSnippet] = useState<string | null>(null);
  
  // PIN Gate screen state
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [lockedRoomName, setLockedRoomName] = useState('Onnet Room');

  useEffect(() => {
    const socket = socketService.connect();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('connected', (data: { room_id: string; subnet: string; requires_pin: boolean }) => {
      if (data.requires_pin) {
        setIsPinLocked(true);
      } else {
        socketService.joinNetwork();
      }
    });

    socket.on('pin_required', (data: { room_name: string }) => {
      setIsPinLocked(true);
      setLockedRoomName(data.room_name);
    });

    socket.on('room_joined', (data: {
      room_name: string;
      subnet: string;
      has_pin: boolean;
      peers: Peer[];
      history: SharedItem[];
      current_peer: Peer;
      room_id: string;
    }) => {
      setIsPinLocked(false);
      setRoomState({
        room_id: data.room_id,
        room_name: data.room_name,
        subnet: data.subnet,
        has_pin: data.has_pin,
      });
      setPeers(data.peers);
      setHistory(data.history);
      setCurrentPeer(data.current_peer);
    });

    socket.on('peers_updated', (data: { peers: Peer[] }) => {
      setPeers(data.peers);
    });

    socket.on('room_config_updated', (data: { room_name: string; has_pin: boolean }) => {
      setRoomState((prev) => prev ? { ...prev, room_name: data.room_name, has_pin: data.has_pin } : null);
    });

    socket.on('item_received', (item: SharedItem) => {
      setHistory((prev) => [item, ...prev.slice(0, 49)]);
    });

    socket.on('read_receipt_updated', (data: { item_id: string; seen_by: string[] }) => {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === data.item_id ? { ...item, seen_by: data.seen_by } : item
        )
      );
    });

    socket.on('webrtc_signal', (data: any) => {
      webrtcManager.handleSignal(data);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleUpdateTransfer = (progress: TransferProgress) => {
    setTransfers((prev) => {
      const idx = prev.findIndex((t) => t.file_id === progress.file_id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = progress;
        return next;
      }
      return [progress, ...prev];
    });
  };

  const handleSendText = (text: string) => {
    socketService.sendText(text, selectedTargetId);
  };

  const handleSendFile = (file: File) => {
    const fileId = `file_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fileMeta: SharedFileMeta = {
      file_id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
    };

    socketService.sendFileMeta(fileMeta, selectedTargetId);

    if (selectedTargetId) {
      webrtcManager.sendFile(file, fileId, selectedTargetId, handleUpdateTransfer);
    }
  };

  const handleDownloadFile = (fileMeta: SharedFileMeta, senderId: string) => {
    webrtcManager.requestFileDownload(fileMeta, senderId, handleUpdateTransfer);
  };

  const handleCancelTransfer = (fileId: string) => {
    webrtcManager.cancelTransfer(fileId);
    setTransfers((prev) => prev.filter((t) => t.file_id !== fileId));
  };

  const selectedTargetPeer = peers.find((p) => p.id === selectedTargetId) || null;

  if (isPinLocked) {
    return (
      <PinGateScreen
        roomName={lockedRoomName}
        onSuccess={(pin) => {
          setIsPinLocked(false);
          socketService.joinNetwork(undefined, undefined, pin);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#141619] text-[#eceff4]">
      {/* Top Header Control Panel */}
      <Header
        isConnected={isConnected}
        roomState={roomState}
        currentPeer={currentPeer}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        onOpenNameModal={() => setIsNameModalOpen(true)}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Left Column: Spatial Peer Presence Mesh */}
          <div className="lg:col-span-3">
            <PeerGrid
              peers={peers}
              currentPeerId={currentPeer?.id || null}
              selectedTargetId={selectedTargetId}
              onSelectTarget={(id) => setSelectedTargetId(id)}
            />
          </div>

          {/* Center Column: The Drop Receiver Station */}
          <div className="lg:col-span-5">
            <DropZone
              selectedTarget={selectedTargetPeer}
              transfers={transfers}
              onSendText={handleSendText}
              onSendFile={handleSendFile}
              onCancelTransfer={handleCancelTransfer}
            />
          </div>

          {/* Right Column: History Feed & Read Receipts Stream */}
          <div className="lg:col-span-4">
            <HistoryFeed
              history={history}
              currentPeerName={currentPeer?.name}
              currentPeerId={currentPeer?.id}
              onDownloadFile={handleDownloadFile}
              onViewText={(text) => setSelectedTextSnippet(text)}
            />
          </div>

        </div>
      </main>

      {/* Interactive Modals */}
      <PinModal
        isOpen={isPinModalOpen}
        hasPin={roomState?.has_pin || false}
        onClose={() => setIsPinModalOpen(false)}
      />

      <NameModal
        isOpen={isNameModalOpen}
        currentName={currentPeer?.name || ''}
        onClose={() => setIsNameModalOpen(false)}
      />

      <TextModal
        text={selectedTextSnippet}
        onClose={() => setSelectedTextSnippet(null)}
      />
    </div>
  );
}

export default App;
