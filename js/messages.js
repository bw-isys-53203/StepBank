// messages.js
class MessageManager {
    constructor() {
        this.currentUser = null;
        this.selectedRecipient = null;
        this.messages = [];
        this.contacts = [];
        this.storageKey = 'localMessages';
    }

    async initialize(user) {
        this.currentUser = user;
        this.loadContacts();
        this.loadMessages();
        this.renderMessages();
    }

    loadContacts() {
        if (this.currentUser.accountType === 'parent') {
            // Use the children array that's already loaded in dashboardManager
            const dashboardChildren = window.dashboardManager.children;
            console.log('Loading contacts from dashboard children:', dashboardChildren);
            
            this.contacts = dashboardChildren
                .filter(child => child.isRegistered)
                .map(child => ({
                    id: child.id,
                    name: child.username
                }));
            
            console.log('Loaded parent contacts:', this.contacts);
        } else {
            // For child, keep using the existing logic
            this.contacts = [{
                id: this.currentUser.parentId,
                name: 'Parent'
            }];
        }
    }

    
    loadMessages() {
        if (!this.selectedRecipient) {
            this.messages = [];
            return;
        }
    
        // Get all messages from localStorage
        const allMessages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        console.log('All messages from storage:', allMessages);
        
        // Filter messages between current user and selected recipient
        this.messages = allMessages.filter(msg => 
            (msg.senderId === this.currentUser.userId && msg.recipientId === this.selectedRecipient) ||
            (msg.senderId === this.selectedRecipient && msg.recipientId === this.currentUser.userId)
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('Filtered messages for current conversation:', this.messages);
    }

    async sendMessage(content) {
        if (!content.trim() || !this.selectedRecipient) return;

        // Create new message
        const message = {
            senderId: this.currentUser.userId,
            recipientId: this.selectedRecipient,
            content: content.trim(),
            timestamp: Date.now()
        };

        // Get existing messages
        const allMessages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        
        // Add new message
        allMessages.push(message);
        
        // Save back to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(allMessages));

        // Clear input field
        const inputField = document.getElementById('messageText');
        if (inputField) {
            inputField.value = '';
        }

        // Reload and render messages
        this.loadMessages();
        this.renderMessages();
    }

    handleRecipientChange(recipientId) {
        this.selectedRecipient = recipientId;
        this.loadMessages();
        this.renderMessages();
    }

    renderMessages() {
        const container = document.getElementById('messages');
        
        const html = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Messages</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="messages-container">
                <div class="recipient-selector">
                    <select class="recipient-select" onchange="window.messageManager.handleRecipientChange(this.value)">
                        <option value="">Select contact...</option>
                        ${this.contacts.map(contact => `
                            <option value="${contact.id}" ${contact.id === this.selectedRecipient ? 'selected' : ''}>
                                ${contact.name}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="messages-list">
                    ${this.messages.map(message => `
                        <div class="message ${message.senderId === this.currentUser.userId ? 'sent' : 'received'}">
                            <div class="message-content">${message.content}</div>
                            <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="message-input">
                    <input type="text" id="messageText" placeholder="Type a message..." 
                           onkeypress="if(event.key === 'Enter') { window.messageManager.sendMessage(this.value); }">
                    <button class="send-btn" onclick="window.messageManager.sendMessage(document.getElementById('messageText').value)">
                        Send
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Scroll to bottom of messages
        const messagesList = container.querySelector('.messages-list');
        messagesList.scrollTop = messagesList.scrollHeight;
    }
}