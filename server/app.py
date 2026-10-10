import os
import time
import hashlib
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
if os.path.exists(frontend_dist):
    app = Flask(__name__, static_folder=frontend_dist, static_url_path='')
else:
    app = Flask(__name__)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'onnet-secret-key-2026')

# Initialize SocketIO with CORS enabled for frontend Vite dev server or production host
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=10 * 1024 * 1024)

# In-memory storage for active rooms
rooms = {}

ANIMAL_NAMES = [
    "Falcon", "Otter", "Panda", "Lynx", "Bison", "Fox", "Heron", "Badger",
    "Osprey", "Condor", "Jaguar", "Martine", "Raven", "Beaver", "Kestrel"
]
COLOR_PALETTES = [
    "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"
]

def get_client_ip():
    """Extract public/network IP from request headers or remote_addr."""
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        ip = request.headers.get('X-Real-IP').strip()
    else:
        ip = request.remote_addr or '127.0.0.1'
    
    # Standardize local loopbacks for dev testing
    if ip in ('127.0.0.1', '::1', 'localhost'):
        ip = '192.168.1.100'  # Default dev subnet
    return ip

def get_room_id(ip_str):
    """Generate room key based on IP subnet / IP address."""
    parts = ip_str.split('.')
    if len(parts) == 4:
        subnet = f"{parts[0]}.{parts[1]}.{parts[2]}.x"
    else:
        subnet = ip_str
    
    hashed = hashlib.md5(subnet.encode('utf-8')).hexdigest()[:8]
    return f"room_{hashed}", subnet

def generate_peer_info(custom_name=None, device="desktop"):
    """Generate random display moniker if none provided."""
    if custom_name and custom_name.strip():
        name = custom_name.strip()[:24]
    else:
        animal = random.choice(ANIMAL_NAMES)
        num = random.randint(10, 99)
        name = f"{animal} #{num}"
    
    color = random.choice(COLOR_PALETTES)
    return {
        "name": name,
        "avatar_color": color,
        "device": device
    }

def clean_expired_items(history):
    """Remove items older than 24 hours (86400 seconds)."""
    now = time.time()
    return [item for item in history if now - item.get("timestamp", 0) < 86400]

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_app(path):
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, path)) and path != "":
        return send_from_directory(app.static_folder, path)
    if app.static_folder and os.path.exists(os.path.join(app.static_folder, 'index.html')):
        return send_from_directory(app.static_folder, 'index.html')
    return jsonify({
        "status": "ok",
        "app": "Onnet Signaling Server",
        "active_rooms": len(rooms)
    })

@socketio.on('connect')
def handle_connect():
    ip = get_client_ip()
    room_id, subnet_display = get_room_id(ip)
    
    # Initialize room if new
    if room_id not in rooms:
        rooms[room_id] = {
            "id": room_id,
            "name": f"Onnet Room ({subnet_display})",
            "subnet": subnet_display,
            "pin": None,
            "peers": {},
            "history": []
        }
    
    emit('connected', {
        'sid': request.sid,
        'room_id': room_id,
        'subnet': subnet_display,
        'requires_pin': rooms[room_id]['pin'] is not None
    })

@socketio.on('join_network')
def handle_join_network(data):
    data = data or {}
    sid = request.sid
    ip = get_client_ip()
    room_id, subnet_display = get_room_id(ip)
    
    custom_name = data.get('name')
    device = data.get('device', 'desktop')
    provided_pin = data.get('pin')
    
    room = rooms.get(room_id)
    if not room:
        return
    
    # Check PIN protection
    if room['pin'] and room['pin'] != provided_pin:
        emit('pin_required', {
            'room_id': room_id,
            'room_name': room['name'],
            'error': 'Incorrect PIN or PIN required.'
        })
        return
    
    peer_info = generate_peer_info(custom_name, device)
    peer_info['id'] = sid
    peer_info['joined_at'] = time.time()
    
    room['peers'][sid] = peer_info
    join_room(room_id)
    
    # Clean history older than 24h
    room['history'] = clean_expired_items(room['history'])
    
    # Emit room state to joining peer
    emit('room_joined', {
        'room_id': room_id,
        'room_name': room['name'],
        'subnet': room['subnet'],
        'has_pin': room['pin'] is not None,
        'peers': list(room['peers'].values()),
        'history': room['history'],
        'current_peer': peer_info
    })
    
    # Broadcast updated peer list to room
    emit('peers_updated', {
        'peers': list(room['peers'].values())
    }, to=room_id)

@socketio.on('update_peer_name')
def handle_update_peer_name(data):
    data = data or {}
    sid = request.sid
    new_name = data.get('name', '').strip()
    if not new_name:
        return
    
    for room in rooms.values():
        if sid in room['peers']:
            room['peers'][sid]['name'] = new_name[:24]
            emit('peers_updated', {'peers': list(room['peers'].values())}, to=room['id'])

@socketio.on('set_room_config')
def handle_set_room_config(data):
    data = data or {}
    sid = request.sid
    new_name = data.get('name')
    new_pin = data.get('pin')
    
    for room in rooms.values():
        if sid in room['peers']:
            if new_name is not None and new_name.strip():
                room['name'] = new_name.strip()[:32]
            
            if 'pin' in data:
                room['pin'] = new_pin.strip() if (new_pin and new_pin.strip()) else None
            
            emit('room_config_updated', {
                'room_name': room['name'],
                'has_pin': room['pin'] is not None
            }, to=room['id'])
            break

@socketio.on('verify_pin')
def handle_verify_pin(data):
    data = data or {}
    pin = data.get('pin', '').strip()
    ip = get_client_ip()
    room_id, _ = get_room_id(ip)
    
    room = rooms.get(room_id)
    if not room:
        emit('pin_result', {'success': False, 'error': 'Room not found'})
        return
    
    if room['pin'] == pin:
        emit('pin_result', {'success': True})
    else:
        emit('pin_result', {'success': False, 'error': 'Invalid PIN code'})

@socketio.on('send_text')
def handle_send_text(data):
    data = data or {}
    sid = request.sid
    text_content = data.get('text', '').strip()
    target_peer_id = data.get('target_peer_id')
    
    if not text_content:
        return
    
    sender_room = None
    sender_peer = None
    for room in rooms.values():
        if sid in room['peers']:
            sender_room = room
            sender_peer = room['peers'][sid]
            break
            
    if not sender_room or not sender_peer:
        return
    
    item_id = f"item_{int(time.time() * 1000)}_{random.randint(100, 999)}"
    item = {
        "id": item_id,
        "type": "text",
        "sender_id": sid,
        "sender_name": sender_peer['name'],
        "sender_color": sender_peer['avatar_color'],
        "content": text_content,
        "timestamp": time.time(),
        "seen_by": [sender_peer['name']],
        "target_peer_id": target_peer_id
    }
    
    sender_room['history'].append(item)
    if len(sender_room['history']) > 50:
        sender_room['history'].pop(0)
    
    if target_peer_id:
        emit('item_received', item, to=target_peer_id)
        emit('item_received', item, to=sid)
    else:
        emit('item_received', item, to=sender_room['id'])

@socketio.on('send_file_meta')
def handle_send_file_meta(data):
    data = data or {}
    sid = request.sid
    file_meta = data.get('file')
    target_peer_id = data.get('target_peer_id')
    
    if not file_meta:
        return
    
    sender_room = None
    sender_peer = None
    for room in rooms.values():
        if sid in room['peers']:
            sender_room = room
            sender_peer = room['peers'][sid]
            break
            
    if not sender_room or not sender_peer:
        return
    
    item_id = f"file_{int(time.time() * 1000)}_{random.randint(100, 999)}"
    item = {
        "id": item_id,
        "type": "file",
        "sender_id": sid,
        "sender_name": sender_peer['name'],
        "sender_color": sender_peer['avatar_color'],
        "content": file_meta,
        "timestamp": time.time(),
        "seen_by": [sender_peer['name']],
        "target_peer_id": target_peer_id
    }
    
    sender_room['history'].append(item)
    if len(sender_room['history']) > 50:
        sender_room['history'].pop(0)
        
    if target_peer_id:
        emit('item_received', item, to=target_peer_id)
        emit('item_received', item, to=sid)
    else:
        emit('item_received', item, to=sender_room['id'])

@socketio.on('webrtc_signal')
def handle_webrtc_signal(data):
    data = data or {}
    target_peer_id = data.get('target_peer_id')
    signal = data.get('signal')
    signal_type = data.get('type')
    file_id = data.get('file_id')
    
    if target_peer_id and signal:
        emit('webrtc_signal', {
            'sender_peer_id': request.sid,
            'signal': signal,
            'type': signal_type,
            'file_id': file_id
        }, to=target_peer_id)

@socketio.on('mark_seen')
def handle_mark_seen(data):
    data = data or {}
    sid = request.sid
    item_id = data.get('item_id')
    
    if not item_id:
        return
    
    for room in rooms.values():
        if sid in room['peers']:
            peer_name = room['peers'][sid]['name']
            for item in room['history']:
                if item['id'] == item_id:
                    if peer_name not in item['seen_by']:
                        item['seen_by'].append(peer_name)
                        emit('read_receipt_updated', {
                            'item_id': item_id,
                            'seen_by': item['seen_by']
                        }, to=room['id'])
                    break
            break

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    for room_id, room in list(rooms.items()):
        if sid in room['peers']:
            del room['peers'][sid]
            
            if len(room['peers']) == 0:
                room['history'] = []
                room['pin'] = None
                room['name'] = f"Onnet Room ({room['subnet']})"
            else:
                emit('peers_updated', {'peers': list(room['peers'].values())}, to=room_id)
            break

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"[*] Starting Onnet Socket.IO server on port {port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
