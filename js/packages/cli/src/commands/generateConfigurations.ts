import fs from 'fs';
import log from 'loglevel';
import path from 'path';
// import { generateRandoms } from '../helpers/various';

const { readdir, writeFile } = fs.promises;

export async function generateConfigurations(
  traits: string[],
): Promise<boolean> {
  let generateSuccessful: boolean = true;
  const configs = {
    name: 'GODz',
    symbol: '',
    description: '',
    creators: [],
    dnp: {},
    premadeCustoms: [],
    collection: {},
    breakdown: {},
    order: [
      'background',
      'accessory',
      'base',
      'clothing',
      'eyes',
      'mouth',
      'head',
      'arms',
    ],
    width: 2604,
    height: 3282,
  };

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

        const tmp = {};
        let totalProbability = 1;
        let total = attributes.length;
        if (attributes.includes('none.png')) {
          totalProbability = 0.75;
          total -= 1;
        }
        attributes.forEach(attr => {
          if (attr === 'none.png') {
            tmp[attr] = 0.25;
          } else {
            tmp[attr] = totalProbability / total;
          }
        });

        configs['breakdown'][trait] = tmp;
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
