import json

file = open('.cache/598BtbQ2txiaT5KQeCvreUdi1KSUrZ1FkBwutWxQ6gSg_mint_accounts.json')

mints = json.load(file)

print(len(mints))
