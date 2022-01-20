import os from 'os';
import { writeFile } from 'fs/promises';
import { createCanvas, loadImage } from 'canvas';
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import log from 'loglevel';

import { readJsonFile } from '../helpers/various';
import { ASSETS_DIRECTORY, TRAITS_DIRECTORY } from '../helpers/metadata';

function makeCreateImageWithCanvas(width, height) {
  return function makeCreateImage(canvas, context) {
    return async function createImage({ image, order }) {
      const start = Date.now();
      const ID = parseInt(image.id, 10) - 1;
      for (const cur of order) {
        const imageLocation = `${TRAITS_DIRECTORY}/${cur}/${image[cur]}`;
        const loadedImage = await loadImage(imageLocation);
        context.patternQuality = 'best';
        context.quality = 'best';
        context.drawImage(loadedImage, 0, 0, width, height);
      }
      const buffer = canvas.toBuffer('image/png');
      context.clearRect(0, 0, width, height);
      const optimizedImage = await imagemin.buffer(buffer, {
        plugins: [
          imageminPngquant({
            quality: [0.6, 0.95],
          }),
        ],
      });
      await writeFile(`${ASSETS_DIRECTORY}/${ID}.png`, optimizedImage);
      const end = Date.now();
      log.info(`Placed ${ID}.png into ${ASSETS_DIRECTORY}.`);
      const duration = end - start;
      log.info('Image generated in:', `${duration}ms.`);
    };
  };
}

const CONCURRENT_WORKERS = os.cpus().length;

const worker = (work, next_) => async () => {
  let next;
  while ((next = next_())) {
    await work(next);
  }
};

export async function createGenerativeArt(
  configLocation: string,
  randomizedSets,
) {
  const start = Date.now();
  const { order, orderExceptions, width, height } = await readJsonFile(
    configLocation,
  );

  const makeCreateImage = makeCreateImageWithCanvas(width, height);

  const imagesNb = randomizedSets.length;

  const next = () => {
    const image = randomizedSets.pop();
    if (typeof image === 'undefined') {
      return false;
    }
    let theOrder = order;
    for (const orderException of orderExceptions) {
      for (const condition of orderException.conditions) {
        const allTraitsInConditionSatisfied = Object.keys(condition)
          .map(trait => {
            return condition[trait].includes(image[trait]);
          })
          .reduce((a, b) => a && b);
        if (allTraitsInConditionSatisfied) {
          theOrder = orderException.order;
          break;
        }
      }
    }
    return {
      image: image,
      order: theOrder,
    };
  };

  const workers = [];
  const workerNb = Math.min(CONCURRENT_WORKERS, imagesNb);
  log.info(`Instanciating ${workerNb} workers to generate ${imagesNb} images.`);
  for (let i = 0; i < workerNb; i++) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    const work = makeCreateImage(canvas, context);
    const w = worker(work, next);
    workers.push(w());
  }

  await Promise.all(workers);
  const end = Date.now();
  const duration = end - start;
  log.info(`Generated ${imagesNb} images in`, `${duration / 1000}s.`);
}
