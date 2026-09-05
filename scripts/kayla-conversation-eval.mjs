import { createServer } from 'vite';

const root = process.cwd();
const vite = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } });
try {
  const [{ conversationCases }, { resolveConversation }, { handleKaylaChat }, { createKaylaConfig }] = await Promise.all([
    vite.ssrLoadModule('/test/kayla/conversations.ts'),
    vite.ssrLoadModule('/src/lib/kayla/conversation.ts'),
    vite.ssrLoadModule('/src/lib/kayla/handler.ts'),
    vite.ssrLoadModule('/src/lib/kayla/config.ts')
  ]);

  const metrics = { scenarios: conversationCases.length, turns: 0, assertions: 0, clarifications: 0, failures: 0, routeModes: {} };
  const config = {
    providerConfig: { provider: 'openrouter', model: 'openrouter/free', apiKey: 'phase14-eval' },
    kaylaConfig: { ...createKaylaConfig({}), enabled: true },
    consumeRequestAllowance: async () => true,
    consumeAIAllowance: async () => false,
    onDiagnostics: ({ routeMode }) => { metrics.routeModes[routeMode] = (metrics.routeModes[routeMode] || 0) + 1; }
  };

  for (const scenario of conversationCases) {
    const history = [];
    for (const turn of scenario.turns) {
      metrics.turns++;
      const context = resolveConversation(turn.message, history.slice(-10), {
        route: scenario.page || '/',
        pageType: scenario.page?.startsWith('/projects/') ? 'project' : 'home'
      });
      const response = await handleKaylaChat({ message: turn.message, history: history.slice(-10), context: {
        route: scenario.page || '/',
        pageType: scenario.page?.startsWith('/projects/') ? 'project' : 'home'
      } }, config);
      const answer = response.response?.answer || '';
      const checks = [
        ...(turn.includes || []).map(value => answer.toLowerCase().includes(value.toLowerCase())),
        ...(turn.excludes || []).map(value => !answer.toLowerCase().includes(value.toLowerCase())),
        ...(turn.action ? [response.response?.actions?.[0]?.href === turn.action] : []),
        ...(turn.entity ? [context.entities.includes(turn.entity)] : []),
        ...(turn.clarify === undefined ? [] : [context.needsClarification === turn.clarify])
      ];
      metrics.assertions += checks.length;
      if (response.status !== 200 || checks.some(ok => !ok)) metrics.failures++;
      if (context.needsClarification) metrics.clarifications++;
      history.push({ role: 'user', content: turn.message }, { role: 'assistant', content: answer.slice(0, 2000) });
    }
  }
  metrics.providerNeeded = metrics.routeModes.provider_accepted || 0;
  metrics.providerAvoided = (metrics.routeModes.deterministic || 0) + (metrics.routeModes.retrieval || 0) + (metrics.routeModes.no_results || 0);
  console.log(JSON.stringify(metrics, null, 2));
  if (metrics.failures) process.exitCode = 1;
} finally {
  await vite.close();
}
