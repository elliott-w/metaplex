import fs from 'fs';
import path from 'path';
import log from 'loglevel';
import _ from 'lodash';
import {
  generateRandomSet,
  getMetadata,
  readJsonFile,
  shuffle,
} from './various';

const { writeFile, mkdir, readdir } = fs.promises;

export const ASSETS_DIRECTORY = './assets';
export const TRAITS_DIRECTORY = './traits';

export async function createMetadataFiles(
  numberOfImages: number,
  configLocation: string,
  treatAttributesAsFileNames: boolean,
): Promise<any[]> {
  let numberOfFilesCreated: number = 0;
  const randomizedSets = [];

  if (!fs.existsSync(ASSETS_DIRECTORY)) {
    try {
      await mkdir(ASSETS_DIRECTORY);
    } catch (err) {
      log.error('unable to create assets directory', err);
    }
  }

  const {
    breakdown,
    name,
    symbol,
    creators,
    description,
    seller_fee_basis_points,
    collection,
    dnp,
    exclusive,
    // premadeCustoms,
    probabilityOrder,
  } = await readJsonFile(configLocation);

  const assetFiles = await readdir(ASSETS_DIRECTORY);
  const presentIndices = assetFiles
    .filter(file => {
      return path.extname(file).toLowerCase() === '.json';
    })
    .map(file => {
      return parseInt(path.basename(file), 10);
    });
  const allIndices = [...Array(numberOfImages).keys()];
  const missingIndices = allIndices.filter(i => !presentIndices.includes(i));
  console.log(missingIndices);

  // while (numberOfFilesCreated < premadeCustoms.length) {
  //   randomizedSets.push(premadeCustoms[numberOfFilesCreated]);
  //   numberOfFilesCreated += 1;
  // }

  while (numberOfFilesCreated < missingIndices.length) {
    const randomizedSet = generateRandomSet(
      breakdown,
      probabilityOrder,
      dnp,
      exclusive,
    );

    if (!_.some(randomizedSets, randomizedSet)) {
      randomizedSets.push({
        id: missingIndices[numberOfFilesCreated] + 1,
        set: randomizedSet,
      });
      numberOfFilesCreated += 1;
    }
  }

  const shuffled = shuffle(randomizedSets);

  for (const key of missingIndices.keys()) {
    const i = missingIndices[key];
    const metadata = getMetadata(
      name,
      symbol,
      i,
      creators,
      description,
      seller_fee_basis_points,
      shuffled[key].set,
      collection,
      treatAttributesAsFileNames,
    );

    try {
      await writeFile(
        `${ASSETS_DIRECTORY}/${i}.json`,
        JSON.stringify(metadata),
      );
    } catch (err) {
      log.error(`${numberOfFilesCreated} failed to get created`, err);
    }
  }

  const randomizedSetsWithIds = shuffled.map(randomizedSet => {
    return {
      id: randomizedSet.id,
      ...randomizedSet.set,
    };
  });

  return randomizedSetsWithIds;
}
