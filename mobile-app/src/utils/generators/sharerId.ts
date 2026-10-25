import { Config } from '@constants/config';

export const generateSharerId = (): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let id = Config.sharerIdPrefix + '-';
  
  for (let i = 0; i < Config.sharerIdLength; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return id;
};

export const validateSharerId = (id: string): boolean => {
  const regex = new RegExp(`^${Config.sharerIdPrefix}-[A-Z0-9]{${Config.sharerIdLength}}$`);
  return regex.test(id);
};