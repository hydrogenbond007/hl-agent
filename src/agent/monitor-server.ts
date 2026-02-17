import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { HyperliquidAgent } from './agent.js';
import type { HyperliquidAgentToolkit } from '../toolkit/hyperliquid-toolkit.js';
import type { Position } from '../types/index.js';

export interface AgentMonitorServerConfig {
  agent: HyperliquidAgent;
  toolkit: HyperliquidAgentToolkit;
  port?: number;
  host?: string;
  refreshMs?: number;
}

export interface AgentMonitorServer {
  port: number;
  stop: () => Promise<void>;
}

interface MonitorSnapshot {
  now: number;
  state: ReturnType<HyperliquidAgent['getState']>;
  trades: ReturnType<HyperliquidAgent['getTradeLogs']>;
  balance: {
    accountValue: number;
    availableBalance: number;
    marginUsed: number;
    withdrawable: number;
  } | null;
  positions: Position[];
  derivedPnl: {
    baselineAccountValue: number | null;
    accountValueDelta: number | null;
    accountValueDeltaPercent: number | null;
    unrealizedPnl: number;
  };
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agent Monitor</title>
  <style>
    :root {
      --bg: #f5f3ef;
      --panel: #fffdfa;
      --ink: #1f2328;
      --muted: #6b7280;
      --ok: #0f766e;
      --bad: #b91c1c;
      --line: #e5e7eb;
      --accent: #0ea5e9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      color: var(--ink);
      background: radial-gradient(circle at top right, #e0f2fe 0%, transparent 35%), var(--bg);
    }
    .wrap {
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
    }
    .head {
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    h1 { margin: 0; font-size: 22px; }
    .stamp { color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
    }
    .label { color: var(--muted); font-size: 12px; margin-bottom: 4px; }
    .value { font-size: 20px; font-weight: 600; }
    .ok { color: var(--ok); }
    .bad { color: var(--bad); }
    .section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    .section h2 {
      margin: 0;
      padding: 10px 12px;
      font-size: 14px;
      border-bottom: 1px solid var(--line);
      background: #fafafa;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid var(--line);
      text-align: left;
      padding: 8px 10px;
      vertical-align: top;
    }
    th { color: var(--muted); font-weight: 600; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    @media (max-width: 800px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1>Hyperliquid Agent Monitor</h1>
      <div class="stamp" id="stamp">Connecting...</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Agent Status</div>
        <div class="value" id="agentStatus">-</div>
      </div>
      <div class="card">
        <div class="label">Ticks</div>
        <div class="value" id="ticks">-</div>
      </div>
      <div class="card">
        <div class="label">Total Trades</div>
        <div class="value" id="totalTrades">-</div>
      </div>
      <div class="card">
        <div class="label">Errors</div>
        <div class="value" id="errors">-</div>
      </div>
      <div class="card">
        <div class="label">Account Value</div>
        <div class="value mono" id="accountValue">-</div>
      </div>
      <div class="card">
        <div class="label">Available Balance</div>
        <div class="value mono" id="availableBalance">-</div>
      </div>
      <div class="card">
        <div class="label">PnL (Since Start)</div>
        <div class="value mono" id="pnlSinceStart">-</div>
      </div>
      <div class="card">
        <div class="label">Unrealized PnL</div>
        <div class="value mono" id="unrealizedPnl">-</div>
      </div>
    </div>

    <div class="section">
      <h2>Open Positions</h2>
      <table>
        <thead>
          <tr>
            <th>Coin</th>
            <th>Side</th>
            <th>Size</th>
            <th>Entry</th>
            <th>Current</th>
            <th>Unrealized PnL</th>
          </tr>
        </thead>
        <tbody id="positionsBody"></tbody>
      </table>
    </div>

    <div class="section">
      <h2>Recent Trades</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Coin</th>
            <th>Status</th>
            <th>Reason / Error</th>
          </tr>
        </thead>
        <tbody id="tradesBody"></tbody>
      </table>
    </div>
  </div>

  <script>
    const fmtUsd = (n) => n == null ? '-' : '$' + Number(n).toFixed(2);
    const fmtNum = (n, d = 2) => Number(n).toFixed(d);
    const stamp = document.getElementById('stamp');

    function render(snapshot) {
      stamp.textContent = 'Updated: ' + new Date(snapshot.now).toLocaleTimeString();

      document.getElementById('agentStatus').textContent = snapshot.state.isRunning ? 'Running' : 'Stopped';
      document.getElementById('ticks').textContent = String(snapshot.state.tickCount);
      document.getElementById('totalTrades').textContent = String(snapshot.state.totalTrades);
      document.getElementById('errors').textContent = String(snapshot.state.errors.length);

      document.getElementById('accountValue').textContent = fmtUsd(snapshot.balance?.accountValue ?? null);
      document.getElementById('availableBalance').textContent = fmtUsd(snapshot.balance?.availableBalance ?? null);

      const delta = snapshot.derivedPnl.accountValueDelta;
      const deltaPct = snapshot.derivedPnl.accountValueDeltaPercent;
      const pnlEl = document.getElementById('pnlSinceStart');
      pnlEl.textContent = delta == null ? '-' : fmtUsd(delta) + (deltaPct == null ? '' : ' (' + deltaPct.toFixed(2) + '%)');
      pnlEl.className = 'value mono ' + (delta == null ? '' : (delta >= 0 ? 'ok' : 'bad'));

      const unrealized = snapshot.derivedPnl.unrealizedPnl;
      const unEl = document.getElementById('unrealizedPnl');
      unEl.textContent = fmtUsd(unrealized);
      unEl.className = 'value mono ' + (unrealized >= 0 ? 'ok' : 'bad');

      const positionsBody = document.getElementById('positionsBody');
      positionsBody.innerHTML = '';
      for (const p of snapshot.positions) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td>' + p.coin + '</td>' +
          '<td>' + p.side + '</td>' +
          '<td class="mono">' + fmtNum(p.size, 4) + '</td>' +
          '<td class="mono">' + fmtUsd(p.entryPrice) + '</td>' +
          '<td class="mono">' + fmtUsd(p.currentPrice) + '</td>' +
          '<td class="mono ' + (p.unrealizedPnl >= 0 ? 'ok' : 'bad') + '">' + fmtUsd(p.unrealizedPnl) + '</td>';
        positionsBody.appendChild(tr);
      }
      if (!snapshot.positions.length) {
        positionsBody.innerHTML = '<tr><td colspan="6" style="color:#6b7280;">No open positions</td></tr>';
      }

      const tradesBody = document.getElementById('tradesBody');
      tradesBody.innerHTML = '';
      const recentTrades = [...snapshot.trades].slice(-25).reverse();
      for (const t of recentTrades) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td class="mono">' + new Date(t.timestamp).toLocaleTimeString() + '</td>' +
          '<td>' + t.action + '</td>' +
          '<td>' + t.coin + '</td>' +
          '<td class="' + (t.success ? 'ok' : 'bad') + '">' + (t.success ? 'success' : 'failed') + '</td>' +
          '<td>' + (t.error || t.reason || '-') + '</td>';
        tradesBody.appendChild(tr);
      }
      if (!recentTrades.length) {
        tradesBody.innerHTML = '<tr><td colspan="5" style="color:#6b7280;">No trades yet</td></tr>';
      }
    }

    const source = new EventSource('/events');
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        render(payload);
      } catch (_) {}
    };
    source.onerror = () => {
      stamp.textContent = 'Disconnected. Retrying...';
    };
  </script>
</body>
</html>
`;

export async function startAgentMonitorServer(
  config: AgentMonitorServerConfig
): Promise<AgentMonitorServer> {
  const {
    agent,
    toolkit,
    port = 8787,
    host = '127.0.0.1',
    refreshMs = 2_000,
  } = config;

  const clients = new Set<ServerResponse<IncomingMessage>>();
  let baselineAccountValue: number | null = null;
  let timer: NodeJS.Timeout | undefined;

  const getSnapshot = async (): Promise<MonitorSnapshot> => {
    const [balanceResult, positionsResult] = await Promise.all([
      toolkit.getBalance(),
      toolkit.getPositions(),
    ]);

    const balance = balanceResult.success ? balanceResult.data! : null;
    const positions = positionsResult.success ? positionsResult.data! : [];

    if (baselineAccountValue === null && balance) {
      baselineAccountValue = balance.accountValue;
    }

    const accountValueDelta =
      baselineAccountValue !== null && balance
        ? balance.accountValue - baselineAccountValue
        : null;

    const accountValueDeltaPercent =
      baselineAccountValue && accountValueDelta !== null
        ? (accountValueDelta / baselineAccountValue) * 100
        : null;

    const unrealizedPnl = positions.reduce((sum, position) => sum + position.unrealizedPnl, 0);

    return {
      now: Date.now(),
      state: agent.getState(),
      trades: agent.getTradeLogs(),
      balance,
      positions,
      derivedPnl: {
        baselineAccountValue,
        accountValueDelta,
        accountValueDeltaPercent,
        unrealizedPnl,
      },
    };
  };

  const broadcastSnapshot = async () => {
    if (clients.size === 0) return;
    try {
      const payload = JSON.stringify(await getSnapshot());
      for (const res of clients) {
        res.write(`data: ${payload}\n\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const payload = JSON.stringify({ now: Date.now(), error: message });
      for (const res of clients) {
        res.write(`data: ${payload}\n\n`);
      }
    }
  };

  const server = createServer(async (req, res) => {
    if (!req.url) {
      res.statusCode = 400;
      res.end('Bad request');
      return;
    }

    if (req.url === '/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      });
      res.write('retry: 2000\n\n');
      clients.add(res);

      try {
        const initial = JSON.stringify(await getSnapshot());
        res.write(`data: ${initial}\n\n`);
      } catch {}

      req.on('close', () => {
        clients.delete(res);
      });
      return;
    }

    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(DASHBOARD_HTML);
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve());
  });

  timer = setInterval(() => {
    void broadcastSnapshot();
  }, refreshMs);

  void broadcastSnapshot();

  const address = server.address() as AddressInfo;
  return {
    port: address.port,
    stop: async () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }

      for (const res of clients) {
        res.end();
      }
      clients.clear();

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}
