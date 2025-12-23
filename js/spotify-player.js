let spotifyPlayer = null;
let spotifyDeviceId = null;
let progressInterval = null;
let currentPosition = 0;
let trackDuration = 0;
let isPaused = true;
let currentPlaylist = null;
let currentTracks = [];
let currentTrackIndex = 0;
let usedTracks = [];
let usedTrackIndex = -1;

// Elementos del reproductor
const progressBar = document.querySelector('.progress-bar');
const currentTimeEl = document.querySelector('.time span:first-child');
const durationEl = document.querySelector('.time span:last-child');

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
    transferPlaybackHere();
  });

  spotifyPlayer.addListener("not_ready", ({ device_id }) => {
    console.warn("Player no listo:", device_id);
  });
  
  spotifyPlayer.addListener('player_state_changed', state => {
  if (!state) return;

    const newPosition = state.position;
    const newDuration = state.duration;

    if (newPosition < currentPosition || newDuration !== trackDuration) {
        stopProgressTimer();
        currentPosition = newPosition || 0;
        trackDuration = newDuration || 0;
        updateProgressUI();
    } else {
        currentPosition = newPosition;
        trackDuration = newDuration;
    }

    isPaused = state.paused;

    durationEl.textContent = formatDuration(trackDuration);

    if (isPaused) {
        stopProgressTimer();
    } else {
        startProgressTimer();
    }

    // Sincronizar icono play / pause
    const icon = document.querySelector('#replayBtn i');
    icon.classList.toggle('bi-play-fill', isPaused);
    icon.classList.toggle('bi-pause-fill', !isPaused);
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

['click', 'touchstart'].forEach(evt => {
  replayBtn.addEventListener(evt, e => {
    e.preventDefault();
    replay();
  });
});

// Canción anterior
const prevBtn = document.getElementById('peviousSong');
if (prevBtn) {
  prevBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    previousTrack();
  });
}

async function previousTrack() {
    if (!spotifyDeviceId || usedTracks.length === 0) return;

    if (currentPosition > 3000) {
        await playTrack(usedTracks[usedTrackIndex]);
        return;
    }

    if (usedTrackIndex <= 0) return;

    // Reproducir la anterior
    usedTrackIndex--;
    const previous = usedTracks[usedTrackIndex];
    await playTrack(previous);
}

// Canción siguiente
const nextBtn = document.getElementById('nextSong');
if (nextBtn) {
  nextBtn.addEventListener('touchstart', e => {
    e.preventDefault();
    nextTrack();
  });
}

async function nextTrack() {
    if (!spotifyDeviceId || !currentTracks.length || usedTracks.length === currentTracks.length) return;

    const availableTracks = currentTracks.filter(track => !usedTracks.some(used => used.id === track.id));
    if (!availableTracks.length) return;

    // Elegir una nueva aleatoria
    const nextTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];

    usedTracks.push(nextTrack);
    usedTrackIndex++;

    await playTrack(nextTrack);
}

async function replay() {
  const replayBtn = document.getElementById('replayBtn');
  const icon = replayBtn.querySelector('i');

  if (!icon || !spotifyPlayer) return;

  if (icon.classList.contains('bi-pause-fill')) {
    await spotifyPlayer.pause();
    icon.classList.remove('bi-pause-fill');
    icon.classList.add('bi-play-fill');
  } else if (icon.classList.contains('bi-play-fill')) {
    await spotifyPlayer.resume();
    updateSongModals();
    icon.classList.remove('bi-play-fill');
    icon.classList.add('bi-pause-fill');
  }
}

async function updateSongModals() {
  if (!spotifyPlayer) return;

  const state = await spotifyPlayer.getCurrentState();
  if (!state) return; // No hay canción reproduciéndose

  const track = state.track_window.current_track;
  const trackId = track.id;

  // Obtenemos toda la información del track
  const trackResponse = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers: { 'Authorization': 'Bearer ' + getValidToken() } });
  const fullTrackData = await trackResponse.json();

  // Actualizamos cada modal
  const modalMap = {
    modalSong: fullTrackData.name,
    modalArtist: fullTrackData.artists.map(a => a.name).join(", "),
    modalAlbum: fullTrackData.album.name,
    modalYear: fullTrackData.album.release_date ? fullTrackData.album.release_date.substring(0, 4) : "Desconocido"
  };

  for (const [id, value] of Object.entries(modalMap)) {
    const modalBody = document.querySelector(`#${id} .modal-body`);
    if (modalBody) modalBody.textContent = value;
  }
}

// Timer de la canción
function updateProgressUI() {
  const percent = (currentPosition / trackDuration) * 100;
  progressBar.style.width = `${percent}%`;
  currentTimeEl.textContent = formatDuration(currentPosition);
}

function startProgressTimer() {
  stopProgressTimer();

  progressInterval = setInterval(() => {
    currentPosition += 10;

    if (currentPosition > trackDuration) {
      currentPosition = trackDuration;
      stopProgressTimer();
    }

    updateProgressUI();
  }, 10);
}

function stopProgressTimer() {
  if (progressInterval) {
    clearInterval(progressInterval);
    progressInterval = null;
  }
}

function resetProgress() {
    stopProgressTimer();
    currentPosition = 0;
    trackDuration = 0;
    updateProgressUI();
}


// Listas de reproducción
async function fetchPlaylists() {
    const token = getValidToken();
    if (!token) return;

    const container = document.getElementById('playlistsContainer');
    container.innerHTML = 'Cargando...';

    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', { headers: { 'Authorization': 'Bearer ' + token } });

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            container.innerHTML = 'No tienes listas de reproducción.';
            return;
        }

        // Crear lista HTML
        container.innerHTML = '';
        data.items.forEach(playlist => {
          const div = document.createElement('div');
          div.className = 'playlist-item d-flex align-items-center gap-2 mb-2';
          div.innerHTML = `
              <img src="${playlist.images[0]?.url || 'images/icon.png'}" alt="${playlist.name}" width="50" height="50" style="border-radius:8px;">
              <span>${playlist.name}</span>
              <button class="btn btn-success btn-sm ms-auto play-playlist-btn">Jugar</button>
          `;
          container.appendChild(div);

          // Añadimos listener al botón "Jugar"
          const playBtn = div.querySelector('.play-playlist-btn');
          if (playBtn) {
            playBtn.addEventListener('click', () => playPlaylist(playlist));
            playBtn.addEventListener('touchstart', () => playPlaylist(playlist));
          }
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = 'Error al cargar las listas.';
    }
}
document.getElementById('btnPlaylists').addEventListener('click', fetchPlaylists);

async function playPlaylist(playlist) {
    const token = getValidToken();
    if (!token || !spotifyDeviceId) return;

    currentPlaylist = playlist;
    usedTracks = [];
    usedTrackIndex = -1;

    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await response.json();
    currentTracks = data.items.map(item => item.track);

    if (!currentTracks.length) return;

    const firstTrack = currentTracks[Math.floor(Math.random() * currentTracks.length)];
    usedTracks.push(firstTrack);
    usedTrackIndex = 0;

    await playTrack(firstTrack);
}

// Reproducir canción a partir del Index de la lista de reproducción
async function playTrackAtIndex(index) {
    if (!currentTracks.length) return;
    const track = currentTracks[index];
    const token = getValidToken();

    resetProgress();

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [track.uri] })
    });

    const checkTrackLoaded = async () => {
        const state = await spotifyPlayer.getCurrentState();
        if (state && state.track_window.current_track.id === track.id) {
            document.querySelector('.song-title').textContent = currentPlaylist.name;
            document.querySelector('.album-section img').src = currentPlaylist.images[0]?.url || 'images/icon.png';
            updateSongModals();
            closeModalIfOpen('modalPlaylists');
        } else {
            setTimeout(checkTrackLoaded, 200);
        }
    };
    checkTrackLoaded();
}

// Reproducir canción a partir del track
async function playTrack(track) {
    const token = getValidToken();

    resetProgress();

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [track.uri] })
    });

    const checkTrackLoaded = async () => {
        const state = await spotifyPlayer.getCurrentState();
        if (state && state.track_window.current_track.id === track.id) {
            document.querySelector('.song-title').textContent = currentPlaylist.name;
            document.querySelector('.album-section img').src = currentPlaylist.images[0]?.url || 'images/icon.png';
            updateSongModals();
            closeModalIfOpen('modalPlaylists');
        } else {
            setTimeout(checkTrackLoaded, 200);
        }
    };
    checkTrackLoaded();
}


// Función para formatear duración en ms a mm:ss
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}