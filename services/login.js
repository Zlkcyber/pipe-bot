const fetch = require("node-fetch");
const { saveToken, readToken, loadProxies } = require("../utils/file");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../utils/logger");
const fs = require('fs');

// const API_BASE = "https://pipe-network-backend.pipecanary.workers.dev/api";
const API_BASE = 'https://api.pipecdn.app/api';

const ACCOUNT_FILE = 'account.json';

// Function to read all accounts from account.json
async function readUsersFromFile() {
    try {
        const fileData = await fs.promises.readFile(ACCOUNT_FILE, 'utf8');
        return JSON.parse(fileData); 
    } catch (error) {
        logger('Error reading users from file','error', error);
        return []; 
    }
    }
async function login(email, password, proxy) {
    const agent = new HttpsProxyAgent(proxy);
    try {
        const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        logger(`Login error for ${email}:`, 'error', errorText);
        }
    } catch (error) {
        logger(`Error logging in with ${email}:`, 'error', error);
    }
}
async function loginWithAllAccounts() {
    const proxies = await loadProxies();
    const accounts = await readUsersFromFile();

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const proxy = proxies[i % proxies.length];  
        logger(`Attempting to login with ${account.email}...`);
        await login(account.email, account.password, proxy);  
    };
    
}

module.exports = { loginWithAllAccounts };
