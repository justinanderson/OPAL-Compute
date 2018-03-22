"""Main file to run algorithms."""
from __future__ import division, print_function
from opalalgorithms.utils import AlgorithmRunner
import configargparse
import multiprocessing
import json


parser = configargparse.ArgumentParser(
    description='Run algorithm.')
parser.add_argument('--data_dir', required=True,
                    help='Path to data directory')
parser.add_argument('--algorithm_json', required=True,
                    help='JSON file for algorithm')
parser.add_argument('--params_json', required=True,
                    help='JSON file for params')


if __name__ == "__main__":
    args = parser.parse_args()

    # read algorithm from json
    with open(args.algorithm_json, 'r') as fp:
        algorithm = json.load(fp)

    # read params from json
    with open(args.params_json, 'r') as fp:
        params = json.load(fp)

    # use default sampling rate of 1 if not available
    if 'sampling' not in params:
        params['sampling'] = 1

    # number of threads for computation is number of cores - 1
    number_of_threads = multiprocessing.cpu_count() - 1
    algorunner = AlgorithmRunner(
        algorithm, dev_mode=False, multiprocess=True, sandboxing=True)
    result = algorunner(params, args.data_dir, number_of_threads)
    print("Time taken {}".format(result))
