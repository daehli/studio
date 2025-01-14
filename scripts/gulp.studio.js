require('bluebird-global')
const gulp = require('gulp')
const rimraf = require('gulp-rimraf')
const path = require('path')

const file = require('gulp-file')
const fse = require('fs-extra')
const { execute } = require('./utils/exec')

const start = cb => {
  console.info(`
  The studio is not meant to be run as a standalone just yet.
  Please set DEV_STUDIO_PATH on the main server repository to the out/ folder of packages/studio-be
  
  If you absolutely want to run the studio as a standalone, please type 'yarn start' in 'packages/studio-be`)
}

const buildBackend = async () => {
  await execute('yarn && yarn build', { cwd: 'packages/studio-be' })
}

const buildUi = async cb => {
  const cmd = process.argv.includes('--prod') ? 'yarn && yarn build:prod --nomap' : 'yarn && yarn build'
  await execute(cmd, { cwd: 'packages/studio-ui' })
}

const clean = () => {
  return gulp.src('./packages/studio-be/out/ui/public', { allowEmpty: true }).pipe(rimraf())
}

const cleanAssets = () => {
  return gulp.src('./out/bp/data/assets/ui-studio', { allowEmpty: true }).pipe(rimraf())
}

const copy = () => {
  return gulp.src('./packages/studio-ui/public/**/*').pipe(gulp.dest('./packages/studio-be/out/ui/public'))
}

const watchUi = async cb => {
  // The timeout is necessary so the backend has time to build successfully (for common files)
  setTimeout(() => {
    execute('yarn && yarn watch', { cwd: './packages/studio-ui' })
    cb()
  }, 6000)
}

const watchBackend = async () => {
  await execute('yarn && yarn watch', { cwd: './packages/studio-be' })
}

const buildNativeExtensions = async () => {
  await execute('yarn && yarn build', { cwd: './packages/native-extensions' })
}

const package = async () => {
  const version = require(path.join(__dirname, '../package.json')).version.replace(/\./g, '_')

  try {
    await execute('yarn', { cwd: './packages/studio-be' })
    await execute('cross-env pkg package.json', undefined, { silent: true })

    await fse.rename('./bin/studio-win.exe', `./bin/studio-v${version}-win-x64.exe`)
    await fse.rename('./bin/studio-linux', `./bin/studio-v${version}-linux-x64`)
    await fse.rename('./bin/studio-macos', `./bin/studio-v${version}-darwin-x64`)
  } catch (err) {
    console.error('Error running: ', err.cmd, '\nMessage: ', err.stderr, err)
  }
}

const writeMetadata = () => {
  const version = require(path.join(__dirname, '../package.json')).version
  const metadata = JSON.stringify(
    {
      version,
      build_version: `${version}__${Date.now()}`
    },
    null,
    2
  )

  return file('./packages/studio-be/src/metadata.json', metadata, { src: true }).pipe(gulp.dest('./'))
}

module.exports = {
  start,
  watchBackend,
  watchUi,
  package,
  buildBackend,
  buildUi,
  clean,
  cleanAssets,
  copy,
  writeMetadata,
  buildNativeExtensions
}
