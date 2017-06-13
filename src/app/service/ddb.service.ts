import {Injectable, Inject, forwardRef} from "@angular/core";
import { AwsUtil } from "./aws.service";
import {environment} from "../../environments/environment";

import {Stuff} from "../secure/useractivity/useractivity.component";

import * as CognitoIdentity from "aws-sdk/clients/cognitoidentity"; 
import * as AWS from "aws-sdk/global";
import * as DynamoDB from "aws-sdk/clients/dynamodb";

/**
 * Created by Vladimir Budilov
 */

@Injectable()
export class DynamoDBService {

    constructor(@Inject(forwardRef(() =>AwsUtil)) public awsUtil:AwsUtil) {
        console.log("DynamoDBService: constructor");
    }

    getAWS() {
        return AWS;
    }

    getLogEntries(mapArray: Array<Stuff>) {
        console.log("DynamoDBService: reading from DDB with creds - " + AWS.config.credentials);
        var params = {
            TableName: environment.ddbTableName,
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": this.awsUtil.getCognitoCreds().identityId
            }
        };

        var docClient = new DynamoDB.DocumentClient();
        docClient.query(params, onQuery);

        function onQuery(err, data) {
            if (err) {
                console.error("DynamoDBService: Unable to query the table. Error JSON:", JSON.stringify(err, null, 2));
            } else {
                // print all the movies
                console.log("DynamoDBService: Query succeeded.");
                data.Items.forEach(function (logitem) {
                    mapArray.push({type: logitem.type, date: logitem.activityDate});
                });
            }
        }
    }

    writeLogEntry(type: string) {
        try {
            let date = new Date().toString();
            console.log("DynamoDBService: Writing log entry. Type:" + type + " ID: " + this.awsUtil.getCognitoCreds().identityId + " Date: " + date);
            this.write(this.awsUtil.getCognitoCreds().identityId, date, type);
        } catch (exc) {
            console.log("DynamoDBService: Couldn't write to DDB");
        }

    }

    write(data: string, date: string, type: string): void {
        console.log("DynamoDBService: writing " + type + " entry");
        var DDB = new DynamoDB({
            params: {TableName: environment.ddbTableName}
        });

        // Write the item to the table
        var itemParams =
            {
                TableName: environment.ddbTableName,
                Item: {
                    userId: {S: data},
                    activityDate: {S: date},
                    type: {S: type}
                }
            };
        DDB.putItem(itemParams, function (result) {
            console.log("DynamoDBService: wrote entry: " + JSON.stringify(result));
        });
    }

}


