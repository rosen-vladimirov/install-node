"use strict";

const childProcess = require("child_process");
const temp = require("temp");
const shelljs = require("shelljs");
const getShellVars = require("get-shell-vars");
const path = require("path");
const Sudoer = require("electron-sudo").default;
const fs = require("fs");

const doctor = {};//require("nativescript-doctor");
const semver = require("semver");
const https = require("https");
const zlib = require("zlib");

const homebrewNodeFormulaRegex = /^homebrew\/versions\/node(\d+)/;

let env = getShellVars.getEnvironmentVariables();

env.PATH += ":/usr/local/bin";

const sudoer = new Sudoer({ name: "Fusion"});

// env.HOMEBREW_GITHUB_API_TOKEN = <your access token>;
// process.env.HOMEBREW_GITHUB_API_TOKEN = <your access token>;

const execSync = (command) => {
    return (childProcess.execSync(command, { env }) || "").toString();
};

// MOCK
doctor.getSupportedNodeVersions = () => {
    return Promise.resolve(">=4.1.0 <6.0.0");
}

// Delete temp dirs after process exits.
temp.track();

const getNodeVersion = () => {
    return execSync("node --version");
};

const getMaxSatisfyingNodeVersion = (nodeVersionRange) => {
    const gitHubNodeTagsAddress = "https://api.github.com/repos/nodejs/node/tags?per_page=100&access_token=<<your access token>>";

    return new Promise((resolve, reject) => {
        const urlParts = url.parse(gitHubNodeTagsAddress);

        let options = {
            method: "GET"
        };

        if (urlParts.protocol) {
            options.proto = urlParts.protocol.slice(0, -1);
        }

        options.host = urlParts.hostname;
        options.port = urlParts.port;
        options.path = urlParts.path;
        options.headers = {};

        let headers = options.headers;

        headers["User-Agent"] = "Icenium-Fusion";

        let request = https.get(options, response => {

            let data = [];

            response.on("data", (chunk) => {
                data.push(chunk);
            });

            response.on("error", (err) => reject(err));

            response.on("end", () => {
                const responseData = data.join("");
                const versionsData = JSON.parse(responseData);
                resolve(semver.maxSatisfying(versionsData.map(v => v.name), nodeVersionRange));
            });
        });
    });
};

const getNodeBrewFormulaForVersion = (requiredNodeVersion) => {
    execSync("brew update");

    const versions = getNodeBrewFormulas("search node");

    const requiredMajorVersion = semver.major(requiredNodeVersion).toString()

    let selectedFormula = "node";
    _.each(versions, version => {
        const matchFormula = version.match(homebrewNodeFormulaRegex);

        if (matchFormula && matchFormula[1].toString() === requiredMajorVersion) {
            selectedFormula = version;
            return false;
        }
    });

    // If no matching version found, return "node", so we'll execute `brew install node`
    return selectedFormula;
};

const updateNodeWithBrew = (nodeVersion) => {
    const brewFormula = getNodeBrewFormulaForVersion(nodeVersion);

    const pathToNode = getPathToNode();

    const currentLinkedFormulaMatch = pathToNode.match(/\/Cellar\/(.+?)\//);

    if (currentLinkedFormulaMatch) {
        execSync(`brew unlink ${currentLinkedFormulaMatch[1]}`);
    }

    // now get all brew formulas and find the matching one
    execSync(`brew install ${brewFormula}`);

    execSync(`brew link --overwrite ${brewFormula}`);
};

const getNodeBrewFormulas = (brewCommand) => {
    return execSync(`brew ${brewCommand}`)
        .split(/\s|\n/)
        .map(formula => formula.trim())
        .filter(formula => {
            return formula === "node" || homebrewNodeFormulaRegex.test(formula);
        });
};

const getPathToNode = () => {
    return execSync("ls -l `which node`");
};

const isNodeInstalledWithBrew = () => {
    try {
        const pathToNode = getPathToNode();
        return pathToNode.indexOf("/Cellar/") !== -1;
    } catch (err) {
        // Ignore the error. Log it with some logger.
    }

    return false;
};

const installNodeWithBrew = () => {
     // we need to install brew first
    // brew requires sudo permissions, so use electron-sudo to ask for permissions

    const installBrewCommand = `sudo su ${env.USER} -c 'curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install | ruby'`;

    const brewInstallScript = temp.path({suffix: '.sh'});

    fs.writeFileSync(brewInstallScript, installBrewCommand);

    shelljs.chmod("+x", brewInstallScript);

    sudoer.exec(brewInstallScript)
        .then((res) => {
            try {
                const installNodeCommand = "/usr/local/bin/brew install node";
                console.log(execSync(installNodeCommand));
            } catch (err) {
                console.log("Unable to install node.", err);

                throw err;
            }

            try {
                const installCLICommand = "/usr/local/bin/npm install -g nativescript --ignore-scripts";
                console.log(execSync(installCLICommand));
            } catch (err) {
                console.log("Unable to install NativeScript CLI.", err);

                throw err;
            }
        }).catch(err =>  console.log("Error during setup: ", err));
}

const downloadNodeFromNodejsOrg = (nodeVersion) => {
    return new Promise((resolve, reject) => {
        const nodeAddress = `https://nodejs.org/dist/${nodeVersion}/node-${nodeVersion}.pkg`;

        https.get(nodeAddress, function (response) {
            var downloadPath,
                writableStream;

            downloadPath = temp.path({ suffix: '.pkg' });

            try {
                writableStream = fs.createWriteStream(downloadPath);
                response.pipe(writableStream);

                writableStream.on("finish", function () {
                    resolve(downloadPath);
                }).on("error", function (error) {
                    reject(error);
                });

            } catch (error) {
                reject(error);
            }
        }).on("error", function (error) {
            reject(error);
        });
    });

}
const installNodeFromNodejsOrg = () => {
    return doctor.getSupportedNodeVersions()
            .then(nodeVersionRange => getMaxSatisfyingNodeVersion(nodeVersionRange))
            .then(nodeVersion => {
                return downloadNodeFromNodejsOrg(nodeVersion);
            })
            .then(pathToPkg => {
                return sudoer.exec(`installer -pkg ${pathToPkg}  -target /`);
            })
            .then(res => console.log(res))
            .catch(err => console.log(err));
}

const updateNodeVersion = (nodeVersionRange) => {
    return getMaxSatisfyingNodeVersion(nodeVersionRange)
            .then(nodeVersion => {

                if (nodeVersion) {
                    if (isNodeInstalledWithBrew()) {
                        return updateNodeWithBrew(nodeVersion);
                    }

                    // TODO: if node is installed with nvm, from nodejs.org, etc.
                }
            });
};

try {
    const whichNode = execSync("which node");

    if (!whichNode) {
        // no node, but which does not fail... strange
        throw new Error("An error has occured.");
    }

    const nodeVersion = getNodeVersion();

    doctor.getSupportedNodeVersions()
        .then(nodeVersionRange => {
            const isVersionSupported = semver.satisfies(nodeVersion, nodeVersionRange);

            if (!isVersionSupported) {
                return updateNodeVersion(nodeVersionRange);
            }
        });

} catch (err) {
    // no node, let's install

    // installNodeWithBrew();
    installNodeFromNodejsOrg();
}