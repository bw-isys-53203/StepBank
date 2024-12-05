/**
 * @fileoverview Message Management System
 * Handles all messaging functionality between parents and children in the application.
 * Manages message storage, retrieval, and real-time updates of conversations.
 * Provides interfaces for sending, receiving, and displaying messages with proper
 * user context and contact management.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Message passing between users.
 * 
 */

/**
 * MessageManager class handles all messaging functionality including storage,
 * display, and user interactions for the messaging system.
 */
class MessageManager {
    /**
     * Initializes a new MessageManager instance with default empty states
     * for current user, messages, and contacts. Sets up local storage key
     * for persistent message storage.
     */
    constructor() {
        this.currentUser = null;
        this.selectedRecipient = null;
        this.messages = [];
        this.contacts = [];
        this.storageKey = 'localMessages';
    }

    /**
     * Initializes the message manager with user context and loads necessary data.
     * Sets up the messaging environment for the current user session.
     * 
     * @param {Object} user - The currently logged-in user object
     */
    async initialize(user) {
        this.currentUser = user;
        this.loadContacts();
        this.loadMessages();
        this.renderMessages();
    }

    /**
     * Loads appropriate contacts based on user type (parent/child).
     * For parents: loads all registered children as contacts
     * For children: loads only the parent as a contact
     */
    loadContacts() {
        // Parent users see all their registered children as contacts
        if (this.currentUser.accountType === 'parent') {
            // Retrieve children data from dashboard manager for consistency
            const dashboardChildren = window.dashboardManager.children;
            console.log('Loading contacts from dashboard children:', dashboardChildren);
            
            // Filter for only registered children and map to contact format
            this.contacts = dashboardChildren
                .filter(child => child.isRegistered)
                .map(child => ({
                    id: child.id,
                    name: child.username
                }));
            
            console.log('Loaded parent contacts:', this.contacts);
        } else {
            // Child users only see their parent as a contact
            this.contacts = [{
                id: this.currentUser.parentId,
                name: 'Parent'
            }];
        }
    }

    /**
     * Loads messages for the current conversation from local storage.
     * Filters messages to show only those between current user and selected recipient.
     * Returns empty array if no recipient is selected.
     */
    loadMessages() {
        // Exit early if no recipient selected
        if (!this.selectedRecipient) {
            this.messages = [];
            return;
        }
    
        // Retrieve all messages from local storage
        const allMessages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        console.log('All messages from storage:', allMessages);
        
        // Filter for messages between current user and selected recipient
        // Sort by timestamp to maintain chronological order
        this.messages = allMessages.filter(msg => 
            (msg.senderId === this.currentUser.userId && msg.recipientId === this.selectedRecipient) ||
            (msg.senderId === this.selectedRecipient && msg.recipientId === this.currentUser.userId)
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        console.log('Filtered messages for current conversation:', this.messages);
    }

    /**
     * Sends a new message to the selected recipient and updates storage.
     * Handles message creation, storage, and UI updates after sending.
     * 
     * @param {string} content - The message content to be sent
     */
    async sendMessage(content) {
        // Validate message content and recipient
        if (!content.trim() || !this.selectedRecipient) return;

        // Create new message object with metadata
        const message = {
            senderId: this.currentUser.userId,
            recipientId: this.selectedRecipient,
            content: content.trim(),
            timestamp: Date.now()
        };

        // Update local storage with new message
        const allMessages = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        allMessages.push(message);
        localStorage.setItem(this.storageKey, JSON.stringify(allMessages));

        // Reset input field after sending
        const inputField = document.getElementById('messageText');
        if (inputField) {
            inputField.value = '';
        }

        // Refresh message display
        this.loadMessages();
        this.renderMessages();
    }

    /**
     * Handles recipient selection change event.
     * Updates selected recipient and refreshes message display.
     * 
     * @param {string} recipientId - ID of the newly selected recipient
     */
    handleRecipientChange(recipientId) {
        this.selectedRecipient = recipientId;
        this.loadMessages();
        this.renderMessages();
    }

    /**
     * Renders the complete messaging interface including navigation,
     * recipient selector, message history, and input field.
     * Automatically scrolls to the latest message after rendering.
     */
    renderMessages() {
        const container = document.getElementById('messages');
        
        // Generate complete messaging interface HTML
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

        // Ensure latest messages are visible
        const messagesList = container.querySelector('.messages-list');
        messagesList.scrollTop = messagesList.scrollHeight;
    }
}