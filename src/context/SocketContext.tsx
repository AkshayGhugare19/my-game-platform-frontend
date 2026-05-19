import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "react-toastify";
import { useAuth } from "@/context/AuthContext";

interface SocketCtx {
  socket: Socket | null;
  on: (event: string, cb: (payload: unknown) => void) => () => void;
}

const Ctx = createContext<SocketCtx | undefined>(undefined);
const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:5001";

export const SocketProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }
    const s = io(WS_URL, { auth: { token }, transports: ["websocket"] });
    socketRef.current = s;
    force((n) => n + 1);

    // Global UX feedback for realtime engine events.
    s.on("notification:new", (n: { title: string }) =>
      toast.info(n.title)
    );
    s.on("level:up", (p: { to: number }) =>
      toast.success(`🚀 Level up! You're now Level ${p.to}`)
    );
    s.on("rank:up", (p: { to: string }) =>
      toast.success(`🏆 New rank: ${p.to}!`)
    );

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const on = (event: string, cb: (payload: unknown) => void) => {
    const s = socketRef.current;
    if (!s) return () => undefined;
    s.on(event, cb);
    return () => s.off(event, cb);
  };

  return (
    <Ctx.Provider value={{ socket: socketRef.current, on }}>
      {children}
    </Ctx.Provider>
  );
};

export const useSocket = (): SocketCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
};
