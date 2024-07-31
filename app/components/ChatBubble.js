'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import styles from './ChatBubble.module.css';

// Debounce function
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const ChatBubble = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const greetings = ["What's up?", "Howsit?", "Hey there!", "Hi!", "Hello!", "Yo!"];
  const [greeting] = useState(greetings[Math.floor(Math.random() * greetings.length)]);

  useEffect(() => {
    const newSocket = io('http://localhost:3000', {
      path: '/socket.io',
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('chat message', (msg) => {
      console.log('Received chat message:', msg);
      setMessages((prevMessages) => {
        if (!prevMessages.some(m => m.id === msg.id)) {
          return [...prevMessages, { id: msg.id, text: msg.text, isAdmin: true }];
        }
        return prevMessages;
      });
    });

    newSocket.on('admin message', (msg) => {
      console.log('Received admin message:', msg);
      setIsTyping(false);
      setMessages((prevMessages) => [...prevMessages, { id: Date.now(), text: msg, isAdmin: true }]);
    });

    newSocket.on('typing', () => {
      console.log('Admin is typing');
      setIsTyping(true);
    });

    newSocket.on('stop typing', () => {
      console.log('Admin stopped typing');
      setIsTyping(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && socket) {
      const messageId = Date.now();
      socket.emit('chat message', { id: messageId, text: inputMessage });
      setMessages((prevMessages) => [...prevMessages, { id: messageId, text: inputMessage, isAdmin: false }]);
      setInputMessage('');
      socket.emit('stop typing');
    }
  };

  // Debounced emitTyping function
  const debouncedEmitTyping = useCallback(
    debounce((socket) => {
      console.log('Emitting typing event');
      socket.emit('typing');
    }, 300),
    []
  );

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    if (socket) {
      debouncedEmitTyping(socket);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        console.log('Emitting stop typing event');
        socket.emit('stop typing');
      }, 1000);
    }
  };

  console.log('Current isTyping state:', isTyping);

  return (
    <div className={styles.chatWidget}>
      <div className={styles.chatHeader}>Chat</div>
      <div className={styles.chatArea}>
        <div className={`${styles.chatBubble} ${styles.received}`}>
          {greeting}
        </div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.chatBubble} ${msg.isAdmin ? styles.received : styles.sent}`}
          >
            {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className={`${styles.chatBubble} ${styles.received} ${styles.typingIndicator}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputArea}>
        <input
          type="text"
          value={inputMessage}
          onChange={handleInputChange}
          placeholder="iMessage"
        />
        <button 
          type="submit" 
          disabled={!inputMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBubble;