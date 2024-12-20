const fetch = require("node-fetch");
const { saveToken, headers, loadProxies } = require("../utils/file");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../utils/logger");
const fs = require('fs');

const ACCOUNT_FILE = 'account.json';

// Function to read all accounts from account.json
async function readUsersFromFile() {
    try {
        const fileData = await fs.promises.readFile(ACCOUNT_FILE, 'utf8');
        return JSON.parse(fileData);
    } catch (error) {
        logger('Error reading users from file', 'error', error);
        return [];
    }
}

// Login function with proxy and added headers
async function login(email, password, API_BASE, proxy) {
    try {
        const agent = new HttpsProxyAgent(proxy);

        const response = await fetch(`${API_BASE}/api/login`, {
            method: "POST",
            headers: {
                ...headers,
                "content-type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            agent,
        });

        if (response.ok) {
            const data = await response.json();
            if (data.token) {
                await saveToken({ token: data.token, username: email });
                logger(`Login successful for ${email}!`, 'success');
            } else {
                logger(`Login failed for ${email}! No token returned.`, 'error');
            }
        } else if (response.status === 401) {
            logger(`Invalid credentials for ${email}. Please check your email and password.`, 'error');
        } else {
            const errorText = await response.text();
            logger(`Login error for ${email}: ${errorText}`, 'error');
        }
    } catch (error) {
        logger(`Error logging in with ${email}:`, 'error', error);
    }
}

// Function to login with all accounts and use proxies
async function loginWithAllAccounts(API_BASE) {
    const proxies = await loadProxies();
    const accounts = await readUsersFromFile();

    if (proxies.length === 0) {
        logger("No proxies available. Please check your proxy.txt file.", "error");
        return;
    }

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const proxy = proxies[i % proxies.length];
        logger(`Attempting to login with ${account.email} using proxy ${proxy}`);
        await login(account.email, account.password, API_BASE, proxy);
    }
    logger('All accounts logged in successfully!');
    return;
}

module.exports = { loginWithAllAccounts };
