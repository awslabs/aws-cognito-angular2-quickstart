#!/usr/bin/env bash

AWS_CMD=${AWS_CMD:-aws}
NPM_DIR=${ROOT_DIR}/node_modules/
REGION=${REGION:-us-east-2}
EB_INSTANCE_TYPE=t2.small
EB_PLATFORM=node.js


build() {
    echo "Building the project"
    cd ${ROOT_DIR}

    if [ ! -d "${NPM_DIR}" ]; then
        npm install
    fi

    ng build $( if [ "${AWS_CMD}" == "awslocal" ]; then echo "--base-href /${BUCKET_NAME}/"; fi )
}

upload() {
    echo "Syncing files to the S3 bucket from " ${ROOT_DIR}/dist/
    ${AWS_CMD} s3 sync ${ROOT_DIR}/dist/ s3://${BUCKET_NAME}/  --region ${REGION}
}


uploadS3Bucket() {
    # Add the ‘website’ configuration and bucket policy
    ${AWS_CMD} s3 website s3://${BUCKET_NAME}/ --index-document index.html --error-document index.html  --region ${REGION}
    cat s3-bucket-policy.json | sed 's/BUCKET_NAME/'${BUCKET_NAME}'/' > /tmp/s3-bucket-policy.json

    ${AWS_CMD} s3api put-bucket-policy --bucket ${BUCKET_NAME} --policy file:///tmp/s3-bucket-policy.json  --region ${REGION}
    # Build the project and sync it up to the bucket
    build
    upload
}

printConfig() {
    echo "Region: " ${REGION}
    echo "DynamoDB: " ${TABLE_NAME}
    echo "Bucket name: " ${BUCKET_NAME}
    echo "Identity Pool name: " ${IDENTITY_POOL_NAME}
    echo "Identity Pool id: " ${IDENTITY_POOL_ID}
    echo "User Pool id: " ${USER_POOL_ID}
    echo "User Pool Client id: " ${USER_POOL_CLIENT_ID}
    echo "Finished AWS resource creation. Status: SUCCESS"
}

writeConfigFiles() {
(
cat <<EOF
export const environment = {
    production: false,

    region: '${REGION}',

    identityPoolId: '${IDENTITY_POOL_ID}',
    userPoolId: '${USER_POOL_ID}',
    clientId: '${USER_POOL_CLIENT_ID}',

    rekognitionBucket: 'rekognition-pics',
    albumName: "usercontent",
    bucketRegion: '${REGION}',

    ddbTableName: '${TABLE_NAME}',

    cognito_idp_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4590'; fi )',
    cognito_identity_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4591'; fi )',
    sts_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4592'; fi )',
    dynamodb_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4569'; fi )',
    s3_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4572'; fi )'
};

EOF
) > ${ROOT_DIR}/src/environments/environment.ts

(
cat <<EOF
export const environment = {
    production: true,

    region: '${REGION}',

    identityPoolId: '${IDENTITY_POOL_ID}',
    userPoolId: '${USER_POOL_ID}',
    clientId: '${USER_POOL_CLIENT_ID}',

    rekognitionBucket: 'rekognition-pics',
    albumName: "usercontent",
    bucketRegion: '${REGION}',

    ddbTableName: '${TABLE_NAME}',

    cognito_idp_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4590'; fi )',
    cognito_identity_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4591'; fi )',
    sts_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4592'; fi )',
    dynamodb_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4569'; fi )',
    s3_endpoint: '$( if [ "${AWS_CMD}" == "awslocal" ]; then echo 'http://localhost:4572'; fi )'
};

EOF
) > ${ROOT_DIR}/src/environments/environment.prod.ts

}

createResourcesCloudFormation() {
    # TODO: Might be needed when we use sub stacks or lambda functions
    #echo -n "Enter the bucket name that will be used for the packaging for CloudFormation and press [ENTER]: "
    #read PACKAGE_BUCKET_NAME
    #${AWS_CMD} cloudformation package --s3-bucket ${PACKAGE_BUCKET_NAME} --template-file ${ROOT_DIR}/aws/template.yaml --output-template-file ${ROOT_DIR}/template-packaged.yaml   --region ${REGION}

    ${AWS_CMD} cloudformation deploy --template-file ${ROOT_DIR}/aws/template.yaml --stack-name ${ROOT_NAME} --capabilities CAPABILITY_IAM --region ${REGION}
}


createCognitoResources() {
    # Create a Cognito Identity and Set roles
    ${AWS_CMD} cognito-identity create-identity-pool --identity-pool-name ${IDENTITY_POOL_NAME} --allow-unauthenticated-identities --region ${REGION}| grep IdentityPoolId | awk '{print $2}' | xargs |sed -e 's/^"//'  -e 's/"$//' -e 's/,$//' > /tmp/poolId
    IDENTITY_POOL_ID=$(cat /tmp/poolId)
    echo "Created an identity pool with id of " ${IDENTITY_POOL_ID}

    # Create an IAM role for unauthenticated users
    cat unauthrole-trust-policy.json | sed 's/IDENTITY_POOL/'${IDENTITY_POOL_ID}'/' > /tmp/unauthrole-trust-policy.json
    ${AWS_CMD} iam create-role --role-name $ROLE_NAME_PREFIX-unauthenticated-role --assume-role-policy-document file:///tmp/unauthrole-trust-policy.json > /tmp/iamUnauthRole
    if [ $? -eq 0 ]
    then
        echo "IAM unauthenticated role successfully created"
    else
        echo "Using the existing role ..."
        ${AWS_CMD} iam get-role --role-name $ROLE_NAME_PREFIX-unauthenticated-role  > /tmp/iamUnauthRole
        ${AWS_CMD} iam update-assume-role-policy --role-name $ROLE_NAME_PREFIX-unauthenticated-role --policy-document file:///tmp/unauthrole-trust-policy.json
    fi
    ${AWS_CMD} iam put-role-policy --role-name $ROLE_NAME_PREFIX-unauthenticated-role --policy-name CognitoPolicy --policy-document file://unauthrole.json

    # Create an IAM role for authenticated users
    cat authrole-trust-policy.json | sed 's/IDENTITY_POOL/'${IDENTITY_POOL_ID}'/' > /tmp/authrole-trust-policy.json
    ${AWS_CMD} iam create-role --role-name $ROLE_NAME_PREFIX-authenticated-role --assume-role-policy-document file:///tmp/authrole-trust-policy.json > /tmp/iamAuthRole
    if [ $? -eq 0 ]
    then
        echo "IAM authenticated role successfully created"
    else
        echo "Using the existing role ..."
        ${AWS_CMD} iam get-role --role-name $ROLE_NAME_PREFIX-authenticated-role  > /tmp/iamAuthRole
        ${AWS_CMD} iam update-assume-role-policy --role-name $ROLE_NAME_PREFIX-authenticated-role --policy-document file:///tmp/authrole-trust-policy.json
    fi
    cat authrole.json | sed 's~DDB_TABLE_ARN~'$DDB_TABLE_ARN'~' > /tmp/authrole.json
    ${AWS_CMD} iam put-role-policy --role-name $ROLE_NAME_PREFIX-authenticated-role --policy-name CognitoPolicy --policy-document file:///tmp/authrole.json

    # Create the user pool
    ${AWS_CMD} cognito-idp create-user-pool --pool-name $POOL_NAME --auto-verified-attributes email --policies file://user-pool-policy.json --region ${REGION} > /tmp/$POOL_NAME-create-user-pool
    USER_POOL_ID=$(grep -E '"Id":' /tmp/$POOL_NAME-create-user-pool | awk -F'"' '{print $4}')
    echo "Created user pool with an id of " ${USER_POOL_ID}

    # Create the user pool client
    ${AWS_CMD} cognito-idp create-user-pool-client --user-pool-id ${USER_POOL_ID} --no-generate-secret --client-name webapp --region ${REGION} > /tmp/$POOL_NAME-create-user-pool-client
    USER_POOL_CLIENT_ID=$(grep -E '"ClientId":' /tmp/$POOL_NAME-create-user-pool-client | awk -F'"' '{print $4}')
    echo "Created user pool client with id of " ${USER_POOL_CLIENT_ID}

    # Add the user pool and user pool client id to the identity pool
    ${AWS_CMD} cognito-identity update-identity-pool --allow-unauthenticated-identities --identity-pool-id ${IDENTITY_POOL_ID} --identity-pool-name ${IDENTITY_POOL_NAME} \
        --cognito-identity-providers ProviderName=cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID},ClientId=${USER_POOL_CLIENT_ID} --region ${REGION} \
        > /tmp/${IDENTITY_POOL_ID}-add-user-pool

    # Update cognito identity with the roles
    UNAUTH_ROLE_ARN=$(perl -nle 'print $& if m{"Arn":\s*"\K([^"]*)}' /tmp/iamUnauthRole | awk -F'"' '{print $1}')
    AUTH_ROLE_ARN=$(perl -nle 'print $& if m{"Arn":\s*"\K([^"]*)}' /tmp/iamAuthRole | awk -F'"' '{print $1}')
    ${AWS_CMD} cognito-identity set-identity-pool-roles --identity-pool-id ${IDENTITY_POOL_ID} --roles authenticated=$AUTH_ROLE_ARN,unauthenticated=$UNAUTH_ROLE_ARN --region ${REGION}
}

createDDBTable() {
    # Create DDB Table
    ${AWS_CMD} dynamodb create-table \
        --table-name ${TABLE_NAME} \
        --attribute-definitions \
            AttributeName=userId,AttributeType=S \
            AttributeName=activityDate,AttributeType=S \
        --key-schema AttributeName=userId,KeyType=HASH AttributeName=activityDate,KeyType=RANGE \
        --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
        --region ${REGION} \
        > /tmp/dynamoTable

    if [ $? -eq 0 ]
    then
        echo "DynamoDB table successfully created"
    else
        echo "Using the existing table ..."
        ${AWS_CMD} dynamodb describe-table --table-name ${TABLE_NAME} > /tmp/dynamoTable
    fi

    DDB_TABLE_ARN=$(perl -nle 'print $& if m{"TableArn":\s*"\K([^"]*)}' /tmp/dynamoTable | awk -F'"' '{print $1}')
}

createEBResources() {
    verifyEBCLI

    # Commit changes made
    cd ${ROOT_DIR}
    npm run-script build

    # Create Elastic Beanstalk application
    eb init $ROOT_NAME --region ${REGION} --platform $EB_PLATFORM
    sleep 1

    zip -r upload.zip . -x node_modules/\* *.git* *.idea* *.DS_Store*
cat <<EOT >> ${ROOT_DIR}/.elasticbeanstalk/config.yml
deploy:
  artifact: upload.zip
EOT

    sleep 1

    # Create Elastic Beanstalk environment
    eb create $ROOT_NAME -d --region ${REGION} --platform $EB_PLATFORM --instance_type $EB_INSTANCE_TYPE

    cd $CURR_DIR
}

createS3Bucket() {
    # Create the bucket
    ${AWS_CMD} s3 mb s3://${BUCKET_NAME}/ --region ${REGION} 2>/tmp/s3-mb-status
    status=$?

    if [ $status -eq 0 ]
    then
        echo "S3 bucket successfully created. Uploading files to S3."
        uploadS3Bucket
    else
        if grep "BucketAlreadyOwnedByYou" /tmp/s3-mb-status > /dev/null
        then
            echo "Using the existing S3 bucket ..."
            uploadS3Bucket
        else
            echo -n "The requested S3 bucket name is not available. Please enter a different name and try again : "
            read newName
            BUCKET_NAME=cognitosample-$(echo "$newName" | tr '[:upper:]' '[:lower:]')
            echo "Attempting to create bucket named ${BUCKET_NAME}"
            createS3Bucket
        fi
    fi
}

provisionGlobalResources() {
    createDDBTable
    createCognitoResources
    writeConfigFiles
}

verifyEBCLI() {
    if command -v eb >/dev/null; then
        echo "Creating Elastic Beanstalk environment. This can take more than 10 min ..."
    else
        echo "Please install the Elastic Beanstalk Command Line Interface first"
        exit 1;
    fi
}
