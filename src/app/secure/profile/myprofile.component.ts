import {Component} from "@angular/core";
import {LoggedInCallback, UserLoginService, UserParametersService, Callback} from "../../service/cognito.service";
import {Router} from "@angular/router";
import {AwsUtil} from "../../service/aws.service"


@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './myprofile.html'
})
export class MyProfileComponent implements LoggedInCallback {

    public parameters: Array<Parameters> = [];
    public cognitoId: String;

    constructor(public router: Router, public userService: UserLoginService, public userParams: UserParametersService, public awsUtil: AwsUtil) {
        this.userService.isAuthenticated(this);
        console.log("In MyProfileComponent");
    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        if (!isLoggedIn) {
            this.router.navigate(['/home/login']);
        } else {
            this.userParams.getParameters(new GetParametersCallback(this, this.awsUtil));
        }
    }
}

export class Parameters {
    name: string;
    value: string;
}

export class GetParametersCallback implements Callback {

    constructor(public me: MyProfileComponent, public awsUtil: AwsUtil) {

    }

    callback() {

    }

    callbackWithParam(result: any) {

        for (let i = 0; i < result.length; i++) {
            let parameter = new Parameters();
            parameter.name = result[i].getName();
            parameter.value = result[i].getValue();
            this.me.parameters.push(parameter);
        }
        let param = new Parameters()
        param.name = "cognito ID";
        param.value = this.awsUtil.getCognitoCreds().identityId;
        this.me.parameters.push(param)
    }
}
