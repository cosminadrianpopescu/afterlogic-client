Afterlogic mobile client
========================================

This is an [Afterlogic webmail lite](https://afterlogic.org/webmail-lite)
client. You have to have an instance of Afterlogic installed on a server. This
is not an IMAP client. It uses the API from Afterlogic, so it won't work
without it. 

In the settings page, you are supposed to fill in the Afterlogic installation
url and then the emails and the passwords of each account you want to manage.
The passwords will be discarded after the authentication is performed. In the
settings, the tokens will be saved, not the passwords.

All the administration part is done on the Afterlogic webmail installation
(domains, user names, identities). This is a very simple client. 

It can also be used on a desktop in a normal browser. The main advantage of
using this instead of the afterlogic UI is that it brings combined view and
mobile theme.

## Installation

You can download the latest release from the releases page and install it, or
you can build it.

## Building

```
git clone https://github.com/cosminadrianpopescu/afterlogic-client
cd afterlogic-client
npm install
ionic build --prod
npx cap add android
cp ./AndroidManifest.xml ./android/app/src/main/
npx cap copy
cd android
./gradlew assembleRelease
```

After this you'll find the apk in
`android/app/build/outputs/apk/release/app-release-unsigned.apk`. You need
to sign this file before installing, like shown
[here](https://ionicframework.com/docs/v1/guide/publishing.html):

```
cd ./app/build/outputs/apk/release/
keytool -genkey -v -keystore my-release-key.keystore -alias cups-client -keyalg RSA -keysize 2048 -validity 10000
mv app-release-unsigned.apk cups.client.apk
jarsigner -sigalg SHA1withRSA -digestalg SHA1 -keystore my-release-key.keystore cups.client.apk cups-client
```

