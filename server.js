const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const USER_ID = "saiannirudh_25032005";
const EMAIL_ID = "ss3309@srmist.edu.in";
const ROLL_NUMBER = "RA2311032010034";

app.post('/bfhl', (req, res) => {
    try {
        const { data } = req.body;
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid payload: 'data' must be an array." });
        }

        const invalid_entries = [];
        const duplicate_edges = [];
        const seenEdges = new Set();
        
        const adj = {};       // Adjacency list for graph
        const inDegree = {};  // To track incoming edges
        const parentMap = {}; // Enforces the multi-parent rule
        const allNodes = new Set();

        // 1. Parse Input & Apply Rules 
        data.forEach(item => {
            if (typeof item !== 'string') return;
            const edge = item.trim();

            // Validate format: single uppercase letter -> single uppercase letter [cite: 37]
            // Rejects "hello", "1->2", "A->", "A->A" (self-loops) [cite: 39]
            if (!/^[A-Z]->[A-Z]$/.test(edge) || edge === edge[3]) {
                invalid_entries.push(edge);
                return;
            }

            // Duplicate Edge Rule [cite: 40-43]
            if (seenEdges.has(edge)) {
                duplicate_edges.push(edge);
                return;
            }
            seenEdges.add(edge);

            const parent = edge;
            const child = edge[3];

            // Multi-parent rule: first parent wins, rest silently discarded 
            if (parentMap[child]) return; 
            
            // Build Graph
            parentMap[child] = parent;
            if (!adj[parent]) adj[parent] = [];
            adj[parent].push(child);
            
            allNodes.add(parent);
            allNodes.add(child);
            
            inDegree[child] = (inDegree[child] || 0) + 1;
            if (inDegree[parent] === undefined) inDegree[parent] = 0;
        });

        const hierarchies = [];
        const visited = new Set();
        let total_trees = 0;
        let total_cycles = 0;

        // DFS function to recursively build the nested tree object
        const buildTree = (node) => {
            visited.add(node);
            const treeObj = {};
            let maxDepth = 0;

            if (adj[node]) {
                for (const child of adj[node]) {
                    const childResult = buildTree(child);
                    treeObj[child] = childResult.tree;
                    maxDepth = Math.max(maxDepth, childResult.maxDepth);
                }
            }
            // Depth is nodes on longest path. A single node has depth 1. [cite: 58]
            return { tree: treeObj, maxDepth: maxDepth + 1 }; 
        };

        // 2. Identify Trees from valid roots [cite: 47]
        // Sort alphabetically to handle lexicographical tiebreakers natively [cite: 62]
        const sortedNodes = Array.from(allNodes).sort();
        
        sortedNodes.forEach(node => {
            if (inDegree[node] === 0 && !visited.has(node)) {
                const { tree, maxDepth } = buildTree(node);
                hierarchies.push({
                    root: node,
                    tree: { [node]: tree },
                    depth: maxDepth
                });
                total_trees++;
            }
        });

        // 3. Identify Pure Cycles [cite: 50]
        // Any unvisited nodes left over must be part of a pure cycle.
        sortedNodes.forEach(node => {
            if (!visited.has(node)) {
                // Find all nodes in this isolated cyclic component
                let curr = node;
                const cycleComponent = [];
                while (!visited.has(curr)) {
                    visited.add(curr);
                    cycleComponent.push(curr);
                    curr = adj[curr] ? adj[curr] : null; 
                }
                
                // Lexicographically smallest node is the root [cite: 50]
                cycleComponent.sort();
                hierarchies.push({
                    root: cycleComponent,
                    tree: {}, // Empty tree for cycles [cite: 54]
                    has_cycle: true
                });
                total_cycles++;
            }
        });

        // 4. Summary Calculation [cite: 60-63]
        let largest_tree_root = null;
        let max_depth = 0;

        hierarchies.forEach(h => {
            if (!h.has_cycle) {
                if (h.depth > max_depth) {
                    max_depth = h.depth;
                    largest_tree_root = h.root;
                } else if (h.depth === max_depth && max_depth > 0) {
                    // Tiebreaker: Lexicographically smaller root [cite: 62]
                    if (!largest_tree_root || h.root < largest_tree_root) {
                        largest_tree_root = h.root;
                    }
                }
            }
        });

        // 5. Construct Final Response [cite: 14]
        res.status(200).json({
            user_id: USER_ID,
            email_id: EMAIL_ID,
            college_roll_number: ROLL_NUMBER,
            hierarchies,
            invalid_entries,
            duplicate_edges,
            summary: {
                total_trees,
                total_cycles,
                largest_tree_root: largest_tree_root || ""
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));