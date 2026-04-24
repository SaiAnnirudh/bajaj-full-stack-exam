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
        
        const adj = {};
        const inDegree = {};
        const parentMap = {};
        const allNodes = new Set();

        data.forEach(item => {
            if (typeof item !== 'string') return;
            const edge = item.trim();

           
            if (!/^[A-Z]->[A-Z]$/.test(edge) || edge === edge[3]) {
                invalid_entries.push(edge);
                return;
            }

            if (seenEdges.has(edge)) {
                duplicate_edges.push(edge);
                return;
            }
            seenEdges.add(edge);

            const parent = edge;
            const child = edge[3];

            if (parentMap[child]) return; 
            
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
            return { tree: treeObj, maxDepth: maxDepth + 1 }; 
        };


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


        sortedNodes.forEach(node => {
            if (!visited.has(node)) {
                let curr = node;
                const cycleComponent = [];
                while (!visited.has(curr)) {
                    visited.add(curr);
                    cycleComponent.push(curr);
                    curr = adj[curr] ? adj[curr] : null; 
                }
                
                cycleComponent.sort();
                hierarchies.push({
                    root: cycleComponent,
                    tree: {},
                    has_cycle: true
                });
                total_cycles++;
            }
        });

        let largest_tree_root = null;
        let max_depth = 0;

        hierarchies.forEach(h => {
            if (!h.has_cycle) {
                if (h.depth > max_depth) {
                    max_depth = h.depth;
                    largest_tree_root = h.root;
                } else if (h.depth === max_depth && max_depth > 0) {
                    if (!largest_tree_root || h.root < largest_tree_root) {
                        largest_tree_root = h.root;
                    }
                }
            }
        });

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