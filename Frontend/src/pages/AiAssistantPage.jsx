import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, Info, RefreshCw,
  Send, Sparkles, UserRound,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Badge from '../components/ui/Badge';
import Field from '../components/ui/Field';
import { Spinner } from '../components/ui/Skeleton';
import { useAuth } from '../context/AuthContext';
import aiApi from '../api/ai';
import { getErrorMessage } from '../api/client';
import { formatDate, formatDateLong, formatNumber, todayKey } from '../lib/format';

const TYPE_LABELS = {
  annual: 'Annual leave',
  sick: 'Sick leave',
  casual: 'Casual leave',
  unpaid: 'Unpaid leave',
};

export default function AIAssistantPage() {
  const { user, employee, organization, isStaff } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState('');
  const nextId = useRef(1);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const loadStatus = async () => {
    setStatusLoading(true);
    setStatusError('');
    try {
      const result = await aiApi.status();
      setStatus(result);
    } catch (err) {
      setStatusError(getErrorMessage(err, 'Assistant status could not be loaded.'));
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const examples = status?.examples || [];
  const visibleExamples = useMemo(() => examples.slice(0, 5), [examples]);

  const send = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || text.length < 2 || sending) return;

    const history = messages
      .filter((item) => item.role === 'user' || (item.role === 'assistant' && !item.error))
      .slice(-8)
      .map((item) => ({ role: item.role, content: item.content }));

    nextId.current += 1;
    const userMessage = { id: `m${nextId.current}`, role: 'user', content: text, createdAt: new Date().toISOString() };
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setSending(true);
    setChatError('');

    try {
      const result = await aiApi.chat({ message: text, history });
      nextId.current += 1;
      setMessages((current) => [...current, {
        id: `m${nextId.current}`,
        role: 'assistant',
        content: result?.answer || 'No answer was returned.',
        meta: {
          mode: result?.mode,
          label: result?.label,
          model: result?.model,
          notice: result?.notice,
          toolTrace: result?.toolTrace || [],
        },
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      setChatError(getErrorMessage(err, 'The assistant could not answer that request.'));
    } finally {
      setSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const useSuggestion = (example) => {
    setDraft(example);
    inputRef.current?.focus();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Company"
        title="Assistant"
        description="Ask about attendance, leave, headcount and payroll using live company data. The assistant is read-only and never changes records."
        actions={(
          <button
            type="button"
            className="btn btn-secondary"
            onClick={async () => {
              await loadStatus();
            }}
            disabled={statusLoading}
          >
            <RefreshCw size={15} /> Refresh status
          </button>
        )}
      />

      <div className="ai-layout">
        <section className="chat-card" aria-label="Assistant chat">
          <div className="chat-head">
            <span className="chat-head-icon"><Sparkles size={18} /></span>
            <div>
              <h2>HCM Lite Assistant</h2>
              <p>Read-only access to your permitted company data</p>
            </div>
            {statusLoading ? (
              <span className="badge badge-neutral"><span className="spinner-ring" style={{ width: 10, height: 10 }} /> Checking</span>
            ) : (
              <Badge
                status={status?.mode === 'live' ? 'live' : 'fallback'}
                label={status?.mode === 'live' ? 'Live AI' : 'Rules engine'}
                tone={status?.mode === 'live' ? 'success' : 'neutral'}
                dot
              />
            )}
          </div>

          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <span className="chat-welcome-icon"><Sparkles size={22} /></span>
                <h3>Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h3>
                <p>
                  I can summarize live workspace data you are allowed to see, explain policies and help you draft
                  a leave request. I cannot approve, edit or submit anything.
                </p>
                {visibleExamples.length > 0 && (
                  <div className="chat-suggestions">
                    {visibleExamples.map((example) => (
                      <button type="button" className="chat-suggestion" key={example} onClick={() => useSuggestion(example)}>
                        {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`chat-bubble-row ${message.role === 'user' ? 'is-user' : ''}`}>
                  <span className="chat-bubble-avatar">
                    {message.role === 'user' ? <UserRound size={14} /> : <Sparkles size={14} />}
                  </span>
                  <div className="chat-bubble">
                    {message.content}
                    {message.role === 'assistant' && message.meta && (
                      <>
                        {message.meta.notice && <div className="chat-notice">{message.meta.notice}</div>}
                        <div className="chat-bubble-meta">
                          <span>{message.meta.label || (message.meta.mode === 'live' ? 'AI-assisted answer' : 'Offline assistant')}</span>
                          {message.meta.model && message.meta.model !== 'configured' && <span>· {message.meta.model}</span>}
                          {message.meta.toolTrace?.length > 0 && (
                            <span title={message.meta.toolTrace.map((item) => item.tool).join(', ')}>
                              · {message.meta.toolTrace.length} data tool{message.meta.toolTrace.length === 1 ? '' : 's'} used
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="chat-bubble-row">
                <span className="chat-bubble-avatar"><Sparkles size={14} /></span>
                <div className="chat-bubble" aria-label="Assistant is thinking">
                  <span className="typing"><span /><span /><span /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {chatError && (
            <div style={{ padding: '10px 14px 0' }}>
              <div className="auth-alert" role="alert" style={{ marginBottom: 0 }}>
                <AlertCircle size={15} /><span>{chatError}</span>
              </div>
            </div>
          )}

          <form className="chat-form" onSubmit={send}>
            <label className="sr-only" htmlFor="assistant-message">Message the assistant</label>
            <textarea
              id="assistant-message"
              ref={inputRef}
              rows={1}
              maxLength={2000}
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setChatError(''); }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(event);
                }
              }}
              placeholder="Ask about attendance, leave, headcount or payroll…"
              disabled={sending}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || draft.trim().length < 2}>
              <Send size={15} /> Send
            </button>
          </form>
        </section>

        <aside className="ai-side">
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Workspace context</h2>
                <p className="card-description">The assistant answers within your role permissions.</p>
              </div>
            </div>
            <div className="card-body">
              {statusError ? (
                <div className="notice-item">
                  {statusError}{' '}
                  <button type="button" className="btn-link" onClick={loadStatus}>Try again</button>
                </div>
              ) : statusLoading ? (
                <div className="inline-loading"><Spinner label="Loading context" /> Loading context…</div>
              ) : (
                <>
                  <div className="profile-meta-list">
                    <div className="profile-meta-row">
                      <span>Company</span>
                      <strong>{status?.company?.name || organization?.name || 'Workspace'}</strong>
                    </div>
                    <div className="profile-meta-row">
                      <span>Timezone</span>
                      <strong>{status?.company?.timezone || organization?.timezone || '—'}</strong>
                    </div>
                    <div className="profile-meta-row">
                      <span>Today</span>
                      <strong>{formatDateLong(todayKey(status?.company?.timezone || organization?.timezone))}</strong>
                    </div>
                    <div className="profile-meta-row">
                      <span>Answer source</span>
                      <strong>{status?.mode === 'live' ? 'Hosted AI model' : 'Built-in rules engine'}</strong>
                    </div>
                  </div>
                  <p className="mt-16">
                    The assistant can access only the records permitted by your {user?.role || 'workspace'} role.
                    {isStaff ? ' Staff questions can include company-wide summaries.' : ' Employee questions are limited to your own records.'}
                  </p>
                  {status?.policy && (
                    <div className="notice-item mt-12">
                      <strong>Leave policy:</strong> annual {status.policy.annual} days, sick {status.policy.sick},
                      casual {status.policy.casual}, unpaid {status.policy.unpaid === null ? 'unlimited' : `${status.policy.unpaid} days`}.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <LeavePlanner
            canSubmit={Boolean(employee)}
            onUse={(suggestion) => navigate('/leave', {
              state: {
                suggestion: {
                  leaveType: suggestion.leaveType,
                  startDate: suggestion.startDate,
                  endDate: suggestion.endDate,
                  reason: suggestion.reason,
                },
              },
            })}
          />
        </aside>
      </div>
    </div>
  );
}

function LeavePlanner({ canSubmit, onUse }) {
  const [text, setText] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async () => {
    if (text.trim().length < 5) {
      setError('Describe the dates and type of leave in at least 5 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await aiApi.leaveSuggestion(text.trim());
      setSuggestion(result);
    } catch (err) {
      setSuggestion(null);
      setError(getErrorMessage(err, 'A leave suggestion could not be prepared.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Leave planner</h2>
          <p className="card-description">Turn a sentence into a pre-filled leave request. Nothing is submitted.</p>
        </div>
      </div>
      <div className="card-body">
        <Field
          label="Describe your leave"
          htmlFor="leave-plan-text"
          error={error}
          hint="Include a date or date range, e.g. “sick leave from 2026-11-02 to 2026-11-03”."
        >
          {({ describedBy }) => (
            <textarea
              id="leave-plan-text"
              className="textarea"
              rows={3}
              maxLength={1000}
              value={text}
              onChange={(event) => { setText(event.target.value); setError(''); }}
              aria-invalid={Boolean(error)}
              aria-describedby={describedBy}
              placeholder="I need annual leave next Monday and Tuesday…"
              disabled={busy}
            />
          )}
        </Field>
        <button type="button" className="btn btn-secondary btn-block" onClick={request} disabled={busy || text.trim().length < 5}>
          <Sparkles size={15} /> {busy ? 'Preparing…' : 'Prepare suggestion'}
        </button>

        {suggestion && (
          <div className="leave-plan-result">
            <div className="toolbar" style={{ justifyContent: 'space-between' }}>
              <h4>Suggested request</h4>
              <Badge
                status={suggestion.readyToSubmit ? 'ready' : 'review'}
                label={suggestion.readyToSubmit ? 'Ready to review' : 'Needs review'}
                tone={suggestion.readyToSubmit ? 'success' : 'warning'}
                dot={false}
              />
            </div>
            <div className="leave-plan-grid">
              <div><span>Type</span><strong>{suggestion.leaveTypeLabel || TYPE_LABELS[suggestion.leaveType] || suggestion.leaveType}</strong></div>
              <div><span>Working days</span><strong>{formatNumber(suggestion.days)}</strong></div>
              <div><span>Start</span><strong>{suggestion.startDate ? formatDate(suggestion.startDate) : 'Not found'}</strong></div>
              <div><span>End</span><strong>{suggestion.endDate ? formatDate(suggestion.endDate) : 'Not found'}</strong></div>
            </div>

            {suggestion.validation?.length > 0 && (
              <div className="leave-validation">
                {suggestion.validation.map((item, index) => {
                  const Icon = item.level === 'error'
                    ? AlertCircle
                    : item.level === 'warning' ? AlertTriangle : Info;
                  return (
                    <div key={`${item.level}-${index}`} className={`leave-validation-item ${item.level}`}>
                      <Icon size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{item.message}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {suggestion.note && <p className="mt-12">{suggestion.note}</p>}

            <button
              type="button"
              className="btn btn-primary btn-block mt-12"
              onClick={() => onUse(suggestion)}
              disabled={!canSubmit || !suggestion.startDate || !suggestion.endDate}
            >
              {suggestion.readyToSubmit ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
              {canSubmit ? 'Review in leave form' : 'Requires a linked employee profile'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
