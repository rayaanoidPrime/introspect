# Upload files from report-assets to gcs, every 15 minutes

# Imports the Google Cloud client library
from google.cloud.storage import Client, transfer_manager
import os

import time

# Instantiates a client
storage_client = Client()
logFile = "gcs-logs.csv"

# The name for the new bucket
bucket_name = "defog-agents"
bucket = storage_client.bucket(bucket_name)

files = []

# get all files from report-assets folder's subfolders into a tuple of (file path relative to report-assets, blob)
for root, dirs, filenames in os.walk("report-assets"):
    for filename in filenames:
        full_path = os.path.join(root, filename)
        files.append((os.path.join(root, filename), bucket.blob(full_path)))


files_to_upload = []

for file in files:
    # check if file exists in gcs
    if file[1].exists():
        # if so, check if the gcp file is newer than the file in local report-assets
        # or if the local file is less than 15 minutes old, as user might still be working on it, so let it be till next cycle
        if (
            file[1].time_created > os.path.getmtime(file[0])
            or time.time() - os.path.getmtime(file[0]) < 900
        ):
            # ignore it
            continue

    # if not, we will upload it
    files_to_upload.append(file)

# upload files
# we can't use worker type "process" because spawing child process isn't allowed from daemons which is how i think the hypercorn server runs.
transfer_manager.upload_many(files_to_upload, worker_type="thread")

# add all files uploaded to a gcs-logs.csv file that exists in gcs
# if the file doesn't exist, create it
# if it does exist, append to it
# format: path, timestamp
# timestamp is the time the file was uploaded to gcs
# we can't use worker type "process" because spawing child process isn't allowed from daemons which is how i think the hypercorn server runs.
logs = []
for file in files_to_upload:
    logs.append((file[0], file[1].time_created))

existing_log_file = bucket.blob(logFile)

if existing_log_file.exists():
    existing_log_file.download_to_filename(logFile)
    with open(logFile, "a") as f:
        for log in logs:
            f.write(f"{log[0]},{log[1]}\n")
    existing_log_file.upload_from_filename(logFile)
else:
    with open(logFile, "w") as f:
        # write header row
        f.write("path,timestamp\n")
        for log in logs:
            f.write(f"{log[0]},{log[1]}\n")
    existing_log_file.upload_from_filename(logFile)

# delete gcs-logs.csv file from local machine
os.remove(logFile)
