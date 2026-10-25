import moment from 'moment';

export const formatDate = (date: Date | string | number): string => {
  return moment(date).format('MMM DD, YYYY');
};

export const formatTime = (date: Date | string | number): string => {
  return moment(date).format('HH:mm:ss');
};

export const formatDateTime = (date: Date | string | number): string => {
  return moment(date).format('MMM DD, YYYY HH:mm:ss');
};

export const formatRelativeTime = (date: Date | string | number): string => {
  return moment(date).fromNow();
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};