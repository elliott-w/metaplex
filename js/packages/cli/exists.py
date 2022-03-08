import os

base = './assets'

for i in range(5000):
  json = base + '/' + str(i) + '.json'
  png = base + '/' + str(i) + '.png'
  if not os.path.exists(json):
    print(json)

  if not os.path.exists(png):
    print(png)



