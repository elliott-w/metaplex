import fs from 'fs';
import _ from 'lodash';
import log from 'loglevel';
import path from 'path';
import {
  generateRandomSet,
  getMetadata,
  readJsonFile,
  shuffle,
} from './various';

const { writeFile, mkdir, readdir, rename } = fs.promises;

export const ASSETS_DIRECTORY = './assets';
export const ASSETS_STAGING_DIRECTORY = './assets-staging';
export const TRAITS_DIRECTORY = './traits';

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

  if (!fs.existsSync(ASSETS_STAGING_DIRECTORY)) {
    try {
      await mkdir(ASSETS_STAGING_DIRECTORY);
    } catch (err) {
      log.error('unable to create assets staging directory', err);
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

  exactTraitBreakdowns.forEach(trait => {
    const sum = Object.keys(breakdown[trait]).reduce(
      (prev, currentAttr) => prev + breakdown[trait][currentAttr],
      0,
    );
    if (numberOfImages > sum) {
      throw new Error(
        `You can only generate at most ${sum} images because ${trait} is listed in exactTraitBreakdowns and the breakdown for ${trait} sums up to ${sum}`,
      );
    }
  });

  let assetFiles = await readdir(ASSETS_DIRECTORY);
  const useStaging = assetFiles.length > 0;

  if (useStaging) {
    const stagingAssetFiles = await readdir(ASSETS_STAGING_DIRECTORY);
    await Promise.all(
      stagingAssetFiles.map(async file => {
        const oldPath = path.join(ASSETS_STAGING_DIRECTORY, file);
        const newPath = path.join(ASSETS_DIRECTORY, file);
        return rename(oldPath, newPath);
      }),
    );
  }

  assetFiles = await readdir(ASSETS_DIRECTORY);
  const jsonFiles = assetFiles.filter(file => {
    return path.extname(file).toLowerCase() === '.json';
  });

  const imageFiles = assetFiles.filter(file => {
    return path.extname(file).toLowerCase() === '.png';
  });
  const presentIndices = jsonFiles.map(file => {
    return parseInt(path.basename(file), 10);
  });
  const presentImageIndices = imageFiles.map(file => {
    return parseInt(path.basename(file), 10);
  });
  const missingImageIndices = presentIndices.filter(
    jsonIndex => !presentImageIndices.includes(jsonIndex),
  );

  console.log(`Discovered ${presentIndices.length} existing json files.`);
  console.log(`Discovered ${presentImageIndices.length} existing image files.`);
  const currentBreakdown = {};

  if (missingImageIndices.length > 0) {
    console.log(
      `Found ${missingImageIndices.length} json files with missing images`,
    );
  }
  for (const i of missingImageIndices) {
    const { attributes } = await readJsonFile(
      path.join(ASSETS_DIRECTORY, `${i}.json`),
    );
    const set = {};
    for (const traitAttrPair of attributes) {
      set[traitAttrPair.trait_type] = traitAttrPair.value + '.png';
    }
    randomizedSets.push({
      id: i + 1,
      set: set,
    });
  }

  let baseIndex = 0;
  for (let i = 0; i < premadeCustoms.length; i++) {
    const premadeCustomIndices = [...Array(premadeCustoms[i].count).keys()].map(
      j => j + baseIndex,
    );
    baseIndex += premadeCustoms[i].count;

    // If premadeCustoms have not been generated
    for (const j of premadeCustomIndices) {
      if (!presentIndices.includes(j)) {
        const randomizedSet = generateRandomSet(
          breakdown,
          currentBreakdown,
          exactTraitBreakdowns,
          probabilityOrder,
          dnp,
          exclusive,
          premadeCustoms[i].traits,
        );
        randomizedSets.push({
          id: j + 1,
          set: randomizedSet,
        });
        Object.entries(premadeCustoms[i].traits).forEach(([trait, attr]) => {
          if (!currentBreakdown[trait]) {
            currentBreakdown[trait] = {};
          }
          if (!currentBreakdown[trait][attr]) {
            currentBreakdown[trait][attr] = 0;
          }
          currentBreakdown[trait][attr] += 1;
        });
        presentIndices.push(j);
      }
    }
  }

  const allIndices = [...Array(numberOfImages).keys()];
  const missingIndices = allIndices.filter(i => !presentIndices.includes(i));

  if (missingIndices.length > 0) {
    console.log(
      `Generating ${missingIndices.length} NFTs to fill the empty slots.`,
    );
  }

  // while (numberOfFilesCreated < premadeCustoms.length) {
  //   randomizedSets.push(premadeCustoms[numberOfFilesCreated]);
  //   numberOfFilesCreated += 1;
  // }

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
      if (useStaging) {
        await writeFile(
          `${ASSETS_STAGING_DIRECTORY}/${i}.json`,
          JSON.stringify(metadata),
        );
      } else {
        await writeFile(
          `${ASSETS_DIRECTORY}/${i}.json`,
          JSON.stringify(metadata),
        );
      }
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
