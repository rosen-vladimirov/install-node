var url = require("url"),
	fs = require("fs"),
	path = require("path"),
	isDarwin = process.platform === "darwin";


const childProcess = require("child_process");
const temp = require("temp");
//const shelljs = require("shelljs");
//const Sudoer = require("electron-sudo").default;

// Delete temp dirs after process exits.
temp.track();

try {
    const whichNode = childProcess.execSync("where node1");
    if (!whichNode) {
        // no node, but which does not fail... strange

    }

} catch (err) {
    // no node, let's install
    // we need to install brew first
    // brew requires sudo permissions, so use electron-sudo to ask for permissions

    const nodeAddress = "https://nodejs.org/dist/v6.9.0/node-v6.9.0-x86.msi";
    const https = require('https');

    https.get(nodeAddress, function (response) {
        var downloadPath,
            writableStream;

        downloadPath = temp.path({suffix: '.msi'});

        try {
            writableStream = fs.createWriteStream(downloadPath);
            response.pipe(writableStream);

            writableStream.on("finish", function () {
                setTimeout(() => {
                    try{
                        const quietCommand = `msiexec.exe /i "${downloadPath}" INSTALLDIR="D:\\TsvetieTemp" /qn`;

                        childProcess.execSync(quietCommand);
                    } catch(error) {
                        console.log("Error: ", error);
                    }
                }, 100);
            }).on("error", function (error) {
                console.log("Error: ", error);
            });

        } catch (error) {
            console.log("Error: ", error);
        }
    }).on("error", function (error) {
        console.log("Error: ", error);
    });
}