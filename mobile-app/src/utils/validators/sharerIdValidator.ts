import { Config } from '@/constants/config';

export const validateSharerId = (sharerId: string): boolean => {
  const regex = new RegExp(`^${Config.sharerIdPrefix}-[A-Z0-9]{${Config.sharerIdLength}}$`);
  return regex.test(sharerId);
};

export const extractSharerIdFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const sid = urlObj.searchParams.get('sid');
    if (sid && validateSharerId(sid)) {
      return sid;
    }
    return null;
  } catch {
    return null;
  }
};

export const formatSharerId = (sharerId: string): string => {
  if (sharerId.startsWith(Config.sharerIdPrefix + '-')) {
    return sharerId;
  }
  return `${Config.sharerIdPrefix}-${sharerId.toUpperCase()}`;
};