import {Injectable} from "@angular/core";
import {CognitoUser} from "amazon-cognito-identity-js";
import {CognitoSessionService} from "./cognito-session.service";
import {Callback} from "./cognito.service";

@Injectable()
export class UserParametersService {

    constructor(public cognitoSession: CognitoSessionService) {
    }

    getParameters(callback: Callback) {
        this.cognitoSession.getCurrentUser().then( (user:CognitoUser) => {
            if (user != null) {
                user.getSession(function (err, session) {
                    if (err)
                        console.log("UserParametersService: Couldn't retrieve the user");
                    else {
                        user.getUserAttributes(function (err, result) {
                            if (err) {
                                console.log("UserParametersService: in getParameters: " + err);
                            } else {
                                callback.callbackWithParam(result);
                            }
                        });
                    }
                });
            } else {
                callback.callbackWithParam(null);
            }
        });
    }
}