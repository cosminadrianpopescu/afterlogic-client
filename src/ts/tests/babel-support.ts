require('@babel/register')({
  ignore: [],
  root: '../../',
  presets: ['@babel/preset-env'],
  only: [(file: string) => {
    return file.match(/@ionic-native\/geolocation\/ngx\/index.js|@ionic-native/);
  }],
})
