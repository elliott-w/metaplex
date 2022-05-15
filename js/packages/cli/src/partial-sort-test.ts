import { readJsonFile } from './helpers/various';

const arrayMove = (arr, old_index, new_index) => {
  if (new_index >= arr.length) {
    let k = new_index - arr.length + 1;
    while (k--) {
      arr.push(undefined);
    }
  }
  arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
  return arr; // for testing
};

const partialSort = (array, partialOrder, elementToMove) => {
  const newOrder = array.slice();
  const a = newOrder.indexOf(partialOrder[0]);
  const b = newOrder.indexOf(partialOrder[1]);
  if (a > b) {
    if (elementToMove === 'first') {
      arrayMove(newOrder, a, b);
    } else {
      arrayMove(newOrder, b, a);
    }
  } else {
    if (elementToMove === 'first') {
      arrayMove(newOrder, a, b - 1);
    } else {
      arrayMove(newOrder, b, a + 1);
    }
  }
  return newOrder;
};

function arraysEqual(a1, a2) {
  /* WARNING: arrays must not contain {objects} or behavior may be undefined */
  return JSON.stringify(a1) == JSON.stringify(a2);
}

const order = [
  'Background',
  'Accessory',
  'Domain',
  'Body',
  'Eyes',
  'Mouth',
  'Head',
  'Arms',
  'Seal',
  'Phase',
];

const expectedOrder = [
  'Background',
  'Accessory',
  'Domain',
  'Body',
  'Eyes',
  'Head',
  'Mouth',
  'Arms',
  'Seal',
  'Phase',
];

const image = {
  Background: 'Alien Nest.png',
  Accessory: "Raijin's Drums.png",
  Domain: 'Shade.png',
  Body: 'Super Saiyan.png',
  Eyes: 'Ninja.png',
  Mouth: 'None.png',
  Head: 'Reaper Hood.png',
  Arms: 'Crystal Fist.png',
  Seal: 'III.png',
  Phase: 'Seed.png',
};

const main = async () => {
  const { orderExceptions } = await readJsonFile(
    'base-traits-configuration.json',
  );

  let theOrder = order;
  for (const orderException of orderExceptions) {
    for (const condition of orderException.conditions) {
      const allTraitsInConditionSatisfied = Object.keys(condition)
        .map(trait => {
          return condition[trait].includes(image[trait]);
        })
        .reduce((a, b) => a && b);
      if (allTraitsInConditionSatisfied) {
        theOrder = partialSort(
          theOrder,
          orderException.order,
          orderException.elementToMove,
        );
        break;
      }
    }
  }
  console.log(theOrder);
};

main();

let newOrder = order;
newOrder = partialSort(newOrder, ['Head', 'Eyes'], 'second');
newOrder = partialSort(newOrder, ['Head', 'Mouth'], 'second');
newOrder = partialSort(newOrder, ['Eyes', 'Head'], 'first');

console.log(arraysEqual(newOrder, expectedOrder));
