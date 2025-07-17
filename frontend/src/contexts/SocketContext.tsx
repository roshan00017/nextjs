import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
  username: string; // We'll pass the username here
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  username,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!username) return; // Don't connect if no username

    const SOCKET_SERVER_URL =
      process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || "http://localhost:5000";

    const newSocket = io(SOCKET_SERVER_URL, {
      query: { username },
    });

    newSocket.on("connect", () => {
      console.log(`Socket Connected: ${newSocket.id} for user ${username}`);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket Disconnected");
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Socket Connection Error:", err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [username]); // <-- depend on username

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
