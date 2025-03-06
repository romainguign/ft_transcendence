// backend/src/routes/chat.ts
import { FastifyInstance } from "fastify";

interface ChatMessage {
  type: 'message' | 'system';
  username?: string;
  message: string;
  timestamp?: string;
}

// Stockage des connexions actives
const connections = new Map();

export default async function chatRoutes(fastify: FastifyInstance) {
  // Route WebSocket pour le chat
  fastify.get('/ws/chat', { websocket: true }, (connection, req) => {
    const socket = connection;
    const clientId = req.headers['sec-websocket-key'] || Math.random().toString(36).substring(2);
    
    // Stocker la connexion
    connections.set(clientId, {
      socket,
      username: (req.query as { username?: string }).username || 'Anonyme'
    });
    
    //Envoyer un message de bienvenue
    socket.send(JSON.stringify({
      type: 'system',
      message: 'Bienvenue sur le chat!'
    }));
    
    // Gérer les messages reçus
    socket.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Diffuser le message à tous les clients
        broadcast({
          type: 'message',
          username: connections.get(clientId).username,
          message: data.message,
          timestamp: new Date().toISOString()
        });
        
      } catch (err) {
        fastify.log.error('Erreur de parsing du message:', err);
      }
    });
    
    // Gérer la déconnexion
    socket.on('close', () => {
      fastify.log.info(`Client déconnecté: ${clientId}`);
      
      // Informer les autres clients de la déconnexion
      broadcast({
        type: 'system',
        message: `${connections.get(clientId)?.username || 'Un utilisateur'} a quitté le chat.`
      });
      
      connections.delete(clientId);
    });
  });
  
  // Fonction pour diffuser un message à tous les clients
  function broadcast(message: ChatMessage) {
    const messageStr = JSON.stringify(message);
    for (const [clientId, client] of connections.entries()) {
      if (client.socket.readyState === 1) { // WebSocket.OPEN
        client.socket.send(messageStr);
      }
    }
  }
}
