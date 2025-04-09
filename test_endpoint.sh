#!/bin/bash

# Base URL for the API
BASE_URL="http://localhost:5001"

# Default settings
SHOW_FULL=false
VERBOSE=false

# Function to print usage instructions
print_usage() {
    echo "Usage: $0 [-f|--full] [-v|--verbose] endpoint [args...]"
    echo ""
    echo "Options:"
    echo "  -f, --full     Show full base64 data instead of truncated version"
    echo "  -v, --verbose  Show the actual command being executed"
    echo ""
    echo "Available endpoints:"
    echo "  capture              - Capture a screenshot"
    echo "  sendrequest         - Send request to OpenAI (requires message=<text>)"
    echo "  recentcaptures      - Get recent captures"
    echo "  recentresponses     - Get recent responses"
    echo "  archivedcaptures    - Get archived captures"
    echo "  moveimage           - Move image (requires image_id=<id> action=<archive|unarchive>)"
    echo "  deleteimage         - Delete image (requires image_id=<id>)"
    echo "  deleteresponse      - Delete response (requires response_id=<id>)"
    echo "  serverlogs         - Get server logs"
    echo "  stats              - Get system statistics"
    echo "  routes             - Get API routes"
    echo "  system             - Get system information"
    echo "  logs               - Get server logs"
    echo ""
    echo "Example usage:"
    echo "  $0 capture"
    echo "  $0 --full recentcaptures"
    echo "  $0 -v sendrequest message=\"What do you see in this image?\""
    echo "  $0 moveimage image_id=123 action=archive"
    exit 1
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--full)
            SHOW_FULL=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

# Check if at least one argument (endpoint) is provided
if [ $# -lt 1 ]; then
    print_usage
fi

# Extract the endpoint name and validate it
endpoint=$1
if ! [[ $endpoint =~ ^[a-z]+$ ]]; then
    echo "Error: Endpoint name must contain only lowercase letters (a-z)"
    exit 1
fi

# Remove the first argument (endpoint) from the arguments list
shift

# Initialize parameters string
params=""

# Process additional arguments if they exist
for arg in "$@"; do
    if [[ $arg =~ ^[^=]+=.+$ ]]; then
        if [ -z "$params" ]; then
            params="?$arg"
        else
            params="$params&$arg"
        fi
    fi
done

# Determine HTTP method and endpoint URL based on the endpoint name
case $endpoint in
    capture)
        method="POST"
        url="$BASE_URL/capture"
        ;;
    sendrequest)
        method="POST"
        url="$BASE_URL/send_request"
        # Convert query parameters to JSON for POST request
        if [ ! -z "$params" ]; then
            # Remove the leading '?' from params
            params=${params:1}
            # Convert key=value to JSON
            json="{"
            while IFS='=' read -r key value; do
                # URL decode the value
                value=$(echo "$value" | sed 's/+/ /g;s/%/\\x/g' | xargs -0 echo -e)
                json="$json\"$key\":\"$value\","
            done < <(echo "$params" | tr '&' '\n')
            json=${json%,}  # Remove trailing comma
            json="$json}"
            params="--data '$json'"
        fi
        ;;
    recentcaptures)
        method="GET"
        url="$BASE_URL/recent_captures"
        ;;
    recentresponses)
        method="GET"
        url="$BASE_URL/recent_responses"
        ;;
    archivedcaptures)
        method="GET"
        url="$BASE_URL/archived_captures"
        ;;
    moveimage)
        method="POST"
        url="$BASE_URL/move_image"
        # Convert query parameters to JSON
        if [ ! -z "$params" ]; then
            # Remove the leading '?' from params
            params=${params:1}
            # Extract image_id and action
            image_id=$(echo "$params" | grep -o 'image_id=[^&]*' | cut -d= -f2)
            action=$(echo "$params" | grep -o 'action=[^&]*' | cut -d= -f2)
            # Create JSON without the -e prefix
            json="{\"image_id\":\"$image_id\",\"action\":\"$action\"}"
            params="--data '$json'"
        fi
        ;;
    deleteimage)
        method="POST"
        url="$BASE_URL/delete_image"
        if [ ! -z "$params" ]; then
            params=${params:1}
            json="{\"image_id\":\"${params#image_id=}\"}"
            params="--data '$json'"
        fi
        ;;
    deleteresponse)
        method="POST"
        url="$BASE_URL/delete_response"
        if [ ! -z "$params" ]; then
            params=${params:1}
            json="{\"response_id\":\"${params#response_id=}\"}"
            params="--data '$json'"
        fi
        ;;
    serverlogs|logs)
        method="GET"
        url="$BASE_URL/api/logs"
        ;;
    stats)
        method="GET"
        url="$BASE_URL/api/stats"
        ;;
    routes)
        method="GET"
        url="$BASE_URL/api/routes"
        ;;
    system)
        method="GET"
        url="$BASE_URL/api/system"
        ;;
    *)
        echo "Error: Unknown endpoint '$endpoint'"
        print_usage
        ;;
esac

# Construct and execute the curl command
if [ "$SHOW_FULL" = true ]; then
    if [ "$method" = "GET" ]; then
        cmd="curl -s -X $method \"$url$params\" | jq"
    else
        cmd="curl -s -X $method -H 'Content-Type: application/json' $params \"$url\" | jq"
    fi
else
    if [ "$method" = "GET" ]; then
        cmd="curl -s -X $method \"$url$params\" | jq 'walk(if type == \"object\" and has(\"image_data\") then .image_data = (.image_data[0:100] + \"...\") else . end)'"
    else
        cmd="curl -s -X $method -H 'Content-Type: application/json' $params \"$url\" | jq 'walk(if type == \"object\" and has(\"image_data\") then .image_data = (.image_data[0:100] + \"...\") else . end)'"
    fi
fi

# Show command if verbose mode is enabled
if [ "$VERBOSE" = true ]; then
    echo "Command: $cmd"
fi

eval $cmd || cat 