const command =
  'node ./build/candy-machine-v2-cli.js upload -e mainnet-beta -k ./.cache/creator-keypair.json -cp example-candy-machine-upload-config.json -r https://ssc-dao.genesysgo.net ./assets';
const { execSync } = require('child_process');

const sleep = seconds => {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
};

const main = async () => {
  let commandFailed = false;
  let timesFailed = 0;
  do {
    try {
      const commandOutput = execSync(command).toString();
      console.log(commandOutput);
      commandFailed = false;
    } catch (e) {
      timesFailed += 1;
      commandFailed = true;
      console.log('command failed: ' + timesFailed);
      await sleep(60);
    }
  } while (commandFailed);
};

main();
