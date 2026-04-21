import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { messageAPI } from "@/lib/api";
import { Send, Loader, AlertCircle, Trash2 } from "lucide-react";
import { io, Socket } from 'socket.io-client';
import { useToast } from "@/hooks/use-toast";

interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
  };
  receiverId: {
    _id: string;
    name: string;
  };
  content: string;
  read: boolean;
  createdAt: string;
}

interface MessagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caregiver: any;
  currentUserId: string;
  currentUserName: string;
  bookingId?: string;
}

export default function MessagingModal({
  isOpen,
  onClose,
  caregiver,
  currentUserId,
  currentUserName,
  bookingId,
}: MessagingModalProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Load conversation on modal open
  useEffect(() => {
    if (isOpen && caregiver?._id) {
      loadConversation();
    }
  }, [isOpen, caregiver?._id]);

  // Socket.io connection for real-time messages
  useEffect(() => {
    if (!isOpen) return;
    if (!bookingId) return;

    const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinBooking', bookingId);
    });

    socket.on('newMessage', (msg: any) => {
      setMessages((prev) => {
        // Avoid duplicates by checking id
        if (prev.some(m => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      if (socket) {
        socket.emit('leaveBooking', bookingId);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [isOpen, bookingId]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await messageAPI.getConversation(caregiver._id);
      setMessages(data || []);
    } catch (err: any) {
      console.error("Error loading conversation:", err);
      setError("Failed to load messages");
      toast({
        title: "Error",
        description: "Could not load conversation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const res = await messageAPI.sendMessage(caregiver._id, newMessage.trim(), bookingId);

      // Clear input
      setNewMessage("");

      // Optimistically append the returned message so it shows immediately
      try {
        const returned = res?.data || res;
        if (returned && returned._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === returned._id)) return prev;
            return [...prev, returned];
          });
        }
      } catch (appendErr) {
        console.warn('Could not append optimistic message:', appendErr);
      }

      toast({
        title: "Message sent",
        description: `Your message was sent to ${caregiver.name}`,
      });
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
      toast({
        title: "Error",
        description: "Could not send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await messageAPI.deleteMessage(messageId);
      setMessages(messages.filter((msg) => msg._id !== messageId));
      toast({
        title: "Message deleted",
        description: "The message was deleted successfully",
      });
    } catch (err: any) {
      console.error("Error deleting message:", err);
      toast({
        title: "Error",
        description: "Could not delete message",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {caregiver?.userType === 'family' 
              ? `Message from Family: ${caregiver?.name || "Family Member"}`
              : `Message with Caregiver: ${caregiver?.name || "Caregiver"}`
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-secondary/20 rounded-lg">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p>No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isCurrentUser = message.senderId._id === currentUserId;
              return (
                <div
                  key={message._id}
                  className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg group relative ${
                      isCurrentUser
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 break-words">
                        <p className="text-sm font-semibold mb-1">
                          {isCurrentUser ? currentUserName : caregiver?.name}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-2 ${
                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {isCurrentUser && (
                        <button
                          onClick={() => handleDeleteMessage(message._id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary-foreground/20 rounded"
                          title="Delete message"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-3 pt-4 border-t">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-base flex-1"
            disabled={sending || loading}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || sending || loading}
            size="icon"
          >
            {sending ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
