let spotifyPlayer = null;
let spotifyDeviceId = null;
let progressInterval = null;
let currentPosition = 0;
let trackDuration = 0;
let isPaused = true;

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

  currentPosition = state.position;
  trackDuration = state.duration;
  isPaused = state.paused;

  durationEl.textContent = formatDuration(trackDuration);
  updateProgressUI();

  if (isPaused) stopProgressTimer();
  else startProgressTimer();

  // Sincronizar icono play/pause
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
  if (!spotifyDeviceId) return;

  await fetch("https://api.spotify.com/v1/me/player/previous", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + getValidToken()
    }
  });
  updateSongModals();
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
  if (!spotifyDeviceId) return;

  await fetch("https://api.spotify.com/v1/me/player/next", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + getValidToken()
    }
  });
  updateSongModals();
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

  // Actualizamos cada modal
  const modalMap = {
    modalSong: track.name,
    modalArtist: track.artists.map(a => a.name).join(", "),
    modalAlbum: track.album.name,
    modalYear: track.album.release_date ? track.album.release_date.substring(0, 4) : "Desconocido"
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

// Listas de reproducción
async function fetchPlaylists() {
    const token = getValidToken();
    if (!token) return;

    const container = document.getElementById('playlistsContainer');
    container.innerHTML = 'Cargando...';

    try {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

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
            `;
            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = 'Error al cargar las listas.';
    }
}
document.getElementById('btnPlaylists').addEventListener('click', fetchPlaylists);

// Función para formatear duración en ms a mm:ss
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}