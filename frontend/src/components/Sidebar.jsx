function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  search,
  onSearch,
  users,
  onStartDirect,
  onCreateGroup,
  onlineMap,
  currentUserId
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <h2>Chats</h2>
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search users" />
        {users.length ? (
          <ul className="user-results">
            {users.map((user) => (
              <li key={user._id}>
                <button type="button" onClick={() => onStartDirect(user._id)}>
                  {user.username} {onlineMap[user._id] ? '🟢' : '⚪'}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button type="button" className="group-btn" onClick={onCreateGroup}>
          Create Group
        </button>
      </div>

      <ul className="conversation-list">
        {conversations.map((conversation) => {
          const peer = conversation.members.find((member) => member._id !== currentUserId) || conversation.members[0];
          const name = conversation.type === 'group' ? conversation.name : peer?.username || 'Unknown';
          const isOnline = conversation.type === 'direct' && peer ? onlineMap[peer._id] : false;

          return (
            <li key={conversation._id}>
              <button
                type="button"
                className={conversation._id === currentConversationId ? 'active' : ''}
                onClick={() => onSelectConversation(conversation)}
              >
                <div>
                  <strong>{name}</strong>
                  <small>{conversation.latestMessage?.message || 'No messages yet'}</small>
                </div>
                {conversation.type === 'direct' ? <span>{isOnline ? 'Online' : 'Offline'}</span> : <span>Group</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default Sidebar;
