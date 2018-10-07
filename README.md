# WEA Server

A Node.js server that enables a testbed for enhanced wireless emergency alerts.


| **Production** | **Stage** |
|---|---|
| [![Build Status](https://api.shippable.com/projects/54fd5cbf5ab6cc1352958ad3/badge?branchName=master)](https://app.shippable.com/projects/54fd5cbf5ab6cc1352958ad3/builds/latest) | [![Build Status](https://api.shippable.com/projects/54fd5cbf5ab6cc1352958ad3/badge?branchName=stage)](https://app.shippable.com/projects/54fd5cbf5ab6cc1352958ad3/builds/latest) |

## Installation

Setup a MySQL database and enter the credentials in a file `development.json` in the `config` folder.
The structure of the file is as follows:

```
{
  "db": {
    "host": "127.0.0.1",
    "username": "wea",
    "password": "secret",
    "name": "wea",
    "logging": true,
    "force": true
  }
}
```

Afterwards install the dependencies:

	npm install

## Usage

For the first run, set the force flag in the above configuration to true.

	node app.js

## Contributors

### Project lead

Hakan Erdogmus, [hakan.erdogmus@sv.cmu.edu](mailto:hakan.erdogmus@sv.cmu.edu)

### Developers

Joao Diogo De Menezes Falcao, [joao.diogo.de.menezes.falcao@sv.cmu.edu](mailto:joao.diogo.de.menezes.falcao@sv.cmu.edu)

Sumeet Kumar, [sumeet.kumar@sv.cmu.edu](mailto:sumeet.kumar@sv.cmu.edu)

Joel Krebs, [joel.krebs@sv.cmu.edu](mailto:joel.krebs@sv.cmu.edu)

Behrouz Rabiee, [behrouz.rabiee@sv.cmu.edu](mailto:behrouz.rabiee@sv.cmu.edu)

Harsh Alkutkar, [harsh.alkutkar@sv.cmu.edu](mailto:harsh.alkutkar@sv.cmu.edu)

## License

TBD