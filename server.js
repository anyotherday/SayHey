const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const next = require('next');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {polling: true});

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('chat message', async (msgObj) => {
      console.log('Received chat message:', msgObj);
      // Save message to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert({ user_id: socket.id, message: msgObj.text, is_from_admin: false });

      if (error) console.error('Error saving message:', error);

      // Send message to Telegram
      bot.sendMessage(process.env.TELEGRAM_CHAT_ID, `New message: ${msgObj.text}`);
    });

    socket.on('typing', () => {
      console.log('User is typing');
      // Send typing notification to Telegram
      bot.sendMessage(process.env.TELEGRAM_CHAT_ID, "User is typing...");
    });

    socket.on('stop typing', () => {
      console.log('User stopped typing');
      // Send stop typing notification to Telegram
      bot.sendMessage(process.env.TELEGRAM_CHAT_ID, "User stopped typing.");
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    console.log('Received message from Telegram:', messageText);

    // Simulate typing indicator for Telegram messages
    io.emit('typing');

    // Wait for a short period to simulate typing
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Stop typing and send the message
    io.emit('stop typing');

    // Save admin message to Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: 'admin', message: messageText, is_from_admin: true });

    if (error) console.error('Error saving admin message:', error);

    // Broadcast admin message to all connected clients
    io.emit('admin message', messageText);
  });

  app.use((req, res, next) => {
    const csp = process.env.NODE_ENV === 'production'
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com";
    
    res.setHeader('Content-Security-Policy', csp);
    next();
  });

  // Handle Next.js requests
  app.all('*', (req, res) => {
    return nextHandler(req, res);
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});