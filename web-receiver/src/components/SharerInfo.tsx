import React from 'react';
import './SharerInfo.css';

interface SharerInfoProps {
  sharerName: string;
  sharerId: string;
}

const SharerInfo: React.FC<SharerInfoProps> = ({ sharerName, sharerId }) => {
  return (
    <div className="sharer-info">
      <div className="sharer-label">Receiving from:</div>
      <div className="sharer-name">{sharerName}</div>
      <div className="sharer-id">{sharerId}</div>
    </div>
  );
};

export default SharerInfo;