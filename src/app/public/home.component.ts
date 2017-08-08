import {Component, OnInit} from '@angular/core';

declare let AWS: any;
declare let AWSCognito: any;

@Component({
    selector: 'awscognito-angular2-app',
    template: '<p>Hello and welcome!</p>'
})
export class AboutComponent {

}

@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './landinghome.html'
})
export class HomeLandingComponent {
    constructor() {
        console.log('HomeLandingComponent constructor');
    }
}

@Component({
    selector: 'awscognito-angular2-app',
    templateUrl: './home.html'
})
export class HomeComponent implements OnInit {

    constructor() {
        console.log('HomeComponent constructor');
    }

    ngOnInit() {

    }
}
