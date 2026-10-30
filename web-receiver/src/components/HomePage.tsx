import React from 'react';
import { UploadIcon, DownloadIcon } from './Icons';
import './HomePage.css';

interface HomePageProps {
  onNavigate: (page: 'send' | 'receive') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">SpeedDrop</h1>
        <p className="home-subtitle">The fastest way to share files across devices</p>
      </div>

      <div className="home-actions">
        <button 
          className="circle-action-btn" 
          onClick={() => onNavigate('send')}
          aria-label="Send files"
        >
          <div className="circle-action-icon">
            <UploadIcon size={34} color="#00f5d4" />
          </div>
          <span className="circle-action-label">Send</span>
        </button>

        <button 
          className="circle-action-btn" 
          onClick={() => onNavigate('receive')}
          aria-label="Receive files"
        >
          <div className="circle-action-icon">
            <DownloadIcon size={34} color="#00f5d4" />
          </div>
          <span className="circle-action-label">Receive</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
