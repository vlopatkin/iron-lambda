# iron-lambda
Lambda functions support for IronWorker cloud

## What is this?

Use the iron-lambda to locally dev and test your lambda functions in the exact same environment it will
have when running remotely on the IronWorker cloud.

## The Workflow

The general workflow is the following:

1. Create your lambda function (or use existing one). All dependencies must in the current directory or in sub-directories.
2. Create an input/payload example file (check this into source control as an example, default name is ./event.json)
3. Run your lambda function locally inside an Iron.io Stack container.
4. Debug/test until you get it working properly.
4. Once it works like you want it to, upload it to IronWorker. You should only have to do this once until you want to make changes.

## Getting Started

1\. You'll need [Docker](http://docker.com) installed and running on your machine to use this. Run:

```sh
docker info
```

This should print information about your Docker installation. If it doesn't, you don't have Docker setup properly.

2\. You'll want to install the new [Iron cli](https://github.com/iron-io/ironcli) tool as well (not totally necessary, but makes things a lot easier):
```sh
curl -sSL http://get.iron.io/cli | sh
```

Or if you'd prefer to download it yourself, you can grab the latest release from here: https://github.com/iron-io/ironcli/releases

3\. Check that the Iron cli tool was installed properly:
```sh
iron --version
```

4\. Install this npm package globally:
```sh
npm install iron-lambda -g
```
5\. Create new directory for your function development and enter inside it
```sh
mkdir your-iron-lambda-func
cd your-iron-lambda-func
```

6\. Setup iron lambda template
```sh
iron-lambda setup
```
The lambda function is placed in lambda.js, feel free to change it.

```node
exports.handler = function(event, context) {
    console.log( "event", event );
    console.log( "env", process.env );
    context.done();
};
```
where _event_ is the payload passed to lambda function

## Command Line Interface

### setup
**Inits you working directory with template**
```sh
iron-lambda setup
```
Template contains the following files:
* .env - stores runtime enviroment variables (e.g. credentials, roles, security tokens & etc)
* deploy.env - stores variables for docker image building process (e.g. you docker hub repository and image version)
* Dockerfile
* lambda.js - the lambda function module, must export handler
* package.json

### run
**Quick run locally**
```sh
iron-lambda run
```
Runs the lambda function inside default iron/node docker container.
The payload file should be places to _event.json_ or you could specify it's location by PAYLOAD_FILE envoriment variable (do not use .env file for this purpose, otherwise payload will not load in IronWorker cloud)

### run-in-docker
**Run locally inside docker container**
```sh
iron-lambda run-in-docker
```
Builds a docker container and runs the lambda function inside it.
The payload file should be places to _event.json_.

### deploy
**Deploy your lambda function**
```sh
iron-lambda deploy
```
Builds a docker container, deploys it to docker hub and registers in IronWorker cloud.
Make sure you've logged to docker (see _docker login_ command) and has your Iron.IO project credentials in _./iron.json_.
_iron.json_ file you can obtain on Getting Started page inside your IronWorker project (https://hud.iron.io/dashboard).

## Notes
### Windows Users

If you are using boot2docker on Windows, please note the following:

The Linux VM in the boot2docker VirtualBox maps the c/Users directory in the VM instance to the C:\Users folder in Windows. So be sure your source code for your worker is in a folder under C:\Users, then cd to that folder in the context of the VM (in Boot2Docker terminal) and run it from there.
