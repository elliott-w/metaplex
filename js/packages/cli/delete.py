import os

nfts_to_delete = []
try:
  with open('nfts-to-delete.txt', 'r') as file:
    for line in file:
      stripped = line.strip()
      try:
        num = int(stripped)
        nfts_to_delete.append(num)
      except ValueError:
        pass
except FileNotFoundError:
  print('nfts-to-delete.txt file not found')
  pass

print('deleting {} nfts'.format(len(nfts_to_delete)))

base = './assets'

for nft_to_delete in nfts_to_delete:
  json = base + '/' + str(nft_to_delete) + '.json'
  png = base + '/' + str(nft_to_delete) + '.png'
  if (os.path.exists(json)):
    os.remove(json)
  else:
    print('Could not delete {} since it does not exist'.format(json))
  
  if (os.path.exists(png)):
    os.remove(png)
  else:
    print('Could not delete {} since it does not exist'.format(png))



