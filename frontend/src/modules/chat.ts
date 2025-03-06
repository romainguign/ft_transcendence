let socket: WebSocket | null = null;
let username = localStorage.getItem('username') || '';
let isMinimized = true;

export function initChat() {
  if (!document.getElementById('chat-widget')) {
    createChatWidget();
  }
  
  setupEventListeners();
  
  if (username && !socket) {
    connectToChat();
  }
}

function createChatWidget() {
  const chatWidget = document.createElement('div');
  chatWidget.id = 'chat-widget';
  chatWidget.className = 'chat-widget';
  chatWidget.innerHTML = `
    <div class="chat-header">
      <span class="chat-title">Chat en direct</span>
      <button class="chat-toggle">▲</button>
    </div>
    <div class="chat-body" style="display: none;">
      <div id="chat-messages" class="chat-messages"></div>
      <div class="chat-login" ${username ? 'style="display: none;"' : ''}>
        <input type="text" id="chat-username" placeholder="Votre nom" value="${username}">
        <button id="chat-connect">Connecter</button>
      </div>
      <div class="chat-input" ${!username ? 'style="display: none;"' : ''}>
        <form id="chat-form">
          <input type="text" id="chat-message" placeholder="Votre message...">
          <button type="submit">Envoyer</button>
        </form>
      </div>
    </div>
  `;
  
  document.body.appendChild(chatWidget);
  
  // Ajouter les styles CSS
  const style = document.createElement('style');
  style.textContent = `
    .chat-widget {
      position: fixed;
      bottom: 0;
      left: 0;
      width: 300px;
      background-color: #fff;
      border-top-right-radius: 8px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      z-index: 1000;
    }
    
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background-color: #4a5568;
      color: white;
      cursor: pointer;
      border-top-right-radius: 8px;
    }
    
    .chat-body {
      height: 300px;
      display: flex;
      flex-direction: column;
    }
    
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background-color: #f7fafc;
    }
    
    .chat-login, .chat-input {
      padding: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
    }
    
    .chat-login input, .chat-input input {
      flex: 1;
      padding: 8px;
      border: 1px solid #cbd5e0;
      border-radius: 4px;
    }
    
    .chat-login button, .chat-input button {
      margin-left: 8px;
      padding: 8px 12px;
      background-color: #4a5568;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .message {
      margin-bottom: 8px;
      padding: 8px;
      border-radius: 4px;
    }
    
    .system-message {
      background-color: #e2e8f0;
      font-style: italic;
    }
    
    .user-message {
      background-color: #bee3f8;
    }
    
    .username {
      font-weight: bold;
      margin-right: 5px;
    }
    
    .timestamp {
      font-size: 0.8em;
      color: #718096;
    }
  `;
  
  document.head.appendChild(style);
}

function setupEventListeners() {
  const chatHeader = document.querySelector('.chat-header');
  const chatToggle = document.querySelector('.chat-toggle');
  const chatBody = document.querySelector('.chat-body');
  const chatConnectBtn = document.getElementById('chat-connect');
  const chatForm = document.getElementById('chat-form');
  
  if (chatHeader) {
    chatHeader.addEventListener('click', (e) => {
      if (e.target !== chatToggle) {
        toggleChat();
      }
    });
  }
  
  if (chatToggle) {
    chatToggle.addEventListener('click', toggleChat);
  }
  
  if (chatConnectBtn) {
    chatConnectBtn.addEventListener('click', () => {
      const usernameInput = document.getElementById('chat-username') as HTMLInputElement;
      username = usernameInput.value.trim();
      
      if (username) {
        localStorage.setItem('username', username);
        document.querySelector('.chat-login')?.setAttribute('style', 'display: none;');
        document.querySelector('.chat-input')?.removeAttribute('style');
        connectToChat();
      }
    });
  }
  
  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const messageInput = document.getElementById('chat-message') as HTMLInputElement;
      const message = messageInput.value.trim();
      
      if (message && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ message }));
        messageInput.value = '';
      }
    });
  }
}

function toggleChat() {
  const chatBody = document.querySelector('.chat-body');
  const chatToggle = document.querySelector('.chat-toggle');
  
  if (chatBody && chatToggle) {
    isMinimized = !isMinimized;
    
    if (isMinimized) {
      chatBody.setAttribute('style', 'display: none;');
      chatToggle.textContent = '▲';
    } else {
      chatBody.removeAttribute('style');
      chatToggle.textContent = '▼';
      
      // Si l'utilisateur ouvre le chat et qu'il a un nom mais n'est pas connecté
      if (username && !socket) {
        connectToChat();
      }
    }
  }
}

function connectToChat() {
  if (socket) {
    socket.close();
  }
  
  socket = new WebSocket(`ws://${window.location.host}/ws/chat?username=${encodeURIComponent(username)}`);
  
  socket.onopen = () => {
    console.log('Connexion WebSocket établie');
    addSystemMessage('Connecté au chat');
  };
  
  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      addMessageToChat(data);
    } catch (err) {
      console.error('Erreur de parsing du message:', err);
    }
  };
  
  socket.onclose = () => {
    console.log('Connexion WebSocket fermée');
    addSystemMessage('Déconnecté du chat');
    socket = null;
  };
  
  socket.onerror = (error) => {
    console.error('Erreur WebSocket:', error);
    addSystemMessage('Erreur de connexion');
  };
}

function addSystemMessage(message: string) {
  addMessageToChat({
    type: 'system',
    message: message
  });
}

function addMessageToChat(data: any) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('message');
  
  if (data.type === 'system') {
    messageElement.classList.add('system-message');
    messageElement.textContent = data.message;
  } else {
    messageElement.classList.add('user-message');
    messageElement.innerHTML = `
      <span class="username">${data.username}</span>
      <span class="timestamp">${data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : ''}</span>
      <div class="content">${data.message}</div>
    `;
  }
  
  messagesContainer.appendChild(messageElement);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

export function cleanupChat() {
  if (socket) {
    socket.close();
    socket = null;
  }
}
