# Agents GCP

This directory contains the source code for the agents deployment on GCP.

## Local testing

First install the requirements:
`pip install requirements.txt`

Then, run the app with hypercorn
`python3 -m hypercorn main:app --reload`

This will start a live reloading function on http://localhost:8080.

Check with `curl http://localhost:8000`

You should get the following json back:

`{"message":"Hello World"}`

## Environment variables and RabbitMQ

If you're running this on a Mac, make sure that your have the `GOOGLE_APPLICATION_CREDENTIALS` environment variable set up, and that it points to the path to your service account key with write access to Google Cloud Storage

Additionally, make sure that you have RabbitMQ installed with `brew install rabbitmq`, followed by `brew services start rabbitmq`