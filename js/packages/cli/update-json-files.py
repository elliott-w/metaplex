import glob
import json
import os

path = 'assets'
for filename in glob.glob(os.path.join(path, '*.json')):
# for filename in ['assets\\0.json']:
  with open(filename, mode='r+') as file:
    data = json.loads(file.read())
    # split = data['name'].split('#')
    # newNumber = int(split[1]) + 888
    # data['name'] = split[0] + '#' + str(newNumber)
    # data['description'] = '5000 GODz have returned after Millenia. To right their wrongdoings and bring peace to the world of Mortalz.'
    # data['seller_fee_basis_points'] = 800
    data['attributes'] = [{"trait_type": "Phase","value": "Main"} if x['trait_type'] == 'Phase' else x for x in data['attributes']]
    file.seek(0)
    file.truncate()
    json.dump(data, file)
