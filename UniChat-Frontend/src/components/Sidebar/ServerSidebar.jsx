export function ServerSidebar() {
  return (
    <div className="server-sidebar">
      <div className="server-list">
        <div className="server-icon home" title="Direct Messages">
          <span>🏠</span>
        </div>
      </div>
      <div className="server-add">
        <button className="icon-btn add-server" title="Add Server">+</button>
      </div>
    </div>
  );
}