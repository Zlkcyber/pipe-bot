const { loginWithAllAccounts } = require("./services/login");
const { register } = require("./services/register");
const { sendHeartbeat } = require("./services/heartbeat");
const { runNodeTests, fetchBaseUrl } = require("./services/nodes");
const { askQuestion } = require("./utils/userInput");
const { banner } = require("./utils/banner");
const { logger } = require("./utils/logger");

let baseUrl = 'https://api.pipecdn.app'

// Ensure base URL is initialized
async function ensureBaseUrl() {
    if (!baseUrl || baseUrl === 'https://api.pipecdn.app') {
        logger('Initializing base URL...');
        baseUrl = await fetchBaseUrl(baseUrl);
        logger('Base URL initialized to:', 'info', baseUrl);
        return baseUrl;
    }
}

(async () => {
    logger(banner, "debug");

    // Refresh the base URL periodically
    setInterval(async () => {
        baseUrl = await fetchBaseUrl();
        logger('Base URL refreshed:', baseUrl);
    }, 60 * 60 * 1000); // Every 60 minutes
    const choice = await askQuestion(
        "Choose an option:\n1. Register\n2. Login\n3. Run Node\n> "
    );

    switch (choice) {
        case "1":
            baseUrl = await ensureBaseUrl();
            logger("Registering new account...");
            await register(baseUrl);
            break;
        case "2":
            baseUrl = await ensureBaseUrl();
            logger("Fetching Accounts in accounts.json and logging in...");
            await loginWithAllAccounts(baseUrl);
            break;
        case "3":
            baseUrl = await ensureBaseUrl();
            logger("Running All Accounts using Proxy...");
            await sendHeartbeat(baseUrl);
            setInterval(() => sendHeartbeat(baseUrl), 6 * 60 * 60 * 1000); // Send heartbeat every 6 hours
            await runNodeTests(baseUrl);
            setInterval(() => runNodeTests(baseUrl), 30 * 60 * 1000); // Run Node tests every 30 minutes
            logger(
                "Heartbeat will send every 6 hours and node results will send every 30 minutes",
                "debug"
            );
            logger("Do not change this or your accounts might get banned.", "debug");
            break;
        default:
            logger("Invalid choice. Exiting.", "error");
    }
})();
