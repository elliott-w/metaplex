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

const arraySubset = (arr, target) => target.every(v => arr.includes(v));

export async function createMetadataFiles(
  numberOfImages: number,
  configLocation: string,
  treatAttributesAsFileNames: boolean,
): Promise<any[]> {
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
    exactTraitBreakdowns,
    name,
    symbol,
    creators,
    description,
    seller_fee_basis_points,
    collection,
    dnp,
    exclusive,
    premadeCustoms,
    order,
    probabilityOrder,
  } = await readJsonFile(configLocation);

  const assetFiles = await readdir(ASSETS_DIRECTORY);
  const jsonFiles = assetFiles.filter(file => {
    return path.extname(file).toLowerCase() === '.json';
  });
  const presentIndices = jsonFiles.map(file => {
    return parseInt(path.basename(file), 10);
  });
  console.log(`Discovered ${presentIndices.length} existing NFTs.`);
  const premadeCustomsIndices = [...Array(premadeCustoms.length).keys()];

  // If premadeCustoms have not been generated
  if (!arraySubset(presentIndices, premadeCustomsIndices)) {
    for (const i of premadeCustomsIndices) {
      randomizedSets.push({
        id: i + 1,
        set: premadeCustoms[i],
      });
      presentIndices.push(i);
    }
  }

  const allIndices = [...Array(numberOfImages).keys()];
  const missingIndices = allIndices.filter(i => !presentIndices.includes(i));

  if (missingIndices.length > 0) {
    console.log(
      `Generating ${missingIndices.length} NFTs to fill the empty slots.`,
    );
  } else {
    console.log(`Skipping NFT image generation, no missing slots found.`);
  }

  // while (numberOfFilesCreated < premadeCustoms.length) {
  //   randomizedSets.push(premadeCustoms[numberOfFilesCreated]);
  //   numberOfFilesCreated += 1;
  // }

  const currentBreakdown = {};

  for (const jsonFile of jsonFiles) {
    const { attributes } = await readJsonFile(
      path.join(ASSETS_DIRECTORY, jsonFile),
    );
    attributes.forEach(obj => {
      const trait = obj['trait_type'];
      let attr = obj['value'];
      if (!attr.includes('.png')) {
        attr += '.png';
      }
      if (!currentBreakdown[trait]) {
        currentBreakdown[trait] = {};
      }
      if (!currentBreakdown[trait][attr]) {
        currentBreakdown[trait][attr] = 0;
      }
      currentBreakdown[trait][attr] += 1;
    });
  }

  let i = 0;
  while (i < missingIndices.length) {
    const randomizedSet = generateRandomSet(
      breakdown,
      currentBreakdown,
      exactTraitBreakdowns,
      probabilityOrder,
      dnp,
      exclusive,
    );

    if (!_.some(randomizedSets, randomizedSet)) {
      randomizedSets.push({
        id: missingIndices[i] + 1,
        set: randomizedSet,
      });
      i += 1;
    }
  }

  const shuffled = shuffle(randomizedSets);

  for (const randomizedSet of randomizedSets) {
    const i = randomizedSet.id - 1;
    const metadata = getMetadata(
      name,
      symbol,
      i,
      creators,
      description,
      seller_fee_basis_points,
      randomizedSet.set,
      collection,
      treatAttributesAsFileNames,
      order,
    );

    try {
      await writeFile(
        `${ASSETS_DIRECTORY}/${i}.json`,
        JSON.stringify(metadata),
      );
    } catch (err) {
      log.error(`${randomizedSet.id} failed to get created`, err);
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
