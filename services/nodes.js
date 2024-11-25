const fetch = require("node-fetch");
const { readToken, loadProxies } = require("../utils/file");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../utils/logger");
const fs = require("fs").promises;

// const API_BASE = "https://pipe-network-backend.pipecanary.workers.dev/api";
const API_BASE = 'https://api.pipecdn.app/api';

// Main function to run node tests
async function runNodeTests() {
    const proxies = await loadProxies();
    if (proxies.length === 0) {
        logger("No proxies available. Please check your proxy.txt file.", "error");
        return;
    }

    try {
        const initialAgent = new HttpsProxyAgent(proxies[0 % proxies.length]); 
        const response = await fetch(`${API_BASE}/nodes`, { agent: initialAgent });
        const nodes = await response.json();

        const tokens = await readToken(); 

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const proxy = proxies[i % proxies.length]; 
            const agent = new HttpsProxyAgent(proxy);

            logger(`Testing node ${node.node_id} using proxy: ${proxy}`);
            const latency = await testNodeLatency(node, agent);

            logger(`Node ${node.node_id} (${node.ip}) latency: ${latency}ms`);

            for (const { token, username } of tokens) {
                await reportTestResult(node, latency, token, agent, username);
            }
        }

        logger("All node tests completed! Results sent to backend.", "success");
    } catch (error) {
        logger("Error running node tests:", "error", error);
    }
}

// Function to test node latency using a proxy agent
async function testNodeLatency(node, agent) {
    const start = Date.now();
    const timeout = 5000;

    try {
        await Promise.race([
            fetch(`http://${node.ip}`, { mode: "no-cors", agent }),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
        ]);

        return Date.now() - start;
    } catch (error) {
        return -1; // Timeout or error
    }
}

// Function to report test result to the backend using a proxy agent
async function reportTestResult(node, latency, token, agent, username) {
    if (!token) {
        logger("No token found. Skipping result reporting.", "warn");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/test`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                node_id: node.node_id,
                ip: node.ip,
                latency: latency,
                status: latency > 0 ? "online" : "offline",
            }),
            agent,
        });

        if (response.ok) {
            logger(`Reported result node ID: ${node.node_id} for ${username}`, "success");
        } else {
            logger(`Failed to report node ${node.node_id} for ${username}:`, "error", await response.text());
        }
    } catch (error) {
        logger(`Error reporting node ${node.node_id} for ${username}:`, "error", error);
    }
}

module.exports = { runNodeTests };
