<p align="center">
  <a href="https://bodypace.org" target="_blank">
    <img src="https://bodypace.org/favicon.ico" width="75"/>
  </a>
</p>

<p align="center">
  CLI for devs. Offline encryption utils and client to bodypace personal and public data servers.
</p>

<p align="center">
  <a href="https://github.com/Bodypace/bodypace-personal-data-server/blob/master/LICENSE">
  <img src="https://img.shields.io/github/license/bodypace/bodypace-cli" alt="Package License" /></a>
  <img alt="GitHub commit activity (branch)" src="https://img.shields.io/github/commit-activity/t/bodypace/bodypace-cli">
  <img alt="GitHub package.json version (branch)" src="https://img.shields.io/github/package-json/v/bodypace/bodypace-cli/master">
  <img alt="" src="https://img.shields.io/badge/tests-missing-yellow" />
  <img alt="" src="https://img.shields.io/badge/status-missing%20some%20features%20but%20works%20on%20my%20machine%20💯%20🧠-teal" />
</p>

# Bodypace CLI

Right now this tool can:

- generate keys
- encrypt and decrypt files locally (offline)
- login to bodypace-personal-data-server
- list files stored on bodypace-personal-data-server belonging to logged in user
- upload to and download files from bodypace-personal-data-server
- remove files from bodypace-personal-data-server

## Issues & todos

- issue: not all commands work yet when executing them from $PWD different than repo root
- todo: extract sodium to separate repo/npm package and import here (instead of coping from bodypace-frontend)
- todo: extract client logic to separate repo/npm package and import here and in bodypace-frontend

## Usage

```text
Usage: bodypace-cli [options] [command]

CLI to access bodypace-personal-data-server and encrypt or decrypt locally

Options:
  -s, --server <url>               URL of server to connect to (default: "http://localhost:8080")
  -S, --secrets <secrets.json>     File to use as storage of secrets and credentials
  -V, --version                    output the version number
  -h, --help                       display help for command

Commands:
  show-secrets                     Display personal key, access token and credentials
  generate-key [options]           Generate a new personal key
  encrypt <inputFile> [outputDir]  Encrypt a file with a personal key
  decrypt <inputFile> [outputDir]  Decrypt a file with a personal key
  show-credentials                 Display last username and password sent to server
  forget-credentials               Remove stored username and password
  register [username] [password]   Create a new user and get access token from server
  login [username] [password]      Get access token from server
  logout                           Remove stored access token
  ping                             Check if server is reachable and access token is valid
  get-files [options]              Get list of all files on server belonging to logged in user
  get-file [options] <file-id>     Download one file from server
  upload-file [options] <file>     Upload one file to server
  remove-file <file-id>            Remove one file from server
  help [command]                   display help for command
```

## Questions / Contact

The issues list of this repo is for bug reports and feature requests, but also questions. Therefore, if you need support or want to discuss something, simply [create a question](https://github.com/Bodypace/bodypace-cli/issues/new). Alternatively, do not hesitate to write an email to: contact@bodypace.org.

## License

Bodypace is licensed under [Apache License 2.0](LICENSE).
