const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 9091 });

console.log("WebSocket server is running on ws://localhost:9091");

const messages = []; // { id: 1, text: "Hello", sender: "user123", timestamp: 12345 }
let nextMessageId = 1;

const clients = new Map(); 
// userId => { socket, lastMessageId }



wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (data) => {
    const msg = JSON.parse(data);

    if (msg.type === 'connect') {
      // Initial handshake with userId and last received message id
      userId = msg.userId || uuidv4();
      const lastSeen = msg.lastMessageId || 0;

      clients.set(userId, { socket: ws, lastMessageId: lastSeen });

      // Send missed messages
      const missed = messages.filter(m => m.id > lastSeen);
      missed.forEach(m => ws.send(JSON.stringify({ type: 'message', ...m })));

      // Confirm connection
      ws.send(JSON.stringify({ type: 'connected', userId }));
    }

    if (msg.type === 'ping') {
 
        //could do something here
        console.log("Ping received");

        }

    if (msg.type === 'message') {
      const message = {
        id: nextMessageId++,
        text: msg.text,
        sender: userId,
        timestamp: Date.now(),
      };
      messages.push(message);

      // Broadcast to all connected users
      for (const [uid, client] of clients) {
        try {
          client.socket.send(JSON.stringify({ type: 'message', ...message }));
          client.lastMessageId = message.id;
        } catch (e) {
          console.log(`Error sending to ${uid}:`, e.message);
        }
      }
    }
  });

  ws.on('close', () => {
    if (userId) {
      clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  });
});
