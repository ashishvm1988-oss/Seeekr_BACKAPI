const { table_names } = require('#src/globals/constants');
const db = require('#src/helpers/db');

class MessageHandler {
  // List of conversations for the logged-in user: one row per other
  // participant, with their last message and an unread flag — this is what
  // backs the Chat tab's conversation list, not the raw message table.
  static async list_conversations(request) {
    try {
      const myId = request.user.id;

      const messages = await db(table_names.messages)
        .where({ sender_id: myId })
        .orWhere({ receiver_id: myId })
        .andWhere({ deleted: false })
        .orderBy('created', 'desc');

      const conversations = new Map();
      for (const m of messages) {
        const otherId = m.sender_id === myId ? m.receiver_id : m.sender_id;
        if (!conversations.has(otherId)) {
          conversations.set(otherId, {
            other_user_id: otherId,
            last_message: m.message,
            last_message_at: m.created,
            unread: m.receiver_id === myId && !m.read_at
          });
        }
      }

      const otherIds = [...conversations.keys()];
      if (!otherIds.length) {
        return { data: [] };
      }

      const users = await db(table_names.users)
        .select('id', 'username', 'role')
        .whereIn('id', otherIds);
      const userById = Object.fromEntries(users.map(u => [u.id, u]));

      const data = otherIds
        .map(id => ({ ...conversations.get(id), user: userById[id] }))
        .filter(c => c.user) // drop conversations with a deleted account
        .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

      return { data };
    } catch (error) {
      console.error('messages.list_conversations: ', error);
      return { error };
    }
  }

  // A single thread between the logged-in user and `other_user_id`.
  static async thread(request) {
    try {
      const myId = request.user.id;
      const otherId = request.query?.other_user_id;
      if (!otherId) {
        return { message: 'other_user_id is required' };
      }

      const messages = await db(table_names.messages)
        .where(builder => {
          builder.where({ sender_id: myId, receiver_id: otherId })
            .orWhere({ sender_id: otherId, receiver_id: myId });
        })
        .andWhere({ deleted: false })
        .orderBy('created', 'asc');

      // Mark anything sent to me in this thread as read.
      await db(table_names.messages)
        .where({ sender_id: otherId, receiver_id: myId })
        .whereNull('read_at')
        .update({ read_at: new Date() });

      return { data: messages };
    } catch (error) {
      console.error('messages.thread: ', error);
      return { error };
    }
  }

  static async create(request) {
    try {
      const myId = request.user.id;
      const { receiver_id, message } = request.body || {};

      if (!receiver_id || !message || !String(message).trim()) {
        return { message: 'receiver_id and a non-empty message are required' };
      }
      if (Number(receiver_id) === Number(myId)) {
        return { message: 'cannot message yourself' };
      }

      const receiver = await db(table_names.users).where({ id: receiver_id, deleted: false }).first();
      if (!receiver) {
        return { message: 'recipient not found' };
      }

      const [id] = await db(table_names.messages).insert({
        sender_id: myId,
        receiver_id,
        message: String(message).trim(),
        created: new Date(),
        deleted: false
      });
      const newMessage = await db(table_names.messages).where({ id }).first();

      return { data: newMessage };
    } catch (error) {
      console.error('messages.create: ', error);
      return { error };
    }
  }

  static async delete(request) {
    try {
      // Soft-delete, and only the sender may delete their own message.
      const updated = await db(table_names.messages)
        .where({ id: request.query?.id, sender_id: request.user.id })
        .update({ deleted: true });
      return { data: { deleted: updated > 0 } };
    } catch (error) {
      console.error('messages.delete: ', error);
      return { error };
    }
  }
}

module.exports = MessageHandler;
