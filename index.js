const fs = require("fs");
const path = require("path");
const getShellVars = require("get-shell-vars");

const logFilePath = path.join(__dirname, "mylog.log");
const logFile = fs.openSync(logFilePath, "a");

const logMessage = (message) => {
    fs.writeSync(logFile, message);
};

const env = getShellVars.getEnvironmentVariables();

env.PATH += ":/usr/local/bin";

const execSync = (command) => {
    return (childProcess.execSync(command, { env }) || "").toString();
};

const { platform } = process;

let platformImplementation;

switch (platform) {
    case "darwin":
        platformImplementation = require("./lib/mac");
        break;
    case "win32":
        platformImplementation = require("./lib/windows");
        break;
    default:
        throw new Error(`Unsupported platform: ${platform}`);
}

module.exports = platformImplementation(logMessage);
