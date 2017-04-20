const helpers = require("./lib/helpers");
const { platform } = process;

let platformConfig;

switch (platform) {
    case "darwin":
        platformConfig = require("./lib/mac");
        break;
    case "win32":
        platformConfig = require("./lib/windows");
        break;
    default:
        throw new Error(`Unsupported platform: ${platform}`);
}

module.exports = {
    ensureNode: helpers.ensureNode.bind(null, platformConfig),
    ensureCLI: helpers.ensureCLI
};
