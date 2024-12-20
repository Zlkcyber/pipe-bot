const fetch = require('node-fetch');
const fs = require('fs');
const readlineSync = require('readline-sync');
const { HttpsProxyAgent } = require("https-proxy-agent");
const { logger } = require("../utils/logger");
const { loadProxies, headers } = require("../utils/file");

const ACCOUNT_FILE = 'account.json';

// Function to register a new user with a specific proxy
async function registerUser(email, password, proxy, API_URL) {
    try {
        const agent = new HttpsProxyAgent(proxy);
        const response = await fetch(`${API_URL}/api/signup`, {
            method: 'POST',
            headers: {
                ...headers,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
                referralCode: "dHdvcGlnMT",
            }),
            agent,
        });

        if (response.ok) {
            const data = await response.text();
            if (data) {
                // Add user to the account.json 
                await addUserToFile(email, password);
                logger('Registration successful!', "success", data);
            } else {
                logger('Registration failed! Please try again.', "error");
            }
        } else {
            const errorText = await response.text();
            logger('Registration error:', "error", errorText);
        }
    } catch (error) {
        logger('Error registering user:', "error", error);
    }
}

// Function to prompt user for email and password
function promptUserForCredentials() {
    const email = readlineSync.question('Enter your email: ');
    const password = readlineSync.question('Enter your password: ', {
        hideEchoBack: true,
    });
    return { email, password };
}

// Function to add the new user to the array in account.json
async function addUserToFile(email, password) {
    try {
        let fileData = await fs.promises.readFile(ACCOUNT_FILE, 'utf8');
        let users = fileData ? JSON.parse(fileData) : [];
        users.push({ email, password });

        await fs.promises.writeFile(ACCOUNT_FILE, JSON.stringify(users, null, 2));
        logger('User added successfully to file!');
    } catch (error) {
        logger('Error adding user to file:', "error", error);
    }
}

// Main function to execute registration
async function register(API_URL) {
    const { email, password } = promptUserForCredentials();

    const proxies = await loadProxies();
    if (proxies.length === 0) {
        logger("No proxies available. Please check your proxy.txt file.", "error");
        return;
    }

    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    logger(`Using proxy: ${randomProxy}`);

    await registerUser(email, password, randomProxy, API_URL);
    return;
}

module.exports = { promptUserForCredentials, register };
