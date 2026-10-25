import { ok } from '../utils/http.mjs';
import { requireString } from '../utils/validate.mjs';
import { getOrganization, orgConfig } from '../services/orgService.mjs';
import { chat, isProviderConfigured, parseLeaveSuggestion } from '../services/aiService.mjs';
import { nowParts } from '../utils/dates.mjs';
import { recordAudit } from '../services/auditService.mjs';

export async function assistantStatus(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  ok(res, {
    providerConfigured: isProviderConfigured(),
    mode: isProviderConfigured() ? 'live' : 'fallback',
    model: isProviderConfigured() ? 'configured' : null,
    company: { name: org.name, currency: config.currency, timezone: config.timezone },
    policy: config.leavePolicy,
    examples: [
      'Show today’s attendance summary.',
      'Who arrived late today?',
      'How many leave requests are pending?',
      'How many employees are in the company?',
      'Explain the company’s leave policy.',
      'Help me prepare a leave request for next week.'
    ]
  });
}

export async function askAssistant(req, res) {
  const message = requireString(req.body?.message, 'Message', { min: 2, max: 2000 });
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const result = await chat({ user: req.user, message, history });
  await recordAudit({
    req, actor: req.user, action: 'ai.query', entityType: 'AiAssistant', entityId: null,
    summary: `AI ${result.mode} query`, after: { mode: result.mode, tools: result.toolTrace?.map((item) => item.tool) || [] }
  });
  ok(res, result);
}

export async function leaveSuggestion(req, res) {
  const org = await getOrganization();
  const config = orgConfig(org);
  const { dateKey: todayKey } = nowParts(config.timezone);
  const text = requireString(req.body?.text, 'Request', { min: 5, max: 1000 });
  ok(res, parseLeaveSuggestion({ text, org, todayKey }));
}
