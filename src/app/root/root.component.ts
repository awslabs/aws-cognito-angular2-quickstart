/**
 * @author Vladimir Budilov
 *
 * This is the entry-way into the routing logic. 
 *
 */
import {Component, OnInit} from "@angular/core";
import {AwsUtil} from "../service/aws.service";
import {UserLoginService, CognitoUtil, LoggedInCallback} from "../service/cognito.service";

@Component({
    selector: 'root-component',
    templateUrl: 'root.html'
})
export class RootComponent implements OnInit, LoggedInCallback {

    constructor(public awsUtil: AwsUtil, public userService: UserLoginService, public cognito: CognitoUtil) {
        console.log("RootComponent: constructor");
    }

    ngOnInit() {
        console.log("RootComponent: Checking if the user is already authenticated");
        this.userService.isAuthenticated(this);
    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        console.log("RootComponent: the user is authenticated: " + isLoggedIn);
        let mythis = this;
        this.cognito.getIdToken({
            callback() {

            },
            callbackWithParam(token: any) {
                // Include the passed-in callback here as well so that it's executed downstream
                console.log("RootComponent: calling initAwsService in callback")
                mythis.awsUtil.initAwsService(null, isLoggedIn, token);
            }
        });
    }
}

