import { useMemo } from 'react';

function ConversationView({
  currentUser,
  conversation,
  messages,
  input,
  onInput,
  onSend,
  onLoadMore,
  hasMore,
  typingUsers,
  onlineMap
}) {
  const title = useMemo(() => {
    if (!conversation) {
      return 'Select a conversation';
    }
    if (conversation.type === 'group') {
      return `${conversation.name} (group)`;
    }
    const peer = conversation.members.find((member) => member._id !== currentUser.id);
    return peer ? `${peer.username} (${onlineMap[peer._id] ? 'Online' : 'Offline'})` : 'Direct chat';
  }, [conversation, currentUser.id, onlineMap]);

  if (!conversation) {
    return <section className="conversation empty">Choose a conversation from the left panel.</section>;
  }

  return (
    <section className="conversation">
      <header>
        <h2>{title}</h2>
        {hasMore ? (
          <button type="button" onClick={onLoadMore}>
            Load older messages
          </button>
        ) : null}
      </header>

      <div className="messages">
        {messages.map((msg) => (
          <article key={msg._id} className={String(msg.senderId) === String(currentUser.id) ? 'message own' : 'message'}>
            <p>{msg.message}</p>
            <small>
              {new Date(msg.timestamp).toLocaleTimeString()} • {msg.deliveryStatus}
            </small>
          </article>
        ))}
      </div>

      {typingUsers.length ? <div className="typing">{typingUsers.join(', ')} typing...</div> : null}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <input value={input} onChange={(event) => onInput(event.target.value)} placeholder="Type a message" maxLength={2000} />
        <button type="submit">Send</button>
      </form>
    </section>
  );
}

export default ConversationView;
