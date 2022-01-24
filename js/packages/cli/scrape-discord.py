# Scans messages from a discord text channel and treats each message 
# as a solana wallet pubkey and saves to file in json format:
# {
#   "wallet1": 1,
#   "wallet2": 1,
#   "wallet3": 1,
#   etc...
# }

the_channel_id = 'the_channel_id'
my_api_token = 'my_api_token'
start_scan_from_timestamp = None
save_to_file = 'wallets.json'

import discum
from datetime import datetime
import json
from solana import publickey

bot = discum.Client(token=my_api_token, log=False)
messages_scanned = 0

if start_scan_from_timestamp == None:
    last_message_date = bot.unixts_to_snowflake(datetime.now().timestamp())
else:
    last_message_date = start_scan_from_timestamp    

print("Press CTRL + C at any time to stop the scan and write the member ids to file")

class NoMoreMessagesLeftToScan(Exception):
    pass

def get_and_process_next_chunk_of_messages(num_of_messages_per_chunk = 100):
    global last_message_date, messages_scanned
    
    messages = bot.getMessages(
        the_channel_id,
        num = num_of_messages_per_chunk,
        beforeDate = last_message_date
    ).json()
    if 'code' in messages:
        print(json.dumps(messages, indent=2, sort_keys=True))
        raise ValueError('API request failed')

    if (len(messages) == 0):
        raise NoMoreMessagesLeftToScan
    messages_scanned += len(messages)
    # sys.stdout.write("\rMessages scanned: %i" % messages_scanned)
    for message in messages:
        process_message(message)
    discord_timestamp = messages[len(messages)-1]['timestamp']
    date_time = datetime.fromisoformat(discord_timestamp)
    unix_timestamp = date_time.timestamp()
    discord_snowflake = bot.unixts_to_snowflake(unix_timestamp)
    last_message_date = discord_snowflake

invalid_wallets = 0
multiple_wallets = 0
duplicate_wallets = 0
member_wallets = {}
def process_message(message):
    global member_wallets, invalid_wallets, duplicate_wallets, multiple_wallets
    member_id = message['author']['id']
    wallet = message['content']
    user = message['author']['username']
    if (member_id in member_wallets and wallet == member_wallets[member_id]['wallet']):
        duplicate_wallets += 1

    if (member_id in member_wallets and wallet != member_wallets[member_id]['wallet']):
        print("\nUser {} tried to submit wallet \n{}\nwhen they have already submitted\n{}\nOverriding with the latest wallet\n{}".format(user, wallet, member_wallets[member_id]['wallet'], wallet))
        multiple_wallets += 1

    try:
        pubkey = publickey.PublicKey(wallet)
        member_wallets[member_id] = {
            "username": message['author']['username'],
            "wallet": wallet,
        }
    except ValueError:
        print("\nUser {} tried to submit an invalid wallet\n{}".format(user, wallet))
        invalid_wallets += 1
        pass
    except BaseException as err:
        print(err)
        invalid_wallets += 1
        pass

try:
    while True:
        get_and_process_next_chunk_of_messages()
except KeyboardInterrupt:
    pass
except ValueError as err:
    print(err)
    pass
except NoMoreMessagesLeftToScan:
    pass

unique_wallets = {}
for member_id, data in member_wallets.items():
    if data['wallet'] in unique_wallets:
        print("\nUsers {} and {} have tried to submit the following wallet twice\n{}".format(unique_wallets[data['wallet']]['username'], data['username'], data['wallet']))
        duplicate_wallets += 1
    else:
        unique_wallets[data['wallet']] = {
            "userid": member_id,
            "username": data['username'] 
        }

print("\nFinished scanning {} messages".format(messages_scanned))

print("\nWallet breakdown:")
print("{} unique wallets".format(len(unique_wallets.keys())))
print("{} invalid wallets".format(invalid_wallets))
print("{} multiple wallets".format(multiple_wallets))
print("{} duplicate wallets".format(duplicate_wallets))

# unique_wallets = set(unique_wallets.keys())
wallets_json = {}
for wallet in unique_wallets.keys():
    wallets_json[wallet] = 1

print("\nSaving {} unique wallets to file".format(len(unique_wallets)))

# Erase contents of file
file = open(save_to_file, 'w+')
json.dump(wallets_json, file)
file.close()

