import {Injectable} from "@angular/core";
import {CognitoUtil, Callback} from "./cognito.service";
import * as AWS from "aws-sdk/global";
import * as CognitoIdentity from "aws-sdk/clients/cognitoidentity";

/**
 * Created by Vladimir Budilov
 */

// declare var AMA: any;

@Injectable()
export class AwsUtil {
    public static firstLogin: boolean = false;
    public static runningInit: boolean = false;

    public cognitoCreds:AWS.CognitoIdentityCredentials;

    constructor() {
        AWS.config.region = CognitoUtil._REGION;
    }

    // AWS Stores Credentials in many ways, and with TypeScript this means that 
    // getting the base credentials we authenticated with from the AWS globals gets really murky,
    // having to get around both class extension and unions. Therefore, we're going to give
    // developers direct access to the raw, unadulterated CognitoIdentityCredentials
    // object at all times.
    setCognitoCreds(creds:AWS.CognitoIdentityCredentials) {
        this.cognitoCreds = creds;
    }

    getCognitoCreds(){
        return this.cognitoCreds;
    }

    // This method takes in a raw jwtToken and uses the global AWS config options to build a
    // CognitoIdentityCredentials object and store it for us. It also returns the object to the caller
    // to avoid unnecessary calls to setCognitoCreds.

    buildCognitoCreds(idTokenJwt:string) {
        let url = 'cognito-idp.' + CognitoUtil._REGION.toLowerCase() + '.amazonaws.com/' + CognitoUtil._USER_POOL_ID;
        let logins:CognitoIdentity.LoginsMap = {};
        logins[url] = idTokenJwt;
        let params = {
            IdentityPoolId: CognitoUtil._IDENTITY_POOL_ID, /* required */
            Logins: logins
        };
        let creds = new AWS.CognitoIdentityCredentials(params);
        this.setCognitoCreds(creds);
        return creds;
    }

    /**
     * This is the method that needs to be called in order to init the aws global creds
     */
    initAwsService(callback: Callback, isLoggedIn: boolean, idToken: string) {

        if (AwsUtil.runningInit) {
            // Need to make sure I don't get into an infinite loop here, so need to exit if this method is running already
            console.log("AwsUtil: Aborting running initAwsService()...it's running already.");
            // instead of aborting here, it's best to put a timer
            if (callback != null) {
                callback.callback();
                callback.callbackWithParam(null);
            }
            return;
        }


        console.log("AwsUtil: Running initAwsService()");
        AwsUtil.runningInit = true;


        let mythis = this;
        // First check if the user is authenticated already
        if (isLoggedIn)
            mythis.setupAWS(isLoggedIn, callback, idToken);

    }


    /**
     * Sets up the AWS global params
     *
     * @param isLoggedIn
     * @param callback
     */
    setupAWS(isLoggedIn: boolean, callback: Callback, idToken: string): void {
        console.log("AwsUtil: in setupAWS()");
        if (isLoggedIn) {
            console.log("AwsUtil: User is logged in");
            // Setup mobile analytics
            var options = {
                appId: '32673c035a0b40e99d6e1f327be0cb60',
                appTitle: "aws-cognito-angular2-quickstart"
            };

            // TODO: The mobile Analytics client needs some work to handle Typescript. Disabling for the time being.
            // var mobileAnalyticsClient = new AMA.Manager(options);
            // mobileAnalyticsClient.submitEvents();

            this.addCognitoCredentials(idToken);

            console.log("AwsUtil: Retrieving the id token");

        }
        else {
            console.log("AwsUtil: User is not logged in");
        }

        if (callback != null) {
            callback.callback();
            callback.callbackWithParam(null);
        }

        AwsUtil.runningInit = false;
    }

    addCognitoCredentials(idTokenJwt: string): void {
        let creds = this.buildCognitoCreds(idTokenJwt);

        AWS.config.credentials = creds;

        creds.get(function (err) {
            if (!err) {
                if (AwsUtil.firstLogin) {
                    // save the login info to DDB
                    this.ddb.writeLogEntry("login");
                    AwsUtil.firstLogin = false;
                }
            }
        });
    }

    static getCognitoParametersForIdConsolidation(idTokenJwt: string): {} {
        console.log("AwsUtil: enter getCognitoParametersForIdConsolidation()");
        let url = 'cognito-idp.' + CognitoUtil._REGION.toLowerCase() + '.amazonaws.com/' + CognitoUtil._USER_POOL_ID;
        let logins: Array<string> = [];
        logins[url] = idTokenJwt;
        let params = {
            IdentityPoolId: CognitoUtil._IDENTITY_POOL_ID, /* required */
            Logins: logins
        };

        return params;
    }

}
