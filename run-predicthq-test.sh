#!/bin/bash

# Set your PredictHQ API key here
export PREDICTHQ_API_KEY="YOUR_PREDICTHQ_API_KEY"

# Run the test script with Deno
deno run --allow-net --allow-env test-predicthq.js
