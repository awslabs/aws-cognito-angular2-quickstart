import {Component} from "@angular/core";
import {UserLoginService} from "../../service/user-login.service";
import {Callback, LoggedInCallback} from "../../service/cognito.service";
import {CognitoSessionService} from "../../service/cognito-session.service";
import {CognitoUser} from "amazon-cognito-identity-js";
import {Router} from "@angular/router";


export class Stuff {
    public accessToken: string;
    public idToken: string;
}

@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './jwt.html'
})
export class JwtComponent implements LoggedInCallback {

    public stuff: Stuff = new Stuff();

    constructor(public router: Router, public userService: UserLoginService, public cognitoSession: CognitoSessionService) {
        this.userService.isAuthenticated(this);
        console.log("in JwtComponent");
    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        if (!isLoggedIn) {
            this.router.navigate(['/home/login']);
        } else {
            this.cognitoSession.getCurrentUser().then( (user:CognitoUser) => {
                user.getSession( (err, session) => {
                    if (err)
                        console.log("UserParametersService: Couldn't retrieve the user");
                    else {
                        this.stuff.idToken = session.getIdToken().getJwtToken();
                        this.stuff.accessToken = session.getAccessToken().getJwtToken();
                    }
                });
            })
        }
    }
}