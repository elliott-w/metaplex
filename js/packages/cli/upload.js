const command =
  'node ./build/candy-machine-v2-cli.js upload -e mainnet-beta -k ./.cache/creator-keypair.json -cp example-candy-machine-upload-config.json -r https://ssc-dao.genesysgo.net ./assets';
const { exec } = require('child_process');

const sleep = seconds => {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  });
};

const main = async () => {
  let i = 0;

  const execCommand = () => {
    console.log(`iteration ${i}`);
    const childProcess = exec(command);
    childProcess.stdout.on('data', function (data) {
      process.stdout.write(data);
    });
    childProcess.on('exit', () => {
      i += 1;
      execCommand();
    });
  };
  execCommand();
};

main();
