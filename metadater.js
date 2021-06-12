const sanitize = require('sanitize-filename')
const { createWriteStream, unlinkSync } = require('fs')
const ffmetadata = require('ffmetadata')
const axios = require('axios')
const Spotify = require('./spotify')

const spot = new Spotify()
const [,, songUrl, mp3File] = process.argv

const artworkDownloader = async (url, filename) => {
  const writer = createWriteStream(filename)
  const artwork = await axios({ url, responseType: 'stream' })
  artwork.data.pipe(writer)
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 1000)
  })
}

const getSong = async (directory, song) => {
  const artist = song.artists[0]
  const cleanSong = sanitize(song.name)
  const cleanArtist = sanitize(artist)
  const filename = `${cleanSong} - ${cleanArtist}`.replace(/\s\s+/g, ' ').trim()
  const artworkFn = `${filename}.jpg`
  await artworkDownloader(song.cover_url, `${directory}/${artworkFn}`)

  const p = new Promise((resolve) => {
    ffmetadata.write(
      mp3File,
      {
        artist,
        album: song.album_name,
        title: song.name,
        date: song.release_date
      }, {
        attachments: [`${directory}/${artworkFn}`],
        'id3v2.3': true
      }, err => {
        if (err) throw err
        unlinkSync(`${directory}/${artworkFn}`)
        console.log('done')
        return resolve()
      }
    )
  })
  return p
}

const playlistParser = async (url) => {
  await spot.checkCredentials()
  const track = await spot.getTrack(url)
  console.log('Got song', track)
  await getSong(process.cwd(), track)
}

playlistParser(songUrl)
