const fs = require("fs");
const path = require("path");
const temp = require("temp");
const https = require("https");
const childProcess = require("child_process");
const getShellVars = require("get-shell-vars");
const Sudoer = require("electron-sudo").default;

const sudoer = new Sudoer({ name: "Fusion-Sudoer"});
const logFilePath = path.join(__dirname, "..", "mylog.log");
const logFile = fs.openSync(logFilePath, "a");
const env = getShellVars.getEnvironmentVariables();
env.PATH += ":/usr/local/bin";

const logMessage = (message) => {
    fs.writeSync(logFile, `${message}\n`);
};

const downloadFile = (address, fileSuffix) => {
    return new Promise((resolve, reject) => {
        logMessage(`Start downloading file: ${address}`);

        https.get(address, (response) => {
            try {
                const downloadPath = temp.path({suffix: fileSuffix});
                const writableStream = fs.createWriteStream(downloadPath);

                response.pipe(writableStream);

                writableStream.on("finish", () => {
                    setTimeout(() => {
                        logMessage(`Successfully downloaded file ${downloadPath}`);
                        resolve(downloadPath);
                    }, 100);
                }).on("error", (error) => {
                    logMessage(`Error while writing file ${downloadPath}:\n${error}`);
                    reject(error);
                });
            } catch (error) {
                logMessage(`Error during file download ${address} or pipe to ${downloadPath}:\n${error}`);
                reject(error);
            }
        }).on("error", (error) => {
            logMessage(`Error during get of ${address}:\n${error}`);
            reject(error);
        });
    });
};

const stringFormat = (rawString, ...values) => {
    return rawString.replace(/%\{([0-9])+\}/g, (match, index) => {
        return values[index];
    });
};

const getNodePath = ({ getNodeCommand }) => {
    let nodePath = "";

    try {
        nodePath = childProcess.execSync(getNodeCommand, { env });

        logMessage(`Node found at location: ${nodePath}`);
    } catch (error) {
        logMessage(`Node not found. Error:\n${error}`);
    }

    return nodePath.toString();
};

const downloadNodeInstaller = ({ nodeDownloadAddress, nodeInstallerSuffix }, nodeVersion) => {
    const address = stringFormat(nodeDownloadAddress, nodeVersion);

    return downloadFile(address, nodeInstallerSuffix);
};

const installNode = ({ installCommand }, pathToExecutable) => {
    const command = stringFormat(installCommand, pathToExecutable);

    logMessage(`Execute command ${command}`);

    return new Promise((resolve, reject) => {
        sudoer
            .exec(command, { env })
            .then(() => {
                logMessage(`Successfully installed node.`);
                resolve();
            })
            .catch((error) => {
                logMessage(`Failed to execute ${command}.Error:\n${error}`);
                reject(error);
            });
    });
};

const ensureNode = (config) => {
    const nodePath = getNodePath(config);

    if (nodePath) {
        return;
    }

    temp.track();

    const nodeVersion = "6.9.0";

    return downloadNodeInstaller(config, nodeVersion)
        .then(installNode.bind(null, config))
        .then(() => {
            temp.cleanupSync();
        })
        .catch(error => {
            temp.cleanupSync();

            return Promise.reject(error);
        });
};

const ensureCLI = () => {

};

module.exports = {
    ensureNode,
    ensureCLI
};
