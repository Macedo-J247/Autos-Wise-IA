const chatMessages = document.getElementById('chat-messages');
const inputField = document.getElementById('chat-input-text');
const sendButton = document.getElementById('send-button');
const historyList = document.getElementById('history-items');
const sidebar = document.getElementById('esquerda');
const toggleBtn = document.getElementById('toggle-btn');
const imageUpload = document.getElementById('image-upload');

// Sua chave de API e endpoint para o modelo 2.0 Flash
const API_KEY = 'Chavinha_vai_aqui';  // <-- Substitua aqui pela sua chave!
const API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Variável para armazenar a imagem selecionada em Base64
let imageBase64 = null;

// --------------------------------------------------
// Funções de Histórico e LocalStorage
// --------------------------------------------------

window.onload = () => {
    chatMessages.innerHTML = '';
    // AQUI: Cria uma nova sessão vazia no localStorage ao carregar a página
    let allSessions = JSON.parse(localStorage.getItem('allChatSessions')) || [];
    allSessions.push([]);
    localStorage.setItem('allChatSessions', JSON.stringify(allSessions));

    addMessageToChat("Olá! Eu sou o seu assistente automotivo. Você pode me enviar uma imagem para análise.", 'bot', false);
};

function saveMessage(text, sender, isImage = false) {
    let allSessions = JSON.parse(localStorage.getItem('allChatSessions')) || [];
    
    // AQUI: Pega a última sessão no array e adiciona a nova mensagem a ela
    const currentSession = allSessions[allSessions.length - 1];
    currentSession.push({ text, sender, isImage });
    
    localStorage.setItem('allChatSessions', JSON.stringify(allSessions));
}

function loadSession(index) {
    const allSessions = JSON.parse(localStorage.getItem('allChatSessions')) || [];
    const sessionToLoad = allSessions[index];

    if (sessionToLoad) {
        chatMessages.innerHTML = ''; // Limpa o chat atual
        sessionToLoad.forEach(msg => addMessageToChat(msg.text, msg.sender, false, msg.isImage));
        
        // AQUI: Adiciona a rolagem para o final da conversa
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

function displayChatHistory() {
    historyList.innerHTML = '';
    const allSessions = JSON.parse(localStorage.getItem('allChatSessions')) || [];
    allSessions.forEach((session, index) => {
        if (session.length > 0) {
            const firstMessage = session[0].text.substring(0, 30) + '...';
            const listItem = document.createElement('li');
            listItem.innerText = `Sessão ${index + 1}: ${firstMessage}`;
            listItem.onclick = () => loadSession(index);
            historyList.appendChild(listItem);
        }
    });
}

// --------------------------------------------------
// Funções do Chatbot, API e Imagem
// --------------------------------------------------

function addMessageToChat(content, sender = 'user', save = true, isImage = false) {
    const message = document.createElement('div');
    message.className = `message ${sender}`;
    
    if (isImage) {
        const img = document.createElement('img');
        img.src = content;
        img.alt = "Imagem do usuário";
        img.style.maxWidth = "200px";
        img.style.borderRadius = "10px";
        message.appendChild(img);
    } else {
        message.innerHTML = content;
    }
    
    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (save) saveMessage(isImage ? content : content, sender, isImage);
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

async function sendMessageToAPI(text, image) {
    try {
        const parts = [];
        if (text) {
            parts.push({ text: `Você é um assistente especializado em informações automotivas. Analise a imagem fornecida (se houver) e responda com base nela e na pergunta do usuário. Só responda perguntas dentro desse tema. Use formatação em negrito para destacar termos-chave. Pergunta do usuário: ${text}` });
        }
        if (image) {
            parts.push({
                inline_data: {
                    mime_type: 'image/jpeg', // Mudar se o tipo de arquivo for diferente
                    data: image
                }
            });
        }

        const response = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: parts
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${errorData.error.message}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error(error);
        return '[Erro ao acessar o servidor. Tente novamente em instantes.]';
    }
}

// Processa o envio da mensagem e/ou imagem
async function handleSend() {
    const userInput = inputField.value.trim();
    if (!userInput && !imageBase64) return;

    // Adiciona a imagem ao chat antes de enviar
    if (imageBase64) {
        addMessageToChat(`data:image/jpeg;base64,${imageBase64}`, 'user', true, true);
    }
    // Adiciona o texto ao chat antes de enviar
    if (userInput) {
        addMessageToChat(userInput, 'user');
    }

    // Limpa a caixa de texto
    inputField.value = '';

    const reply = await sendMessageToAPI(userInput, imageBase64);
    addMessageToChat(reply, 'bot');
    
    // Limpa a imagem e o campo de upload após o envio
    imageBase64 = null;
    imageUpload.value = '';

    // AQUI: Resetamos o placeholder para sua mensagem original.
    inputField.placeholder = 'Digite sua pergunta...';
}

// --------------------------------------------------
// Eventos e Interações
// --------------------------------------------------

sendButton.addEventListener('click', handleSend);
inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
});

imageUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        try {
            imageBase64 = await getBase64(file);
            // AQUI: Atualizamos o placeholder quando a imagem é carregada.
            inputField.placeholder = 'Imagem carregada. Digite sua pergunta...';
        } catch (error) {
            console.error("Erro ao carregar a imagem:", error);
            imageBase64 = null;
            inputField.placeholder = 'Digite sua pergunta...'; // Em caso de erro, resetar
        }
    }
});

toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    if (sidebar.classList.contains('collapsed')) {
        toggleBtn.innerHTML = '<span class="material-icons">menu</span>';
    } else {
        toggleBtn.innerHTML = 'Histórico';
        displayChatHistory();
    }
});