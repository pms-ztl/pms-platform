/**
 * AIChatPanel - Central chat interface for the AI Workspace.
 * Theme-aware: adapts colors based on light/dark/deep-dark.
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
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import * as T from './ai-theme';
import type { AgentType } from './AgentPanel';
import { PredictionGhost, HandshakeConfirmation } from './FuturisticEffects';

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
  pendingPrompt?: string | null;
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

function renderMessageContent(content: string, isLight: boolean): string {
  const boldClass = isLight ? 'font-semibold text-gray-900' : 'font-semibold text-white';
  const codeClass = isLight
    ? 'rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-blue-700'
    : 'rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-cyan-300';
  const liClass = isLight ? 'ml-4 list-disc text-gray-700' : 'ml-4 list-disc text-gray-300';

  let html = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, `<strong class="${boldClass}">$1</strong>`)
    .replace(/`([^`]+)`/g, `<code class="${codeClass}">$1</code>`)
    .replace(/^- (.+)$/gm, `<li class="${liClass}">$1</li>`)
    .replace(/^\d+\.\s+(.+)$/gm, `<li class="ml-4 list-decimal ${isLight ? 'text-gray-700' : 'text-gray-300'}">$1</li>`)
    .replace(/\n/g, '<br />');

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
  const [showConfirmation, setShowConfirmation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { theme } = useAIWorkspaceStore();

  const primaryRole = user?.roles?.[0] ?? '';
  const suggestedPrompts = ROLE_PROMPTS[primaryRole] ?? DEFAULT_PROMPTS;

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
        { id: `assistant-${Date.now()}`, role: 'assistant', content: data.message, timestamp: new Date() },
      ]);
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error: Error) => {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: `I encountered an error: ${error.message}. Please try again.`, timestamp: new Date() },
      ]);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { if (!conversationId) setMessages([]); }, [conversationId]);

  useEffect(() => {
    if (pendingPrompt && !chatMutation.isPending) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: pendingPrompt, timestamp: new Date() },
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
      { id: `user-${Date.now()}`, role: 'user', content: trimmed, timestamp: new Date() },
    ]);
    chatMutation.mutate(trimmed);
    setMessage('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleSuggestionClick = (prompt: string) => {
    setMessage(prompt);
    inputRef.current?.focus();
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  const dots = T.typingDotColors(theme);

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 relative ${T.scrollbar(theme)}`}>
        {/* Data Stream overlay during AI processing */}
        {chatMutation.isPending && (
          <div className="data-stream absolute inset-0 pointer-events-none z-0" />
        )}
        {/* Empty State */}
        {messages.length === 0 && !chatMutation.isPending && (
          <div className="flex h-full flex-col items-center justify-center text-center px-6">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${
              theme === 'deep-dark' ? 'from-cyan-500/20 to-emerald-500/20' : 'from-purple-500/20 to-cyan-500/20'
            } mb-5`}>
              <SparklesIcon className={`h-8 w-8 ${T.accentText(theme)}`} />
            </div>
            <h3 className={`text-lg font-semibold ${T.textPrimary(theme)} mb-2`}>
              {selectedAgent
                ? `${selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)} Agent Ready`
                : 'How can I help you today?'}
            </h3>
            <p className={`text-sm ${T.textSecondary(theme)} mb-6 max-w-md`}>
              {selectedAgent
                ? `Ask me anything about ${selectedAgent}. I have access to your organization's data.`
                : 'Select an agent or just start typing. I\'ll route your question to the best agent.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestionClick(prompt)}
                  className={`rounded-xl border px-4 py-3 text-left text-xs transition-all duration-200 ${
                    theme === 'light'
                      ? 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 hover:text-gray-900'
                      : `border-white/10 bg-white/5 ${T.textSecondary(theme)} hover:bg-white/10 hover:text-white`
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message List */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                theme === 'deep-dark' ? 'from-cyan-500/30 to-emerald-500/30' : 'from-purple-500/30 to-cyan-500/30'
              } mt-1`}>
                <SparklesIcon className={`h-4 w-4 ${theme === 'deep-dark' ? 'text-cyan-300' : 'text-purple-300'}`} />
              </div>
            )}

            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' ? T.userBubble(theme) : T.assistantBubble(theme)
            }`}>
              {msg.role === 'assistant' ? (
                <div
                  className="text-sm leading-relaxed break-words"
                  dangerouslySetInnerHTML={{ __html: renderMessageContent(msg.content, theme === 'light') }}
                />
              ) : (
                <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`mt-1.5 text-[10px] ${msg.role === 'user' ? 'text-white/50' : T.textMuted(theme)}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {msg.role === 'user' && (
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
                theme === 'light' ? 'from-blue-500/20 to-indigo-500/20' : 'from-blue-500/30 to-indigo-500/30'
              } mt-1`}>
                <UserIcon className={`h-4 w-4 ${theme === 'light' ? 'text-blue-600' : 'text-blue-300'}`} />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${
              theme === 'deep-dark' ? 'from-cyan-500/30 to-emerald-500/30' : 'from-purple-500/30 to-cyan-500/30'
            } mt-1`}>
              <SparklesIcon className={`h-4 w-4 ${theme === 'deep-dark' ? 'text-cyan-300' : 'text-purple-300'}`} />
            </div>
            <div className={`rounded-2xl px-4 py-3 ${T.assistantBubble(theme)}`}>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${dots[0]} animate-bounce`} style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
                <div className={`h-2 w-2 rounded-full ${dots[1]} animate-bounce`} style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
                <div className={`h-2 w-2 rounded-full ${dots[2]} animate-bounce`} style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Prediction Ghost — faint preview while AI is processing */}
        <PredictionGhost visible={chatMutation.isPending && messages.length > 0}>
          <div className={`flex gap-3 justify-start`}>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${T.assistantBubble(theme)}`}>
              <div className="text-sm leading-relaxed text-gray-400">Analyzing your request...</div>
            </div>
          </div>
        </PredictionGhost>

        {/* Handshake Confirmation — success burst after AI response */}
        {showConfirmation && (
          <div className="flex justify-center py-2">
            <HandshakeConfirmation
              trigger={showConfirmation}
              size={36}
              onComplete={() => setShowConfirmation(false)}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t ${T.border(theme)} px-4 py-3`}>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={selectedAgent ? `Ask the ${selectedAgent} agent...` : 'Type your message...'}
              disabled={chatMutation.isPending}
              rows={1}
              className={`w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-1 disabled:opacity-50 ${T.inputField(theme)}`}
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || chatMutation.isPending}
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 ${chatMutation.isPending ? 'neural-pulse' : ''} ${T.sendButton(theme)}`}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
        <p className={`mt-1.5 text-[10px] ${T.textMuted(theme)} text-center`}>
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
