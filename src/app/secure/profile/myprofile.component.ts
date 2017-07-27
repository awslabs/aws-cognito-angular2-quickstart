import {Component} from "@angular/core";
import {UserLoginService} from "../../service/user-login.service";
import {Callback, LoggedInCallback} from "../../service/cognito.service";
import {CognitoSessionService} from "../../service/cognito-session.service";
import {UserParametersService} from "../../service/user-parameters.service";
import {Router} from "@angular/router";
import * as AWS from "aws-sdk/global";

@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './myprofile.html'
})
export class MyProfileComponent implements LoggedInCallback {

    public parameters: Array<Parameters> = [];
    public cognitoId: String;

    constructor(public router: Router, public userService: UserLoginService, public userParams: UserParametersService, public cognitoSession: CognitoSessionService) {
        this.userService.isAuthenticated(this);
        console.log("In MyProfileComponent");
    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        if (!isLoggedIn) {
            this.router.navigate(['/home/login']);
        } else {
            this.userParams.getParameters(new GetParametersCallback(this, this.cognitoSession));
        }
    }
}

export class Parameters {
    name: string;
    value: string;
}

export class GetParametersCallback implements Callback {

    constructor(public me: MyProfileComponent, public cognitoSession: CognitoSessionService) {

    }

    callback() {

    }

    callbackWithParam(result: any) {
        this.cognitoSession.getCreds().then( (creds:AWS.CognitoIdentityCredentials) => {
            for (let i = 0; i < result.length; i++) {
                let parameter = new Parameters();
                parameter.name = result[i].getName();
                parameter.value = result[i].getValue();
                this.me.parameters.push(parameter);
            }
            let param = new Parameters()
            param.name = "cognito ID";
            param.value = creds.identityId;
            this.me.parameters.push(param)
        });
    }
}
