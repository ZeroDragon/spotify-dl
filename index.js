const ytMusic = require('node-youtube-music').default
const Ytmp3 = require('youtube-mp3-downloader')
const sanitize = require('sanitize-filename')
const fs = require('fs/promises')
const { writeFileSync, readFileSync, createWriteStream, unlinkSync } = require('fs')
const ffmetadata = require('ffmetadata')
const axios = require('axios')
const Spotify = require('./spotify')

const spot = new Spotify()
const [,, playlistURL] = process.argv

const artworkDownloader = async (url, filename) => {
  const writer = createWriteStream(filename)
  const artwork = await axios({ url, responseType: 'stream' })
  artwork.data.pipe(writer)
}

const getSong = async (directory, song) => {
  const artist = song.artists[0]
  const songs = await ytMusic.searchMusics(`${song.name} - ${artist}`)
  if (!songs.length) {
    process.stdout.write('Error: could not find', `${song.name} - ${artist}`)
    return Promise.resolve()
  }
  const { youtubeId } = songs[0]
  const cleanSong = sanitize(song.name)
  const cleanArtist = sanitize(artist)
  const filename = `${cleanSong} - ${cleanArtist}`.replace(/\s\s+/g, ' ').trim()
  const songFn = `${filename}.mp3`
  const artworkFn = `${filename}.jpg`
  await artworkDownloader(song.cover_url, `${directory}/${artworkFn}`)

  const p = new Promise((resolve) => {
    const yt = new Ytmp3({
      outputPath: directory
    })
    yt.download(youtubeId, songFn)
    yt.on('finished', (err, response) => {
      if (err) console.error(err)
      process.stdout.write(' ✅')
      ffmetadata.write(
        `${directory}/${songFn}`,
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
          return resolve()
        }
      )
    })
    yt.on('error', _ => {
      console.error(' - ', song.id, 'Was not possible to download')
      process.exit(1)
    })
    yt.on('progress', ({ progress }) => {
      process.stdout.clearLine()
      process.stdout.cursorTo(0)
      process.stdout.write(`=> ${song.name} ${progress.percentage.toFixed(2)}%`)
    })
  })
  return p
}

let cacheFile
const cacher = directory => {
  let cache
  try {
    cache = readFileSync(`${directory}/.cache`, 'utf8')
  } catch (_) {
    cache = '[]'
  }
  cache = JSON.parse(cache)
  return {
    lookFor (songId) {
      return cache.indexOf(songId) !== -1
    },
    addTrack (songId) {
      cache.push(songId)
      cache = cache.filter(i => i !== '')
      return writeFileSync(
        `${directory}/.cache`,
        JSON.stringify(cache, false, 2)
      )
    }
  }
}

let nextTokenRefreshTime
const trackLooper = async (directory, [track, ...tail]) => {
  if (!track) {
    console.log('Done!')
    process.exit(0)
  }
  if (cacheFile.lookFor(track)) return await trackLooper(directory, tail)
  if (!nextTokenRefreshTime || (nextTokenRefreshTime < new Date())) {
    nextTokenRefreshTime = new Date()
    nextTokenRefreshTime.setSeconds(
      nextTokenRefreshTime.getSeconds() + 55 * 60
    )
    await spot.checkCredentials()
  }
  const trackData = await spot.getTrack(track)
  await getSong(directory, trackData)
  console.log(` ${tail.length}`)
  await cacheFile.addTrack(track)
  return await trackLooper(directory, tail)
}

const playlistParser = async (url) => {
  await spot.checkCredentials()
  const { name, tracks } = await spot.getPlaylist(url)
  console.log('Got playlist', name, tracks.length, 'songs')
  const directory = `${process.cwd()}/${name}`
  try {
    await fs.mkdir(directory)
  } catch (_) {}
  cacheFile = cacher(directory)
  trackLooper(directory, tracks)
}

playlistParser(playlistURL)
