/**
 * AIChatPanel - Central chat interface for the AI Workspace.
 *
 * Features:
 * - Message list with basic markdown-like rendering (bold, code, lists)
 * - Distinct user vs AI message styling with glassmorphism
 * - Animated typing indicator (three bouncing dots)
 * - Auto-scroll to the latest message
 * - Suggested prompts (role-based) shown when the chat is empty
 * - Send button with keyboard shortcut (Enter)
 */

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIChatResponse } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AgentType } from './AgentPanel';

// ── Types ─────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  selectedAgent: AgentType | null;
  conversationId: string | null;
  onConversationChange: (id: string) => void;
  /** When set by a quick-action button, auto-populates and sends this prompt. */
  pendingPrompt?: string | null;
  /** Called after the pending prompt is consumed so parent can clear it. */
  onPromptConsumed?: () => void;
}

// ── Suggested Prompts ─────────────────────────────────────────

const ROLE_PROMPTS: Record<string, string[]> = {
  ADMIN: [
    'Show me a summary of this quarter\'s performance reviews',
    'Which teams have the lowest engagement scores?',
    'Generate a headcount report by department',
    'Are there any compliance issues I should know about?',
  ],
  MANAGER: [
    'How is my team performing this quarter?',
    'Who on my team needs a check-in this week?',
    'Help me draft Q2 goals for my team',
    'Show me feedback trends for my direct reports',
  ],
  EMPLOYEE: [
    'What are my current goals and their progress?',
    'Show me my recent feedback summary',
    'Help me prepare for my next review',
    'What development opportunities are available?',
  ],
};

const DEFAULT_PROMPTS = [
  'What are my performance highlights?',
  'Help me set goals for this quarter',
  'Show me recent feedback I received',
  'What insights do you have for me?',
];

// ── Markdown-like Renderer ────────────────────────────────────

function renderMessageContent(content: string): string {
  let html = content
    // Escape HTML first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Bold: **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    // Inline code: `code`
    .replace(/`([^`]+)`/g, '<code class="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-cyan-300">$1</code>')
    // Unordered lists: - item
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-300">$1</li>')
    // Ordered lists: 1. item
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-gray-300">$1</li>')
    // Line breaks
    .replace(/\n/g, '<br />');

  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/((?:<li[^>]*>.*?<\/li><br \/>?)+)/g, (match) => {
    const cleaned = match.replace(/<br \/>/g, '');
    return `<ul class="my-1.5 space-y-0.5">${cleaned}</ul>`;
  });

  return html;
}

// ── Component ─────────────────────────────────────────────────

export function AIChatPanel({
  selectedAgent,
  conversationId,
  onConversationChange,
  pendingPrompt,
  onPromptConsumed,
}: AIChatPanelProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Determine role-based prompts
  const primaryRole = user?.roles?.[0] ?? '';
  const suggestedPrompts = ROLE_PROMPTS[primaryRole] ?? DEFAULT_PROMPTS;

  // Chat mutation (declared before effects that reference it)
  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      aiApi.chat(msg, selectedAgent ?? undefined, conversationId ?? undefined),
    onSuccess: (response) => {
      const data = response as AIChatResponse;
      if (data.conversationId && data.conversationId !== conversationId) {
        onConversationChange(data.conversationId);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `I encountered an error: ${error.message}. Please try again.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset messages when conversation changes to null (new chat)
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  // Auto-send pending prompt from quick actions
  useEffect(() => {
    if (pendingPrompt && !chatMutation.isPending) {
      setMessages((prev) => [
        ...prev,
        {
          id: `user-${Date.now()}`,
          role: 'user',
          content: pendingPrompt,
          timestamp: new Date(),
        },
      ]);
      chatMutation.mutate(pendingPrompt);
      onPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      },
    ]);
    chatMutation.mutate(trimmed);
    setMessage('');

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setMessage(prompt);
    inputRef.current?.focus();
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {/* Empty State */}
        {messages.length === 0 && !chatMutation.isPending && (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 mb-5">
              <SparklesIcon className="h-8 w-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {selectedAgent
                ? `${selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)} Agent Ready`
                : 'How can I help you today?'}
            </h3>
            <p className="text-sm text-gray-400 mb-6 max-w-md">
              {selectedAgent
                ? `Ask me anything about ${selectedAgent}. I have access to your organization's data and can provide personalized insights.`
                : 'Select an agent from the left panel or just start typing. I\'ll route your question to the best agent automatically.'}
            </p>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestionClick(prompt)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs text-gray-300 transition-all duration-200 hover:bg-white/10 hover:border-white/20 hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* AI Avatar */}
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-500/30 mt-1">
                <SparklesIcon className="h-4 w-4 text-purple-300" />
              </div>
            )}

            {/* Message Bubble */}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white'
                  : 'bg-white/[0.07] backdrop-blur-sm border border-white/10 text-gray-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="text-sm leading-relaxed break-words [&_strong]:text-white [&_code]:text-cyan-300"
                  dangerouslySetInnerHTML={{
                    __html: renderMessageContent(msg.content),
                  }}
                />
              ) : (
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                  {msg.content}
                </p>
              )}
              <p
                className={`mt-1.5 text-[10px] ${
                  msg.role === 'user' ? 'text-white/50' : 'text-gray-500'
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* User Avatar */}
            {msg.role === 'user' && (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 mt-1">
                <UserIcon className="h-4 w-4 text-blue-300" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-500/30 mt-1">
              <SparklesIcon className="h-4 w-4 text-purple-300" />
            </div>
            <div className="rounded-2xl bg-white/[0.07] backdrop-blur-sm border border-white/10 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2 w-2 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
                />
                <div
                  className="h-2 w-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
                />
                <div
                  className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"
                  style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedAgent
                  ? `Ask the ${selectedAgent} agent...`
                  : 'Type your message...'
              }
              disabled={chatMutation.isPending}
              rows={1}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 backdrop-blur-sm transition-all duration-200 focus:border-purple-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-purple-500/30 disabled:opacity-50"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || chatMutation.isPending}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25 transition-all duration-200 hover:shadow-purple-500/40 hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-1.5 text-[10px] text-gray-600 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
