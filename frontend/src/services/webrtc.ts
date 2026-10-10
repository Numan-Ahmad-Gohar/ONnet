import type { TransferProgress } from '../types';
import { socketService } from './socket';

const CHUNK_SIZE = 64 * 1024; // 64 KB per WebRTC data chunk
const HIGH_WATER_MARK = 1024 * 1024; // 1 MB buffer threshold
const LOW_WATER_MARK = 256 * 1024; // 256 KB resume threshold

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export type ProgressCallback = (progress: TransferProgress) => void;

class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private incomingBuffers: Map<string, { chunks: ArrayBuffer[]; receivedBytes: number; meta: any; startTime: number }> = new Map();
  private progressCallbacks: Map<string, ProgressCallback> = new Map();

  registerProgressCallback(fileId: string, callback: ProgressCallback) {
    this.progressCallbacks.set(fileId, callback);
  }

  unregisterProgressCallback(fileId: string) {
    this.progressCallbacks.delete(fileId);
  }

  private notifyProgress(progress: TransferProgress) {
    const callback = this.progressCallbacks.get(progress.file_id);
    if (callback) {
      callback(progress);
    }
  }

  // Handle incoming signaling messages from Socket.IO
  handleSignal(data: { sender_peer_id: string; signal: any; type: string; file_id: string }) {
    const { sender_peer_id, signal, type, file_id } = data;

    if (type === 'offer') {
      this.handleOffer(sender_peer_id, file_id, signal);
    } else if (type === 'answer') {
      this.handleAnswer(file_id, signal);
    } else if (type === 'ice_candidate') {
      this.handleIceCandidate(file_id, signal);
    }
  }

  // Receiver initiates file download request by connecting to Sender
  async requestFileDownload(fileMeta: { file_id: string; name: string; size: number; type: string }, senderPeerId: string, onProgress: ProgressCallback) {
    const { file_id } = fileMeta;
    this.registerProgressCallback(file_id, onProgress);

    this.notifyProgress({
      file_id,
      name: fileMeta.name,
      size: fileMeta.size,
      bytesTransferred: 0,
      progress: 0,
      speed: 0,
      status: 'connecting',
      isSender: false
    });

    // Receiver creates peer connection and sends offer to Sender
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(file_id, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendWebRTCSignal(senderPeerId, event.candidate, 'ice_candidate', file_id);
      }
    };

    // Prepare buffer for incoming file
    this.incomingBuffers.set(file_id, {
      chunks: [],
      receivedBytes: 0,
      meta: fileMeta,
      startTime: Date.now()
    });

    pc.ondatachannel = (event) => {
      const dc = event.channel;
      this.dataChannels.set(file_id, dc);
      this.setupReceiverDataChannel(dc, fileMeta, file_id);
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketService.sendWebRTCSignal(senderPeerId, offer, 'offer', file_id);
  }

  // Sender receives offer from Receiver
  private async handleOffer(receiverPeerId: string, fileId: string, offer: RTCSessionDescriptionInit) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(fileId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.sendWebRTCSignal(receiverPeerId, event.candidate, 'ice_candidate', fileId);
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Sender creates data channel
    const dc = pc.createDataChannel(`file-channel-${fileId}`, {
      ordered: true
    });
    this.dataChannels.set(fileId, dc);

    dc.onopen = () => {
      // Data channel is open, sender is ready to stream file when requested
    };

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketService.sendWebRTCSignal(receiverPeerId, answer, 'answer', fileId);
  }

  private async handleAnswer(fileId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(fileId);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  private async handleIceCandidate(fileId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(fileId);
    if (pc && pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn('ICE Candidate error', e));
    }
  }

  // Sender streams file content to Receiver over data channel
  async sendFile(file: File, fileId: string, _targetPeerId: string | null, onProgress: ProgressCallback) {

    this.registerProgressCallback(fileId, onProgress);

    const dc = this.dataChannels.get(fileId);
    if (!dc || dc.readyState !== 'open') {
      // If data channel isn't created yet by answer/offer, retry shortly
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const chan = this.dataChannels.get(fileId);
        if (chan && chan.readyState === 'open') {
          clearInterval(checkInterval);
          this.executeFileTransfer(file, fileId, chan);
        } else if (attempts > 30) { // 15 seconds timeout
          clearInterval(checkInterval);
          this.notifyProgress({
            file_id: fileId,
            name: file.name,
            size: file.size,
            bytesTransferred: 0,
            progress: 0,
            speed: 0,
            status: 'failed',
            isSender: true,
            error: 'Connection timeout'
          });
        }
      }, 500);
      return;
    }

    this.executeFileTransfer(file, fileId, dc);
  }

  private async executeFileTransfer(file: File, fileId: string, dc: RTCDataChannel) {
    let offset = 0;
    const totalSize = file.size;
    const startTime = Date.now();
    dc.bufferedAmountLowThreshold = LOW_WATER_MARK;

    this.notifyProgress({
      file_id: fileId,
      name: file.name,
      size: totalSize,
      bytesTransferred: 0,
      progress: 0,
      speed: 0,
      status: 'transferring',
      isSender: true
    });

    const sendChunks = async () => {
      while (offset < totalSize && dc.readyState === 'open') {
        if (dc.bufferedAmount > HIGH_WATER_MARK) {
          // Pause sending until buffer empties
          dc.onbufferedamountlow = () => {
            dc.onbufferedamountlow = null;
            sendChunks();
          };
          return;
        }

        const slice = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await slice.arrayBuffer();
        dc.send(buffer);

        offset += buffer.byteLength;
        const elapsed = (Date.now() - startTime) / 1000 || 0.001;
        const speed = offset / elapsed;
        const progressPercent = Math.min(100, Math.round((offset / totalSize) * 100));

        this.notifyProgress({
          file_id: fileId,
          name: file.name,
          size: totalSize,
          bytesTransferred: offset,
          progress: progressPercent,
          speed,
          status: offset >= totalSize ? 'completed' : 'transferring',
          isSender: true
        });

        if (offset >= totalSize) {
          // Transfer finished
          setTimeout(() => this.closeConnection(fileId), 2000);
          break;
        }
      }
    };

    sendChunks();
  }

  private setupReceiverDataChannel(dc: RTCDataChannel, fileMeta: any, fileId: string) {
    dc.binaryType = 'arraybuffer';

    dc.onmessage = (event) => {
      const bufferState = this.incomingBuffers.get(fileId);
      if (!bufferState) return;

      const chunk = event.data as ArrayBuffer;
      bufferState.chunks.push(chunk);
      bufferState.receivedBytes += chunk.byteLength;

      const totalSize = fileMeta.size;
      const elapsed = (Date.now() - bufferState.startTime) / 1000 || 0.001;
      const speed = bufferState.receivedBytes / elapsed;
      const progressPercent = Math.min(100, Math.round((bufferState.receivedBytes / totalSize) * 100));

      if (bufferState.receivedBytes >= totalSize) {
        // File transfer completed! Assemble Blob and create download link
        const blob = new Blob(bufferState.chunks, { type: fileMeta.type || 'application/octet-stream' });
        const blobUrl = URL.createObjectURL(blob);

        this.notifyProgress({
          file_id: fileId,
          name: fileMeta.name,
          size: totalSize,
          bytesTransferred: totalSize,
          progress: 100,
          speed: 0,
          status: 'completed',
          isSender: false,
          blobUrl
        });

        // Auto trigger download for recipient
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileMeta.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        this.closeConnection(fileId);
      } else {
        this.notifyProgress({
          file_id: fileId,
          name: fileMeta.name,
          size: totalSize,
          bytesTransferred: bufferState.receivedBytes,
          progress: progressPercent,
          speed,
          status: 'transferring',
          isSender: false
        });
      }
    };

    dc.onerror = () => {
      this.notifyProgress({
        file_id: fileId,
        name: fileMeta.name,
        size: fileMeta.size,
        bytesTransferred: 0,
        progress: 0,
        speed: 0,
        status: 'failed',
        isSender: false,
        error: 'DataChannel error occurred'
      });
    };
  }

  cancelTransfer(fileId: string) {
    this.notifyProgress({
      file_id: fileId,
      name: '',
      size: 0,
      bytesTransferred: 0,
      progress: 0,
      speed: 0,
      status: 'cancelled',
      isSender: false
    });
    this.closeConnection(fileId);
  }

  private closeConnection(fileId: string) {
    const dc = this.dataChannels.get(fileId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(fileId);
    }
    const pc = this.peerConnections.get(fileId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(fileId);
    }
    this.incomingBuffers.delete(fileId);
  }
}

export const webrtcManager = new WebRTCManager();
