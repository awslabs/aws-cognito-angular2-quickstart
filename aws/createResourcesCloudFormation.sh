#!/usr/bin/env bash

# General Setup
CURR_DIR=$( cd $(dirname $0) ; pwd -P )
ROOT_DIR=$( cd $CURR_DIR; cd ..; pwd -P)
. ${ROOT_DIR}/aws/functions.sh

echo -n "Enter the name for your resources (must be all lowercase with no spaces) and press [ENTER]: "
read ROOT_NAME

# Create the resources
createResourcesCloudFormation

# Get the resource names
USER_POOL_ID=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'UserPool'] | [0].OutputValue")
USER_POOL_CLIENT_ID=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'UserPoolClient'] | [0].OutputValue")
IDENTITY_POOL_ID=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'IdentityPool'] | [0].OutputValue")
BUCKET_NAME=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'WebAppBucket'] | [0].OutputValue")
TABLE_NAME=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'LoginTrail'] | [0].OutputValue")
URL=$(${AWS_CMD} cloudformation describe-stacks --stack-name ${ROOT_NAME} --output text --query "Stacks[0].Outputs[?OutputKey == 'WebAppURL'] | [0].OutputValue")

# Write the config files
writeConfigFiles

# Build the application
build

# Upload the application to S3
upload

# Display the configuration
printConfig

echo ""
echo "Navigate to ${URL} to see the result!"
echo ""
