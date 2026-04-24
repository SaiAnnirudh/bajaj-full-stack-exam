const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.use(express.json({ limit: '1mb' }));

const USER_ID = process.env.USER_ID || 'saiannirudh_25032005';
const EMAIL_ID = process.env.EMAIL_ID || 'ss3309@srmist.edu.in';
const ROLL_NUMBER = process.env.ROLL_NUMBER || 'RA2311032010034';

const VALID_EDGE_RE = /^[A-Z]->[A-Z]$/;

function processBFHL(data) {
  const invalid_entries = [];
  const duplicate_edges = [];
  const duplicateSeen = new Set();
  const seenEdges = new Set();
  const validEdges = [];

  for (const raw of data) {
    const original = typeof raw === 'string' ? raw : String(raw ?? '');
    const trimmed = original.trim();

    if (!VALID_EDGE_RE.test(trimmed)) {
      invalid_entries.push(original);
      continue;
    }

    const [parent, child] = trimmed.split('->');

    if (parent === child) {
      invalid_entries.push(original);
      continue;
    }

    const edgeKey = `${parent}->${child}`;
    if (seenEdges.has(edgeKey)) {
      if (!duplicateSeen.has(edgeKey)) {
        duplicate_edges.push(edgeKey);
        duplicateSeen.add(edgeKey);
      }
      continue;
    }
    seenEdges.add(edgeKey);
    validEdges.push({ parent, child });
  }

  const parentOf = new Map();
  const childrenOf = new Map();
  const usedNodes = new Set();

  for (const { parent, child } of validEdges) {
    if (parentOf.has(child)) continue;
    parentOf.set(child, parent);
    usedNodes.add(parent);
    usedNodes.add(child);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push(child);
  }

  const adj = new Map();
  for (const n of usedNodes) adj.set(n, new Set());
  for (const [child, parent] of parentOf.entries()) {
    adj.get(parent).add(child);
    adj.get(child).add(parent);
  }

  const visited = new Set();
  const components = [];

  for (const { parent, child } of validEdges) {
    if (parentOf.get(child) !== parent) continue;
    if (visited.has(parent)) continue;

    const comp = [];
    const queue = [parent];
    while (queue.length) {
      const node = queue.shift();
      if (visited.has(node)) continue;
      visited.add(node);
      comp.push(node);
      for (const nb of adj.get(node) || []) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    components.push(comp);
  }

  const hierarchies = [];
  for (const comp of components) {
    const rootCandidates = comp.filter(n => !parentOf.has(n));

    if (rootCandidates.length === 0) {
      const root = [...comp].sort()[0];
      hierarchies.push({ root, tree: {}, has_cycle: true });
    } else {
      const root = rootCandidates.slice().sort()[0];
      const tree = { [root]: buildSubtree(root, childrenOf) };
      const depth = calcDepth(root, childrenOf);
      hierarchies.push({ root, tree, depth });
    }
  }

  const nonCyclic = hierarchies.filter(h => !h.has_cycle);
  const cyclicCount = hierarchies.length - nonCyclic.length;

  let largest_tree_root = '';
  if (nonCyclic.length > 0) {
    const sorted = nonCyclic.slice().sort((a, b) => {
      if (a.depth !== b.depth) return b.depth - a.depth;
      return a.root < b.root ? -1 : a.root > b.root ? 1 : 0;
    });
    largest_tree_root = sorted[0].root;
  }

  const summary = {
    total_trees: nonCyclic.length,
    total_cycles: cyclicCount,
    largest_tree_root,
  };

  return { hierarchies, invalid_entries, duplicate_edges, summary };
}

function buildSubtree(node, childrenOf) {
  const out = {};
  const kids = childrenOf.get(node) || [];
  for (const k of kids) out[k] = buildSubtree(k, childrenOf);
  return out;
}

function calcDepth(node, childrenOf) {
  const kids = childrenOf.get(node) || [];
  if (kids.length === 0) return 1;
  let best = 0;
  for (const k of kids) {
    const d = calcDepth(k, childrenOf);
    if (d > best) best = d;
  }
  return 1 + best;
}

app.post('/bfhl', (req, res) => {
  try {
    const body = req.body;
    if (!body || !Array.isArray(body.data)) {
      return res.status(400).json({
        is_success: false,
        error: 'Request body must contain a "data" field that is an array.',
      });
    }
    const result = processBFHL(body.data);
    return res.status(200).json({
      user_id: USER_ID,
      email_id: EMAIL_ID,
      college_roll_number: ROLL_NUMBER,
      ...result,
    });
  } catch (e) {
    return res.status(500).json({ is_success: false, error: 'Internal server error' });
  }
});

app.get('/bfhl', (req, res) => {
  res.status(200).json({ operation_code: 1 });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'SRM BFHL API is running.',
    usage: 'POST /bfhl with { "data": ["A->B", "B->C"] }',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SRM BFHL API listening on port ${PORT}`);
});

module.exports = app;