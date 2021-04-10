# CO Vax Spotter

A program for helping people in Colorado find vaccines in their area.

## Usage

Sign in at https://covaxspotter.web.app/, select the locations you want to receive notifications for, click Save, and you're all set!

## Development

- Clone this repository
- Install server dependencies with `npm install`
- Run `cd portal` and `npm install` to set up the portal (hosted on port 2021)
- Run `cd site` and `npm install` for the public facing site
- Replace firebase credentials in `site/src/app/app.component.ts` with your firebase config
- Create a firebase admin credential and save it as `covaxspotter.json`
- Compile the server typescript to javascript with `tsc index.ts`
- Run the server with `node index.js`
