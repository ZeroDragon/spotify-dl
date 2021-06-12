Spotify-dl
==========

Yet another spotify downloader, this uses youtube-music instead of regular youtube to find songs

Heavily inspired in this awesome project: https://github.com/SwapnilSoni1999/spotify-dl#readme


## Installation
Just clone and npm install  
You will need ffmpeg installed

## Usage
```bash
npm start <playlisturl>
```
Will start downloading said list to current directory inside a playlistName - user subdirectory

```bash
node ./src/metadater <songUrl> <mp3file>
```
Will get metadata (and artwork) from spotify location and inyect it to desired mp3 file
