let spotifyPlayer = null;
let spotifyDeviceId = null;

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = getValidToken();
  if (!token) return;

  spotifyPlayer = new Spotify.Player({
    name: "RubxsSongs Player",
    getOAuthToken: cb => cb(token),
    volume: 0.5
  });

  spotifyPlayer.addListener("ready", ({ device_id }) => {
    spotifyDeviceId = device_id;
    console.log("Player listo:", device_id);
  });

  spotifyPlayer.addListener("not_ready", ({ device_id }) => {
    console.warn("Player no listo:", device_id);
  });

  spotifyPlayer.connect();
};

async function transferPlaybackHere() {
  if (!spotifyDeviceId) return;

  await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: {
      "Authorization": "Bearer " + getValidToken(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      device_ids: [spotifyDeviceId],
      play: false
    })
  });
}

spotifyPlayer.addListener("ready", ({ device_id }) => {
  spotifyDeviceId = device_id;
  transferPlaybackHere();
});

//document.getElementById('replayBtn').addEventListener('click', e => {
//  e.preventDefault();
//  replay();
//});

['click', 'touchstart'].forEach(evt => {
  replayBtn.addEventListener(evt, e => {
    e.preventDefault();
    replay();
  });
});

async function replay() {
  const replayBtn = document.getElementById('replayBtn');
  const icon = replayBtn.querySelector('i');

  if (!icon || !spotifyPlayer) return;

  if (icon.classList.contains('bi-pause-fill')) {
    //const response = await fetch("https://api.spotify.com/v1/me/player/pause", {
    //  method: "PUT",
    //  headers: {
    //    "Authorization": "Bearer " + getValidToken()
    //  }
    //});
    await spotifyPlayer.pause();
    icon.classList.remove('bi-pause-fill');
    icon.classList.add('bi-play-fill');
  } else if (icon.classList.contains('bi-play-fill')) {
    //await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
    //  method: "PUT",
    //  headers: {
    //    "Authorization": "Bearer " + getValidToken()
    //  }
    //});
    await spotifyPlayer.resume();
    icon.classList.remove('bi-play-fill');
    icon.classList.add('bi-pause-fill');
  }
}
