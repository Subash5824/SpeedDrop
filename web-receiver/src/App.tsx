import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import FileReceiver from './components/FileReceiver';
import FileSender from './components/FileSender';
import './App.css';

type Page = 'home' | 'send' | 'receive';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  useEffect(() => {
    // 1. Check URL parameters for page selection or deep links
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page');

    if (params.has('session') || params.has('autodownload') || params.has('sid') || pageParam === 'receive') {
      setCurrentPage('receive');
    } else if (pageParam === 'send') {
      setCurrentPage('send');
    }

    // 2. Listen to browser history popstate (Back/Forward navigation)
    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const page = p.get('page');
      if (p.has('session') || p.has('autodownload') || p.has('sid') || page === 'receive') {
        setCurrentPage('receive');
      } else if (page === 'send') {
        setCurrentPage('send');
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    const url = new URL(window.location.href);

    if (page === 'home') {
      url.searchParams.delete('page');
      url.searchParams.delete('session');
      url.searchParams.delete('autodownload');
      url.searchParams.delete('sid');
    } else {
      url.searchParams.set('page', page);
    }

    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="cyber-app">
      {/* Ambient background glowing orbs */}
      <div className="ambient-halo halo-cyan" />
      <div className="ambient-halo halo-purple" />

      {/* Floating dust particles */}
      <div className="particles-layer">
        {Array.from({ length: 18 }).map((_, i) => (
          <span 
            key={i} 
            className="particle" 
            style={{
              left: `${(i * 17) % 96}%`,
              top: `${(i * 23) % 92}%`,
              animationDelay: `${(i * 0.45) % 6}s`,
              animationDuration: `${5 + ((i * 1.3) % 6)}s`,
              opacity: 0.15 + ((i % 5) * 0.08)
            }} 
          />
        ))}
      </div>

      {/* Main Content Area */}
      <main className="cyber-main-viewport">
        {currentPage === 'home' && (
          <HomePage onNavigate={navigateTo} />
        )}

        {currentPage === 'send' && (
          <FileSender onBack={() => navigateTo('home')} />
        )}

        {currentPage === 'receive' && (
          <FileReceiver onBack={() => navigateTo('home')} />
        )}
      </main>
    </div>
  );
};

export default App;