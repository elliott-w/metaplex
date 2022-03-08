import fs from 'fs';
import log from 'loglevel';
import path from 'path';
import { readJsonFile } from '../helpers/various';
// import { generateRandoms } from '../helpers/various';

const { readdir, writeFile } = fs.promises;

export async function generateConfigurations(
  baseConfigLocation: string,
  traits: string[],
): Promise<boolean> {
  let generateSuccessful: boolean = true;
  const configs = await readJsonFile(baseConfigLocation);

  try {
    await Promise.all(
      traits.map(async trait => {
        const attributes = (
          await readdir(`./traits/${trait}`, {
            withFileTypes: true,
          })
        )
          .filter(dirent => dirent.isFile())
          .filter(dirent => path.extname(dirent.name).toLowerCase() === '.png')
          .map(dirent => dirent.name);
        // const randoms = generateRandoms(attributes.length - 1);
        // console.log(attributes);
        if (!(trait in configs['breakdown'])) {
          configs['breakdown'][trait] = {};
        }
        attributes.forEach(attr => {
          if (!(attr in configs['breakdown'][trait])) {
            configs['breakdown'][trait][attr] = 1;
          } else if (configs['breakdown'][trait][attr] < 1) {
            const x = attributes.length;
            const y = configs['breakdown'][trait][attr];
            configs['breakdown'][trait][attr] = (y * (x - 1)) / (1 - y);
          }
        });
      }),
    );
  } catch (err) {
    generateSuccessful = false;
    log.error('Error created configurations', err);
    throw err;
  }

  try {
    await writeFile('./traits-configuration.json', JSON.stringify(configs));
  } catch (err) {
    generateSuccessful = false;
    log.error('Error writing configurations to configs.json', err);
    throw err;
  }

  return generateSuccessful;
}
