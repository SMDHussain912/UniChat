import { useState } from 'react';
import { ServerSidebar } from '../Sidebar/ServerSidebar';
import { ChannelSidebar } from '../Sidebar/ChannelSidebar';

export function Sidebar() {
  const [activeTab, setActiveTab] = useState('servers');

  return (
    <div className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${activeTab === 'servers' ? 'active' : ''}`}
          onClick={() => setActiveTab('servers')}
        >
          Servers
        </button>
        <button
          className={`sidebar-tab ${activeTab === 'channels' ? 'active' : ''}`}
          onClick={() => setActiveTab('channels')}
        >
          Channels
        </button>
      </div>
      <div className="sidebar-content">
        {activeTab === 'servers' ? <ServerSidebar /> : <ChannelSidebar />}
      </div>
    </div>
  );
}