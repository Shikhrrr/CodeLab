import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, AlertTriangle, Bot, User, WifiOff } from 'lucide-react';
import type { ChatMessage } from '../../types';

export interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  isThinking?: boolean;
  disabled?: boolean;
}

function SingleMessage({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const isAssistant = msg.role === 'assistant';

  const formattedTime = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const senderName =
    msg.sender ||
    (isUser ? 'YOU' : isAssistant ? 'CodeLab AI' : 'SYSTEM');

  if (isSystem) {
    return (
      <div className="border-2 border-[#FF6B6B] bg-[#FFF0F0] shadow-[3px_3px_0px_0px_#121212] overflow-hidden space-y-1">
        <div className="bg-[#FF6B6B] px-3 py-1 font-mono text-[10px] font-black uppercase text-white flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={12} strokeWidth={3} />
            <span>SYSTEM</span>
          </span>
          <span className="font-normal opacity-80">{formattedTime}</span>
        </div>
        <div className="px-3 py-2 font-mono text-xs font-bold text-[#c0392b] whitespace-pre-wrap break-words">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] overflow-hidden ${
        isUser ? 'bg-white' : 'bg-[#FFFEF0]'
      }`}
    >
      <div
        className={`px-3 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-[#121212] flex items-center justify-between border-b-2 border-[#121212] ${
          isUser ? 'bg-[#60EFFF]' : 'bg-[#FFE814]'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {isUser ? <User size={12} strokeWidth={3} /> : <Bot size={12} strokeWidth={3} />}
          <span>{senderName}</span>
        </span>
        <span className="font-semibold text-[#121212] text-[10px]">{formattedTime}</span>
      </div>

      {/* ── Markdown Content Render ────────────────────────────────────── */}
      <div className="px-3 py-2.5 font-mono text-xs text-[#121212] leading-relaxed break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            pre: ({ node, ...props }) => (
              <pre
                className="bg-[#121212] text-[#A6FF00] p-2.5 my-2 border-2 border-black overflow-x-auto text-[11px] font-mono shadow-[2px_2px_0px_0px_#121212]"
                {...props}
              />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            code: ({ node, inline, className, children, ...props }: any) => {
              if (inline) {
                return (
                  <code
                    className="bg-[#FFE814] text-[#121212] px-1 py-0.5 border border-black font-mono text-[11px] font-bold"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ul: ({ node, ...props }) => (
              <ul className="list-disc list-inside my-1.5 space-y-1" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ol: ({ node, ...props }) => (
              <ol className="list-decimal list-inside my-1.5 space-y-1" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            h1: ({ node, ...props }) => (
              <h1 className="text-sm font-black uppercase my-2 border-b-2 border-black pb-0.5" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            h2: ({ node, ...props }) => (
              <h2 className="text-xs font-black uppercase my-1.5" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            h3: ({ node, ...props }) => (
              <h3 className="text-xs font-bold my-1" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-black pl-2.5 my-2 italic bg-[#FFFDE0] py-1" {...props} />
            ),
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            a: ({ node, ...props }) => (
              <a target="_blank" rel="noopener noreferrer" className="underline font-bold text-[#3178C6]" {...props} />
            ),
          }}
        >
          {msg.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="border-2 border-[#121212] bg-[#FFE814] shadow-[3px_3px_0px_0px_#121212] px-3.5 py-2.5 flex items-center gap-2.5">
      <Loader2 size={14} className="animate-spin text-[#121212] shrink-0" strokeWidth={3} />
      <span className="font-mono text-xs font-black uppercase tracking-wider text-[#121212]">
        ⚡ CodeLab AI is thinking and compiling files…
      </span>
    </div>
  );
}

export default function ChatPanel({
  messages,
  onSendMessage,
  isConnected,
  isThinking = false,
  disabled = false,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message or thinking status
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !isConnected || disabled || isThinking) return;
    onSendMessage(text);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isInputDisabled = !isConnected || disabled || isThinking;

  return (
    <div className="flex flex-col h-full bg-[#FAF9F5] overflow-hidden select-none font-mono">
      {/* ── Disconnected Banner ────────────────────────────────────────────── */}
      {!isConnected && (
        <div className="bg-[#FF6B6B] border-b-2 border-[#121212] px-3 py-1.5 text-xs font-black text-white flex items-center justify-center gap-2">
          <WifiOff size={14} strokeWidth={3} />
          <span>DISCONNECTED FROM ROOM WEBSOCKET</span>
        </div>
      )}

      {/* ── Message Feed ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !isThinking ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-[#888]">
            <Bot size={32} strokeWidth={2} className="text-[#121212] opacity-40" />
            <p className="text-xs font-bold text-[#555] uppercase tracking-wider">
              No chat history yet
            </p>
            <p className="text-[11px] text-[#777] max-w-xs">
              Type your prompt below to ask questions or build system architecture with CodeLab AI.
            </p>
          </div>
        ) : (
          messages.map((msg) => <SingleMessage key={msg.id} msg={msg} />)
        )}
        {isThinking && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Box ─────────────────────────────────────────────────────── */}
      <div className="border-t-2 border-[#121212] bg-white p-3 space-y-2 shrink-0">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !isConnected
              ? 'Connecting to WebSocket server…'
              : isThinking
              ? 'AI is thinking… please wait'
              : 'Type prompt… (Press Enter to send, Shift+Enter for new line)'
          }
          disabled={isInputDisabled}
          rows={3}
          className="w-full border-2 border-[#121212] shadow-[2px_2px_0px_0px_#121212] bg-[#FFFFFF] p-2.5 text-xs font-mono font-semibold text-[#121212] placeholder:text-[#888] outline-none resize-none focus:bg-[#FFFDE0] disabled:bg-[#F5F5F5] disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={isInputDisabled || !inputText.trim()}
          className="w-full border-2 border-[#121212] shadow-[3px_3px_0px_0px_#121212] bg-[#FFE814] hover:bg-[#FFDE59] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none p-2.5 text-xs font-black uppercase tracking-wider text-[#121212] flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isThinking ? (
            <>
              <Loader2 size={14} className="animate-spin" strokeWidth={3} />
              <span>PROCESSING…</span>
            </>
          ) : (
            <>
              <Send size={14} strokeWidth={3} />
              <span>SEND PROMPT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
