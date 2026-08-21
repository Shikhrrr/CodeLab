import { useRoomChatAndFiles } from '../../hooks/useRoomChatAndFiles';
import ChatPanel from './ChatPanel';

interface AiChatDrawerProps {
  roomId: string;
  passcode?: string;
}

export default function AiChatDrawer({ roomId, passcode }: AiChatDrawerProps) {
  const { messages, isConnected, isThinking, sendMessage } =
    useRoomChatAndFiles(roomId, passcode);

  return (
    <div
      style={{ background: '#FAF9F5' }}
      className="flex h-full flex-col overflow-hidden"
    >
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatPanel
          messages={messages}
          onSendMessage={sendMessage}
          isConnected={isConnected}
          isThinking={isThinking}
        />
      </div>
    </div>
  );
}
