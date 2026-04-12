import Cookies from 'js-cookie';
import { User } from '@/types';

export const setAuthCookies = (token: string, user: User) => {
  Cookies.set('token', token, { expires: 7 }); // 7 days
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
};

export const removeAuthCookies = () => {
  Cookies.remove('token');
  Cookies.remove('user');
};

export const getAuthToken = () => {
  return Cookies.get('token');
};

export const getCurrentUser = (): User | null => {
  const userStr = Cookies.get('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};

export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};
