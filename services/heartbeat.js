const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { readToken, loadProxies, headers } = require("../utils/file");
const { logger } = require("../utils/logger");

// Fetch points for a user
async function fetchPoints(token, username, agent, API_BASE) {
    try {
        const response = await fetch(`${API_BASE}/api/points`, {
            headers: {
                ...headers,
                "content-type": "application/json",
                "authorization": `Bearer ${token}`,
            },
            agent,
        });

        if (response.ok) {
            const data = await response.json();
            logger(`Current Points for ${username}: ${data.points}`, "info");
        } else {
            logger(`Failed to fetch points for ${username}: Status ${response.status}`, "error");
        }
    } catch (error) {
        logger(`Error fetching points for ${username}: ${error.message}`, "error");
    }
}

// Function to send heartbeat
async function sendHeartbeat(API_BASE) {
    const proxies = await loadProxies();
    if (proxies.length === 0) {
        logger("No proxies available. Please check your proxy.txt file.", "error");
        return;
    }

    const tokens = await readToken();
    if (!tokens.length) {
        logger("No tokens found. Please check your token.txt file.", "error");
        return;
    }

    for (let i = 0; i < tokens.length; i++) {
        const { token, username } = tokens[i];
        const proxy = proxies[i % proxies.length];
        const agent = new HttpsProxyAgent(proxy);

        try {
            //await checkForRewards(API_BASE, token)
            const geoInfo = await getGeoLocation(agent);

            const response = await fetch(`${API_BASE}/api/heartbeat`, {
                method: "POST",
                headers: {
                    ...headers,
                    "content-type": "application/json",
                    "authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ip: geoInfo.ip,
                    location: geoInfo.location,
                    timestamp: Date.now(),
                }),
                agent,
            });

            if (response.ok) {
                logger(`Heartbeat sent successfully for ${username} using proxy: ${proxy}`, "success");
                await fetchPoints(token, username, agent, API_BASE);
            } else {
                const errorText = await response.text();
                logger(`Failed to send heartbeat for ${username}: ${errorText}`, "error");
                await fetchPoints(token, username, agent, API_BASE);
            }
        } catch (error) {
            logger(`Error sending heartbeat for ${username}: ${error.message}`, "error");
        }
    }
}

// Fetch IP and Geo-location data
async function getGeoLocation(agent) {
    try {
        const response = await fetch('https://ipwhois.app/json/', { agent });
        if (!response.ok) throw new Error(`Geo-location request failed with status ${response.status}`);
        const data = await response.json();
        return {
            ip: data.ip,
            location: `${data.city}, ${data.region}, ${data.country}`,
        };
    } catch (error) {
        logger(`Geo-location error: ${error.message}`, "error");
        return { ip: "0.0.0.0", location: "Unknown Location" };
    }
}

// Function to check for rewards and notify the user
async function checkForRewards(baseUrl, token) {

    try {
        const response = await fetch(`${baseUrl}/api/rewards`, {
            headers: {
                ...headers,
                "content-type": "application/json",
                "authorization": `Bearer ${token}`,
            }, agent,
        });

        if (response.ok) {
            const data = await response.json();
            if (Object.keys(data).length > 0) {
                logger(`Earn more rewards points! Visit: ${data.link}`, 'info', data.link);
            } else {
                logger("No rewards available at the moment.");
            }
        } else {
            logger("Failed to fetch rewards data.", 'warn');
        }
    } catch (error) {
        logger("Error checking for rewards:", 'error');
    }
}

module.exports = { sendHeartbeat };
