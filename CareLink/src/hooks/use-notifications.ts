import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationAPI } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  message: string;
  type: string;
  time: string;
  unread: boolean;
  link?: string;
  data?: any;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const data = await notificationAPI.getByUserId(userId);
      const formattedNotifications: Notification[] = Array.isArray(data)
        ? data.map((n: any) => ({
            id: n._id || n.id,
            message: n.message ? n.message.replace(/hourly/gi, 'daily') : n.message,
            type: n.type || 'general',
            time: new Date(n.createdAt || n.time).toLocaleDateString(),
            unread: !n.read,
            link: n.link,
            data: n.data,
          }))
        : [];

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter(n => n.unread).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Real-time socket for incoming notifications
  const socketRef = useRef<Socket | null>(null);
  // Add a new notification to the list
  const addNotification = useCallback((notification: Omit<Notification, 'id'> & { id?: string }) => {
    const newNotif: Notification = {
      ...notification,
      id: notification.id || `notif-${Date.now()}`,
    };
    setNotifications(prev => [newNotif, ...prev]);
    if (newNotif.unread) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace('/api', '');
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUser', userId); // server may implement join logic; we'll also join a room name below
      // join a user-specific room name used by the server
      socket.emit('joinUserRoom', `user_${userId}`);
    });

    // Support older server-side naming: listen on 'newNotification'
    socket.on('newNotification', (notif: any) => {
      addNotification({
        id: notif._id || `notif-${Date.now()}`,
        message: notif.message || 'New message',
        type: notif.type || 'message',
        time: notif.createdAt || new Date().toISOString(),
        unread: !notif.read,
        link: notif.link,
        data: notif,
      });
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [addNotification]);

  

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification || !notification.unread) return;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, unread: false } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Update on backend
      await notificationAPI.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [notifications]);

  // Dismiss a notification
  const dismissNotification = useCallback((notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.unread) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Delete on backend
    notificationAPI.delete(notificationId).catch(error => {
      console.error('Failed to delete notification:', error);
    });
  }, [notifications]);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    // Refresh notifications every 60 seconds
    const interval = setInterval(loadNotifications, 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    loadNotifications,
    addNotification,
    markAsRead,
    dismissNotification,
    clearAll,
  };
};
