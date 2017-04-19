const fs = require("fs");
const path = require("path");
const https = require("https");
const temp = require("temp");
const getShellVars = require("get-shell-vars");
const Sudoer = require("electron-sudo").default;

module.exports = (logMessage, execSync) => {
    const getNodePath = () => {
        let nodePath = "";

        try {
            nodePath = execSync("where node");

            logMessage(`Node found in : ########## ${nodePath} ##########\n`);
        } catch (error) {
            logMessage(`exception :\n##########\n${error}\n##########\n`);
        }

        return nodePath;
    };

    const downloadNodeInstaller = (nodeVersion) => {
        return new Promise((resolve, reject) => {
            const nodeAddress = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-x86.msi`;

            https.get(nodeAddress, (response) => {
                try {
                    const downloadPath = temp.path({suffix: ".msi"});
                    const writableStream = fs.createWriteStream(downloadPath);

                    response.pipe(writableStream);

                    writableStream.on("finish", () => {
                        setTimeout(() => {
                            logMessage(`download success:\n##########\n${downloadPath}\n##########\n`);
                            resolve(downloadPath);
                        }, 2000);
                    }).on("error", (error) => {
                        logMessage(`Error during pipe response of ${pathToExecutable}:\n##########\n${error}\n##########\n`);
                        reject(`Error: ${error}`);
                    });
                } catch (error) {
                    logMessage(`Error during file save of ${pathToExecutable}:\n##########\n${error}\n##########\n`);
                    reject(`Error: ${error}`);
                }
            }).on("error", (error) => {
                logMessage(`Error during get of ${nodeAddress}:\n##########\n${error}\n##########\n`);
                reject(`Error: ${error}`);
            });
        });
    };

    const installExecutable = (pathToExecutable) => {
        return new Promise((resolve, reject) => {
            try {
                const env = getShellVars.getEnvironmentVariables();
                const sudoer = new Sudoer({ name: "Fusion-windows" });
                const quietCommand = `msiexec.exe /i "${pathToExecutable}" /qn`;

                logMessage(`installExecutable start\n`);

                sudoer
                    .exec(quietCommand, { env })
                    .then((result) => {
                        logMessage(`installExecutable success:\n##########\n${result}\n##########\n`);
                        resolve(result);
                    })
                    .catch((error) => {
                        logMessage(`installExecutable failed:\n##########\n${error}\n##########\n`);
                        reject(error);
                    });
            } catch(error) {
                logMessage(`Error during installation of ${pathToExecutable}:\n##########\n${error}\n##########\n`);
                reject(error);
            }
        });
    };

    const ensureNode = () => {
        const nodePath = getNodePath();

        if (nodePath) {
            return;
        }

        // no node, let's install
        // we need to install brew first
        // brew requires sudo permissions, so use electron-sudo to ask for permissions

        temp.track();

        const nodeVersion = "6.9.0";

        return downloadNodeInstaller(nodeVersion)
            .then(installExecutable)
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

    return {
        ensureNode,
        ensureCLI
    };
};