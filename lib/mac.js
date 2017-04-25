module.exports = {
    getNodeCommand: "which node",
    nodeInstallerSuffix: ".pkg",
    nodeDownloadAddress: "https://nodejs.org/dist/v%{0}/node-v%{0}.pkg",
    installCommand: "installer -pkg %{0}  -target /"
};
