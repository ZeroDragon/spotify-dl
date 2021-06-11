const ytMusic = require('node-youtube-music').default
const Ytmp3 = require('youtube-mp3-downloader')

const getSongs = async () => {
  const songs = await ytMusic.searchMusics('bow wow (that\'s my name)')
  const { youtubeId } = songs[0]
  const yt = new Ytmp3({
    outputPath: process.cwd,
    ffmpegPath: '/opt/homebrew/bin/ffmpeg'
  })
  console.log(youtubeId)
  yt.download(youtubeId)
  yt.on('finished', console.log)
  yt.on('error', console.log)
  yt.on('progress', ({ progress }) => {
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(`${progress.percentage}%`)
  })
}

getSongs()
