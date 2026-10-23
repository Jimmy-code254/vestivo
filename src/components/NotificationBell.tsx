import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
};

const typeColors: Record<string, string> = {
  contribution: "bg-primary/10 text-primary",
  loan: "bg-accent/20 text-accent-foreground",
  meeting: "bg-secondary text-secondary-foreground",
  payout: "bg-primary/10 text-primary",
  system: "bg-muted text-muted-foreground",
  info: "bg-muted text-muted-foreground",
};

export default function NotificationBell({ isLanding }: { isLanding: boolean }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  const markAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user!.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={`relative ${isLanding ? "text-primary-foreground" : "text-foreground"}`}>
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-semibold text-sm text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!n.is_read) markRead(n.id); if (n.link) setOpen(false); }}
                className={`px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${!n.is_read ? "bg-primary/5" : ""}`}
              >
                {n.link ? (
                  <Link to={n.link} className="block">
                    <NotificationItem n={n} />
                  </Link>
                ) : (
                  <NotificationItem n={n} />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({ n }: { n: Notification }) {
  return (
    <>
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className={`text-[10px] mt-0.5 ${typeColors[n.type] || typeColors.info}`}>
          {n.type}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
          {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
          </p>
        </div>
        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
      </div>
    </>
  );
}
