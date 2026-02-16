/**
 * AI Chat Widget — floating chat panel available on all pages.
 *
 * Features:
 * - Floating robot button in bottom-right corner
 * - Slide-up chat panel
 * - Agent type selector
 * - Conversation history
 * - Markdown rendering
 * - Typing indicator
 */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { aiApi } from '../../lib/api';
import { useAIChatStore } from '../../store/ai-chat';

// ── Agent Options ──────────────────────────────────────────

const AGENT_OPTIONS = [
  { value: '', label: 'Auto-detect', icon: '🤖' },
  { value: 'nlp_query', label: 'Data Query', icon: '🔍' },
  { value: 'performance', label: 'Performance', icon: '🎯' },
  { value: 'career', label: 'Career Dev', icon: '🚀' },
  { value: 'license', label: 'License', icon: '📊' },
  { value: 'report', label: 'Reports', icon: '📋' },
  { value: 'security', label: 'Security', icon: '🔒' },
  { value: 'onboarding', label: 'Onboarding', icon: '👋' },
  { value: 'notification', label: 'Notifications', icon: '🔔' },
];

// ── Component ──────────────────────────────────────────────

export function AIChatWidget() {
  const { isOpen, activeConversationId, agentType, setOpen, setConversation, setAgentType } =
    useAIChatStore();
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<
    Array<{ role: string; content: string; id: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversation history if there's an active conversation
  const { data: conversationData } = useQuery({
    queryKey: ['ai', 'conversation', activeConversationId],
    queryFn: () => (activeConversationId ? aiApi.getConversation(activeConversationId) : null),
    enabled: !!activeConversationId && isOpen,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (msg: string) =>
      aiApi.chat(msg, agentType || undefined, activeConversationId || undefined),
    onSuccess: (response) => {
      const data = (response as any)?.data ?? response;
      // Update conversation ID
      if (data.conversationId) {
        setConversation(data.conversationId);
      }
      // Add assistant message
      setLocalMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          id: `assistant-${Date.now()}`,
        },
      ]);
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error: any) => {
      setLocalMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error?.message ?? 'Unknown error'}. Please try again.`,
          id: `error-${Date.now()}`,
        },
      ]);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, chatMutation.isPending]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Load history into local messages when conversation changes
  useEffect(() => {
    if (conversationData) {
      const data = (conversationData as any)?.data ?? conversationData;
      if (data?.messages) {
        setLocalMessages(
          data.messages
            .filter((m: any) => m.role === 'user' || m.role === 'assistant')
            .map((m: any) => ({
              role: m.role,
              content: m.content,
              id: m.id,
            })),
        );
      }
    }
  }, [conversationData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || chatMutation.isPending) return;

    // Add user message locally
    setLocalMessages((prev) => [
      ...prev,
      { role: 'user', content: message.trim(), id: `user-${Date.now()}` },
    ]);

    chatMutation.mutate(message.trim());
    setMessage('');
  };

  const handleNewChat = () => {
    setConversation(null);
    setLocalMessages([]);
  };

  if (!isOpen) {
    // Floating button
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:bg-primary-700 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        title="Open AI Assistant"
      >
        <SparklesIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[550px] w-[400px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-white" />
          <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleNewChat}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
            title="New conversation"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <select
            value={agentType ?? ''}
            onChange={(e) => setAgentType(e.target.value || null)}
            className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {AGENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.icon} {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {localMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <SparklesIcon className="mb-3 h-10 w-10 text-primary-400" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              How can I help you today?
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Ask about performance, goals, team data, or anything else.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                'Who are my top performers?',
                'How many licenses left?',
                'Help me set Q2 goals',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setMessage(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {localMessages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="mb-3 flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-700">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-gray-200 px-3 py-3 dark:border-gray-700"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask anything..."
            disabled={chatMutation.isPending}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
          <button
            type="submit"
            disabled={!message.trim() || chatMutation.isPending}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
