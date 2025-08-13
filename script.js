let nodeId = 0;
const connections = [];
let isResizing = false;
let resizeStartWidth, resizeStartHeight, resizeStartX, resizeStartY;
let centralNode = null;
let darkMode = true;

function validateNodeText(text) {
    return (!text || text.trim() === '') ? "New Skill" : text;
}

function createNode(x, y, text = "Skill", width = 80, height = 80, isCentral = false) {
    const validatedText = validateNodeText(text);
    const node = document.createElement("div");
    node.className = "node";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.dataset.id = nodeId++;
    if (isCentral) node.classList.add("central-node");

    const content = document.createElement("div");
    content.className = "node-content";
    content.textContent = validatedText;
    content.contentEditable = true;

    content.addEventListener('input', function () {
        if (!this.textContent || this.textContent.trim() === '') {
            this.textContent = validatedText;
        }
        autoResizeNode(node, content);
    });

    content.addEventListener('blur', function () {
        if (!this.textContent || this.textContent.trim() === '') {
            this.textContent = validatedText;
            autoResizeNode(node, content);
        }
    });

    const controls = document.createElement("div");
    controls.className = "node-controls";

    if (!isCentral) {
        const removeButton = document.createElement("button");
        removeButton.className = "control-button remove";
        removeButton.innerHTML = '<i class="fas fa-times"></i>';
        removeButton.onclick = (e) => {
            e.stopPropagation();
            removeNode(node);
        };
        controls.appendChild(removeButton);
    }

    const addButton = document.createElement("div");
    addButton.className = "add-button";
    addButton.innerHTML = '<i class="fas fa-plus"></i>';
    addButton.onclick = (e) => {
        e.stopPropagation();
        const rect = node.getBoundingClientRect();
        const treeRect = document.getElementById("skill-tree").getBoundingClientRect();
        const newNode = createNode(
            rect.left - treeRect.left + rect.width + 20,
            rect.top - treeRect.top,
            "New Skill"
        );
        document.getElementById("skill-tree").appendChild(newNode);
        createConnection(node, newNode);
        makeDraggable(newNode);
    };

    controls.appendChild(addButton);
    node.appendChild(content);
    node.appendChild(controls);
    autoResizeNode(node, content);
    setTimeout(connectOrphanNodes, 0);
    return node;
}

function autoResizeNode(node, content) {
    const tempSpan = document.createElement("span");
    tempSpan.style.visibility = "hidden";
    tempSpan.style.whiteSpace = "nowrap";
    tempSpan.style.position = "absolute";
    tempSpan.textContent = content.textContent || " ";
    document.body.appendChild(tempSpan);

    const textWidth = tempSpan.offsetWidth;
    const newWidth = Math.max(80, Math.min(300, textWidth + 40));
    const lineHeight = 20;
    const lineCount = content.textContent.split('\n').length;
    const newHeight = Math.max(80, lineCount * lineHeight + 30);

    document.body.removeChild(tempSpan);
    content.style.display = "flex";
    content.style.alignItems = "center";
    content.style.justifyContent = "center";
    content.style.height = "100%";
    content.style.width = "100%";
}

function startResizing(node, e) {
    isResizing = true;
    resizeStartWidth = parseInt(node.style.width);
    resizeStartHeight = parseInt(node.style.height);
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;

    document.onmousemove = function (e) {
        if (!isResizing) return;
        const width = resizeStartWidth + (e.clientX - resizeStartX);
        const height = resizeStartHeight + (e.clientY - resizeStartY);
        node.style.width = `${Math.max(80, width)}px`;
        node.style.height = `${Math.max(80, height)}px`;
        connections.forEach(conn => {
            if (conn.node1 === node || conn.node2 === node) {
                conn.update();
            }
        });
    };

    document.onmouseup = function () {
        isResizing = false;
        document.onmousemove = null;
        document.onmouseup = null;
    };
}

function removeNode(node) {
    const nodeConnections = connections.filter(conn =>
        conn.node1 === node || conn.node2 === node
    );
    const connectedNodes = [];
    nodeConnections.forEach(conn => {
        connectedNodes.push(conn.node1 === node ? conn.node2 : conn.node1);
    });

    nodeConnections.forEach(conn => {
        conn.element.remove();
        const index = connections.indexOf(conn);
        if (index > -1) {
            connections.splice(index, 1);
        }
    });

    if (connectedNodes.length >= 2) {
        createConnection(connectedNodes[0], connectedNodes[connectedNodes.length - 1]);
    }

    node.remove();
    setTimeout(connectOrphanNodes, 0);
}

function createConnection(node1, node2) {
    const exists = connections.some(conn =>
        (conn.node1 === node1 && conn.node2 === node2) ||
        (conn.node1 === node2 && conn.node2 === node1)
    );

    if (exists) return null;

    const tree = document.getElementById("skill-tree");
    const connection = document.createElement("div");
    connection.className = "connection";
    connection.dataset.node1 = node1.dataset.id;
    connection.dataset.node2 = node2.dataset.id;
    tree.appendChild(connection);

    function updateConnection() {
        const rect1 = node1.getBoundingClientRect();
        const rect2 = node2.getBoundingClientRect();
        const treeRect = tree.getBoundingClientRect();

        const x1 = rect1.left + rect1.width / 2 - treeRect.left;
        const y1 = rect1.top + rect1.height / 2 - treeRect.top;
        const x2 = rect2.left + rect2.width / 2 - treeRect.left;
        const y2 = rect2.top + rect2.height / 2 - treeRect.top;

        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        connection.style.width = `${length}px`;
        connection.style.left = `${x1}px`;
        connection.style.top = `${y1}px`;
        connection.style.transform = `rotate(${angle}deg)`;
    }

    connections.push({
        node1, node2, element: connection, update: updateConnection
    });

    updateConnection();
    connection.style.cursor = "pointer";
    connection.addEventListener('click', (e) => {
        if (e.ctrlKey) {
            addNodeBetween(node1, node2, e);
        }
    });

    return connection;
}

function addNodeBetween(node1, node2, event) {
    const rect1 = node1.getBoundingClientRect();
    const rect2 = node2.getBoundingClientRect();
    const treeRect = document.getElementById("skill-tree").getBoundingClientRect();

    const x = (rect1.left + rect2.left) / 2 - treeRect.left;
    const y = (rect1.top + rect2.top) / 2 - treeRect.top;

    const newNode = createNode(x, y, "New Skill");
    document.getElementById("skill-tree").appendChild(newNode);
    makeDraggable(newNode);

    const connectionIndex = connections.findIndex(conn =>
        (conn.node1 === node1 && conn.node2 === node2) ||
        (conn.node1 === node2 && conn.node2 === node1)
    );
    if (connectionIndex > -1) {
        connections[connectionIndex].element.remove();
        connections.splice(connectionIndex, 1);
    }

    createConnection(node1, newNode);
    createConnection(newNode, node2);

    if (event) event.stopPropagation();
}

function isConnectedToCentral(node) {
    if (node === centralNode) return true;
    const visited = new Set();
    const queue = [node];

    while (queue.length > 0) {
        const currentNode = queue.shift();
        if (currentNode === centralNode) return true;
        if (visited.has(currentNode)) continue;
        visited.add(currentNode);

        const connectedNodes = connections
            .filter(conn => conn.node1 === currentNode || conn.node2 === currentNode)
            .map(conn => conn.node1 === currentNode ? conn.node2 : conn.node1);

        queue.push(...connectedNodes);
    }

    return false;
}

function connectOrphanNodes() {
    const allNodes = Array.from(document.querySelectorAll('.node'));
    const orphanNodes = allNodes.filter(node => !isConnectedToCentral(node) && node !== centralNode);

    orphanNodes.forEach(node => {
        const connectedNodes = allNodes.filter(n => isConnectedToCentral(n) && n !== node);
        let closestNode = null;
        let minDistance = Infinity;

        connectedNodes.forEach(connectedNode => {
            const rect1 = node.getBoundingClientRect();
            const rect2 = connectedNode.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(rect2.left - rect1.left, 2) +
                Math.pow(rect2.top - rect1.top, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestNode = connectedNode;
            }
        });

        if (closestNode) {
            createConnection(node, closestNode);
        } else if (centralNode) {
            createConnection(node, centralNode);
        }
    });
}

function toggleTheme() {
    darkMode = !darkMode;
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');

    if (darkMode) {
        body.classList.remove('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Ultra-compact export (returns minimal JSON string)
function exportSkillTree() {
    const data = [
        // Nodes array: [id, x, y, text, isCentral]
        [...document.querySelectorAll('.node')].map(n => [
            n.dataset.id,
            parseInt(n.style.left),
            parseInt(n.style.top),
            n.querySelector('.node-content').textContent,
            n.classList.contains('central-node')
        ]),
        
        // Connections array: [id1, id2]
        connections.map(c => [c.node1.dataset.id, c.node2.dataset.id]),
        
        // Dark mode flag
        darkMode
    ];
    
    return JSON.stringify(data);
}

// Import from compact JSON
function importSkillTree(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        if (!Array.isArray(data) || data.length < 2) return false;
        
        // Clear existing tree
        const tree = document.getElementById('skill-tree');
        tree.innerHTML = '';
        connections.length = 0;
        nodeId = 0;
        
        // Rebuild nodes
        const nodeMap = {};
        data[0].forEach(n => {
            const node = createNode(n[1], n[2], n[3], 80, 80, n[4]);
            tree.appendChild(node);
            makeDraggable(node);
            nodeMap[n[0]] = node;
            if (n[4]) centralNode = node;
        });
        
        // Rebuild connections
        data[1].forEach(c => {
            const n1 = nodeMap[c[0]], n2 = nodeMap[c[1]];
            if (n1 && n2) createConnection(n1, n2);
        });
        
        // Restore theme
        if (data[2] !== undefined) {
            darkMode = data[2];
            document.body.classList.toggle('light-theme', !darkMode);
            document.getElementById('theme-toggle').innerHTML = 
                darkMode ? '<i class="fas fa-moon"></i>' : '<i class="fas fa-sun"></i>';
        }
        
        return true;
    } catch (e) {
        console.error('Import failed:', e);
        return false;
    }
}

// Usage example:
document.getElementById('export-btn').addEventListener('click', () => {
    const json = exportSkillTree();
    navigator.clipboard.writeText(json).then(() => {
        //alert('Copied to clipboard!');
    });
});

document.getElementById('import-btn').addEventListener('click', () => {
    const json = document.getElementById('import-input').value;
    if (json && importSkillTree(json)) {
        //alert('Import successful!');
    } else {
        //alert('Invalid skill tree data!');
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const tree = document.getElementById("skill-tree");
    const centerX = tree.offsetWidth / 2 - 40;
    const centerY = tree.offsetHeight / 2 - 40;
    centralNode = createNode(centerX, centerY, "Central Skill", 100, 100, true);
    tree.appendChild(centralNode);
    makeDraggable(centralNode);

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    document.getElementById('export-btn').addEventListener('click', () => {
        const token = exportSkillTree();
        const tokenDisplay = document.getElementById('export-token');
        tokenDisplay.textContent = token;
        
        navigator.clipboard.writeText(token).then(() => {
            const originalText = tokenDisplay.textContent;
            tokenDisplay.textContent = 'Copied to clipboard!';
            setTimeout(() => {
                tokenDisplay.textContent = originalText;
            }, 2000);
        });
    });

     document.getElementById('export-btn').addEventListener('click', () => {
        const token = exportSkillTree();
        const tokenDisplay = document.getElementById('export-token');
        tokenDisplay.textContent = token;
        
        // คัดลอก token ไปยัง clipboard
        navigator.clipboard.writeText(token).then(() => {
            const originalText = tokenDisplay.textContent;
            tokenDisplay.textContent = 'Copied to clipboard!';
            setTimeout(() => {
                tokenDisplay.textContent = originalText;
            }, 2000);
        });
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        const token = document.getElementById('import-input').value.trim();
        if (token) {
            const success = importSkillTree(token);
            const importInput = document.getElementById('import-input');
            if (success) {
                importInput.value = '';
                importInput.placeholder = 'Import successful!';
                setTimeout(() => {
                    importInput.placeholder = 'Paste token here';
                }, 2000);
            } else {
                importInput.value = '';
                importInput.placeholder = 'Invalid token!';
                setTimeout(() => {
                    importInput.placeholder = 'Paste token here';
                }, 2000);
            }
        }
    });

    document.getElementById('skill-tree').addEventListener('mousedown', startSelection);


});

let selectedNodes = new Set();
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionBox = null;

function createSelectionBox() {
    selectionBox = document.createElement('div');
    selectionBox.className = 'selection-box';
    document.getElementById('skill-tree').appendChild(selectionBox);
    return selectionBox;
}

function updateSelectionBox(x, y, width, height) {
    if (!selectionBox) return;
    selectionBox.style.left = `${Math.min(x, x + width)}px`;
    selectionBox.style.top = `${Math.min(y, y + height)}px`;
    selectionBox.style.width = `${Math.abs(width)}px`;
    selectionBox.style.height = `${Math.abs(height)}px`;
}

function clearSelection() {
    selectedNodes.forEach(node => {
        node.classList.remove('selected');
    });
    selectedNodes.clear();
}

function selectNodesInBox(box) {
    const nodes = document.querySelectorAll('.node');
    const treeRect = document.getElementById('skill-tree').getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();

    nodes.forEach(node => {
        const nodeRect = node.getBoundingClientRect();
        if (
            nodeRect.right > boxRect.left &&
            nodeRect.left < boxRect.right &&
            nodeRect.bottom > boxRect.top &&
            nodeRect.top < boxRect.bottom
        ) {
            node.classList.add('selected');
            selectedNodes.add(node);
        }
    });
}

function startSelection(e) {
    // Prevent starting a selection if clicking on a node, connection, or UI controls.
    if (e.target.closest('.node') || e.target.closest('.connection') || e.target.closest('.controls')) return;

    // On mousedown on the canvas, clear the current selection.
    clearSelection();

    isSelecting = true;
    selectionStart = { x: e.clientX, y: e.clientY };
    createSelectionBox();

    document.addEventListener('mousemove', handleSelectionMove);
    document.addEventListener('mouseup', endSelection);
}

function handleSelectionMove(e) {
    if (!isSelecting) return;

    const width = e.clientX - selectionStart.x;
    const height = e.clientY - selectionStart.y;
    updateSelectionBox(selectionStart.x, selectionStart.y, width, height);
}

function endSelection() {
    if (isSelecting) {
        if (selectionBox) {
            selectNodesInBox(selectionBox);
            selectionBox.remove();
            selectionBox = null;
        }
        isSelecting = false;
        document.removeEventListener('mousemove', handleSelectionMove);
        document.removeEventListener('mouseup', endSelection);
    }
}

function makeDraggable(node) {
    let initialMouseX, initialMouseY;
    let isDragging = false;
    const initialNodePositions = new Map();

    node.onmousedown = function (e) {
        if (e.target.classList.contains("add-button") || e.target.classList.contains("control-button") || e.target.isContentEditable) {
            return;
        }
        e.preventDefault();

        if (e.shiftKey) {
            node.classList.toggle('selected');
            if (node.classList.contains('selected')) {
                selectedNodes.add(node);
            } else {
                selectedNodes.delete(node);
            }
            return;
        }

        if (!selectedNodes.has(node)) {
            clearSelection();
            node.classList.add('selected');
            selectedNodes.add(node);
        }

        isDragging = true;
        initialMouseX = e.clientX;
        initialMouseY = e.clientY;

        initialNodePositions.clear();
        selectedNodes.forEach(selectedNode => {
            initialNodePositions.set(selectedNode, {
                x: parseInt(selectedNode.style.left, 10),
                y: parseInt(selectedNode.style.top, 10)
            });
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - initialMouseX;
        const dy = e.clientY - initialMouseY;

        selectedNodes.forEach(n => {
            const initialPos = initialNodePositions.get(n);
            if (initialPos) {
                n.style.left = `${initialPos.x + dx}px`;
                n.style.top = `${initialPos.y + dy}px`;
            }
        });

        connections.forEach(conn => {
            if (selectedNodes.has(conn.node1) || selectedNodes.has(conn.node2)) {
                conn.update();
            }
        });
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

setInterval(() => {
    connections.forEach(conn => conn.update());
    connectOrphanNodes();
}, 100);