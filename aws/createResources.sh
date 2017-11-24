#!/usr/bin/env bash

# General Setup
CURR_DIR=$( cd $(dirname $0) ; pwd -P )
ROOT_DIR=$( cd $CURR_DIR; cd ..; pwd -P)
. ${ROOT_DIR}/aws/functions.sh

# Bucket name must be all lowercase, and start/end with lowercase letter or number
# $(echo...) code to work with versions of bash older than 4.0

echo -n "Enter the name for your resources (must be all lowercase with no spaces) and press [ENTER]: "
read ROOT_NAME

BUCKET_NAME=cognitosample-$(echo "${ROOT_NAME}" | tr '[:upper:]' '[:lower:]')
TABLE_NAME=LoginTrail${ROOT_NAME}

ROLE_NAME_PREFIX=${ROOT_NAME}
POOL_NAME=${ROOT_NAME}
IDENTITY_POOL_NAME=${ROOT_NAME}
DDB_TABLE_ARN=""
IDENTITY_POOL_ID=""
USER_POOL_ID=""
USER_POOL_CLIENT_ID=""

if [[ ${ROOT_NAME} =~ [[:upper:]]|[[:space:]] || -z "${ROOT_NAME}" ]]; then
    echo "Invalid format"
    exit 1
else
    echo "All AWS resources will be created with [${ROOT_NAME}] as part of their name"

    PS3='Where would you like to deploy your application? '
    options=("Elastic Beanstalk" "S3" "Quit")
    select opt in "${options[@]}"
    do
        case $opt in
            "Elastic Beanstalk")
                provisionGlobalResources
                createEBResources
                printConfig
                break
                ;;
            "S3")
                provisionGlobalResources
                createS3Bucket
                printConfig
                break
                ;;
            "Quit")
                exit 1
                ;;
            *)
                echo "Invalid option"
                exit 1
                ;;
        esac
    done
fi
