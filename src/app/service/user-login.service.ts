import {Injectable} from "@angular/core";
import {DynamoDBService} from "./ddb.service";
import {CognitoCallback, LoggedInCallback} from "./cognito.service";
import {AuthenticationDetails, CognitoUser} from "amazon-cognito-identity-js";
import {CognitoSessionService} from "./cognito-session.service";
import * as AWS from "aws-sdk/global";
import * as STS from "aws-sdk/clients/sts";

@Injectable()
export class UserLoginService {

    constructor(public ddb: DynamoDBService, public cognitoSession: CognitoSessionService) {
    }

    authenticate(username: string, password: string, callback: CognitoCallback) {
        console.log("UserLoginService: starting the authentication")

        let authenticationData = {
            Username: username,
            Password: password,
        };
        let authenticationDetails = new AuthenticationDetails(authenticationData);

        let userData = {
            Username: username,
            Pool: this.cognitoSession.cognitoUserPool
        };

        console.log("UserLoginService: Params set...Authenticating the user");
        let cognitoUser = new CognitoUser(userData);
        console.log("UserLoginService: config is " + AWS.config);
        var self = this;
        cognitoUser.authenticateUser(authenticationDetails, {
            newPasswordRequired: function (userAttributes, requiredAttributes) {
                callback.cognitoCallback(`User needs to set password.`, null);
            },
            onSuccess: function (result) {

                console.log("UserLoginService: authenticate: Authentication successful, creating session...");

                self.cognitoSession.initSession(cognitoUser).then(function(result) {
                    callback.cognitoCallback(null, result);
                });

            },
            onFailure: function (err) {
                callback.cognitoCallback(err.message, null);
            },
        });
    }

    forgotPassword(username: string, callback: CognitoCallback) {
        let userData = {
            Username: username,
            Pool: this.cognitoSession.cognitoUserPool
        };

        let cognitoUser = new CognitoUser(userData);

        cognitoUser.forgotPassword({
            onSuccess: function () {

            },
            onFailure: function (err) {
                callback.cognitoCallback(err.message, null);
            },
            inputVerificationCode() {
                callback.cognitoCallback(null, null);
            }
        });
    }

    confirmNewPassword(email: string, verificationCode: string, password: string, callback: CognitoCallback) {
        let userData = {
            Username: email,
            Pool: this.cognitoSession.cognitoUserPool
        };

        let cognitoUser = new CognitoUser(userData);

        cognitoUser.confirmPassword(verificationCode, password, {
            onSuccess: function () {
                callback.cognitoCallback(null, null);
            },
            onFailure: function (err) {
                callback.cognitoCallback(err.message, null);
            }
        });
    }

    logout() {
        let logoutFunc = 
        this.cognitoSession.getCurrentUser().then( (user:CognitoUser) => {
            console.log("UserLoginService: Logging out");
            Promise.resolve(this.ddb.writeLogEntry("logout")).then( () => { user.signOut(); });
        } );
    }

    isAuthenticated(callback: LoggedInCallback) {
        if (callback == null) {
            throw("UserLoginService: Callback in isAuthenticated() cannot be null");
        } else {
            this.cognitoSession.getCurrentUser().then( (user:CognitoUser) => {
                if ( user != null ) {
                    user.getSession(function (err, session) {
                        if (err) {
                            console.log("UserLoginService: Couldn't get the session: " + err, err.stack);
                            callback.isLoggedIn(err, false);
                        } else {
                            console.log("UserLoginService: Session is " + session.isValid());
                            callback.isLoggedIn(err, session.isValid());
                        }
                    });
                } else {
                    console.log("UserLoginService: can't retrieve the current user");
                    callback.isLoggedIn("Can't retrieve the CurrentUser", false);
                }
            });
        }
    }

}