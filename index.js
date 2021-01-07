//       includes modules
const request = require('request');


//       Configs

let config = {
    spotifyClientId: ' ', // Spotify App Client Id
    spotifyClientSecret: ' ', // Spotify App Client Secret
    spotifyRefreshToken: ' ', // Spotify Refresh Token
    spotifyAccessToken: null, // There gonna be written your Spotify Access Token
    spotifyLastPlaying: null, // There your Spotify Last Played Track
    vkAccessToken: ' ', // Your VK Access Token
    vkId: 123,
    headers: {
        'User-Agent': 'KateMobileAndroid/45 lite-421 (Android 5.0; SDK 21; armeabi-v7a; LENOVO Lenovo A1000; ru)'
    }
}

let links = { // Important links
    'spotifyPlaying': 'https://api.spotify.com/v1/me/player/currently-playing',
    'spotifyRefresh': 'https://accounts.spotify.com/api/token',
    'vkSearch': 'https://api.vk.com/method/audio.search',
    'vkSetBroadcast': 'https://api.vk.com/method/audio.setBroadcast',
    'vkSendMessage': 'https://api.vk.com/method/messages.send'
}


//     Functions

let spotify = {
    playing: (access_token) => { return new Promise((resolve, reject) => {
        if(!access_token) return reject({'error': 'Access token is not defined.'});
        let options = { url: links.spotifyPlaying, headers: { 'Authorization': 'Bearer ' + access_token }, json: true };

        request.get(options, function(error, response, body) {
            if(error || !body || !body.item) return reject({'error': error || body || 'Nothing playing.'});

            resolve({ audio: body.item.artists[0].name + (body.item.artists[1] ? ', ' + body.item.artists[1].name : '') + ' - ' + body.item.name.split(' (')[0], playing: body.is_playing, id: body.item.id });
        })
    })},

    refresh: (refresh_token) => { return new Promise((resolve, reject) => {
        if(!refresh_token) return reject({'error': 'Refresh token is not defined.'});
        let options = { url: links.spotifyRefresh, headers: { 'Authorization': 'Basic ' + (Buffer.from(config.spotifyClientId + ':' + config.spotifyClientSecret).toString('base64')) }, form: {grant_type: 'refresh_token', refresh_token: refresh_token}, json: true };

        request.post(options, function(error, response, body) {
            if(error || !body || !body.access_token) return reject({'error': error || body || 'Unknown error.'});

            resolve({ access_token: body.access_token });
        })
    })}
}

let vk = {
    searchAudio: (query, access_token) => { return new Promise((resolve, reject) => {
        if(!access_token || !query) return reject({'error': 'One of parameters is not defined.'});
        let options = { url: links.vkSearch, qs: { auto_complete: 1, count: 1, q: query, access_token: access_token, v: '5.110' }, json: true, headers: config.headers };
        console.log(query);

        request.get(options, function(error, response, body) {
            if(error || body.error || !body || !body.response || !body.response.items || !body.response.items[0]) return reject({'error': error ? error : body.error ? body.error : 'This track wasn\'t found.'});

            resolve({'audio': body.response.items[0].artist + ' - ' + body.response.items[0].title, id: `${body.response.items[0].owner_id}_${body.response.items[0].id}`});
        })
    })},

    setBroadcast: (audioId, access_token) => { return new Promise((resolve, reject) => {
        if(!access_token || !audioId) return reject({'error': 'One of parameters is not defined.'});
        let options = { url: links.vkSetBroadcast, qs: { audio: audioId, access_token: access_token, v: '5.110' }, json: true, headers: config.headers };

        request.get(options, function(error, response, body) {
            if(error || !body || body.error) return reject({'error': error ? error : body.error ? body.error : 'Unknown error.'});

            resolve(body);
        })
    })},
    sendMessage: (peer, message, access_token) => { return new Promise((resolve, reject) => {
        if(!access_token || !peer || !message) return reject({'error': 'One of parameters is not defined.'});
        let options = { url: links.vkSendMessage, qs: { peer_id: peer, message: message, access_token: access_token, v: '5.110', random_id: 0 }, json: true, headers: config.headers };

        request.get(options, function(error, response, body) {
            if(error || !body || body.error) return reject({'error': error ? error : body.error ? body.error : 'Unknown error.'});

            resolve(body);
        })
    })}
}

let loadMusic = () => {
    spotify.playing(config.spotifyAccessToken).then((res) => {
        if(config.spotifyLastPlaying != res.id && res.playing) vk.searchAudio(res.audio, config.vkAccessToken).then((r) => {
            config.spotifyLastPlaying = res.id;

            vk.setBroadcast(r.id, config.vkAccessToken).catch((err) => { debug('VK SetBroadcast Error: ' + JSON.stringify(err)); });
        }).catch((err) => { debug('VK Search Error: ' + err.error); config.spotifyLastPlaying = res.id; });
    }).catch((err) => { if(err.error != 'Nothing playing.') debug('Spotify Get Track Error: ' + err.error); })
}



//      Working Part

spotify.refresh(config.spotifyRefreshToken).then((res) => { config.spotifyAccessToken = res.access_token; setInterval(loadMusic, 0.1 * 60 * 1000); }).catch((err) => { console.log(err); });
setInterval(() => { spotify.refresh(config.spotifyRefreshToken).then((res) => { config.spotifyAccessToken = res.access_token; }) }, 50 * 60 * 1000);

let debug = (message) => { console.log('[SPOTSYNC] ' + message); vk.sendMessage(config.vkId, '[SPOTSYNC] ' + message, config.vkAccessToken); }
