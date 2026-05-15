import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import ConversationView from '../components/ConversationView';
import { chatApi, SOCKET_BASE_URL } from '../utils/api';

function ChatPage({ user, token, onLogout }) {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineMap, setOnlineMap] = useState({});

  const socketRef = useRef(null);
  const typingTimerRef = useRef(null);

  const currentConversationId = currentConversation?._id;

  useEffect(() => {
    let mounted = true;

    const loadConversations = async () => {
      const { data } = await chatApi.conversations();
      if (!mounted) return;
      setConversations(data.conversations);

      const initialOnlineMap = data.conversations.reduce((acc, conversation) => {
        conversation.members.forEach((member) => {
          acc[member._id] = member.isOnline;
        });
        return acc;
      }, {});
      setOnlineMap(initialOnlineMap);

      if (data.conversations.length) {
        setCurrentConversation(data.conversations[0]);
      }
    };

    loadConversations().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentConversationId) return;

    const loadMessages = async () => {
      const { data } = await chatApi.messages(currentConversationId, 1, 20);
      setMessages(data.messages);
      setPage(1);
      setHasMore(data.hasMore);
    };

    loadMessages().catch(() => undefined);
  }, [currentConversationId]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_BASE_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user_connected', {
        lastReceivedAt: localStorage.getItem('lastReceivedAt') || undefined
      });
    });

    socket.on('receive_message', (message) => {
      localStorage.setItem('lastReceivedAt', message.timestamp);
      if (String(message.conversationId) === String(currentConversationId)) {
        setMessages((prev) => [...prev, message]);
      }
      setConversations((prev) =>
        prev.map((conversation) =>
          String(conversation._id) === String(message.conversationId)
            ? { ...conversation, latestMessage: message }
            : conversation
        )
      );
    });

    socket.on('recover_messages', (missedMessages) => {
      const relevant = missedMessages.filter(
        (message) => String(message.conversationId) === String(currentConversationId)
      );
      if (relevant.length) {
        setMessages((prev) => [...prev, ...relevant]);
      }
    });

    socket.on('typing_start', ({ conversationId, username }) => {
      if (String(conversationId) !== String(currentConversationId)) return;
      setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
    });

    socket.on('typing_stop', ({ conversationId, userId }) => {
      if (String(conversationId) !== String(currentConversationId)) return;
      setTypingUsers((prev) =>
        prev.filter((name) => {
          const sender = currentConversation?.members.find((member) => member.username === name);
          return String(sender?._id) !== String(userId);
        })
      );
    });

    socket.on('message_status', ({ messageId, deliveryStatus }) => {
      setMessages((prev) =>
        prev.map((message) =>
          String(message._id) === String(messageId) ? { ...message, deliveryStatus } : message
        )
      );
    });

    socket.on('user_presence', ({ userId, isOnline }) => {
      setOnlineMap((prev) => ({ ...prev, [userId]: isOnline }));
    });

    socket.on('user_disconnected', ({ userId }) => {
      setOnlineMap((prev) => ({ ...prev, [userId]: false }));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, currentConversationId, currentConversation]);

  useEffect(() => {
    if (!search.trim()) return;

    const timer = setTimeout(async () => {
      const { data } = await chatApi.users(search.trim());
      setUsers(data.users);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const sendMessage = () => {
    if (!socketRef.current || !currentConversation || !input.trim()) return;

    socketRef.current.emit(
      'send_message',
      {
        conversationId: currentConversation._id,
        message: input.trim()
      },
      (ack) => {
        if (!ack.ok) return;
        setInput('');
      }
    );

    socketRef.current.emit('typing_stop', { conversationId: currentConversation._id });
  };

  const handleInput = (value) => {
    setInput(value);
    if (!socketRef.current || !currentConversation) return;

    socketRef.current.emit('typing_start', { conversationId: currentConversation._id });

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketRef.current?.emit('typing_stop', { conversationId: currentConversation._id });
    }, 1200);
  };

  const loadMore = async () => {
    if (!currentConversationId || !hasMore) return;
    const nextPage = page + 1;
    const { data } = await chatApi.messages(currentConversationId, nextPage, 20);
    setMessages((prev) => [...data.messages, ...prev]);
    setPage(nextPage);
    setHasMore(data.hasMore);
  };

  const startDirectConversation = async (receiverId) => {
    const { data } = await chatApi.createDirectConversation(receiverId);
    const existing = conversations.find((conversation) => String(conversation._id) === String(data.conversation._id));

    if (existing) {
      setCurrentConversation(existing);
      return;
    }

    const refresh = await chatApi.conversations();
    setConversations(refresh.data.conversations);
    const newConversation = refresh.data.conversations.find(
      (conversation) => String(conversation._id) === String(data.conversation._id)
    );
    if (newConversation) {
      setCurrentConversation(newConversation);
    }
  };

  const createGroupConversation = async () => {
    if (!users.length) return;
    const groupName = window.prompt('Group name');
    if (!groupName) return;

    const inputIds = window.prompt('Enter member IDs separated by comma', users.map((userItem) => userItem._id).join(','));
    if (!inputIds) return;

    const memberIds = inputIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    await chatApi.createGroupConversation(groupName.trim(), memberIds);
    const refresh = await chatApi.conversations();
    setConversations(refresh.data.conversations);
  };

  const sortedTypingUsers = useMemo(() => [...new Set(typingUsers)], [typingUsers]);

  return (
    <main className="chat-layout">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={setCurrentConversation}
        search={search}
        onSearch={(value) => {
          setSearch(value);
          if (!value.trim()) setUsers([]);
        }}
        users={users}
        onStartDirect={startDirectConversation}
        onCreateGroup={createGroupConversation}
        onlineMap={onlineMap}
        currentUserId={user.id}
      />

      <ConversationView
        currentUser={user}
        conversation={currentConversation}
        messages={messages}
        input={input}
        onInput={handleInput}
        onSend={sendMessage}
        onLoadMore={loadMore}
        hasMore={hasMore}
        typingUsers={sortedTypingUsers}
        onlineMap={onlineMap}
      />

      <button className="logout" type="button" onClick={onLogout}>
        Logout
      </button>
    </main>
  );
}

export default ChatPage;
