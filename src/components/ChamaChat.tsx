import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: { display_name: string | null } | null;
};

interface Props {
  chamaId: string;
  members: { user_id: string; display_name: string | null }[];
}

export default function ChamaChat({ chamaId, members }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profileMap = new Map(members.map((m) => [m.user_id, m.display_name]));

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chama-chat-${chamaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chama_messages", filter: `chama_id=eq.${chamaId}` },
        (payload) => {
          const msg = payload.new as Message;
          msg.profile = { display_name: profileMap.get(msg.user_id) || null };
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chamaId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chama_messages")
      .select("*")
      .eq("chama_id", chamaId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) {
      setMessages(
        data.map((m: any) => ({
          ...m,
          profile: { display_name: profileMap.get(m.user_id) || null },
        }))
      );
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    const msg = newMessage.trim();
    if (msg.length > 500) {
      toast.error("Message too long (max 500 characters)");
      return;
    }

    setSending(true);
    setNewMessage("");

    const { error } = await supabase.from("chama_messages").insert({
      chama_id: chamaId,
      user_id: user.id,
      message: msg,
    });

    if (error) {
      toast.error("Failed to send message");
      setNewMessage(msg);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="border border-border shadow-card flex flex-col" style={{ height: "420px" }}>
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="font-display flex items-center gap-2 text-lg">
          <MessageCircle className="w-5 h-5" /> Group Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No messages yet. Say hello! 👋
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === user?.id;
              const name = msg.profile?.display_name || "Member";
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMe ? "order-2" : ""}`}>
                    {!isMe && (
                      <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{name}</p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.message}
                    </div>
                    <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              disabled={sending}
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
