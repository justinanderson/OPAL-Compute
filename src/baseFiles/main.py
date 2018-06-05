"""Main file to run algorithms."""
from __future__ import division, print_function
from opalalgorithms.utils import AlgorithmRunner
import configargparse
import multiprocessing
import math
import json
import psycopg2
import dateutil.parser
import random
import csv
import os
import datetime


parser = configargparse.ArgumentParser(
    description='Run algorithm.')
parser.add_argument('--data_dir', required=True,
                    help='Path to data directory')
parser.add_argument('--algorithm_json', required=True,
                    help='JSON file for algorithm')
parser.add_argument('--params_json', required=True,
                    help='JSON file for params')
parser.add_argument('--db', required=True,
                    help='Database name.')
parser.add_argument('--max_cores', default=multiprocessing.cpu_count() - 2, type=int,
                    help='Max cores to be used for processing')
parser.add_argument('--max_users_per_fetch', default=3000, type=int,
                    help='Max users to be fetched in per call from db.')


def fetch_users(db, start_date, end_date, sample=1):
    """Fetch all the users and return sampled users using the sampling."""
    conn = psycopg2.connect(db)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT * FROM (SELECT DISTINCT(emiter_id) FROM public.opal as telecomdata
        WHERE telecomdata.event_time >= %s and telecomdata.event_time <= %s) AS usersid ORDER BY random();
        """,
        (start_date, end_date))
    all_users = []
    for row in cur:
        all_users.append(row[0].strip())
    required_num_users = int(math.ceil(len(all_users) * sample))
    required_users = all_users[:required_num_users]
    return required_users


def fetch_data(db, start_date, end_date, required_users, data_dir, salt):
    """Fetch data of users from start date to end date and save as csv in data directory."""
    conn = psycopg2.connect(db)
    cur = conn.cursor()
    cur.execute(
        """
        SELECT event_time as datetime, interaction_type as interaction,
        interaction_direction as direction, md5(CONCAT(emiter_id, %s)) as emiter_id,
        md5(CONCAT(receiver_id, %s)) as correspondent_id, telecomdata.antenna_id as antenna_id,
        latitude, longitude, location_level_1, location_level_2,
        duration as call_duration FROM public.opal as telecomdata
        INNER JOIN public.antenna_records as antenna_records
        ON (telecomdata.antenna_id=antenna_records.antenna_id AND
        telecomdata.event_time >= antenna_records.date_from AND
        telecomdata.event_time <= antenna_records.date_to)
        WHERE telecomdata.event_time >= %s and telecomdata.event_time <= %s and telecomdata.emiter_id = ANY(%s);
        """,
        (salt, salt, start_date, end_date, required_users))
    user2data = {}
    data_col = {
        'interaction': 1,
        'direction': 2,
        'correspondent_id': 4,
        'datetime': 0,
        'call_duration': 10,
        'antenna_id': 5,
        'latitude': 6,
        'longitude': 7,
        'location_level_1': 8,
        'location_level_2': 9
    }

    for row in cur:
        username = row[3]
        if username not in user2data:
            user2data[username] = [data_col.keys()]
        row_data = []
        for key in data_col.keys():
            idx = data_col[key]
            val = row[idx]
            if isinstance(val, str):
                val = val.strip()
            elif isinstance(val, datetime.datetime):
                val = val.strftime('%Y-%m-%d %H:%M:%S')
            row_data.append(val)
        user2data[username].append(row_data)
    temp_data_dir = os.path.join(data_dir, get_salt(16))
    os.mkdir(temp_data_dir)
    for key, val in user2data.iteritems():
        csv_file = os.path.join(temp_data_dir, key + '.csv')
        with open(csv_file, 'w') as fp:
            csv_writer = csv.writer(fp)
            for row in val:
                csv_writer.writerow(row)
    # node monitors when `run.txt` is formed inside the data directory
    # as soon as directory is formed, it sets status as running.
    with open(os.path.join(data_dir, 'run.txt'), 'w') as fp:
        fp.write('Execution started')
    return temp_data_dir


def get_salt(len):
    """Return a random salt of given length."""
    ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
    chars = [random.choice(ALPHABET) for i in range(len)]
    return "".join(chars)


def run_algo(algorithm, params, data_dir, max_number_of_threads):
    """Run algorithm on data_dir."""
    number_of_threads = min(max(1, multiprocessing.cpu_count() - 1), max_number_of_threads)
    algorunner = AlgorithmRunner(
        algorithm, dev_mode=False, multiprocess=True, sandboxing=True)
    algorunner(params, data_dir, number_of_threads)


def get_chunks(users, batch_size):
    """Return chunks of list of users.

    Ensure each chunk is of batch_size at max or less.
    """
    chunks = []
    num_chunks = int(math.ceil((len(users) * 1.0) / batch_size))
    total_users = len(users)
    for i in range(num_chunks):
        chunks.append(users[i*batch_size:min(total_users, (i+1)*batch_size)])
    return chunks


if __name__ == "__main__":
    args = parser.parse_args()

    # read algorithm from json
    with open(args.algorithm_json, 'r') as fp:
        algorithm = json.load(fp)

    # read params from json
    with open(args.params_json, 'r') as fp:
        params = json.load(fp)

    salt = get_salt(16)
        start_date = dateutil.parser.parse(params["startDate"])
    end_date = dateutil.parser.parse(params["endDate"])
    required_users = fetch_users(args.db, start_date, end_date, params['sample'])

    num_users = len(required_users)
    batch_size = args.max_users_per_fetch if num_users <= args.max_users_per_fetch else num_users // 2 + 1
    user_chunks = get_chunks(required_users, args.max_users_per_fetch)

    pool = multiprocessing.Pool(processes=1)
    jobs = []
    for chunk in user_chunks:
        jobs.append(pool.apply_async(fetch_data, (args.db, start_date, end_date, chunk, args.data_dir, salt)))
    pool.close()
    for job in jobs:
        data_dir = job.get()
        run_algo(algorithm, params, data_dir, args.max_cores)
    pool.join()
