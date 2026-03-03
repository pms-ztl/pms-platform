/**
 * HelpAssistantChat — Embedded AI chat for the Help page.
 *
 * Self-contained component that calls the backend help_assistant agent
 * via aiApi.chat(). Does NOT depend on the global AI stores.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { aiApi, type AIChatResponse } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ── Suggested Questions ────────────────────────────────────

const SUGGESTED_QUESTIONS = [
  'How do I complete my self-assessment?',
  'How are performance ratings calculated?',
  'How do I set SMART goals?',
  'What happens during calibration?',
  'How do I request feedback from colleagues?',
  'How do I create a development plan?',
  'What is the CPIS score?',
  'How do I run a 1-on-1 meeting?',
];

// ── Markdown-lite renderer ─────────────────────────────────

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, bullet lists, numbered lists, `code`
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag key={`list-${elements.length}`} className={clsx('space-y-1 my-1', listType === 'ol' ? 'list-decimal' : 'list-disc', 'pl-4')}>
          {listItems.map((item, i) => (
            <li key={i} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(item) }} />
          ))}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (s: string) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-2xs">$1</code>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary-600 dark:text-primary-400 underline">$1</a>');

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet list
    if (/^[-*]\s/.test(trimmed)) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(trimmed.replace(/^[-*]\s/, ''));
      continue;
    }

    // Numbered list
    if (/^\d+[.)]\s/.test(trimmed)) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(trimmed.replace(/^\d+[.)]\s/, ''));
      continue;
    }

    flushList();

    if (!trimmed) {
      elements.push(<br key={`br-${elements.length}`} />);
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h4 key={`h-${elements.length}`} className="text-xs font-bold text-secondary-900 dark:text-white mt-2 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={`h-${elements.length}`} className="text-sm font-bold text-secondary-900 dark:text-white mt-2 mb-1">
          {trimmed.slice(3)}
        </h3>
      );
    } else {
      elements.push(
        <p key={`p-${elements.length}`} className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: formatInline(trimmed) }} />
      );
    }
  }
  flushList();
  return elements;
}

// ── Component ──────────────────────────────────────────────

export function HelpAssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res: AIChatResponse = await aiApi.chat(text.trim(), 'help_assistant', conversationId ?? undefined);

      if (!conversationId) {
        setConversationId(res.conversationId);
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg.includes('403') || msg.includes('AI')
        ? 'AI assistant is not available for your organization. Please use the guides and FAQ instead.'
        : `Failed to get response. ${msg}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[400px] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] shadow-sm overflow-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200/60 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center shadow-sm">
            <SparklesIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-secondary-900 dark:text-white">PMS Help Assistant</h3>
            <p className="text-2xs text-secondary-500 dark:text-secondary-400">Ask anything about the platform</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleNewChat}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-2xs font-medium text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
          >
            <ArrowPathIcon className="h-3 w-3" />
            New Chat
          </button>
        )}
      </div>

      {/* ── Messages Area ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Empty state */}
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-100 to-violet-100 dark:from-primary-900/30 dark:to-violet-900/30 flex items-center justify-center mb-4">
              <ChatBubbleLeftRightIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-2xl font-bold text-secondary-900 dark:text-white mb-1">
              How can I help you?
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-5 max-w-sm">
              Ask me anything about the PMS platform — features, how-to guides, review cycles, goals, feedback, and more.
            </p>

            {/* Suggested Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left px-3.5 py-2.5 rounded-lg text-xs text-secondary-700 dark:text-secondary-300 bg-secondary-50 dark:bg-secondary-700/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 border border-secondary-200/60 dark:border-white/[0.06] hover:border-primary-300 dark:hover:border-primary-500/30 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={clsx(
                'max-w-[85%] rounded-xl px-3.5 py-2.5',
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-secondary-100 dark:bg-secondary-700/70 text-secondary-900 dark:text-secondary-100 rounded-bl-sm'
              )}
            >
              {msg.role === 'user' ? (
                <p className="text-xs leading-relaxed">{msg.content}</p>
              ) : (
                <div className="space-y-1">{renderMarkdown(msg.content)}</div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary-100 dark:bg-secondary-700/70 rounded-xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-secondary-400 dark:bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-secondary-400 dark:bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-secondary-400 dark:bg-secondary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex justify-start">
            <div className="max-w-[85%] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-3.5 py-2.5">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Area ─────────────────────────────────────── */}
      <div className="border-t border-secondary-200/60 dark:border-white/[0.06] px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about PMS..."
            rows={1}
            className="flex-1 resize-none bg-secondary-50 dark:bg-secondary-700/50 border border-secondary-200/60 dark:border-white/[0.06] rounded-lg px-3 py-2 text-xs text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow max-h-24"
            style={{ minHeight: '36px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={clsx(
              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all',
              input.trim() && !isLoading
                ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'
                : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-400 cursor-not-allowed'
            )}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-2xs text-secondary-400 dark:text-secondary-500">
          Press Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
