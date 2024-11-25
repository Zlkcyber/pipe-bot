const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { readToken, loadProxies } = require("../utils/file");
const { logger } = require("../utils/logger");
const fs = require("fs").promises;
const API_BASE = 'https://api.pipecdn.app/api';

// const API_BASE = "https://pipe-network-backend.pipecanary.workers.dev/api";
// fetch points
async function fetchPoints(token, username, agent) {

    try {
    const response = await fetch(`${API_BASE}/points`, {
        headers: { Authorization: `Bearer ${token}` },
        agent,
    });

    if (response.ok) {
        const data = await response.json();
        logger(`Current Points for ${username}:`, "info", data.points);
    } else {
        logger(`Failed to fetch points for ${username}:`, 'error', response.status);
    }
    } catch (error) {
    logger(`Error fetching points for ${username}:`, 'error', error.message);
    }
}

// Function to send heartbeat
async function sendHeartbeat() {
    const proxies = await loadProxies(); 
    if (proxies.length === 0) {
        logger("No proxies available. Please check your proxy.txt file.", "error");
        return;
    }

    const tokens = await readToken(); 

    for (let i = 0; i < tokens.length; i++) {
        const { token, username } = tokens[i];
        const proxy = proxies[i % proxies.length]; 
        const agent = new HttpsProxyAgent(proxy); 

        try {
            const ip = await fetchIpAddress(agent); 
            const geo = await fetchGeoLocation(ip, agent); 

            const response = await fetch(`${API_BASE}/heartbeat`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, ip, geo }),
                agent, 
            });

            if (response.ok) {
                logger(`Heartbeat sent successfully for ${username} using proxy: ${proxy}`, "success");
                await fetchPoints(token, username, agent)
            } else {
                logger(`Failed to send heartbeat for ${username}:`, "error", await response.text());
            }
        } catch (error) {
            logger(`Error sending heartbeat for ${username}:`, "error", error);
        }
    }
}

// Function to fetch IP address 
async function fetchIpAddress(agent) {
    try {
        const response = await fetch("https://api64.ipify.org?format=json", { agent });
        const { ip } = await response.json();
        return ip;
    } catch (error) {
        logger("Error fetching IP address:", "error", error);
        throw error;
    }
}

// Function to fetch GeoLocation
async function fetchGeoLocation(ip, agent) {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, { agent });
    if (response.ok) {
        return await response.json();
    }; 
    return null;
}

module.exports = { sendHeartbeat };
