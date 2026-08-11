const mongoose = require('mongoose');
require('dotenv').config();

const Chat = require('../models/Chat');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/UniChatDataBase';

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const chats = await Chat.find().lean();
  console.log(`Found ${chats.length} chats to migrate`);

  let migratedConversations = 0;
  let migratedMessages = 0;

  for (const chat of chats) {
    const existing = await Conversation.findOne({
      type: chat.type,
      participants: { $all: chat.participants || [], $size: chat.participants ? chat.participants.length : 0 },
      channel: chat.channel || null,
      server: chat.server || null
    });

    if (existing) {
      console.log(`Skipping chat ${chat._id} — conversation already exists`);
      continue;
    }

    const conversation = await Conversation.create({
      type: chat.type,
      participants: chat.participants || [],
      channel: chat.channel || undefined,
      server: chat.server || undefined
    });

    migratedConversations++;

    if (chat.messages && chat.messages.length > 0) {
      const messages = chat.messages.map(msg => ({
        conversationId: conversation._id,
        senderId: msg.senderId,
        text: msg.text || '',
        createdAt: msg.timestamp || new Date(),
        updatedAt: msg.timestamp || new Date()
      }));

      await Message.insertMany(messages);
      migratedMessages += messages.length;

      const lastMsg = messages[messages.length - 1];
      conversation.lastMessage = lastMsg._id;
      conversation.updatedAt = lastMsg.createdAt;
      await conversation.save();
    }

    console.log(`Migrated chat ${chat._id} → conversation ${conversation._id} (${chat.messages?.length || 0} messages)`);
  }

  console.log(`\nMigration complete:`);
  console.log(`  Conversations created: ${migratedConversations}`);
  console.log(`  Messages created: ${migratedMessages}`);

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});