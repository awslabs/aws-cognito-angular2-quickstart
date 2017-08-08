import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {UserLoginService} from '../../service/user-login.service';
import {LoggedInCallback} from '../../service/cognito.service';

@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './secureHome.html'
    // styleUrls: ['/assets/css/sb-admin.css']
})
export class SecureHomeComponent implements OnInit, LoggedInCallback {

    constructor(public router: Router, public userService: UserLoginService) {
        this.userService.isAuthenticated(this);
        console.log('SecureHomeComponent: constructor');
    }

    ngOnInit() {

    }

    isLoggedIn(message: string, isLoggedIn: boolean) {
        if (!isLoggedIn) {
            this.router.navigate(['/home/login']);
        }
    }
}

