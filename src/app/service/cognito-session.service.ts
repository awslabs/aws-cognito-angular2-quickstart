import {Injectable} from "@angular/core";
import {environment} from "../../environments/environment";
import {
    AuthenticationDetails,
    CognitoIdentityServiceProvider,
    CognitoUser,
    CognitoUserAttribute,
    CognitoUserPool,
    CognitoUserSession
} from "amazon-cognito-identity-js";
import * as AWS from "aws-sdk/global";
import * as CognitoIdentity from "aws-sdk/clients/cognitoidentity";

/**
 * Created by Vladimir Budilov
 */


/**
 * Represents the Cognito Session Service, which manages the overall Cognito session.
 */
@Injectable()
export class CognitoSessionService {

    private cognitoUser: Promise<CognitoUser>;
    private cognitoCreds: Promise<AWS.CognitoIdentityCredentials>;
    public cognitoUserPool: CognitoUserPool;

    constructor() {
        console.log("Constructing CognitoSessionService");
        AWS.config.region = environment.region;
        this.cognitoUserPool = new CognitoUserPool({
            UserPoolId: environment.userPoolId,
            ClientId: environment.clientId
        })
    }

    /**
     * Initialize a session.
     * @param user - the Cognito User to initialize the session with.
     */
    initSession(user:CognitoUser):Promise<AWS.CognitoIdentityCredentials> {
        console.log("Initializing user session...");
        this.cognitoUser = Promise.resolve(user);
        return this.cognitoUser.then(function (user:CognitoUser) {
            return user.getSignInUserSession()
        }).then(this.initCognitoCreds);
    }

    /**
     * Retrieves the credentials for the session.
     * Before returning the credential Promise, the session is validated and regenerated if necessary.
     */
    getCreds = ():Promise<AWS.CognitoIdentityCredentials> => {
        return this.getCurrentUser().then(this.getCredsInternal);
    }

    /**
     * Retrieves the current user (from session data if necessary)
     */
    getCurrentUser = ():Promise<CognitoUser> => {
        if (this.cognitoUser == null) {
            console.log("cognitoSession: User is null; Retrieving user from Cognito Pool.");
            this.cognitoUser = Promise.resolve(this.cognitoUserPool.getCurrentUser());
        }
        return this.cognitoUser;
    }

    // Make this a named method so that "this" is availble.
    private getCredsInternal = (user:CognitoUser):Promise<AWS.CognitoIdentityCredentials> => {
        if (this.cognitoCreds == null) {
            console.log("congnitoSession: Creds are invalid; getting creds from session.");
            return this.refreshSession(user).then(this.initCognitoCreds);
        }
        return Promise.resolve(this.cognitoCreds);
    }

    private refreshSession(user:CognitoUser):Promise<CognitoUserSession> {
        return new Promise(function(resolve,reject){
            user.getSession(function(err,data){
                 if(err !== null) return reject(err);
                 resolve(data);
            });
        });
    }

    private initCognitoCreds = (session:CognitoUserSession):Promise<AWS.CognitoIdentityCredentials> => {
        console.log("cognitoSession: initCognitoCreds: Initializing Cognito credentials...");
        let idTokenJwt = session.getIdToken().getJwtToken()
        let url = 'cognito-idp.' + environment.region.toLowerCase() + '.amazonaws.com/' + environment.userPoolId;
        let logins: CognitoIdentity.LoginsMap = {};
        logins[url] = idTokenJwt;
        let params = {
            IdentityPoolId: environment.identityPoolId, /* required */
            Logins: logins
        };
        let creds = new AWS.CognitoIdentityCredentials(params);
        AWS.config.credentials = creds;
        var credsPromise = Promise.resolve(creds);
        this.cognitoCreds = credsPromise;
        return creds.getPromise().then(function() {
            return credsPromise;
        });
    }

}