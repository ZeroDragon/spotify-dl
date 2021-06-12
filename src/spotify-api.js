const SpotifyWebApi = require('spotify-web-api-node')

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT,
  clientSecret: process.env.SPOTIFY_SECRET
})

const MAX_LIMIT_DEFAULT = 50
module.exports = {
  spotifyApi,
  checkCredentials: async function () {
    if (!await spotifyApi.getRefreshToken()) {
      await this.requestTokens()
    } else {
      await this.refreshToken()
    }
  },
  requestTokens: async () => {
    const data = (await spotifyApi.clientCredentialsGrant()).body
    spotifyApi.setAccessToken(data.access_token)
    spotifyApi.setRefreshToken(data.refresh_token)
  },
  refreshToken: async () => {
    const data = (await spotifyApi.refreshAccessToken()).body
    spotifyApi.setAccessToken(data.access_token)
  },
  extractTrack: async trackId => {
    const data = (await spotifyApi.getTrack(trackId)).body
    const details = {
      name: '',
      artists: [],
      album_name: '',
      release_date: '',
      cover_url: ''
    }
    details.name = data.name
    data.artists.forEach(artist => {
      details.artists.push(artist.name)
    })
    details.album_name = data.album.name
    details.release_date = data.album.release_date
    details.cover_url = data.album.images[0].url
    return details
  },
  extractPlaylist: async playlistId => {
    const data = (await spotifyApi.getPlaylist(
      playlistId,
      { limit: MAX_LIMIT_DEFAULT }
    )).body
    const details = {
      name: '',
      total_tracks: 0,
      tracks: data.tracks.items.map(item => item.track.id)
    }

    details.name = data.name + ' - ' +
      data.owner.display_name
    details.total_tracks = data.tracks.total
    if (data.tracks.next) {
      let offset = details.tracks.length
      while (details.tracks.length < details.total_tracks) {
        const playlistTracksData = (await spotifyApi
          .getPlaylistTracks(
            playlistId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset }
          )).body
        details.tracks = details.tracks.concat(
          playlistTracksData.items.map(item => item.track.id)
        )
        offset += MAX_LIMIT_DEFAULT
      }
    }
    return details
  },
  extractAlbum: async albumId => {
    const data = (await spotifyApi.getAlbum(
      albumId,
      { limit: MAX_LIMIT_DEFAULT }
    )).body
    const details = {
      name: '',
      total_tracks: 0,
      tracks: data.tracks.items.map(item => item.id)
    }
    details.name = data.name + ' - ' + data.label
    details.total_tracks = data.tracks.total
    if (data.tracks.next) {
      let offset = details.tracks.length
      while (details.tracks.length < data.tracks.total) {
        const albumTracks = (await spotifyApi
          .getAlbumTracks(
            albumId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset }
          )).body
        details.tracks = details.tracks
          .concat(albumTracks.items.map(item => item.id))
        offset += MAX_LIMIT_DEFAULT
      }
    }
    return details
  },
  extractArtist: async artistId => {
    const data = (await spotifyApi.getArtist(artistId)).body
    return {
      id: data.id,
      name: data.name,
      href: data.href
    }
  },
  extractArtistAlbums: async artistId => {
    const artistAlbums = (await spotifyApi.getArtistAlbums(
      artistId,
      { limit: MAX_LIMIT_DEFAULT }
    )).body
    let albums = artistAlbums.items
    if (artistAlbums.next) {
      let offset = albums.length
      while (albums.length < artistAlbums.total) {
        const additionalArtistAlbums = (await spotifyApi
          .getArtistAlbums(
            artistId,
            { limit: MAX_LIMIT_DEFAULT, offset: offset }
          )).body
        albums = albums.concat(additionalArtistAlbums.items)
        offset += MAX_LIMIT_DEFAULT
      }
    }
    return albums
  }
}
