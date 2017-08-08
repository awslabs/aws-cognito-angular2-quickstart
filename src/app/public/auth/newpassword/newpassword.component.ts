import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {UserRegistrationService} from '../../../service/user-registration.service';
import {UserLoginService} from '../../../service/user-login.service';
import {CognitoCallback} from '../../../service/cognito.service';

export class NewPasswordUser {
    username: string;
    existingPassword: string;
    password: string;
}
/**
 * This component is responsible for displaying and controlling
 * the registration of the user.
 */
@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './newpassword.html'
})
export class NewPasswordComponent implements OnInit, CognitoCallback {
    registrationUser: NewPasswordUser;
    router: Router;
    errorMessage: string;

    constructor(public userRegistration: UserRegistrationService, public userService: UserLoginService, router: Router) {
        this.router = router;
    }

    ngOnInit() {
        this.errorMessage = null;
        this.registrationUser = new NewPasswordUser();

        console.log('Checking if the user is already authenticated. If so, then redirect to the secure site');
        this.userService.isAuthenticated(this);
    }

    onRegister() {
        console.log(this.registrationUser);
        this.errorMessage = null;
        this.userRegistration.newPassword(this.registrationUser, this);
    }

    cognitoCallback(message: string, result: any) {
        if (message != null) { // error
            this.errorMessage = message;
            console.log('result: ' + this.errorMessage);
        } else { // success
            // move to the next step
            console.log('redirecting');
            this.router.navigate(['/securehome']);
        }
    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        if (isLoggedIn) {
            this.router.navigate(['/securehome']);
        }
    }
}
