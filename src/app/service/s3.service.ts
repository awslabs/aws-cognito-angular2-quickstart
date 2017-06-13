import {environment} from "../../environments/environment";
import { AwsUtil } from "./aws.service";
import * as AWS from "aws-sdk/global";
import * as S3 from "aws-sdk/clients/s3";

/**
 * Created by Vladimir Budilov
 */


export class S3Service {

    constructor(public awsUtil:AwsUtil) {

    }

    private getS3(): any {
        AWS.config.update({
            region: environment.bucketRegion,
        });

        var s3 = new S3({
            region: environment.bucketRegion,
            apiVersion: '2006-03-01',
            params: {Bucket: environment.rekognitionBucket}
        });

        return s3
    }

    public addPhoto(selectedFile): boolean {
        if (!selectedFile) {
            console.log('Please choose a file to upload first.');
            return;
        }
        let fileName = selectedFile.name;
        let albumPhotosKey = environment.albumName + '/' + this.awsUtil.getCognitoCreds().identityId + "/";
        let photoKey = albumPhotosKey + fileName;

        this.getS3().upload({
            Key: photoKey,
            ContentType: selectedFile.type,
            Body: selectedFile,
            StorageClass: 'STANDARD',
            ACL: 'private'
        }, function (err, data) {
            if (err) {
                console.log('There was an error uploading your photo: ', err);
                return false;
            }
            console.log('Successfully uploaded photo.');
            return true;
        });
    }

    public deletePhoto(albumName, photoKey) {
        // this.getS3().deleteObjectStore("").promise().then(function () {
        //
        // }
        this.getS3().deleteObject({Key: photoKey}, function (err, data) {
            if (err) {
                console.log('There was an error deleting your photo: ', err.message);
                return;
            }
            console.log('Successfully deleted photo.');
        });
    }

    public viewAlbum(albumName) {
        var albumPhotosKey = encodeURIComponent(environment.albumName) + '//';
        this.getS3().listObjects({Prefix: albumPhotosKey}, function (err, data) {
            if (err) {
                console.log('There was an error viewing your album: ' + err);
            }

        });
    }

}