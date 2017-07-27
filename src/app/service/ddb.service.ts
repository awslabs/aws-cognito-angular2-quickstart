import {Injectable} from "@angular/core";
import {environment} from "../../environments/environment";
import {CognitoSessionService} from "./cognito-session.service";
import {Stuff} from "../secure/useractivity/useractivity.component";
import * as AWS from "aws-sdk/global";
import * as DynamoDB from "aws-sdk/clients/dynamodb";

/**
 * Created by Vladimir Budilov
 */

@Injectable()
export class DynamoDBService {

    constructor(public cognitoSession: CognitoSessionService) {
        console.log("DynamoDBService: constructor");
    }

    getAWS() {
        return AWS;
    }

    getLogEntries(mapArray: Array<Stuff>) {
        this.cognitoSession.getCreds().then( function(creds:AWS.CognitoIdentityCredentials) {
            console.log("DynamoDBService: reading from DDB with creds - " + AWS.config.credentials);
            var params = {
                TableName: environment.ddbTableName,
                KeyConditionExpression: "userId = :userId",
                ExpressionAttributeValues: {
                    ":userId": creds.identityId
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
        });
    }

    writeLogEntry(type: string) {
        var self = this;
        this.cognitoSession.getCreds().then( function(creds:AWS.CognitoIdentityCredentials) {
            try {
                let date = new Date().toString();
                console.log("DynamoDBService: Writing log entry. Type:" + type + " ID: " + creds.identityId + " Date: " + date);
                self.write(creds.identityId, date, type);
            } catch (exc) {
                console.log("DynamoDBService: Couldn't write to DDB");
                console.log(exc)
            }
        });
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


