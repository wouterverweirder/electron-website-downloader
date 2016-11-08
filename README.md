# Electron Website Downloader

Desktop application to download a website with all of it's internal links and assets to your local machine.

![alt tag](https://raw.githubusercontent.com/wouterverweirder/electron-website-downloader/master/screengrab.gif)

Once you enter a URL and push the "Start Grabbing" button, the application will:

- Open the website & download all resources in that page
- Get a list of all links to the same domain & load those
- Get a list of all media queries & loop over all pages for all specified media query widths

You will find a folder containing all loaded resources on your Desktop.

## Usage

You can download the latest version [here](https://github.com/wouterverweirder/electron-website-downloader/releases).

If you want to run from source, you can clone this repo, install the node_modules and launch through npm:

```bash
$ npm install
$ npm start
```
