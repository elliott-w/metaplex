# Scans messages from a discord text channel and treats each message 
# as a solana wallet pubkey and saves to file in json format:
# {
#   "wallet1": 1,
#   "wallet2": 1,
#   "wallet3": 1,
#   etc...
# }

the_channel_id = ''
my_api_token = ''
start_scan_from_timestamp = None
save_to_file = 'wallets.json'
mods = []

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

    if len(messages) == 0:
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

member_wallets = {}
invalid_wallets = 0

def process_message(message):
    global member_wallets, invalid_wallets, duplicate_wallets, multiple_wallets
    member_id = message['author']['id']
    wallet = message['content']
    user = message['author']['username']
    if member_id not in member_wallets:
        member_wallets[member_id] = {
            "username": user,
            "wallets": [],
        }
    member_wallets[member_id]['wallets'].append(wallet)

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


multiple_wallets = 0
duplicate_wallets = 0

with open('log.txt', 'w+', encoding="utf-8") as log_file:
    unique_wallets = {}
    for member_id, data in member_wallets.items():
        user = data['username']
        wallets = data['wallets']
        if member_id not in mods:
            if len(wallets) > 1:
                wallets = [wallets[-1]]
                wallets_set = set(wallets)
                if len(wallets_set) > 1:
                    log_file.write("\nUser {} tried to submit multiple wallets\n".format(user))
                    for wallet in wallets_set:
                        log_file.write(wallet + "\n")
                    log_file.write("Using the latest wallet\n")
                    log_file.write(wallets[-1] + "\n")
                    multiple_wallets += len(wallets) - 1
                
        for wallet in wallets:
            try:
                pubkey = publickey.PublicKey(wallet)
                if wallet in unique_wallets:
                    log_file.write("\nUsers {} and {} have tried to submit the same wallet\n".format(unique_wallets[wallet]['username'], user))
                    log_file.write(wallet + "\n")
                    duplicate_wallets += 1
                else:
                    unique_wallets[wallet] = {
                        "userid": member_id,
                        "username": data['username'] 
                    }
            except ValueError:
                log_file.write("\nUser {} tried to submit an invalid wallet\n{}\n".format(user, wallet))
                invalid_wallets += 1
                pass
            except BaseException as err:
                print(err)
                invalid_wallets += 1
                pass


print("\nFinished scanning {} messages".format(messages_scanned))

print("\nWallet breakdown:")
print("{} unique wallets".format(len(unique_wallets.keys())))
print("{} invalid wallets".format(invalid_wallets))
print("{} multiple wallets".format(multiple_wallets))
print("{} duplicate wallets".format(duplicate_wallets))

wallets_json = {}
for wallet in unique_wallets.keys():
    wallets_json[wallet] = 1

whitelister_users_no_wallet_submitted = []
with open('whitelist.txt', 'r') as file:
    for member_id in file:
        id = member_id.strip()
        if id not in member_wallets:
            whitelister_users_no_wallet_submitted.append(id)


with open('whitelist-no-submit.txt', 'w+') as file:
    for member_id in whitelister_users_no_wallet_submitted:
        file.write(member_id + '\n')

print("\nSaving {} unique wallets to file".format(len(unique_wallets)))

# Erase contents of file
file = open(save_to_file, 'w+')
json.dump(wallets_json, file)
file.close()

